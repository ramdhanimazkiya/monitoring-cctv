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
    <div v-if="currentSub === 'devices'" class="space-y-6">
      <!-- Search Input & Filter Tabs -->
      <div class="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div class="relative flex-1">
          <Search class="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            v-model="deviceSearchQuery"
            type="text"
            placeholder="Cari ID perangkat, nama perangkat, URL stream/WHIP, atau lokasi site/zona..."
            class="w-full bg-[#111827] border border-[#283548] rounded-lg pl-9 pr-4 py-2 text-xs font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
        </div>

        <!-- Filter Tab Pills -->
        <div class="flex items-center gap-1.5 p-1 bg-[#111827] border border-[#283548] rounded-lg font-mono text-xs">
          <button
            type="button"
            :class="[
              'px-3 py-1.5 rounded-md font-bold transition-all cursor-pointer flex items-center gap-1.5',
              deviceTab === 'all'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            ]"
            @click="deviceTab = 'all'"
          >
            Semua
            <span class="px-1.5 py-0.2 rounded text-[10px] bg-[#1e2a3b] text-slate-300">
              {{ allDeletedDevicesCount }}
            </span>
          </button>
          <button
            type="button"
            :class="[
              'px-3 py-1.5 rounded-md font-bold transition-all cursor-pointer flex items-center gap-1.5',
              deviceTab === 'cctv'
                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            ]"
            @click="deviceTab = 'cctv'"
          >
            <Video class="w-3.5 h-3.5" />
            Kamera CCTV
            <span class="px-1.5 py-0.2 rounded text-[10px] bg-blue-950/80 text-blue-300 border border-blue-800">
              {{ trashStore.deletedDevices.cameras?.length || 0 }}
            </span>
          </button>
          <button
            type="button"
            :class="[
              'px-3 py-1.5 rounded-md font-bold transition-all cursor-pointer flex items-center gap-1.5',
              deviceTab === 'audio'
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            ]"
            @click="deviceTab = 'audio'"
          >
            <Megaphone class="w-3.5 h-3.5" />
            Speaker Audio
            <span class="px-1.5 py-0.2 rounded text-[10px] bg-purple-950/80 text-purple-300 border border-purple-800">
              {{ trashStore.deletedDevices.audioDevices?.length || 0 }}
            </span>
          </button>
        </div>
      </div>

      <!-- Empty State when nothing in both -->
      <div
        v-if="!trashStore.loading && allDeletedDevicesCount === 0"
        class="p-12 text-center bg-[#0d131f]/60 border border-[#1e2a3b] rounded-xl font-mono text-xs text-slate-400"
      >
        <Server class="w-8 h-8 text-slate-600 mx-auto mb-2" />
        <p class="text-slate-300 font-semibold">Tidak ada perangkat yang berada di tempat sampah</p>
        <p class="text-slate-500 mt-0.5">Seluruh kamera CCTV dan speaker audio aktif pada sistem.</p>
      </div>

      <!-- 1. KAMERA CCTV TABLE -->
      <div v-if="(deviceTab === 'all' || deviceTab === 'cctv') && (allDeletedDevicesCount > 0 || deviceSearchQuery)" class="space-y-2">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <Video class="w-4 h-4 text-blue-400" />
            <h3 class="text-xs font-bold text-slate-200 font-mono uppercase tracking-wider">
              Kamera CCTV Terhapus ({{ filteredCamerasList.length }})
            </h3>
          </div>
          <span class="text-[11px] font-mono text-slate-400">
            Inventaris video stream diarsipkan
          </span>
        </div>

        <div
          v-if="!trashStore.loading && filteredCamerasList.length === 0"
          class="p-6 text-center bg-[#0d131f]/40 border border-[#1e2a3b] rounded-xl text-xs text-slate-500 font-mono"
        >
          Tidak ada kamera CCTV terhapus{{ deviceSearchQuery ? ' yang cocok dengan pencarian' : '' }}.
        </div>

        <div v-else class="overflow-x-auto rounded-xl border border-[#283548] bg-[#0d131f]">
          <table class="w-full text-left text-xs">
            <thead class="bg-[#131b2c] border-b border-[#283548] text-slate-400 font-mono text-[11px] uppercase tracking-wider">
              <tr>
                <th class="px-4 py-3 w-32">ID Kamera</th>
                <th class="px-4 py-3">Nama Kamera</th>
                <th class="px-4 py-3">URL Stream Video</th>
                <th class="px-4 py-3">Lokasi Terakhir</th>
                <th class="px-4 py-3 w-44">Waktu Dihapus</th>
                <th class="px-4 py-3 text-right w-36">Aksi</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-[#1e2a3b] font-mono">
              <tr
                v-for="cam in paginatedCameras"
                :key="cam.id"
                class="hover:bg-[#151f33]/60 transition-colors"
              >
                <td class="px-4 py-3 font-bold text-blue-400">
                  {{ cam.id }}
                </td>
                <td class="px-4 py-3 font-semibold text-slate-200">
                  {{ cam.name }}
                </td>
                <td class="px-4 py-3 text-slate-400 text-[11px]">
                  <span class="truncate block max-w-xs text-blue-300 font-mono" :title="cam.streamUrl || '-'">
                    {{ cam.streamUrl || 'Tanpa endpoint langsung' }}
                  </span>
                </td>
                <td class="px-4 py-3 text-[11px] text-slate-300">
                  <div>Site: <span class="font-bold text-slate-200">{{ cam.site?.name || cam.siteId || '-' }}</span></div>
                  <div class="text-slate-500 text-[10px]">
                    Zona: {{ cam.zone?.name || cam.zoneId || 'Tanpa Zona (Unassigned)' }}
                  </div>
                </td>
                <td class="px-4 py-3 text-slate-400 text-[11px]">
                  {{ formatDateTime(cam.deletedAt) }}
                </td>
                <td class="px-4 py-3 text-right">
                  <Button
                    variant="primary"
                    size="xs"
                    class="font-mono"
                    @click="promptRestoreDevice(cam)"
                  >
                    <RotateCcw class="w-3 h-3 mr-1" />
                    Pulihkan Kamera
                  </Button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- CCTV Pagination -->
        <div v-if="filteredCamerasList.length > 0" class="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono text-slate-400 pt-1">
          <div class="flex items-center gap-2">
            <span>Baris per halaman:</span>
            <select
              v-model="cctvPageSize"
              class="bg-[#151f33] border border-[#283548] text-slate-200 rounded px-2 py-0.5 cursor-pointer focus:outline-none"
              @change="cctvCurrentPage = 1"
            >
              <option :value="5">5</option>
              <option :value="10">10</option>
              <option :value="20">20</option>
              <option :value="50">50</option>
              <option :value="100">100</option>
            </select>
          </div>

          <div class="flex items-center gap-1.5">
            <button
              type="button"
              :disabled="cctvCurrentPage <= 1"
              class="px-2.5 py-1 rounded bg-[#151f33] border border-[#283548] text-slate-300 hover:text-white hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              @click="cctvCurrentPage--"
            >
              &larr; Sebelumnya
            </button>

            <span class="px-2.5 py-1 text-slate-300 bg-[#0d131f] border border-[#283548] rounded font-bold">
              {{ cctvCurrentPage }} / {{ cctvTotalPages }}
            </span>

            <button
              type="button"
              :disabled="cctvCurrentPage >= cctvTotalPages"
              class="px-2.5 py-1 rounded bg-[#151f33] border border-[#283548] text-slate-300 hover:text-white hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              @click="cctvCurrentPage++"
            >
              Selanjutnya &rarr;
            </button>
          </div>
        </div>
      </div>

      <!-- 2. SPEAKER AUDIO TABLE -->
      <div v-if="(deviceTab === 'all' || deviceTab === 'audio') && (allDeletedDevicesCount > 0 || deviceSearchQuery)" class="space-y-2 pt-2">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <Megaphone class="w-4 h-4 text-purple-400" />
            <h3 class="text-xs font-bold text-slate-200 font-mono uppercase tracking-wider">
              Speaker Audio Terhapus ({{ filteredAudioList.length }})
            </h3>
          </div>
          <span class="text-[11px] font-mono text-slate-400">
            Perangkat speaker WHIP diarsipkan
          </span>
        </div>

        <div
          v-if="!trashStore.loading && filteredAudioList.length === 0"
          class="p-6 text-center bg-[#0d131f]/40 border border-[#1e2a3b] rounded-xl text-xs text-slate-500 font-mono"
        >
          Tidak ada speaker audio terhapus{{ deviceSearchQuery ? ' yang cocok dengan pencarian' : '' }}.
        </div>

        <div v-else class="overflow-x-auto rounded-xl border border-[#283548] bg-[#0d131f]">
          <table class="w-full text-left text-xs">
            <thead class="bg-[#131b2c] border-b border-[#283548] text-slate-400 font-mono text-[11px] uppercase tracking-wider">
              <tr>
                <th class="px-4 py-3 w-32">ID Speaker</th>
                <th class="px-4 py-3">Nama Speaker</th>
                <th class="px-4 py-3">WHIP Ingestion URL</th>
                <th class="px-4 py-3 w-28">Format</th>
                <th class="px-4 py-3">Lokasi Terakhir</th>
                <th class="px-4 py-3 w-44">Waktu Dihapus</th>
                <th class="px-4 py-3 text-right w-36">Aksi</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-[#1e2a3b] font-mono">
              <tr
                v-for="aud in paginatedAudio"
                :key="aud.id"
                class="hover:bg-[#151f33]/60 transition-colors"
              >
                <td class="px-4 py-3 font-bold text-purple-400">
                  {{ aud.id }}
                </td>
                <td class="px-4 py-3 font-semibold text-slate-200">
                  {{ aud.name }}
                </td>
                <td class="px-4 py-3 text-slate-400 text-[11px]">
                  <span class="truncate block max-w-xs text-purple-300 font-mono" :title="aud.whipUrl || aud.host || '-'">
                    {{ aud.whipUrl || aud.host || 'Tanpa WHIP endpoint' }}
                  </span>
                </td>
                <td class="px-4 py-3">
                  <span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-950/70 text-emerald-300 border border-emerald-700/60">
                    16kHz Mono
                  </span>
                </td>
                <td class="px-4 py-3 text-[11px] text-slate-300">
                  <div>Site: <span class="font-bold text-slate-200">{{ aud.site?.name || aud.siteId || '-' }}</span></div>
                  <div class="text-slate-500 text-[10px]">
                    Zona: {{ aud.zone?.name || aud.zoneId || 'Tanpa Zona (Unassigned)' }}
                  </div>
                </td>
                <td class="px-4 py-3 text-slate-400 text-[11px]">
                  {{ formatDateTime(aud.deletedAt) }}
                </td>
                <td class="px-4 py-3 text-right">
                  <Button
                    variant="primary"
                    size="xs"
                    class="font-mono"
                    @click="promptRestoreDevice(aud)"
                  >
                    <RotateCcw class="w-3 h-3 mr-1" />
                    Pulihkan Speaker
                  </Button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Audio Pagination -->
        <div v-if="filteredAudioList.length > 0" class="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono text-slate-400 pt-1">
          <div class="flex items-center gap-2">
            <span>Baris per halaman:</span>
            <select
              v-model="audioPageSize"
              class="bg-[#151f33] border border-[#283548] text-slate-200 rounded px-2 py-0.5 cursor-pointer focus:outline-none"
              @change="audioCurrentPage = 1"
            >
              <option :value="5">5</option>
              <option :value="10">10</option>
              <option :value="20">20</option>
              <option :value="50">50</option>
              <option :value="100">100</option>
            </select>
          </div>

          <div class="flex items-center gap-1.5">
            <button
              type="button"
              :disabled="audioCurrentPage <= 1"
              class="px-2.5 py-1 rounded bg-[#151f33] border border-[#283548] text-slate-300 hover:text-white hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              @click="audioCurrentPage--"
            >
              &larr; Sebelumnya
            </button>

            <span class="px-2.5 py-1 text-slate-300 bg-[#0d131f] border border-[#283548] rounded font-bold">
              {{ audioCurrentPage }} / {{ audioTotalPages }}
            </span>

            <button
              type="button"
              :disabled="audioCurrentPage >= audioTotalPages"
              class="px-2.5 py-1 rounded bg-[#151f33] border border-[#283548] text-slate-300 hover:text-white hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              @click="audioCurrentPage++"
            >
              Selanjutnya &rarr;
            </button>
          </div>
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
                v-for="site in paginatedSites"
                :key="site.id"
                class="hover:bg-[#151f33]/60 transition-colors"
              >
                <td class="px-4 py-3 font-bold text-blue-400">{{ site.id }}</td>
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

        <!-- Site Pagination -->
        <div v-if="filteredSitesList.length > 0" class="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono text-slate-400 pt-1">
          <div class="flex items-center gap-2">
            <span>Baris per halaman:</span>
            <select
              v-model="sitePageSize"
              class="bg-[#151f33] border border-[#283548] text-slate-200 rounded px-2 py-0.5 cursor-pointer focus:outline-none"
              @change="siteCurrentPage = 1"
            >
              <option :value="5">5</option>
              <option :value="10">10</option>
              <option :value="20">20</option>
              <option :value="50">50</option>
              <option :value="100">100</option>
            </select>
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
                v-for="zone in paginatedZones"
                :key="zone.id"
                class="hover:bg-[#151f33]/60 transition-colors"
              >
                <td class="px-4 py-3 font-bold text-purple-400">{{ zone.id }}</td>
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

        <!-- Zone Pagination -->
        <div v-if="filteredZonesList.length > 0" class="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono text-slate-400 pt-1">
          <div class="flex items-center gap-2">
            <span>Baris per halaman:</span>
            <select
              v-model="zonePageSize"
              class="bg-[#151f33] border border-[#283548] text-slate-200 rounded px-2 py-0.5 cursor-pointer focus:outline-none"
              @change="zoneCurrentPage = 1"
            >
              <option :value="5">5</option>
              <option :value="10">10</option>
              <option :value="20">20</option>
              <option :value="50">50</option>
              <option :value="100">100</option>
            </select>
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
        class="p-12 text-center bg-[#0d131f]/60 border border-[#1e2a3b] rounded-xl font-mono text-xs text-slate-400">
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
              <td class="px-4 py-3 font-bold text-purple-400">{{ u.id }}</td>
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

      <!-- User Pagination -->
      <div v-if="filteredUsersList.length > 0" class="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono text-slate-400 pt-1">
        <div class="flex items-center gap-2">
          <span>Baris per halaman:</span>
          <select
            v-model="userPageSize"
            class="bg-[#151f33] border border-[#283548] text-slate-200 rounded px-2 py-0.5 cursor-pointer focus:outline-none"
            @change="userCurrentPage = 1"
          >
            <option :value="5">5</option>
            <option :value="10">10</option>
            <option :value="20">20</option>
            <option :value="50">50</option>
            <option :value="100">100</option>
          </select>
        </div>

        <div class="flex items-center gap-1.5">
          <button
            type="button"
            :disabled="userCurrentPage <= 1"
            class="px-2.5 py-1 rounded bg-[#151f33] border border-[#283548] text-slate-300 hover:text-white hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
            @click="userCurrentPage--"
          >
            &larr; Sebelumnya
          </button>

          <span class="px-2.5 py-1 text-slate-300 bg-[#0d131f] border border-[#283548] rounded font-bold">
            {{ userCurrentPage }} / {{ userTotalPages }}
          </span>

          <button
            type="button"
            :disabled="userCurrentPage >= userTotalPages"
            class="px-2.5 py-1 rounded bg-[#151f33] border border-[#283548] text-slate-300 hover:text-white hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
            @click="userCurrentPage++"
          >
            Selanjutnya &rarr;
          </button>
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
  Search,
  Video,
  Megaphone
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
// 1. DEVICE MANAGEMENT FILTER & PAGINATION (CCTV & AUDIO)
// -----------------------------------------------------------------------------
const deviceTab = ref('all') // 'all' | 'cctv' | 'audio'
const deviceSearchQuery = ref('')

const cctvPageSize = ref(5)
const cctvCurrentPage = ref(1)

const audioPageSize = ref(5)
const audioCurrentPage = ref(1)

const allDeletedDevicesCount = computed(() => {
  const cams = trashStore.deletedDevices.cameras || []
  const auds = trashStore.deletedDevices.audioDevices || []
  return cams.length + auds.length
})

const filteredCamerasList = computed(() => {
  let list = trashStore.deletedDevices.cameras || []
  if (deviceSearchQuery.value.trim()) {
    const q = deviceSearchQuery.value.toLowerCase().trim()
    list = list.filter((c) =>
      (c.id && c.id.toLowerCase().includes(q)) ||
      (c.name && c.name.toLowerCase().includes(q)) ||
      (c.site?.name && c.site.name.toLowerCase().includes(q)) ||
      (c.zone?.name && c.zone.name.toLowerCase().includes(q)) ||
      (c.streamUrl && c.streamUrl.toLowerCase().includes(q))
    )
  }
  return list
})

const filteredAudioList = computed(() => {
  let list = trashStore.deletedDevices.audioDevices || []
  if (deviceSearchQuery.value.trim()) {
    const q = deviceSearchQuery.value.toLowerCase().trim()
    list = list.filter((a) =>
      (a.id && a.id.toLowerCase().includes(q)) ||
      (a.name && a.name.toLowerCase().includes(q)) ||
      (a.site?.name && a.site.name.toLowerCase().includes(q)) ||
      (a.zone?.name && a.zone.name.toLowerCase().includes(q)) ||
      (a.whipUrl && a.whipUrl.toLowerCase().includes(q)) ||
      (a.host && a.host.toLowerCase().includes(q))
    )
  }
  return list
})

const cctvTotalPages = computed(() => Math.ceil(filteredCamerasList.value.length / cctvPageSize.value) || 1)
const paginatedCameras = computed(() => {
  const start = (cctvCurrentPage.value - 1) * cctvPageSize.value
  return filteredCamerasList.value.slice(start, start + cctvPageSize.value)
})

watch(cctvTotalPages, (newTotal) => {
  if (cctvCurrentPage.value > newTotal) {
    cctvCurrentPage.value = Math.max(1, newTotal)
  }
})

const audioTotalPages = computed(() => Math.ceil(filteredAudioList.value.length / audioPageSize.value) || 1)
const paginatedAudio = computed(() => {
  const start = (audioCurrentPage.value - 1) * audioPageSize.value
  return filteredAudioList.value.slice(start, start + audioPageSize.value)
})

watch(audioTotalPages, (newTotal) => {
  if (audioCurrentPage.value > newTotal) {
    audioCurrentPage.value = Math.max(1, newTotal)
  }
})

watch([deviceSearchQuery, deviceTab], () => {
  cctvCurrentPage.value = 1
  audioCurrentPage.value = 1
})

// -----------------------------------------------------------------------------
// 2. SITE & ZONE SEARCH & PAGINATION
// -----------------------------------------------------------------------------
const siteZoneSearchQuery = ref('')

const sitePageSize = ref(5)
const siteCurrentPage = ref(1)

const zonePageSize = ref(5)
const zoneCurrentPage = ref(1)

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

const siteTotalPages = computed(() => Math.ceil(filteredSitesList.value.length / sitePageSize.value) || 1)
const paginatedSites = computed(() => {
  const start = (siteCurrentPage.value - 1) * sitePageSize.value
  return filteredSitesList.value.slice(start, start + sitePageSize.value)
})

watch(siteTotalPages, (newTotal) => {
  if (siteCurrentPage.value > newTotal) {
    siteCurrentPage.value = Math.max(1, newTotal)
  }
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

const zoneTotalPages = computed(() => Math.ceil(filteredZonesList.value.length / zonePageSize.value) || 1)
const paginatedZones = computed(() => {
  const start = (zoneCurrentPage.value - 1) * zonePageSize.value
  return filteredZonesList.value.slice(start, start + zonePageSize.value)
})

watch(zoneTotalPages, (newTotal) => {
  if (zoneCurrentPage.value > newTotal) {
    zoneCurrentPage.value = Math.max(1, newTotal)
  }
})

watch(siteZoneSearchQuery, () => {
  siteCurrentPage.value = 1
  zoneCurrentPage.value = 1
})

// -----------------------------------------------------------------------------
// 3. USER MANAGEMENT SEARCH & PAGINATION
// -----------------------------------------------------------------------------
const userSearchQuery = ref('')
const userPageSize = ref(5)
const userCurrentPage = ref(1)

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

const userTotalPages = computed(() => Math.ceil(filteredUsersList.value.length / userPageSize.value) || 1)
const paginatedUsers = computed(() => {
  const start = (userCurrentPage.value - 1) * userPageSize.value
  return filteredUsersList.value.slice(start, start + userPageSize.value)
})

watch(userTotalPages, (newTotal) => {
  if (userCurrentPage.value > newTotal) {
    userCurrentPage.value = Math.max(1, newTotal)
  }
})

watch(userSearchQuery, () => {
  userCurrentPage.value = 1
})

// -----------------------------------------------------------------------------
// RESTORATION CONFIRMATION DIALOG LOGIC
// -----------------------------------------------------------------------------
const restoreModalOpen = ref(false)
const restoreTarget = ref(null)
const restoreTargetType = ref('')

const restoreDialogTitle = computed(() => {
  if (restoreTargetType.value === 'DEVICE') {
    const isAudio = restoreTarget.value?.deviceType === 'AUDIO' || restoreTarget.value?.id?.startsWith('AUD-')
    return isAudio ? 'Pulihkan Speaker Audio' : 'Pulihkan Kamera CCTV'
  }
  if (restoreTargetType.value === 'SITE') return 'Pulihkan Site'
  if (restoreTargetType.value === 'ZONE') return 'Pulihkan Zona'
  if (restoreTargetType.value === 'USER') return 'Pulihkan Akun Pengguna'
  return 'Konfirmasi Pemulihan'
})

const restoreDialogMessage = computed(() => {
  const t = restoreTarget.value
  if (!t) return ''
  if (restoreTargetType.value === 'DEVICE') {
    const isAudio = t.deviceType === 'AUDIO' || t.id?.startsWith('AUD-')
    if (isAudio) {
      return `Apakah Anda yakin ingin memulihkan speaker audio ${t.id} (${t.name}) kembali ke inventaris aktif?`
    }
    return `Apakah Anda yakin ingin memulihkan kamera CCTV ${t.id} (${t.name}) kembali ke inventaris aktif?`
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
      const isAudio = target.deviceType === 'AUDIO' || target.id?.startsWith('AUD-')
      await trashStore.restoreDevice(target.deviceType || (isAudio ? 'AUDIO' : 'CCTV'), target.id)
      await Promise.all([
        cctvStore.fetchCameras(),
        audioStore.fetchAudioDevices()
      ])
      const label = isAudio ? 'Speaker Audio' : 'Kamera CCTV'
      toast.success(`${label} Dipulihkan`, `${target.id} (${target.name}) berhasil dipulihkan dan aktif kembali.`)
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
