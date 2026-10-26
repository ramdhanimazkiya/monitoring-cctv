import { ref } from 'vue'
import { io } from 'socket.io-client'
import { useCctvStore } from '../stores/cctv.js'
import { useAudioDevicesStore } from '../stores/audioDevices.js'
import { useEventsStore } from '../stores/events.js'

let socket = null
const isConnected = ref(false)
const socketId = ref('')
const lastEventTime = ref(null)

export function useWebSocket() {
  const cctvStore = useCctvStore()
  const audioStore = useAudioDevicesStore()
  const eventsStore = useEventsStore()

  function initSocket() {
    if (socket && socket.connected) {
      return socket
    }

    if (!socket) {
      socket = io('/', {
        path: '/socket.io',
        transports: ['websocket', 'polling'],
        withCredentials: true,
        reconnection: true,
        reconnectionDelay: 2000,
        reconnectionDelayMax: 10000,
        reconnectionAttempts: Infinity,
      })

      socket.on('connect', () => {
        isConnected.value = true
        socketId.value = socket.id
        lastEventTime.value = new Date().toISOString()
        console.info('[WebSocket] Terhubung ke Control Center Hub:', socket.id)
      })

      socket.on('disconnect', (reason) => {
        isConnected.value = false
        console.warn('[WebSocket] Terputus dari Control Center Hub:', reason)
      })

      socket.on('connect_error', (err) => {
        isConnected.value = false
        console.warn('[WebSocket] Kesalahan koneksi:', err.message)
      })

      // 1. Status Perangkat Berubah (Kamera / Speaker)
      socket.on('device:status_changed', (payload) => {
        lastEventTime.value = new Date().toISOString()
        if (payload?.type === 'CAMERA' || payload?.deviceId?.startsWith('CAM-')) {
          cctvStore.handleDeviceStatusChanged?.(payload)
        } else if (payload?.type === 'AUDIO' || payload?.deviceId?.startsWith('AUD-')) {
          audioStore.handleDeviceStatusChanged?.(payload)
        }
      })

      // 2. Ketersediaan Stream CCTV Berubah
      socket.on('cctv:stream_status', (payload) => {
        lastEventTime.value = new Date().toISOString()
        cctvStore.handleStreamStatusChanged?.(payload)
      })

      // 3. Alarm / Insiden Baru atau Resolusi
      socket.on('events:alarm_update', () => {
        lastEventTime.value = new Date().toISOString()
        eventsStore.fetchEvents?.({ limit: 10 })
        eventsStore.fetchStats?.()
      })

      // 4. Kanal Audio PTT Lease (Mutual Exclusion)
      socket.on('audio:lease_update', (payload) => {
        lastEventTime.value = new Date().toISOString()
        audioStore.handleLeaseUpdate?.(payload)
      })
    } else if (!socket.connected) {
      socket.connect()
    }

    return socket
  }

  function disconnectSocket() {
    if (socket) {
      socket.disconnect()
      isConnected.value = false
    }
  }

  return {
    isConnected,
    socketId,
    lastEventTime,
    initSocket,
    disconnectSocket,
  }
}
