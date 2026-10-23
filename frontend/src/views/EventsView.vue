<template>
  <div class="space-y-6">
    <!-- Header: Title & Actions -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#283548]">
      <div>
        <div class="flex items-center gap-2 flex-wrap">
          <h2 class="text-lg font-bold text-slate-100 tracking-tight">Event & Alarm Monitoring</h2>
          <!-- <span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-950/70 text-rose-300 border border-rose-800">
            OFFLINE ALERTS
          </span>
          <span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-950/70 text-emerald-300 border border-emerald-800">
            RESOLVED HISTORY
          </span> -->
        </div>
        <p class="text-xs text-slate-400 mt-1 font-mono">
          Monitoring khusus deteksi perangkat OFFLINE dan riwayat pemulihan koneksi (RESOLVED).
        </p>
      </div>

      <!-- Header Action Buttons -->
      <div class="flex items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          :loading="eventsStore.loading"
          @click="loadAllData"
        >
          <RefreshCw class="w-3.5 h-3.5 mr-1.5" :class="{ 'animate-spin': eventsStore.loading }" />
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
      </div>
    </div>

    <!-- Metric Summary Cards -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 font-mono text-xs">
      <!-- Card 1: Total Insiden -->
      <div class="p-3 bg-[#0d131f] border border-[#1e2a3b] rounded-xl flex items-center justify-between shadow-xs">
        <div>
          <span class="text-[10px] text-slate-400 uppercase block tracking-wider">Total Insiden:</span>
          <p class="text-xl font-bold text-slate-100">{{ eventsStore.stats.total }}</p>
          <span class="text-[10px] text-slate-500 block mt-0.5">Histori OFFLINE & RESOLVED</span>
        </div>
        <div class="w-9 h-9 rounded-lg bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
          <BellRing class="w-4 h-4" />
        </div>
      </div>

      <!-- Card 2: Perangkat OFFLINE Aktif -->
      <div class="p-3 bg-[#0d131f] border border-[#1e2a3b] rounded-xl flex items-center justify-between shadow-xs relative overflow-hidden">
        <div v-if="eventsStore.stats.offlineActiveCount > 0" class="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping"></div>
        <div>
          <span class="text-[10px] text-slate-400 uppercase block tracking-wider">Perangkat OFFLINE Aktif:</span>
          <p class="text-xl font-bold text-rose-400">{{ eventsStore.stats.offlineActiveCount }}</p>
          <span class="text-[10px] text-rose-500/80 block mt-0.5">Perangkat terputus & butuh atensi</span>
        </div>
        <div class="w-9 h-9 rounded-lg bg-rose-600/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
          <AlertOctagon class="w-4 h-4" />
        </div>
      </div>

      <!-- Card 3: Insiden Selesai / Pulih -->
      <div class="p-3 bg-[#0d131f] border border-[#1e2a3b] rounded-xl flex items-center justify-between shadow-xs">
        <div>
          <span class="text-[10px] text-slate-400 uppercase block tracking-wider">Insiden Pulih (RESOLVED):</span>
          <p class="text-xl font-bold text-emerald-400">{{ eventsStore.stats.resolvedCount }}</p>
          <span class="text-[10px] text-emerald-500/80 block mt-0.5">Auto-recover / tindakan operator</span>
        </div>
        <div class="w-9 h-9 rounded-lg bg-emerald-600/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
          <CheckCircle2 class="w-4 h-4" />
        </div>
      </div>

      <!-- Card 4: Distribusi Perangkat Terdampak -->
      <div class="p-3 bg-[#0d131f] border border-[#1e2a3b] rounded-xl flex items-center justify-between shadow-xs">
        <div>
          <span class="text-[10px] text-slate-400 uppercase block tracking-wider">Perangkat Terdampak:</span>
          <p class="text-sm font-bold text-indigo-300 mt-1">
            CAM: {{ eventsStore.stats.cameraCount }} • AUD: {{ eventsStore.stats.audioCount }}
          </p>
          <span class="text-[10px] text-slate-500 block mt-0.5">Distribusi kamera & speaker</span>
        </div>
        <div class="w-9 h-9 rounded-lg bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
          <Layers class="w-4 h-4" />
        </div>
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
            placeholder="Cari ID perangkat (CAM/AUD), lokasi, judul insiden, atau catatan resolusi..."
            class="flex-1 bg-transparent text-slate-100 placeholder-slate-500 focus:outline-none"
            @keydown.enter="applyFilters"
          />
          <button
            v-if="filters.search"
            type="button"
            class="text-slate-400 hover:text-white cursor-pointer"
            @click="filters.search = ''; applyFilters()"
          >
            <X class="w-3.5 h-3.5" />
          </button>
        </div>

        <!-- Filter Selects -->
        <div class="flex flex-wrap items-center gap-2">
          <!-- Filter Status: OFFLINE vs RESOLVED -->
          <select
            v-model="filters.status"
            class="bg-[#111827] border border-[#283548] text-slate-200 px-2.5 py-1.5 rounded-lg text-xs focus:outline-none focus:border-blue-500 cursor-pointer font-sans"
            @change="applyFilters"
          >
            <option value="ALL">Semua Status (OFFLINE & RESOLVED)</option>
            <option value="OFFLINE">🔴 OFFLINE (Aktif / Terputus)</option>
            <option value="RESOLVED">🟢 RESOLVED (Pulih / Selesai)</option>
          </select>

          <!-- Filter Device Type -->
          <select
            v-model="filters.deviceType"
            class="bg-[#111827] border border-[#283548] text-slate-200 px-2.5 py-1.5 rounded-lg text-xs focus:outline-none focus:border-blue-500 cursor-pointer font-sans"
            @change="applyFilters"
          >
            <option value="ALL">Semua Jenis Perangkat</option>
            <option value="CAMERA">📹 Kamera CCTV (CAM)</option>
            <option value="AUDIO">📢 Audio Speaker (AUD)</option>
          </select>
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
          Menampilkan <strong class="text-blue-400">{{ eventsStore.events.length }}</strong> dari <strong class="text-slate-200">{{ eventsStore.pagination.total }}</strong> insiden
        </div>
      </div>
    </div>

    <!-- Data Table of Events -->
    <Table
      title="Tabel Insiden OFFLINE & Riwayat RESOLVED"
      subtitle="Pusat data insiden perangkat terputus dan audit pemulihan"
      :count="eventsStore.pagination.total"
      :columns="columns"
      :data="eventsStore.events"
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

      <!-- Slot Status Alarm (OFFLINE vs RESOLVED vs UNKNOWN) -->
      <template #status="{ row }">
        <div class="flex items-center gap-1.5">
          <span
            v-if="row.status === 'OFFLINE'"
            class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-rose-950/70 text-rose-300 border border-rose-600/60"
          >
            <span class="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse"></span>
            OFFLINE
          </span>
          <span
            v-else-if="row.status === 'RESOLVED'"
            class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-emerald-950/70 text-emerald-300 border border-emerald-600/60"
          >
            <CheckCircle2 class="w-3 h-3 text-emerald-400" />
            RESOLVED
          </span>
          <span
            v-else
            class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-slate-800/80 text-slate-400 border border-slate-700/60"
          >
            <span class="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
            {{ row.status || 'UNKNOWN' }}
          </span>
        </div>
      </template>

      <!-- Slot Rincian Insiden OFFLINE -->
      <template #eventInfo="{ row }">
        <div class="flex flex-col gap-1 items-start min-w-[200px]">
          <span class="text-xs font-semibold text-slate-100 block">
            {{ row.title }}
          </span>
          <span v-if="row.message" class="text-[11px] text-slate-400 truncate max-w-[340px]" :title="row.message">
            {{ row.message }}
          </span>
          <div v-if="row.status === 'RESOLVED' && row.resolutionNote" class="text-[10px] text-emerald-400/90 flex items-center gap-1 italic truncate max-w-[320px]">
            <CheckCircle2 class="w-2.5 h-2.5 shrink-0" />
            <span>{{ row.resolutionNote }}</span>
          </div>
        </div>
      </template>

      <!-- Slot Sumber / Perangkat & Lokasi -->
      <template #source="{ row }">
        <div class="font-mono text-xs space-y-0.5">
          <div v-if="row.targetDevice" class="flex items-center gap-1.5">
            <Video v-if="row.targetDevice.type === 'camera'" class="w-3.5 h-3.5 text-blue-400 shrink-0" />
            <Megaphone v-else class="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <span class="font-bold text-slate-200">{{ row.targetDevice.id }}</span>
          </div>
          <span v-if="row.targetDevice?.name" class="text-[10px] text-slate-400 block truncate max-w-[170px]" :title="row.targetDevice.name">
            {{ row.targetDevice.name }}
          </span>
          <div v-if="row.siteName || row.zoneName" class="text-[10px] text-slate-500 flex items-center gap-1 truncate max-w-[170px]">
            <MapPin class="w-3 h-3 shrink-0" />
            <span>{{ [row.siteName, row.zoneName].filter(Boolean).join(' • ') }}</span>
          </div>
          <span v-if="!row.targetDevice && !row.siteName" class="text-slate-500">-</span>
        </div>
      </template>

      <!-- Slot Siklus Pemulihan (Lifecycle) -->
      <template #lifecycle="{ row }">
        <div class="font-mono text-xs space-y-0.5">
          <template v-if="row.status === 'RESOLVED'">
            <div class="flex items-center gap-1 text-emerald-400 text-[11px] font-semibold">
              <CheckCircle2 class="w-3 h-3 shrink-0" />
              <span>Pulih: {{ row.resolvedAt ? formatDateTime(row.resolvedAt).time : 'Otomatis' }} WIB</span>
            </div>
            <span class="text-[10px] text-slate-400 block truncate max-w-[160px]">
              Oleh: {{ row.resolvedByName ? '@' + row.resolvedByName : 'Sistem (Auto-Recovery)' }}
            </span>
          </template>
          <template v-else>
            <div class="flex items-center gap-1 text-rose-400 text-[11px] font-medium">
              <AlertTriangle class="w-3 h-3 shrink-0" />
              <span>Belum Selesai (Aktif)</span>
            </div>
            <span class="text-[10px] text-slate-500 block">Menunggu koneksi kembali</span>
          </template>
        </div>
      </template>

      <!-- Slot Aksi -->
      <template #actions="{ row }">
        <div class="flex items-center justify-end gap-1.5">
          <Button
            variant="ghost"
            size="xs"
            class="text-blue-400 hover:text-blue-300 hover:bg-blue-950/40"
            @click="openInspectDrawer(row)"
          >
            <Eye class="w-3 h-3 mr-1" />
            Detail
          </Button>

          <Button
            v-if="row.status !== 'RESOLVED'"
            variant="primary"
            size="xs"
            class="bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] py-1 px-2"
            title="Selesaikan alarm"
            @click="openResolveModal(row)"
          >
            <CheckSquare class="w-3 h-3 mr-1" />
            Resolve
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
              @change="filters.page = 1; loadEvents()"
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
              :disabled="filters.page <= 1 || eventsStore.loading"
              class="px-2.5 py-1 rounded bg-[#151f33] border border-[#283548] text-slate-300 hover:text-white hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              @click="changePage(filters.page - 1)"
            >
              &larr; Sebelumnya
            </button>

            <span class="px-2.5 py-1 text-slate-300 bg-[#0d131f] border border-[#283548] rounded font-bold">
              {{ filters.page }} / {{ eventsStore.pagination.totalPages || 1 }}
            </span>

            <button
              type="button"
              :disabled="filters.page >= eventsStore.pagination.totalPages || eventsStore.loading"
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
    <!-- DRAWER: DETAIL INSIDEN                                                -->
    <!-- ===================================================================== -->
    <Drawer
      v-model="inspectDrawerOpen"
      :title="`Detail Insiden #${inspectedEvent?.id || ''}`"
      :subtitle="`Waktu: ${inspectedEvent ? formatDateTime(inspectedEvent.occurredAt).full : ''}`"
      size="lg"
    >
      <div v-if="inspectedEvent" class="space-y-4 font-mono text-xs">
        <!-- Status Banner -->
        <div class="p-3 rounded-lg bg-[#0d131f] border border-[#283548] flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="text-slate-400">Status Insiden:</span>
            <span
              v-if="inspectedEvent.status === 'OFFLINE'"
              class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-rose-950/70 text-rose-300 border border-rose-600/60"
            >
              <span class="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse"></span>
              OFFLINE (Aktif)
            </span>
            <span
              v-else-if="inspectedEvent.status === 'RESOLVED'"
              class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-emerald-950/70 text-emerald-300 border border-emerald-600/60"
            >
              <CheckCircle2 class="w-3 h-3 text-emerald-400" />
              RESOLVED (Pulih)
            </span>
            <span
              v-else
              class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-slate-800/80 text-slate-400 border border-slate-700/60"
            >
              <span class="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
              {{ inspectedEvent.status || 'UNKNOWN' }}
            </span>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-slate-400">Tipe Perangkat:</span>
            <span class="text-blue-300 font-bold uppercase">
              {{ inspectedEvent.targetDevice?.type === 'camera' ? 'Kamera CCTV' : (inspectedEvent.targetDevice?.type === 'audio' ? 'Audio Speaker' : 'Perangkat') }}
            </span>
          </div>
        </div>

        <!-- Overview Information -->
        <div class="p-3.5 rounded-lg bg-[#0d131f] border border-[#283548] space-y-2.5">
          <span class="text-[10px] text-slate-400 font-bold uppercase tracking-wider block border-b border-[#1e2a3b] pb-1">
            Informasi Insiden
          </span>
          <div class="grid grid-cols-3 gap-1.5">
            <span class="text-slate-500">Judul Insiden:</span>
            <span class="col-span-2 text-slate-100 font-bold">{{ inspectedEvent.title }}</span>

            <span class="text-slate-500">Waktu Kejadian:</span>
            <span class="col-span-2 text-slate-300">{{ formatDateTime(inspectedEvent.occurredAt).full }}</span>

            <span class="text-slate-500">Pesan Sistem:</span>
            <span class="col-span-2 text-slate-300 break-words">{{ inspectedEvent.message || '-' }}</span>

            <span class="text-slate-500">Dedup Key:</span>
            <span class="col-span-2 text-slate-400 font-mono text-[11px] truncate">{{ inspectedEvent.dedupKey || '-' }}</span>
          </div>
        </div>

        <!-- Target Perangkat & Lokasi -->
        <div class="p-3.5 rounded-lg bg-[#0d131f] border border-[#283548] space-y-2.5">
          <span class="text-[10px] text-slate-400 font-bold uppercase tracking-wider block border-b border-[#1e2a3b] pb-1">
            Perangkat & Lokasi Terkait
          </span>
          <div class="grid grid-cols-3 gap-1.5">
            <span class="text-slate-500">Perangkat:</span>
            <span class="col-span-2 text-slate-200">
              <strong v-if="inspectedEvent.targetDevice" class="text-blue-400">{{ inspectedEvent.targetDevice.id }}</strong>
              <span v-if="inspectedEvent.targetDevice?.name"> ({{ inspectedEvent.targetDevice.name }})</span>
              <span v-if="!inspectedEvent.targetDevice">-</span>
            </span>

            <span class="text-slate-500">Lokasi Site:</span>
            <span class="col-span-2 text-slate-200">{{ inspectedEvent.siteName || inspectedEvent.siteId || '-' }}</span>

            <span class="text-slate-500">Zona Operasi:</span>
            <span class="col-span-2 text-slate-200">{{ inspectedEvent.zoneName || inspectedEvent.zoneId || '-' }}</span>
          </div>
        </div>

        <!-- Siklus Hidup Pemulihan (Lifecycle) -->
        <div class="p-3.5 rounded-lg bg-[#0d131f] border border-[#283548] space-y-2.5">
          <span class="text-[10px] text-slate-400 font-bold uppercase tracking-wider block border-b border-[#1e2a3b] pb-1">
            Riwayat Pemulihan & Resolusi
          </span>
          <div v-if="inspectedEvent.status === 'RESOLVED'" class="grid grid-cols-3 gap-1.5">
            <span class="text-slate-500">Diselesaikan Oleh:</span>
            <span class="col-span-2 text-emerald-300 font-semibold">
              {{ inspectedEvent.resolvedByName ? '@' + inspectedEvent.resolvedByName : 'Sistem (Auto-Recovery)' }}
            </span>

            <span class="text-slate-500">Waktu Pemulihan:</span>
            <span class="col-span-2 text-slate-300">
              {{ inspectedEvent.resolvedAt ? formatDateTime(inspectedEvent.resolvedAt).full : '-' }}
            </span>

            <span class="text-slate-500">Catatan Resolusi:</span>
            <span class="col-span-2 text-slate-200 italic">{{ inspectedEvent.resolutionNote || 'Perangkat pulih otomatis kembali ONLINE' }}</span>
          </div>
          <div v-else class="p-2.5 rounded bg-rose-950/30 border border-rose-900/40 text-rose-300">
            <div class="flex items-center gap-1.5 font-bold">
              <AlertTriangle class="w-4 h-4 text-rose-400" />
              <span>Perangkat Masih Terputus (OFFLINE)</span>
            </div>
            <p class="text-[11px] text-rose-400/80 mt-1">
              Koneksi jaringan atau stream belum pulih. Alarm akan otomatis teresolusi begitu perangkat kembali ONLINE, atau operator dapat menyelesaikan secara manual.
            </p>
          </div>
        </div>

        <!-- Detail Tambahan / JSON Payload jika ada -->
        <div v-if="inspectedEvent.detail" class="space-y-1.5">
          <span class="text-[10px] text-slate-400 uppercase font-bold block">Detail Teknis (JSON):</span>
          <pre class="bg-[#080c14] p-3 rounded-lg border border-[#1b2537] text-[11px] text-slate-300 overflow-x-auto leading-relaxed">{{ formatJson(inspectedEvent.detail) }}</pre>
        </div>
      </div>

      <template #footer="{ close }">
        <div class="flex items-center gap-2">
          <Button
            v-if="inspectedEvent && inspectedEvent.status !== 'RESOLVED'"
            variant="primary"
            size="sm"
            class="bg-emerald-600 hover:bg-emerald-500 text-white"
            @click="openResolveModal(inspectedEvent)"
          >
            <CheckSquare class="w-3.5 h-3.5 mr-1" />
            Tandai Selesai (Resolve)
          </Button>

          <Button variant="secondary" size="sm" @click="close">Tutup</Button>
        </div>
      </template>
    </Drawer>

    <!-- ===================================================================== -->
    <!-- MODAL: RESOLUSI ALARM                                                 -->
    <!-- ===================================================================== -->
    <Modal
      v-model="resolveModalOpen"
      :title="`Selesaikan Alarm #${toResolveEvent?.id || ''}`"
      description="Tandai insiden perangkat telah tertangani dan berikan catatan perbaikan."
      size="md"
    >
      <div v-if="toResolveEvent" class="space-y-3 font-mono text-xs">
        <div class="p-2.5 rounded bg-[#151d2e] border border-[#283548]">
          <span class="text-slate-400 block text-[10px] uppercase">Insiden:</span>
          <strong class="text-slate-100 text-xs block mt-0.5">{{ toResolveEvent.title }}</strong>
          <span class="text-slate-400 text-[11px] block mt-1">{{ toResolveEvent.message }}</span>
        </div>

        <div>
          <label class="text-xs font-medium text-slate-300 block mb-1 font-sans">
            Catatan Tindakan Perbaikan / Resolusi <span class="text-rose-400">*</span>
          </label>
          <textarea
            v-model="resolutionNote"
            rows="3"
            placeholder="Contoh: Kabel jaringan telah disambungkan kembali, koneksi perangkat normal."
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
import { ref, reactive, computed, onMounted } from 'vue'
import { Table, Button, Drawer, Modal } from '../components/ui/index.js'
import { useEventsStore } from '../stores/events.js'
import { useToast } from '../composables/useToast.js'
import {
  BellRing,
  AlertTriangle,
  AlertOctagon,
  CheckCircle2,
  CheckSquare,
  RefreshCw,
  Download,
  FileCode,
  Search,
  X,
  Eye,
  Video,
  Megaphone,
  MapPin,
  Layers
} from '@lucide/vue'

const toast = useToast()
const eventsStore = useEventsStore()

// Filter State
const filters = reactive({
  page: 1,
  limit: 20,
  search: '',
  status: 'ALL',
  deviceType: 'ALL',
  startDate: '',
  endDate: ''
})

// Columns
const columns = [
  { key: 'id', label: 'ID', width: 'w-16' },
  { key: 'occurredAt', label: 'Waktu Kejadian (WIB)', width: 'w-36' },
  { key: 'status', label: 'Status Insiden', width: 'w-32' },
  { key: 'eventInfo', label: 'Rincian Insiden OFFLINE' },
  { key: 'source', label: 'Perangkat & Lokasi', width: 'w-48' },
  { key: 'lifecycle', label: 'Status Pemulihan', width: 'w-44' },
  { key: 'actions', label: 'Aksi', align: 'right', width: 'w-36' }
]

// Drawer & Modal State
const inspectDrawerOpen = ref(false)
const inspectedEvent = ref(null)

const resolveModalOpen = ref(false)
const toResolveEvent = ref(null)
const resolutionNote = ref('')

const hasActiveFilters = computed(() => {
  return (
    Boolean(filters.search) ||
    filters.status !== 'ALL' ||
    filters.deviceType !== 'ALL' ||
    Boolean(filters.startDate) ||
    Boolean(filters.endDate)
  )
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

function formatJson(val) {
  if (val === null || val === undefined) return ''
  try {
    return JSON.stringify(val, null, 2)
  } catch {
    return String(val)
  }
}

async function loadEvents() {
  await eventsStore.fetchEvents(filters)
}

async function loadAllData() {
  await Promise.all([
    eventsStore.fetchStats(),
    eventsStore.fetchEvents(filters)
  ])
  toast.success('Event & Alarm Dimuat', 'Data rekaman insiden dan metrik berhasil disegarkan.')
}

function applyFilters() {
  filters.page = 1
  loadEvents()
}

function resetFilters() {
  filters.search = ''
  filters.status = 'ALL'
  filters.deviceType = 'ALL'
  filters.startDate = ''
  filters.endDate = ''
  filters.page = 1
  loadEvents()
}

function changePage(newPage) {
  if (newPage < 1 || newPage > eventsStore.pagination.totalPages) return
  filters.page = newPage
  loadEvents()
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
    toast.success('Alarm Diselesaikan', `Alarm #${toResolveEvent.value.id} telah berstatus RESOLVED.`)
  } catch (err) {
    toast.error('Gagal Menyelesaikan Alarm', err.message || 'Terjadi kesalahan sistem')
  }
}

function handleExport(format = 'csv') {
  eventsStore.downloadExport(filters, format)
  toast.info('Mengunduh Log', `Sedang mengunduh berkas event format ${format.toUpperCase()}...`)
}

onMounted(() => {
  eventsStore.fetchStats()
  loadEvents()
})
</script>
