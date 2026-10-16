<template>
  <div class="space-y-6">
    <!-- Top Welcome & Quick Actions Bar -->
    <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-[#283548]">
      <div>
        <div class="flex items-center gap-2">
          <h2 class="text-lg font-bold text-slate-100 tracking-tight">
            Ringkasan Operasi Monitoring
          </h2>
          <Badge status="ACTIVE" label="LIVE DATABASE" size="xs" />
        </div>
        <p class="text-xs text-slate-400 mt-0.5 font-mono">
          Pusat pemantauan status perangkat CCTV, kesiapan audio paging, dan alarm aktif real-time.
        </p>
      </div>

      <div class="flex items-center gap-2">
        <router-link to="/cctv">
          <Button variant="primary" size="sm">
            <template #icon-left>
              <Video class="w-4 h-4 mr-1.5" />
            </template>
            CCTV Monitoring
          </Button>
        </router-link>

        <router-link to="/audio-paging">
          <Button variant="secondary" size="sm">
            <template #icon-left>
              <Mic class="w-4 h-4 mr-1.5 text-blue-400" />
            </template>
            Push-to-Talk
          </Button>
        </router-link>

        <Button variant="ghost" size="sm" @click="testComponentModal = true">
          <Sliders class="w-4 h-4 mr-1" />
          Test Komponen UI
        </Button>
      </div>
    </div>

    <!-- 4 Key Monitoring Metric Cards -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <!-- Card 1: CCTV Status -->
      <Card padding class="relative overflow-hidden">
        <div class="flex items-center justify-between">
          <span class="text-xs font-mono font-medium text-slate-400 uppercase">CCTV CAMERAS</span>
          <div class="w-7 h-7 rounded-md bg-blue-600/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
            <Video class="w-4 h-4" />
          </div>
        </div>
        <div class="mt-3 flex items-baseline gap-2">
          <span class="text-2xl font-bold font-mono text-slate-100">{{ stats.cctv.total }}</span>
          <span class="text-xs text-slate-500">unit terdaftar</span>
        </div>
        <div class="mt-3 pt-2.5 border-t border-[#283548] flex items-center justify-between text-xs font-mono">
          <div class="flex items-center gap-1.5 text-emerald-400">
            <span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            <span>{{ stats.cctv.online }} Online</span>
          </div>
          <div class="flex items-center gap-1.5 text-amber-400">
            <span class="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
            <span>{{ stats.cctv.warning }} Warn</span>
          </div>
          <div class="flex items-center gap-1.5 text-rose-400">
            <span class="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
            <span>{{ stats.cctv.offline }} Off</span>
          </div>
        </div>
      </Card>

      <!-- Card 2: Audio Speakers Status -->
      <Card padding class="relative overflow-hidden">
        <div class="flex items-center justify-between">
          <span class="text-xs font-mono font-medium text-slate-400 uppercase">AUDIO SPEAKERS</span>
          <div class="w-7 h-7 rounded-md bg-purple-600/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
            <Volume2 class="w-4 h-4" />
          </div>
        </div>
        <div class="mt-3 flex items-baseline gap-2">
          <span class="text-2xl font-bold font-mono text-slate-100">{{ stats.audio.total }}</span>
          <span class="text-xs text-slate-500">titik speaker</span>
        </div>
        <div class="mt-3 pt-2.5 border-t border-[#283548] flex items-center justify-between text-xs font-mono">
          <div class="flex items-center gap-1.5 text-emerald-400">
            <span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            <span>{{ stats.audio.online }} Siap</span>
          </div>
          <div class="flex items-center gap-1.5 text-blue-400">
            <span class="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
            <span>{{ stats.audio.zones }} Zona</span>
          </div>
          <div class="flex items-center gap-1.5 text-slate-400">
            <span class="w-1.5 h-1.5 rounded-full bg-slate-500"></span>
            <span>{{ stats.audio.idle }} Idle</span>
          </div>
        </div>
      </Card>

      <!-- Card 3: Active Alarms -->
      <Card padding class="relative overflow-hidden">
        <div class="flex items-center justify-between">
          <span class="text-xs font-mono font-medium text-slate-400 uppercase">ACTIVE ALARMS</span>
          <div class="w-7 h-7 rounded-md bg-rose-600/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
            <AlertTriangle class="w-4 h-4" />
          </div>
        </div>
        <div class="mt-3 flex items-baseline gap-2">
          <span class="text-2xl font-bold font-mono text-rose-400">{{ stats.alarms.open }}</span>
          <span class="text-xs text-slate-500">insiden terbuka</span>
        </div>
        <div class="mt-3 pt-2.5 border-t border-[#283548] flex items-center justify-between text-xs font-mono">
          <span class="text-rose-400">{{ stats.alarms.critical }} Kritis</span>
          <span class="text-amber-400">{{ stats.alarms.warning }} Peringatan</span>
          <span class="text-slate-400">{{ stats.alarms.resolved }} Terselesaikan</span>
        </div>
      </Card>

      <!-- Card 4: Next Scheduled Audio -->
      <Card padding class="relative overflow-hidden">
        <div class="flex items-center justify-between">
          <span class="text-xs font-mono font-medium text-slate-400 uppercase">NEXT SCHEDULE</span>
          <div class="w-7 h-7 rounded-md bg-amber-600/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Clock class="w-4 h-4" />
          </div>
        </div>
        <div class="mt-3">
          <div class="text-sm font-semibold text-slate-200 truncate">
            {{ nextSchedule.name }}
          </div>
          <p class="text-xs text-blue-400 font-mono mt-0.5">
            {{ nextSchedule.time }} • {{ nextSchedule.target }}
          </p>
        </div>
        <div class="mt-3 pt-2.5 border-t border-[#283548] flex items-center justify-between text-xs font-mono text-slate-400">
          <span>Recurrence: DAILY</span>
          <span class="text-emerald-400">AKTIF</span>
        </div>
      </Card>
    </div>

    <!-- Center Section: Device Map (Left 7 cols) & System Services Health (Right 5 cols) -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <!-- Device Location Map (Leaflet Open-Source) -->
      <div class="lg:col-span-7">
        <Card title="Peta Lokasi Perangkat (Leaflet OSM)" subtitle="Distribusi geospasial CCTV dan speaker terpetakan secara interaktif">
          <template #actions>
            <!-- <span class="text-xs font-mono text-emerald-400">Leaflet Open-Source (Gratis)</span> -->
          </template>
          <div class="h-80 w-full">
            <DeviceMap :devices="displayedMapDevices" />
          </div>
          <template #footer>
            <span>Koordinat Terdaftar • Auto-Fit Geospasial</span>
            <router-link to="/cctv" class="text-blue-400 hover:underline">
              Buka Semua Kamera →
            </router-link>
          </template>
        </Card>
      </div>

      <!-- System Engine & Service Health -->
      <div class="lg:col-span-5 space-y-4">
        <Card title="Status Layanan Sistem" subtitle="Integritas proses background monitoring & gateway">
          <div class="space-y-3">
            <div
              v-for="svc in systemServices"
              :key="svc.name"
              class="p-2.5 rounded-lg bg-[#151d2e] border border-[#283548] flex items-center justify-between"
            >
              <div class="flex items-center gap-3">
                <div :class="['w-2 h-2 rounded-full', svc.online ? 'bg-emerald-400 radar-online' : 'bg-amber-400']"></div>
                <div>
                  <h4 class="text-xs font-semibold text-slate-200">{{ svc.name }}</h4>
                  <p class="text-[11px] text-slate-400 font-mono">{{ svc.detail }}</p>
                </div>
              </div>
              <Badge
                :status="svc.online ? 'ONLINE' : 'WARNING'"
                :label="svc.statusLabel"
                size="xs"
              />
            </div>
          </div>

          <template #footer>
            <span class="font-mono text-[11px] text-slate-500">Mode: Localhost Standalone (Tanpa Docker)</span>
          </template>
        </Card>

        <!-- Quick PTT Banner -->
        <div class="p-4 rounded-lg bg-gradient-to-r from-blue-950/60 to-indigo-950/40 border border-blue-800/40 flex items-center justify-between">
          <div>
            <h4 class="text-xs font-bold text-blue-200 font-mono uppercase">
              SIARAN DARURAT (PTT)
            </h4>
            <p class="text-[11px] text-slate-300 mt-0.5">
              Tekan untuk membuka drawer mikrofon PTT langsung.
            </p>
          </div>
          <Button variant="primary" size="sm" @click="testDrawerOpen = true">
            Buka PTT Panel
          </Button>
        </div>
      </div>
    </div>

    <!-- Bottom Section: Latest Events & Alarms Table -->
    <Card title="Alarm & Event Terbaru" subtitle="Pencatatan real-time perubahan status dan insiden sistem">
      <template #actions>
        <router-link to="/events">
          <Button variant="ghost" size="xs">
            Lihat Histori Lengkap
          </Button>
        </router-link>
      </template>

      <Table
        :columns="eventColumns"
        :data="recentEvents"
      >
        <template #severity="{ row }">
          <span
            :class="[
              'px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase',
              row.severity === 'CRITICAL' ? 'bg-rose-950 text-rose-300 border border-rose-800' :
              row.severity === 'WARNING' ? 'bg-amber-950 text-amber-300 border border-amber-800' :
              'bg-blue-950 text-blue-300 border border-blue-800'
            ]"
          >
            {{ row.severity }}
          </span>
        </template>

        <template #status="{ row }">
          <Badge :status="row.status" :label="row.status" size="xs" />
        </template>

        <template #occurredAt="{ row }">
          <span class="font-mono text-xs text-slate-400">{{ row.occurredAt }}</span>
        </template>

        <template #actions="{ row }">
          <div class="flex items-center gap-1.5">
            <Button
              v-if="row.status === 'OPEN'"
              variant="secondary"
              size="xs"
              @click="acknowledgeEvent(row)"
            >
              Acknowledge
            </Button>
            <Button
              variant="ghost"
              size="xs"
              @click="viewEventDetail(row)"
            >
              Detail
            </Button>
          </div>
        </template>
      </Table>
    </Card>

    <!-- Interactive Component Testing Modal (To prove all UI components in Tahap 2 work) -->
    <Modal
      v-model="testComponentModal"
      title="Uji Interaksi Komponen UI (Tahap 2)"
      description="Verifikasi seluruh 14 komponen reusable yang telah dibangun"
      size="md"
    >
      <div class="space-y-4 text-xs">
        <div>
          <label class="font-medium text-slate-300 block mb-1">Badge Status Showcase:</label>
          <div class="flex flex-wrap gap-1.5">
            <Badge status="ONLINE" label="ONLINE" />
            <Badge status="OFFLINE" label="OFFLINE" />
            <Badge status="WARNING" label="WARNING" />
            <Badge status="UNKNOWN" label="UNKNOWN" />
            <Badge status="ACTIVE" label="ACTIVE" />
            <Badge status="DEMO" label="DEMO" />
          </div>
        </div>

        <div class="pt-2 border-t border-[#283548]">
          <label class="font-medium text-slate-300 block mb-1.5">Tes Feedback Toasts:</label>
          <div class="flex flex-wrap gap-2">
            <Button variant="primary" size="xs" @click="toast.success('Sukses', 'Operasi berhasil disimpan.')">
              Toast Success
            </Button>
            <Button variant="danger" size="xs" @click="toast.error('Error', 'Gagal menghubungkan ke RTSP stream.')">
              Toast Error
            </Button>
            <Button variant="warning" size="xs" @click="toast.warning('Warning', 'Kanal PTT sedang digunakan.')">
              Toast Warning
            </Button>
          </div>
        </div>

        <div class="pt-2 border-t border-[#283548]">
          <label class="font-medium text-slate-300 block mb-1.5">Tes Konfirmasi Dialog Destruktif:</label>
          <Button variant="danger" size="xs" @click="testConfirmOpen = true">
            Buka ConfirmationDialog (Hapus Kamera)
          </Button>
        </div>
      </div>

      <template #footer="{ close }">
        <Button variant="secondary" size="sm" @click="close">
          Tutup
        </Button>
      </template>
    </Modal>

    <!-- Test Confirmation Dialog -->
    <ConfirmationDialog
      v-model="testConfirmOpen"
      title="Hapus Kamera CCTV"
      message="Apakah Anda yakin ingin menghapus kamera CAM-0003 [DEMO] Kamera Parkir 1?"
      warning="Perangkat akan diarsipkan (soft delete). Riwayat status tetap tersimpan dalam audit."
      @confirm="handleConfirmDelete"
    />

    <!-- Test Drawer (PTT Simulation Preview) -->
    <Drawer
      v-model="testDrawerOpen"
      title="Panel Cepat Audio Paging [DEMO]"
      subtitle="Kirim siaran suara langsung ke speaker zona"
      size="md"
    >
      <div class="space-y-4 text-sm">
        <div class="p-3 rounded-lg bg-blue-950/40 border border-blue-800/40 text-xs text-blue-200">
          Target Default: <strong>[DEMO] Speaker Lobby (AUD-0001)</strong>
        </div>

        <div>
          <label class="text-xs font-medium text-slate-300 block mb-1.5">Pilih Target:</label>
          <Select
            v-model="testTarget"
            :options="[
              { value: 'AUD-0001', label: 'AUD-0001 - Speaker Lobby' },
              { value: 'AUD-0002', label: 'AUD-0002 - Speaker Parkir' },
              { value: 'ZON-0001', label: 'Semua Speaker di Zona Lobby' }
            ]"
          />
        </div>

        <div class="pt-4 border-t border-[#283548] text-center">
          <p class="text-xs text-slate-400 mb-3 font-mono">
            Mode PTT: Tekan dan tahan tombol untuk menyiarkan
          </p>
          <div class="inline-flex flex-col items-center">
            <button
              type="button"
              :class="[
                'w-24 h-24 rounded-full flex flex-col items-center justify-center font-bold text-xs uppercase tracking-wider transition-all shadow-2xl active:scale-95 select-none',
                isPttActive
                  ? 'bg-rose-600 text-white border-4 border-rose-300 animate-pulse shadow-glow-offline'
                  : 'bg-blue-600 hover:bg-blue-500 text-white border-4 border-blue-400 shadow-glow-online'
              ]"
              @mousedown="isPttActive = true"
              @mouseup="isPttActive = false"
              @mouseleave="isPttActive = false"
            >
              <Mic class="w-6 h-6 mb-1" />
              <span>{{ isPttActive ? 'ON AIR' : 'PTT HOLD' }}</span>
            </button>
            <span class="text-[11px] text-slate-500 mt-2 font-mono">
              Status: {{ isPttActive ? 'MENYIARKAN [SIMULASI]' : 'SIAP (IDLE)' }}
            </span>
          </div>
        </div>
      </div>

      <template #footer="{ close }">
        <Button variant="secondary" size="sm" @click="close">
          Tutup Panel
        </Button>
      </template>
    </Drawer>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import {
  Button,
  Card,
  Badge,
  Table,
  Modal,
  Drawer,
  ConfirmationDialog,
  Select
} from '../components/ui/index.js'
import DeviceMap from '../components/maps/DeviceMap.vue'
import { useToast } from '../composables/useToast.js'
import {
  Video,
  Volume2,
  AlertTriangle,
  Clock,
  Mic,
  Sliders
} from '@lucide/vue'

import { useCctvStore } from '../stores/cctv.js'
import { onMounted, computed } from 'vue'

const toast = useToast()
const cctvStore = useCctvStore()

// Dialog states for testing
const testComponentModal = ref(false)
const testConfirmOpen = ref(false)
const testDrawerOpen = ref(false)
const testTarget = ref('AUD-0001')
const isPttActive = ref(false)

const displayedMapDevices = computed(() => {
  return cctvStore.mapCameras
})

// Statistics (Live from Database)
const stats = computed(() => {
  const totalCctv = cctvStore.activeCameras.length
  const onlineCctv = cctvStore.activeCameras.filter((c) => c.status === 'ONLINE' || !c.status).length
  const offlineCctv = cctvStore.activeCameras.filter((c) => c.status === 'OFFLINE').length
  const warningCctv = cctvStore.activeCameras.filter((c) => c.status === 'WARNING').length
  return {
    cctv: { total: totalCctv, online: onlineCctv, warning: warningCctv, offline: offlineCctv },
    audio: { total: 0, online: 0, zones: 0, idle: 0 },
    alarms: { open: 0, critical: 0, warning: 0, resolved: 0 },
  }
})

const nextSchedule = reactive({
  name: 'Pengumuman Harian',
  time: 'Besok, 08:00 WIB',
  target: 'Zona Lobby'
})

onMounted(async () => {
  await Promise.all([
    cctvStore.fetchCameras(),
    cctvStore.fetchSitesAndZones()
  ])
})

const systemServices = ref([
  { name: 'CCTV Health Monitor', detail: 'Interval 30s • Ping adapter', online: true, statusLabel: 'ONLINE' },
  { name: 'Media Gateway (WebRTC/RTSP)', detail: 'Simulasi adapter stream siap', online: true, statusLabel: 'ONLINE' },
  { name: 'Audio Scheduler Worker', detail: 'Cron poller aktif', online: true, statusLabel: 'ONLINE' },
  { name: 'Real-time WebSocket Hub', detail: 'Status broadcaster channel', online: true, statusLabel: 'ONLINE' },
])

// Event columns for table
const eventColumns = [
  { key: 'severity', label: 'Tingkat', width: 'w-24' },
  { key: 'title', label: 'Judul Event' },
  { key: 'device', label: 'Perangkat' },
  { key: 'status', label: 'Status Alarm', width: 'w-28' },
  { key: 'occurredAt', label: 'Waktu Kejadian', width: 'w-36' },
  { key: 'actions', label: 'Aksi', align: 'right', width: 'w-36' }
]

const recentEvents = ref([
  {
    id: '1',
    severity: 'CRITICAL',
    title: 'Kamera Tidak Merespons (Ping Timeout)',
    device: 'CAM-0003 [DEMO] Kamera Parkir 1',
    status: 'OPEN',
    occurredAt: '12-10-2026 09:15:02'
  },
  {
    id: '2',
    severity: 'WARNING',
    title: 'Latensi Audio Melebihi Batas (320ms)',
    device: 'AUD-0002 [DEMO] Speaker Parkir',
    status: 'OPEN',
    occurredAt: '12-10-2026 08:42:19'
  },
  {
    id: '3',
    severity: 'INFO',
    title: 'Perangkat Kembali Online',
    device: 'CAM-0001 [DEMO] Kamera Lobby 1',
    status: 'RESOLVED',
    occurredAt: '12-10-2026 07:30:00'
  }
])

function acknowledgeEvent(row) {
  row.status = 'ACKNOWLEDGED'
  toast.success('Alarm Diakui', `Alarm pada ${row.device} diubah ke status ACKNOWLEDGED`)
}

function viewEventDetail(row) {
  toast.info('Detail Event', `Membuka log insiden: ${row.title}`)
}

function handleConfirmDelete() {
  testConfirmOpen.value = false
  toast.success('Kamera Diarsipkan', 'Perangkat CAM-0003 berhasil diarsipkan (soft delete).')
}
</script>
