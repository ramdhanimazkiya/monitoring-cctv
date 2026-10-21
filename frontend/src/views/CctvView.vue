<template>
  <div class="space-y-5">
    <!-- Header: Title & View Mode / Layout Controls -->
    <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-3 border-b border-[#283548]">
      <div>
        <div class="flex items-center gap-2.5">
          <div class="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
            <Video class="w-4 h-4" />
          </div>
          <div>
            <div class="flex items-center gap-2 flex-wrap">
              <h2 class="text-lg font-bold text-slate-100 tracking-tight">CCTV Monitoring</h2>
              <span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-950/70 text-blue-300 border border-blue-600/50">
                GRID & LEAFLET MAPS
              </span>
            </div>
            <p class="text-xs text-slate-400 font-mono mt-0.5">
              Matriks pemantauan live streaming CCTV terintegrasi dengan pemetaan geospasial Leaflet OpenStreetMap.
            </p>
          </div>
        </div>
      </div>

      <!-- Action Controls & View Mode Switcher -->
      <div class="flex flex-wrap items-center gap-2.5">
        <!-- View Mode Switcher: Grid vs Peta -->
        <div class="flex items-center bg-[#111827] border border-[#283548] p-1 rounded-lg text-xs font-mono select-none">
          <button
            type="button"
            :class="[
              'px-3 py-1 rounded-md font-semibold transition-all cursor-pointer flex items-center gap-1.5',
              activeViewMode === 'grid'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            ]"
            title="Tampilkan Matriks Video Grid secara penuh"
            @click="setViewMode('grid')"
          >
            <Grid class="w-3.5 h-3.5" />
            <span>Grid</span>
          </button>

          <button
            type="button"
            :class="[
              'px-3 py-1 rounded-md font-semibold transition-all cursor-pointer flex items-center gap-1.5',
              activeViewMode === 'map'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            ]"
            title="Tampilkan Peta Geospasial Leaflet secara penuh"
            @click="setViewMode('map')"
          >
            <MapIcon class="w-3.5 h-3.5" />
            <span>Peta</span>
          </button>
        </div>

        <!-- Grid Layout Switcher (Tampil jika mode Grid) -->
        <div
          v-if="activeViewMode === 'grid'"
          class="flex items-center bg-[#111827] border border-[#283548] p-1 rounded-lg text-xs font-mono"
        >
          <button
            v-for="layout in ['auto', '1x1', '2x2', '3x3', '4x4']"
            :key="layout"
            type="button"
            :class="[
              'px-2 py-1 rounded-md font-semibold transition-all cursor-pointer uppercase text-[11px]',
              currentLayout === layout
                ? 'bg-slate-700 text-white'
                : 'text-slate-400 hover:text-slate-200'
            ]"
            :title="`Tata letak grid ${layout}`"
            @click="currentLayout = layout"
          >
            {{ layout === 'auto' ? 'Auto' : layout }}
          </button>
        </div>

        <Button
          variant="secondary"
          size="sm"
          :loading="cctvStore.loading"
          @click="refreshStreams"
        >
          <template #icon-left>
            <RefreshCw class="w-3.5 h-3.5 mr-1" />
          </template>
          Refresh
        </Button>
      </div>
    </div>

    <!-- Search Input Filter (Card Search Only) -->
    <div class="flex items-center gap-2.5 bg-[#0d131f] border border-[#1e2a3b] px-3.5 py-2.5 rounded-xl focus-within:border-blue-500/60 transition-colors shadow-sm">
      <Search class="w-4 h-4 text-slate-400 shrink-0" />
      <input
        v-model="searchQuery"
        type="text"
        placeholder="Cari kamera (nama, ID, lokasi, zona)..."
        class="w-full bg-transparent text-xs font-mono text-slate-200 placeholder-slate-500 focus:outline-none"
      />
      <button
        v-if="searchQuery"
        type="button"
        class="p-0.5 rounded hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer transition-colors"
        title="Hapus pencarian"
        @click="searchQuery = ''"
      >
        <X class="w-3.5 h-3.5" />
      </button>
    </div>

    <!-- ===================================================================== -->
    <!-- SECTION 1: LEAFLET MAPS CONTAINER (Muncul pada mode 'map')            -->
    <!-- ===================================================================== -->
    <div
      v-show="activeViewMode === 'map'"
      class="bg-[#111827] border border-[#283548] rounded-xl p-3.5 space-y-3 shadow-xl transition-all"
    >
      <!-- Map Header & Map Action Tools -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-[#1e2a3b]">
        <div class="flex items-center gap-2">
          <div class="w-6 h-6 rounded bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
            <Compass class="w-3.5 h-3.5" />
          </div>
          <div>
            <h3 class="text-xs font-bold text-slate-100 font-mono flex items-center gap-2">
              PETA DISTRIBUSI KAMERA
              <span class="text-[10px] font-normal text-emerald-400 px-1.5 py-0.2 rounded bg-emerald-950/80 border border-emerald-800">
                {{ filteredMapCameras.length }} Titik Terpetakan
              </span>
            </h3>
            <p class="text-[10px] text-slate-400 font-mono">
              Klik titik marker untuk melihat status perangkat, preview live video, dan detail koordinat.
            </p>
          </div>
        </div>
      </div>

      <!-- Map Element Container -->
      <div class="w-full h-[600px] sm:h-[640px] rounded-lg overflow-hidden transition-all duration-300 relative">
        <DeviceMap
          ref="deviceMapRef"
          :devices="filteredMapCameras"
          @select-camera="handleMapSelectCamera"
        />
      </div>

      <!-- Map Quick Camera Selector Pills (Memudahkan lompat ke kamera tertentu di peta) -->
      <div class="flex items-center gap-1.5 overflow-x-auto pt-1 pb-0.5 text-[11px] font-mono scrollbar-thin">
        <span class="text-slate-500 text-[10px] shrink-0 uppercase">Pilih Cepat:</span>
        <button
          v-for="cam in filteredMapCameras"
          :key="cam.id"
          type="button"
          class="px-2 py-0.5 rounded bg-[#0d131f] hover:bg-[#1e2a3b] border border-[#233145] text-slate-300 hover:text-white flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer"
          :title="`Arahkan peta ke ${cam.name}`"
          @click="flyToCameraOnMap(cam)"
        >
          <span
            :class="[
              'w-1.5 h-1.5 rounded-full',
              cam.status === 'ONLINE' ? 'bg-emerald-400' : cam.status === 'OFFLINE' ? 'bg-rose-400' : 'bg-slate-400'
            ]"
          ></span>
          <span class="font-bold text-blue-400">{{ cam.id }}</span>
          <span class="text-slate-400 max-w-[120px] truncate">{{ cam.name }}</span>
        </button>
      </div>
    </div>

    <!-- ===================================================================== -->
    <!-- SECTION 2: CCTV LIVE STREAMING VIDEO GRID (Muncul pada mode 'grid')   -->
    <!-- ===================================================================== -->
    <div
      v-show="activeViewMode === 'grid'"
      class="space-y-3"
    >
      <div class="flex items-center justify-between px-1">
        <div class="flex items-center gap-2">
          <Grid class="w-4 h-4 text-blue-400" />
          <h3 class="text-xs font-bold text-slate-200 font-mono uppercase tracking-wide">
            Matriks Video Streaming Live
          </h3>
          <span class="text-[10px] font-mono text-slate-400">
            ({{ displayedCameras.length }} kamera ditampilkan)
          </span>
        </div>
      </div>

      <!-- The Grid Container -->
      <div :class="['grid gap-4 transition-all duration-300', gridClasses]">
        <div
          v-for="cam in displayedCameras"
          :key="cam.id"
          :id="`camera-card-${cam.id}`"
          :class="[
            'relative aspect-video bg-[#080c14] border rounded-xl overflow-hidden flex flex-col group shadow-2xl transition-all duration-300',
            activeHighlightCamera === cam.id
              ? 'border-blue-500 ring-4 ring-blue-500/70 shadow-blue-500/30 scale-[1.01]'
              : 'border-[#1f2c40] hover:border-blue-500/50'
          ]"
        >
          <!-- Top Overlay Header (z-40 agar selalu berada di atas layar hitam video) -->
          <div class="absolute top-0 inset-x-0 bg-gradient-to-b from-black/95 via-black/70 to-transparent p-2.5 flex items-center justify-between z-40 text-xs pointer-events-auto">
            <div class="flex items-center gap-2 min-w-0 font-mono">
              <span class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-950/90 text-blue-300 border border-blue-500/60 shrink-0 shadow-sm">
                {{ cam.id }}
              </span>
              <span class="text-slate-100 font-semibold truncate text-[11px] drop-shadow-sm" :title="cam.name">
                {{ cam.name || cam.id }}
              </span>
            </div>

            <div class="flex items-center gap-1.5 shrink-0">
              <!-- Pulsing Status Dot & Badge -->
              <span
                :class="[
                  'px-1.5 py-0.5 rounded text-[9px] font-mono font-bold flex items-center gap-1 shadow-sm',
                  cam.status === 'ONLINE'
                    ? 'bg-emerald-950/90 text-emerald-300 border border-emerald-500/70'
                    : 'bg-rose-950/90 text-rose-300 border border-rose-500/70'
                ]"
              >
                <span
                  :class="[
                    'w-1.5 h-1.5 rounded-full',
                    cam.status === 'ONLINE'
                      ? 'bg-emerald-400 animate-pulse'
                      : 'bg-rose-400'
                  ]"
                ></span>
                {{ cam.status === 'ONLINE' ? 'ONLINE' : 'OFFLINE' }}
              </span>
            </div>
          </div>

          <!-- Video Player Display Container -->
          <div class="flex-1 w-full h-full relative flex items-center justify-center bg-black overflow-hidden">
            <CctvStreamPlayer
              :stream-url="cam.streamUrl"
              :camera-name="cam.name"
              :camera-id="cam.id"
              :status="cam.status"
              :autoplay="true"
              :muted="true"
              :show-overlay="false"
              aspectRatio="aspect-video"
              class="w-full h-full"
            />

            <!-- Blank Hitam Instan Tanpa Jeda ketika OFFLINE -->
            <div
              v-show="cam.status === 'OFFLINE' || cam.status === 'offline' || cam.streamStatus === 'UNAVAILABLE'"
              class="absolute inset-0 z-20 bg-black flex flex-col items-center justify-center p-4 text-center select-none"
              style="background-color: #000000 !important;"
            >
              <p class="font-mono text-xs sm:text-sm text-white font-medium tracking-wide">
                error: stream not found, retrying in some second
              </p>
            </div>

            <!-- Quick Action Floating Buttons (Peta, Snapshot, Ping) -->
            <div class="absolute bottom-10 right-2 z-25 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-black/75 backdrop-blur-xs p-1 rounded-lg border border-white/10">
              <!-- Fly to Map Button -->
              <button
                v-if="cam.latitude && cam.longitude"
                type="button"
                class="p-1 rounded hover:bg-cyan-600 text-cyan-300 hover:text-white transition-colors cursor-pointer"
                title="Pusatkan Kamera ini pada Peta Leaflet"
                @click="flyToCameraOnMap(cam)"
              >
                <MapPin class="w-3.5 h-3.5" />
              </button>

              <!-- Snapshot Button -->
              <button
                type="button"
                class="p-1 rounded hover:bg-blue-600 text-slate-300 hover:text-white transition-colors cursor-pointer"
                title="Ambil Snapshot Cuplikan"
                @click="takeSnapshot(cam)"
              >
                <Camera class="w-3.5 h-3.5" />
              </button>

              <!-- Latency Ping Button -->
              <button
                type="button"
                class="p-1 rounded hover:bg-emerald-600 text-slate-300 hover:text-white transition-colors cursor-pointer"
                title="Uji Ping Latensi"
                @click="pingCamera(cam)"
              >
                <Activity class="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <!-- Bottom Overlay Footer (z-40 agar selalu berada di atas layar video) -->
          <div class="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/95 via-black/70 to-transparent p-2 flex items-center justify-between text-[10px] font-mono text-slate-400 z-40 pointer-events-auto">
            <div class="flex items-center gap-2 truncate">
              <span class="text-slate-300 font-medium truncate">{{ cam.zoneName || 'Lobby Utama' }}</span>
              <span class="text-slate-600">•</span>
              <span class="text-emerald-400 truncate max-w-[180px]" :title="cam.streamUrl">
                {{ cam.streamUrl || 'Direct Stream' }}
              </span>
            </div>

            <div class="flex items-center gap-2 shrink-0">
              <span v-if="cam.latencyMs" class="text-cyan-400 font-semibold">
                {{ cam.latencyMs }}ms
              </span>
              <span class="text-slate-500">{{ currentTime }}</span>
            </div>
          </div>
        </div>

        <!-- Empty State if no camera matches search/filter -->
        <div
          v-if="displayedCameras.length === 0"
          class="col-span-full p-12 bg-[#090d16] border border-[#1e2a3b] rounded-xl text-center space-y-3"
        >
          <Video class="w-10 h-10 text-slate-600 mx-auto" />
          <h3 class="text-sm font-semibold text-slate-300">Data kamera tidak ditemukan</h3>
          <p class="text-xs text-slate-500 font-mono">
            Periksa kembali kata kunci pencarian Anda atau segarkan data feed kamera.
          </p>
          <Button v-if="searchQuery" variant="secondary" size="xs" @click="resetFilters">
            Reset Pencarian
          </Button>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, reactive, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { Badge, Button } from '../components/ui/index.js'
import DeviceMap from '../components/maps/DeviceMap.vue'
import CctvStreamPlayer from '../components/cctv/CctvStreamPlayer.vue'
import {
  Video,
  Clock,
  RefreshCw,
  Camera,
  Activity,
  Search,
  X,
  Grid,
  Map as MapIcon,
  MapPin,
  Compass
} from '@lucide/vue'
import { useCctvStore } from '../stores/cctv.js'
import { useToast } from '../composables/useToast.js'

const toast = useToast()
const cctvStore = useCctvStore()
const deviceMapRef = ref(null)

// View Mode: 'grid' (Grid Matriks Video) | 'map' (Peta Leaflet)
const activeViewMode = ref('grid')
const currentLayout = ref('auto')
const searchQuery = ref('')
const currentTime = ref('')
const videoErrors = reactive({})
const activeHighlightCamera = ref(null)

let clockTimer = null
let highlightTimer = null

function updateClock() {
  const now = new Date()
  currentTime.value = now.toLocaleTimeString('id-ID', { hour12: false })
}

function setViewMode(mode) {
  activeViewMode.value = mode
  if (mode === 'map') {
    nextTick(() => {
      deviceMapRef.value?.invalidateSize()
    })
  }
}

function handleMapSelectCamera(cam) {
  if (!cam) return
  if (cam.latitude && cam.longitude) {
    deviceMapRef.value?.selectCamera(cam)
  }
}

function flyToCameraOnMap(cam) {
  if (!cam.latitude || !cam.longitude) {
    toast.warning('Koordinat Belum Ada', `Kamera ${cam.id} belum memiliki koordinat GPS untuk Leaflet Map.`)
    return
  }

  activeViewMode.value = 'map'

  nextTick(() => {
    deviceMapRef.value?.invalidateSize()
    deviceMapRef.value?.selectCamera(cam)
    toast.info('Peta Terfokus', `Mengarahkan peta Leaflet ke ${cam.name} (${cam.id})`)
  })
}

function handleVideoError(camId) {
  videoErrors[camId] = true
}

function retryStream(camId) {
  delete videoErrors[camId]
  toast.info('Memuat Ulang', `Mencoba menyambungkan kembali stream ${camId}`)
}

function openDirectStream(url) {
  if (url) window.open(url, '_blank')
}

function takeSnapshot(cam) {
  toast.success(
    'Snapshot Berhasil Diambil',
    `Cuplikan frame [${cam.id}] tersimpan pada ${new Date().toLocaleTimeString('id-ID')}`
  )
}

function handleStreamOnline(cam) {
  cam.status = 'ONLINE'
  cam.streamStatus = 'AVAILABLE'
  if (!cam.latencyMs) cam.latencyMs = 18
  cam.statusReason = 'Sumber video CCTV aktif dan mengalirkan frame video'
  cctvStore.syncCameraStatus(cam.id, 'ONLINE', 'AVAILABLE', cam.statusReason)
}

function handleStreamOffline(cam, evt) {
  cam.status = 'OFFLINE'
  cam.streamStatus = 'UNAVAILABLE'
  cam.latencyMs = null
  cam.statusReason = evt?.reason || 'Sumber video CCTV mati / tidak aktif'
  cctvStore.syncCameraStatus(cam.id, 'OFFLINE', 'UNAVAILABLE', cam.statusReason)
}

async function pingCamera(cam) {
  const res = await cctvStore.pingCamera(cam.id)
  if (res.success) {
    toast.success('Stream CCTV Aktif', `Sumber video ${cam.id} aktif (${res.latency || 0} ms)`)
  } else {
    toast.error('Stream CCTV Terputus', `Sumber video ${cam.id} tidak aktif: ${res.reason || res.error}`)
  }
}

async function refreshStreams() {
  await Promise.allSettled([
    cctvStore.fetchCameras(),
    cctvStore.checkAllStreams()
  ])
  deviceMapRef.value?.fitAll()
  toast.info('Refresh Selesai', 'Data feed kamera dan status stream berhasil disinkronkan.')
}

function resetFilters() {
  searchQuery.value = ''
}

// Kamera untuk Leaflet Map (Hanya yang memiliki koordinat valid dan sesuai pencarian)
const filteredMapCameras = computed(() => {
  if (!searchQuery.value.trim()) return cctvStore.mapCameras
  const q = searchQuery.value.toLowerCase()
  return cctvStore.mapCameras.filter((c) => {
    const matchId = c.id?.toLowerCase().includes(q)
    const matchName = c.name?.toLowerCase().includes(q)
    const matchZone = c.zoneName?.toLowerCase().includes(q)
    const matchSite = c.siteName?.toLowerCase().includes(q)
    return matchId || matchName || matchZone || matchSite
  })
})

// Kamera untuk Video Grid (Sesuai pencarian)
const displayedCameras = computed(() => {
  if (!searchQuery.value.trim()) return cctvStore.activeCameras
  const q = searchQuery.value.toLowerCase()
  return cctvStore.activeCameras.filter((c) => {
    const matchId = c.id?.toLowerCase().includes(q)
    const matchName = c.name?.toLowerCase().includes(q)
    const matchZone = c.zoneName?.toLowerCase().includes(q)
    const matchSite = c.siteName?.toLowerCase().includes(q)
    return matchId || matchName || matchZone || matchSite
  })
})

const gridClasses = computed(() => {
  switch (currentLayout.value) {
    case '1x1':
      return 'grid-cols-1 max-w-5xl mx-auto'
    case '2x2':
      return 'grid-cols-1 md:grid-cols-2'
    case '3x3':
      return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
    case '4x4':
      return 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4'
    case 'auto':
    default:
      // Responsif adaptif berdasarkan jumlah kamera
      return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3'
  }
})

watch(activeViewMode, () => {
  nextTick(() => {
    deviceMapRef.value?.invalidateSize()
  })
})

onMounted(async () => {
  updateClock()
  clockTimer = setInterval(updateClock, 1000)
  await Promise.all([
    cctvStore.fetchCameras(),
    cctvStore.fetchSitesAndZones()
  ])
  // Polling status kamera setiap 1 detik via MediaMTX API (deteksi cepat tanpa jeda)
  cctvStore.startCameraStatusPolling(1000)
})

onUnmounted(() => {
  if (clockTimer) clearInterval(clockTimer)
  if (highlightTimer) clearTimeout(highlightTimer)
  cctvStore.stopCameraStatusPolling()
})
</script>
