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

    <!-- METRIK OPERASI MONITORING: CCTV, AUDIO, EVENT & ALARM, SITE & ZONE -->
    <div class="space-y-3">
      <!-- Rekap CCTV & Audio -->
      <div class="bg-[#0d131f] hover:bg-[#0f1726] border border-[#1e2a3b] hover:border-[#28384f] rounded-xl p-3.5 font-mono text-xs shadow-xs transition-all duration-200">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 divide-y md:divide-y-0 md:divide-x divide-[#1e2a3b]">
          <!-- Kolom 1: Kamera CCTV -->
          <div class="flex items-center justify-between pr-0 md:pr-6 group">
            <div class="flex items-center gap-2.5">
              <div class="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400 shrink-0 group-hover:bg-blue-500/30 group-hover:border-blue-400/60 group-hover:text-blue-300 transition-all duration-200">
                <Video class="w-4 h-4" />
              </div>
              <div>
                <span class="text-[10px] text-slate-400 uppercase tracking-wider block font-bold group-hover:text-slate-200 transition-colors duration-200">Kamera CCTV</span>
                <span class="text-[11px] text-slate-300">Total: <strong class="text-slate-100 font-bold">{{ stats.cctv.total }}</strong> Unit Kamera</span>
              </div>
            </div>
            <div class="flex items-center gap-4">
              <div class="text-right">
                <span class="text-[10px] text-slate-400 block">Online:</span>
                <span class="text-base font-bold text-emerald-400 flex items-center justify-end gap-1.5">
                  <span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  {{ stats.cctv.online }}
                </span>
              </div>
              <div class="h-7 w-px bg-[#1e2a3b]"></div>
              <div class="text-right">
                <span class="text-[10px] text-slate-400 block">Offline:</span>
                <span class="text-base font-bold text-rose-400 flex items-center justify-end gap-1.5">
                  <span class="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                  {{ stats.cctv.offline }}
                </span>
              </div>
              <template v-if="stats.cctv.unknown">
                <div class="h-7 w-px bg-[#1e2a3b]"></div>
                <div class="text-right">
                  <span class="text-[10px] text-slate-400 block">Unknown:</span>
                  <span class="text-base font-bold text-slate-400 flex items-center justify-end gap-1.5">
                    <span class="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                    {{ stats.cctv.unknown }}
                  </span>
                </div>
              </template>
            </div>
          </div>

          <!-- Kolom 2: Audio Speakers -->
          <div class="flex items-center justify-between pt-3 md:pt-0 pl-0 md:pl-6 group">
            <div class="flex items-center gap-2.5">
              <div class="w-8 h-8 rounded-lg bg-purple-600/20 border border-purple-500/40 flex items-center justify-center text-purple-400 shrink-0 group-hover:bg-purple-500/30 group-hover:border-purple-400/60 group-hover:text-purple-300 transition-all duration-200">
                <Volume2 class="w-4 h-4" />
              </div>
              <div>
                <span class="text-[10px] text-slate-400 uppercase tracking-wider block font-bold group-hover:text-slate-200 transition-colors duration-200">Audio Speaker</span>
                <span class="text-[11px] text-slate-300">Total: <strong class="text-slate-100 font-bold">{{ stats.audio.total }}</strong> Unit Speaker</span>
              </div>
            </div>
            <div class="flex items-center gap-4">
              <div class="text-right">
                <span class="text-[10px] text-slate-400 block">Online:</span>
                <span class="text-base font-bold text-emerald-400 flex items-center justify-end gap-1.5">
                  <span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  {{ stats.audio.online }}
                </span>
              </div>
              <div class="h-7 w-px bg-[#1e2a3b]"></div>
              <div class="text-right">
                <span class="text-[10px] text-slate-400 block">Offline:</span>
                <span class="text-base font-bold text-rose-400 flex items-center justify-end gap-1.5">
                  <span class="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                  {{ stats.audio.offline }}
                </span>
              </div>
              <template v-if="stats.audio.unknown">
                <div class="h-7 w-px bg-[#1e2a3b]"></div>
                <div class="text-right">
                  <span class="text-[10px] text-slate-400 block">Unknown:</span>
                  <span class="text-base font-bold text-slate-400 flex items-center justify-end gap-1.5">
                    <span class="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                    {{ stats.audio.unknown }}
                  </span>
                </div>
              </template>
            </div>
          </div>
        </div>
      </div>

      <!-- Rekap Event & Alarm serta Site & Zone -->
      <div class="bg-[#0d131f] hover:bg-[#0f1726] border border-[#1e2a3b] hover:border-[#28384f] rounded-xl p-3.5 font-mono text-xs shadow-xs transition-all duration-200">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 divide-y md:divide-y-0 md:divide-x divide-[#1e2a3b]">
          <!-- Kolom 1: Event & Alarm -->
          <div class="flex items-center justify-between pr-0 md:pr-6 group">
            <div class="flex items-center gap-2.5">
              <div class="w-8 h-8 rounded-lg bg-rose-600/20 border border-rose-500/40 flex items-center justify-center text-rose-400 shrink-0 group-hover:bg-rose-500/30 group-hover:border-rose-400/60 group-hover:text-rose-300 transition-all duration-200">
                <AlertTriangle class="w-4 h-4" />
              </div>
              <div>
                <span class="text-[10px] text-slate-400 uppercase tracking-wider block font-bold group-hover:text-slate-200 transition-colors duration-200">Event & Alarm</span>
                <span class="text-[11px] text-slate-300">Histori {{ eventsStore.stats.total }} Insiden Tercatat</span>
              </div>
            </div>
            <div class="flex items-center gap-4">
              <div class="text-right">
                <span class="text-[10px] text-slate-400 block">Aktif (Kritis):</span>
                <span class="text-base font-bold text-rose-400 flex items-center justify-end gap-1.5">
                  <span
                    class="w-1.5 h-1.5 rounded-full bg-rose-400"
                    :class="{ 'animate-ping': eventsStore.stats.offlineActiveCount > 0 }"
                  ></span>
                  {{ eventsStore.stats.offlineActiveCount }}
                </span>
              </div>
              <div class="h-7 w-px bg-[#1e2a3b]"></div>
              <div class="text-right">
                <span class="text-[10px] text-slate-400 block">Pulih (Resolved):</span>
                <span class="text-base font-bold text-emerald-400 flex items-center justify-end gap-1.5">
                  <span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  {{ eventsStore.stats.resolvedCount }}
                </span>
              </div>
            </div>
          </div>

          <!-- Kolom 2: Site & Zone -->
          <div class="flex items-center justify-between pt-3 md:pt-0 pl-0 md:pl-6 group">
            <div class="flex items-center gap-2.5">
              <div class="w-8 h-8 rounded-lg bg-amber-600/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0 group-hover:bg-amber-500/30 group-hover:border-amber-400/60 group-hover:text-amber-300 transition-all duration-200">
                <MapPin class="w-4 h-4" />
              </div>
              <div>
                <span class="text-[10px] text-slate-400 uppercase tracking-wider block font-bold group-hover:text-slate-200 transition-colors duration-200">Site & Zone</span>
                <span class="text-[11px] text-slate-300">Hierarki Fasilitas & Area</span>
              </div>
            </div>
            <div class="flex items-center gap-4">
              <div class="text-right">
                <span class="text-[10px] text-slate-400 block">Total Site:</span>
                <span class="text-base font-bold text-amber-400 flex items-center justify-end gap-1.5">
                  <span class="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                  {{ cctvStore.sites.length }} Site
                </span>
              </div>
              <div class="h-7 w-px bg-[#1e2a3b]"></div>
              <div class="text-right">
                <span class="text-[10px] text-slate-400 block">Total Zona:</span>
                <span class="text-base font-bold text-indigo-400 flex items-center justify-end gap-1.5">
                  <span class="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
                  {{ cctvStore.zones.length }} Zona
                </span>
              </div>
            </div>
          </div>
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
          <!-- <template #actions>
            <span class="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/70 border border-emerald-800 text-emerald-300">
              Leaflet Engine
            </span>
          </template> -->
          <div class="h-80 w-full">
            <DeviceMap :devices="displayedMapDevices" navigate-on-select />
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

        <!-- Emergency Audio Paging (Locks 100% Registered Speakers, Minimal & Non-Intrusive) -->
        <div class="p-3.5 rounded-xl bg-gradient-to-br from-[#120f18] via-[#0d121d] to-[#0a0f1a] border border-rose-900/50 shadow-md space-y-3 relative overflow-hidden border-t-2 border-t-rose-500/70">
          <!-- Ambient glowing background effect -->
          <div class="absolute -right-10 -bottom-10 w-32 h-32 bg-rose-600/5 rounded-full blur-2xl pointer-events-none"></div>

          <!-- Header Bar -->
          <div class="flex items-center justify-between pb-2 border-b border-[#241a28]">
            <div class="flex items-center gap-2">
              <div class="w-7 h-7 rounded-lg bg-rose-600/20 border border-rose-500/40 flex items-center justify-center text-rose-400 shrink-0">
                <Siren :class="['w-4 h-4', isPagingTransmitting ? 'animate-bounce text-rose-300' : 'animate-pulse text-rose-400']" />
              </div>
              <div>
                <div class="flex items-center gap-1.5 flex-wrap">
                  <h4 class="text-xs font-bold text-slate-100 font-mono tracking-tight">
                    Emergency Audio Paging
                  </h4>
                  <span
                    v-if="isPagingTransmitting"
                    class="text-[9px] px-1.5 py-0.2 rounded bg-rose-500/25 text-rose-300 border border-rose-500/40 font-bold flex items-center gap-1 animate-pulse"
                  >
                    <span class="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping"></span>
                    ON AIR: {{ pagingDuration }}
                  </span>
                </div>
                <p class="text-[10px] text-slate-400 font-mono">
                  Transmisi darurat serentak ke seluruh speaker
                </p>
              </div>
            </div>

            <!-- Right: Auto-Ping status + Link to full console -->
            <div class="flex items-center gap-2">
              <span class="text-[10px] font-mono text-slate-400 flex items-center gap-1" title="Ping otomatis tiap 10 detik">
                <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>{{ avgAudioLatency !== null ? `${avgAudioLatency}ms` : '10s' }}</span>
              </span>
              <router-link
                to="/audio"
                class="text-[10px] font-mono text-blue-400 hover:text-blue-300 hover:underline flex items-center gap-0.5"
                title="Buka Konsol Audio Paging Penuh (Pilih Per Zona)"
              >
                <span>Pilih Zona</span>
                <span>→</span>
              </router-link>
            </div>
          </div>

          <!-- Emergency Lock Status Banner -->
          <!-- <div class="flex items-center justify-between gap-2 p-2 rounded-lg bg-[#180f1a] border border-rose-900/40 text-xs font-mono">
            <div class="flex items-center gap-2 text-rose-300">
              <Lock class="w-3.5 h-3.5 text-rose-400 shrink-0 animate-pulse" />
              <div class="text-[11px]">
                <strong class="text-rose-200">Seluruh {{ totalPagingActive }} Speaker Terkunci</strong>
                <span class="text-[10px] text-rose-400/80 block sm:inline sm:ml-1 font-normal">(100% Emergency Lock)</span>
              </div>
            </div>

            <span class="text-[10px] font-mono text-slate-400 shrink-0">
              16 kHz Mono
            </span>
          </div> -->

          <!-- Emergency Trigger Button -->
          <button
            type="button"
            :disabled="whipAudio.publishState.value === 'connecting' || whipAudio.publishState.value === 'requesting_mic'"
            :class="[
              'w-full py-2 px-3 rounded-lg text-xs font-mono font-bold flex items-center justify-center gap-2 transition-all select-none shadow-md cursor-pointer active:scale-98',
              isPagingTransmitting
                ? 'bg-rose-600 hover:bg-rose-500 text-white border-2 border-rose-300 shadow-glow-offline animate-pulse ring-4 ring-rose-500/40'
                : whipAudio.publishState.value === 'connecting'
                ? 'bg-amber-600 text-white border border-amber-400 animate-pulse'
                : 'bg-gradient-to-r from-rose-700 via-rose-600 to-red-600 hover:from-rose-600 hover:to-red-500 text-white border border-rose-400/60 shadow-lg shadow-rose-950/40 hover:shadow-rose-900/60'
            ]"
            @click="toggleEmergencyPaging"
          >
            <Radio v-if="isPagingTransmitting" class="w-4 h-4 animate-bounce" />
            <Activity v-else-if="whipAudio.publishState.value === 'connecting'" class="w-4 h-4 animate-spin" />
            <Siren v-else class="w-4 h-4 text-rose-200" />
            <span>
              {{
                isPagingTransmitting
                  ? 'ON AIR — HENTIKAN SIARAN DARURAT'
                  : whipAudio.publishState.value === 'connecting'
                  ? `Menghubungkan ${totalPagingActive} Speaker...`
                  : 'SIARAN DARURAT (PTT LOCK ALL)'
              }}
            </span>
          </button>
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
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
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
  Layers,
  Eye,
  CheckSquare,
  CheckCircle2,
  Radio,
  Mic,
  Activity,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronsDown,
  ChevronsUp,
  Lock,
  Siren
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

// Emergency Audio Paging State (Dashboard locks 100% registered speakers)
const avgAudioLatency = ref(null)
let dashboardPingTimer = null

const isPagingTransmitting = computed(() => whipAudio.isPublishing.value)

const totalPagingActive = computed(() => audioStore.activeDevices.length)

const pagingDuration = computed(() => {
  const sec = whipAudio.durationSeconds.value
  const mins = Math.floor(sec / 60).toString().padStart(2, '0')
  const secs = (sec % 60).toString().padStart(2, '0')
  return `${mins}:${secs}`
})

// Auto-ping execution (every 10 seconds for all registered speakers)
async function executeDashboardAudioPing({ silent = true } = {}) {
  if (isPagingTransmitting.value) return
  const targets = audioStore.activeDevices
  if (targets.length === 0) return

  try {
    const results = await Promise.all(
      targets.map(spk => audioStore.pingDevice(spk.id))
    )
    let sum = 0
    let count = 0
    results.forEach(res => {
      if (res && res.success && typeof res.latency === 'number') {
        sum += res.latency
        count++
      }
    })
    if (count > 0) {
      avgAudioLatency.value = Math.round(sum / count)
      if (!silent) {
        toast.success('Ping Audio', `Rata-rata latensi: ${avgAudioLatency.value}ms`)
      }
    }
  } catch (err) {
    if (!silent) toast.error('Ping Gagal', err.message)
  }
}

// Emergency PTT Broadcast: Automatically locks and publishes to ALL registered speakers
async function toggleEmergencyPaging() {
  const allSpeakers = audioStore.activeDevices

  if (isPagingTransmitting.value) {
    await whipAudio.stopPublish()
    allSpeakers.forEach(s => audioStore.setTransmissionStatus(s.id, false))
    toast.info('Siaran Darurat Selesai', 'Siaran audio darurat telah dihentikan.')
    return
  }

  if (allSpeakers.length === 0) {
    toast.error('Tidak Ada Speaker', 'Tidak ada perangkat speaker aktif yang terdaftar di sistem.')
    return
  }

  const rawUrls = allSpeakers.map(s => s.whipUrl?.trim() || `https://stream.zakuyu.fun/${s.id}/whip`).filter(Boolean)
  const uniqueUrls = [...new Set(rawUrls)]

  if (uniqueUrls.length === 0) {
    toast.error('URL WHIP Kosong', 'Speaker terdaftar belum memiliki endpoint WHIP yang valid.')
    return
  }

  const success = await whipAudio.startPublish(uniqueUrls)
  if (success) {
    allSpeakers.forEach(s => audioStore.setTransmissionStatus(s.id, true))
    toast.success('SIARAN DARURAT AKTIF', `Terhubung secara serentak ke seluruh ${allSpeakers.length} speaker terdaftar.`)
  } else {
    toast.error('Gagal Siaran Darurat', whipAudio.publishError.value || 'Periksa mikrofon atau koneksi WHIP.')
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

  // Auto-ping audio tiap 10 detik di dashboard
  executeDashboardAudioPing({ silent: true })
  dashboardPingTimer = setInterval(() => {
    executeDashboardAudioPing({ silent: true })
  }, 10000)
})

onUnmounted(() => {
  if (whipAudio.isPublishing.value) {
    whipAudio.stopPublish()
  }
  if (dashboardPingTimer) {
    clearInterval(dashboardPingTimer)
    dashboardPingTimer = null
  }
  cctvStore.stopCameraStatusPolling()
})
</script>
