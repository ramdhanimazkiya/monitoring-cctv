<template>
  <div class="relative w-full h-full min-h-[420px] rounded-xl overflow-hidden border border-[#283548] shadow-2xl bg-[#0a0e17]">
    <!-- Leaflet Map Container -->
    <div ref="mapContainer" class="w-full h-full z-10 min-h-[420px]"></div>

    <!-- Map Overlay Controls / Legend -->
    <div class="absolute top-3 right-3 z-[1000] bg-[#0d121e]/90 backdrop-blur-md border border-[#283548] p-2.5 rounded-lg text-xs shadow-2xl space-y-1.5 font-mono select-none">
      <div class="text-[10px] text-slate-400 uppercase font-semibold border-b border-[#283548] pb-1 flex items-center justify-between gap-3">
        <span>LEGENDA CCTV</span>
        <span class="text-[9px] text-emerald-400">LIVE FEED</span>
      </div>
      <div class="flex items-center gap-2">
        <span class="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.7)] animate-pulse"></span>
        <span class="text-slate-200 text-[11px]">Stream HLS / Online</span>
      </div>
      <div class="flex items-center gap-2">
        <span class="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(239,68,68,0.7)]"></span>
        <span class="text-slate-200 text-[11px]">Kamera Offline</span>
      </div>
      <div class="flex items-center gap-2">
        <span class="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.7)]"></span>
        <span class="text-slate-200 text-[11px]">Speaker WHIP</span>
      </div>
    </div>

    <!-- Attribution Badge -->
    <div class="absolute bottom-2 left-3 z-[1000] bg-[#0b0f17]/85 backdrop-blur-xs border border-[#1e2a3b] px-2 py-0.5 rounded text-[9px] font-mono text-slate-400 select-none">
      Leaflet OSM
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import Hls from 'hls.js'
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
let activePopupHls = null
const markersMap = new Map()

function initMap() {
  if (!mapContainer.value) return

  // Inisialisasi peta Leaflet dengan OpenStreetMap Tile Server
  mapInstance = L.map(mapContainer.value, {
    zoomControl: true,
    attributionControl: false
  }).setView(props.center, props.zoom)

  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap contributors'
  }).addTo(mapInstance)

  markerGroup = L.layerGroup().addTo(mapInstance)
  renderMarkers()

  // Setup ResizeObserver to prevent grey tiles on layout changes
  if (window.ResizeObserver && mapContainer.value) {
    resizeObserver = new ResizeObserver(() => {
      invalidateSize()
    })
    resizeObserver.observe(mapContainer.value)
  }
}

function renderMarkers() {
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

    let color = '#3b82f6'
    if (d.type === 'cctv') {
      if (d.streamUrl || d.status === 'ONLINE') {
        color = '#10b981'
      } else if (d.status === 'OFFLINE') {
        color = '#ef4444'
      } else {
        color = '#f59e0b'
      }
    }

    const markerHtml = `
      <div style="background-color: ${color}; width: 18px; height: 18px; border-radius: 50%; border: 3px solid #0b101c; box-shadow: 0 0 14px ${color}; cursor: pointer;"></div>
    `

    const customIcon = L.divIcon({
      html: markerHtml,
      className: 'custom-map-pin',
      iconSize: [18, 18],
      iconAnchor: [9, 9]
    })

    const marker = L.marker([lat, lng], { icon: customIcon })

    const isHls = d.streamUrl && (d.streamUrl.toLowerCase().includes('.m3u8') || d.streamUrl.toLowerCase().includes('/video/') || d.streamUrl.toLowerCase().includes('/hls'))
    const isDirectVid = d.streamUrl && (d.streamUrl.toLowerCase().endsWith('.mp4') || d.streamUrl.toLowerCase().endsWith('.webm'))
    const isWebEmbed = d.streamUrl && !isHls && !isDirectVid && d.streamUrl.startsWith('http')

    let videoElementHtml = ''
    if (isWebEmbed) {
      const sep = d.streamUrl.includes('?') ? '&' : '?'
      const embedSrc = `${d.streamUrl}${sep}autoplay=true&muted=true&controls=false&playsinline=true`
      videoElementHtml = `
        <iframe
          src="${embedSrc}"
          style="width: 100%; height: 100%; border: none; position: absolute; inset: 0;"
          allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
          allowfullscreen
        ></iframe>
      `
    } else {
      videoElementHtml = `
        <video
          id="map-popup-video-${d.id}"
          autoplay
          muted
          playsinline
          loop
          style="width: 100%; height: 100%; object-fit: cover; position: absolute; inset: 0;"
        ></video>
      `
    }

    // Popup with embedded Live Video Player (Diputar saat marker diklik)
    const popupHtml = `
      <div style="font-family: ui-monospace, monospace; width: 290px; background: #0c121e; border-radius: 10px; overflow: hidden; color: #f1f5f9; box-shadow: 0 10px 25px rgba(0,0,0,0.8);">
        <div style="position: relative; width: 100%; aspect-ratio: 16/9; background: #000000; overflow: hidden;">
          ${videoElementHtml}
          <div style="position: absolute; top: 6px; left: 6px; z-index: 20; font-size: 9px; font-weight: bold; background: rgba(6, 78, 59, 0.9); color: #6ee7b7; padding: 2px 6px; border-radius: 4px; border: 1px solid rgba(16, 185, 129, 0.6); display: flex; align-items: center; gap: 4px; pointer-events: none;">
            <span style="display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: #34d399; margin-top: 1px;"></span>
            LIVE
          </div>
        </div>

        <div style="padding: 10px 12px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
            <strong style="color: #60a5fa; font-size: 11px;">${d.id}</strong>
            <span style="font-size: 9px; padding: 1px 6px; border-radius: 4px; background: #1e293b; color: ${color}; font-weight: bold;">
              ${d.status || 'ONLINE'}
            </span>
          </div>

          <div style="font-weight: 700; font-size: 12px; color: #ffffff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-bottom: 2px;" title="${d.name}">
            ${d.name}
          </div>

          <div style="color: #94a3b8; font-size: 10px;">
            ${d.zoneName || d.siteName || 'Area CCTV'}
          </div>

          <div style="margin-top: 8px; display: flex; gap: 6px;">
            <button
              id="btn-inspect-${d.id}"
              style="flex: 1; background: #2563eb; color: #ffffff; border: none; padding: 6px 8px; border-radius: 5px; font-size: 10px; font-weight: 700; cursor: pointer;"
            >
              Inspeksi Layar Penuh →
            </button>
          </div>
        </div>
      </div>
    `

    marker.bindPopup(popupHtml, {
      className: 'custom-cctv-popup',
      maxWidth: 320,
      closeButton: true
    })

    marker.on('click', () => {
      selectedCamera.value = d
    })

    marker.on('popupopen', () => {
      selectedCamera.value = d
      emit('select-camera', d)

      // Auto play video di dalam popup jika bukan iframe
      if (!isWebEmbed) {
        const videoEl = document.getElementById(`map-popup-video-${d.id}`)
        if (videoEl && d.streamUrl) {
          videoEl.muted = true
          videoEl.autoplay = true
          videoEl.playsInline = true
          videoEl.setAttribute('playsinline', 'true')
          videoEl.setAttribute('webkit-playsinline', 'true')

          if (isHls && Hls.isSupported()) {
            if (activePopupHls) {
              activePopupHls.destroy()
            }
            activePopupHls = new Hls({ enableWorker: true, lowLatencyMode: true })
            activePopupHls.loadSource(d.streamUrl)
            activePopupHls.attachMedia(videoEl)
            activePopupHls.on(Hls.Events.MANIFEST_PARSED, () => {
              videoEl.play().catch(() => {})
            })
          } else {
            videoEl.src = d.streamUrl
            videoEl.play().catch(() => {})
          }
        }
      }

      const btnInspect = document.getElementById(`btn-inspect-${d.id}`)
      if (btnInspect) {
        btnInspect.onclick = () => {
          emit('select-camera', d)
          if (props.navigateOnSelect) {
            router.push('/cctv')
          }
        }
      }
    })

    marker.on('popupclose', () => {
      if (activePopupHls) {
        activePopupHls.destroy()
        activePopupHls = null
      }
    })

    markerGroup.addLayer(marker)
    markersMap.set(d.id, marker)
  })

  // Auto-fit ke seluruh marker kamera jika ada koordinat valid (tanpa membuka popup)
  if (validBounds.length > 0 && mapInstance) {
    if (validBounds.length === 1) {
      mapInstance.setView(validBounds[0], 15)
    } else {
      const bounds = L.latLngBounds(validBounds)
      mapInstance.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 })
    }
  }
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
    mapInstance.flyTo([lat, lng], 16, { duration: 1.0 })
    const marker = markersMap.get(id)
    if (marker) {
      setTimeout(() => {
        marker.openPopup()
      }, 400)
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
      mapInstance.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 })
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
    renderMarkers()
  },
  { deep: true }
)

onMounted(() => {
  initMap()
})

onUnmounted(() => {
  if (activePopupHls) {
    activePopupHls.destroy()
    activePopupHls = null
  }
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
:deep(.leaflet-popup-content-wrapper) {
  background: transparent !important;
  box-shadow: none !important;
  padding: 0 !important;
  border-radius: 10px !important;
  overflow: hidden !important;
}

:deep(.leaflet-popup-content) {
  margin: 0 !important;
  line-height: 1 !important;
}

:deep(.leaflet-popup-tip) {
  background: #0c121e !important;
  border: 1px solid #1e293b !important;
}

:deep(.leaflet-container a.leaflet-popup-close-button) {
  color: #ffffff !important;
  top: 6px !important;
  right: 6px !important;
  width: 22px !important;
  height: 22px !important;
  background: rgba(0, 0, 0, 0.7) !important;
  border-radius: 50% !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  font-size: 14px !important;
  z-index: 50 !important;
  text-decoration: none !important;
}
</style>
