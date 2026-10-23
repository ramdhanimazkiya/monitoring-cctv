import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

const STORAGE_KEY = 'cctv_audio_speakers_v1'

const INITIAL_SPEAKERS = [
  {
    id: 'AUD-0001',
    name: 'Speaker 1',
    siteId: 'SIT-001',
    zoneId: 'ZON-001',
    zoneName: 'Zona 1 - Ruang Makan',
    whipUrl: 'https://stream.zakuyu.fun/audio_raw_1/whip',
    rtspUrl: 'rtsp://stream.zakuyu.fun:8554/audio_1',
    latitude: -6.917464,
    longitude: 107.619122,
    sampleRate: 16000,
    channels: 1,
    volume: 85,
    status: 'ONLINE',
    latencyMs: 24,
    lastPingAt: 'Baru saja',
    isActive: true
  },
  {
    id: 'AUD-0002',
    name: 'Speaker 2',
    siteId: 'SIT-001',
    zoneId: 'ZON-001',
    zoneName: 'Zona 1 - Ruang Makan',
    whipUrl: 'https://stream.zakuyu.fun/audio_raw_2/whip',
    rtspUrl: 'rtsp://stream.zakuyu.fun:8554/audio_2',
    latitude: -6.918100,
    longitude: 107.619800,
    sampleRate: 16000,
    channels: 1,
    volume: 90,
    status: 'ONLINE',
    latencyMs: 38,
    lastPingAt: 'Baru saja',
    isActive: true
  },
  {
    id: 'AUD-0003',
    name: 'Speaker 3',
    siteId: 'SIT-001',
    zoneId: 'ZON-002',
    zoneName: 'Zona 2 - Ruang Beranak',
    whipUrl: 'https://stream.zakuyu.fun/audio_raw_3/whip',
    rtspUrl: 'rtsp://stream.zakuyu.fun:8554/audio_3',
    latitude: -6.916800,
    longitude: 107.618500,
    sampleRate: 16000,
    channels: 1,
    volume: 80,
    status: 'ONLINE',
    latencyMs: 19,
    lastPingAt: 'Baru saja',
    isActive: true
  },
  {
    id: 'AUD-0004',
    name: 'Speaker 4',
    siteId: 'SIT-001',
    zoneId: 'ZON-002',
    zoneName: 'Zona 2 - Ruang Beranak',
    whipUrl: 'https://stream.zakuyu.fun/audio_raw_4/whip',
    rtspUrl: 'rtsp://stream.zakuyu.fun:8554/audio_4',
    latitude: -6.916200,
    longitude: 107.618200,
    sampleRate: 16000,
    channels: 1,
    volume: 80,
    status: 'ONLINE',
    latencyMs: 25,
    lastPingAt: 'Baru saja',
    isActive: true
  },
  {
    id: 'AUD-0005',
    name: 'Speaker 5',
    siteId: 'SIT-001',
    zoneId: 'ZON-002',
    zoneName: 'Zona 2 - Ruang Beranak',
    whipUrl: 'https://stream.zakuyu.fun/audio_raw_5/whip',
    rtspUrl: 'rtsp://stream.zakuyu.fun:8554/audio_5',
    latitude: -6.915900,
    longitude: 107.617900,
    sampleRate: 16000,
    channels: 1,
    volume: 85,
    status: 'ONLINE',
    latencyMs: 22,
    lastPingAt: 'Baru saja',
    isActive: true
  }
]

export const useAudioDevicesStore = defineStore('audioDevices', () => {
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
            rtspUrl: d.rtspUrl || (d.whipUrl ? d.whipUrl.replace('/whip', '').replace('https://stream.zakuyu.fun/audio_raw_', 'rtsp://stream.zakuyu.fun:8554/audio_') : ''),
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
      whipUrl: payload.whipUrl?.trim() || `https://stream.zakuyu.fun/${nextId}/whip`,
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
    devices.value = JSON.parse(JSON.stringify(INITIAL_SPEAKERS))
    saveToStorage()
    return devices.value
  }

  async function fetchDevices() {
    return activeDevices.value
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
    setTransmissionStatus,
    fetchDevices,
    resetToDemoSpeakers
  }
})
