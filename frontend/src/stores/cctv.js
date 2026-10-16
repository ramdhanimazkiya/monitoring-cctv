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
        status: c.status || 'ONLINE',
        latencyMs: c.latencyMs || null,
        streamStatus: c.streamStatus || 'AVAILABLE',
        zoneName: c.zone?.name || c.zoneName || 'Lobby Utama',
        siteName: c.site?.name || c.siteName || 'Site A',
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
      await fetchSitesAndZones()
      return true
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
            (cam.streamKey && cam.streamKey.startsWith('http') ? cam.streamKey : null)

          return {
            ...cam,
            streamUrl: directUrl,
            zoneName: cam.zone?.name || cam.zoneName || 'Lobby Utama',
            siteName: cam.site?.name || cam.siteName || 'Site A',
            status: cam.status || 'ONLINE',
            isActive: cam.isActive !== false
          }
        })
      }
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

  /**
   * PING: Uji respons kamera atau stream URL secara dinamis
   */
  async function pingCamera(id) {
    const cam = getCameraById(id)
    if (!cam) return { success: false, error: 'Kamera tidak ditemukan' }

    const url = cam.streamUrl || 'https://stream.zakuyu.fun/bandung/rest_room/'
    const start = performance.now()

    try {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), 4000)

      await fetch(url, {
        method: 'GET',
        mode: 'no-cors',
        cache: 'no-store',
        signal: controller.signal
      })
      clearTimeout(timer)

      const latency = Math.round(performance.now() - start)
      cam.status = 'ONLINE'
      cam.latencyMs = latency
      cam.streamStatus = 'AVAILABLE'
      return { success: true, latency }
    } catch (err) {
      console.warn(`Ping ke kamera ${cam.id} gagal:`, err)
      cam.status = 'OFFLINE'
      cam.latencyMs = 0
      cam.streamStatus = 'UNAVAILABLE'
      return { success: false, error: err.message || 'Koneksi timeout' }
    }
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

  return {
    cameras,
    sites,
    zones,
    activeCameras,
    mapCameras,
    loading,
    error,
    getCameraById,
    fetchCameras,
    fetchSitesAndZones,
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
    testStreamUrl
  }
})
