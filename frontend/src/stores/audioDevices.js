import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import {
  STREAM_GATEWAY_URL,
  STREAM_RTSP_HOST,
  getWhipUrl,
  getApiPathsListUrl
} from '../config/stream.js'

const STORAGE_KEY = 'cctv_audio_speakers_v1'

export const useAudioDevicesStore = defineStore('audioDevices', () => {
  const loading = ref(false)
  const error = ref(null)

  // Load from localStorage or defaults (array kosong agar sinkron dengan database)
  const devices = ref(loadFromStorage())

  function normalizeAudio(d, existingMap = new Map()) {
    const existing = existingMap.get(d.id) || {}
    const whip = d.whipUrl || d.adapterConfig?.whipUrl || existing.whipUrl || getWhipUrl(d.id)
    const rtsp = d.rtspUrl || (whip ? whip.replace('/whip', '').replace(`${STREAM_GATEWAY_URL}/audio_raw_`, `rtsp://${STREAM_RTSP_HOST}:8554/audio_`) : '')

    // Jika zona sudah dihapus di backend (zoneId null atau d.zone.deletedAt != null), pastikan null (Unassigned)
    const isDeletedZone = d.zone && d.zone.deletedAt != null
    const validZoneId = isDeletedZone ? null : (d.zoneId || d.zone?.id || null)
    const validZoneName = isDeletedZone ? null : (d.zone?.name || null)

    return {
      id: d.id,
      name: d.name,
      siteId: d.siteId || d.site?.id || existing.siteId || '',
      siteName: d.site?.name || existing.siteName || '-',
      zoneId: validZoneId,
      zoneName: validZoneName,
      whipUrl: whip,
      rtspUrl: rtsp,
      latitude: d.latitude !== null && d.latitude !== undefined && d.latitude !== '' ? Number(d.latitude) : existing.latitude ?? null,
      longitude: d.longitude !== null && d.longitude !== undefined && d.longitude !== '' ? Number(d.longitude) : existing.longitude ?? null,
      sampleRate: 16000,
      channels: 1,
      volume: d.volume !== undefined ? Number(d.volume) : (d.adapterConfig?.volume ?? existing.volume ?? 80),
      status: existing.status && existing.status !== 'UNKNOWN' ? existing.status : (d.status || 'UNKNOWN'),
      latencyMs: existing.latencyMs !== undefined ? existing.latencyMs : (d.latencyMs ?? null),
      lastPingAt: existing.lastPingAt || d.lastPingAt || '-',
      isActive: d.isActive !== false && !d.deletedAt,
      deletedAt: d.deletedAt || null,
      createdAt: d.createdAt || existing.createdAt || new Date().toISOString()
    }
  }

  function loadFromStorage() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map(d => ({
            ...d,
            status: d.status || 'UNKNOWN',
          }))
        }
      }
    } catch (e) {
      console.warn('Gagal membaca audio speakers dari localStorage:', e)
    }
    return []
  }

  function saveToStorage() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(devices.value))
    } catch (e) {
      console.warn('Gagal menyimpan audio speakers ke localStorage:', e)
    }
  }

  // Getters
  const activeDevices = computed(() => {
    return devices.value.filter(d => d.isActive !== false && !d.deletedAt)
  })

  const onlineDevicesCount = computed(() => {
    return activeDevices.value.filter(d => d.status === 'ONLINE' || d.status === 'ON AIR').length
  })

  function getDeviceById(id) {
    return devices.value.find(d => d.id === id) || null
  }

  /**
   * READ: Ambil seluruh perangkat audio nyata dari database backend
   */
  async function fetchAudioDevices() {
    loading.value = true
    error.value = null
    try {
      const res = await fetch('/api/audio-devices?limit=100', {
        headers: { Accept: 'application/json' },
        credentials: 'include'
      })

      if (res.ok) {
        const body = await res.json()
        if (body.success && body.data) {
          const list = Array.isArray(body.data) ? body.data : body.data.data || []
          const existingMap = new Map(devices.value.map(d => [d.id, d]))
          devices.value = list.map(d => normalizeAudio(d, existingMap))
          saveToStorage()
          return devices.value
        }
      }
    } catch (err) {
      console.warn('Gagal fetch audio devices dari backend, menggunakan local state:', err)
      error.value = err.message
    } finally {
      loading.value = false
    }
    return devices.value
  }

  // Alias for backward compatibility
  const fetchDevices = fetchAudioDevices

  /**
   * CREATE: Simpan speaker baru ke database backend
   */
  async function createDevice(payload) {
    loading.value = true
    try {
      const res = await fetch('/api/audio-devices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          name: payload.name?.trim(),
          siteId: payload.siteId,
          zoneId: payload.zoneId || null,
          whipUrl: payload.whipUrl?.trim() || null,
          volume: payload.volume !== undefined ? Number(payload.volume) : 80,
          latitude: payload.latitude !== null && payload.latitude !== undefined && payload.latitude !== '' ? Number(payload.latitude) : null,
          longitude: payload.longitude !== null && payload.longitude !== undefined && payload.longitude !== '' ? Number(payload.longitude) : null,
          supportsPtt: true,
          supportsTts: true,
          adapterType: 'mock'
        })
      })

      const body = await res.json()
      if (!res.ok || !body.success) {
        throw new Error(body.error?.message || body.message || 'Gagal membuat perangkat audio di backend')
      }

      await fetchAudioDevices()
      return body.data
    } catch (err) {
      console.warn('Backend create gagal, fallback lokal:', err)
      // Fallback local creation
      let maxNum = 0
      devices.value.forEach(d => {
        const match = d.id?.match(/AUD-(\d+)/)
        if (match) {
          const n = parseInt(match[1], 10)
          if (n > maxNum) maxNum = n
        }
      })
      const nextId = `AUD-${String(maxNum + 1).padStart(4, '0')}`

      const newDevice = {
        id: nextId,
        name: payload.name.trim(),
        siteId: payload.siteId || null,
        zoneId: payload.zoneId || null,
        zoneName: payload.zoneName || '-',
        whipUrl: payload.whipUrl?.trim() || getWhipUrl(nextId),
        latitude: payload.latitude !== null && payload.latitude !== undefined && payload.latitude !== '' ? Number(payload.latitude) : null,
        longitude: payload.longitude !== null && payload.longitude !== undefined && payload.longitude !== '' ? Number(payload.longitude) : null,
        sampleRate: 16000,
        channels: 1,
        volume: payload.volume !== undefined ? Number(payload.volume) : 80,
        status: 'UNKNOWN',
        latencyMs: null,
        lastPingAt: '-',
        isActive: true,
        createdAt: new Date().toISOString()
      }

      devices.value.push(newDevice)
      saveToStorage()
      return newDevice
    } finally {
      loading.value = false
    }
  }

  /**
   * UPDATE: Perbarui speaker audio di backend
   */
  async function updateDevice(id, payload) {
    loading.value = true
    try {
      const res = await fetch(`/api/audio-devices/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          name: payload.name ? payload.name.trim() : undefined,
          siteId: payload.siteId,
          zoneId: payload.zoneId || null,
          whipUrl: payload.whipUrl ? payload.whipUrl.trim() : undefined,
          volume: payload.volume !== undefined ? Number(payload.volume) : undefined,
          latitude: payload.latitude !== undefined ? (payload.latitude !== null && payload.latitude !== '' ? Number(payload.latitude) : null) : undefined,
          longitude: payload.longitude !== undefined ? (payload.longitude !== null && payload.longitude !== '' ? Number(payload.longitude) : null) : undefined
        })
      })

      const body = await res.json()
      if (!res.ok || !body.success) {
        throw new Error(body.error?.message || body.message || 'Gagal memperbarui speaker di backend')
      }

      await fetchAudioDevices()
      return body.data
    } catch (err) {
      console.warn('Backend update gagal:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * DELETE (Soft Delete / Archive di backend)
   */
  async function deleteDevice(id) {
    loading.value = true
    try {
      const res = await fetch(`/api/audio-devices/${id}`, {
        method: 'DELETE',
        headers: { Accept: 'application/json' },
        credentials: 'include'
      })

      const body = await res.json()
      if (!res.ok || !body.success) {
        throw new Error(body.error?.message || body.message || 'Gagal mengarsipkan speaker di backend')
      }

      await fetchAudioDevices()
      return true
    } catch (err) {
      console.warn('Backend delete gagal, fallback lokal:', err)
      const index = devices.value.findIndex(d => d.id === id)
      if (index !== -1) {
        devices.value[index].isActive = false
        devices.value[index].deletedAt = new Date().toISOString()
        saveToStorage()
        return true
      }
      throw err
    } finally {
      loading.value = false
    }
  }

  let gatewayCheckPromise = null
  let lastGatewayCheck = 0
  let cachedGatewayResult = null

  /**
   * Pengecekan status server MediaMTX secara efisien & ter-batch
   * Status online/offline perangkat audio mengacu sepenuhnya pada kesiapan gateway MediaMTX.
   */
  async function checkMediaMtxHealth() {
    const now = Date.now()
    if (cachedGatewayResult && now - lastGatewayCheck < 2500) {
      return cachedGatewayResult
    }
    if (gatewayCheckPromise) {
      return gatewayCheckPromise
    }

    gatewayCheckPromise = (async () => {
      const start = performance.now()
      try {
        // 1. Cek langsung ke MediaMTX API
        const res = await fetch(getApiPathsListUrl(), {
          cache: 'no-store',
          signal: AbortSignal.timeout(2500)
        })
        const latency = Math.round(performance.now() - start)
        if (res.ok) {
          cachedGatewayResult = { ok: true, latency: Math.max(1, latency) }
          lastGatewayCheck = Date.now()
          return cachedGatewayResult
        }
      } catch (_) {
        // 2. Fallback via proxy backend jika direct fetch terhalang
        try {
          const fallbackRes = await fetch('/api/streaming/gateway/status', {
            credentials: 'include',
            signal: AbortSignal.timeout(2500)
          })
          const latency = Math.round(performance.now() - start)
          if (fallbackRes.ok) {
            const body = await fallbackRes.json()
            if (body.success && body.data?.connected) {
              cachedGatewayResult = {
                ok: true,
                latency: Math.max(1, body.data.latencyMs || latency)
              }
              lastGatewayCheck = Date.now()
              return cachedGatewayResult
            }
          }
        } catch {
          // Gateway offline
        }
      }

      cachedGatewayResult = { ok: false, latency: null }
      lastGatewayCheck = Date.now()
      return cachedGatewayResult
    })().finally(() => {
      gatewayCheckPromise = null
    })

    return gatewayCheckPromise
  }

  /**
   * LIVE PING STATUS TEST (MediaMTX-based)
   * Status speaker audio ONLINE/OFFLINE ditentukan dari berjalan atau tidaknya server MediaMTX.
   */
  async function pingDevice(id) {
    const dev = getDeviceById(id)
    if (!dev) return { success: false, error: 'Perangkat tidak ditemukan' }

    try {
      const gateway = await checkMediaMtxHealth()

      if (gateway.ok) {
        dev.status = 'ONLINE'
        dev.latencyMs = gateway.latency
        dev.lastPingAt = new Date().toLocaleTimeString('id-ID')
        saveToStorage()
        return { success: true, latency: gateway.latency }
      } else {
        dev.status = 'OFFLINE'
        dev.latencyMs = null
        dev.lastPingAt = 'Gateway Offline'
        saveToStorage()
        return { success: false, error: 'MediaMTX Gateway Offline' }
      }
    } catch (err) {
      dev.status = 'OFFLINE'
      dev.latencyMs = null
      dev.lastPingAt = 'Gateway Offline'
      saveToStorage()
      return { success: false, error: err.message || 'MediaMTX Offline' }
    }
  }

  /**
   * SET DYNAMIC TRANSMISSION STATUS (ON AIR vs ONLINE)
   */
  function setTransmissionStatus(id, isTransmitting) {
    const revertStatus = (d) => {
      if (isTransmitting) return 'ON AIR'
      if (d.lastPingAt && d.lastPingAt !== '-' && d.lastPingAt !== 'Koneksi Gagal' && d.lastPingAt !== 'Gateway Offline') return 'ONLINE'
      if (d.status === 'OFFLINE' || d.lastPingAt === 'Gateway Offline' || d.lastPingAt === 'Koneksi Gagal') return 'OFFLINE'
      return d.status || 'ONLINE'
    }

    if (id === 'ALL') {
      devices.value.forEach(d => {
        if (d.isActive) d.status = revertStatus(d)
      })
      saveToStorage()
      return
    }

    if (id.startsWith('ZON-') || id.startsWith('ZONE_')) {
      const cleanZoneId = id.replace('ZONE_', '')
      devices.value.forEach(d => {
        if ((d.zoneId === cleanZoneId || d.zoneName === cleanZoneId) && d.isActive) {
          d.status = revertStatus(d)
        }
      })
      saveToStorage()
      return
    }

    const dev = getDeviceById(id)
    if (dev) {
      dev.status = revertStatus(dev)
      saveToStorage()
    }
  }

  function resetToDemoSpeakers() {
    devices.value = []
    saveToStorage()
    return devices.value
  }

  /**
   * Handler real-time event dari WebSocket Hub (device:status_changed)
   */
  function handleDeviceStatusChanged(event) {
    if (!event?.deviceId) return
    const dev = getDeviceById(event.deviceId)
    if (dev) {
      if (event.status) dev.status = event.status
      if (event.latencyMs !== undefined) dev.latencyMs = event.latencyMs
      dev.lastPingAt = new Date().toLocaleTimeString('id-ID')
      saveToStorage()
    }
  }

  /**
   * Handler real-time event dari WebSocket Hub (audio:lease_update)
   */
  function handleLeaseUpdate(event) {
    if (!event?.audioDeviceId) return
    const dev = getDeviceById(event.audioDeviceId)
    if (dev) {
      if (event.acquired) {
        dev.status = 'ON AIR'
        dev.occupiedBy = event.username || event.userId
      } else {
        if (dev.status === 'ON AIR') dev.status = 'ONLINE'
        dev.occupiedBy = null
      }
      saveToStorage()
    }
  }

  return {
    devices,
    activeDevices,
    onlineDevicesCount,
    loading,
    error,
    getDeviceById,
    fetchAudioDevices,
    fetchDevices,
    createDevice,
    updateDevice,
    deleteDevice,
    pingDevice,
    setTransmissionStatus,
    resetToDemoSpeakers,
    handleDeviceStatusChanged,
    handleLeaseUpdate
  }
})
