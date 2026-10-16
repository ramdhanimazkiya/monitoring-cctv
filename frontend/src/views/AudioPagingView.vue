<template>
  <div class="space-y-6">
    <!-- View Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#283548]">
      <div>
        <div class="flex items-center gap-2">
          <h2 class="text-lg font-bold text-slate-100 tracking-tight">Audio Paging Console</h2>
          <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-700/60 shadow-xs">
            <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            WHIP 16kHz MONO
          </span>
        </div>
        <p class="text-xs text-slate-400 mt-0.5 font-mono">
          Siaran suara Push-to-Talk (PTT) mikrofon <strong>16 kHz Mono</strong> via WebRTC WHIP (RFC 9329).
        </p>
      </div>

      <!-- Live Dynamic Status & Endpoint Tag -->
      <div class="flex items-center gap-2">
        <button
          type="button"
          :disabled="pingLoading"
          class="flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-[#151d2e] hover:bg-[#1f2b42] text-xs font-mono text-slate-300 border border-[#283548] transition-colors"
          title="Gateway di-ping otomatis setiap 3 detik. Klik untuk ping manual."
          @click="pingCurrentSpeaker(false)"
        >
          <Radio :class="['w-3.5 h-3.5 text-blue-400', pingLoading ? 'animate-spin' : 'animate-pulse']" />
          <span>{{ pingLoading ? 'Ping...' : `Auto-Ping: ${currentSpeakerLatency}ms` }}</span>
        </button>

        <div class="hidden sm:flex items-center gap-2 bg-[#111827] border border-[#283548] px-3 py-1.5 rounded-md text-xs font-mono text-slate-300">
          <span class="text-slate-500">WHIP:</span>
          <span class="text-blue-300 font-semibold truncate max-w-[240px]" :title="selectedWhipUrl">
            {{ selectedWhipUrl }}
          </span>
        </div>
      </div>
    </div>

    <!-- Main PTT Grid Layout -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <!-- LEFT: Primary PTT Station (7 cols) -->
      <div class="lg:col-span-7 space-y-4">
        <Card title="Push-to-Talk (PTT) Transmitter" subtitle="Transmisi mikrofon 16 kHz Mono real-time ke gateway MediaMTX">
          <div class="space-y-4">
            <!-- Target Selection Row -->
            <div>
              <div class="flex items-center justify-between mb-1.5">
                <label class="text-xs font-medium text-slate-300">Pilih Target Speaker / Zona Paging:</label>
                <router-link to="/devices" class="text-[11px] font-mono text-blue-400 hover:text-blue-300">
                  + Kelola Speaker (CRUD) →
                </router-link>
              </div>
              <Select
                v-model="pttTarget"
                :options="targetOptions"
                @update:model-value="handleTargetChange"
              />
            </div>

            <!-- Error Banner (Microphone permission denied / connection error) -->
            <div
              v-if="whipAudio.publishError.value"
              class="p-3 rounded-lg bg-rose-950/60 border border-rose-800 text-xs text-rose-200 flex items-start gap-2.5"
            >
              <AlertCircle class="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div class="flex-1">
                <strong class="font-semibold block">Gagal Melakukan Transmisi WHIP</strong>
                <span>{{ whipAudio.publishError.value }}</span>
              </div>
              <button
                type="button"
                class="text-rose-400 hover:text-white text-xs underline shrink-0 ml-2"
                @click="whipAudio.publishError.value = ''"
              >
                Tutup
              </button>
            </div>

            <!-- Interactive Big PTT Station -->
            <div
              class="p-8 flex flex-col items-center justify-center bg-[#0d121d] border border-[#283548] rounded-xl relative select-none overflow-hidden"
              :class="{ 'ring-2 ring-rose-500/60': isTransmitting }"
            >
              <!-- Top Indicators -->
              <div class="absolute top-3 left-4 text-[10px] font-mono text-slate-400 flex items-center gap-1.5">
                <span :class="['w-2 h-2 rounded-full', isTransmitting ? 'bg-rose-500 animate-ping' : 'bg-emerald-500']"></span>
                <span>STATUS: <strong :class="isTransmitting ? 'text-rose-400' : 'text-emerald-400'">{{ isTransmitting ? 'TRANSMITTING' : currentSpeakerStatus }}</strong></span>
              </div>

              <div class="absolute top-3 right-4 text-[11px] font-mono">
                <span v-if="isTransmitting" class="text-rose-400 font-bold tracking-wider animate-pulse flex items-center gap-1">
                  <span class="w-2 h-2 rounded-full bg-rose-500"></span>
                  ON AIR: {{ formattedDuration }}
                </span>
                <span v-else class="text-slate-400 flex items-center gap-1.5">
                  <span class="text-emerald-400 font-bold">{{ currentSpeakerLatency }}ms</span>
                  <span>latensi</span>
                </span>
              </div>

              <!-- Big PTT Button Center -->
              <div class="my-4 flex flex-col items-center">
                <button
                  type="button"
                  :disabled="whipAudio.publishState.value === 'connecting' || whipAudio.publishState.value === 'requesting_mic'"
                  :class="[
                    'w-40 h-40 rounded-full flex flex-col items-center justify-center font-bold tracking-wider uppercase transition-all duration-150 select-none focus:outline-none shadow-2xl active:scale-95 cursor-pointer',
                    isTransmitting
                      ? 'bg-rose-600 hover:bg-rose-500 text-white border-4 border-rose-300 shadow-glow-offline animate-pulse'
                      : whipAudio.publishState.value === 'connecting'
                      ? 'bg-amber-600 text-white border-4 border-amber-300 animate-pulse'
                      : 'bg-blue-600 hover:bg-blue-500 text-white border-4 border-blue-400 shadow-glow-online hover:scale-102'
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
                    {{ isTransmitting ? '(KLIK STOP)' : '(KLIK PTT)' }}
                  </span>
                </button>

                <!-- Status subtext -->
                <p class="text-xs font-mono mt-4 text-center">
                  <span v-if="isTransmitting" class="text-rose-400 font-bold">
                    Siaran Aktif • Mikrofon 16 kHz Mono Terbuka ke Server WHIP
                  </span>
                  <span v-else-if="whipAudio.publishState.value === 'connecting'" class="text-amber-400">
                    Menghubungkan WebRTC SDP 16kHz Mono ke {{ selectedWhipUrl }}...
                  </span>
                  <span v-else class="text-slate-400">
                    Klik tombol untuk mulai bicara, klik lagi untuk selesai (kursor bebas bergerak).
                  </span>
                </p>
              </div>

              <!-- Live Audio VU Meter (Level Indikator Suara 16kHz) -->
              <div class="w-full max-w-md mt-2 pt-4 border-t border-[#1e293b] flex flex-col items-center">
                <div class="w-full flex items-center justify-between text-xs font-mono text-slate-400 mb-2">
                  <span class="flex items-center gap-1.5">
                    <Activity class="w-3.5 h-3.5 text-blue-400" />
                    <span>Mic Audio Meter (16 kHz Mono):</span>
                  </span>
                  <span :class="isTransmitting ? 'text-emerald-400 font-bold' : 'text-slate-500'">
                    {{ isTransmitting ? `${whipAudio.audioLevel.value}%` : '0%' }}
                  </span>
                </div>

                <!-- 20-Segment VU Meter Bar -->
                <div class="w-full grid grid-cols-20 gap-1 h-3.5 bg-[#111827] p-0.5 rounded border border-[#283548]">
                  <div
                    v-for="bar in 20"
                    :key="bar"
                    :class="[
                      'h-full rounded-xs transition-colors duration-75',
                      getBarColor(bar)
                    ]"
                  ></div>
                </div>
              </div>

              <!-- Control Options (Toggle & Spacebar hint) -->
              <div class="mt-4 flex items-center justify-between w-full max-w-md pt-2 text-xs font-mono text-slate-400">
                <span class="flex items-center gap-1.5 text-slate-300">
                  <span :class="['w-2 h-2 rounded-full', isTransmitting ? 'bg-rose-400 animate-ping' : 'bg-emerald-400']"></span>
                  <span>Mode: <strong>{{ isTransmitting ? 'TRANSMISI AKTIF' : 'KLIK UNTUK BICARA' }}</strong></span>
                </span>

                <span class="text-[11px] text-slate-400 bg-[#151d2e] px-2.5 py-1 rounded border border-[#283548]">
                  Pintasan Toggle: <kbd class="text-slate-200 font-bold font-mono">SPASI</kbd>
                </span>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <!-- RIGHT: Speaker Info, Stream Diagnostics, & Session Logs (5 cols) -->
      <div class="lg:col-span-5 space-y-4">
        <!-- Target Speaker Detail Card (Aktif & Dinamis) -->
        <Card title="Informasi Target Siaran" subtitle="Rincian perangkat tujuan transmisi yang aktif">
          <div class="space-y-3 text-xs font-mono">
            <div class="p-3.5 rounded-lg bg-[#0d121d] border border-[#283548] space-y-2.5">
              <div class="flex items-center justify-between">
                <span class="text-slate-400">Target ID:</span>
                <span class="text-blue-400 font-bold">{{ pttTarget }}</span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-slate-400">Nama Perangkat:</span>
                <span class="text-slate-200 font-semibold">{{ activeTargetName }}</span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-slate-400">Status Speaker:</span>
                <span
                  :class="[
                    'font-bold flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px]',
                    isTransmitting
                      ? 'bg-rose-950 text-rose-300 border border-rose-800 animate-pulse'
                      : currentSpeakerStatus === 'ONLINE'
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                      : 'bg-amber-950 text-amber-300 border border-amber-800'
                  ]"
                >
                  <span :class="['w-1.5 h-1.5 rounded-full', isTransmitting ? 'bg-rose-400 animate-ping' : 'bg-emerald-400']"></span>
                  {{ isTransmitting ? 'ON AIR' : currentSpeakerStatus }}
                </span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-slate-400">Latensi Respons:</span>
                <span class="text-slate-200 font-medium">{{ currentSpeakerLatency }} ms</span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-slate-400">Format Input Mic:</span>
                <span class="text-emerald-400 font-bold">16.000 Hz • Mono (1-Ch)</span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-slate-400">Volume Output:</span>
                <span class="text-slate-200 font-medium">{{ currentSpeakerVolume }}%</span>
              </div>
            </div>
          </div>
        </Card>

        <!-- Technical Diagnostics Card (16kHz Mono Specifications) -->
        <Card title="Spesifikasi Audio WebRTC (16kHz Mono)" subtitle="Parameter audio yang dikirim ke gateway WHIP">
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
              <span class="text-slate-200 font-medium">Opus (sprop-stereo=0; 16kHz)</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-slate-400">Protokol Ingest:</span>
              <span class="text-blue-400 font-bold">RFC 9329 WHIP</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-slate-400">Server Host:</span>
              <span class="text-slate-200 font-medium truncate max-w-[180px]">stream.zakuyu.fun</span>
            </div>
          </div>
        </Card>

        <!-- Recent Broadcast History Card -->
        <Card title="Riwayat Sesi Transmisi" subtitle="Catatan siaran PTT operator saat ini">
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
import { Card, Select } from '../components/ui/index.js'
import { useToast } from '../composables/useToast.js'
import { useWhipAudio } from '../composables/useWhipAudio.js'
import { useAudioDevicesStore } from '../stores/audioDevices.js'
import {
  Mic,
  Radio,
  Activity,
  AlertCircle
} from '@lucide/vue'

const toast = useToast()
const whipAudio = useWhipAudio()
const audioStore = useAudioDevicesStore()

const pttTarget = ref('AUD-0001')
const pingLoading = ref(false)
const sessionLogs = ref([])

// Dynamic Target Options directly from Pinia store
const targetOptions = computed(() => {
  const options = audioStore.activeDevices.map(d => ({
    value: d.id,
    label: `${d.id} - ${d.name} (${d.status})`
  }))

  options.push(
    { value: 'ZON-0001', label: 'ZON-0001 - Semua Speaker Zona Lobby' },
    { value: 'ALL', label: 'ALL - Semua Speaker (Broadcast Seluruh Site)' }
  )

  return options
})

const selectedSpeaker = computed(() => {
  if (pttTarget.value.startsWith('AUD-')) {
    return audioStore.getDeviceById(pttTarget.value)
  }
  return null
})

const selectedWhipUrl = computed(() => {
  return selectedSpeaker.value?.whipUrl || whipAudio.whipUrl.value
})

const currentSpeakerStatus = computed(() => {
  return selectedSpeaker.value?.status || 'ONLINE'
})

const currentSpeakerLatency = computed(() => {
  return selectedSpeaker.value?.latencyMs || 24
})

const currentSpeakerVolume = computed(() => {
  return selectedSpeaker.value?.volume || 80
})

const isTransmitting = computed(() => {
  return whipAudio.isPublishing.value
})

const formattedDuration = computed(() => {
  const sec = whipAudio.durationSeconds.value
  const mins = Math.floor(sec / 60).toString().padStart(2, '0')
  const secs = (sec % 60).toString().padStart(2, '0')
  return `${mins}:${secs}`
})

const activeTargetName = computed(() => {
  if (selectedSpeaker.value) return selectedSpeaker.value.name
  if (pttTarget.value === 'ZON-0001') return 'Zona Lobby (Semua Speaker)'
  if (pttTarget.value === 'ALL') return 'Seluruh Gedung (Site Broadcast)'
  return pttTarget.value
})

let pingInterval = null

function handleTargetChange(targetId) {
  const spk = audioStore.getDeviceById(targetId)
  if (spk?.whipUrl) {
    whipAudio.whipUrl.value = spk.whipUrl
    // Immediately ping newly selected speaker
    pingCurrentSpeaker(true)
  }
}

async function pingCurrentSpeaker(isAuto = false) {
  if (!isAuto) pingLoading.value = true
  const targetId = pttTarget.value.startsWith('AUD-') ? pttTarget.value : 'AUD-0001'
  const result = await audioStore.pingDevice(targetId)
  if (!isAuto) pingLoading.value = false

  if (!isAuto) {
    if (result.success) {
      toast.success('Gateway Responsif', `Koneksi aktif ke ${selectedWhipUrl.value} (${result.latency} ms)`)
    } else {
      toast.error('Koneksi Gagal', result.error || 'Server tidak merespons OPTIONS request')
    }
  }
}

function togglePtt() {
  if (isTransmitting.value) {
    stopCurrentTransmission()
  } else {
    startCurrentTransmission()
  }
}

async function startCurrentTransmission() {
  if (isTransmitting.value) return

  // Update URL in composable
  whipAudio.whipUrl.value = selectedWhipUrl.value

  toast.info('Menghubungkan WHIP (16kHz Mono)', `Membuka mic dan mengirim WebRTC ke ${selectedWhipUrl.value}`)

  const success = await whipAudio.startPublish(selectedWhipUrl.value)
  if (success) {
    // Dynamically update status in store to ON AIR
    audioStore.setTransmissionStatus(pttTarget.value, true)
    toast.success('ON AIR: 16kHz Mono Aktif', `Siaran langsung terhubung ke ${pttTarget.value}`)
  }
}

function stopCurrentTransmission() {
  if (whipAudio.isPublishing.value) {
    const finalSec = whipAudio.durationSeconds.value
    const mins = Math.floor(finalSec / 60).toString().padStart(2, '0')
    const secs = (finalSec % 60).toString().padStart(2, '0')

    // Add to session log
    sessionLogs.value.unshift({
      target: activeTargetName.value,
      duration: `${mins}:${secs}`,
      time: new Date().toLocaleTimeString('id-ID')
    })

    whipAudio.stopPublish()

    // Revert status in store to ONLINE
    audioStore.setTransmissionStatus(pttTarget.value, false)

    toast.info('Siaran Selesai', 'Sesi WHIP ditutup, kanal audio dilepaskan.')
  }
}

// Visualizer helper for 20-segment VU meter
function getBarColor(barIndex) {
  const percentage = (barIndex / 20) * 100
  if (percentage > whipAudio.audioLevel.value) {
    return 'bg-[#151f30]'
  }
  if (barIndex > 16) return 'bg-rose-500 shadow-xs shadow-rose-500/50'
  if (barIndex > 11) return 'bg-amber-400'
  return 'bg-emerald-400'
}

// Keyboard Spacebar PTT shortcut (Toggle On/Off)
function handleKeyDown(e) {
  if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return
  if (e.code === 'Space' && !e.repeat) {
    e.preventDefault()
    togglePtt()
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown)
  // Ensure default target sync
  handleTargetChange(pttTarget.value)

  // Immediate initial ping
  pingCurrentSpeaker(true)

  // Auto-ping gateway every 3 seconds
  pingInterval = setInterval(() => {
    // Only auto-ping when not transmitting to preserve mic streaming bandwidth
    if (!isTransmitting.value) {
      pingCurrentSpeaker(true)
    }
  }, 3000)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
  if (pingInterval) {
    clearInterval(pingInterval)
    pingInterval = null
  }
  stopCurrentTransmission()
})
</script>
