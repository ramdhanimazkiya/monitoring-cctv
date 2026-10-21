<template>
  <div class="relative w-full h-full min-h-[300px] rounded-xl overflow-hidden border border-[#283548] shadow-lg bg-slate-100">
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

function initMap() {
  if (!mapContainer.value) return

  // Inisialisasi peta standar Leaflet dengan kontrol bawaan terang asli
  mapInstance = L.map(mapContainer.value, {
    zoomControl: true,
    attributionControl: true
  }).setView(props.center, props.zoom)

  // Tile Layer resmi OpenStreetMap standar terang bawaan asli Leaflet
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors'
  }).addTo(mapInstance)

  markerGroup = L.layerGroup().addTo(mapInstance)
  renderMarkers()

  // Setup ResizeObserver agar peta menyesuaikan kontainer secara mulus
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

    // Marker berbentuk titik (circleMarker) dengan warna status & border putih
    const fillColor = d.status === 'ONLINE' ? '#10b981' : (d.status === 'OFFLINE' ? '#ef4444' : '#64748b')
    const marker = L.circleMarker([lat, lng], {
      radius: 8,
      fillColor: fillColor,
      color: '#ffffff',
      weight: 2.5,
      opacity: 1,
      fillOpacity: 0.95
    })

    // Classic Leaflet White Popup
    const statusColor = d.status === 'ONLINE' ? '#16a34a' : (d.status === 'OFFLINE' ? '#dc2626' : '#64748b')
    const hasStream = d.type === 'cctv' && d.streamUrl
    const popupHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 12px; line-height: 1.5; color: #1e293b; min-width: 230px; max-width: 280px; padding: 2px;">
        <div style="font-size: 14px; font-weight: 700; color: #0f172a; margin-bottom: 2px;">
          ${d.name || d.id}
        </div>
        <div style="font-size: 11px; font-family: ui-monospace, monospace; color: #2563eb; font-weight: 600; margin-bottom: 6px;">
          ${d.id} • ${d.type === 'cctv' ? 'Kamera CCTV' : 'Speaker Audio'}
        </div>
        ${hasStream ? `
          <div style="margin-bottom: 8px; border-radius: 6px; overflow: hidden; background: #000; position: relative; aspect-ratio: 16/9;">
            <video src="${d.streamUrl}" autoplay muted loop playsinline style="width: 100%; height: 100%; object-fit: cover; display: block;"></video>
          </div>
        ` : ''}
        <div style="margin-bottom: 3px;">
          Status: <strong style="color: ${statusColor}; font-weight: 700;">${d.status || 'UNKNOWN'}</strong>
        </div>
        <div style="color: #64748b; font-size: 11px; margin-bottom: 3px;">
          Lokasi: ${d.zoneName || d.siteName || '-'}
        </div>
        <div style="color: #94a3b8; font-size: 10px; font-family: ui-monospace, monospace; margin-top: 4px;">
          Koordinat: ${lat.toFixed(5)}, ${lng.toFixed(5)}
        </div>
        <div style="margin-top: 8px; padding-top: 6px; border-top: 1px solid #e2e8f0; display: flex; justify-content: flex-end;">
          <a href="/cctv" style="color: #2563eb; text-decoration: underline; font-weight: 600; font-size: 11px;">
            Buka Monitoring CCTV &rarr;
          </a>
        </div>
      </div>
    `

    marker.bindPopup(popupHtml)

    marker.on('click', () => {
      selectedCamera.value = d
      emit('select-camera', d)
    })

    markerGroup.addLayer(marker)
    markersMap.set(d.id, marker)
  })

  // Auto-fit ke seluruh marker
  if (validBounds.length > 0 && mapInstance) {
    if (validBounds.length === 1) {
      mapInstance.setView(validBounds[0], 15)
    } else {
      const bounds = L.latLngBounds(validBounds)
      mapInstance.fitBounds(bounds, { padding: [35, 35], maxZoom: 16 })
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
    renderMarkers()
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
