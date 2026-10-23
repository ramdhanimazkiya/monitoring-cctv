<template>
  <div class="space-y-6">
    <!-- Header: Title & Actions -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#283548]">
      <div>
        <div class="flex items-center gap-2 flex-wrap">
          <h2 class="text-lg font-bold text-slate-100 tracking-tight">Audit Trail & Log</h2>
          <!-- <span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-950/70 text-amber-300 border border-amber-800">
            ADMIN ONLY
          </span> -->
          <!-- <span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-950/70 text-emerald-300 border border-emerald-800">
            APPEND-ONLY (IMMUTABLE)
          </span> -->
        </div>
        <p class="text-xs text-slate-400 mt-1 font-mono">
          Jejak aktivitas keamanan append-only. <strong>Log ini dilindungi database trigger dan tidak dapat dimodifikasi atau dihapus oleh siapapun.</strong>
        </p>
      </div>

      <!-- Header Action Buttons -->
      <div class="flex items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          :loading="auditStore.loading"
          @click="loadAllData"
        >
          <RefreshCw class="w-3.5 h-3.5 mr-1.5" :class="{ 'animate-spin': auditStore.loading }" />
          Segarkan
        </Button>

        <Button
          variant="secondary"
          size="sm"
          @click="handleExport('csv')"
        >
          <Download class="w-3.5 h-3.5 mr-1.5" />
          Ekspor CSV
        </Button>
<!-- 
        <Button
          variant="secondary"
          size="sm"
          @click="handleExport('json')"
        >
          <FileCode class="w-3.5 h-3.5 mr-1.5" />
          JSON
        </Button> -->
      </div>
    </div>

    <!-- Filter & Search Controls -->
    <div class="bg-[#0d131f] border border-[#1e2a3b] p-3 rounded-xl text-xs font-mono space-y-3">
      <div class="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        <!-- Search Input -->
        <div class="flex items-center gap-2 flex-1 bg-[#111827] border border-[#283548] px-3 py-1.5 rounded-lg focus-within:border-blue-500">
          <Search class="w-4 h-4 text-slate-400 shrink-0" />
          <input
            v-model="filters.search"
            type="text"
            placeholder="Cari aksi, username, ID entitas, IP address, atau pesan log..."
            class="flex-1 bg-transparent text-slate-100 placeholder-slate-500 focus:outline-none"
            @keydown.enter="applyFilters"
          />
          <button
            v-if="filters.search"
            type="button"
            class="text-slate-400 hover:text-white"
            @click="filters.search = ''; applyFilters()"
          >
            <X class="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <!-- Date Filters & Reset Row -->
      <div class="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#1e2a3b]/60">
        <div class="flex flex-wrap items-center gap-2.5 text-slate-400">
          <div class="flex items-center gap-1.5">
            <span class="text-[11px] text-slate-400">Dari:</span>
            <input
              v-model="filters.startDate"
              type="date"
              class="bg-[#111827] border border-[#283548] text-slate-200 px-2 py-1 rounded text-xs focus:outline-none focus:border-blue-500"
              @change="applyFilters"
            />
          </div>

          <div class="flex items-center gap-1.5">
            <span class="text-[11px] text-slate-400">Sampai:</span>
            <input
              v-model="filters.endDate"
              type="date"
              class="bg-[#111827] border border-[#283548] text-slate-200 px-2 py-1 rounded text-xs focus:outline-none focus:border-blue-500"
              @change="applyFilters"
            />
          </div>

          <button
            v-if="hasActiveFilters"
            type="button"
            class="text-blue-400 hover:text-blue-300 underline text-xs cursor-pointer ml-1"
            @click="resetFilters"
          >
            Reset Semua Filter
          </button>
        </div>

        <div class="text-[11px] text-slate-400 font-mono">
          Menampilkan <strong class="text-blue-400">{{ auditStore.logs.length }}</strong> dari <strong class="text-slate-200">{{ auditStore.pagination.total }}</strong> log
        </div>
      </div>
    </div>

    <!-- Table of Audit Logs -->
    <Table
      title="Daftar Rekaman Audit Trail"
      subtitle="Data historis keamanan sistem berurutan waktu (terbaru ke terlama)"
      :count="auditStore.pagination.total"
      :columns="columns"
      :data="auditStore.logs"
      :loading="auditStore.loading"
    >
      <!-- Slot ID -->
      <template #id="{ row }">
        <span class="font-mono text-xs font-semibold text-slate-400">#{{ row.id }}</span>
      </template>

      <!-- Slot Waktu -->
      <template #createdAt="{ row }">
        <div class="font-mono text-xs text-slate-300">
          <span class="block text-slate-200 font-medium">{{ formatDateTime(row.createdAt).date }}</span>
          <span class="block text-[10px] text-slate-400">{{ formatDateTime(row.createdAt).time }} WIB</span>
        </div>
      </template>

      <!-- Slot Aktor -->
      <template #actor="{ row }">
        <div class="flex items-center gap-2">
          <div
            :class="[
              'w-6 h-6 rounded-full flex items-center justify-center font-mono font-bold text-[10px] uppercase shrink-0',
              row.userRole === 'ADMIN' ? 'bg-amber-950 text-amber-300 border border-amber-800' : 'bg-blue-950 text-blue-300 border border-blue-800'
            ]"
          >
            {{ (row.actor || 'US').substring(0, 2) }}
          </div>
          <div class="min-w-0">
            <span class="font-mono font-bold text-xs text-slate-100 block truncate">
              @{{ row.actor }}
            </span>
            <span v-if="row.userId" class="text-[10px] text-purple-400 font-mono block">
              {{ row.userId }}
            </span>
          </div>
        </div>
      </template>

      <!-- Slot Aksi -->
      <template #action="{ row }">
        <div class="flex flex-col gap-1 items-start">
          <span
            :class="[
              'px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase inline-flex items-center gap-1',
              getActionColorClass(row.action)
            ]"
          >
            {{ row.action }}
          </span>
          <span v-if="row.message" class="text-[10px] text-slate-400 font-mono truncate max-w-[220px]" :title="row.message">
            {{ row.message }}
          </span>
        </div>
      </template>

      <!-- Slot Entitas -->
      <template #entity="{ row }">
        <div v-if="row.entityType || row.entityId" class="font-mono text-xs">
          <span class="text-[10px] uppercase px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
            {{ row.entityType || 'SYSTEM' }}
          </span>
          <span v-if="row.entityId" class="text-xs text-slate-200 font-bold block mt-1">
            {{ row.entityId }}
          </span>
        </div>
        <span v-else class="text-slate-500 font-mono text-xs">-</span>
      </template>

      <!-- Slot IP Address -->
      <template #ipAddress="{ row }">
        <div class="font-mono text-xs">
          <span class="text-slate-300 block">{{ row.ipAddress || '127.0.0.1' }}</span>
          <span v-if="row.requestId" class="text-[10px] text-slate-500 block truncate max-w-[100px]" :title="`Req ID: ${row.requestId}`">
            req:{{ row.requestId }}
          </span>
        </div>
      </template>

      <!-- Slot Hasil -->
      <template #result="{ row }">
        <Badge
          :status="row.result === 'SUCCESS' ? 'ACTIVE' : 'ERROR'"
          :label="row.result"
          size="xs"
        />
      </template>

      <!-- Slot Aksi / Inspect -->
      <template #actions="{ row }">
        <div class="flex items-center justify-end">
          <Button
            variant="ghost"
            size="xs"
            class="text-blue-400 hover:text-blue-300 hover:bg-blue-950/40 flex items-center gap-1 font-mono"
            @click="openInspectDrawer(row)"
          >
            <Eye class="w-3.5 h-3.5" />
            Detail
          </Button>
        </div>
      </template>

      <!-- Table Pagination Footer -->
      <template #footer>
        <div class="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono text-slate-400">
          <div class="flex items-center gap-2">
            <span>Baris per halaman:</span>
            <select
              v-model="filters.limit"
              class="bg-[#151f33] border border-[#283548] text-slate-200 rounded px-2 py-0.5 cursor-pointer focus:outline-none"
              @change="filters.page = 1; loadLogs()"
            >
              <option :value="10">10</option>
              <option :value="20">20</option>
              <option :value="50">50</option>
              <option :value="100">100</option>
            </select>
          </div>

          <div class="flex items-center gap-1.5">
            <button
              type="button"
              :disabled="filters.page <= 1 || auditStore.loading"
              class="px-2.5 py-1 rounded bg-[#151f33] border border-[#283548] text-slate-300 hover:text-white hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              @click="changePage(filters.page - 1)"
            >
              &larr; Sebelumnya
            </button>

            <span class="px-2.5 py-1 text-slate-300 bg-[#0d131f] border border-[#283548] rounded font-bold">
              {{ filters.page }} / {{ auditStore.pagination.totalPages || 1 }}
            </span>

            <button
              type="button"
              :disabled="filters.page >= auditStore.pagination.totalPages || auditStore.loading"
              class="px-2.5 py-1 rounded bg-[#151f33] border border-[#283548] text-slate-300 hover:text-white hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              @click="changePage(filters.page + 1)"
            >
              Selanjutnya &rarr;
            </button>
          </div>
        </div>
      </template>
    </Table>

    <!-- ===================================================================== -->
    <!-- DRAWER: DETAIL & INSPEKSI AUDIT LOG                                   -->
    <!-- ===================================================================== -->
    <Drawer
      v-model="inspectDrawerOpen"
      :title="`Inspeksi Audit Log #${inspectedLog?.id || ''}`"
      :subtitle="`Direkam pada ${inspectedLog ? formatDateTime(inspectedLog.createdAt).full : ''}`"
      size="lg"
    >
      <div v-if="inspectedLog" class="space-y-4 font-mono text-xs">
        <!-- Overview Grid -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <!-- Kolom Aktor & Identitas -->
          <div class="p-3 rounded-lg bg-[#0d131f] border border-[#283548] space-y-2">
            <span class="text-[10px] text-slate-400 font-bold uppercase tracking-wider block border-b border-[#1e2a3b] pb-1">
              Informasi Aktor
            </span>
            <div class="grid grid-cols-3 gap-1">
              <span class="text-slate-500">Username:</span>
              <span class="col-span-2 text-slate-200 font-bold">@{{ inspectedLog.actor }}</span>

              <span class="text-slate-500">User ID:</span>
              <span class="col-span-2 text-purple-400 font-semibold">{{ inspectedLog.userId || '-' }}</span>

              <span class="text-slate-500">Nama Lengkap:</span>
              <span class="col-span-2 text-slate-200">{{ inspectedLog.userFullName || '-' }}</span>

              <span class="text-slate-500">Peran Akun:</span>
              <span class="col-span-2 text-amber-400 font-bold">{{ inspectedLog.userRole || '-' }}</span>
            </div>
          </div>

          <!-- Kolom Aksi & Hasil -->
          <div class="p-3 rounded-lg bg-[#0d131f] border border-[#283548] space-y-2">
            <span class="text-[10px] text-slate-400 font-bold uppercase tracking-wider block border-b border-[#1e2a3b] pb-1">
              Status Eksekusi
            </span>
            <div class="grid grid-cols-3 gap-1 items-center">
              <span class="text-slate-500">Aksi:</span>
              <span class="col-span-2 font-bold text-slate-200">{{ inspectedLog.action }}</span>

              <span class="text-slate-500">Hasil:</span>
              <div class="col-span-2">
                <Badge
                  :status="inspectedLog.result === 'SUCCESS' ? 'ACTIVE' : 'ERROR'"
                  :label="inspectedLog.result"
                  size="xs"
                />
              </div>

              <span class="text-slate-500">Target Entitas:</span>
              <span class="col-span-2 text-cyan-300">
                {{ inspectedLog.entityType || 'SYSTEM' }}
                <strong v-if="inspectedLog.entityId" class="text-white">({{ inspectedLog.entityId }})</strong>
              </span>

              <span class="text-slate-500">Waktu:</span>
              <span class="col-span-2 text-slate-300">{{ formatDateTime(inspectedLog.createdAt).full }}</span>
            </div>
          </div>
        </div>

        <!-- Kolom Jaringan & Header HTTP -->
        <div class="p-3 rounded-lg bg-[#0d131f] border border-[#283548] space-y-2">
          <span class="text-[10px] text-slate-400 font-bold uppercase tracking-wider block border-b border-[#1e2a3b] pb-1">
            Jaringan & Konteks Klien
          </span>
          <div class="grid grid-cols-1 sm:grid-cols-4 gap-2">
            <div>
              <span class="text-slate-500 block text-[10px]">Alamat IP:</span>
              <strong class="text-slate-200">{{ inspectedLog.ipAddress || '127.0.0.1' }}</strong>
            </div>
            <div>
              <span class="text-slate-500 block text-[10px]">Request ID:</span>
              <span class="text-slate-300 truncate block">{{ inspectedLog.requestId || '-' }}</span>
            </div>
            <div class="sm:col-span-2">
              <span class="text-slate-500 block text-[10px]">User Agent:</span>
              <span class="text-slate-400 text-[11px] break-all block">{{ inspectedLog.userAgent || '-' }}</span>
            </div>
          </div>
        </div>

        <!-- Pesan Tambahan jika ada -->
        <div v-if="inspectedLog.message" class="p-3 rounded-lg bg-blue-950/20 border border-blue-900/50">
          <span class="text-[10px] text-blue-400 uppercase font-bold block mb-1">Catatan Pesan Sistem:</span>
          <p class="text-slate-200">{{ inspectedLog.message }}</p>
        </div>

        <!-- Payload State Inspector (Before / After) -->
        <div class="space-y-3 pt-2">
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold text-slate-200">Perubahan Data (State Mutation Payload):</span>
            <span class="text-[10px] text-emerald-400 bg-emerald-950/70 border border-emerald-800 px-2 py-0.5 rounded">
              Password/Kredensial Otomatis Diredaksi ([REDACTED])
            </span>
          </div>

          <!-- Perbandingan Sebelum dan Sesudah -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <!-- State SEBELUM (BEFORE) -->
            <div class="p-3 rounded-lg bg-[#0b0f17] border border-[#283548] flex flex-col">
              <span class="text-[11px] font-bold text-rose-400 block mb-1 flex items-center gap-1.5">
                <span class="w-2 h-2 rounded-full bg-rose-500"></span>
                SEBELUM (BEFORE)
              </span>
              <pre
                v-if="inspectedLog.before"
                class="bg-[#080c14] p-2.5 rounded border border-[#1b2537] text-[11px] text-slate-300 overflow-x-auto flex-1 font-mono leading-relaxed"
              >{{ formatJson(inspectedLog.before) }}</pre>
              <div v-else class="text-slate-500 italic py-6 text-center bg-[#080c14] rounded border border-[#1b2537]">
                Tidak ada data state sebelum aksi (misal saat CREATE / INSERT baru).
              </div>
            </div>

            <!-- State SESUDAH (AFTER) -->
            <div class="p-3 rounded-lg bg-[#0b0f17] border border-[#283548] flex flex-col">
              <span class="text-[11px] font-bold text-emerald-400 block mb-1 flex items-center gap-1.5">
                <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
                SESUDAH (AFTER)
              </span>
              <pre
                v-if="inspectedLog.after"
                class="bg-[#080c14] p-2.5 rounded border border-[#1b2537] text-[11px] text-slate-300 overflow-x-auto flex-1 font-mono leading-relaxed"
              >{{ formatJson(inspectedLog.after) }}</pre>
              <div v-else class="text-slate-500 italic py-6 text-center bg-[#080c14] rounded border border-[#1b2537]">
                Tidak ada data state sesudah aksi (misal saat DELETE / LOGIN FAILED).
              </div>
            </div>
          </div>
        </div>
      </div>

      <template #footer="{ close }">
        <Button variant="secondary" size="sm" @click="close">Tutup</Button>
      </template>
    </Drawer>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { Table, Badge, Button, Drawer } from '../components/ui/index.js'
import { useAuditStore } from '../stores/audit.js'
import { useToast } from '../composables/useToast.js'
import {
  ClipboardList,
  ShieldCheck,
  AlertTriangle,
  Clock,
  RefreshCw,
  Download,
  FileCode,
  Search,
  X,
  Eye
} from '@lucide/vue'

const toast = useToast()
const auditStore = useAuditStore()

// Filter State
const filters = reactive({
  page: 1,
  limit: 20,
  search: '',
  action: 'ALL',
  result: 'ALL',
  entityType: 'ALL',
  startDate: '',
  endDate: ''
})

// Columns
const columns = [
  { key: 'id', label: 'ID Log', width: 'w-20' },
  { key: 'createdAt', label: 'Waktu (WIB)', width: 'w-36' },
  { key: 'actor', label: 'Aktor / Pengguna', width: 'w-44' },
  { key: 'action', label: 'Aksi Sistem' },
  { key: 'entity', label: 'Target Entitas', width: 'w-32' },
  { key: 'ipAddress', label: 'IP Asal', width: 'w-28' },
  { key: 'result', label: 'Status', width: 'w-24' },
  { key: 'actions', label: 'Aksi', align: 'right', width: 'w-24' }
]

// Drawer State
const inspectDrawerOpen = ref(false)
const inspectedLog = ref(null)

const availableEntities = computed(() => {
  const fallback = ['user', 'camera', 'audio_device', 'site', 'zone', 'session', 'schedule']
  const loaded = auditStore.stats.entityTypes || []
  return Array.from(new Set([...loaded, ...fallback])).filter(Boolean)
})

const availableActions = computed(() => {
  const fallback = [
    'AUTH_LOGIN_SUCCESS',
    'AUTH_LOGIN_FAILED',
    'AUTH_LOGOUT',
    'USER_CREATED',
    'USER_UPDATED',
    'USER_DELETED',
    'CAMERA_CREATED',
    'CAMERA_UPDATED',
    'CAMERA_DELETED',
    'AUDIO_DEVICE_CREATED',
    'AUDIO_DEVICE_UPDATED',
    'AUDIO_DEVICE_DELETED',
    'SITE_CREATED',
    'SITE_UPDATED',
    'SITE_DELETED',
    'ZONE_CREATED',
    'ZONE_UPDATED',
    'ZONE_DELETED'
  ]
  const loaded = auditStore.stats.actions || []
  return Array.from(new Set([...loaded, ...fallback])).sort()
})

const hasActiveFilters = computed(() => {
  return (
    filters.search ||
    filters.action !== 'ALL' ||
    filters.result !== 'ALL' ||
    filters.entityType !== 'ALL' ||
    filters.startDate ||
    filters.endDate
  )
})

function getActionColorClass(action = '') {
  const act = String(action).toUpperCase()
  if (act.startsWith('AUTH_')) {
    if (act.includes('FAILED')) return 'bg-rose-950/80 text-rose-300 border border-rose-800'
    return 'bg-blue-950/80 text-blue-300 border border-blue-800'
  }
  if (act.startsWith('USER_')) return 'bg-purple-950/80 text-purple-300 border border-purple-800'
  if (act.startsWith('CAMERA_')) return 'bg-cyan-950/80 text-cyan-300 border border-cyan-800'
  if (act.startsWith('AUDIO_')) return 'bg-indigo-950/80 text-indigo-300 border border-indigo-800'
  if (act.startsWith('SITE_') || act.startsWith('ZONE_')) return 'bg-amber-950/80 text-amber-300 border border-amber-800'
  return 'bg-slate-800 text-slate-300 border border-slate-700'
}

function formatDateTime(isoStr) {
  if (!isoStr) return { date: '-', time: '-', full: '-' }
  const d = new Date(isoStr)
  if (isNaN(d.getTime())) return { date: isoStr, time: '', full: isoStr }

  const pad = (n) => String(n).padStart(2, '0')
  const day = pad(d.getDate())
  const month = pad(d.getMonth() + 1)
  const year = d.getFullYear()
  const hours = pad(d.getHours())
  const mins = pad(d.getMinutes())
  const secs = pad(d.getSeconds())

  const dateStr = `${day}/${month}/${year}`
  const timeStr = `${hours}:${mins}:${secs}`
  return {
    date: dateStr,
    time: timeStr,
    full: `${dateStr} ${timeStr} WIB`
  }
}

function formatJson(val) {
  if (val === null || val === undefined) return ''
  try {
    return JSON.stringify(val, null, 2)
  } catch {
    return String(val)
  }
}

async function loadLogs() {
  await auditStore.fetchLogs(filters)
}

async function loadAllData() {
  await Promise.all([
    auditStore.fetchStats(),
    auditStore.fetchLogs(filters)
  ])
  toast.success('Audit Log Dimuat', 'Data audit log dan ringkasan metrik berhasil disegarkan.')
}

function applyFilters() {
  filters.page = 1
  loadLogs()
}

function resetFilters() {
  filters.search = ''
  filters.action = 'ALL'
  filters.result = 'ALL'
  filters.entityType = 'ALL'
  filters.startDate = ''
  filters.endDate = ''
  filters.page = 1
  loadLogs()
}

function changePage(newPage) {
  if (newPage < 1 || newPage > auditStore.pagination.totalPages) return
  filters.page = newPage
  loadLogs()
}

function openInspectDrawer(row) {
  inspectedLog.value = row
  inspectDrawerOpen.value = true
}

function handleExport(format = 'csv') {
  auditStore.downloadExport(filters, format)
  toast.info('Mengunduh Log', `Sedang mengunduh berkas audit log format ${format.toUpperCase()}...`)
}

onMounted(() => {
  auditStore.fetchStats()
  loadLogs()
})
</script>
