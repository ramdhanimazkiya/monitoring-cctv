import { ref, onUnmounted } from 'vue'

export function useWhipAudio() {
  const defaultWhipUrl = ''
  const whipUrl = ref(defaultWhipUrl)

  // Enforced Audio Quality Specification (16 kHz Sample Rate, Mono 1 Channel)
  const sampleRate = ref(16000)
  const channelCount = ref(1)

  // Publishing (PTT) State
  const isPublishing = ref(false)
  const isPttLocked = ref(false) // Hands-free toggle mode
  const publishState = ref('idle') // 'idle' | 'requesting_mic' | 'connecting' | 'live' | 'error'
  const publishError = ref('')
  const audioLevel = ref(0) // 0 - 100 for VU meter
  const durationSeconds = ref(0)
  const targetUrls = ref([])
  const activeSessionsCount = ref(0)

  let pttSessions = [] // Array of { url, pc, resourceUrl }
  let pttMediaStream = null
  let pttAudioContext = null
  let pttAnalyser = null
  let pttAnimFrameId = null
  let pttTimerInterval = null

  // Check WebRTC support
  const isSupported = typeof window !== 'undefined' &&
    !!(navigator.mediaDevices?.getUserMedia) &&
    !!(window.RTCPeerConnection)

  /**
   * Helper to wait for ICE gathering completion (vanilla ICE for WHIP)
   */
  function waitForIceGathering(pc, timeoutMs = 2000) {
    return new Promise((resolve) => {
      if (pc.iceGatheringState === 'complete') {
        resolve()
        return
      }

      const checkState = () => {
        if (pc.iceGatheringState === 'complete') {
          pc.removeEventListener('icegatheringstatechange', checkState)
          resolve()
        }
      }

      pc.addEventListener('icegatheringstatechange', checkState)
      setTimeout(() => {
        pc.removeEventListener('icegatheringstatechange', checkState)
        resolve()
      }, timeoutMs)
    })
  }

  /**
   * Modifies SDP Offer to strictly enforce Opus 16kHz Wideband Mono
   */
  function enforceOpus16kMono(sdp) {
    let modified = sdp
    // Find Opus payload type from rtpmap
    const match = modified.match(/a=rtpmap:(\d+)\s+opus\/48000/i)
    if (match) {
      const pt = match[1]
      const fmtpRegex = new RegExp(`a=fmtp:${pt}\\s+(.*)`)
      const opusParams = 'maxplaybackrate=16000;sprop-maxcapturerate=16000;stereo=0;sprop-stereo=0'

      if (fmtpRegex.test(modified)) {
        modified = modified.replace(fmtpRegex, (m, existing) => {
          return `a=fmtp:${pt} ${opusParams};${existing}`
        })
      } else {
        modified = modified.replace(
          new RegExp(`(a=rtpmap:${pt}\\s+opus\\/48000\\/[12])`),
          `$1\r\na=fmtp:${pt} ${opusParams}`
        )
      }
    }
    return modified
  }

  /**
   * Setup AudioContext Analyser for live VU meter (using 16kHz sample rate)
   */
  function startAudioMeter(stream) {
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext
      if (!AudioContextClass) return

      try {
        pttAudioContext = new AudioContextClass({ sampleRate: 16000 })
      } catch (_) {
        pttAudioContext = new AudioContextClass()
      }

      const source = pttAudioContext.createMediaStreamSource(stream)
      pttAnalyser = pttAudioContext.createAnalyser()
      pttAnalyser.fftSize = 256
      source.connect(pttAnalyser)

      const dataArray = new Uint8Array(pttAnalyser.frequencyBinCount)

      const updateLevel = () => {
        if (!isPublishing.value || !pttAnalyser) {
          audioLevel.value = 0
          return
        }

        pttAnalyser.getByteFrequencyData(dataArray)
        let sum = 0
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i]
        }
        const avg = sum / dataArray.length
        // Normalize 0..100 with sensitivity multiplier
        audioLevel.value = Math.min(100, Math.round((avg / 128) * 100))
        pttAnimFrameId = requestAnimationFrame(updateLevel)
      }

      updateLevel()
    } catch (err) {
      console.warn('AudioContext meter init error:', err)
    }
  }

  function stopAudioMeter() {
    if (pttAnimFrameId) {
      cancelAnimationFrame(pttAnimFrameId)
      pttAnimFrameId = null
    }
    if (pttAudioContext && pttAudioContext.state !== 'closed') {
      pttAudioContext.close().catch(() => {})
      pttAudioContext = null
    }
    pttAnalyser = null
    audioLevel.value = 0
  }

  /**
   * Helper to establish a single WHIP WebRTC connection using transceiver & cloned track
   */
  async function connectSingleWhipSession(endpointUrl, sharedStream) {
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ],
      bundlePolicy: 'max-bundle',
      rtcpMuxPolicy: 'require'
    })

    // Clone the audio track for each RTCPeerConnection to ensure separate encoding & capture sink
    const originalTrack = sharedStream.getAudioTracks()[0]
    if (!originalTrack) {
      try { pc.close() } catch (_) {}
      throw new Error('Track audio mikrofon tidak tersedia.')
    }
    const clonedTrack = originalTrack.clone()
    const sessionStream = new MediaStream([clonedTrack])

    const transceiver = pc.addTransceiver(clonedTrack, {
      direction: 'sendonly',
      streams: [sessionStream]
    })

    if (transceiver.setCodecPreferences && typeof RTCRtpSender.getCapabilities === 'function') {
      try {
        const capabilities = RTCRtpSender.getCapabilities('audio')
        if (capabilities?.codecs) {
          const opusCodecs = capabilities.codecs.filter(c => c.mimeType.toLowerCase() === 'audio/opus')
          if (opusCodecs.length > 0) {
            transceiver.setCodecPreferences(opusCodecs)
          }
        }
      } catch (err) {
        console.warn('setCodecPreferences warning:', err)
      }
    }

    pc.onconnectionstatechange = () => {
      console.log(`[${endpointUrl}] WebRTC connectionState:`, pc.connectionState)
    }

    // Create SDP Offer
    const offer = await pc.createOffer()
    let sdp = offer.sdp

    if (sdp.includes('useinbandfec=1')) {
      sdp = sdp.replace(/useinbandfec=1/, 'useinbandfec=1; maxplaybackrate=16000; ptime=10; stereo=0; sprop-stereo=0')
    } else {
      sdp = enforceOpus16kMono(sdp)
    }

    await pc.setLocalDescription({ type: offer.type, sdp })

    // Wait for ICE gathering
    await waitForIceGathering(pc, 2000)

    const finalOfferSdp = pc.localDescription?.sdp || sdp

    // Send POST to WHIP endpoint
    const response = await fetch(endpointUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/sdp'
      },
      body: finalOfferSdp
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => '')
      try { clonedTrack.stop() } catch (_) {}
      try { pc.close() } catch (_) {}
      throw new Error(`WHIP error on ${endpointUrl}: ${response.status} ${errorText || response.statusText}`)
    }

    // Save resource location for termination
    const locHeader = response.headers.get('Location')
    let resourceUrl = null
    if (locHeader) {
      resourceUrl = locHeader.startsWith('http')
        ? locHeader
        : new URL(locHeader, endpointUrl).href
    }

    // Set remote description with SDP Answer
    const answerSdp = await response.text()
    await pc.setRemoteDescription({
      type: 'answer',
      sdp: answerSdp
    })

    return {
      url: endpointUrl,
      pc,
      clonedTrack,
      resourceUrl
    }
  }

  /**
   * Start WHIP Publishing (Microphone 16kHz Mono -> MediaMTX)
   * Supports either a single WHIP URL or an Array of WHIP URLs (Multi-Publish Paralel)
   */
  async function startPublish(customWhipUrlOrUrls) {
    if (isPublishing.value) return false

    let urls = []
    if (Array.isArray(customWhipUrlOrUrls)) {
      urls = customWhipUrlOrUrls.map(u => String(u || '').trim()).filter(Boolean)
    } else if (typeof customWhipUrlOrUrls === 'string' && customWhipUrlOrUrls.trim()) {
      urls = [customWhipUrlOrUrls.trim()]
    } else if (whipUrl.value && whipUrl.value.trim()) {
      urls = [whipUrl.value.trim()]
    }

    // Deduplicate URLs to prevent duplicate concurrent sessions to the same MediaMTX path
    const uniqueUrls = [...new Set(urls)]

    if (uniqueUrls.length === 0) {
      publishError.value = 'Pilih minimal satu speaker aktif yang memiliki endpoint WHIP.'
      publishState.value = 'error'
      return false
    }

    targetUrls.value = uniqueUrls
    whipUrl.value = uniqueUrls[0] // Set primary URL for display
    publishError.value = ''
    publishState.value = 'requesting_mic'
    durationSeconds.value = 0
    activeSessionsCount.value = 0

    try {
      // 1. Get user microphone stream CONSTRAINED TO 16kHz & MONO (once for all speakers)
      pttMediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: { ideal: 16000, max: 16000 },
          channelCount: { ideal: 1, exact: 1 },
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        },
        video: false
      })

      publishState.value = 'connecting'
      startAudioMeter(pttMediaStream)

      // 2. Connect in parallel to all unique target WHIP endpoints using addTransceiver
      const connectionPromises = uniqueUrls.map(url => connectSingleWhipSession(url, pttMediaStream))
      const results = await Promise.allSettled(connectionPromises)

      const successfulSessions = []
      const errors = []

      results.forEach((res, idx) => {
        if (res.status === 'fulfilled') {
          successfulSessions.push(res.value)
        } else {
          console.warn(`Gagal menghubungkan WHIP ke ${uniqueUrls[idx]}:`, res.reason)
          errors.push(res.reason?.message || `Koneksi ke ${uniqueUrls[idx]} gagal`)
        }
      })

      if (successfulSessions.length === 0) {
        throw new Error(errors[0] || 'Semua koneksi siaran audio ke server WHIP gagal.')
      }

      pttSessions = successfulSessions
      activeSessionsCount.value = successfulSessions.length
      isPublishing.value = true
      publishState.value = 'live'

      // Start duration timer
      pttTimerInterval = setInterval(() => {
        durationSeconds.value++
      }, 1000)

      // Watch connection state across all peer connections
      successfulSessions.forEach((sess) => {
        sess.pc.oniceconnectionstatechange = () => {
          const aliveSessions = pttSessions.filter(
            s => s.pc && !['failed', 'closed'].includes(s.pc.iceConnectionState)
          )
          activeSessionsCount.value = aliveSessions.length

          if (aliveSessions.length === 0 && isPublishing.value) {
            publishError.value = 'Semua koneksi audio speaker terputus.'
            stopPublish()
          }
        }
      })

      return true
    } catch (err) {
      console.error('Gagal memulai siaran WHIP:', err)
      publishError.value = err.name === 'NotAllowedError'
        ? 'Izin mikrofon ditolak oleh browser. Berikan izin mikrofon untuk Push-to-Talk.'
        : err.name === 'NotFoundError'
        ? 'Perangkat mikrofon tidak ditemukan di komputer ini.'
        : err.message || 'Gagal menghubungkan siaran audio ke server WHIP.'

      publishState.value = 'error'
      stopPublish()
      return false
    }
  }

  /**
   * Stop WHIP Publishing across all sessions
   */
  async function stopPublish() {
    isPublishing.value = false
    publishState.value = 'idle'
    isPttLocked.value = false
    activeSessionsCount.value = 0

    if (pttTimerInterval) {
      clearInterval(pttTimerInterval)
      pttTimerInterval = null
    }

    stopAudioMeter()

    // Stop mic hardware tracks
    if (pttMediaStream) {
      pttMediaStream.getTracks().forEach(track => {
        try { track.stop() } catch (_) {}
      })
      pttMediaStream = null
    }

    // Terminate all WHIP sessions on server & close peer connections
    const sessionsToClose = [...pttSessions]
    pttSessions = []

    await Promise.allSettled(sessionsToClose.map(async (sess) => {
      if (sess.clonedTrack) {
        try {
          sess.clonedTrack.stop()
        } catch (_) {}
      }
      if (sess.resourceUrl) {
        try {
          await fetch(sess.resourceUrl, { method: 'DELETE' })
        } catch (_) {}
      }
      if (sess.pc) {
        try {
          sess.pc.close()
        } catch (_) {}
      }
    }))
  }

  // Cleanup on unmount
  onUnmounted(() => {
    stopPublish()
  })

  return {
    isSupported,
    whipUrl,
    targetUrls,
    activeSessionsCount,
    sampleRate,
    channelCount,
    isPublishing,
    isPttLocked,
    publishState,
    publishError,
    audioLevel,
    durationSeconds,
    startPublish,
    stopPublish
  }
}
