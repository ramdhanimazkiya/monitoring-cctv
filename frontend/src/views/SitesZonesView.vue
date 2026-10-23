<template>
  <div class="space-y-6">
    <!-- Header: Title & Actions -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#283548]">
      <div>
        <div class="flex items-center gap-2 flex-wrap">
          <h2 class="text-lg font-bold text-slate-100 tracking-tight">Site & Zone Management</h2>
          <!-- <span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-950/70 text-amber-300 border border-amber-800">
            ADMINISTRASI
          </span> -->
          <!-- <span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-950/70 text-blue-300 border border-blue-800">
            DATABASE POSTGRESQL
          </span> -->
        </div>
        <p class="text-xs text-slate-400 mt-1 font-mono">
          Hierarki lokasi dua tingkat: Site (gedung/fasilitas) dan Zone (area pemantauan & audio). ID Zona terhubung otomatis dengan ID Site (ZON-001).
        </p>
      </div>

      <!-- Action Buttons -->
      <div class="flex items-center gap-2">
        <Button variant="secondary" size="sm" @click="openCreateSiteModal">
          + Tambah Site
        </Button>
        <Button variant="primary" size="sm" @click="openCreateZoneModal">
          + Tambah Zona
        </Button>
      </div>
    </div>

    <!-- Metric Summary Cards -->
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
      <div class="p-3 bg-[#0d131f] border border-[#1e2a3b] rounded-xl flex items-center justify-between">
        <div>
          <span class="text-[10px] text-slate-400 uppercase block">Total Site:</span>
          <p class="text-xl font-bold text-slate-100">{{ cctvStore.sites.length }}</p>
        </div>
        <div class="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
          <Building2 class="w-4 h-4" />
        </div>
      </div>

      <div class="p-3 bg-[#0d131f] border border-[#1e2a3b] rounded-xl flex items-center justify-between">
        <div>
          <span class="text-[10px] text-slate-400 uppercase block">Total Zona:</span>
          <p class="text-xl font-bold text-emerald-400">{{ cctvStore.zones.length }}</p>
        </div>
        <div class="w-8 h-8 rounded-lg bg-emerald-600/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
          <Layers class="w-4 h-4" />
        </div>
      </div>

      <div class="p-3 bg-[#0d131f] border border-[#1e2a3b] rounded-xl flex items-center justify-between">
        <div>
          <span class="text-[10px] text-slate-400 uppercase block">Speaker Terpasang:</span>
          <p class="text-xl font-bold text-purple-400">{{ totalInstalledSpeakers }}</p>
        </div>
        <div class="w-8 h-8 rounded-lg bg-purple-600/20 border border-purple-500/40 flex items-center justify-center text-purple-400">
          <Megaphone class="w-4 h-4" />
        </div>
      </div>

      <div class="p-3 bg-[#0d131f] border border-[#1e2a3b] rounded-xl flex items-center justify-between">
        <div>
          <span class="text-[10px] text-slate-400 uppercase block">CCTV Terpasang:</span>
          <p class="text-xl font-bold text-sky-400">{{ totalInstalledCameras }}</p>
        </div>
        <div class="w-8 h-8 rounded-lg bg-sky-600/20 border border-sky-500/40 flex items-center justify-center text-sky-400">
          <Video class="w-4 h-4" />
        </div>
      </div>
    </div>

    <!-- ===================================================================== -->
    <!-- TABEL 1: MASTER DATA SITE (Selalu Tampil & Dilengkapi Pagination)       -->
    <!-- ===================================================================== -->
    <div class="space-y-2">
      <!-- Search & Controls for Site Table -->
      <div class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#0d131f] border border-[#1e2a3b] p-2.5 rounded-xl text-xs font-mono">
        <div class="flex items-center gap-2 flex-1">
          <Building2 class="w-4 h-4 text-blue-400 shrink-0 ml-1" />
          <input
            v-model="siteSearchQuery"
            type="text"
            placeholder="Cari ID site, nama gedung, atau alamat..."
            class="flex-1 bg-transparent text-slate-200 placeholder-slate-500 focus:outline-none"
          />
        </div>
        <div class="flex items-center gap-2">
          <span class="text-[11px] text-slate-400 font-mono">
            Total: <strong class="text-blue-400">{{ filteredSites.length }}</strong> Site
          </span>
          <Button variant="secondary" size="xs" @click="openCreateSiteModal">
            + Tambah Site
          </Button>
        </div>
      </div>

      <Table
        title="Master Data Site (Gedung / Lokasi Induk)"
        subtitle="Entitas induk fasilitas fisik untuk pengelompokan zona pengawasan"
        :count="filteredSites.length"
        :columns="siteColumns"
        :data="paginatedSites"
      >
        <!-- Slot ID Site -->
        <template #id="{ row }">
          <div class="flex items-center gap-1.5 font-mono">
            <span class="font-bold text-blue-400">{{ row.id }}</span>
            <span class="text-[10px] text-slate-500" title="ID dibuat otomatis (Immutable)"></span>
          </div>
        </template>

        <!-- Slot Nama Site -->
        <template #name="{ row }">
          <div>
            <span class="font-semibold text-slate-100 text-xs">{{ row.name }}</span>
            <span v-if="row.address" class="block text-[11px] text-slate-400 font-mono truncate max-w-sm">
              {{ row.address }}
            </span>
          </div>
        </template>

        <!-- Slot Keterangan / Deskripsi -->
        <template #description="{ row }">
          <span class="text-xs text-slate-400 font-mono">
            {{ row.description || row.address || '-' }}
          </span>
        </template>

        <!-- Slot Zona Terdaftar -->
        <template #zoneCount="{ row }">
          <span class="px-2 py-0.5 rounded bg-emerald-950/70 text-emerald-300 border border-emerald-800 font-mono text-xs font-bold inline-flex items-center gap-1">
            <Layers class="w-3 h-3 text-emerald-400" />
            {{ getSiteZonesCount(row.id) }} Zona
          </span>
        </template>

        <!-- Slot Aksi -->
        <template #actions="{ row }">
          <div class="flex items-center justify-end gap-1.5">
            <Button variant="ghost" size="xs" @click="handleEditSite(row)">
              Edit
            </Button>
            <Button
              variant="ghost"
              size="xs"
              class="text-rose-400 hover:text-rose-300"
              @click="handleDeleteSite(row)"
            >
              Hapus
            </Button>
          </div>
        </template>

        <!-- Pagination Footer untuk Site Table -->
        <template #footer>
          <div class="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono text-slate-400">
            <div>
              <span>Menampilkan </span>
              <strong class="text-slate-200">
                {{ filteredSites.length === 0 ? 0 : (siteCurrentPage - 1) * sitePageSize + 1 }} - {{ Math.min(siteCurrentPage * sitePageSize, filteredSites.length) }}
              </strong>
              <span> dari </span>
              <strong class="text-slate-200">{{ filteredSites.length }}</strong>
              <span> site terdaftar</span>
            </div>

            <div class="flex items-center gap-1.5">
              <button
                type="button"
                :disabled="siteCurrentPage <= 1"
                class="px-2.5 py-1 rounded bg-[#151f33] border border-[#283548] text-slate-300 hover:text-white hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                @click="siteCurrentPage--"
              >
                &larr; Sebelumnya
              </button>

              <span class="px-2.5 py-1 text-slate-300 bg-[#0d131f] border border-[#283548] rounded font-bold">
                {{ siteCurrentPage }} / {{ siteTotalPages }}
              </span>

              <button
                type="button"
                :disabled="siteCurrentPage >= siteTotalPages"
                class="px-2.5 py-1 rounded bg-[#151f33] border border-[#283548] text-slate-300 hover:text-white hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                @click="siteCurrentPage++"
              >
                Selanjutnya &rarr;
              </button>
            </div>
          </div>
        </template>
      </Table>
    </div>

    <!-- ===================================================================== -->
    <!-- TABEL 2: MASTER DATA ZONE                                             -->
    <!-- Urutan Kolom: id, site induk, zone, speaker terpasang, cctv terpasang -->
    <!-- Format ID: ZON-001-001 (mengikuti ID Site)                            -->
    <!-- ===================================================================== -->
    <div class="space-y-2">
      <!-- Filter & Search Controls for Zone Table -->
      <div class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#0d131f] border border-[#1e2a3b] p-2.5 rounded-xl text-xs font-mono">
        <div class="flex items-center gap-2 flex-1">
          <Filter class="w-4 h-4 text-slate-400 shrink-0 ml-1" />
          <select
            v-model="selectedSiteFilter"
            class="bg-transparent text-slate-200 text-xs focus:outline-none cursor-pointer"
          >
            <option value="ALL" class="bg-[#111827] text-slate-200">Semua Site Induk (Filter Global)</option>
            <option
              v-for="site in cctvStore.sites"
              :key="site.id"
              :value="site.id"
              class="bg-[#111827] text-slate-200"
            >
              {{ site.name }} ({{ site.id }})
            </option>
          </select>

          <div class="w-px h-6 bg-[#283548]"></div>

          <input
            v-model="zoneSearchQuery"
            type="text"
            placeholder="Cari ID zona (ZON-001), nama zona, speaker, atau CCTV..."
            class="flex-1 bg-transparent text-slate-200 placeholder-slate-500 focus:outline-none"
          />
        </div>

        <div class="flex items-center gap-2">
          <span class="text-[11px] text-slate-400 font-mono">
            Total: <strong class="text-emerald-400">{{ filteredZones.length }}</strong> Zona
          </span>
          <Button variant="primary" size="xs" @click="openCreateZoneModal">
            + Tambah Zona
          </Button>
        </div>
      </div>

      <Table
        title="Daftar Master Zona Terdaftar"
        subtitle="Unit hierarki lokasi operasional pemetaan CCTV dan speaker audio paging"
        :count="filteredZones.length"
        :columns="zoneColumns"
        :data="paginatedZones"
      >
        <!-- Slot 1: ID Zona (Format ZON, Auto Generated & Immutable) -->
        <template #id="{ row }">
          <div class="flex items-center gap-1.5 font-mono">
            <span class="font-bold text-purple-400">{{ row.id }}</span>
            <span class="text-[10px] text-slate-500" title="ID dibuat otomatis oleh database (Immutable)"></span>
          </div>
        </template>

        <!-- Slot 2: Site Induk -->
        <template #site="{ row }">
          <div class="font-mono text-xs">
            <span class="font-semibold text-slate-200">
              {{ row.site?.name || getSiteName(row.siteId) }}
            </span>
            <span class="text-blue-400 text-[10px] block font-bold">
              ID Site: {{ row.siteId }}
            </span>
          </div>
        </template>

        <!-- Slot 3: Zone (Nama Zona & Deskripsi) -->
        <template #zone="{ row }">
          <div>
            <span class="font-semibold text-slate-100 text-xs">{{ row.name }}</span>
            <span v-if="row.description" class="block text-[11px] text-slate-400 font-mono truncate max-w-xs">
              {{ row.description }}
            </span>
          </div>
        </template>

        <!-- Slot 4: Speaker Terpasang (Menampilkan ID Audio) -->
        <template #speakers="{ row }">
          <div class="flex flex-wrap items-center gap-1 max-w-[260px]">
            <template v-if="getZoneSpeakerIds(row).length > 0">
              <span
                v-for="audioId in getZoneSpeakerIds(row)"
                :key="audioId"
                class="px-1.5 py-0.5 rounded bg-purple-950/80 text-purple-300 border border-purple-800 font-mono text-[10px] font-bold inline-flex items-center gap-1"
                :title="`Speaker Audio terdaftar: ${audioId}`"
              >
                <Megaphone class="w-2.5 h-2.5 text-purple-400" />
                {{ audioId }}
              </span>
            </template>
            <span v-else class="text-slate-600 text-[10px] font-mono italic">
              Tidak ada speaker
            </span>
          </div>
        </template>

        <!-- Slot 5: CCTV Terpasang (Menampilkan ID CCTV) -->
        <template #cctv="{ row }">
          <div class="flex flex-wrap items-center gap-1 max-w-[260px]">
            <template v-if="getZoneCctvIds(row).length > 0">
              <span
                v-for="cctvId in getZoneCctvIds(row)"
                :key="cctvId"
                class="px-1.5 py-0.5 rounded bg-blue-950/80 text-blue-300 border border-blue-800 font-mono text-[10px] font-bold inline-flex items-center gap-1"
                :title="`Kamera CCTV terdaftar: ${cctvId}`"
              >
                <Video class="w-2.5 h-2.5 text-blue-400" />
                {{ cctvId }}
              </span>
            </template>
            <span v-else class="text-slate-600 text-[10px] font-mono italic">
              Tidak ada CCTV
            </span>
          </div>
        </template>


        <!-- Slot 7: Aksi -->
        <template #actions="{ row }">
          <div class="flex items-center justify-end gap-1.5">
            <Button variant="ghost" size="xs" @click="handleEditZone(row)">
              Edit
            </Button>
            <Button
              variant="ghost"
              size="xs"
              class="text-rose-400 hover:text-rose-300"
              @click="handleDeleteZone(row)"
            >
              Hapus
            </Button>
          </div>
        </template>

        <!-- Pagination Footer untuk Zone Table -->
        <template #footer>
          <div class="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono text-slate-400">
            <div>
              <span>Menampilkan </span>
              <strong class="text-slate-200">
                {{ filteredZones.length === 0 ? 0 : (zoneCurrentPage - 1) * zonePageSize + 1 }} - {{ Math.min(zoneCurrentPage * zonePageSize, filteredZones.length) }}
              </strong>
              <span> dari </span>
              <strong class="text-slate-200">{{ filteredZones.length }}</strong>
              <span> zona terdaftar</span>
            </div>

            <div class="flex items-center gap-1.5">
              <button
                type="button"
                :disabled="zoneCurrentPage <= 1"
                class="px-2.5 py-1 rounded bg-[#151f33] border border-[#283548] text-slate-300 hover:text-white hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                @click="zoneCurrentPage--"
              >
                &larr; Sebelumnya
              </button>

              <span class="px-2.5 py-1 text-slate-300 bg-[#0d131f] border border-[#283548] rounded font-bold">
                {{ zoneCurrentPage }} / {{ zoneTotalPages }}
              </span>

              <button
                type="button"
                :disabled="zoneCurrentPage >= zoneTotalPages"
                class="px-2.5 py-1 rounded bg-[#151f33] border border-[#283548] text-slate-300 hover:text-white hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                @click="zoneCurrentPage++"
              >
                Selanjutnya &rarr;
              </button>
            </div>
          </div>
        </template>
      </Table>
    </div>

    <!-- ===================================================================== -->
    <!-- MODAL 1: CREATE / EDIT ZONE                                           -->
    <!-- ===================================================================== -->
    <Modal
      v-model="zoneModalOpen"
      :title="zoneModalMode === 'create' ? 'Tambah Master Zona Baru' : `Edit Zona: ${activeZone.id}`"
      description="ID zona dibuat otomatis oleh sistem ([AUTO GENERATE]) dan bersifat permanen."
      size="md"
    >
      <div class="space-y-3.5">
        <div class="p-2.5 rounded bg-[#151d2e] border border-[#283548] text-xs font-mono flex items-center justify-between">
          <span class="text-slate-400">ID Zona (Terkunci & Immutable): </span>
          <strong class="text-purple-400 font-bold">
            {{ zoneModalMode === 'create' ? '[AUTO GENERATE]' : activeZone.id }}
          </strong>
        </div>

        <Select
          v-model="activeZone.siteId"
          label="Pilih Site"
          :placeholder="cctvStore.sites.length ? '-- Pilih Site --' : '-- Belum Ada Site Terdaftar --'"
          :options="siteSelectOptions"
          required
        />

        <Input
          v-model="activeZone.name"
          label="Nama Zona"
          placeholder="Contoh: Lobby Utama, Area Parkir Timur, Koridor Lt. 2"
          required
        />

        <div>
          <label class="text-xs font-medium text-slate-300 block mb-1">Deskripsi Tambahan (Opsional):</label>
          <textarea
            v-model="activeZone.description"
            rows="2"
            placeholder="Keterangan peruntukan zona..."
            class="w-full bg-[#111827] border border-[#283548] rounded-md px-3 py-2 text-xs font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          ></textarea>
        </div>
      </div>

      <template #footer="{ close }">
        <Button variant="secondary" size="sm" @click="close">Batal</Button>
        <Button variant="primary" size="sm" :loading="cctvStore.loading" @click="saveZone">
          {{ zoneModalMode === 'create' ? 'Daftarkan Zona' : 'Simpan Perubahan' }}
        </Button>
      </template>
    </Modal>

    <!-- ===================================================================== -->
    <!-- MODAL 2: CREATE / EDIT SITE (Tanpa Koordinat GPS)                      -->
    <!-- ===================================================================== -->
    <Modal
      v-model="siteModalOpen"
      :title="siteModalMode === 'create' ? 'Tambah Master Site Baru' : `Edit Site: ${activeSite.id}`"
      description="Site mewakili gedung atau area fasilitas utama. ID dibuat otomatis oleh sistem ([AUTO GENERATE])."
      size="md"
    >
      <div class="space-y-3.5">
        <div class="p-2.5 rounded bg-[#151d2e] border border-[#283548] text-xs font-mono flex items-center justify-between">
          <span class="text-slate-400">ID Site (Terkunci & Immutable): </span>
          <strong class="text-blue-400 font-bold">
            {{ siteModalMode === 'create' ? '[AUTO GENERATE]' : activeSite.id }}
          </strong>
        </div>

        <Input
          v-model="activeSite.name"
          label="Nama Site / Gedung"
          placeholder="Contoh: Site A (Pusat Operasi), Site B (Gedung Barat)"
          required
        />

        <Input
          v-model="activeSite.address"
          label="Alamat Lokasi"
          placeholder="Contoh: Jl. Asia Afrika No. 10, Bandung"
        />

        <div>
          <label class="text-xs font-medium text-slate-300 block mb-1">Keterangan / Deskripsi Site (Opsional):</label>
          <textarea
            v-model="activeSite.description"
            rows="3"
            placeholder="Deskripsi fasilitas site..."
            class="w-full bg-[#111827] border border-[#283548] rounded-md px-3 py-2 text-xs font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          ></textarea>
        </div>
      </div>

      <template #footer="{ close }">
        <Button variant="secondary" size="sm" @click="close">Batal</Button>
        <Button variant="primary" size="sm" :loading="cctvStore.loading" @click="saveSite">
          {{ siteModalMode === 'create' ? 'Daftarkan Site' : 'Simpan Perubahan' }}
        </Button>
      </template>
    </Modal>

    <!-- Delete Confirmation Dialog -->
    <ConfirmationDialog
      v-model="deleteConfirmOpen"
      :title="deleteType === 'ZONE' ? 'Konfirmasi Hapus Zona' : 'Konfirmasi Hapus Site'"
      :message="`Apakah Anda yakin ingin menghapus ${deleteType === 'ZONE' ? 'Zona' : 'Site'} ${toDeleteTarget?.id} - ${toDeleteTarget?.name}?`"
      :warning="deleteType === 'ZONE'
        ? 'Opsi A Terpasang: Seluruh CCTV dan audio di zona ini TIDAK akan hilang, melainkan dialihkan ke status Tanpa Zona (Unassigned) di Site terkait agar pemantauan keamanan tetap aktif.'
        : 'Data master akan diarsipkan (soft delete). Catatan histori audit log akan tetap terjaga.'"
      @confirm="confirmDelete"
    />
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { Table, Button, Modal, Input, Select, ConfirmationDialog } from '../components/ui/index.js'
import { useCctvStore } from '../stores/cctv.js'
import { useAudioDevicesStore } from '../stores/audioDevices.js'
import { useToast } from '../composables/useToast.js'
import { Building2, Layers, Megaphone, Video, Filter } from '@lucide/vue'

const toast = useToast()
const cctvStore = useCctvStore()
const audioStore = useAudioDevicesStore()

// -----------------------------------------------------------------------------
// SITE TABLE STATE & PAGINATION
// -----------------------------------------------------------------------------
const siteSearchQuery = ref('')
const sitePageSize = 5
const siteCurrentPage = ref(1)

const siteColumns = [
  { key: 'id', label: 'ID Site', width: 'w-28' },
  { key: 'name', label: 'Nama Site / Gedung' },
  { key: 'description', label: 'Keterangan' },
  { key: 'zoneCount', label: 'Zona Terdaftar', width: 'w-32' },
  { key: 'actions', label: 'Aksi', align: 'right', width: 'w-28' }
]

const filteredSites = computed(() => {
  if (!siteSearchQuery.value.trim()) return cctvStore.sites
  const q = siteSearchQuery.value.toLowerCase()
  return cctvStore.sites.filter(
    (s) =>
      s.id?.toLowerCase().includes(q) ||
      s.name?.toLowerCase().includes(q) ||
      s.address?.toLowerCase().includes(q) ||
      s.description?.toLowerCase().includes(q)
  )
})

const siteTotalPages = computed(() => Math.ceil(filteredSites.value.length / sitePageSize) || 1)
const paginatedSites = computed(() => {
  const start = (siteCurrentPage.value - 1) * sitePageSize
  return filteredSites.value.slice(start, start + sitePageSize)
})

function getSiteZonesCount(siteId) {
  return cctvStore.zones.filter((z) => z.siteId === siteId).length
}

// -----------------------------------------------------------------------------
// ZONE TABLE STATE & PAGINATION
// -----------------------------------------------------------------------------
const selectedSiteFilter = ref('ALL')
const zoneSearchQuery = ref('')
const zonePageSize = 5
const zoneCurrentPage = ref(1)

// Urutan Kolom Sesuai Permintaan:
// id, site induk, zone, speaker terpasang (menampilkan id audio), cctv terpasang (menampilkan idcctv), status, aksi
const zoneColumns = [
  { key: 'id', label: 'ID Zona', width: 'w-32' },
  { key: 'site', label: 'Site Induk', width: 'w-48' },
  { key: 'zone', label: 'Nama Zona' },
  { key: 'speakers', label: 'Speaker Terpasang (ID Audio)' },
  { key: 'cctv', label: 'CCTV Terpasang (ID CCTV)' },
  { key: 'actions', label: 'Aksi', align: 'right', width: 'w-28' }
]

function getSiteName(siteId) {
  const s = cctvStore.sites.find((site) => site.id === siteId)
  return s ? s.name : siteId || '-'
}

function getZoneSpeakerIds(zone) {
  const fromStore = audioStore.activeDevices
    .filter((d) => d.zoneId === zone.id)
    .map((d) => d.id)
  const fromZone = (zone.audioDevices || []).map((d) => d.id)
  const set = new Set([...fromStore, ...fromZone])
  return Array.from(set)
}

function getZoneCctvIds(zone) {
  const fromStore = cctvStore.cameras
    .filter((c) => c.zoneId === zone.id)
    .map((c) => c.id)
  const fromZone = (zone.cameras || []).map((c) => c.id)
  const set = new Set([...fromStore, ...fromZone])
  return Array.from(set)
}

const totalInstalledSpeakers = computed(() => {
  return audioStore.activeDevices.filter((d) => !!d.zoneId).length
})

const totalInstalledCameras = computed(() => {
  return cctvStore.cameras.filter((c) => !!c.zoneId).length
})

const filteredZones = computed(() => {
  return cctvStore.zones.filter((z) => {
    // Filter Site Induk
    if (selectedSiteFilter.value !== 'ALL' && z.siteId !== selectedSiteFilter.value) {
      return false
    }
    // Search Query
    if (zoneSearchQuery.value.trim()) {
      const q = zoneSearchQuery.value.toLowerCase()
      const matchId = z.id?.toLowerCase().includes(q)
      const matchName = z.name?.toLowerCase().includes(q)
      const matchSite = (z.site?.name || getSiteName(z.siteId)).toLowerCase().includes(q)
      const matchSpeaker = getZoneSpeakerIds(z).some((id) => id.toLowerCase().includes(q))
      const matchCctv = getZoneCctvIds(z).some((id) => id.toLowerCase().includes(q))
      if (!matchId && !matchName && !matchSite && !matchSpeaker && !matchCctv) return false
    }
    return true
  })
})

const zoneTotalPages = computed(() => Math.ceil(filteredZones.value.length / zonePageSize) || 1)
const paginatedZones = computed(() => {
  const start = (zoneCurrentPage.value - 1) * zonePageSize
  return filteredZones.value.slice(start, start + zonePageSize)
})

// -----------------------------------------------------------------------------
// MODALS & ACTIVE MODELS
// -----------------------------------------------------------------------------
const zoneModalOpen = ref(false)
const zoneModalMode = ref('create')
const siteModalOpen = ref(false)
const siteModalMode = ref('create')

// Delete Confirmation
const deleteConfirmOpen = ref(false)
const deleteType = ref('ZONE')
const toDeleteTarget = ref(null)

const activeZone = reactive({
  id: '',
  siteId: '',
  name: '',
  description: ''
})

const activeSite = reactive({
  id: '',
  name: '',
  description: '',
  address: ''
})

const siteSelectOptions = computed(() => {
  return cctvStore.sites.map((s) => ({
    value: s.id,
    label: `${s.name} (${s.id})`
  }))
})

// -----------------------------------------------------------------------------
// CRUD ZONE
// -----------------------------------------------------------------------------
function openCreateZoneModal() {
  zoneModalMode.value = 'create'
  activeZone.id = ''
  activeZone.siteId = (selectedSiteFilter.value !== 'ALL' ? selectedSiteFilter.value : cctvStore.sites[0]?.id) || ''
  activeZone.name = ''
  activeZone.description = ''
  zoneModalOpen.value = true
}

function handleEditZone(row) {
  zoneModalMode.value = 'edit'
  activeZone.id = row.id
  activeZone.siteId = row.siteId || ''
  activeZone.name = row.name
  activeZone.description = row.description || ''
  zoneModalOpen.value = true
}

function handleDeleteZone(row) {
  deleteType.value = 'ZONE'
  toDeleteTarget.value = row
  deleteConfirmOpen.value = true
}

async function saveZone() {
  if (!activeZone.name.trim()) {
    toast.error('Form Belum Lengkap', 'Nama zona wajib diisi.')
    return
  }
  if (!activeZone.siteId) {
    toast.error('Form Belum Lengkap', 'Silakan pilih site terlebih dahulu.')
    return
  }

  const payload = {
    siteId: activeZone.siteId,
    name: activeZone.name.trim(),
    description: activeZone.description?.trim() || null
  }

  try {
    if (zoneModalMode.value === 'create') {
      const created = await cctvStore.createZone(payload)
      toast.success('Zona Dibuat', `ID otomatis ${created.id} (${created.name}) berhasil disimpan!`)
    } else {
      await cctvStore.updateZone(activeZone.id, payload)
      toast.success('Zona Diperbarui', `Data zona ${activeZone.id} berhasil diperbarui.`)
    }
    zoneModalOpen.value = false
  } catch (err) {
    toast.error('Gagal Menyimpan Zona', err.message || 'Terjadi kesalahan')
  }
}

// -----------------------------------------------------------------------------
// CRUD SITE (Tanpa Koordinat GPS)
// -----------------------------------------------------------------------------
function openCreateSiteModal() {
  siteModalMode.value = 'create'
  activeSite.id = ''
  activeSite.name = ''
  activeSite.description = ''
  activeSite.address = ''
  siteModalOpen.value = true
}

function handleEditSite(site) {
  siteModalMode.value = 'edit'
  activeSite.id = site.id
  activeSite.name = site.name
  activeSite.description = site.description || ''
  activeSite.address = site.address || ''
  siteModalOpen.value = true
}

function handleDeleteSite(site) {
  deleteType.value = 'SITE'
  toDeleteTarget.value = site
  deleteConfirmOpen.value = true
}

async function saveSite() {
  if (!activeSite.name.trim()) {
    toast.error('Form Belum Lengkap', 'Nama site wajib diisi.')
    return
  }

  // Tanpa memasukkan titik koordinat GPS
  const payload = {
    name: activeSite.name.trim(),
    description: activeSite.description?.trim() || null,
    address: activeSite.address?.trim() || null
  }

  try {
    if (siteModalMode.value === 'create') {
      const created = await cctvStore.createSite(payload)
      toast.success('Site Dibuat', `ID otomatis ${created.id} (${created.name}) berhasil disimpan!`)
    } else {
      await cctvStore.updateSite(activeSite.id, payload)
      toast.success('Site Diperbarui', `Data site ${activeSite.id} berhasil diperbarui.`)
    }
    siteModalOpen.value = false
  } catch (err) {
    toast.error('Gagal Menyimpan Site', err.message || 'Terjadi kesalahan')
  }
}

// -----------------------------------------------------------------------------
// CONFIRM DELETE (SOFT DELETE)
// -----------------------------------------------------------------------------
async function confirmDelete() {
  deleteConfirmOpen.value = false
  if (!toDeleteTarget.value) return

  try {
    if (deleteType.value === 'ZONE') {
      await cctvStore.deleteZone(toDeleteTarget.value.id)
      if (zoneCurrentPage.value > zoneTotalPages.value) {
        zoneCurrentPage.value = Math.max(1, zoneTotalPages.value)
      }
      toast.success('Zona Dihapus', `${toDeleteTarget.value.id} berhasil diarsipkan.`)
    } else {
      await cctvStore.deleteSite(toDeleteTarget.value.id)
      if (siteCurrentPage.value > siteTotalPages.value) {
        siteCurrentPage.value = Math.max(1, siteTotalPages.value)
      }
      toast.success('Site Dihapus', `${toDeleteTarget.value.id} berhasil diarsipkan.`)
    }
  } catch (err) {
    toast.error('Gagal Menghapus', err.message || 'Terjadi kesalahan')
  }
}

onMounted(async () => {
  await Promise.all([
    cctvStore.fetchSitesAndZones(),
    cctvStore.fetchCameras()
  ])
})
</script>
