<template>
  <div class="space-y-6">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#283548]">
      <div>
        <div class="flex items-center gap-2">
          <h2 class="text-lg font-bold text-slate-100 tracking-tight">Manajemen Perangkat (Admin)</h2>
          <Badge status="ACTIVE" label="ADMIN ONLY" size="xs" />
        </div>
        <p class="text-xs text-slate-400 mt-0.5 font-mono">
          Inventaris kamera CCTV & speaker audio paging WHIP. <strong>ID perangkat (CAM-xxxx / AUD-xxxx) di-generate otomatis dan immutable.</strong>
        </p>
      </div>

      <div class="flex items-center gap-2">
        <Button variant="primary" size="sm" @click="openCreateModal('CCTV')">
          + Tambah CCTV
        </Button>
        <Button variant="secondary" size="sm" @click="openCreateModal('AUDIO')">
          + Tambah Speaker WHIP
        </Button>
      </div>
    </div>

    <!-- CCTV Devices Table (Real CRUD & Stream URL Integration) -->
    <Table
      title="Kamera CCTV"
      subtitle="Terintegrasi dengan stream gateway & pemetaan koordinat Leaflet"
      :count="cctvStore.cameras.length"
      :columns="cctvColumns"
      :data="paginatedCctvCameras"
    >
      <template #header>
        <div class="flex items-center gap-2">
          <!-- Uji Ping Sumber Kamera CCTV -->
          <button
            type="button"
            :disabled="cctvPingLoading"
            class="flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-[#151d2e] hover:bg-[#1f2b42] text-xs font-mono text-slate-300 border border-[#283548] transition-colors cursor-pointer disabled:opacity-50"
            title="Kamera CCTV di-ping otomatis setiap 10 detik. Klik untuk ping manual."
            @click="manualPingCctv"
          >
            <Radio :class="['w-3.5 h-3.5 text-blue-400', cctvPingLoading ? 'animate-spin' : 'animate-pulse']" />
            <span>{{ cctvPingLoading ? 'Ping Kamera...' : `Auto-Ping: ${cctvAvgLatency}ms` }}</span>
          </button>
          <span v-if="cctvStore.lastStatusCheckTime !== '-'" class="text-slate-500 font-mono text-[10px] hidden sm:inline">
            Update: {{ cctvStore.lastStatusCheckTime }}
          </span>
        </div>
      </template>

      <template #id="{ row }">
        <div class="flex items-center gap-1.5 font-mono">
          <span class="font-bold text-blue-400">{{ row.id }}</span>
          <span class="text-[10px] text-slate-500" title="ID dibuat otomatis oleh database (Immutable)"></span>
        </div>
      </template>

      <template #name="{ row }">
        <div>
          <span class="font-semibold text-slate-100">{{ row.name }}</span>
          <span v-if="row.description" class="block text-[11px] text-slate-400 truncate max-w-xs">
            {{ row.description }}
          </span>
        </div>
      </template>

      <template #zone="{ row }">
        <span class="text-xs font-mono text-slate-300">
          {{ row.zone?.name || row.zoneName || '-' }} <span class="text-slate-500 text-[10px]">({{ row.site?.name || row.siteName || '-' }})</span>
        </span>
      </template>

      <template #streamUrl="{ row }">
        <div class="max-w-[240px]">
          <span
            v-if="row.streamUrl"
            class="font-mono text-[11px] text-emerald-400 truncate block hover:underline cursor-pointer"
            :title="row.streamUrl"
          >
            {{ row.streamUrl }}
          </span>
          <span v-else-if="row.streamKey" class="font-mono text-[11px] text-slate-400 truncate block">
            key: {{ row.streamKey }}
          </span>
          <span v-else class="text-[10px] text-slate-600 font-mono">
            -
          </span>
        </div>
      </template>

      <template #coordinates="{ row }">
        <span v-if="row.latitude && row.longitude" class="font-mono text-[11px] text-cyan-300">
          {{ Number(row.latitude).toFixed(4) }}, {{ Number(row.longitude).toFixed(4) }}
        </span>
        <span v-else class="text-[10px] text-slate-600 font-mono">
          Tidak ada GPS
        </span>
      </template>

      <template #latency="{ row }">
        <button
          type="button"
          class="flex items-center gap-1.5 font-mono text-xs hover:underline cursor-pointer group text-left"
          :title="`Klik untuk ping manual ${row.id}`"
          @click="pingCctv(row)"
        >
          <span
            v-if="row.latencyMs"
            :class="[
              'font-semibold group-hover:text-blue-400 transition-colors',
              row.latencyMs < 100 ? 'text-emerald-400' : row.latencyMs < 300 ? 'text-amber-400' : 'text-rose-400'
            ]"
          >
            {{ row.latencyMs }} ms
          </span>
          <span v-else class="text-slate-500 text-[11px] flex items-center gap-1 group-hover:text-blue-400">
            <span class="w-1.5 h-1.5 rounded-full bg-slate-500 animate-pulse"></span>
            Mengukur...
          </span>
        </button>
      </template>

      <template #status="{ row }">
        <span
          :class="[
            'px-2 py-0.5 rounded text-[10px] font-mono font-bold inline-flex items-center gap-1.5',
            row.status === 'ONLINE'
              ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
              : row.status === 'OFFLINE'
              ? 'bg-rose-950 text-rose-300 border border-rose-900'
              : row.status === 'WARNING'
              ? 'bg-amber-950 text-amber-300 border border-amber-800'
              : 'bg-slate-800 text-slate-400 border border-slate-700'
          ]"
          :title="row.statusReason || (row.status === 'ONLINE' ? 'Sumber video CCTV aktif dan mengalirkan frame' : 'Sumber video CCTV mati / tidak aktif')"
        >
          <span
            :class="[
              'w-1.5 h-1.5 rounded-full',
              row.status === 'ONLINE'
                ? 'bg-emerald-400'
                : row.status === 'OFFLINE'
                ? 'bg-rose-400'
                : row.status === 'WARNING'
                ? 'bg-amber-400'
                : 'bg-slate-400'
            ]"
          ></span>
          {{ row.status || 'UNKNOWN' }}
        </span>
      </template>

      <template #actions="{ row }">
        <div class="flex items-center gap-1.5">
          <Button variant="ghost" size="xs" @click="handleEditCctv(row)">
            Edit
          </Button>
          <Button variant="ghost" size="xs" class="text-rose-400 hover:text-rose-300" @click="handleDeleteCctv(row)">
            Arsipkan
          </Button>
        </div>
      </template>

      <!-- Pagination 5 item per halaman -->
      <template #footer>
        <div class="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono text-slate-400">
          <div>
            <span>Menampilkan </span>
            <strong class="text-slate-200">
              {{ cctvStore.cameras.length === 0 ? 0 : (cctvPage - 1) * pageSize + 1 }} - {{ Math.min(cctvPage * pageSize, cctvStore.cameras.length) }}
            </strong>
            <span> dari </span>
            <strong class="text-slate-200">{{ cctvStore.cameras.length }}</strong>
            <span> kamera (5 item/halaman)</span>
          </div>

          <div class="flex items-center gap-1.5">
            <button
              type="button"
              :disabled="cctvPage <= 1"
              class="px-2.5 py-1 rounded bg-[#151f33] border border-[#283548] text-slate-300 hover:text-white hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              @click="cctvPage--"
            >
              &larr; Sebelumnya
            </button>

            <span class="px-2.5 py-1 text-slate-300 bg-[#0d131f] border border-[#283548] rounded font-bold">
              {{ cctvPage }} / {{ cctvTotalPages }}
            </span>

            <button
              type="button"
              :disabled="cctvPage >= cctvTotalPages"
              class="px-2.5 py-1 rounded bg-[#151f33] border border-[#283548] text-slate-300 hover:text-white hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              @click="cctvPage++"
            >
              Selanjutnya &rarr;
            </button>
          </div>
        </div>
      </template>
    </Table>

    <!-- Audio Devices Table (CRUD & Dynamic WHIP 16kHz Mono) -->
    <Table
      title="Perangkat Audio Speaker Paging (WHIP)"
      subtitle="Terintegrasi langsung dengan gateway MediaMTX (16 kHz Mono)"
      :count="audioStore.activeDevices.length"
      :columns="audioColumns"
      :data="paginatedAudioDevices"
    >
      <template #header>
        <div class="flex items-center gap-2">
          <button
            type="button"
            :disabled="audioPingLoading"
            class="flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-[#151d2e] hover:bg-[#1f2b42] text-xs font-mono text-slate-300 border border-[#283548] transition-colors cursor-pointer disabled:opacity-50"
            title="Gateway speaker di-ping otomatis setiap 10 detik. Klik untuk ping manual."
            @click="manualPingAudio"
          >
            <Radio :class="['w-3.5 h-3.5 text-blue-400', audioPingLoading ? 'animate-spin' : 'animate-pulse']" />
            <span>{{ audioPingLoading ? 'Ping...' : `Auto-Ping: ${audioAvgLatency}ms` }}</span>
          </button>
          <span v-if="lastAutoPingTime !== '-'" class="text-slate-500 font-mono text-[10px] hidden sm:inline">
            Update: {{ lastAutoPingTime }}
          </span>
        </div>
      </template>

      <template #id="{ row }">
        <div class="flex items-center gap-1.5 font-mono">
          <span class="font-bold text-purple-400">{{ row.id }}</span>
          <span class="text-[10px] text-slate-500" title="ID dibuat otomatis oleh database (Immutable)"></span>
        </div>
      </template>

      <template #whipUrl="{ row }">
        <span class="font-mono text-xs text-blue-300 truncate max-w-[200px] block" :title="row.whipUrl">
          {{ row.whipUrl }}
        </span>
      </template>

      <template #coordinates="{ row }">
        <span v-if="row.latitude && row.longitude" class="font-mono text-[11px] text-cyan-300">
          {{ Number(row.latitude).toFixed(4) }}, {{ Number(row.longitude).toFixed(4) }}
        </span>
        <span v-else class="text-[10px] text-slate-600 font-mono">
          Tidak ada GPS
        </span>
      </template>

      <template #format="{ row }">
        <span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-950/70 text-emerald-300 border border-emerald-700/60">
          16kHz Mono
        </span>
      </template>

      <template #latency="{ row }">
        <button
          type="button"
          class="flex items-center gap-1.5 font-mono text-xs hover:underline cursor-pointer group text-left"
          :title="`Klik untuk ping manual ${row.id}`"
          @click="pingSpeaker(row)"
        >
          <span
            v-if="row.latencyMs"
            :class="[
              'font-semibold group-hover:text-blue-400 transition-colors',
              row.latencyMs < 100 ? 'text-emerald-400' : row.latencyMs < 300 ? 'text-amber-400' : 'text-rose-400'
            ]"
          >
            {{ row.latencyMs }} ms
          </span>
          <span v-else class="text-slate-500 text-[11px] flex items-center gap-1 group-hover:text-blue-400">
            <span class="w-1.5 h-1.5 rounded-full bg-slate-500 animate-pulse"></span>
            Mengukur...
          </span>
        </button>
      </template>

      <template #status="{ row }">
        <span
          :class="[
            'px-2 py-0.5 rounded text-[10px] font-mono font-bold inline-flex items-center gap-1.5',
            row.status === 'ON AIR'
              ? 'bg-rose-950 text-rose-300 border border-rose-800 animate-pulse'
              : row.status === 'ONLINE'
              ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
              : row.status === 'OFFLINE'
              ? 'bg-rose-950 text-rose-300 border border-rose-900'
              : 'bg-slate-800 text-slate-400 border border-slate-700'
          ]"
        >
          <span
            :class="[
              'w-1.5 h-1.5 rounded-full',
              row.status === 'ON AIR'
                ? 'bg-rose-400 animate-ping'
                : row.status === 'ONLINE'
                ? 'bg-emerald-400'
                : row.status === 'OFFLINE'
                ? 'bg-rose-400'
                : 'bg-slate-400'
            ]"
          ></span>
          {{ row.status || 'UNKNOWN' }}
        </span>
      </template>

      <template #actions="{ row }">
        <div class="flex items-center gap-1.5">
          <Button variant="ghost" size="xs" @click="handleEditSpeaker(row)">
            Edit
          </Button>
          <Button variant="ghost" size="xs" class="text-rose-400 hover:text-rose-300" @click="handleDeleteSpeaker(row)">
            Arsipkan
          </Button>
        </div>
      </template>

      <!-- Pagination 5 item per halaman -->
      <template #footer>
        <div class="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono text-slate-400">
          <div>
            <span>Menampilkan </span>
            <strong class="text-slate-200">
              {{ audioStore.activeDevices.length === 0 ? 0 : (speakerPage - 1) * pageSize + 1 }} - {{ Math.min(speakerPage * pageSize, audioStore.activeDevices.length) }}
            </strong>
            <span> dari </span>
            <strong class="text-slate-200">{{ audioStore.activeDevices.length }}</strong>
            <span> speaker (5 item/halaman)</span>
          </div>

          <div class="flex items-center gap-1.5">
            <button
              type="button"
              :disabled="speakerPage <= 1"
              class="px-2.5 py-1 rounded bg-[#151f33] border border-[#283548] text-slate-300 hover:text-white hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              @click="speakerPage--"
            >
              &larr; Sebelumnya
            </button>

            <span class="px-2.5 py-1 text-slate-300 bg-[#0d131f] border border-[#283548] rounded font-bold">
              {{ speakerPage }} / {{ speakerTotalPages }}
            </span>

            <button
              type="button"
              :disabled="speakerPage >= speakerTotalPages"
              class="px-2.5 py-1 rounded bg-[#151f33] border border-[#283548] text-slate-300 hover:text-white hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              @click="speakerPage++"
            >
              Selanjutnya &rarr;
            </button>
          </div>
        </div>
      </template>
    </Table>

    <!-- Create/Edit Modal for CCTV (Full Form + Stream URL + GPS) -->
    <Modal
      v-model="cctvModalOpen"
      :title="modalMode === 'create' ? 'Tambah Kamera CCTV' : `Edit Kamera: ${activeCctv.id}`"
      description="ID kamera CCTV dibuat otomatis oleh sistem (CAM-xxxx) dan terkunci."
      size="lg"
    >
      <div class="space-y-4">
        <div class="p-2.5 rounded bg-[#151d2e] border border-[#283548] text-xs font-mono flex items-center justify-between">
          <span class="text-slate-400">ID Kamera (Terkunci & Immutable): </span>
          <strong class="text-blue-400 font-bold">
            {{ modalMode === 'create' ? '[AUTO GENERATE]' : activeCctv.id }}
          </strong>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input v-model="activeCctv.name" label="Nama Kamera" placeholder="Kamera Lobby Utama" required />
          <Select
            v-model="activeCctv.siteId"
            label="Lokasi Site"
            :placeholder="cctvStore.sites.length ? '-- Pilih Lokasi Site --' : '-- Belum Ada Site Terdaftar --'"
            :options="siteOptions"
            required
          />
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Select
            v-model="activeCctv.zoneId"
            label="Zona Lokasi"
            :placeholder="cctvStore.zones.length ? '-- Pilih Zona Lokasi --' : '-- Belum Ada Zona Terdaftar --'"
            :options="zoneOptions"
          />
          <Input v-model="activeCctv.description" label="Deskripsi / Area" placeholder="Menghadap pintu masuk utama" />
        </div>

        <!-- Stream URL Input -->
        <div class="p-3.5 rounded-lg bg-[#0d121e] border border-[#283548] space-y-2">
          <label class="text-xs font-semibold text-emerald-400 font-mono uppercase tracking-wide block">
            URL Stream Kamera:
          </label>

          <div class="flex gap-2">
            <input
              v-model="activeCctv.streamUrl"
              type="text"
              placeholder="https://stream.example.com/ atau rtsp://..."
              class="flex-1 bg-[#111827] border border-[#283548] rounded-md px-3 py-2 text-xs font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              required
            />
            <Button
              type="button"
              variant="secondary"
              size="xs"
              :loading="testCctvPingLoading"
              @click="testModalCctvPing"
            >
              Uji URL
            </Button>
          </div>
        </div>

        <!-- GPS Coordinates for Leaflet Map -->
        <div class="p-3 rounded-lg bg-[#111827] border border-[#283548] space-y-2">
          <div class="flex items-center justify-between">
            <span class="text-xs font-medium text-slate-300 font-mono">Koordinat GPS Peta:</span>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="text-[10px] font-mono text-slate-400 block mb-1">Latitude:</label>
              <input
                v-model.number="activeCctv.latitude"
                type="number"
                step="0.000001"
                placeholder="Contoh: -6.917464"
                class="w-full bg-[#0a0e17] border border-[#283548] rounded px-3 py-1.5 text-xs font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label class="text-[10px] font-mono text-slate-400 block mb-1">Longitude:</label>
              <input
                v-model.number="activeCctv.longitude"
                type="number"
                step="0.000001"
                placeholder="Contoh: 107.619122"
                class="w-full bg-[#0a0e17] border border-[#283548] rounded px-3 py-1.5 text-xs font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      </div>

      <template #footer="{ close }">
        <Button variant="secondary" size="sm" @click="close">Batal</Button>
        <Button variant="primary" size="sm" :loading="cctvStore.loading" @click="saveCctv">
          {{ modalMode === 'create' ? 'Daftarkan Kamera' : 'Simpan Perubahan' }}
        </Button>
      </template>
    </Modal>

    <!-- Create/Edit Modal for Audio Speaker WHIP -->
    <Modal
      v-model="speakerModalOpen"
      :title="modalMode === 'create' ? 'Tambah Speaker Audio WHIP' : `Edit Speaker: ${activeSpeaker.id}`"
      description="ID speaker di-generate otomatis oleh sistem dan tidak dapat diubah. Audio dikonfigurasi pada 16 kHz Mono."
      size="md"
    >
      <div class="space-y-3.5">
        <div class="p-2.5 rounded bg-[#151d2e] border border-[#283548] text-xs font-mono flex items-center justify-between">
          <span class="text-slate-400">ID Speaker (Terkunci & Immutable): </span>
          <strong class="text-purple-400 font-bold">
            {{ modalMode === 'create' ? '[AUTO GENERATE]' : activeSpeaker.id }}
          </strong>
        </div>

        <Input
          v-model="activeSpeaker.name"
          label="Nama Speaker Audio"
          placeholder="Speaker Koridor Timur, Horn Parkir"
          required
        />

        <div class="grid grid-cols-2 gap-3">
          <Select
            v-model="activeSpeaker.siteId"
            label="Lokasi Site"
            :placeholder="cctvStore.sites.length ? '-- Pilih Lokasi Site --' : '-- Belum Ada Site Terdaftar --'"
            :options="siteOptions"
          />
          <Select
            v-model="activeSpeaker.zoneId"
            label="Zona Paging"
            :placeholder="cctvStore.zones.length ? '-- Pilih Zona Paging --' : '-- Belum Ada Zona Terdaftar --'"
            :options="zoneOptions"
          />
        </div>

        <div>
          <label class="text-xs font-medium text-slate-300 block mb-1">Gateway WHIP Ingestion Endpoint URL:</label>
          <div class="flex gap-2">
            <input
              v-model="activeSpeaker.whipUrl"
              type="text"
              placeholder="https://stream.example.com/audio-raw/whip"
              class="flex-1 bg-[#111827] border border-[#283548] rounded-md px-3 py-2 text-xs font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              required
            />
            <Button
              type="button"
              variant="secondary"
              size="xs"
              :loading="testPingLoading"
              @click="testModalPing"
            >
              Uji URL
            </Button>
          </div>
          <span class="text-[10px] text-slate-500 font-mono mt-1 block">
            Format: HTTPS endpoint MediaMTX WHIP (RFC 9329)
          </span>
        </div>

        <div class="p-3 bg-[#0d121d] border border-[#283548] rounded-lg text-xs font-mono grid grid-cols-2 gap-3">
          <div>
            <span class="text-[10px] text-slate-500 block uppercase">Sample Rate:</span>
            <span class="text-emerald-400 font-bold">16.000 Hz (16 kHz)</span>
          </div>
          <div>
            <span class="text-[10px] text-slate-500 block uppercase">Kanal Suara:</span>
            <span class="text-emerald-400 font-bold">Mono (1 Channel)</span>
          </div>
        </div>

        <!-- GPS Coordinates for Leaflet Map -->
        <div class="p-3 bg-[#0d121d] border border-[#283548] rounded-lg space-y-2">
          <div class="flex items-center justify-between">
            <span class="text-xs font-medium text-slate-300 font-mono">Koordinat GPS Peta:</span>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="text-[10px] font-mono text-slate-400 block mb-1">Latitude:</label>
              <input
                v-model.number="activeSpeaker.latitude"
                type="number"
                step="0.000001"
                placeholder="Contoh: -6.917464"
                class="w-full bg-[#0a0e17] border border-[#283548] rounded px-3 py-1.5 text-xs font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label class="text-[10px] font-mono text-slate-400 block mb-1">Longitude:</label>
              <input
                v-model.number="activeSpeaker.longitude"
                type="number"
                step="0.000001"
                placeholder="Contoh: 107.619122"
                class="w-full bg-[#0a0e17] border border-[#283548] rounded px-3 py-1.5 text-xs font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        <div>
          <div class="flex items-center justify-between text-xs font-medium text-slate-300 mb-1">
            <label>Tingkat Volume Speaker:</label>
            <span class="font-mono text-blue-400">{{ activeSpeaker.volume }}%</span>
          </div>
          <input
            v-model="activeSpeaker.volume"
            type="range"
            min="0"
            max="100"
            class="w-full accent-blue-600 bg-[#151d2e] rounded-lg cursor-pointer"
          />
        </div>
      </div>

      <template #footer="{ close }">
        <Button variant="secondary" size="sm" @click="close">Batal</Button>
        <Button variant="primary" size="sm" @click="saveSpeaker">Simpan Speaker</Button>
      </template>
    </Modal>

    <!-- Delete Confirmation Dialog -->
    <ConfirmationDialog
      v-model="deleteConfirmOpen"
      title="Konfirmasi Arsipkan Perangkat"
      :message="`Apakah Anda yakin ingin mengarsipkan perangkat ${toDeleteDevice?.id} - ${toDeleteDevice?.name}?`"
      warning="Perangkat akan di-soft delete (isActive: false). ID tidak akan pernah digunakan kembali."
      @confirm="confirmDelete"
    />
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import { Radio } from '@lucide/vue'
import { Table, Badge, Button, Modal, Input, Select, ConfirmationDialog } from '../components/ui/index.js'
import { useToast } from '../composables/useToast.js'
import { useAudioDevicesStore } from '../stores/audioDevices.js'
import { useCctvStore } from '../stores/cctv.js'

const toast = useToast()
const audioStore = useAudioDevicesStore()
const cctvStore = useCctvStore()

const speakerModalOpen = ref(false)
const cctvModalOpen = ref(false)
const deleteConfirmOpen = ref(false)
const testPingLoading = ref(false)
const testCctvPingLoading = ref(false)
const cctvPingLoading = ref(false)
const audioPingLoading = ref(false)
const modalMode = ref('create')
const deleteType = ref('AUDIO')
const toDeleteDevice = ref(null)

// Pagination (5 item per tabel)
const pageSize = 5
const cctvPage = ref(1)
const speakerPage = ref(1)

const cctvTotalPages = computed(() => Math.ceil(cctvStore.cameras.length / pageSize) || 1)
const paginatedCctvCameras = computed(() => {
  const start = (cctvPage.value - 1) * pageSize
  return cctvStore.cameras.slice(start, start + pageSize)
})

const speakerTotalPages = computed(() => Math.ceil(audioStore.activeDevices.length / pageSize) || 1)
const paginatedAudioDevices = computed(() => {
  const start = (speakerPage.value - 1) * pageSize
  return audioStore.activeDevices.slice(start, start + pageSize)
})

// Average dynamic latencies (similar to AudioPagingView)
const cctvAvgLatency = computed(() => {
  const list = cctvStore.cameras.filter((c) => typeof c.latencyMs === 'number' && c.latencyMs > 0)
  if (!list.length) return 24
  return Math.round(list.reduce((sum, c) => sum + c.latencyMs, 0) / list.length)
})

const audioAvgLatency = computed(() => {
  const list = audioStore.activeDevices.filter((d) => typeof d.latencyMs === 'number' && d.latencyMs > 0)
  if (!list.length) return 24
  return Math.round(list.reduce((sum, d) => sum + d.latencyMs, 0) / list.length)
})

// Auto-Ping System (Periodik per 10 detik & Manual Ping on Demand)
const isAutoPinging = ref(false)
const lastAutoPingTime = ref('-')
let autoPingTimer = null

async function runAutoPing() {
  if (isAutoPinging.value || cctvPingLoading.value || audioPingLoading.value) return
  isAutoPinging.value = true

  try {
    const cctvPings = cctvStore.cameras.map((c) => cctvStore.pingCamera(c.id))
    const audioPings = audioStore.activeDevices.map((d) => audioStore.pingDevice(d.id))
    await Promise.allSettled([...cctvPings, ...audioPings])
    lastAutoPingTime.value = new Date().toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  } catch (err) {
    console.warn('Auto ping cycle error:', err)
  } finally {
    isAutoPinging.value = false
  }
}

async function manualPingCctv() {
  if (cctvPingLoading.value) return
  cctvPingLoading.value = true
  try {
    await cctvStore.checkCameraStatus()
    lastAutoPingTime.value = cctvStore.lastStatusCheckTime
    const onlineCount = cctvStore.cameras.filter((c) => c.status === 'ONLINE').length
    toast.success(
      'Ping Kamera Selesai',
      `${onlineCount}/${cctvStore.cameras.length} kamera aktif (${cctvAvgLatency.value} ms)`
    )
  } catch (err) {
    toast.error('Ping Gagal', err.message || 'Pemeriksaan kamera gagal')
  } finally {
    cctvPingLoading.value = false
  }
}

async function manualPingAudio() {
  if (audioPingLoading.value) return
  audioPingLoading.value = true
  try {
    const pings = audioStore.activeDevices.map((d) => audioStore.pingDevice(d.id))
    await Promise.allSettled(pings)
    lastAutoPingTime.value = new Date().toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
    const onlineCount = audioStore.activeDevices.filter((d) => d.status === 'ONLINE' || d.status === 'ON AIR').length
    toast.success(
      'Ping Audio Selesai',
      `${onlineCount}/${audioStore.activeDevices.length} speaker responsif (${audioAvgLatency.value} ms)`
    )
  } catch (err) {
    toast.error('Ping Gagal', err.message || 'Koneksi audio gagal')
  } finally {
    audioPingLoading.value = false
  }
}

const activeSpeaker = reactive({
  id: '',
  name: '',
  siteId: '',
  zoneId: '',
  whipUrl: '',
  latitude: null,
  longitude: null,
  sampleRate: 16000,
  channels: 1,
  volume: 80
})

const activeCctv = reactive({
  id: '',
  name: '',
  siteId: '',
  zoneId: '',
  streamUrl: '',
  latitude: null,
  longitude: null,
  description: ''
})

const siteOptions = computed(() => {
  return cctvStore.sites.map((s) => ({
    value: s.id,
    label: `${s.id} - ${s.name}`
  }))
})

const zoneOptions = computed(() => {
  return cctvStore.zones.map((z) => ({
    value: z.id,
    label: `${z.id} - ${z.name}`
  }))
})

const cctvColumns = [
  { key: 'id', label: 'ID Kamera', width: 'w-32' },
  { key: 'name', label: 'Nama Kamera' },
  { key: 'zone', label: 'Zona & Site' },
  { key: 'streamUrl', label: 'URL Stream Video' },
  { key: 'coordinates', label: 'Koordinat GPS', width: 'w-36' },
  { key: 'latency', label: 'Latensi Ping', width: 'w-28' },
  { key: 'status', label: 'Status Kamera', width: 'w-28' },
  { key: 'actions', label: 'Aksi', align: 'right', width: 'w-28' }
]

const audioColumns = [
  { key: 'id', label: 'ID Speaker', width: 'w-32' },
  { key: 'name', label: 'Nama Speaker' },
  { key: 'zoneName', label: 'Zona Lokasi' },
  { key: 'whipUrl', label: 'WHIP Ingestion URL' },
  { key: 'coordinates', label: 'Koordinat GPS', width: 'w-36' },
  { key: 'format', label: 'Format Audio', width: 'w-28' },
  { key: 'latency', label: 'Latensi', width: 'w-28' },
  { key: 'status', label: 'Status Dinamis', width: 'w-28' },
  { key: 'actions', label: 'Aksi', align: 'right', width: 'w-28' }
]

function openCreateModal(type) {
  modalMode.value = 'create'
  if (type === 'AUDIO') {
    activeSpeaker.id = ''
    activeSpeaker.name = ''
    activeSpeaker.siteId = cctvStore.sites[0]?.id || ''
    activeSpeaker.zoneId = cctvStore.zones[0]?.id || ''
    activeSpeaker.whipUrl = ''
    activeSpeaker.latitude = null
    activeSpeaker.longitude = null
    activeSpeaker.volume = 80
    speakerModalOpen.value = true
  } else {
    activeCctv.id = ''
    activeCctv.name = ''
    activeCctv.siteId = cctvStore.sites[0]?.id || ''
    activeCctv.zoneId = cctvStore.zones[0]?.id || ''
    activeCctv.streamUrl = ''
    activeCctv.latitude = null
    activeCctv.longitude = null
    activeCctv.description = ''
    cctvModalOpen.value = true
  }
}

function handleEditCctv(row) {
  modalMode.value = 'edit'
  activeCctv.id = row.id
  activeCctv.name = row.name
  activeCctv.siteId = row.siteId || ''
  activeCctv.zoneId = row.zoneId || ''
  activeCctv.streamUrl = row.streamUrl || ''
  activeCctv.latitude = row.latitude ? Number(row.latitude) : null
  activeCctv.longitude = row.longitude ? Number(row.longitude) : null
  activeCctv.description = row.description || ''
  cctvModalOpen.value = true
}

function handleDeleteCctv(row) {
  deleteType.value = 'CCTV'
  toDeleteDevice.value = row
  deleteConfirmOpen.value = true
}

async function pingCctv(row) {
  const result = await cctvStore.pingCamera(row.id)
  if (result.success) {
    toast.success('Stream CCTV Aktif', `Sumber video ${row.id} aktif (${result.latency || 0} ms)`)
  } else {
    toast.error('Stream CCTV Terputus', `Sumber video ${row.id} tidak aktif: ${result.reason || result.error}`)
  }
}

async function testModalCctvPing() {
  if (!activeCctv.streamUrl) {
    toast.error('Error', 'Masukkan URL stream terlebih dahulu.')
    return
  }
  testCctvPingLoading.value = true
  const res = await cctvStore.testStreamUrl(activeCctv.streamUrl)
  testCctvPingLoading.value = false
  if (res.success) {
    toast.success('Koneksi Valid', res.message)
  } else {
    toast.warning('Peringatan', res.message)
  }
}

async function saveCctv() {
  if (!activeCctv.name.trim()) {
    toast.error('Form Belum Lengkap', 'Nama kamera wajib diisi.')
    return
  }

  const payload = {
    name: activeCctv.name.trim(),
    siteId: activeCctv.siteId,
    zoneId: activeCctv.zoneId || null,
    streamUrl: activeCctv.streamUrl?.trim() || null,
    latitude: activeCctv.latitude !== null && activeCctv.latitude !== '' ? Number(activeCctv.latitude) : null,
    longitude: activeCctv.longitude !== null && activeCctv.longitude !== '' ? Number(activeCctv.longitude) : null,
    description: activeCctv.description?.trim() || null
  }

  try {
    if (modalMode.value === 'create') {
      const created = await cctvStore.createCamera(payload)
      toast.success('Kamera Didaftarkan', `ID otomatis ${created.id} berhasil dibuat dan disimpan!`)
    } else {
      await cctvStore.updateCamera(activeCctv.id, payload)
      toast.success('Kamera Diperbarui', `Data kamera ${activeCctv.id} berhasil diperbarui. ID tetap terkunci.`)
    }
    cctvModalOpen.value = false
  } catch (err) {
    toast.error('Gagal Menyimpan', err.message || 'Terjadi kesalahan')
  }
}

function handleEditSpeaker(row) {
  modalMode.value = 'edit'
  activeSpeaker.id = row.id
  activeSpeaker.name = row.name
  activeSpeaker.siteId = row.siteId
  activeSpeaker.zoneId = row.zoneId
  activeSpeaker.whipUrl = row.whipUrl
  activeSpeaker.latitude = row.latitude ? Number(row.latitude) : null
  activeSpeaker.longitude = row.longitude ? Number(row.longitude) : null
  activeSpeaker.volume = row.volume || 80
  speakerModalOpen.value = true
}

function handleDeleteSpeaker(row) {
  deleteType.value = 'AUDIO'
  toDeleteDevice.value = row
  deleteConfirmOpen.value = true
}

async function pingSpeaker(row) {
  const result = await audioStore.pingDevice(row.id)
  if (result.success) {
    toast.success('Gateway Responsif', `${row.id} online dengan latensi ${result.latency} ms`)
  } else {
    toast.error('Ping Gagal', `Server ${row.whipUrl} tidak merespons`)
  }
}

async function testModalPing() {
  if (!activeSpeaker.whipUrl) {
    toast.error('Error', 'Masukkan URL WHIP terlebih dahulu.')
    return
  }
  testPingLoading.value = true
  const start = performance.now()
  try {
    const res = await fetch(activeSpeaker.whipUrl, { method: 'OPTIONS' })
    const lat = Math.round(performance.now() - start)
    testPingLoading.value = false
    if (res.ok || res.status === 204) {
      toast.success('Koneksi Valid', `Gateway MediaMTX aktif (${lat} ms)`)
    } else {
      toast.warning('Peringatan', `Server merespons kode status ${res.status}`)
    }
  } catch (e) {
    testPingLoading.value = false
    toast.error('Gagal', 'Tidak dapat menjangkau server WHIP.')
  }
}

function saveSpeaker() {
  if (!activeSpeaker.name.trim()) {
    toast.error('Form Belum Lengkap', 'Nama speaker wajib diisi.')
    return
  }
  if (!activeSpeaker.whipUrl.trim()) {
    toast.error('Form Belum Lengkap', 'URL WHIP wajib diisi.')
    return
  }

  speakerModalOpen.value = false

  if (modalMode.value === 'create') {
    const created = audioStore.createDevice({
      name: activeSpeaker.name,
      siteId: activeSpeaker.siteId,
      zoneId: activeSpeaker.zoneId,
      whipUrl: activeSpeaker.whipUrl,
      latitude: activeSpeaker.latitude !== null && activeSpeaker.latitude !== '' ? Number(activeSpeaker.latitude) : null,
      longitude: activeSpeaker.longitude !== null && activeSpeaker.longitude !== '' ? Number(activeSpeaker.longitude) : null,
      volume: activeSpeaker.volume
    })
    toast.success('Speaker Didaftarkan', `ID otomatis ${created.id} (16kHz Mono) berhasil dibuat!`)
  } else {
    audioStore.updateDevice(activeSpeaker.id, {
      name: activeSpeaker.name,
      siteId: activeSpeaker.siteId,
      zoneId: activeSpeaker.zoneId,
      whipUrl: activeSpeaker.whipUrl,
      latitude: activeSpeaker.latitude !== null && activeSpeaker.latitude !== '' ? Number(activeSpeaker.latitude) : null,
      longitude: activeSpeaker.longitude !== null && activeSpeaker.longitude !== '' ? Number(activeSpeaker.longitude) : null,
      volume: activeSpeaker.volume
    })
    toast.success('Speaker Diperbarui', `Data ${activeSpeaker.id} berhasil diperbarui. ID tetap terkunci.`)
  }
}

async function confirmDelete() {
  deleteConfirmOpen.value = false
  if (!toDeleteDevice.value) return

  try {
    if (deleteType.value === 'AUDIO') {
      audioStore.deleteDevice(toDeleteDevice.value.id)
      if (speakerPage.value > speakerTotalPages.value) {
        speakerPage.value = Math.max(1, speakerTotalPages.value)
      }
      toast.success('Speaker Diarsipkan', `${toDeleteDevice.value.id} berhasil diarsipkan (soft delete).`)
    } else {
      await cctvStore.deleteCamera(toDeleteDevice.value.id)
      if (cctvPage.value > cctvTotalPages.value) {
        cctvPage.value = Math.max(1, cctvTotalPages.value)
      }
      toast.success('Kamera Diarsipkan', `${toDeleteDevice.value.id} berhasil diarsipkan.`)
    }
  } catch (err) {
    toast.error('Gagal Mengarsipkan', err.message || 'Terjadi kesalahan')
  }
}

onMounted(async () => {
  await Promise.all([
    cctvStore.fetchCameras(),
    cctvStore.fetchSitesAndZones()
  ])
  // Polling status kamera 1 detik via MediaMTX API
  cctvStore.startCameraStatusPolling(1000)
  // Auto-ping pertama kali setelah data termuat untuk audio
  runAutoPing()
  // Jalankan auto-ping audio periodik
  autoPingTimer = setInterval(runAutoPing, 10000)
})

onUnmounted(() => {
  if (autoPingTimer) {
    clearInterval(autoPingTimer)
    autoPingTimer = null
  }
  cctvStore.stopCameraStatusPolling()
})
</script>
