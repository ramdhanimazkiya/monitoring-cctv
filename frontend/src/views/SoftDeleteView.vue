<template>
  <div class="space-y-4">
    <!-- Header: Dynamic Title based on Active Sub-feature -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#283548]">
      <div>
        <div class="flex items-center gap-2">
          <div class="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <ArchiveRestore class="w-4 h-4" />
          </div>
          <h2 class="text-lg font-bold text-slate-100 tracking-tight">
            Data Terhapus: {{ pageTitle }}
          </h2>
          <span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-950/70 text-amber-300 border border-amber-800">
            ADMIN
          </span>
        </div>
        <p class="text-xs text-slate-400 mt-1 font-mono">
          {{ pageDescription }}
        </p>
      </div>

      <!-- Action Button: Refresh -->
      <div class="flex items-center gap-2">
        <Button variant="secondary" size="sm" :loading="trashStore.loading" @click="refreshData">
          <RefreshCw class="w-3.5 h-3.5 mr-1" />
          Segarkan Data
        </Button>
      </div>
    </div>

    <!-- ===================================================================== -->
    <!-- 1. DEVICE MANAGEMENT (CCTV & AUDIO)                                   -->
    <!-- ===================================================================== -->
    <div v-if="currentSub === 'devices'" class="space-y-4">
      <!-- Search Input Full Width -->
      <div class="w-full relative">
        <Search class="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          v-model="deviceSearchQuery"
          type="text"
          placeholder="Cari ID perangkat, nama perangkat, atau lokasi site/zona..."
          class="w-full bg-[#111827] border border-[#283548] rounded-lg pl-9 pr-4 py-2 text-xs font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
        />
      </div>

      <!-- Empty State -->
      <div
        v-if="!trashStore.loading && filteredDevicesList.length === 0"
        class="p-12 text-center bg-[#0d131f]/60 border border-[#1e2a3b] rounded-xl font-mono text-xs text-slate-400"
      >
        <Server class="w-8 h-8 text-slate-600 mx-auto mb-2" />
        <p class="text-slate-300 font-semibold">Tidak ada perangkat yang berada di tempat sampah</p>
        <p class="text-slate-500 mt-0.5">Seluruh kamera CCTV dan speaker audio aktif pada sistem.</p>
      </div>

      <!-- Data Table -->
      <div v-else class="overflow-x-auto rounded-xl border border-[#283548] bg-[#0d131f]">
        <table class="w-full text-left text-xs">
          <thead class="bg-[#131b2c] border-b border-[#283548] text-slate-400 font-mono text-[11px] uppercase tracking-wider">
            <tr>
              <th class="px-4 py-3 w-32">ID Perangkat</th>
              <th class="px-4 py-3">Nama Perangkat</th>
              <th class="px-4 py-3 w-28">Tipe</th>
              <th class="px-4 py-3">Lokasi Terakhir</th>
              <th class="px-4 py-3 w-44">Waktu Dihapus</th>
              <th class="px-4 py-3 text-right w-36">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[#1e2a3b] font-mono">
            <tr
              v-for="item in paginatedDevices"
              :key="item.id"
              class="hover:bg-[#151f33]/60 transition-colors"
            >
              <td class="px-4 py-3 font-bold text-amber-400">
                {{ item.id }}
              </td>
              <td class="px-4 py-3">
                <div class="font-semibold text-slate-200">{{ item.name }}</div>
                <div class="text-[10px] text-slate-500 truncate max-w-sm">
                  {{ item.streamUrl || item.whipUrl || item.host || 'Tanpa endpoint langsung' }}
                </div>
              </td>
              <td class="px-4 py-3">
                <span
                  :class="[
                    'px-2 py-0.5 rounded text-[10px] font-bold border',
                    item.deviceType === 'CCTV'
                      ? 'bg-blue-950/80 text-blue-300 border-blue-800'
                      : 'bg-purple-950/80 text-purple-300 border-purple-800'
                  ]"
                >
                  {{ item.deviceType }}
                </span>
              </td>
              <td class="px-4 py-3 text-[11px] text-slate-300">
                <div>Site: <span class="font-bold text-slate-200">{{ item.site?.name || item.siteId || '-' }}</span></div>
                <div class="text-slate-500 text-[10px]">
                  Zona: {{ item.zone?.name || item.zoneId || 'Tanpa Zona (Unassigned)' }}
                </div>
              </td>
              <td class="px-4 py-3 text-slate-400 text-[11px]">
                {{ formatDateTime(item.deletedAt) }}
              </td>
              <td class="px-4 py-3 text-right">
                <Button
                  variant="primary"
                  size="xs"
                  class="font-mono"
                  @click="promptRestoreDevice(item)"
                >
                  <RotateCcw class="w-3 h-3 mr-1" />
                  Pulihkan
                </Button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div v-if="deviceTotalPages > 1" class="flex items-center justify-between text-xs font-mono text-slate-400">
        <span>Halaman {{ deviceCurrentPage }} dari {{ deviceTotalPages }}</span>
        <div class="flex gap-1">
          <Button
            variant="secondary"
            size="xs"
            :disabled="deviceCurrentPage <= 1"
            @click="deviceCurrentPage--"
          >
            Prev
          </Button>
          <Button
            variant="secondary"
            size="xs"
            :disabled="deviceCurrentPage >= deviceTotalPages"
            @click="deviceCurrentPage++"
          >
            Next
          </Button>
        </div>
      </div>
    </div>

    <!-- ===================================================================== -->
    <!-- 2. SITE & ZONE                                                        -->
    <!-- ===================================================================== -->
    <div v-else-if="currentSub === 'sites-zones'" class="space-y-6">
      <!-- Search Input Full Width -->
      <div class="w-full relative">
        <Search class="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          v-model="siteZoneSearchQuery"
          type="text"
          placeholder="Cari ID, nama site, alamat gedung, atau nama zona lokasi..."
          class="w-full bg-[#111827] border border-[#283548] rounded-lg pl-9 pr-4 py-2 text-xs font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
        />
      </div>

      <!-- SITES TABLE -->
      <div class="space-y-2">
        <div class="flex items-center gap-2">
          <Building2 class="w-4 h-4 text-emerald-400" />
          <h3 class="text-xs font-bold text-slate-200 font-mono uppercase tracking-wider">
            Site Terhapus ({{ filteredSitesList.length }})
          </h3>
        </div>

        <div
          v-if="!trashStore.loading && filteredSitesList.length === 0"
          class="p-6 text-center bg-[#0d131f]/40 border border-[#1e2a3b] rounded-xl text-xs text-slate-500 font-mono"
        >
          Tidak ada data Site yang terhapus.
        </div>

        <div v-else class="overflow-x-auto rounded-xl border border-[#283548] bg-[#0d131f]">
          <table class="w-full text-left text-xs">
            <thead class="bg-[#131b2c] border-b border-[#283548] text-slate-400 font-mono text-[11px] uppercase tracking-wider">
              <tr>
                <th class="px-4 py-3 w-32">ID Site</th>
                <th class="px-4 py-3">Nama Site</th>
                <th class="px-4 py-3">Alamat / Keterangan</th>
                <th class="px-4 py-3 w-44">Waktu Dihapus</th>
                <th class="px-4 py-3 text-right w-36">Aksi</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-[#1e2a3b] font-mono">
              <tr
                v-for="site in filteredSitesList"
                :key="site.id"
                class="hover:bg-[#151f33]/60 transition-colors"
              >
                <td class="px-4 py-3 font-bold text-emerald-400">{{ site.id }}</td>
                <td class="px-4 py-3 font-semibold text-slate-100">{{ site.name }}</td>
                <td class="px-4 py-3 text-slate-400">{{ site.address || site.description || '-' }}</td>
                <td class="px-4 py-3 text-slate-400">{{ formatDateTime(site.deletedAt) }}</td>
                <td class="px-4 py-3 text-right">
                  <Button variant="primary" size="xs" @click="promptRestoreSite(site)">
                    <RotateCcw class="w-3 h-3 mr-1" />
                    Pulihkan Site
                  </Button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- ZONES TABLE -->
      <div class="space-y-2 pt-2">
        <div class="flex items-center gap-2">
          <Layers class="w-4 h-4 text-emerald-400" />
          <h3 class="text-xs font-bold text-slate-200 font-mono uppercase tracking-wider">
            Zona Terhapus ({{ filteredZonesList.length }})
          </h3>
        </div>

        <div
          v-if="!trashStore.loading && filteredZonesList.length === 0"
          class="p-6 text-center bg-[#0d131f]/40 border border-[#1e2a3b] rounded-xl text-xs text-slate-500 font-mono"
        >
          Tidak ada data Zona yang terhapus.
        </div>

        <div v-else class="overflow-x-auto rounded-xl border border-[#283548] bg-[#0d131f]">
          <table class="w-full text-left text-xs">
            <thead class="bg-[#131b2c] border-b border-[#283548] text-slate-400 font-mono text-[11px] uppercase tracking-wider">
              <tr>
                <th class="px-4 py-3 w-32">ID Zona</th>
                <th class="px-4 py-3">Nama Zona</th>
                <th class="px-4 py-3">Site Induk</th>
                <th class="px-4 py-3 w-44">Waktu Dihapus</th>
                <th class="px-4 py-3 text-right w-36">Aksi</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-[#1e2a3b] font-mono">
              <tr
                v-for="zone in filteredZonesList"
                :key="zone.id"
                class="hover:bg-[#151f33]/60 transition-colors"
              >
                <td class="px-4 py-3 font-bold text-emerald-400">{{ zone.id }}</td>
                <td class="px-4 py-3 font-semibold text-slate-100">{{ zone.name }}</td>
                <td class="px-4 py-3">
                  <div class="flex items-center gap-1.5">
                    <span class="text-slate-200 font-medium">{{ zone.site?.name || zone.siteId }}</span>
                    <span
                      v-if="zone.site?.deletedAt"
                      class="px-1.5 py-0.2 rounded text-[9px] bg-red-950 text-red-300 border border-red-800"
                    >
                      Site Terhapus
                    </span>
                  </div>
                </td>
                <td class="px-4 py-3 text-slate-400">{{ formatDateTime(zone.deletedAt) }}</td>
                <td class="px-4 py-3 text-right">
                  <Button variant="primary" size="xs" @click="promptRestoreZone(zone)">
                    <RotateCcw class="w-3 h-3 mr-1" />
                    Pulihkan Zona
                  </Button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- ===================================================================== -->
    <!-- 3. USER MANAGEMENT                                                    -->
    <!-- ===================================================================== -->
    <div v-else-if="currentSub === 'users'" class="space-y-4">
      <!-- Search Input Full Width -->
      <div class="w-full relative">
        <Search class="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          v-model="userSearchQuery"
          type="text"
          placeholder="Cari ID, username (@user), nama lengkap, atau email pengguna..."
          class="w-full bg-[#111827] border border-[#283548] rounded-lg pl-9 pr-4 py-2 text-xs font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
        />
      </div>

      <!-- Empty State -->
      <div
        v-if="!trashStore.loading && filteredUsersList.length === 0"
        class="p-12 text-center bg-[#0d131f]/60 border border-[#1e2a3b] rounded-xl font-mono text-xs text-slate-400"
      >
        <Users class="w-8 h-8 text-slate-600 mx-auto mb-2" />
        <p class="text-slate-300 font-semibold">Tidak ada akun pengguna di tempat sampah</p>
        <p class="text-slate-500 mt-0.5">Semua akun administrator dan operator aktif.</p>
      </div>

      <!-- Data Table -->
      <div v-else class="overflow-x-auto rounded-xl border border-[#283548] bg-[#0d131f]">
        <table class="w-full text-left text-xs">
          <thead class="bg-[#131b2c] border-b border-[#283548] text-slate-400 font-mono text-[11px] uppercase tracking-wider">
            <tr>
              <th class="px-4 py-3 w-32">ID Pengguna</th>
              <th class="px-4 py-3">Username & Email</th>
              <th class="px-4 py-3">Nama Lengkap</th>
              <th class="px-4 py-3 w-28">Peran</th>
              <th class="px-4 py-3 w-44">Waktu Dihapus</th>
              <th class="px-4 py-3 text-right w-36">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[#1e2a3b] font-mono">
            <tr
              v-for="u in paginatedUsers"
              :key="u.id"
              class="hover:bg-[#151f33]/60 transition-colors"
            >
              <td class="px-4 py-3 font-bold text-amber-400">{{ u.id }}</td>
              <td class="px-4 py-3">
                <div class="font-bold text-slate-200">@{{ u.username }}</div>
                <div class="text-[10px] text-slate-500">{{ u.email || 'Tanpa email' }}</div>
              </td>
              <td class="px-4 py-3 font-medium text-slate-200">{{ u.fullName }}</td>
              <td class="px-4 py-3">
                <span
                  :class="[
                    'px-2 py-0.5 rounded text-[10px] font-bold border',
                    u.role === 'ADMIN'
                      ? 'bg-amber-950/80 text-amber-300 border-amber-800'
                      : 'bg-blue-950/80 text-blue-300 border-blue-800'
                  ]"
                >
                  {{ u.role }}
                </span>
              </td>
              <td class="px-4 py-3 text-slate-400">{{ formatDateTime(u.deletedAt) }}</td>
              <td class="px-4 py-3 text-right">
                <Button variant="primary" size="xs" @click="promptRestoreUser(u)">
                  <RotateCcw class="w-3 h-3 mr-1" />
                  Pulihkan Akun
                </Button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div v-if="userTotalPages > 1" class="flex items-center justify-between text-xs font-mono text-slate-400">
        <span>Halaman {{ userCurrentPage }} dari {{ userTotalPages }}</span>
        <div class="flex gap-1">
          <Button
            variant="secondary"
            size="xs"
            :disabled="userCurrentPage <= 1"
            @click="userCurrentPage--"
          >
            Prev
          </Button>
          <Button
            variant="secondary"
            size="xs"
            :disabled="userCurrentPage >= userTotalPages"
            @click="userCurrentPage++"
          >
            Next
          </Button>
        </div>
      </div>
    </div>

    <!-- Restore Confirmation Dialog -->
    <ConfirmationDialog
      v-model="restoreModalOpen"
      :title="restoreDialogTitle"
      :message="restoreDialogMessage"
      confirm-text="Ya, Pulihkan Sekarang"
      variant="primary"
      @confirm="executeRestore"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { Button, ConfirmationDialog } from '../components/ui/index.js'
import { useTrashStore } from '../stores/trash.js'
import { useCctvStore } from '../stores/cctv.js'
import { useAudioDevicesStore } from '../stores/audioDevices.js'
import { useUsersStore } from '../stores/users.js'
import { useToast } from '../composables/useToast.js'
import {
  ArchiveRestore,
  Server,
  Users,
  RotateCcw,
  RefreshCw,
  Building2,
  Layers,
  Search
} from '@lucide/vue'

const route = useRoute()
const toast = useToast()
const trashStore = useTrashStore()
const cctvStore = useCctvStore()
const audioStore = useAudioDevicesStore()
const usersStore = useUsersStore()

// Current sub-route determined from URL ('devices' | 'sites-zones' | 'users')
const currentSub = computed(() => {
  return route.params.sub || 'devices'
})

const pageTitle = computed(() => {
  if (currentSub.value === 'devices') return 'Device Management'
  if (currentSub.value === 'sites-zones') return 'Site & Zone'
  if (currentSub.value === 'users') return 'User Management'
  return 'Soft Delete'
})

const pageDescription = computed(() => {
  if (currentSub.value === 'devices') {
    return 'Daftar kamera CCTV dan speaker audio yang diarsipkan. Perangkat dapat dipulihkan kembali ke inventaris aktif.'
  }
  if (currentSub.value === 'sites-zones') {
    return 'Daftar Site dan Zona lokasi yang diarsipkan. Data dapat dipulihkan kembali ke struktur hierarki aktif.'
  }
  if (currentSub.value === 'users') {
    return 'Daftar akun administrator dan operator yang diarsipkan. Akun dapat dipulihkan kembali dengan status aktif.'
  }
  return 'Manajemen arsip data terhapus.'
})

async function loadData() {
  if (currentSub.value === 'devices') {
    await trashStore.fetchDeletedDevices()
  } else if (currentSub.value === 'sites-zones') {
    await trashStore.fetchDeletedSitesAndZones()
  } else if (currentSub.value === 'users') {
    await trashStore.fetchDeletedUsers()
  }
}

watch(
  () => route.params.sub,
  async () => {
    await loadData()
  }
)

async function refreshData() {
  await loadData()
  await trashStore.fetchSummary()
  toast.success('Data Disegarkan', 'Daftar data terhapus berhasil diperbarui.')
}

// -----------------------------------------------------------------------------
// 1. DEVICE MANAGEMENT FILTER (SEARCH ONLY, NO TYPE FILTER BUTTONS)
// -----------------------------------------------------------------------------
const deviceSearchQuery = ref('')
const deviceCurrentPage = ref(1)
const devicePageSize = 10

const allDeletedDevicesList = computed(() => {
  const cams = trashStore.deletedDevices.cameras || []
  const auds = trashStore.deletedDevices.audioDevices || []
  return [...cams, ...auds]
})

const filteredDevicesList = computed(() => {
  let list = allDeletedDevicesList.value
  if (deviceSearchQuery.value.trim()) {
    const q = deviceSearchQuery.value.toLowerCase().trim()
    list = list.filter((d) =>
      (d.id && d.id.toLowerCase().includes(q)) ||
      (d.name && d.name.toLowerCase().includes(q)) ||
      (d.site?.name && d.site.name.toLowerCase().includes(q)) ||
      (d.deviceType && d.deviceType.toLowerCase().includes(q))
    )
  }
  return list
})

const deviceTotalPages = computed(() => Math.ceil(filteredDevicesList.value.length / devicePageSize) || 1)
const paginatedDevices = computed(() => {
  const start = (deviceCurrentPage.value - 1) * devicePageSize
  return filteredDevicesList.value.slice(start, start + devicePageSize)
})

// -----------------------------------------------------------------------------
// 2. SITE & ZONE SEARCH
// -----------------------------------------------------------------------------
const siteZoneSearchQuery = ref('')

const filteredSitesList = computed(() => {
  let list = trashStore.deletedSitesAndZones.sites || []
  if (siteZoneSearchQuery.value.trim()) {
    const q = siteZoneSearchQuery.value.toLowerCase().trim()
    list = list.filter((s) =>
      (s.id && s.id.toLowerCase().includes(q)) ||
      (s.name && s.name.toLowerCase().includes(q)) ||
      (s.address && s.address.toLowerCase().includes(q))
    )
  }
  return list
})

const filteredZonesList = computed(() => {
  let list = trashStore.deletedSitesAndZones.zones || []
  if (siteZoneSearchQuery.value.trim()) {
    const q = siteZoneSearchQuery.value.toLowerCase().trim()
    list = list.filter((z) =>
      (z.id && z.id.toLowerCase().includes(q)) ||
      (z.name && z.name.toLowerCase().includes(q)) ||
      (z.site?.name && z.site.name.toLowerCase().includes(q))
    )
  }
  return list
})

// -----------------------------------------------------------------------------
// 3. USER MANAGEMENT SEARCH & PAGINATION
// -----------------------------------------------------------------------------
const userSearchQuery = ref('')
const userCurrentPage = ref(1)
const userPageSize = 10

const filteredUsersList = computed(() => {
  let list = trashStore.deletedUsers || []
  if (userSearchQuery.value.trim()) {
    const q = userSearchQuery.value.toLowerCase().trim()
    list = list.filter((u) =>
      (u.id && u.id.toLowerCase().includes(q)) ||
      (u.username && u.username.toLowerCase().includes(q)) ||
      (u.fullName && u.fullName.toLowerCase().includes(q)) ||
      (u.email && u.email.toLowerCase().includes(q))
    )
  }
  return list
})

const userTotalPages = computed(() => Math.ceil(filteredUsersList.value.length / userPageSize) || 1)
const paginatedUsers = computed(() => {
  const start = (userCurrentPage.value - 1) * userPageSize
  return filteredUsersList.value.slice(start, start + userPageSize)
})

// -----------------------------------------------------------------------------
// RESTORATION CONFIRMATION DIALOG LOGIC
// -----------------------------------------------------------------------------
const restoreModalOpen = ref(false)
const restoreTarget = ref(null)
const restoreTargetType = ref('')

const restoreDialogTitle = computed(() => {
  if (restoreTargetType.value === 'DEVICE') return 'Pulihkan Perangkat'
  if (restoreTargetType.value === 'SITE') return 'Pulihkan Site'
  if (restoreTargetType.value === 'ZONE') return 'Pulihkan Zona'
  if (restoreTargetType.value === 'USER') return 'Pulihkan Akun Pengguna'
  return 'Konfirmasi Pemulihan'
})

const restoreDialogMessage = computed(() => {
  const t = restoreTarget.value
  if (!t) return ''
  if (restoreTargetType.value === 'DEVICE') {
    return `Apakah Anda yakin ingin memulihkan perangkat ${t.id} (${t.name}) kembali ke inventaris aktif?`
  }
  if (restoreTargetType.value === 'SITE') {
    return `Apakah Anda yakin ingin memulihkan Site ${t.id} (${t.name})?`
  }
  if (restoreTargetType.value === 'ZONE') {
    return `Apakah Anda yakin ingin memulihkan Zona ${t.id} (${t.name}) ke Site ${t.site?.name || t.siteId}?`
  }
  if (restoreTargetType.value === 'USER') {
    return `Apakah Anda yakin ingin mengaktifkan kembali akun pengguna ${t.id} (@${t.username})?`
  }
  return 'Lanjutkan pemulihan?'
})

function promptRestoreDevice(item) {
  restoreTarget.value = item
  restoreTargetType.value = 'DEVICE'
  restoreModalOpen.value = true
}

function promptRestoreSite(site) {
  restoreTarget.value = site
  restoreTargetType.value = 'SITE'
  restoreModalOpen.value = true
}

function promptRestoreZone(zone) {
  restoreTarget.value = zone
  restoreTargetType.value = 'ZONE'
  restoreModalOpen.value = true
}

function promptRestoreUser(user) {
  restoreTarget.value = user
  restoreTargetType.value = 'USER'
  restoreModalOpen.value = true
}

async function executeRestore() {
  restoreModalOpen.value = false
  const target = restoreTarget.value
  if (!target) return

  try {
    if (restoreTargetType.value === 'DEVICE') {
      await trashStore.restoreDevice(target.deviceType, target.id)
      await Promise.all([
        cctvStore.fetchCameras(),
        audioStore.fetchAudioDevices()
      ])
      toast.success('Perangkat Dipulihkan', `${target.id} (${target.name}) berhasil dipulihkan dan aktif kembali.`)
    } else if (restoreTargetType.value === 'SITE') {
      await trashStore.restoreSite(target.id)
      await cctvStore.fetchSitesAndZones()
      toast.success('Site Dipulihkan', `Site ${target.id} (${target.name}) berhasil diaktifkan kembali.`)
    } else if (restoreTargetType.value === 'ZONE') {
      await trashStore.restoreZone(target.id)
      await cctvStore.fetchSitesAndZones()
      toast.success('Zona Dipulihkan', `Zona ${target.id} (${target.name}) berhasil diaktifkan kembali.`)
    } else if (restoreTargetType.value === 'USER') {
      await trashStore.restoreUser(target.id)
      await usersStore.fetchUsers()
      toast.success('Pengguna Dipulihkan', `Akun @${target.username} berhasil diaktifkan kembali.`)
    }
  } catch (err) {
    toast.error('Gagal Memulihkan', err.message || 'Terjadi kesalahan sistem')
  }
}

function formatDateTime(isoStr) {
  if (!isoStr) return '-'
  try {
    const d = new Date(isoStr)
    return d.toLocaleString('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch {
    return isoStr
  }
}

onMounted(async () => {
  await loadData()
})
</script>
