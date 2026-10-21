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

  let pttPeerConnection = null
  let pttMediaStream = null
  let pttAudioContext = null
  let pttAnalyser = null
  let pttAnimFrameId = null
  let pttTimerInterval = null
  let pttResourceUrl = null

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
   * Start WHIP Publishing (Microphone 16kHz Mono -> MediaMTX)
   */
  async function startPublish(customWhipUrl) {
    if (isPublishing.value) return false

    if (customWhipUrl) {
      whipUrl.value = customWhipUrl
    }

    if (!whipUrl.value || !whipUrl.value.trim()) {
      publishError.value = 'URL WHIP belum dikonfigurasi.'
      publishState.value = 'error'
      return false
    }

    publishError.value = ''
    publishState.value = 'requesting_mic'
    durationSeconds.value = 0

    try {
      // 1. Get user microphone stream CONSTRAINED TO 16kHz & MONO
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

      // 2. Setup RTCPeerConnection
      pttPeerConnection = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      })

      // Add audio tracks
      pttMediaStream.getAudioTracks().forEach(track => {
        pttPeerConnection.addTrack(track, pttMediaStream)
      })

      // 3. Create SDP Offer & Enforce 16kHz Mono
      const offer = await pttPeerConnection.createOffer()
      const modifiedSdp = enforceOpus16kMono(offer.sdp)
      await pttPeerConnection.setLocalDescription({
        type: 'offer',
        sdp: modifiedSdp
      })

      // 4. Wait for ICE gathering
      await waitForIceGathering(pttPeerConnection)

      // 5. Send POST to WHIP endpoint
      const response = await fetch(whipUrl.value, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/sdp'
        },
        body: pttPeerConnection.localDescription.sdp
      })

      if (!response.ok) {
        const errorText = await response.text().catch(() => '')
        throw new Error(`Server WHIP error (${response.status}): ${errorText || response.statusText}`)
      }

      // Save resource location for termination
      const locHeader = response.headers.get('Location')
      if (locHeader) {
        pttResourceUrl = locHeader.startsWith('http')
          ? locHeader
          : new URL(locHeader, whipUrl.value).href
      } else {
        pttResourceUrl = null
      }

      // 6. Set remote description with SDP Answer
      const answerSdp = await response.text()
      await pttPeerConnection.setRemoteDescription({
        type: 'answer',
        sdp: answerSdp
      })

      isPublishing.value = true
      publishState.value = 'live'

      // Start timer
      pttTimerInterval = setInterval(() => {
        durationSeconds.value++
      }, 1000)

      // Watch connection state
      pttPeerConnection.oniceconnectionstatechange = () => {
        if (!pttPeerConnection) return
        if (['failed', 'disconnected', 'closed'].includes(pttPeerConnection.iceConnectionState)) {
          if (isPublishing.value) {
            publishError.value = `Koneksi audio terputus (${pttPeerConnection.iceConnectionState})`
            stopPublish()
          }
        }
      }

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
   * Stop WHIP Publishing
   */
  async function stopPublish() {
    isPublishing.value = false
    publishState.value = 'idle'
    isPttLocked.value = false

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

    // Terminate WHIP session on server if URL exists
    const urlToDelete = pttResourceUrl
    pttResourceUrl = null
    if (urlToDelete) {
      try {
        fetch(urlToDelete, { method: 'DELETE' }).catch(() => {})
      } catch (_) {}
    }

    // Close PeerConnection
    if (pttPeerConnection) {
      try {
        pttPeerConnection.close()
      } catch (_) {}
      pttPeerConnection = null
    }
  }

  // Cleanup on unmount
  onUnmounted(() => {
    stopPublish()
  })

  return {
    isSupported,
    whipUrl,
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
