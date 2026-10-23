<template>
  <div class="relative w-full h-full min-h-[300px] rounded-xl overflow-hidden border border-[#283548] shadow-lg bg-[#0b0f17]">
    <!-- Authentic Leaflet Map Container -->
    <div ref="mapContainer" class="w-full h-full z-10 min-h-[300px]"></div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useRouter } from 'vue-router'

const router = useRouter()
const emit = defineEmits(['select-camera', 'inspect-camera'])

const props = defineProps({
  devices: {
    type: Array,
    default: () => []
  },
  center: {
    type: Array,
    default: () => [-6.917464, 107.619122]
  },
  zoom: {
    type: Number,
    default: 14
  },
  navigateOnSelect: {
    type: Boolean,
    default: false
  }
})

const mapContainer = ref(null)
const selectedCamera = ref(null)

let mapInstance = null
let markerGroup = null
let resizeObserver = null
const markersMap = new Map()

function isDeviceOnline(d) {
  const isCctv = !d.type || String(d.type).toLowerCase() === 'cctv'
  const status = String(d.status || '').toUpperCase()
  const streamStatus = String(d.streamStatus || '').toUpperCase()

  if (isCctv) {
    // Di CCTV Grid: ONLINE jika status === 'ONLINE' dan streamStatus !== 'UNAVAILABLE'
    return status === 'ONLINE' && streamStatus !== 'UNAVAILABLE'
  }
  return status === 'ONLINE'
}

function getStreamMediaHtml(d) {
  const isCctv = !d.type || String(d.type).toLowerCase() === 'cctv'
  if (!isCctv) {
    return `
      <div class="cctv-popup-audio">
        <span style="font-size: 22px; margin-bottom: 4px;">🔊</span>
        <span style="font-family: ui-monospace, monospace; font-size: 11px; font-weight: 600; color: #cbd5e1;">Perangkat Audio Speaker</span>
        <span style="font-family: ui-monospace, monospace; font-size: 10px; color: #64748b;">(Hanya transmisi suara / PTT)</span>
      </div>
    `
  }

  const isOnline = isDeviceOnline(d)
  const streamUrl = d.streamUrl || ''

  if (!isOnline || !streamUrl) {
    return `
      <div class="cctv-popup-player-container">
        <div class="cctv-popup-offline">
          <p class="cctv-offline-text">error: stream not found, retrying in some second</p>
        </div>
      </div>
    `
  }

  const lower = streamUrl.toLowerCase()
  const isDirectVideo = lower.endsWith('.mp4') || lower.endsWith('.webm') || lower.endsWith('.ogg') || lower.endsWith('.mov')

  if (isDirectVideo) {
    return `
      <div class="cctv-popup-player-container">
        <video src="${streamUrl}" autoplay muted loop playsinline class="cctv-popup-video"></video>
      </div>
    `
  }

  // MediaMTX stream web player (WebRTC WHEP embed URL)
  const cleanUrl = streamUrl.replace(/\/whep$/, '').replace(/\/index\.m3u8$/, '')
  const base = cleanUrl.endsWith('/') ? cleanUrl : `${cleanUrl}/`
  const sep = base.includes('?') ? '&' : '?'
  const iframeSrc = `${base}${sep}autoplay=true&muted=true&controls=false&playsinline=true`

  return `
    <div class="cctv-popup-player-container">
      <iframe
        src="${iframeSrc}"
        allow="autoplay; fullscreen; encrypted-media"
        loading="lazy"
        class="cctv-popup-iframe"
      ></iframe>
    </div>
  `
}

function buildPopupHtml(d, lat, lng) {
  const isOnline = isDeviceOnline(d)
  const statusLabel = isOnline ? 'ONLINE' : 'OFFLINE'
  const statusClass = isOnline ? 'online' : 'offline'
  const mediaHtml = getStreamMediaHtml(d)

  return `
    <div class="cctv-card-popup" data-device-id="${d.id}">
      <!-- Header: ID badge, Name, and Status Badge (Sama seperti CCTV Grid) -->
      <div class="cctv-popup-header">
        <div class="cctv-popup-title-group">
          <span class="cctv-popup-id-badge">${d.id}</span>
          <span class="cctv-popup-name" title="${d.name || d.id}">${d.name || d.id}</span>
        </div>
        <div class="cctv-popup-status-wrapper">
          <span class="cctv-popup-status-badge ${statusClass}">
            <span class="cctv-status-dot ${statusClass}"></span>
            <span class="cctv-status-text">${statusLabel}</span>
          </span>
        </div>
      </div>

      <!-- Video Stream Media Player Container (Card Kecil Preview) -->
      <div class="cctv-popup-media-slot">
        ${mediaHtml}
      </div>

      <!-- Meta Info: Location & GPS -->
      <div class="cctv-popup-meta">
        <div class="cctv-popup-meta-row">
          <span class="cctv-meta-label">zona :</span>
          <span class="cctv-meta-value">${d.zoneName || d.siteName || '-'}</span>
        </div>
        <div class="cctv-popup-meta-row">
          <span class="cctv-meta-label">Koordinat:</span>
          <span class="cctv-meta-coords">${lat.toFixed(5)}, ${lng.toFixed(5)}</span>
        </div>
      </div>
    </div>
  `
}

function initMap() {
  if (!mapContainer.value) return

  // Inisialisasi peta standar Leaflet dengan kontrol bawaan terang asli
  mapInstance = L.map(mapContainer.value, {
    zoomControl: true,
    attributionControl: true,
    closePopupOnClick: false
  }).setView(props.center, props.zoom)

  // Tile Layer resmi OpenStreetMap standar terang bawaan asli Leaflet
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors'
  }).addTo(mapInstance)

  markerGroup = L.layerGroup().addTo(mapInstance)

  // Handle action click inside Leaflet popup & prevent propagation
  mapInstance.on('popupopen', (e) => {
    const container = e.popup?.getElement()
    if (!container) return

    L.DomEvent.disableClickPropagation(container)
    L.DomEvent.disableScrollPropagation(container)

    const btn = container.querySelector('[data-action="inspect"]')
    if (btn) {
      btn.onclick = (event) => {
        event.preventDefault()
        event.stopPropagation()
        const devId = btn.getAttribute('data-device-id')
        const targetDevice = props.devices.find((d) => d.id === devId)
        if (targetDevice) {
          emit('inspect-camera', targetDevice)
          if (props.navigateOnSelect || window.location.pathname !== '/cctv') {
            router.push('/cctv')
          }
        }
      }
    }
  })

  renderMarkers(true)

  // Setup ResizeObserver agar peta menyesuaikan kontainer secara mulus
  if (window.ResizeObserver && mapContainer.value) {
    resizeObserver = new ResizeObserver(() => {
      invalidateSize()
    })
    resizeObserver.observe(mapContainer.value)
  }
}

function renderMarkers(autoFit = false) {
  if (!markerGroup || !mapInstance) return
  markerGroup.clearLayers()
  markersMap.clear()

  const validBounds = []

  props.devices.forEach((d) => {
    if (d.latitude === null || d.longitude === null || d.latitude === undefined || d.longitude === undefined) return
    const lat = Number(d.latitude)
    const lng = Number(d.longitude)
    if (isNaN(lat) || isNaN(lng)) return

    validBounds.push([lat, lng])

    // Marker berbentuk titik (circleMarker) dengan warna status sama seperti CCTV Grid (ONLINE: #10b981 hijau, OFFLINE: #ef4444 merah) & border putih
    const isOnline = isDeviceOnline(d)
    const fillColor = isOnline ? '#10b981' : '#ef4444'
    const marker = L.circleMarker([lat, lng], {
      radius: 8,
      fillColor: fillColor,
      color: '#ffffff',
      weight: 2.5,
      opacity: 1,
      fillOpacity: 0.95
    })

    const popupHtml = buildPopupHtml(d, lat, lng)

    marker.bindPopup(popupHtml, {
      minWidth: 280,
      maxWidth: 300,
      className: 'cctv-leaflet-popup',
      autoPan: true,
      closeOnClick: false
    })

    marker.on('click', () => {
      selectedCamera.value = d
      emit('select-camera', d)
    })

    markerGroup.addLayer(marker)
    markersMap.set(d.id, marker)
  })

  // Auto-fit ke seluruh marker hanya pada pemanggilan eksplisit
  if (autoFit && validBounds.length > 0 && mapInstance) {
    if (validBounds.length === 1) {
      mapInstance.setView(validBounds[0], 15)
    } else {
      const bounds = L.latLngBounds(validBounds)
      mapInstance.fitBounds(bounds, { padding: [35, 35], maxZoom: 16 })
    }
  }
}

function updateOrRenderMarkers() {
  if (!markerGroup || !mapInstance) return

  // Check if any popup is currently open
  let openMarkerId = null
  for (const [id, marker] of markersMap.entries()) {
    if (marker.isPopupOpen && marker.isPopupOpen()) {
      openMarkerId = id
      break
    }
  }

  // Check if devices list actually changed in structure (IDs added/removed)
  const currentIds = new Set(props.devices.map((d) => d.id))
  const existingIds = new Set(markersMap.keys())
  const hasStructuralChange = currentIds.size !== existingIds.size || [...currentIds].some((id) => !existingIds.has(id))

  if (hasStructuralChange || markersMap.size === 0) {
    renderMarkers(false)
    if (openMarkerId && markersMap.has(openMarkerId)) {
      markersMap.get(openMarkerId).openPopup()
    }
    return
  }

  // In-place updates: update marker colors without closing or reloading active popup
  props.devices.forEach((d) => {
    const marker = markersMap.get(d.id)
    if (!marker) return

    const isOnline = isDeviceOnline(d)
    const fillColor = isOnline ? '#10b981' : '#ef4444'
    marker.setStyle({ fillColor })

    // DO NOT touch popup if it's currently open to prevent video restarting or popup closing
    if (!marker.isPopupOpen || !marker.isPopupOpen()) {
      const lat = Number(d.latitude)
      const lng = Number(d.longitude)
      marker.setPopupContent(buildPopupHtml(d, lat, lng))
    } else {
      // In-place real-time DOM update for currently open popup without tearing down the iframe
      const popupEl = mapContainer.value?.querySelector(`.cctv-card-popup[data-device-id="${d.id}"]`)
      if (popupEl) {
        const statusBadge = popupEl.querySelector('.cctv-popup-status-badge')
        const statusDot = popupEl.querySelector('.cctv-status-dot')
        const statusText = popupEl.querySelector('.cctv-status-text')

        if (statusBadge && statusDot && statusText) {
          const currentIsOnline = statusBadge.classList.contains('online')
          if (currentIsOnline !== isOnline) {
            statusBadge.className = `cctv-popup-status-badge ${isOnline ? 'online' : 'offline'}`
            statusDot.className = `cctv-status-dot ${isOnline ? 'online' : 'offline'}`
            statusText.textContent = isOnline ? 'ONLINE' : 'OFFLINE'

            const mediaSlot = popupEl.querySelector('.cctv-popup-media-slot')
            if (mediaSlot) {
              mediaSlot.innerHTML = getStreamMediaHtml(d)
            }
          }
        }
      }
    }
  })
}

function selectCamera(camera) {
  if (!camera) return
  selectedCamera.value = camera
  flyToDevice(camera.id)
}

function flyToDevice(id) {
  const d = props.devices.find((dev) => dev.id === id)
  if (d && d.latitude !== null && d.longitude !== null && mapInstance) {
    selectedCamera.value = d
    const lat = Number(d.latitude)
    const lng = Number(d.longitude)
    mapInstance.flyTo([lat, lng], 16, { duration: 0.6 })
    const marker = markersMap.get(id)
    if (marker) {
      mapInstance.once('moveend', () => {
        marker.openPopup()
      })
    }
  }
}

function fitAll() {
  const validBounds = props.devices
    .filter((d) => d.latitude !== null && d.longitude !== null && !isNaN(Number(d.latitude)) && !isNaN(Number(d.longitude)))
    .map((d) => [Number(d.latitude), Number(d.longitude)])

  if (validBounds.length > 0 && mapInstance) {
    if (validBounds.length === 1) {
      mapInstance.setView(validBounds[0], 15)
    } else {
      const bounds = L.latLngBounds(validBounds)
      mapInstance.fitBounds(bounds, { padding: [35, 35], maxZoom: 16 })
    }
  }
}

function focusCenter() {
  if (mapInstance) {
    mapInstance.setView(props.center, props.zoom)
  }
}

function invalidateSize() {
  if (mapInstance) {
    mapInstance.invalidateSize()
  }
}

defineExpose({
  selectedCamera,
  flyToDevice,
  selectCamera,
  fitAll,
  focusCenter,
  invalidateSize
})

watch(
  () => props.devices,
  () => {
    updateOrRenderMarkers()
  },
  { deep: true }
)

onMounted(() => {
  initMap()
  setTimeout(() => {
    invalidateSize()
  }, 200)
})

onUnmounted(() => {
  if (resizeObserver) {
    resizeObserver.disconnect()
    resizeObserver = null
  }
  if (mapInstance) {
    mapInstance.remove()
    mapInstance = null
  }
})
</script>

<style scoped>
:deep(.cctv-leaflet-popup .leaflet-popup-content-wrapper) {
  background: #0d121d !important;
  color: #f1f5f9 !important;
  border: 1px solid #283548 !important;
  border-radius: 12px !important;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.7), 0 8px 10px -6px rgba(0, 0, 0, 0.7) !important;
  padding: 0 !important;
  overflow: hidden !important;
}

:deep(.cctv-leaflet-popup .leaflet-popup-content) {
  margin: 0 !important;
  line-height: 1.4 !important;
  width: 280px !important;
}

:deep(.cctv-leaflet-popup .leaflet-popup-tip) {
  background: #0d121d !important;
  border: 1px solid #283548 !important;
}

:deep(.cctv-leaflet-popup a.leaflet-popup-close-button) {
  color: #94a3b8 !important;
  padding: 6px !important;
  top: 8px !important;
  right: 8px !important;
  font-size: 16px !important;
  z-index: 20 !important;
}

:deep(.cctv-leaflet-popup a.leaflet-popup-close-button:hover) {
  color: #ffffff !important;
}

:deep(.cctv-card-popup) {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  padding: 10px;
  background: #0d121d;
  color: #f8fafc;
  box-sizing: border-box;
}

:deep(.cctv-popup-header) {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  margin-bottom: 8px;
  padding-right: 18px; /* space for leaflet close button */
}

:deep(.cctv-popup-title-group) {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  flex: 1;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}

:deep(.cctv-popup-id-badge) {
  padding: 2px 5px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 700;
  background: rgba(23, 37, 84, 0.9);
  color: #93c5fd;
  border: 1px solid rgba(59, 130, 246, 0.6);
  flex-shrink: 0;
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  line-height: 1.2;
}

:deep(.cctv-popup-name) {
  font-size: 11px;
  font-weight: 600;
  color: #f1f5f9;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.2;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}

:deep(.cctv-popup-status-wrapper) {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

:deep(.cctv-popup-status-badge) {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 9px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-weight: 700;
  white-space: nowrap;
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  line-height: 1.2;
}

:deep(.cctv-popup-status-badge.online) {
  background: rgba(6, 78, 59, 0.9);
  color: #6ee7b7;
  border: 1px solid rgba(16, 185, 129, 0.7);
}

:deep(.cctv-popup-status-badge.offline) {
  background: rgba(76, 5, 25, 0.9);
  color: #fda4af;
  border: 1px solid rgba(244, 63, 94, 0.7);
}

:deep(.cctv-status-dot) {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}

:deep(.cctv-status-dot.online) {
  background: #34d399;
  animation: cctv-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

:deep(.cctv-status-dot.offline) {
  background: #fb7185;
}

@keyframes cctv-pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.3;
  }
}

:deep(.cctv-popup-player-container) {
  position: relative;
  width: 100%;
  aspect-ratio: 16/9;
  background: #000000;
  border-radius: 6px;
  overflow: hidden;
  margin-bottom: 8px;
  border: 1px solid #1e293b;
  display: flex;
  align-items: center;
  justify-content: center;
}

:deep(.cctv-popup-iframe),
:deep(.cctv-popup-video) {
  width: 100%;
  height: 100%;
  border: 0;
  object-fit: cover;
  display: block;
  background: #000000;
}

:deep(.cctv-popup-offline) {
  position: absolute;
  inset: 0;
  z-index: 20;
  background-color: #000000 !important;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 12px;
  text-align: center;
  user-select: none;
  box-sizing: border-box;
}

:deep(.cctv-offline-text) {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 11px;
  color: #ffffff;
  font-weight: 500;
  letter-spacing: 0.025em;
  line-height: 1.4;
  margin: 0;
}

:deep(.cctv-popup-audio) {
  width: 100%;
  aspect-ratio: 16/9;
  background: #0b111e;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  overflow: hidden;
  margin-bottom: 8px;
  border: 1px solid #1e293b;
}

:deep(.cctv-popup-meta) {
  font-size: 11px;
  color: #94a3b8;
  margin-bottom: 8px;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

:deep(.cctv-popup-meta-row) {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 4px;
}

:deep(.cctv-meta-label) {
  color: #64748b;
  font-size: 10px;
}

:deep(.cctv-meta-value) {
  color: #e2e8f0;
  font-weight: 500;
  text-align: right;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 180px;
}

:deep(.cctv-meta-coords) {
  font-family: ui-monospace, monospace;
  font-size: 10px;
  color: #94a3b8;
}

:deep(.cctv-popup-footer) {
  border-top: 1px solid #1e293b;
  padding-top: 8px;
  display: flex;
  justify-content: flex-end;
}

:deep(.cctv-popup-btn) {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: rgba(37, 99, 235, 0.15);
  color: #60a5fa;
  border: 1px solid rgba(37, 99, 235, 0.4);
  padding: 5px 8px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
  width: 100%;
  justify-content: center;
}

:deep(.cctv-popup-btn:hover) {
  background: #2563eb;
  color: #ffffff;
  border-color: #3b82f6;
}
</style>
