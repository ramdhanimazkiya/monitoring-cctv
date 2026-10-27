<template>
  <div class="space-y-6">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#283548]">
      <div>
        <div class="flex items-center gap-2">
          <h2 class="text-lg font-bold text-slate-100 tracking-tight">Manajemen Perangkat</h2>
          <!-- <Badge status="ACTIVE" label="ADMIN ONLY" size="xs" /> -->
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
        <div class="text-xs font-mono">
          <span
            v-if="row.zoneId && isZoneActive(row.zoneId, row)"
            class="text-slate-200 font-medium"
          >
            {{ getZoneName(row) }}
          </span>
          <span
            v-else
            class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-950/70 text-amber-300 border border-amber-800/80"
          >
            Unassigned
          </span>
          <span class="text-slate-500 text-[10px] block">
            ({{ row.site?.name || row.siteName || '-' }})
          </span>
        </div>
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
        <span v-if="row.latitude !== null && row.longitude !== null && row.latitude !== undefined && row.longitude !== undefined" class="font-mono text-[11px] text-cyan-300">
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

      <!-- Table Pagination Footer (Sama seperti Event & Alarm, Default 5 Data) -->
      <template #footer>
        <div class="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono text-slate-400">
          <div class="flex items-center gap-2">
            <span>Baris per halaman:</span>
            <select
              v-model="cctvPageSize"
              class="bg-[#151f33] border border-[#283548] text-slate-200 rounded px-2 py-0.5 cursor-pointer focus:outline-none"
              @change="cctvPage = 1"
            >
              <option :value="5">5</option>
              <option :value="10">10</option>
              <option :value="20">20</option>
              <option :value="50">50</option>
              <option :value="100">100</option>
            </select>
            <!-- <span class="text-slate-500 hidden sm:inline">
              (Menampilkan {{ cctvStore.cameras.length === 0 ? 0 : (cctvPage - 1) * cctvPageSize + 1 }} - {{ Math.min(cctvPage * cctvPageSize, cctvStore.cameras.length) }} dari {{ cctvStore.cameras.length }} kamera)
            </span> -->
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

      <template #zoneName="{ row }">
        <div class="text-xs font-mono">
          <span
            v-if="row.zoneId && isZoneActive(row.zoneId, row)"
            class="text-slate-200 font-medium"
          >
            {{ getAudioZoneName(row) }}
          </span>
          <span
            v-else
            class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-950/70 text-amber-300 border border-amber-800/80"
          >
            Unassigned
          </span>
          <span class="text-slate-500 text-[10px] block">
            ({{ row.site?.name || row.siteName || '-' }})
          </span>
        </div>
      </template>

      <template #whipUrl="{ row }">
        <span class="font-mono text-xs text-blue-300 truncate max-w-[200px] block" :title="row.whipUrl">
          {{ row.whipUrl }}
        </span>
      </template>

      <template #coordinates="{ row }">
        <span v-if="row.latitude !== null && row.longitude !== null && row.latitude !== undefined && row.longitude !== undefined" class="font-mono text-[11px] text-cyan-300">
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

      <!-- Table Pagination Footer (Sama seperti Event & Alarm, Default 5 Data) -->
      <template #footer>
        <div class="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono text-slate-400">
          <div class="flex items-center gap-2">
            <span>Baris per halaman:</span>
            <select
              v-model="speakerPageSize"
              class="bg-[#151f33] border border-[#283548] text-slate-200 rounded px-2 py-0.5 cursor-pointer focus:outline-none"
              @change="speakerPage = 1"
            >
              <option :value="5">5</option>
              <option :value="10">10</option>
              <option :value="20">20</option>
              <option :value="50">50</option>
              <option :value="100">100</option>
            </select>
            <!-- <span class="text-slate-500 hidden sm:inline">
              (Menampilkan {{ audioStore.activeDevices.length === 0 ? 0 : (speakerPage - 1) * speakerPageSize + 1 }} - {{ Math.min(speakerPage * speakerPageSize, audioStore.activeDevices.length) }} dari {{ audioStore.activeDevices.length }} speaker)
            </span> -->
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
          <Input
            v-model="activeCctv.name"
            label="Nama Kamera"
            placeholder="Kamera Lobby Utama"
            required
            :error="cctvErrors.name"
            @input="cctvErrors.name = ''"
          />
          <Select
            v-model="activeCctv.siteId"
            label="Lokasi Site"
            :placeholder="cctvStore.sites.length ? '-- Pilih Lokasi Site --' : '-- Belum Ada Site Terdaftar --'"
            :options="siteOptions"
            :error="cctvErrors.siteId"
            @change="cctvErrors.siteId = ''"
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
            URL Stream Kamera: <span class="text-rose-400">*</span>
          </label>

          <div class="flex gap-2">
            <input
              v-model="activeCctv.streamUrl"
              type="text"
              placeholder="https://stream.example.com/ atau rtsp://..."
              :class="[
                'flex-1 bg-[#111827] border rounded-md px-3 py-2 text-xs font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 transition-colors',
                cctvErrors.streamUrl || cctvUrlDuplicateWarning ? 'border-rose-500 focus:ring-rose-500 text-rose-200' : 'border-[#283548] focus:ring-emerald-500'
              ]"
              required
              @input="cctvErrors.streamUrl = ''"
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
          <span v-if="cctvErrors.streamUrl" class="text-[10px] text-rose-400 font-mono mt-1 block">
            ⚠ {{ cctvErrors.streamUrl }}
          </span>
          <span v-else class="text-[10px] text-slate-500 font-mono mt-1 block">
            Format: http://, https://, rtsp://, rtsps://, atau ws(s)://
          </span>

          <!-- Alert jika URL stream kamera telah ada -->
          <div
            v-if="cctvUrlDuplicateWarning"
            class="p-2.5 rounded bg-rose-950/80 border border-rose-600/70 text-rose-300 text-xs font-mono flex items-start gap-2"
          >
            <AlertCircle class="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
            <div>
              <strong class="font-bold">Peringatan:</strong> URL stream ini sudah terdaftar pada kamera <strong>{{ cctvUrlDuplicateWarning.id }} - {{ cctvUrlDuplicateWarning.name }}</strong>. Harap gunakan URL stream yang berbeda.
            </div>
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
                v-model="activeCctv.latitude"
                type="text"
                inputmode="decimal"
                placeholder="Contoh: -6.917464"
                :class="[
                  'w-full bg-[#0a0e17] border rounded px-3 py-1.5 text-xs font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 transition-colors',
                  cctvErrors.latitude ? 'border-rose-500 focus:ring-rose-500' : 'border-[#283548] focus:ring-blue-500'
                ]"
                @keydown="onCoordinateKeydown"
                @input="handleCoordinateInput($event, activeCctv, 'latitude', cctvErrors)"
                @paste="handleCoordinatePaste($event, activeCctv, 'latitude', cctvErrors)"
              />
              <span v-if="cctvErrors.latitude" class="text-[10px] text-rose-400 font-mono mt-1 block">
                ⚠ {{ cctvErrors.latitude }}
              </span>
            </div>
            <div>
              <label class="text-[10px] font-mono text-slate-400 block mb-1">Longitude:</label>
              <input
                v-model="activeCctv.longitude"
                type="text"
                inputmode="decimal"
                placeholder="Contoh: 107.619122"
                :class="[
                  'w-full bg-[#0a0e17] border rounded px-3 py-1.5 text-xs font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 transition-colors',
                  cctvErrors.longitude ? 'border-rose-500 focus:ring-rose-500' : 'border-[#283548] focus:ring-blue-500'
                ]"
                @keydown="onCoordinateKeydown"
                @input="handleCoordinateInput($event, activeCctv, 'longitude', cctvErrors)"
                @paste="handleCoordinatePaste($event, activeCctv, 'longitude', cctvErrors)"
              />
              <span v-if="cctvErrors.longitude" class="text-[10px] text-rose-400 font-mono mt-1 block">
                ⚠ {{ cctvErrors.longitude }}
              </span>
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
          :error="speakerErrors.name"
          @input="speakerErrors.name = ''"
        />

        <div class="grid grid-cols-2 gap-3">
          <Select
            v-model="activeSpeaker.siteId"
            label="Lokasi Site"
            :placeholder="cctvStore.sites.length ? '-- Pilih Lokasi Site --' : '-- Belum Ada Site Terdaftar --'"
            :options="siteOptions"
            :error="speakerErrors.siteId"
            @change="speakerErrors.siteId = ''"
            required
          />
          <Select
            v-model="activeSpeaker.zoneId"
            label="Zona Paging"
            :placeholder="cctvStore.zones.length ? '-- Pilih Zona Paging --' : '-- Belum Ada Zona Terdaftar --'"
            :options="zoneOptions"
          />
        </div>

        <div>
          <label class="text-xs font-medium text-slate-300 block mb-1">Gateway WHIP Ingestion Endpoint URL: <span class="text-rose-400">*</span></label>
          <div class="flex gap-2">
            <input
              v-model="activeSpeaker.whipUrl"
              type="text"
              placeholder="https://broadcast.example.com/audio_raw_{n}/whip"
              :class="[
                'flex-1 bg-[#111827] border rounded-md px-3 py-2 text-xs font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 transition-colors',
                speakerErrors.whipUrl || audioUrlDuplicateWarning ? 'border-rose-500 focus:ring-rose-500 text-rose-200' : 'border-[#283548] focus:ring-blue-500'
              ]"
              required
              @input="speakerErrors.whipUrl = ''"
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
          <span v-if="speakerErrors.whipUrl" class="text-[10px] text-rose-400 font-mono mt-1 block">
            ⚠ {{ speakerErrors.whipUrl }}
          </span>
          <span v-else class="text-[10px] text-slate-500 font-mono mt-1 block">
            Format: https:// atau http:// endpoint MediaMTX WHIP (RFC 9329)
          </span>

          <!-- Alert jika URL stream audio WHIP telah ada -->
          <div
            v-if="audioUrlDuplicateWarning"
            class="mt-2 p-2.5 rounded bg-rose-950/80 border border-rose-600/70 text-rose-300 text-xs font-mono flex items-start gap-2"
          >
            <AlertCircle class="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
            <div>
              <strong class="font-bold">Peringatan:</strong> URL stream audio WHIP ini sudah terdaftar pada speaker <strong>{{ audioUrlDuplicateWarning.id }} - {{ audioUrlDuplicateWarning.name }}</strong>. Harap gunakan URL WHIP yang berbeda.
            </div>
          </div>
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
                v-model="activeSpeaker.latitude"
                type="text"
                inputmode="decimal"
                placeholder="Contoh: -6.917464"
                :class="[
                  'w-full bg-[#0a0e17] border rounded px-3 py-1.5 text-xs font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 transition-colors',
                  speakerErrors.latitude ? 'border-rose-500 focus:ring-rose-500' : 'border-[#283548] focus:ring-blue-500'
                ]"
                @keydown="onCoordinateKeydown"
                @input="handleCoordinateInput($event, activeSpeaker, 'latitude', speakerErrors)"
                @paste="handleCoordinatePaste($event, activeSpeaker, 'latitude', speakerErrors)"
              />
              <span v-if="speakerErrors.latitude" class="text-[10px] text-rose-400 font-mono mt-1 block">
                ⚠ {{ speakerErrors.latitude }}
              </span>
            </div>
            <div>
              <label class="text-[10px] font-mono text-slate-400 block mb-1">Longitude:</label>
              <input
                v-model="activeSpeaker.longitude"
                type="text"
                inputmode="decimal"
                placeholder="Contoh: 107.619122"
                :class="[
                  'w-full bg-[#0a0e17] border rounded px-3 py-1.5 text-xs font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 transition-colors',
                  speakerErrors.longitude ? 'border-rose-500 focus:ring-rose-500' : 'border-[#283548] focus:ring-blue-500'
                ]"
                @keydown="onCoordinateKeydown"
                @input="handleCoordinateInput($event, activeSpeaker, 'longitude', speakerErrors)"
                @paste="handleCoordinatePaste($event, activeSpeaker, 'longitude', speakerErrors)"
              />
              <span v-if="speakerErrors.longitude" class="text-[10px] text-rose-400 font-mono mt-1 block">
                ⚠ {{ speakerErrors.longitude }}
              </span>
            </div>
          </div>
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
import { ref, reactive, computed, watch, onMounted, onUnmounted } from 'vue'
import { Radio, AlertCircle } from '@lucide/vue'
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

// Pagination (Identik dengan Event & Alarm, Default 5 Item per Tabel)
const cctvPage = ref(1)
const cctvPageSize = ref(5)
const speakerPage = ref(1)
const speakerPageSize = ref(5)

const cctvTotalPages = computed(() => Math.ceil(cctvStore.cameras.length / cctvPageSize.value) || 1)
const paginatedCctvCameras = computed(() => {
  const start = (cctvPage.value - 1) * cctvPageSize.value
  return cctvStore.cameras.slice(start, start + cctvPageSize.value)
})

const speakerTotalPages = computed(() => Math.ceil(audioStore.activeDevices.length / speakerPageSize.value) || 1)
const paginatedAudioDevices = computed(() => {
  const start = (speakerPage.value - 1) * speakerPageSize.value
  return audioStore.activeDevices.slice(start, start + speakerPageSize.value)
})

function isZoneActive(zoneId, row = null) {
  if (!zoneId) return false
  if (cctvStore.zones.some((z) => z.id === zoneId)) return true
  if (row?.zone && !row.zone.deletedAt) return true
  return false
}

function getZoneName(row) {
  if (!row.zoneId || !isZoneActive(row.zoneId, row)) return 'Unassigned'
  const matched = cctvStore.zones.find((z) => z.id === row.zoneId)
  return matched?.name || row.zone?.name || 'Unassigned'
}

function getAudioZoneName(row) {
  if (!row.zoneId || !isZoneActive(row.zoneId, row)) return 'Unassigned'
  const matched = cctvStore.zones.find((z) => z.id === row.zoneId)
  return matched?.name || row.zone?.name || row.zoneName || 'Unassigned'
}

function normalizeUrl(url) {
  if (!url || typeof url !== 'string') return ''
  return url.trim().toLowerCase().replace(/\/+$/, '')
}

function isUrlMatch(urlA, urlB) {
  const a = normalizeUrl(urlA)
  const b = normalizeUrl(urlB)
  if (!a || !b) return false
  if (a === b) return true
  if (a.endsWith('/' + b) || b.endsWith('/' + a)) return true
  return false
}

const cctvUrlDuplicateWarning = computed(() => {
  const url = activeCctv.streamUrl
  if (!url || !url.trim()) return null
  return cctvStore.cameras.find((c) => {
    if (modalMode.value === 'edit' && c.id === activeCctv.id) return false
    return (
      isUrlMatch(url, c.streamUrl) ||
      isUrlMatch(url, c.adapterConfig?.streamUrl) ||
      isUrlMatch(url, c.streamKey) ||
      isUrlMatch(url, c.host)
    )
  }) || null
})

const audioUrlDuplicateWarning = computed(() => {
  const url = activeSpeaker.whipUrl
  if (!url || !url.trim()) return null
  return audioStore.activeDevices.find((d) => {
    if (modalMode.value === 'edit' && d.id === activeSpeaker.id) return false
    return (
      isUrlMatch(url, d.whipUrl) ||
      isUrlMatch(url, d.adapterConfig?.whipUrl) ||
      isUrlMatch(url, d.host)
    )
  }) || null
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
  latitude: '',
  longitude: '',
  sampleRate: 16000,
  channels: 1
})

const activeCctv = reactive({
  id: '',
  name: '',
  siteId: '',
  zoneId: '',
  streamUrl: '',
  latitude: '',
  longitude: '',
  description: ''
})

const cctvErrors = reactive({
  name: '',
  siteId: '',
  streamUrl: '',
  latitude: '',
  longitude: ''
})

const speakerErrors = reactive({
  name: '',
  siteId: '',
  whipUrl: '',
  latitude: '',
  longitude: ''
})

function resetCctvErrors() {
  cctvErrors.name = ''
  cctvErrors.siteId = ''
  cctvErrors.streamUrl = ''
  cctvErrors.latitude = ''
  cctvErrors.longitude = ''
}

function resetSpeakerErrors() {
  speakerErrors.name = ''
  speakerErrors.siteId = ''
  speakerErrors.whipUrl = ''
  speakerErrors.latitude = ''
  speakerErrors.longitude = ''
}

// Sanitasi & validasi ketat input koordinat GPS (hanya membolehkan angka, tanda minus di awal, dan satu titik desimal)
function sanitizeCoordinate(value) {
  if (value === null || value === undefined) return ''
  const str = String(value).trim()
  if (!str) return ''

  const isNegative = str.startsWith('-')
  let cleaned = str.replace(/[^0-9.]/g, '')

  const dotIndex = cleaned.indexOf('.')
  if (dotIndex !== -1) {
    const beforeDot = cleaned.substring(0, dotIndex)
    const afterDot = cleaned.substring(dotIndex + 1).replace(/\./g, '')
    cleaned = beforeDot + '.' + afterDot
  }

  return (isNegative ? '-' : '') + cleaned
}

function onCoordinateKeydown(event) {
  const allowedControlKeys = [
    'Backspace',
    'Delete',
    'Tab',
    'Escape',
    'Enter',
    'ArrowLeft',
    'ArrowRight',
    'ArrowUp',
    'ArrowDown',
    'Home',
    'End'
  ]
  if (allowedControlKeys.includes(event.key)) return
  if (event.ctrlKey || event.metaKey || event.altKey) return

  // Hanya angka 0-9 yang diizinkan
  if (/^[0-9]$/.test(event.key)) return

  const input = event.target
  const val = input.value || ''
  const start = input.selectionStart ?? 0
  const end = input.selectionEnd ?? 0
  const selectedText = val.substring(start, end)

  // Tanda minus '-' hanya diizinkan di posisi paling awal (indeks 0) dan hanya boleh satu
  if (event.key === '-') {
    if (start === 0 && (!val.includes('-') || selectedText.includes('-'))) {
      return
    }
  }

  // Tanda titik '.' desimal hanya diizinkan satu kali
  if (event.key === '.') {
    if (!val.includes('.') || selectedText.includes('.')) {
      return
    }
  }

  // Tolak semua tombol alfabet (termasuk huruf 'e', 'E') dan simbol lainnya
  event.preventDefault()
}

function handleCoordinateInput(event, targetObj, key, errorsObj) {
  const cleanValue = sanitizeCoordinate(event.target.value)
  targetObj[key] = cleanValue
  if (event.target.value !== cleanValue) {
    event.target.value = cleanValue
  }
  if (errorsObj && errorsObj[key]) {
    errorsObj[key] = ''
  }
}

function handleCoordinatePaste(event, targetObj, key, errorsObj) {
  event.preventDefault()
  const pastedText = (event.clipboardData || window.clipboardData)?.getData('text') || ''
  const input = event.target
  const val = input.value || ''
  const start = input.selectionStart ?? 0
  const end = input.selectionEnd ?? val.length
  const newCombined = val.substring(0, start) + pastedText + val.substring(end)
  const cleanValue = sanitizeCoordinate(newCombined)
  targetObj[key] = cleanValue
  input.value = cleanValue
  if (errorsObj && errorsObj[key]) {
    errorsObj[key] = ''
  }
}

const siteOptions = computed(() => {
  return cctvStore.sites.map((s) => ({
    value: s.id,
    label: `${s.id} - ${s.name}`
  }))
})

const zoneOptions = computed(() => {
  return [
    { value: '', label: '-- Unassigned (Tanpa Zona) --' },
    ...cctvStore.zones.map((z) => {
      const site = cctvStore.sites.find((s) => s.id === z.siteId)
      const siteLabel = site ? site.name : z.siteId
      return {
        value: z.id,
        label: `${z.id} - ${z.name} (${siteLabel})`
      }
    })
  ]
})

// Sinkronkan siteId secara otomatis saat memilih zona di modal
watch(() => activeCctv.zoneId, (newZoneId) => {
  if (newZoneId) {
    const matched = cctvStore.zones.find((z) => z.id === newZoneId)
    if (matched && matched.siteId) {
      activeCctv.siteId = matched.siteId
    }
  }
})

watch(() => activeSpeaker.zoneId, (newZoneId) => {
  if (newZoneId) {
    const matched = cctvStore.zones.find((z) => z.id === newZoneId)
    if (matched && matched.siteId) {
      activeSpeaker.siteId = matched.siteId
    }
  }
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
    resetSpeakerErrors()
    activeSpeaker.id = ''
    activeSpeaker.name = ''
    activeSpeaker.siteId = cctvStore.sites[0]?.id || ''
    activeSpeaker.zoneId = cctvStore.zones[0]?.id || ''
    activeSpeaker.whipUrl = ''
    activeSpeaker.latitude = ''
    activeSpeaker.longitude = ''
    speakerModalOpen.value = true
  } else {
    resetCctvErrors()
    activeCctv.id = ''
    activeCctv.name = ''
    activeCctv.siteId = cctvStore.sites[0]?.id || ''
    activeCctv.zoneId = cctvStore.zones[0]?.id || ''
    activeCctv.streamUrl = ''
    activeCctv.latitude = ''
    activeCctv.longitude = ''
    activeCctv.description = ''
    cctvModalOpen.value = true
  }
}

function handleEditCctv(row) {
  modalMode.value = 'edit'
  resetCctvErrors()
  activeCctv.id = row.id
  activeCctv.name = row.name
  activeCctv.siteId = row.siteId || ''
  activeCctv.zoneId = (row.zoneId && isZoneActive(row.zoneId)) ? row.zoneId : ''
  activeCctv.streamUrl = row.streamUrl || ''
  activeCctv.latitude = row.latitude !== null && row.latitude !== undefined ? String(row.latitude) : ''
  activeCctv.longitude = row.longitude !== null && row.longitude !== undefined ? String(row.longitude) : ''
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
  resetCctvErrors()
  let hasError = false

  if (!activeCctv.name.trim()) {
    cctvErrors.name = 'Nama kamera wajib diisi.'
    hasError = true
  }

  if (!activeCctv.siteId) {
    cctvErrors.siteId = 'Lokasi site wajib dipilih.'
    hasError = true
  }

  if (!activeCctv.streamUrl?.trim()) {
    cctvErrors.streamUrl = 'URL stream kamera wajib diisi.'
    hasError = true
  } else {
    const streamLower = activeCctv.streamUrl.trim().toLowerCase()
    const validCctvProtocols = ['http://', 'https://', 'rtsp://', 'rtsps://', 'ws://', 'wss://']
    const hasValidProtocol = validCctvProtocols.some(proto => streamLower.startsWith(proto))
    if (!hasValidProtocol) {
      cctvErrors.streamUrl = 'Protokol URL tidak valid. Gunakan http://, https://, rtsp://, rtsps://, atau ws(s)://'
      hasError = true
    } else if (cctvUrlDuplicateWarning.value) {
      cctvErrors.streamUrl = `URL stream ini sudah terdaftar pada kamera ${cctvUrlDuplicateWarning.value.id} (${cctvUrlDuplicateWarning.value.name}).`
      hasError = true
    }
  }

  const hasLat = activeCctv.latitude !== null && activeCctv.latitude !== '' && activeCctv.latitude !== undefined
  const hasLng = activeCctv.longitude !== null && activeCctv.longitude !== '' && activeCctv.longitude !== undefined

  if (hasLat && !hasLng) {
    cctvErrors.longitude = 'Longitude wajib diisi jika Latitude diisi.'
    hasError = true
  } else if (!hasLat && hasLng) {
    cctvErrors.latitude = 'Latitude wajib diisi jika Longitude diisi.'
    hasError = true
  }

  if (hasLat) {
    const lat = Number(activeCctv.latitude)
    if (isNaN(lat) || lat < -90 || lat > 90 || activeCctv.latitude === '-' || activeCctv.latitude === '.') {
      cctvErrors.latitude = 'Latitude harus berupa angka antara -90 dan 90.'
      hasError = true
    }
  }

  if (hasLng) {
    const lng = Number(activeCctv.longitude)
    if (isNaN(lng) || lng < -180 || lng > 180 || activeCctv.longitude === '-' || activeCctv.longitude === '.') {
      cctvErrors.longitude = 'Longitude harus berupa angka antara -180 dan 180.'
      hasError = true
    }
  }

  if (hasError) {
    return
  }

  const matchedZone = cctvStore.zones.find((z) => z.id === activeCctv.zoneId)
  const siteId = matchedZone ? matchedZone.siteId : activeCctv.siteId

  const payload = {
    name: activeCctv.name.trim(),
    siteId: siteId,
    zoneId: activeCctv.zoneId || null,
    streamUrl: activeCctv.streamUrl?.trim() || null,
    latitude: hasLat && !isNaN(Number(activeCctv.latitude)) ? Number(activeCctv.latitude) : null,
    longitude: hasLng && !isNaN(Number(activeCctv.longitude)) ? Number(activeCctv.longitude) : null,
    description: activeCctv.description?.trim() || null
  }

  try {
    if (modalMode.value === 'create') {
      const created = await cctvStore.createCamera(payload)
      cctvModalOpen.value = false
      toast.success('Kamera Didaftarkan', `ID otomatis ${created.id} berhasil dibuat dan disimpan!`)
    } else {
      await cctvStore.updateCamera(activeCctv.id, payload)
      cctvModalOpen.value = false
      toast.success('Kamera Diperbarui', `Data kamera ${activeCctv.id} berhasil diperbarui.`)
    }
    await cctvStore.fetchSitesAndZones()
  } catch (err) {
    const errMsg = err.message || 'Terjadi kesalahan'
    if (errMsg.toLowerCase().includes('name') || errMsg.toLowerCase().includes('nama')) {
      cctvErrors.name = errMsg
    } else if (errMsg.toLowerCase().includes('stream') || errMsg.toLowerCase().includes('url')) {
      cctvErrors.streamUrl = errMsg
    } else {
      toast.error('Gagal Menyimpan Kamera', errMsg)
    }
  }
}

function handleEditSpeaker(row) {
  modalMode.value = 'edit'
  resetSpeakerErrors()
  activeSpeaker.id = row.id
  activeSpeaker.name = row.name
  activeSpeaker.siteId = row.siteId || ''
  activeSpeaker.zoneId = (row.zoneId && isZoneActive(row.zoneId)) ? row.zoneId : ''
  activeSpeaker.whipUrl = row.whipUrl || ''
  activeSpeaker.latitude = row.latitude !== null && row.latitude !== undefined ? String(row.latitude) : ''
  activeSpeaker.longitude = row.longitude !== null && row.longitude !== undefined ? String(row.longitude) : ''
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

async function saveSpeaker() {
  resetSpeakerErrors()
  let hasError = false

  if (!activeSpeaker.name.trim()) {
    speakerErrors.name = 'Nama speaker wajib diisi.'
    hasError = true
  }

  if (!activeSpeaker.siteId) {
    speakerErrors.siteId = 'Lokasi site wajib dipilih.'
    hasError = true
  }

  if (!activeSpeaker.whipUrl?.trim()) {
    speakerErrors.whipUrl = 'URL WHIP wajib diisi.'
    hasError = true
  } else {
    const whipLower = activeSpeaker.whipUrl.trim().toLowerCase()
    const validAudioProtocols = ['https://', 'http://', 'wss://', 'ws://']
    const hasValidProtocol = validAudioProtocols.some(proto => whipLower.startsWith(proto))
    if (!hasValidProtocol) {
      speakerErrors.whipUrl = 'Protokol URL tidak valid. Gunakan https:// atau http:// (endpoint WHIP).'
      hasError = true
    } else if (audioUrlDuplicateWarning.value) {
      speakerErrors.whipUrl = `URL stream audio WHIP sudah terdaftar pada speaker ${audioUrlDuplicateWarning.value.id} (${audioUrlDuplicateWarning.value.name}).`
      hasError = true
    }
  }

  const hasSpeakerLat = activeSpeaker.latitude !== null && activeSpeaker.latitude !== '' && activeSpeaker.latitude !== undefined
  const hasSpeakerLng = activeSpeaker.longitude !== null && activeSpeaker.longitude !== '' && activeSpeaker.longitude !== undefined

  if (hasSpeakerLat && !hasSpeakerLng) {
    speakerErrors.longitude = 'Longitude wajib diisi jika Latitude diisi.'
    hasError = true
  } else if (!hasSpeakerLat && hasSpeakerLng) {
    speakerErrors.latitude = 'Latitude wajib diisi jika Longitude diisi.'
    hasError = true
  }

  if (hasSpeakerLat) {
    const lat = Number(activeSpeaker.latitude)
    if (isNaN(lat) || lat < -90 || lat > 90 || activeSpeaker.latitude === '-' || activeSpeaker.latitude === '.') {
      speakerErrors.latitude = 'Latitude harus berupa angka antara -90 dan 90.'
      hasError = true
    }
  }

  if (hasSpeakerLng) {
    const lng = Number(activeSpeaker.longitude)
    if (isNaN(lng) || lng < -180 || lng > 180 || activeSpeaker.longitude === '-' || activeSpeaker.longitude === '.') {
      speakerErrors.longitude = 'Longitude harus berupa angka antara -180 dan 180.'
      hasError = true
    }
  }

  if (hasError) {
    return
  }

  const matchedZone = cctvStore.zones.find(z => z.id === activeSpeaker.zoneId)
  const siteId = matchedZone ? matchedZone.siteId : activeSpeaker.siteId
  const zoneName = matchedZone?.name || '-'

  try {
    if (modalMode.value === 'create') {
      const created = await audioStore.createDevice({
        name: activeSpeaker.name.trim(),
        siteId: siteId,
        zoneId: activeSpeaker.zoneId || null,
        zoneName: zoneName,
        whipUrl: activeSpeaker.whipUrl.trim(),
        latitude: hasSpeakerLat && !isNaN(Number(activeSpeaker.latitude)) ? Number(activeSpeaker.latitude) : null,
        longitude: hasSpeakerLng && !isNaN(Number(activeSpeaker.longitude)) ? Number(activeSpeaker.longitude) : null
      })
      speakerModalOpen.value = false
      toast.success('Speaker Didaftarkan', `ID otomatis ${created.id} (16kHz Mono) berhasil dibuat!`)
    } else {
      await audioStore.updateDevice(activeSpeaker.id, {
        name: activeSpeaker.name.trim(),
        siteId: siteId,
        zoneId: activeSpeaker.zoneId || null,
        zoneName: zoneName,
        whipUrl: activeSpeaker.whipUrl.trim(),
        latitude: hasSpeakerLat && !isNaN(Number(activeSpeaker.latitude)) ? Number(activeSpeaker.latitude) : null,
        longitude: hasSpeakerLng && !isNaN(Number(activeSpeaker.longitude)) ? Number(activeSpeaker.longitude) : null
      })
      speakerModalOpen.value = false
      toast.success('Speaker Diperbarui', `Data ${activeSpeaker.id} berhasil diperbarui.`)
    }
    await cctvStore.fetchSitesAndZones()
  } catch (err) {
    const errMsg = err.message || 'Terjadi kesalahan'
    if (errMsg.toLowerCase().includes('name') || errMsg.toLowerCase().includes('nama')) {
      speakerErrors.name = errMsg
    } else if (errMsg.toLowerCase().includes('whip') || errMsg.toLowerCase().includes('url')) {
      speakerErrors.whipUrl = errMsg
    } else {
      toast.error('Gagal Menyimpan Speaker', errMsg)
    }
  }
}

async function confirmDelete() {
  deleteConfirmOpen.value = false
  if (!toDeleteDevice.value) return

  try {
    if (deleteType.value === 'AUDIO') {
      await audioStore.deleteDevice(toDeleteDevice.value.id)
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
    audioStore.fetchAudioDevices(),
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
