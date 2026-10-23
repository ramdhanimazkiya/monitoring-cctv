<template>
  <div class="space-y-6">
    <!-- View Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#283548]">
      <div>
        <div class="flex items-center gap-2">
          <h2 class="text-lg font-bold text-slate-100 tracking-tight">Audio Paging Console</h2>
        </div>
        <p class="text-xs text-slate-400 mt-0.5 font-mono">
          Transmisi Push-to-Talk (PTT) mikrofon <strong>16 kHz Mono</strong> paralel ke MediaMTX via WebRTC WHIP (RFC 9329).
        </p>
      </div>

      <!-- Quick Actions -->
      <div class="flex items-center gap-2 flex-wrap">
        <button
          type="button"
          :disabled="isRefreshing"
          class="flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-[#151d2e] hover:bg-[#1f2b42] text-xs font-mono text-slate-300 border border-[#283548] transition-colors cursor-pointer disabled:opacity-50"
          title="Sinkronkan data speaker & zona terbaru"
          @click="handleRefreshSpeakers"
        >
          <RefreshCw :class="['w-3.5 h-3.5 text-blue-400', isRefreshing ? 'animate-spin' : '']" />
          <span>{{ isRefreshing ? 'Menyinkronkan...' : 'Refresh Speaker' }}</span>
        </button>

        <button
          type="button"
          :disabled="pingLoading"
          class="flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-[#151d2e] hover:bg-[#1f2b42] text-xs font-mono text-slate-300 border border-[#283548] transition-colors cursor-pointer disabled:opacity-50"
          title="Uji ping gateway WHIP (otomatis setiap 10 detik)"
          @click="executePing({ silent: false })"
        >
          <Radio :class="['w-3.5 h-3.5 text-emerald-400', pingLoading ? 'animate-spin' : 'animate-pulse']" />
          <span>{{ pingLoading ? 'Ping...' : `Auto-Ping: 10s (${avgLatency !== null ? `${avgLatency}ms` : '-'})` }}</span>
        </button>

        <!-- <button
          type="button"
          :disabled="isTransmitting"
          class="flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-rose-950/60 hover:bg-rose-900/80 text-xs font-mono text-rose-300 border border-rose-800/60 transition-colors cursor-pointer disabled:opacity-50"
          title="Kunci seluruh speaker terdaftar untuk siaran darurat"
          @click="lockAllSpeakersEmergency"
        >
          <Siren class="w-3.5 h-3.5 text-rose-400 animate-pulse" />
          <span>Emergency Lock All</span>
        </button> -->
      </div>
    </div>

    <!-- Main Grid Layout -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <!-- LEFT: Speaker Selection Hub & PTT Transmitter (7 cols) -->
      <div class="lg:col-span-7 space-y-4">
        <!-- Target Selection Card (Hierarchical Selection: Master -> Zone -> Speaker) -->
        <Card title="Pilih Target Speaker & Zona" subtitle="Pilih kombinasi speaker individual atau broadcast per zona">
          <template #actions>
            <span v-if="isTransmitting" class="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-950/80 text-rose-300 border border-rose-800 flex items-center gap-1 animate-pulse">
              <Lock class="w-3 h-3 text-rose-400" />
              Target Terkunci (Sedang Siaran)
            </span>
            <span v-else class="text-[10px] font-mono text-slate-500">
              Bisa dibuka-tutup per zona
            </span>
          </template>

          <div class="space-y-3">
            <!-- 1. Master Checkbox: All Broadcasting -->
            <div
              class="p-3 rounded-xl border transition-all select-none flex items-center justify-between"
              :class="[
                isTransmitting
                  ? 'opacity-60 cursor-not-allowed bg-[#0b101b] border-[#222d3d]'
                  : 'cursor-pointer hover:border-slate-600',
                isAllBroadcasting
                  ? 'bg-blue-950/40 border-blue-500/60 shadow-xs shadow-blue-500/10'
                  : isMasterPartial
                  ? 'bg-[#151d2e] border-blue-600/40'
                  : 'bg-[#0d121d] border-[#283548]'
              ]"
              @click="!isTransmitting && toggleMasterAll()"
            >
              <div class="flex items-center gap-2.5">
                <div
                  class="w-4.5 h-4.5 rounded flex items-center justify-center transition-colors border shrink-0"
                  :class="[
                    isAllBroadcasting
                      ? 'bg-blue-600 border-blue-400 text-white'
                      : isMasterPartial
                      ? 'bg-blue-900 border-blue-500 text-blue-200'
                      : 'bg-[#111827] border-slate-600 text-transparent'
                  ]"
                >
                  <Check v-if="isAllBroadcasting" class="w-3 h-3 stroke-[3]" />
                  <span v-else-if="isMasterPartial" class="w-2 h-0.5 bg-blue-300 rounded-full"></span>
                </div>
                <div>
                  <h3 class="text-xs font-bold text-slate-100 font-mono tracking-tight flex items-center gap-2">
                    All Broadcasting
                    <span v-if="isAllBroadcasting" class="text-[9px] px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-300 border border-blue-400/30">
                      SEMUA AKTIF
                    </span>
                    <span v-if="isTransmitting" class="text-[9px] px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1">
                      <Lock class="w-2.5 h-2.5" /> TERKUNCI
                    </span>
                  </h3>
                  <p class="text-[10px] text-slate-400 mt-0.5">
                    Aktifkan siaran serentak ke seluruh speaker di semua zona yang tersedia.
                  </p>
                </div>
              </div>

              <!-- Counter pill -->
              <span class="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-[#111827] border border-[#283548] text-blue-400">
                {{ selectedSpeakers.length }}/{{ audioStore.activeDevices.length }} Aktif
              </span>
            </div>

            <!-- Action Toolbar: Single Switching Button (Buka Semua / Tutup Semua) -->
            <div class="flex items-center justify-between px-1 py-0.5 text-xs font-mono">
              <span class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <span>Daftar Zona</span>
                <span class="text-[10px] text-slate-500 font-normal">({{ zoneGroups.length }} Zona)</span>
              </span>

              <button
                type="button"
                class="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#111827] hover:bg-[#1a2336] text-[11px] font-mono border transition-all cursor-pointer active:scale-95"
                :class="[
                  isAllZonesOpen
                    ? 'border-slate-600 text-slate-300 hover:border-slate-500'
                    : 'border-[#283548] text-blue-400 hover:border-blue-500/50'
                ]"
                :title="isAllZonesOpen ? 'Tutup semua daftar speaker zona' : 'Buka semua daftar speaker zona'"
                @click="toggleAllZones"
              >
                <component
                  :is="isAllZonesOpen ? ChevronsUp : ChevronsDown"
                  class="w-3.5 h-3.5 transition-transform duration-150"
                  :class="isAllZonesOpen ? 'text-slate-400' : 'text-blue-400'"
                />
                <span>{{ isAllZonesOpen ? 'Tutup Semua' : 'Buka Semua' }}</span>
              </button>
            </div>

            <!-- 2. Zone Groups & Speakers (Collapsible Accordion per Zona) -->
            <div class="space-y-2.5">
              <div
                v-for="group in zoneGroups"
                :key="group.key"
                class="rounded-xl border border-[#283548] bg-[#0d121d] overflow-hidden transition-all duration-200"
              >
                <!-- Zone Header Row (Click to toggle collapse, checkbox has click.stop) -->
                <div
                  class="p-2.5 px-3 bg-[#111827] border-b border-[#283548] flex items-center justify-between cursor-pointer select-none transition-colors hover:bg-[#151f33]"
                  @click="toggleZoneOpen(group.key)"
                >
                  <div class="flex items-center gap-2.5">
                    <!-- Zone Checkbox (Stops propagation so checking doesn't collapse) -->
                    <button
                      type="button"
                      :disabled="isTransmitting"
                      class="w-4 h-4 rounded flex items-center justify-center transition-colors border shrink-0 focus:outline-none"
                      :class="[
                        isTransmitting
                          ? 'opacity-60 cursor-not-allowed'
                          : 'cursor-pointer',
                        group.isAllChecked
                          ? 'bg-blue-600 border-blue-400 text-white'
                          : group.isPartial
                          ? 'bg-blue-900 border-blue-500 text-blue-200'
                          : 'bg-[#0a0e17] border-slate-600 text-transparent'
                      ]"
                      @click.stop="!isTransmitting && toggleZone(group)"
                    >
                      <Check v-if="group.isAllChecked" class="w-3 h-3 stroke-[3]" />
                      <span v-else-if="group.isPartial" class="w-2 h-0.5 bg-blue-300 rounded-full"></span>
                    </button>

                    <div class="flex items-center gap-1.5">
                      <span class="text-xs font-bold text-slate-200 font-mono">
                        {{ group.name }}
                      </span>
                      <span
                        class="text-[10px] font-mono px-1.5 py-0.2 rounded border"
                        :class="[
                          group.isAllChecked
                            ? 'bg-blue-950/70 border-blue-700 text-blue-300 font-bold'
                            : group.isPartial
                            ? 'bg-slate-800 border-slate-700 text-slate-300'
                            : 'bg-[#0a0e17] border-[#283548] text-slate-500'
                        ]"
                      >
                        {{ group.selectedCount }}/{{ group.total }}
                      </span>
                    </div>
                  </div>

                  <!-- Right side: Chevron collapse toggle -->
                  <div class="flex items-center gap-2 text-slate-400">
                    <span class="text-[10px] font-mono text-slate-500 hidden sm:inline">
                      {{ isZoneOpen(group.key) ? 'Tutup' : 'Buka' }}
                    </span>
                    <component
                      :is="isZoneOpen(group.key) ? ChevronDown : ChevronRight"
                      class="w-4 h-4 text-slate-400 transition-transform duration-150"
                    />
                  </div>
                </div>

                <!-- Individual Speakers inside Zone (Collapsible Body) -->
                <div
                  v-show="isZoneOpen(group.key)"
                  class="p-2.5 pl-3.5 space-y-1.5 border-l-2 border-blue-500/30 ml-3 my-2 mr-2"
                >
                  <div
                    v-for="speaker in group.speakers"
                    :key="speaker.id"
                    class="p-2 rounded-lg border transition-all select-none flex flex-col sm:flex-row sm:items-center justify-between gap-1.5"
                    :class="[
                      isTransmitting
                        ? 'opacity-70 cursor-not-allowed'
                        : 'cursor-pointer hover:border-slate-600',
                      selectedSpeakerIds.includes(speaker.id)
                        ? 'bg-[#151e30] border-blue-500/40 text-slate-100'
                        : 'bg-[#0a0e17] border-[#1e2a3b] text-slate-400'
                    ]"
                    @click="!isTransmitting && toggleSpeaker(speaker.id)"
                  >
                    <!-- Left: Checkbox + Name + Status -->
                    <div class="flex items-center gap-2">
                      <div
                        class="w-3.5 h-3.5 rounded flex items-center justify-center transition-colors border shrink-0"
                        :class="[
                          selectedSpeakerIds.includes(speaker.id)
                            ? 'bg-blue-600 border-blue-400 text-white'
                            : 'bg-[#111827] border-slate-600 text-transparent'
                        ]"
                      >
                        <Check class="w-2.5 h-2.5 stroke-[3]" />
                      </div>

                      <div>
                        <div class="flex items-center gap-1.5 flex-wrap">
                          <span class="text-xs font-semibold font-mono text-slate-200">
                            {{ speaker.name }}
                          </span>
                          <span class="text-[10px] font-mono text-slate-500">
                            ({{ speaker.id }})
                          </span>

                          <!-- Dynamic Status Pill -->
                          <span
                            class="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9px] font-mono font-bold"
                            :class="[
                              isTransmitting && selectedSpeakerIds.includes(speaker.id)
                                ? 'bg-rose-950 text-rose-300 border border-rose-700 animate-pulse'
                                : speaker.status === 'ONLINE'
                                ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                : 'bg-slate-800 text-slate-400 border border-slate-700'
                            ]"
                          >
                            <span
                              :class="[
                                'w-1.5 h-1.5 rounded-full',
                                isTransmitting && selectedSpeakerIds.includes(speaker.id)
                                  ? 'bg-rose-400 animate-ping'
                                  : speaker.status === 'ONLINE'
                                  ? 'bg-emerald-400'
                                  : 'bg-slate-500'
                              ]"
                            ></span>
                            {{ isTransmitting && selectedSpeakerIds.includes(speaker.id) ? 'ON AIR' : (speaker.status || 'ONLINE') }}
                          </span>
                        </div>

                        <!-- Stream endpoints tags -->
                        <div class="flex items-center gap-1.5 mt-0.5 text-[9px] font-mono flex-wrap">
                          <span class="text-blue-400 bg-blue-950/60 px-1.5 py-0.2 rounded border border-blue-800/40" :title="speaker.whipUrl">
                            WHIP: {{ formatEndpoint(speaker.whipUrl) }}
                          </span>
                          <span v-if="speaker.rtspUrl" class="text-purple-300 bg-purple-950/60 px-1.5 py-0.2 rounded border border-purple-800/40" :title="speaker.rtspUrl">
                            RTSP: {{ formatRtsp(speaker.rtspUrl) }}
                          </span>
                        </div>
                      </div>
                    </div>

                    <!-- Right: Latency & Volume -->
                    <div class="flex items-center gap-2 text-[10px] font-mono text-slate-400 shrink-0 self-end sm:self-center">
                      <span v-if="speaker.latencyMs" class="text-emerald-400">
                        {{ speaker.latencyMs }}ms
                      </span>
                      <span>Vol: {{ speaker.volume || 80 }}%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>

        <!-- 3. Minimalist & Aesthetic PTT Transmitter Station -->
        <Card title="Transmitter Push-to-Talk" subtitle="Mikrofon 16 kHz Mono dengan Opus Codec via WebRTC WHIP">
          <!-- Error banner if mic / network fails -->
          <div
            v-if="whipAudio.publishError.value"
            class="mb-4 p-3 rounded-lg bg-rose-950/70 border border-rose-800 text-xs text-rose-200 flex items-start gap-2.5"
          >
            <AlertCircle class="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div class="flex-1">
              <strong class="font-semibold block">Gagal Melakukan Transmisi</strong>
              <span>{{ whipAudio.publishError.value }}</span>
            </div>
            <button
              type="button"
              class="text-rose-400 hover:text-white text-xs underline shrink-0 ml-2 cursor-pointer"
              @click="whipAudio.publishError.value = ''"
            >
              Tutup
            </button>
          </div>

          <div
            class="p-8 flex flex-col items-center justify-center bg-[#0d121d] border border-[#283548] rounded-xl relative select-none overflow-hidden transition-all duration-300"
            :class="{ 'ring-2 ring-rose-500/70 shadow-lg shadow-rose-950/50': isTransmitting }"
          >
            <!-- Top Status Indicator -->
            <div class="absolute top-3.5 left-4 text-[11px] font-mono text-slate-400 flex items-center gap-2">
              <span
                :class="[
                  'w-2 h-2 rounded-full',
                  isTransmitting
                    ? 'bg-rose-500 animate-ping'
                    : 'bg-emerald-400'
                ]"
              ></span>
              <span>STATUS:
                <strong :class="isTransmitting ? 'text-rose-400 animate-pulse' : 'text-emerald-400'">
                  {{ isTransmitting ? 'LIVE BROADCASTING' : 'READY TO TALK' }}
                </strong>
              </span>
            </div>

            <!-- Top Right Duration / Target Count -->
            <div class="absolute top-3.5 right-4 text-[11px] font-mono">
              <span v-if="isTransmitting" class="text-rose-400 font-bold tracking-wider animate-pulse flex items-center gap-1.5">
                <span class="w-2 h-2 rounded-full bg-rose-500"></span>
                ON AIR: {{ formattedDuration }}
              </span>
              <span v-else class="text-slate-400">
                {{ selectedSpeakers.length }} Speaker Dipilih
              </span>
            </div>

            <!-- Central Aesthetic PTT Button -->
            <div class="my-5 flex flex-col items-center">
              <button
                type="button"
                :disabled="whipAudio.publishState.value === 'connecting' || whipAudio.publishState.value === 'requesting_mic'"
                :class="[
                  'w-40 h-40 rounded-full flex flex-col items-center justify-center font-bold tracking-wider uppercase select-none focus:outline-none cursor-pointer transition-all duration-200 active:scale-95',
                  isTransmitting
                    ? 'bg-gradient-to-tr from-rose-600 via-rose-500 to-red-600 text-white border-4 border-rose-300 shadow-[0_0_50px_rgba(244,63,94,0.45)] animate-pulse'
                    : whipAudio.publishState.value === 'connecting'
                    ? 'bg-gradient-to-tr from-amber-600 to-yellow-600 text-white border-4 border-amber-300 animate-pulse'
                    : 'bg-gradient-to-tr from-blue-600 via-indigo-600 to-blue-500 hover:from-blue-500 hover:to-indigo-500 text-white border-4 border-blue-400/80 shadow-[0_0_35px_rgba(59,130,246,0.3)] hover:scale-102'
                ]"
                @click="togglePtt"
              >
                <component
                  :is="isTransmitting ? Radio : whipAudio.publishState.value === 'connecting' ? Activity : Mic"
                  :class="['w-10 h-10 mb-2', isTransmitting ? 'animate-bounce' : '']"
                />
                <span class="text-xs font-mono font-extrabold tracking-wider">
                  {{
                    isTransmitting
                      ? 'SELESAI BICARA'
                      : whipAudio.publishState.value === 'connecting'
                      ? 'CONNECTING...'
                      : 'MULAI BICARA'
                  }}
                </span>
                <span class="text-[10px] font-mono opacity-80 mt-0.5">
                  {{ isTransmitting ? '(KLIK STOP)' : '(PUSH TO TALK)' }}
                </span>
              </button>

              <!-- Status subtext -->
              <p class="text-xs font-mono mt-4 text-center">
                <span v-if="isTransmitting" class="text-rose-400 font-bold flex items-center gap-1.5 justify-center">
                  🎙️ Siaran aktif ke {{ selectedSpeakers.length }} speaker ({{ selectedEndpoints.length }} stream WHIP paralel)
                </span>
                <span v-else-if="whipAudio.publishState.value === 'connecting'" class="text-amber-400">
                  Menghubungkan WebRTC ke {{ selectedEndpoints.length }} endpoint WHIP...
                </span>
                <span v-else class="text-slate-400">
                  Klik tombol untuk mulai transmisi atau tekan tombol <strong>SPASI</strong>.
                </span>
              </p>
            </div>

            <!-- Live Audio VU Meter (Level Indikator Suara 16kHz) -->
            <div class="w-full max-w-md mt-2 pt-4 border-t border-[#1e293b] flex flex-col items-center">
              <div class="w-full flex items-center justify-between text-xs font-mono text-slate-400 mb-2">
                <span class="flex items-center gap-1.5">
                  <Activity class="w-3.5 h-3.5 text-blue-400" />
                  <span>Mic Meter (16 kHz Mono):</span>
                </span>
                <span :class="isTransmitting ? 'text-emerald-400 font-bold' : 'text-slate-500'">
                  {{ isTransmitting ? `${whipAudio.audioLevel.value}%` : '0%' }}
                </span>
              </div>

              <!-- 24-Segment VU Meter Bar -->
              <div class="w-full grid grid-cols-24 gap-1 h-3.5 bg-[#111827] p-0.5 rounded border border-[#283548]">
                <div
                  v-for="bar in 24"
                  :key="bar"
                  :class="[
                    'h-full rounded-xs transition-colors duration-75',
                    getBarColor(bar)
                  ]"
                ></div>
              </div>
            </div>

            <!-- Spacebar Shortcut Hint -->
            <div class="mt-4 flex items-center justify-between w-full max-w-md pt-2 text-xs font-mono text-slate-400">
              <span class="text-[11px] text-slate-400 bg-[#151d2e] px-2.5 py-1 rounded border border-[#283548]">
                Pintasan Toggle: <kbd class="text-slate-200 font-bold font-mono">SPASI</kbd>
              </span>
              <span class="text-[11px] text-slate-500 font-mono">
                Deduplikasi: {{ selectedEndpoints.length }} endpoint unik
              </span>
            </div>
          </div>
        </Card>
      </div>

      <!-- RIGHT: Active Target Summary & Audio Specifications (5 cols) -->
      <div class="lg:col-span-5 space-y-4">
        <!-- Target Speaker Detail Card -->
        <Card title="Speaker Terpilih Saat Ini" subtitle="Daftar speaker aktif yang akan menerima siaran PTT">
          <div class="space-y-3 text-xs font-mono">
            <div v-if="selectedSpeakers.length === 0" class="py-6 text-center text-slate-500">
              Tidak ada speaker yang dipilih. Centang minimal 1 speaker di sebelah kiri.
            </div>

            <div v-else class="space-y-2 max-h-60 overflow-y-auto pr-1">
              <div
                v-for="spk in selectedSpeakers"
                :key="spk.id"
                class="p-2.5 rounded-lg bg-[#0d121d] border border-[#283548] flex items-center justify-between"
              >
                <div>
                  <div class="flex items-center gap-1.5">
                    <span class="font-bold text-slate-200">{{ spk.name }}</span>
                    <span class="text-[10px] text-slate-500 font-mono">({{ spk.id }})</span>
                  </div>
                  <span class="text-[10px] text-slate-400 block mt-0.5">
                    {{ spk.zoneName || 'Zona Standar' }}
                  </span>
                </div>

                <div class="text-right">
                  <span class="font-mono text-[10px] text-blue-400 block truncate max-w-[150px]" :title="spk.whipUrl">
                    {{ formatEndpoint(spk.whipUrl) }}
                  </span>
                  <span class="text-[10px] text-emerald-400 block">
                    {{ isTransmitting ? 'ON AIR' : (spk.status || 'ONLINE') }}
                  </span>
                </div>
              </div>
            </div>

            <!-- Summary metrics footer -->
            <div class="pt-2 border-t border-[#1e293b] flex items-center justify-between text-[11px] text-slate-400">
              <span>Total Speaker: <strong class="text-slate-200">{{ selectedSpeakers.length }}</strong></span>
              <span>Total Stream WHIP: <strong class="text-blue-400">{{ selectedEndpoints.length }}</strong></span>
            </div>
          </div>
        </Card>

        <!-- Technical Diagnostics Card (16kHz Mono Specifications) -->
        <Card title="Spesifikasi WebRTC WHIP" subtitle="Parameter audio yang dikirim ke gateway MediaMTX">
          <div class="p-3.5 bg-[#0d121d] border border-[#283548] rounded-lg text-xs font-mono space-y-2.5">
            <div class="flex items-center justify-between">
              <span class="text-slate-400">Sample Rate:</span>
              <span class="text-emerald-400 font-bold">16.000 Hz (16 kHz Wideband)</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-slate-400">Kanal Audio:</span>
              <span class="text-emerald-400 font-bold">Mono (1 Channel)</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-slate-400">Audio Codec:</span>
              <span class="text-slate-200 font-medium">Opus (ptime=10; stereo=0)</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-slate-400">Ingest Protocol:</span>
              <span class="text-blue-400 font-bold">RFC 9329 WHIP</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-slate-400">Transceiver Mode:</span>
              <span class="text-purple-300 font-medium">sendonly (Parallel STUN)</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-slate-400">Media Gateway:</span>
              <span class="text-slate-200 font-medium truncate max-w-[180px]">stream.zakuyu.fun</span>
            </div>
          </div>
        </Card>

        <!-- Recent Broadcast History Card -->
        <Card title="Riwayat Siaran PTT" subtitle="Catatan transmisi audio pada sesi ini">
          <div v-if="sessionLogs.length === 0" class="py-6 text-center text-xs font-mono text-slate-500">
            Belum ada siaran yang dilakukan pada sesi ini.
          </div>
          <div v-else class="space-y-2 max-h-48 overflow-y-auto text-xs font-mono">
            <div
              v-for="(log, idx) in sessionLogs"
              :key="idx"
              class="p-2.5 rounded bg-[#0d121d] border border-[#283548] flex items-center justify-between"
            >
              <div>
                <p class="font-semibold text-slate-200">{{ log.target }}</p>
                <p class="text-[10px] text-slate-500">{{ log.time }} • 16kHz Mono</p>
              </div>
              <div class="text-right">
                <span class="text-emerald-400 font-bold">{{ log.duration }}</span>
                <p class="text-[10px] text-slate-500">SELESAI</p>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { Card } from '../components/ui/index.js'
import { useToast } from '../composables/useToast.js'
import { useWhipAudio } from '../composables/useWhipAudio.js'
import { useAudioDevicesStore } from '../stores/audioDevices.js'
import { useCctvStore } from '../stores/cctv.js'
import {
  Mic,
  Radio,
  Activity,
  AlertCircle,
  Check,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  ChevronsDown,
  ChevronsUp,
  Lock,
  Siren
} from '@lucide/vue'

const toast = useToast()
const whipAudio = useWhipAudio()
const audioStore = useAudioDevicesStore()
const cctvStore = useCctvStore()

// Selected speaker IDs (Array of string ID, e.g. ['AUD-0001', 'AUD-0002'])
// Default: Kosong (tidak otomatis memilih semua speaker)
const selectedSpeakerIds = ref([])

// Collapsible zone tracking: Set of zone keys that are open/expanded
// Default: Empty Set -> seluruh zona tertutup secara default
const openedZones = ref(new Set())
const isRefreshing = ref(false)
const pingLoading = ref(false)
const avgLatency = ref(null)
const sessionLogs = ref([])
let autoPingTimer = null

// Group active speakers dynamically by zone
const zoneGroups = computed(() => {
  const map = new Map()

  audioStore.activeDevices.forEach((spk) => {
    const zoneKey = spk.zoneId || spk.zoneName || 'DEFAULT_ZONE'
    const zoneName = spk.zoneName && spk.zoneName !== '-' ? spk.zoneName : (spk.zoneId || 'Zona Standar')

    if (!map.has(zoneKey)) {
      map.set(zoneKey, {
        key: zoneKey,
        name: zoneName,
        speakers: []
      })
    }
    map.get(zoneKey).speakers.push(spk)
  })

  return Array.from(map.values()).map((group) => {
    const total = group.speakers.length
    const selectedCount = group.speakers.filter(s => selectedSpeakerIds.value.includes(s.id)).length
    const isAllChecked = total > 0 && selectedCount === total
    const isPartial = selectedCount > 0 && selectedCount < total

    return {
      ...group,
      total,
      selectedCount,
      isAllChecked,
      isPartial
    }
  })
})

function isZoneOpen(zoneKey) {
  return openedZones.value.has(zoneKey)
}

function toggleZoneOpen(zoneKey) {
  const next = new Set(openedZones.value)
  if (next.has(zoneKey)) {
    next.delete(zoneKey)
  } else {
    next.add(zoneKey)
  }
  openedZones.value = next
}

function openAllZones() {
  const next = new Set()
  zoneGroups.value.forEach(g => next.add(g.key))
  openedZones.value = next
}

function closeAllZones() {
  openedZones.value = new Set()
}

function lockAllSpeakersEmergency() {
  if (isTransmitting.value) return
  selectedSpeakerIds.value = audioStore.activeDevices.map(s => s.id)
  toast.warning(
    'Emergency Lock Aktif',
    `Seluruh ${audioStore.activeDevices.length} speaker terdaftar telah dikunci untuk siaran darurat.`
  )
}

const isAllZonesOpen = computed(() => {
  if (zoneGroups.value.length === 0) return false
  return zoneGroups.value.every(g => openedZones.value.has(g.key))
})

function toggleAllZones() {
  if (isAllZonesOpen.value) {
    closeAllZones()
  } else {
    openAllZones()
  }
}

// Master "All Broadcasting" logic (Disabled when transmitting)
const totalActive = computed(() => audioStore.activeDevices.length)
const totalSelected = computed(() => selectedSpeakerIds.value.length)

const isAllBroadcasting = computed({
  get: () => {
    return totalActive.value > 0 && totalSelected.value === totalActive.value
  },
  set: (val) => {
    if (isTransmitting.value) return
    if (val) {
      selectedSpeakerIds.value = audioStore.activeDevices.map(s => s.id)
    } else {
      selectedSpeakerIds.value = []
    }
  }
})

const isMasterPartial = computed(() => {
  return totalSelected.value > 0 && totalSelected.value < totalActive.value
})

function toggleMasterAll() {
  if (isTransmitting.value) return
  isAllBroadcasting.value = !isAllBroadcasting.value
}

function toggleZone(group) {
  if (isTransmitting.value) return
  const zoneSpeakerIds = group.speakers.map(s => s.id)
  if (group.isAllChecked) {
    // Deselect all speakers in this zone
    selectedSpeakerIds.value = selectedSpeakerIds.value.filter(id => !zoneSpeakerIds.includes(id))
  } else {
    // Select all speakers in this zone
    const current = new Set(selectedSpeakerIds.value)
    zoneSpeakerIds.forEach(id => current.add(id))
    selectedSpeakerIds.value = Array.from(current)
  }
}

function toggleSpeaker(speakerId) {
  if (isTransmitting.value) return
  const idx = selectedSpeakerIds.value.indexOf(speakerId)
  if (idx > -1) {
    selectedSpeakerIds.value.splice(idx, 1)
  } else {
    selectedSpeakerIds.value.push(speakerId)
  }
}

// Selected Speaker Objects
const selectedSpeakers = computed(() => {
  return audioStore.activeDevices.filter(s => selectedSpeakerIds.value.includes(s.id))
})

// Selected unique WHIP endpoints (Prevents duplicate connection conflicts)
const selectedEndpoints = computed(() => {
  const rawUrls = selectedSpeakers.value.map(s => s.whipUrl?.trim()).filter(Boolean)
  return [...new Set(rawUrls)]
})

const isTransmitting = computed(() => whipAudio.isPublishing.value)

const formattedDuration = computed(() => {
  const sec = whipAudio.durationSeconds.value
  const mins = Math.floor(sec / 60).toString().padStart(2, '0')
  const secs = (sec % 60).toString().padStart(2, '0')
  return `${mins}:${secs}`
})

function formatEndpoint(url) {
  if (!url) return '-'
  try {
    const parsed = new URL(url)
    return parsed.pathname.replace(/^\//, '')
  } catch {
    return url
  }
}

function formatRtsp(url) {
  if (!url) return '-'
  return url.replace('rtsp://stream.zakuyu.fun:8554/', '')
}

// Visualizer helper for 24-segment VU meter
function getBarColor(barIndex) {
  const percentage = (barIndex / 24) * 100
  if (percentage > whipAudio.audioLevel.value) {
    return 'bg-[#151f30]'
  }
  if (barIndex > 19) return 'bg-rose-500 shadow-xs shadow-rose-500/50'
  if (barIndex > 14) return 'bg-amber-400'
  return 'bg-emerald-400'
}

// Ping Gateway: Otomatis tiap 10 detik & manual trigger
async function executePing({ silent = false } = {}) {
  // Hindari mengganggu transmisi jika WebRTC sedang aktif
  if (isTransmitting.value) return

  // Tentukan target: speaker terpilih jika ada, atau seluruh speaker aktif di store
  const targets = selectedSpeakers.value.length > 0
    ? selectedSpeakers.value
    : audioStore.activeDevices

  if (targets.length === 0) {
    if (!silent) {
      toast.warning('Speaker Kosong', 'Tidak ada perangkat speaker aktif untuk diping.')
    }
    return
  }

  if (!silent) {
    pingLoading.value = true
  }

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
      avgLatency.value = Math.round(sum / count)
      if (!silent) {
        toast.success('Ping Berhasil', `Rata-rata latensi ${count} speaker: ${avgLatency.value} ms`)
      }
    } else {
      if (!silent) {
        toast.warning('Ping Selesai', 'Tidak ada respons dari gateway WHIP.')
      }
    }
  } catch (err) {
    if (!silent) {
      toast.error('Ping Gagal', err.message || 'Kesalahan saat melakukan ping')
    }
  } finally {
    if (!silent) {
      pingLoading.value = false
    }
  }
}

// Refresh Speaker & Zone Data
async function handleRefreshSpeakers() {
  isRefreshing.value = true
  try {
    await Promise.all([
      audioStore.fetchDevices(),
      cctvStore.fetchSitesAndZones()
    ])

    // Retain valid selected IDs only (Jangan auto-select semua speaker)
    const existingIds = new Set(audioStore.activeDevices.map(s => s.id))
    selectedSpeakerIds.value = selectedSpeakerIds.value.filter(id => existingIds.has(id))

    toast.success('Data Disinkronkan', 'Data speaker & zona berhasil diperbarui.')
  } catch (err) {
    toast.error('Gagal Sinkronisasi', err.message || 'Gagal memuat ulang data')
  } finally {
    isRefreshing.value = false
  }
}

// PTT Transmission Logic
function togglePtt() {
  if (isTransmitting.value) {
    stopCurrentTransmission()
  } else {
    startCurrentTransmission()
  }
}

async function startCurrentTransmission() {
  if (isTransmitting.value) return

  if (selectedSpeakers.value.length === 0) {
    toast.error('Pilih Speaker', 'Harap pilih minimal satu speaker aktif untuk melakukan siaran.')
    return
  }

  if (selectedEndpoints.value.length === 0) {
    toast.error('Endpoint Kosong', 'Speaker yang dipilih belum memiliki URL WHIP yang valid.')
    return
  }

  const spkCount = selectedSpeakers.value.length
  const streamCount = selectedEndpoints.value.length
  const zoneCount = new Set(selectedSpeakers.value.map(s => s.zoneName || s.zoneId)).size

  toast.info(
    'Menghubungkan WHIP WebRTC',
    `Membuka mikrofon 16kHz Mono ke ${spkCount} speaker (${streamCount} stream paralel di ${zoneCount} zona)...`
  )

  const success = await whipAudio.startPublish(selectedEndpoints.value)
  if (success) {
    selectedSpeakers.value.forEach((s) => audioStore.setTransmissionStatus(s.id, true))
    toast.success('ON AIR: Siaran Aktif', `Terhubung ke ${spkCount} speaker di ${zoneCount} zona`)
  } else {
    toast.error('Gagal Siaran Audio', whipAudio.publishError.value || 'Gagal memulai koneksi audio.')
  }
}

function stopCurrentTransmission() {
  if (whipAudio.isPublishing.value) {
    const finalSec = whipAudio.durationSeconds.value
    const mins = Math.floor(finalSec / 60).toString().padStart(2, '0')
    const secs = (finalSec % 60).toString().padStart(2, '0')
    const spkCount = selectedSpeakers.value.length
    const zoneCount = new Set(selectedSpeakers.value.map(s => s.zoneName || s.zoneId)).size

    sessionLogs.value.unshift({
      target: `${spkCount} Speaker (${zoneCount} Zona)`,
      duration: `${mins}:${secs}`,
      time: new Date().toLocaleTimeString('id-ID')
    })

    whipAudio.stopPublish()

    selectedSpeakers.value.forEach((s) => audioStore.setTransmissionStatus(s.id, false))
    toast.info('Siaran Selesai', 'Sesi WHIP ditutup, kanal audio dilepaskan.')
  }
}

// Keyboard Spacebar PTT shortcut (Toggle On/Off)
function handleKeyDown(e) {
  if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return
  if (e.code === 'Space' && !e.repeat) {
    e.preventDefault()
    togglePtt()
  }
}

onMounted(async () => {
  window.addEventListener('keydown', handleKeyDown)
  await cctvStore.fetchSitesAndZones()

  // Default: Kosongkan seleksi (tidak auto-select semua speaker)
  // Jalankan ping awal secara hening (silent)
  executePing({ silent: true })

  // Auto-ping otomatis tiap 10 detik
  autoPingTimer = setInterval(() => {
    executePing({ silent: true })
  }, 10000)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
  if (autoPingTimer) {
    clearInterval(autoPingTimer)
    autoPingTimer = null
  }
  stopCurrentTransmission()
})
</script>
