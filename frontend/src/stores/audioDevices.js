import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

const STORAGE_KEY = 'cctv_audio_speakers_v1'

const INITIAL_SPEAKERS = []

export const useAudioDevicesStore = defineStore('audioDevices', () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY)
  }

  // Load from localStorage or defaults
  const devices = ref(loadFromStorage())

  function loadFromStorage() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map(d => ({
            ...d,
            status: d.status || 'UNKNOWN',
            latitude: d.latitude !== undefined ? d.latitude : (d.id === 'AUD-0001' ? -6.917464 : d.id === 'AUD-0002' ? -6.918100 : -6.916800),
            longitude: d.longitude !== undefined ? d.longitude : (d.id === 'AUD-0001' ? 107.619122 : d.id === 'AUD-0002' ? 107.619800 : 107.618500)
          }))
        }
      }
    } catch (e) {
      console.warn('Gagal membaca audio speakers dari localStorage:', e)
    }
    return JSON.parse(JSON.stringify(INITIAL_SPEAKERS))
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
    return devices.value.filter(d => d.isActive !== false)
  })

  const onlineDevicesCount = computed(() => {
    return activeDevices.value.filter(d => d.status === 'ONLINE' || d.status === 'ON AIR').length
  })

  function getDeviceById(id) {
    return devices.value.find(d => d.id === id) || null
  }

  /**
   * CREATE: Auto-generate ID: AUD-xxxx (Immutable)
   */
  function createDevice(payload) {
    // Determine next sequential ID
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
      id: nextId, // Immutable generated ID
      name: payload.name.trim(),
      siteId: payload.siteId || null,
      zoneId: payload.zoneId || null,
      zoneName: payload.zoneName || '-',
      whipUrl: payload.whipUrl?.trim() || '',
      latitude: payload.latitude !== null && payload.latitude !== undefined && payload.latitude !== '' ? Number(payload.latitude) : null,
      longitude: payload.longitude !== null && payload.longitude !== undefined && payload.longitude !== '' ? Number(payload.longitude) : null,
      sampleRate: 16000, // Enforce 16kHz
      channels: 1, // Enforce Mono
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
  }

  /**
   * UPDATE: ID cannot be modified (strict immutability)
   */
  function updateDevice(id, payload) {
    const index = devices.value.findIndex(d => d.id === id)
    if (index === -1) return null

    const current = devices.value[index]
    const updated = {
      ...current,
      name: payload.name ? payload.name.trim() : current.name,
      siteId: payload.siteId || current.siteId,
      zoneId: payload.zoneId || current.zoneId,
      zoneName: payload.zoneName || current.zoneName || '-',
      whipUrl: payload.whipUrl ? payload.whipUrl.trim() : current.whipUrl,
      latitude: payload.latitude !== undefined ? (payload.latitude !== null && payload.latitude !== '' ? Number(payload.latitude) : null) : current.latitude,
      longitude: payload.longitude !== undefined ? (payload.longitude !== null && payload.longitude !== '' ? Number(payload.longitude) : null) : current.longitude,
      sampleRate: 16000, // Always 16kHz
      channels: 1, // Always Mono
      volume: payload.volume !== undefined ? Number(payload.volume) : current.volume,
      updatedAt: new Date().toISOString()
    }

    devices.value[index] = updated
    saveToStorage()
    return updated
  }

  /**
   * DELETE (Soft Delete / Archive)
   */
  function deleteDevice(id) {
    const index = devices.value.findIndex(d => d.id === id)
    if (index !== -1) {
      devices.value[index].isActive = false
      devices.value[index].deletedAt = new Date().toISOString()
      saveToStorage()
      return true
    }
    return false
  }

  /**
   * LIVE PING STATUS TEST (Dinamis & Aktif)
   * Sends HTTP OPTIONS to the WHIP URL to measure real round-trip latency
   */
  async function pingDevice(id) {
    const dev = getDeviceById(id)
    if (!dev) return { success: false, error: 'Perangkat tidak ditemukan' }

    if (!dev.whipUrl || !dev.whipUrl.trim()) {
      dev.status = 'OFFLINE'
      dev.latencyMs = null
      dev.lastPingAt = new Date().toLocaleTimeString('id-ID')
      saveToStorage()
      return { success: false, error: 'URL WHIP belum dikonfigurasi' }
    }

    const url = dev.whipUrl.trim()
    const start = performance.now()

    try {
      const response = await fetch(url, {
        method: 'OPTIONS',
        cache: 'no-store'
      })

      const latency = Math.round(performance.now() - start)

      if (response.ok || response.status === 204) {
        dev.status = 'ONLINE'
        dev.latencyMs = latency
        dev.lastPingAt = new Date().toLocaleTimeString('id-ID')
        saveToStorage()
        return { success: true, latency }
      } else {
        dev.status = 'WARNING'
        dev.latencyMs = latency
        dev.lastPingAt = new Date().toLocaleTimeString('id-ID')
        saveToStorage()
        return { success: true, latency }
      }
    } catch (err) {
      console.warn(`Ping ke ${url} gagal:`, err)
      dev.status = 'OFFLINE'
      dev.latencyMs = 0
      dev.lastPingAt = 'Koneksi Gagal'
      saveToStorage()
      return { success: false, error: err.message }
    }
  }

  /**
   * SET DYNAMIC TRANSMISSION STATUS (ON AIR vs ONLINE)
   */
  function setTransmissionStatus(id, isTransmitting) {
    const revertStatus = (d) => {
      if (isTransmitting) return 'ON AIR'
      if (d.lastPingAt && d.lastPingAt !== '-' && d.lastPingAt !== 'Koneksi Gagal') return 'ONLINE'
      if (d.status === 'OFFLINE' || d.lastPingAt === 'Koneksi Gagal') return 'OFFLINE'
      return d.status || 'UNKNOWN'
    }

    if (id === 'ALL') {
      devices.value.forEach(d => {
        if (d.isActive) d.status = revertStatus(d)
      })
      saveToStorage()
      return
    }

    if (id.startsWith('ZON-')) {
      devices.value.forEach(d => {
        if (d.zoneId === id && d.isActive) {
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

  return {
    devices,
    activeDevices,
    onlineDevicesCount,
    getDeviceById,
    createDevice,
    updateDevice,
    deleteDevice,
    pingDevice,
    setTransmissionStatus
  }
})
