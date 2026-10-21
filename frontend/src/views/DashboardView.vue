<template>
  <div class="space-y-6">
    <!-- Top Welcome Bar -->
    <div class="pb-2 border-b border-[#283548]">
      <h2 class="text-lg font-bold text-slate-100 tracking-tight">
        Ringkasan Operasi Monitoring
      </h2>
      <p class="text-xs text-slate-400 mt-0.5 font-mono">
        Data real-time status perangkat CCTV, speaker audio, dan alarm insiden langsung dari database PostgreSQL.
      </p>
    </div>

    <!-- 4 Key Monitoring Metric Cards (Super Minimalist & Elegant) -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
      <!-- Card 1: CCTV Cameras -->
      <div class="p-3.5 rounded-xl bg-[#0d121d] border border-[#232f42] hover:border-blue-500/40 transition-colors group">
        <div class="flex items-center justify-between">
          <span class="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-medium">CCTV Cameras</span>
          <Video class="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-400 transition-colors" />
        </div>
        <div class="mt-2 flex items-baseline gap-1.5">
          <span class="text-2xl font-bold font-mono text-slate-100 tracking-tight">{{ stats.cctv.total }}</span>
          <span class="text-[11px] text-slate-500 font-mono">unit</span>
        </div>
        <div class="mt-2.5 flex items-center gap-3 text-[11px] font-mono">
          <span class="flex items-center gap-1.5 text-emerald-400" title="Online">
            <span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            {{ stats.cctv.online }}
          </span>
          <span class="flex items-center gap-1.5 text-rose-400" title="Offline">
            <span class="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
            {{ stats.cctv.offline }}
          </span>
          <span v-if="stats.cctv.unknown" class="flex items-center gap-1.5 text-slate-400" title="Unknown / Belum diperiksa">
            <span class="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
            {{ stats.cctv.unknown }}
          </span>
        </div>
      </div>

      <!-- Card 2: Audio Speakers -->
      <div class="p-3.5 rounded-xl bg-[#0d121d] border border-[#232f42] hover:border-purple-500/40 transition-colors group">
        <div class="flex items-center justify-between">
          <span class="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-medium">Audio Speakers</span>
          <Volume2 class="w-3.5 h-3.5 text-slate-400 group-hover:text-purple-400 transition-colors" />
        </div>
        <div class="mt-2 flex items-baseline gap-1.5">
          <span class="text-2xl font-bold font-mono text-slate-100 tracking-tight">{{ stats.audio.total }}</span>
          <span class="text-[11px] text-slate-500 font-mono">unit</span>
        </div>
        <div class="mt-2.5 flex items-center gap-3 text-[11px] font-mono">
          <span class="flex items-center gap-1.5 text-emerald-400" title="Online">
            <span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            {{ stats.audio.online }}
          </span>
          <span class="flex items-center gap-1.5 text-rose-400" title="Offline">
            <span class="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
            {{ stats.audio.offline }}
          </span>
          <span v-if="stats.audio.unknown" class="flex items-center gap-1.5 text-slate-400" title="Unknown / Belum diperiksa">
            <span class="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
            {{ stats.audio.unknown }}
          </span>
        </div>
      </div>

      <!-- Card 3: Alarm & Insiden -->
      <div class="p-3.5 rounded-xl bg-[#0d121d] border border-[#232f42] hover:border-rose-500/40 transition-colors group">
        <div class="flex items-center justify-between">
          <span class="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-medium">Alarm & Insiden</span>
          <AlertTriangle class="w-3.5 h-3.5 text-slate-400 group-hover:text-rose-400 transition-colors" />
        </div>
        <div class="mt-2 flex items-baseline gap-1.5">
          <span class="text-2xl font-bold font-mono text-slate-100 tracking-tight">{{ eventsStore.stats.offlineActiveCount }}</span>
          <span class="text-[11px] text-slate-500 font-mono">aktif</span>
        </div>
        <div class="mt-2.5 flex items-center gap-3 text-[11px] font-mono">
          <span class="flex items-center gap-1.5 text-rose-400">
            <span class="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
            {{ eventsStore.stats.offlineActiveCount }} kritis
          </span>
          <span class="flex items-center gap-1.5 text-emerald-400">
            <span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            {{ eventsStore.stats.resolvedCount }} pulih
          </span>
        </div>
      </div>

      <!-- Card 4: Lokasi & Zona -->
      <div class="p-3.5 rounded-xl bg-[#0d121d] border border-[#232f42] hover:border-amber-500/40 transition-colors group">
        <div class="flex items-center justify-between">
          <span class="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-medium">Lokasi & Zona</span>
          <MapPin class="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-400 transition-colors" />
        </div>
        <div class="mt-2 flex items-baseline gap-1.5">
          <span class="text-2xl font-bold font-mono text-slate-100 tracking-tight">{{ cctvStore.sites.length }}</span>
          <span class="text-[11px] text-slate-500 font-mono">site</span>
        </div>
        <div class="mt-2.5 flex items-center gap-3 text-[11px] font-mono">
          <span class="flex items-center gap-1.5 text-slate-300">
            <span class="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
            {{ cctvStore.zones.length }} zona
          </span>
        </div>
      </div>
    </div>

    <!-- Center Section: Device Map (Left 7 cols) & Device Management Overview (Right 5 cols) -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <!-- Device Location Map  -->
      <div class="lg:col-span-7">
        <Card
          title="Peta Lokasi Perangkat "
          subtitle="Pemantauan live streaming CCTV terintegrasi dengan pemetaan geospasial Leaflet OpenStreetMap."
        >
          <template #actions>
            <span class="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/70 border border-emerald-800 text-emerald-300">
              Leaflet Engine
            </span>
          </template>
          <div class="h-80 w-full">
            <DeviceMap :devices="displayedMapDevices" />
          </div>
          <template #footer>
            <div class="flex items-center justify-between w-full text-[11px] font-mono text-slate-400">
              <span>{{ displayedMapDevices.length }} Perangkat Berkoordinat Valid</span>
              <router-link to="/cctv" class="text-blue-400 hover:underline">
                Buka Semua Kamera →
              </router-link>
            </div>
          </template>
        </Card>
      </div>

      <!-- Device Management Section (Replacing System Services) -->
      <div class="lg:col-span-5 space-y-4">
        <Card title="Inventaris Perangkat" subtitle="Status operasional kamera CCTV & audio paging">
          <div class="flex items-center gap-1 mb-3 bg-[#111827] p-1 rounded-lg border border-[#283548] text-xs font-mono">
            <button
              type="button"
              :class="[
                'flex-1 py-1 px-2 rounded font-semibold text-center transition-colors cursor-pointer',
                deviceFilter === 'ALL' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
              ]"
              @click="deviceFilter = 'ALL'"
            >
              Semua ({{ totalDevicesCount }})
            </button>
            <button
              type="button"
              :class="[
                'flex-1 py-1 px-2 rounded font-semibold text-center transition-colors cursor-pointer',
                deviceFilter === 'CCTV' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
              ]"
              @click="deviceFilter = 'CCTV'"
            >
              CCTV ({{ cctvStore.activeCameras.length }})
            </button>
            <button
              type="button"
              :class="[
                'flex-1 py-1 px-2 rounded font-semibold text-center transition-colors cursor-pointer',
                deviceFilter === 'AUDIO' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
              ]"
              @click="deviceFilter = 'AUDIO'"
            >
              Speaker ({{ audioStore.activeDevices.length }})
            </button>
          </div>

          <!-- Device List (Scrollable) -->
          <div class="space-y-2 max-h-[220px] overflow-y-auto pr-0.5 font-mono">
            <div
              v-if="allManagedDevices.length === 0"
              class="p-4 text-center text-slate-500 text-xs"
            >
              Belum ada perangkat dalam kategori ini.
            </div>

            <div
              v-for="dev in allManagedDevices"
              :key="dev.id"
              class="p-2.5 rounded-lg bg-[#151d2e] border border-[#283548] flex items-center justify-between hover:border-slate-600 transition-colors"
            >
              <div class="flex items-center gap-2.5 truncate">
                <div
                  :class="[
                    'w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border',
                    dev.type === 'CCTV'
                      ? 'bg-blue-950/70 border-blue-800 text-blue-400'
                      : 'bg-purple-950/70 border-purple-800 text-purple-400'
                  ]"
                >
                  <Video v-if="dev.type === 'CCTV'" class="w-4 h-4" />
                  <Volume2 v-else class="w-4 h-4" />
                </div>
                <div class="truncate">
                  <div class="flex items-center gap-1.5">
                    <span class="font-bold text-xs text-slate-200">{{ dev.id }}</span>
                    <span class="text-[10px] text-slate-400 font-sans truncate">({{ dev.name }})</span>
                  </div>
                  <div class="text-[10px] text-slate-400 flex items-center gap-1 truncate mt-0.5">
                    <MapPin class="w-3 h-3 text-slate-500 shrink-0" />
                    <span>{{ [dev.siteName, dev.zoneName].filter(Boolean).join(' • ') }}</span>
                  </div>
                </div>
              </div>

              <div class="flex items-center gap-2 shrink-0">
                <span v-if="dev.latencyMs" class="text-[10px] text-slate-400 hidden sm:inline">
                  {{ dev.latencyMs }}ms
                </span>
                <Badge
                  :status="dev.status"
                  :label="dev.status"
                  size="xs"
                />
              </div>
            </div>
          </div>

          <template #footer>
            <div class="flex items-center justify-between text-[11px] font-mono text-slate-400 w-full">
              <span>Inventaris: {{ cctvStore.activeCameras.length }} CCTV • {{ audioStore.activeDevices.length }} Audio</span>
              <router-link to="/devices" class="text-blue-400 hover:underline">
                Kelola Perangkat →
              </router-link>
            </div>
          </template>
        </Card>

        <!-- Audio Paging Console (Minimalist Sidebar-Matched Design) -->
        <div class="p-4 rounded-xl bg-[#0d121d] border border-[#283548] shadow-md space-y-3">
          <!-- Header Bar -->
          <div class="flex items-center justify-between pb-2 border-b border-[#1e293b]">
            <div class="flex items-center gap-2">
              <div class="w-7 h-7 rounded-lg bg-blue-600/15 border border-blue-500/30 flex items-center justify-center text-blue-400">
                <Volume2 class="w-4 h-4" />
              </div>
              <div>
                <h4 class="text-xs font-bold text-slate-100 font-mono tracking-tight">
                  Audio Paging Console
                </h4>
                <p class="text-[11px] text-slate-400">
                  Push-to-Talk mikrofon (16 kHz Mono)
                </p>
              </div>
            </div>

            <!-- Dynamic Status Badge -->
            <span
              v-if="isPagingTransmitting"
              class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-950/90 text-rose-300 border border-rose-600 shadow-xs animate-pulse"
            >
              <span class="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping"></span>
              ON AIR: {{ pagingDuration }}
            </span>
          </div>

          <!-- Selection & PTT Trigger Row -->
          <div class="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
            <div class="sm:col-span-7">
              <label class="block text-[10px] font-mono text-slate-400 mb-1 uppercase">
                Pilih Target Speaker / Zona:
              </label>
              <select
                v-model="pagingTarget"
                :disabled="isPagingTransmitting"
                class="w-full bg-[#111827] border border-[#283548] rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer disabled:opacity-60"
              >
                <option v-for="opt in pagingTargetOptions" :key="opt.value" :value="opt.value">
                  {{ opt.label }}
                </option>
              </select>
            </div>

            <div class="sm:col-span-5 flex items-end">
              <button
                type="button"
                :disabled="whipAudio.publishState.value === 'connecting' || whipAudio.publishState.value === 'requesting_mic'"
                :class="[
                  'w-full py-1.5 px-3 rounded-lg text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition-all select-none shadow-md cursor-pointer active:scale-95',
                  isPagingTransmitting
                    ? 'bg-rose-600 hover:bg-rose-500 text-white border border-rose-400 shadow-glow-offline animate-pulse ring-2 ring-rose-400/60'
                    : whipAudio.publishState.value === 'connecting'
                    ? 'bg-amber-600 text-white border border-amber-400 animate-pulse'
                    : 'bg-blue-600 hover:bg-blue-500 text-white border border-blue-400/60 shadow-glow-online hover:scale-[1.01]'
                ]"
                @click="toggleAudioPaging"
              >
                <Radio v-if="isPagingTransmitting" class="w-3.5 h-3.5 animate-bounce" />
                <Activity v-else-if="whipAudio.publishState.value === 'connecting'" class="w-3.5 h-3.5 animate-spin" />
                <Mic v-else class="w-3.5 h-3.5" />
                <span>
                  {{
                    isPagingTransmitting
                      ? 'Selesai Bicara'
                      : whipAudio.publishState.value === 'connecting'
                      ? 'Menghubungkan...'
                      : 'Mulai Siaran'
                  }}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Bottom Section: Latest Events & Alarms Table (Real Database Data) -->
    <Card title="Alarm & Insiden Terbaru" subtitle="Monitoring real-time perangkat OFFLINE dan riwayat pemulihan (RESOLVED)">
      <template #actions>
        <router-link to="/events">
          <Button variant="ghost" size="xs">
            Lihat Histori Lengkap ({{ eventsStore.pagination.total }} Insiden) →
          </Button>
        </router-link>
      </template>

      <Table
        :columns="eventColumns"
        :data="recentEvents"
        :loading="eventsStore.loading"
      >
        <!-- Slot ID -->
        <template #id="{ row }">
          <span class="font-mono text-xs font-semibold text-slate-400">#{{ row.id }}</span>
        </template>

        <!-- Slot Waktu Kejadian -->
        <template #occurredAt="{ row }">
          <div class="font-mono text-xs text-slate-300">
            <span class="block text-slate-200 font-medium">{{ formatDateTime(row.occurredAt).date }}</span>
            <span class="block text-[10px] text-slate-400">{{ formatDateTime(row.occurredAt).time }} WIB</span>
          </div>
        </template>

        <!-- Slot Status (OFFLINE vs RESOLVED vs UNKNOWN) -->
        <template #status="{ row }">
          <div class="flex items-center gap-1.5">
            <span
              v-if="row.status === 'OFFLINE'"
              class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-rose-950/70 text-rose-300 border border-rose-600/60"
            >
              <span class="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse"></span>
              OFFLINE
            </span>
            <span
              v-else-if="row.status === 'RESOLVED'"
              class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-950/70 text-emerald-300 border border-emerald-600/60"
            >
              <CheckCircle2 class="w-3 h-3 text-emerald-400" />
              RESOLVED
            </span>
            <span
              v-else
              class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-800/80 text-slate-400 border border-slate-700/60"
            >
              <span class="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
              {{ row.status || 'UNKNOWN' }}
            </span>
          </div>
        </template>

        <!-- Slot Judul & Pesan Insiden -->
        <template #title="{ row }">
          <div class="min-w-[180px]">
            <span class="text-xs font-semibold text-slate-100 block truncate max-w-[320px]" :title="row.title">
              {{ row.title }}
            </span>
            <span v-if="row.message" class="text-[10px] text-slate-400 block truncate max-w-[320px]" :title="row.message">
              {{ row.message }}
            </span>
          </div>
        </template>

        <!-- Slot Perangkat -->
        <template #device="{ row }">
          <div class="font-mono text-xs space-y-0.5">
            <div v-if="row.targetDevice" class="flex items-center gap-1.5">
              <Video v-if="row.targetDevice.type === 'camera'" class="w-3 h-3 text-blue-400 shrink-0" />
              <Volume2 v-else class="w-3 h-3 text-purple-400 shrink-0" />
              <span class="font-bold text-slate-200">{{ row.targetDevice.id }}</span>
            </div>
            <span v-else-if="row.cameraId || row.audioDeviceId" class="font-bold text-slate-200">
              {{ row.cameraId || row.audioDeviceId }}
            </span>
            <span v-else class="text-slate-500">-</span>
            <span v-if="row.targetDevice?.name" class="text-[10px] text-slate-400 block truncate max-w-[140px]">
              {{ row.targetDevice.name }}
            </span>
          </div>
        </template>

        <!-- Slot Aksi -->
        <template #actions="{ row }">
          <div class="flex items-center justify-end gap-1.5">
            <Button
              v-if="row.status === 'OFFLINE'"
              variant="primary"
              size="xs"
              class="bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] py-0.5 px-2"
              @click="openResolveModal(row)"
            >
              <CheckSquare class="w-3 h-3 mr-1" />
              Resolve
            </Button>
            <Button
              variant="ghost"
              size="xs"
              class="text-blue-400 hover:text-blue-300"
              @click="openInspectDrawer(row)"
            >
              <Eye class="w-3 h-3 mr-1" />
              Detail
            </Button>
          </div>
        </template>
      </Table>
    </Card>

    <!-- ===================================================================== -->
    <!-- DRAWER: DETAIL INSIDEN                                                -->
    <!-- ===================================================================== -->
    <Drawer
      v-model="inspectDrawerOpen"
      :title="`Detail Insiden #${inspectedEvent?.id || ''}`"
      :subtitle="`Waktu: ${inspectedEvent ? formatDateTime(inspectedEvent.occurredAt).full : ''}`"
      size="md"
    >
      <div v-if="inspectedEvent" class="space-y-4 font-mono text-xs">
        <div class="p-3 rounded-lg bg-[#0d131f] border border-[#283548] flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="text-slate-400">Status:</span>
            <Badge :status="inspectedEvent.status" :label="inspectedEvent.status" size="xs" />
          </div>
          <div class="text-[10px] text-slate-400">
            ID: <strong class="text-slate-200">#{{ inspectedEvent.id }}</strong>
          </div>
        </div>

        <div class="p-3.5 rounded-lg bg-[#0d131f] border border-[#283548] space-y-2">
          <span class="text-[10px] text-slate-400 font-bold uppercase tracking-wider block border-b border-[#1e2a3b] pb-1">
            Informasi Insiden
          </span>
          <div class="grid grid-cols-3 gap-1.5">
            <span class="text-slate-500">Judul:</span>
            <span class="col-span-2 text-slate-100 font-bold">{{ inspectedEvent.title }}</span>

            <span class="text-slate-500">Waktu:</span>
            <span class="col-span-2 text-slate-300">{{ formatDateTime(inspectedEvent.occurredAt).full }}</span>

            <span class="text-slate-500">Pesan:</span>
            <span class="col-span-2 text-slate-300 break-words">{{ inspectedEvent.message || '-' }}</span>

            <span class="text-slate-500">Perangkat:</span>
            <span class="col-span-2 text-blue-400 font-bold">
              {{ inspectedEvent.targetDevice?.id || inspectedEvent.cameraId || inspectedEvent.audioDeviceId || '-' }}
              <span v-if="inspectedEvent.targetDevice?.name" class="text-slate-300 font-normal">
                ({{ inspectedEvent.targetDevice.name }})
              </span>
            </span>
          </div>
        </div>

        <div v-if="inspectedEvent.status === 'RESOLVED'" class="p-3.5 rounded-lg bg-[#0d131f] border border-[#283548] space-y-1.5">
          <span class="text-[10px] text-emerald-400 font-bold uppercase tracking-wider block border-b border-[#1e2a3b] pb-1">
            Riwayat Pemulihan
          </span>
          <p class="text-slate-300 italic">{{ inspectedEvent.resolutionNote || 'Perangkat pulih otomatis kembali ONLINE' }}</p>
          <span class="text-[10px] text-slate-500 block">
            Diselesaikan: {{ inspectedEvent.resolvedAt ? formatDateTime(inspectedEvent.resolvedAt).full : '-' }}
          </span>
        </div>
      </div>

      <template #footer="{ close }">
        <Button variant="secondary" size="sm" @click="close">Tutup</Button>
      </template>
    </Drawer>

    <!-- ===================================================================== -->
    <!-- MODAL: RESOLUSI ALARM                                                 -->
    <!-- ===================================================================== -->
    <Modal
      v-model="resolveModalOpen"
      :title="`Selesaikan Alarm #${toResolveEvent?.id || ''}`"
      description="Tandai insiden perangkat telah tertangani dan simpan catatan ke database."
      size="md"
    >
      <div v-if="toResolveEvent" class="space-y-3 font-mono text-xs">
        <div class="p-2.5 rounded bg-[#151d2e] border border-[#283548]">
          <span class="text-slate-400 block text-[10px] uppercase">Insiden:</span>
          <strong class="text-slate-100 text-xs block mt-0.5">{{ toResolveEvent.title }}</strong>
        </div>

        <div>
          <label class="text-xs font-medium text-slate-300 block mb-1 font-sans">
            Catatan Perbaikan / Resolusi <span class="text-rose-400">*</span>
          </label>
          <textarea
            v-model="resolutionNote"
            rows="3"
            placeholder="Contoh: Kabel jaringan telah tersambung kembali, koneksi kamera normal."
            class="w-full bg-[#111827] border border-[#283548] rounded px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 font-sans"
          ></textarea>
        </div>
      </div>

      <template #footer="{ close }">
        <Button variant="secondary" size="sm" @click="close">Batal</Button>
        <Button
          variant="primary"
          size="sm"
          class="bg-emerald-600 hover:bg-emerald-500 text-white"
          :loading="eventsStore.actionLoading"
          @click="confirmResolveEvent"
        >
          Konfirmasi Selesai (Resolve)
        </Button>
      </template>
    </Modal>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import {
  Button,
  Card,
  Badge,
  Table,
  Modal,
  Drawer
} from '../components/ui/index.js'
import DeviceMap from '../components/maps/DeviceMap.vue'
import { useToast } from '../composables/useToast.js'
import { useWhipAudio } from '../composables/useWhipAudio.js'
import {
  Video,
  Volume2,
  AlertTriangle,
  MapPin,
  Eye,
  CheckSquare,
  CheckCircle2,
  Radio,
  Mic,
  Activity
} from '@lucide/vue'

import { useCctvStore } from '../stores/cctv.js'
import { useAudioDevicesStore } from '../stores/audioDevices.js'
import { useEventsStore } from '../stores/events.js'

const toast = useToast()
const whipAudio = useWhipAudio()
const cctvStore = useCctvStore()
const audioStore = useAudioDevicesStore()
const eventsStore = useEventsStore()

const loading = ref(false)
const deviceFilter = ref('ALL') // 'ALL' | 'CCTV' | 'AUDIO'

// Audio Paging Console State (Minimalist)
const pagingTarget = ref('ALL')
const isPagingTransmitting = computed(() => whipAudio.isPublishing.value)

const pagingDuration = computed(() => {
  const sec = whipAudio.durationSeconds.value
  const mins = Math.floor(sec / 60).toString().padStart(2, '0')
  const secs = (sec % 60).toString().padStart(2, '0')
  return `${mins}:${secs}`
})

const pagingTargetOptions = computed(() => {
  const options = [
    { value: 'ALL', label: '📢 Semua Speaker (Broadcast Global)' }
  ]

  // Dynamic Zones from CCTV Store
  if (cctvStore.zones && cctvStore.zones.length > 0) {
    cctvStore.zones.forEach((z) => {
      options.push({
        value: `ZONE_${z.id || z.code || z.name}`,
        label: `🏢 Zona: ${z.name || z.id}`
      })
    })
  }

  // Active Individual Speakers
  audioStore.activeDevices.forEach((d) => {
    options.push({
      value: d.id,
      label: `🔊 ${d.name} (${d.status || 'UNKNOWN'})`
    })
  })

  return options
})

async function toggleAudioPaging() {
  if (isPagingTransmitting.value) {
    await whipAudio.stopPublish()
    toast.info('Siaran Selesai', 'Siaran audio paging telah dihentikan.')
    return
  }

  const targetOpt = pagingTargetOptions.value.find((opt) => opt.value === pagingTarget.value)
  const targetLabel = targetOpt ? targetOpt.label : pagingTarget.value

  let targetUrl = ''
  if (pagingTarget.value.startsWith('AUD-')) {
    const spk = audioStore.getDeviceById(pagingTarget.value)
    if (spk?.whipUrl) {
      targetUrl = spk.whipUrl.trim()
    }
  } else if (audioStore.activeDevices.length > 0) {
    const firstWithUrl = audioStore.activeDevices.find(a => a.whipUrl?.trim())
    if (firstWithUrl) {
      targetUrl = firstWithUrl.whipUrl.trim()
    }
  }

  if (!targetUrl) {
    toast.error('URL WHIP Kosong', 'Target speaker belum memiliki URL endpoint WHIP.')
    return
  }

  const success = await whipAudio.startPublish(targetUrl)
  if (success) {
    toast.success('Audio Paging ON AIR', `Siaran langsung terhubung ke ${targetLabel}.`)
  } else {
    toast.error('Gagal Siaran Audio', whipAudio.publishError.value || 'Periksa mikrofon atau koneksi WHIP server.')
  }
}

// Drawer & Modal State
const inspectDrawerOpen = ref(false)
const inspectedEvent = ref(null)

const resolveModalOpen = ref(false)
const toResolveEvent = ref(null)
const resolutionNote = ref('')

const displayedMapDevices = computed(() => {
  return cctvStore.mapCameras
})

const totalDevicesCount = computed(() => {
  return cctvStore.activeCameras.length + audioStore.activeDevices.length
})

// Unified list of managed devices (CCTV & Audio)
const allManagedDevices = computed(() => {
  const cctvs = cctvStore.activeCameras.map((c) => ({
    id: c.id,
    name: c.name,
    type: 'CCTV',
    typeLabel: 'Kamera CCTV',
    status: c.status || 'UNKNOWN',
    streamStatus: c.streamStatus || 'UNAVAILABLE',
    siteName: c.site?.name || c.siteName || '-',
    zoneName: c.zone?.name || c.zoneName || '-',
    latencyMs: c.latencyMs || null
  }))

  const audios = audioStore.activeDevices.map((a) => ({
    id: a.id,
    name: a.name,
    type: 'AUDIO',
    typeLabel: 'Audio Speaker',
    status: a.status || 'UNKNOWN',
    streamStatus: a.status === 'ONLINE' ? 'AVAILABLE' : 'UNAVAILABLE',
    siteName: a.siteName || (cctvStore.sites.find(s => s.id === a.siteId)?.name || '-'),
    zoneName: a.zoneName || (cctvStore.zones.find(z => z.id === a.zoneId)?.name || '-'),
    latencyMs: a.latencyMs || null
  }))

  if (deviceFilter.value === 'CCTV') return cctvs
  if (deviceFilter.value === 'AUDIO') return audios
  return [...cctvs, ...audios]
})

// Statistics (Live dari status kamera aktif & perangkat audio)
const stats = computed(() => {
  const activeCams = cctvStore.activeCameras
  const totalCctv = activeCams.length
  const onlineCctv = activeCams.filter((c) => c.status === 'ONLINE').length
  const offlineCctv = activeCams.filter((c) => c.status === 'OFFLINE').length
  const unknownCctv = activeCams.filter((c) => !c.status || c.status === 'UNKNOWN').length

  const totalAud = audioStore.activeDevices.length
  const onlineAud = audioStore.activeDevices.filter(a => a.status === 'ONLINE' || a.status === 'ON AIR').length
  const offlineAud = audioStore.activeDevices.filter(a => a.status === 'OFFLINE').length
  const unknownAud = audioStore.activeDevices.filter(a => !a.status || a.status === 'UNKNOWN').length

  return {
    cctv: { total: totalCctv, online: onlineCctv, offline: offlineCctv, unknown: unknownCctv },
    audio: { total: totalAud, online: onlineAud, offline: offlineAud, unknown: unknownAud }
  }
})

// Event columns for table
const eventColumns = [
  { key: 'id', label: 'ID', width: 'w-16' },
  { key: 'occurredAt', label: 'Waktu Kejadian', width: 'w-32' },
  { key: 'status', label: 'Status', width: 'w-28' },
  { key: 'title', label: 'Judul Insiden' },
  { key: 'device', label: 'Perangkat', width: 'w-44' },
  { key: 'actions', label: 'Aksi', align: 'right', width: 'w-36' }
]

const recentEvents = computed(() => {
  return eventsStore.events.slice(0, 5)
})

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

async function refreshAllData() {
  loading.value = true
  try {
    await Promise.all([
      cctvStore.fetchCameras(),
      cctvStore.fetchSitesAndZones(),
      cctvStore.fetchDeviceStats(),
      eventsStore.fetchStats(),
      eventsStore.fetchEvents({ limit: 5 })
    ])
    toast.success('Data Disinkronkan', 'Seluruh data ringkasan operasi dan inventaris perangkat berhasil diperbarui.')
  } catch (err) {
    toast.error('Gagal Sinkronisasi', err.message || 'Terjadi kesalahan saat memuat data database.')
  } finally {
    loading.value = false
  }
}

function openInspectDrawer(row) {
  inspectedEvent.value = row
  inspectDrawerOpen.value = true
}

function openResolveModal(row) {
  toResolveEvent.value = row
  resolutionNote.value = ''
  resolveModalOpen.value = true
}

async function confirmResolveEvent() {
  if (!toResolveEvent.value) return
  if (!resolutionNote.value.trim()) {
    toast.error('Validasi Gagal', 'Harap isi catatan tindakan perbaikan / resolusi.')
    return
  }

  try {
    const updated = await eventsStore.resolveEvent(toResolveEvent.value.id, resolutionNote.value.trim())
    if (inspectedEvent.value && inspectedEvent.value.id === toResolveEvent.value.id) {
      inspectedEvent.value = updated
    }
    resolveModalOpen.value = false
    await eventsStore.fetchEvents({ limit: 5 })
    toast.success('Alarm Diselesaikan', `Alarm #${toResolveEvent.value.id} telah terselesaikan (RESOLVED) di database.`)
  } catch (err) {
    toast.error('Gagal Menyelesaikan Alarm', err.message || 'Terjadi kesalahan sistem')
  }
}

onMounted(() => {
  refreshAllData()
  cctvStore.startCameraStatusPolling(1000)
})

onUnmounted(() => {
  if (whipAudio.isPublishing.value) {
    whipAudio.stopPublish()
  }
  cctvStore.stopCameraStatusPolling()
})
</script>
