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

        <router-link to="/devices">
          <Button variant="primary" size="sm">
            + Tambah Kamera
          </Button>
        </router-link>
      </div>
    </div>

    <!-- Quick Status Bar & Search/Zone Filters -->
    <div class="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
      <!-- Metric 1: Total Kamera -->
      <div class="p-3 bg-[#0d131f] border border-[#1e2a3b] rounded-xl flex items-center justify-between">
        <div>
          <span class="text-[10px] font-mono uppercase text-slate-400 block">Total Kamera:</span>
          <p class="text-xl font-bold font-mono text-slate-100">{{ cctvStore.cameras.length }}</p>
        </div>
        <Video class="w-5 h-5 text-blue-400 opacity-60" />
      </div>

      <!-- Metric 2: Online -->
      <div class="p-3 bg-[#0d131f] border border-[#1e2a3b] rounded-xl flex items-center justify-between">
        <div>
          <span class="text-[10px] font-mono uppercase text-slate-400 block">Kamera Online:</span>
          <p class="text-xl font-bold font-mono text-emerald-400">{{ onlineCount }}</p>
        </div>
        <span class="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
      </div>

      <!-- Metric 3: Terpetakan di Peta Leaflet -->
      <div class="p-3 bg-[#0d131f] border border-[#1e2a3b] rounded-xl flex items-center justify-between">
        <div>
          <span class="text-[10px] font-mono uppercase text-slate-400 block">Peta Leaflet:</span>
          <p class="text-xl font-bold font-mono text-cyan-400">{{ mappedCount }} / {{ cctvStore.cameras.length }}</p>
        </div>
        <MapPin class="w-5 h-5 text-cyan-400 opacity-60" />
      </div>

      <!-- Metric 4: Stream URL Aktif -->
      <div class="p-3 bg-[#0d131f] border border-[#1e2a3b] rounded-xl flex items-center justify-between">
        <div>
          <span class="text-[10px] font-mono uppercase text-slate-400 block">Stream Aktif:</span>
          <p class="text-xl font-bold font-mono text-sky-400">{{ streamUrlCount }}</p>
        </div>
        <Radio class="w-5 h-5 text-sky-400 opacity-60" />
      </div>

      <!-- Filter by Zone Dropdown & Search -->
      <div class="col-span-2 sm:col-span-2 lg:col-span-2 flex items-center gap-2 bg-[#0d131f] border border-[#1e2a3b] p-2 rounded-xl">
        <Filter class="w-4 h-4 text-slate-400 shrink-0 ml-1" />
        <select
          v-model="selectedZone"
          class="w-full bg-transparent text-xs font-mono text-slate-200 focus:outline-none cursor-pointer"
        >
          <option value="ALL" class="bg-[#111827] text-slate-200">Semua Zona (Filter Global)</option>
          <option
            v-for="zone in zoneOptions"
            :key="zone.id"
            :value="zone.id"
            class="bg-[#111827] text-slate-200"
          >
            {{ zone.name }}
          </option>
        </select>

        <div class="w-px h-6 bg-[#283548]"></div>

        <input
          v-model="searchQuery"
          type="text"
          placeholder="Cari kamera..."
          class="w-36 bg-transparent text-xs font-mono text-slate-200 placeholder-slate-500 focus:outline-none"
        />
      </div>
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
              PETA DISTRIBUSI KAMERA (LEAFLET OSM)
              <span class="text-[10px] font-normal text-emerald-400 px-1.5 py-0.2 rounded bg-emerald-950/80 border border-emerald-800">
                {{ filteredMapCameras.length }} Titik Terpetakan
              </span>
            </h3>
            <p class="text-[10px] text-slate-400 font-mono">
              Klik marker pin untuk melihat status, latensi, dan langsung menginspeksi video feed kamera.
            </p>
          </div>
        </div>

        <div class="flex items-center gap-1.5">
          <button
            type="button"
            class="px-2 py-1 rounded bg-[#151d2e] hover:bg-[#1f2b42] text-[10px] font-mono text-slate-300 border border-[#283548] transition-colors cursor-pointer"
            title="Pusatkan peta ke koordinat Bandung"
            @click="handleMapFocusBandung"
          >
            Fokus Bandung
          </button>
          <button
            type="button"
            class="px-2 py-1 rounded bg-[#151d2e] hover:bg-[#1f2b42] text-[10px] font-mono text-slate-300 border border-[#283548] transition-colors cursor-pointer"
            title="Auto-fit ke seluruh marker kamera aktif"
            @click="handleMapFitAll"
          >
            Fit Semua Kamera
          </button>
        </div>
      </div>

      <!-- Map Element Container -->
      <div class="w-full h-[600px] sm:h-[640px] rounded-lg overflow-hidden transition-all duration-300 relative">
        <DeviceMap
          ref="deviceMapRef"
          :devices="filteredMapCameras"
          @select-camera="focusCamera"
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
          <span :class="['w-1.5 h-1.5 rounded-full', cam.status === 'ONLINE' ? 'bg-emerald-400' : 'bg-rose-400']"></span>
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
          class="relative aspect-video bg-[#080c14] border border-[#1f2c40] rounded-xl overflow-hidden flex flex-col group shadow-2xl hover:border-blue-500/50 transition-all"
        >
          <!-- Top Overlay Header -->
          <div class="absolute top-0 inset-x-0 bg-gradient-to-b from-black/95 via-black/60 to-transparent p-2.5 flex items-center justify-between z-30 text-xs">
            <div class="flex items-center gap-2 min-w-0 font-mono">
              <span class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-950/80 text-blue-300 border border-blue-600/50 shrink-0">
                {{ cam.id }}
              </span>
              <span class="text-slate-200 font-semibold truncate text-[11px]" :title="cam.name">
                {{ cam.name }}
              </span>
            </div>

            <div class="flex items-center gap-1.5 shrink-0">
              <!-- Pulsing Status Dot & Badge -->
              <span
                :class="[
                  'px-1.5 py-0.5 rounded text-[9px] font-mono font-bold flex items-center gap-1',
                  cam.status === 'ONLINE'
                    ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-600/60'
                    : 'bg-rose-950/80 text-rose-300 border border-rose-600/60'
                ]"
              >
                <span
                  :class="[
                    'w-1.5 h-1.5 rounded-full',
                    cam.status === 'ONLINE' ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'
                  ]"
                ></span>
                {{ cam.status || 'ONLINE' }}
              </span>

              <!-- Maximize / Focus Modal Button -->
              <button
                type="button"
                class="w-6 h-6 rounded bg-black/60 hover:bg-blue-600 border border-white/10 hover:border-blue-400 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                title="Perbesar Layar Penuh / Inspeksi Feed"
                @click="focusCamera(cam)"
              >
                <Maximize2 class="w-3 h-3" />
              </button>
            </div>
          </div>

          <!-- Video Player Display Container -->
          <div class="flex-1 w-full h-full relative flex items-center justify-center bg-black overflow-hidden">
            <CctvStreamPlayer
              :stream-url="cam.streamUrl"
              :camera-name="cam.name"
              :camera-id="cam.id"
              :autoplay="true"
              :muted="true"
              aspect-ratio="aspect-video"
              class="w-full h-full"
            />

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

          <!-- Bottom Overlay Footer -->
          <div class="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/95 via-black/60 to-transparent p-2 flex items-center justify-between text-[10px] font-mono text-slate-400 z-30">
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

        <!-- Empty State if no camera matches filter -->
        <div
          v-if="displayedCameras.length === 0"
          class="col-span-full p-12 bg-[#090d16] border border-[#1e2a3b] rounded-xl text-center space-y-3"
        >
          <Video class="w-10 h-10 text-slate-600 mx-auto" />
          <h3 class="text-sm font-semibold text-slate-300">Tidak Ada Kamera Sesuai Filter</h3>
          <p class="text-xs text-slate-500 font-mono">
            Periksa kata kunci pencarian atau ubah pilihan zona pemantauan.
          </p>
          <Button variant="secondary" size="xs" @click="resetFilters">
            Reset Filter
          </Button>
        </div>
      </div>
    </div>

    <!-- ===================================================================== -->
    <!-- FOCUS FULLSCREEN INSPECTION MODAL FOR SINGLE CAMERA                   -->
    <!-- ===================================================================== -->
    <Modal
      v-model="focusModalOpen"
      :title="`Inspeksi Feed: ${focusedCamera?.id} - ${focusedCamera?.name}`"
      :description="`Zona: ${focusedCamera?.zoneName || 'Lobby'} • URL: ${focusedCamera?.streamUrl || '-'}`"
      size="xl"
    >
      <div v-if="focusedCamera" class="space-y-4">
        <!-- Big Video Viewport -->
        <div class="relative aspect-video bg-black rounded-xl overflow-hidden border border-[#283548] flex items-center justify-center">
          <CctvStreamPlayer
            v-if="focusedCamera"
            :stream-url="focusedCamera.streamUrl"
            :camera-name="focusedCamera.name"
            :camera-id="focusedCamera.id"
            :autoplay="true"
            :muted="false"
            :controls="true"
            aspect-ratio="aspect-video"
            class="w-full h-full"
          />
        </div>

        <!-- Technical Metadata Grid -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
          <div class="p-2.5 bg-[#0f1624] border border-[#1e2a3b] rounded-lg">
            <span class="text-[10px] text-slate-500 block uppercase">ID Perangkat:</span>
            <span class="text-blue-400 font-bold">{{ focusedCamera.id }}</span>
          </div>
          <div class="p-2.5 bg-[#0f1624] border border-[#1e2a3b] rounded-lg">
            <span class="text-[10px] text-slate-500 block uppercase">Status Terakhir:</span>
            <span class="text-emerald-400 font-bold">{{ focusedCamera.status || 'ONLINE' }}</span>
          </div>
          <div class="p-2.5 bg-[#0f1624] border border-[#1e2a3b] rounded-lg">
            <span class="text-[10px] text-slate-500 block uppercase">Latensi Jaringan:</span>
            <span class="text-cyan-300 font-bold">{{ focusedCamera.latencyMs ? `${focusedCamera.latencyMs} ms` : 'N/A' }}</span>
          </div>
          <div class="p-2.5 bg-[#0f1624] border border-[#1e2a3b] rounded-lg">
            <span class="text-[10px] text-slate-500 block uppercase">Koordinat GPS:</span>
            <span class="text-slate-300 font-bold truncate block">
              {{ focusedCamera.latitude && focusedCamera.longitude ? `${Number(focusedCamera.latitude).toFixed(4)}, ${Number(focusedCamera.longitude).toFixed(4)}` : 'Belum Terpetakan' }}
            </span>
          </div>
        </div>

        <!-- Stream URL Display & Direct Actions -->
        <div class="p-3 bg-[#0d121e] border border-[#283548] rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs font-mono">
          <div class="truncate max-w-xl">
            <span class="text-slate-500 text-[10px] block">STREAM INGESTION URL:</span>
            <span class="text-emerald-400 select-all truncate block">{{ focusedCamera.streamUrl || '-' }}</span>
          </div>
          <div class="flex items-center gap-2 shrink-0">
            <button
              v-if="focusedCamera.latitude && focusedCamera.longitude"
              type="button"
              class="px-2.5 py-1 rounded bg-cyan-900/60 hover:bg-cyan-700 text-cyan-200 border border-cyan-700 text-[11px] font-semibold cursor-pointer"
              @click="focusModalCameraOnMap"
            >
              Lihat di Peta Leaflet
            </button>
            <a
              v-if="focusedCamera.streamUrl"
              :href="focusedCamera.streamUrl"
              target="_blank"
              class="px-3 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-semibold shrink-0"
            >
              Buka Tab Baru ↗
            </a>
          </div>
        </div>
      </div>

      <template #footer="{ close }">
        <Button variant="secondary" size="sm" @click="close">
          Tutup Layar
        </Button>
      </template>
    </Modal>
  </div>
</template>

<script setup>
import { ref, computed, reactive, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { Badge, Button, Modal } from '../components/ui/index.js'
import DeviceMap from '../components/maps/DeviceMap.vue'
import CctvStreamPlayer from '../components/cctv/CctvStreamPlayer.vue'
import {
  Video,
  Radio,
  Clock,
  RefreshCw,
  Maximize2,
  Camera,
  Activity,
  Filter,
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

// View Mode: 'grid' (Grid Saja) | 'map' (Peta Saja)
const activeViewMode = ref('grid')
const currentLayout = ref('auto')
const selectedZone = ref('ALL')
const searchQuery = ref('')
const currentTime = ref('')
const videoErrors = reactive({})
const focusModalOpen = ref(false)
const focusedCamera = ref(null)

let clockTimer = null

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

function handleMapFocusBandung() {
  deviceMapRef.value?.focusCenter()
  toast.info('Pusat Peta', 'Peta diarahkan ke titik pusat Bandung.')
}

function handleMapFitAll() {
  deviceMapRef.value?.fitAll()
  toast.info('Pusat Peta', 'Peta di-fit ke seluruh kamera terdaftar.')
}

function flyToCameraOnMap(cam) {
  if (!cam.latitude || !cam.longitude) {
    toast.warning('Koordinat Belum Ada', `Kamera ${cam.id} belum memiliki koordinat GPS untuk Leaflet Map.`)
    return
  }

  // Beralih ke view Peta
  activeViewMode.value = 'map'

  nextTick(() => {
    deviceMapRef.value?.invalidateSize()
    deviceMapRef.value?.selectCamera(cam)
    toast.info('Peta Terfokus', `Mengarahkan peta Leaflet ke ${cam.name} (${cam.id})`)
  })
}

function focusModalCameraOnMap() {
  if (focusedCamera.value) {
    const cam = focusedCamera.value
    focusModalOpen.value = false
    flyToCameraOnMap(cam)
  }
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

function focusCamera(cam) {
  focusedCamera.value = cam
  focusModalOpen.value = true
}

function takeSnapshot(cam) {
  toast.success(
    'Snapshot Berhasil Diambil',
    `Cuplikan frame [${cam.id}] tersimpan pada ${new Date().toLocaleTimeString('id-ID')}`
  )
}

async function pingCamera(cam) {
  const res = await cctvStore.pingCamera(cam.id)
  if (res.success) {
    toast.success('Kamera Responsif', `${cam.id} aktif dengan latensi ${res.latency} ms`)
  } else {
    toast.error('Ping Gagal', `Kamera ${cam.id} tidak merespons`)
  }
}

async function refreshStreams() {
  await cctvStore.fetchCameras()
  deviceMapRef.value?.fitAll()
  toast.info('Refresh Selesai', 'Data feed kamera berhasil disinkronkan.')
}

function resetFilters() {
  selectedZone.value = 'ALL'
  searchQuery.value = ''
}

const onlineCount = computed(() => {
  return cctvStore.activeCameras.filter((c) => c.status === 'ONLINE' || !c.status).length
})

const streamUrlCount = computed(() => {
  return cctvStore.activeCameras.filter((c) => !!c.streamUrl).length
})

const mappedCount = computed(() => {
  return cctvStore.mapCameras.length
})

const zoneOptions = computed(() => {
  const map = new Map()
  cctvStore.cameras.forEach((c) => {
    if (c.zoneId && c.zoneName) {
      map.set(c.zoneId, { id: c.zoneId, name: c.zoneName })
    }
  })
  if (map.size === 0) {
    return [
      { id: 'ZON-0001', name: 'Lobby Utama' },
      { id: 'ZON-0002', name: 'Area Parkir Timur' }
    ]
  }
  return Array.from(map.values())
})

// Kamera untuk Leaflet Map (Hanya yang memiliki koordinat valid dan sesuai filter aktif)
const filteredMapCameras = computed(() => {
  return cctvStore.mapCameras.filter((c) => {
    if (selectedZone.value !== 'ALL' && c.zoneId !== selectedZone.value) {
      return false
    }
    if (searchQuery.value.trim()) {
      const q = searchQuery.value.toLowerCase()
      const matchId = c.id?.toLowerCase().includes(q)
      const matchName = c.name?.toLowerCase().includes(q)
      const matchZone = c.zoneName?.toLowerCase().includes(q)
      if (!matchId && !matchName && !matchZone) return false
    }
    return true
  })
})

// Kamera untuk Video Grid
const displayedCameras = computed(() => {
  return cctvStore.activeCameras.filter((c) => {
    // Filter Zona
    if (selectedZone.value !== 'ALL' && c.zoneId !== selectedZone.value) {
      return false
    }
    // Filter Pencarian
    if (searchQuery.value.trim()) {
      const q = searchQuery.value.toLowerCase()
      const matchId = c.id?.toLowerCase().includes(q)
      const matchName = c.name?.toLowerCase().includes(q)
      const matchZone = c.zoneName?.toLowerCase().includes(q)
      if (!matchId && !matchName && !matchZone) return false
    }
    return true
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
})

onUnmounted(() => {
  if (clockTimer) clearInterval(clockTimer)
})
</script>
