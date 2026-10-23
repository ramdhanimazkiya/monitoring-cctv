import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useCctvStore = defineStore('cctv', () => {
  // Bersihkan cache demo masa lalu jika ada di browser
  if (typeof window !== 'undefined') {
    localStorage.removeItem('cctv_cameras_v1')
  }

  const cameras = ref([])
  const sites = ref([])
  const zones = ref([])
  const loading = ref(false)
  const error = ref(null)

  const activeCameras = computed(() => cameras.value.filter((c) => c.isActive !== false && !c.deletedAt))

  const mapCameras = computed(() =>
    activeCameras.value
      .filter((c) => c.latitude !== null && c.longitude !== null && c.latitude !== undefined && c.longitude !== undefined)
      .map((c) => ({
        id: c.id,
        name: c.name,
        type: 'cctv',
        latitude: Number(c.latitude),
        longitude: Number(c.longitude),
        status: c.status || 'UNKNOWN',
        latencyMs: c.latencyMs || null,
        streamStatus: c.streamStatus || 'NOT_CONFIGURED',
        zoneName: c.zone?.name || c.zoneName || '-',
        siteName: c.site?.name || c.siteName || '-',
        streamUrl: c.streamUrl || c.urls?.directStreamUrl || c.urls?.playbackUrl || null,
        urls: c.urls || {}
      }))
  )

  function getCameraById(id) {
    return cameras.value.find((c) => c.id === id) || null
  }

  /**
   * Mengambil daftar Site & Zone nyata dari database PostgreSQL
   */
  async function fetchSitesAndZones() {
    try {
      const [resSites, resZones] = await Promise.all([
        fetch('/api/sites', { credentials: 'include' }),
        fetch('/api/zones', { credentials: 'include' })
      ])

      if (resSites.ok) {
        const body = await resSites.json()
        if (body.success && Array.isArray(body.data)) {
          sites.value = body.data
        }
      }

      if (resZones.ok) {
        const body = await resZones.json()
        if (body.success && Array.isArray(body.data)) {
          zones.value = body.data
        }
      }
    } catch (err) {
      console.warn('Gagal memuat sites/zones dari backend:', err)
    }
  }

  async function createSite(payload) {
    loading.value = true
    try {
      const res = await fetch('/api/sites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      })
      const body = await res.json()
      if (!res.ok || !body.success) {
        throw new Error(body.error?.message || body.message || 'Gagal membuat site')
      }
      await fetchSitesAndZones()
      return body.data
    } finally {
      loading.value = false
    }
  }

  async function updateSite(id, payload) {
    loading.value = true
    try {
      const res = await fetch(`/api/sites/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      })
      const body = await res.json()
      if (!res.ok || !body.success) {
        throw new Error(body.error?.message || body.message || 'Gagal memperbarui site')
      }
      await fetchSitesAndZones()
      return body.data
    } finally {
      loading.value = false
    }
  }

  async function deleteSite(id) {
    loading.value = true
    try {
      const res = await fetch(`/api/sites/${id}`, {
        method: 'DELETE',
        headers: { Accept: 'application/json' },
        credentials: 'include'
      })
      const body = await res.json()
      if (!res.ok || !body.success) {
        throw new Error(body.error?.message || body.message || 'Gagal menghapus site')
      }
      await fetchSitesAndZones()
      return true
    } finally {
      loading.value = false
    }
  }

  async function createZone(payload) {
    loading.value = true
    try {
      const res = await fetch('/api/zones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      })
      const body = await res.json()
      if (!res.ok || !body.success) {
        throw new Error(body.error?.message || body.message || 'Gagal membuat zona')
      }
      await fetchSitesAndZones()
      return body.data
    } finally {
      loading.value = false
    }
  }

  async function updateZone(id, payload) {
    loading.value = true
    try {
      const res = await fetch(`/api/zones/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      })
      const body = await res.json()
      if (!res.ok || !body.success) {
        throw new Error(body.error?.message || body.message || 'Gagal memperbarui zona')
      }
      await fetchSitesAndZones()
      return body.data
    } finally {
      loading.value = false
    }
  }

  async function deleteZone(id) {
    loading.value = true
    try {
      const res = await fetch(`/api/zones/${id}`, {
        method: 'DELETE',
        headers: { Accept: 'application/json' },
        credentials: 'include'
      })
      const body = await res.json()
      if (!res.ok || !body.success) {
        throw new Error(body.error?.message || body.message || 'Gagal menghapus zona')
      }
      await Promise.all([
        fetchSitesAndZones(),
        fetchCameras()
      ])
      return body
    } finally {
      loading.value = false
    }
  }

  /**
   * READ: Ambil seluruh kamera nyata langsung dari database PostgreSQL
   */
  async function fetchCameras() {
    loading.value = true
    error.value = null
    try {
      const res = await fetch('/api/cameras?limit=100', {
        headers: { Accept: 'application/json' },
        credentials: 'include'
      })

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: Gagal memuat daftar kamera dari database`)
      }

      const body = await res.json()
      if (body.success && body.data) {
        const list = Array.isArray(body.data) ? body.data : body.data.data || []
        cameras.value = list.map((cam) => {
          const directUrl =
            cam.streamUrl ||
            (cam.adapterConfig && cam.adapterConfig.streamUrl) ||
            (cam.streamKey && cam.streamKey.startsWith('http')
              ? cam.streamKey
              : cam.streamKey
              ? `https://stream.zakuyu.fun/${cam.streamKey.replace(/^\//, '').replace(/\/$/, '')}/`
              : null)

          return {
            ...cam,
            streamUrl: directUrl,
            zoneName: cam.zone?.name || cam.zoneName || '-',
            siteName: cam.site?.name || cam.siteName || '-',
            status: cam.status || 'UNKNOWN',
            isActive: cam.isActive !== false
          }
        })
      }
      checkMediaGateway()
      // Periksa status aktual seluruh stream kamera
      checkAllStreams()
      return cameras.value
    } catch (err) {
      error.value = err.message
      console.error('Error fetchCameras dari DB:', err)
      return []
    } finally {
      loading.value = false
    }
  }

  /**
   * CREATE: Simpan kamera baru langsung ke database PostgreSQL
   */
  async function createCamera(payload) {
    loading.value = true
    try {
      const res = await fetch('/api/cameras', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(payload)
      })

      const body = await res.json()
      if (!res.ok || !body.success) {
        throw new Error(body.error?.message || body.message || 'Gagal menyimpan kamera ke database')
      }

      await fetchCameras()
      return body.data
    } finally {
      loading.value = false
    }
  }

  /**
   * UPDATE: Perbarui data kamera langsung di database PostgreSQL
   */
  async function updateCamera(id, payload) {
    loading.value = true
    try {
      const res = await fetch(`/api/cameras/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(payload)
      })

      const body = await res.json()
      if (!res.ok || !body.success) {
        throw new Error(body.error?.message || body.message || 'Gagal memperbarui kamera di database')
      }

      await fetchCameras()
      return body.data
    } finally {
      loading.value = false
    }
  }

  /**
   * DELETE: Soft delete / arsipkan kamera di database PostgreSQL
   */
  async function deleteCamera(id) {
    loading.value = true
    try {
      const res = await fetch(`/api/cameras/${id}`, {
        method: 'DELETE',
        headers: { Accept: 'application/json' },
        credentials: 'include'
      })

      const body = await res.json()
      if (!res.ok || !body.success) {
        throw new Error(body.error?.message || body.message || 'Gagal menghapus kamera di database')
      }

      await fetchCameras()
      return true
    } finally {
      loading.value = false
    }
  }

  const mediaGateway = ref({
    connected: false,
    status: 'UNKNOWN',
    latencyMs: null,
    activePathsCount: 0,
    gatewayUrl: '',
    apiUrl: '',
    lastChecked: null,
    loading: false
  })

  /**
   * MEMERIKSA STATUS KONEKTIVITAS SERVER MEDIAMTX (TERPISAH DARI KAMERA)
   */
  async function checkMediaGateway() {
    mediaGateway.value.loading = true
    const start = performance.now()
    try {
      const res = await fetch('/api/streaming/gateway/status', {
        headers: { Accept: 'application/json' },
        credentials: 'include'
      })
      const latency = Math.round(performance.now() - start)
      if (res.ok) {
        const body = await res.json()
        if (body.success && body.data) {
          mediaGateway.value = {
            connected: body.data.connected === true,
            status: body.data.connected ? 'ONLINE' : 'OFFLINE',
            latencyMs: body.data.latencyMs ?? latency,
            activePathsCount: body.data.activePathsCount || 0,
            gatewayUrl: body.data.gatewayUrl || '',
            apiUrl: body.data.apiUrl || '',
            lastChecked: new Date().toLocaleTimeString('id-ID'),
            loading: false
          }
          return mediaGateway.value
        }
      }
      mediaGateway.value.connected = false
      mediaGateway.value.status = 'OFFLINE'
      mediaGateway.value.latencyMs = null
      mediaGateway.value.lastChecked = new Date().toLocaleTimeString('id-ID')
    } catch {
      mediaGateway.value.connected = false
      mediaGateway.value.status = 'OFFLINE'
      mediaGateway.value.latencyMs = null
      mediaGateway.value.lastChecked = new Date().toLocaleTimeString('id-ID')
    } finally {
      mediaGateway.value.loading = false
    }
    return mediaGateway.value
  }

  const lastStatusCheckTime = ref('-')
  let isCheckingStatus = false
  let cameraStatusInterval = null
  let pollingSubscribers = 0
  let currentPollingInterval = 1000

  /**
   * Helper untuk mengekstrak nama path stream kamera pada MediaMTX
   */
  function extractCameraPath(cam) {
    if (!cam) return ''
    if (cam.streamKey && !cam.streamKey.startsWith('http')) {
      return cam.streamKey.trim().replace(/^\//, '').replace(/\/$/, '')
    }
    const url = cam.streamUrl || (cam.adapterConfig && cam.adapterConfig.streamUrl) || ''
    if (url) {
      try {
        const parsed = new URL(url)
        const parts = parsed.pathname.split('/').filter(Boolean)
        if (parts.length > 0) {
          if (parts[parts.length - 1] === 'index.m3u8' || parts[parts.length - 1] === 'whep') {
            return parts.slice(0, parts.length - 1).join('/')
          }
          return parts.join('/')
        }
      } catch {
        // bukan URL standar
      }
    }
    return cam.id ? cam.id.toLowerCase() : ''
  }

  /**
   * Pengecekan status 1 kamera CCTV spesifik menggunakan MediaMTX API:
   * GET https://api.zakuyu.fun/v3/paths/get/{name}
   * - 200 OK + source != null: ONLINE
   * - 200 OK + source == null: OFFLINE
   * - 404 Not Found (path not found): OFFLINE
   */
  async function checkSingleCameraStatus(cam) {
    if (!cam) return { success: false, status: 'UNKNOWN' }
    const pathName = extractCameraPath(cam)
    if (!pathName) {
      cam.status = 'UNKNOWN'
      cam.streamStatus = 'NOT_CONFIGURED'
      cam.latencyMs = null
      return { success: false, status: 'UNKNOWN' }
    }

    const cleanPath = pathName.replace(/^\//, '').replace(/\/$/, '')
    const start = performance.now()
    let data = null
    let latencyMs = 0
    let is404 = false

    try {
      // 1. Direct fetch ke MediaMTX API /v3/paths/get/{name}
      try {
        const response = await fetch(`https://api.zakuyu.fun/v3/paths/get/${cleanPath}`, {
          cache: 'no-store',
          signal: AbortSignal.timeout(1000)
        })
        latencyMs = Math.round(performance.now() - start)
        if (response.ok) {
          data = await response.json()
        } else if (response.status === 404) {
          is404 = true
        }
      } catch (directErr) {
        // Fallback melalui backend proxy jika direct fetch terhalang
        try {
          const fallbackRes = await fetch(`/api/streaming/gateway/paths/get/${cleanPath}`, {
            credentials: 'include',
            signal: AbortSignal.timeout(1000)
          })
          latencyMs = Math.round(performance.now() - start)
          if (fallbackRes.ok) {
            data = await fallbackRes.json()
          } else if (fallbackRes.status === 404) {
            is404 = true
          }
        } catch {
          // ignore
        }
      }

      const prevStatus = cam.status
      let newStatus = 'OFFLINE'
      let newStreamStatus = 'UNAVAILABLE'
      let reason = `Stream path '${cleanPath}' tidak ditemukan / kamera offline`

      if (data && !data.error && !is404) {
        const isOnline = Boolean(data.source)
        newStatus = isOnline ? 'ONLINE' : 'OFFLINE'
        newStreamStatus = isOnline ? 'AVAILABLE' : 'UNAVAILABLE'
        reason = isOnline
          ? `Sumber video CCTV aktif (${data.source?.type || 'Online'})`
          : 'Sumber video CCTV mati / kamera offline (source: null)'
      }

      cam.status = newStatus
      cam.streamStatus = newStreamStatus
      cam.latencyMs = newStatus === 'ONLINE' ? Math.max(1, latencyMs) : null
      cam.statusReason = reason

      // Sinkronkan ke database backend jika status mengalami perubahan
      if (prevStatus && prevStatus !== newStatus && prevStatus !== 'UNKNOWN') {
        syncCameraStatus(cam.id, newStatus, newStreamStatus, reason)
      }

      return {
        success: newStatus === 'ONLINE',
        status: newStatus,
        streamStatus: newStreamStatus,
        latency: cam.latencyMs,
        reason
      }
    } catch (err) {
      cam.status = 'OFFLINE'
      cam.streamStatus = 'UNAVAILABLE'
      cam.latencyMs = null
      cam.statusReason = err.message || 'Gagal menghubungi server MediaMTX'
      return { success: false, status: 'OFFLINE', error: err.message }
    }
  }

  /**
   * Pengecekan status seluruh kamera CCTV menggunakan https://api.zakuyu.fun/v3/paths/get/{name}
   */
  async function checkCameraStatus() {
    if (isCheckingStatus) return
    isCheckingStatus = true

    try {
      if (!cameras.value.length) return { success: true }
      await Promise.allSettled(cameras.value.map((cam) => checkSingleCameraStatus(cam)))
      lastStatusCheckTime.value = new Date().toLocaleTimeString('id-ID', { hour12: false })
      return { success: true, timestamp: lastStatusCheckTime.value }
    } finally {
      isCheckingStatus = false
    }
  }

  /**
   * Menjalankan polling status kamera otomatis setiap intervalMs (default 1000ms untuk respons instan)
   */
  function startCameraStatusPolling(intervalMs = 1000) {
    pollingSubscribers++
    if (!cameraStatusInterval || intervalMs < currentPollingInterval) {
      if (cameraStatusInterval) {
        clearInterval(cameraStatusInterval)
      }
      currentPollingInterval = intervalMs
      checkCameraStatus()
      cameraStatusInterval = setInterval(checkCameraStatus, intervalMs)
    }
  }

  /**
   * Menghentikan polling ketika komponen unmounted
   */
  function stopCameraStatusPolling() {
    pollingSubscribers = Math.max(0, pollingSubscribers - 1)
    if (pollingSubscribers === 0 && cameraStatusInterval) {
      clearInterval(cameraStatusInterval)
      cameraStatusInterval = null
    }
  }

  /**
   * PING / CEK STREAM: Uji spesifik kamera ini langsung ke endpoint /v3/paths/get/{name}
   */
  async function pingCamera(id) {
    const cam = getCameraById(id)
    if (!cam) return { success: false, error: 'Kamera tidak ditemukan' }
    return await checkSingleCameraStatus(cam)
  }

  /**
   * CEK SELURUH STREAM KAMERA SECARA SERENTAK
   */
  async function checkAllStreams() {
    return checkCameraStatus()
  }

  /**
   * UJI STREAM URL: Digunakan di modal untuk validasi langsung endpoint video
   */
  async function testStreamUrl(url) {
    if (!url || !url.trim()) {
      return { success: false, message: 'URL stream tidak boleh kosong' }
    }

    const start = performance.now()
    try {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), 4000)

      await fetch(url.trim(), {
        method: 'GET',
        mode: 'no-cors',
        cache: 'no-store',
        signal: controller.signal
      })
      clearTimeout(timer)

      const latency = Math.round(performance.now() - start)
      return { success: true, latency, message: `Stream responsif (${latency} ms)` }
    } catch (err) {
      return { success: false, message: 'Tidak dapat menjangkau URL stream' }
    }
  }

  const deviceStats = ref({
    cameras: { total: 0, ONLINE: 0, OFFLINE: 0, WARNING: 0, UNKNOWN: 0 },
    audioDevices: { total: 0, ONLINE: 0, OFFLINE: 0, WARNING: 0, UNKNOWN: 0 }
  })

  async function fetchDeviceStats() {
    try {
      const res = await fetch('/api/devices/stats', {
        headers: { Accept: 'application/json' },
        credentials: 'include'
      })
      if (res.ok) {
        const body = await res.json()
        if (body.success && body.data) {
          deviceStats.value = body.data
          return body.data
        }
      }
    } catch (e) {
      console.warn('Gagal memuat statistik perangkat dari database:', e)
    }
  }

  /**
   * SINKRONISASI STATUS KAMERA DARI VIDEO PLAYER KLIEN KE STORE & BACKEND
   * (Ketika stream aktif terdeteksi -> ONLINE, ketika kamera mati / error -> OFFLINE)
   */
  async function syncCameraStatus(id, status, streamStatus, reason) {
    const cam = getCameraById(id)
    if (cam) {
      cam.status = status
      cam.streamStatus = streamStatus || (status === 'ONLINE' ? 'AVAILABLE' : 'UNAVAILABLE')
      if (status === 'ONLINE' && !cam.latencyMs) {
        cam.latencyMs = 18
      } else if (status === 'OFFLINE') {
        cam.latencyMs = null
      }
      cam.statusReason = reason
    }

    try {
      await fetch(`/api/streaming/cameras/${encodeURIComponent(id)}/status-sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          status,
          streamStatus: streamStatus || (status === 'ONLINE' ? 'AVAILABLE' : 'UNAVAILABLE'),
          reason,
          latencyMs: cam?.latencyMs || (status === 'ONLINE' ? 18 : null)
        })
      })
    } catch (err) {
      // background sync
    }
  }

  return {
    cameras,
    sites,
    zones,
    deviceStats,
    activeCameras,
    mapCameras,
    loading,
    error,
    getCameraById,
    fetchCameras,
    fetchSitesAndZones,
    fetchDeviceStats,
    createCamera,
    updateCamera,
    deleteCamera,
    createSite,
    updateSite,
    deleteSite,
    createZone,
    updateZone,
    deleteZone,
    pingCamera,
    testStreamUrl,
    mediaGateway,
    checkMediaGateway,
    checkAllStreams,
    syncCameraStatus,
    checkCameraStatus,
    checkSingleCameraStatus,
    startCameraStatusPolling,
    stopCameraStatusPolling,
    lastStatusCheckTime,
    extractCameraPath
  }
})

