<template>
  <div ref="containerRef" :class="['relative overflow-hidden bg-black select-none group', aspectRatio]">
    <!-- Direct Video Element for HLS (.m3u8) or standard files -->
    <video
      v-show="!isWebPlayerStream && !isOffline"
      ref="videoRef"
      class="w-full h-full object-cover z-10 relative bg-black"
      :autoplay="autoplay"
      :muted="isMuted"
      :controls="controls"
      playsinline
      webkit-playsinline
      loop
      @playing="onPlaying"
      @waiting="onWaiting"
      @error="onError"
    ></video>

    <!-- MediaMTX Built-in WebRTC Web Player Iframe (https://stream.zakuyu.fun/...) -->
    <iframe
      v-show="isWebPlayerStream && !isOffline"
      ref="iframeRef"
      :src="iframeUrl"
      class="w-full h-full border-0 pointer-events-auto relative z-10"
      allow="autoplay; fullscreen; encrypted-media; camera; microphone"
      loading="lazy"
      @load="onIframeLoad"
      @error="onIframeError"
    ></iframe>

    <!-- Loading Spinner Overlay (Hanya saat Online dan sedang menghubungkan) -->
    <div
      v-if="isLoading && !hasError && !isOffline"
      class="absolute inset-0 z-20 bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center p-3 text-center pointer-events-none"
    >
      <div class="w-8 h-8 rounded-full border-2 border-blue-500/30 border-t-blue-400 animate-spin mb-2"></div>
      <span class="text-[11px] font-mono text-slate-300">Menyambungkan Stream...</span>
      <span class="text-[9px] font-mono text-slate-500 truncate max-w-[200px] mt-0.5">{{ cameraName || cameraId }}</span>
    </div>

    <!-- Blank Hitam + Teks Error ketika Status CCTV Offline (Instant v-show) -->
    <div
      v-show="isOffline"
      class="absolute inset-0 z-20 bg-black flex flex-col items-center justify-center p-4 text-center select-none"
      style="background-color: #000000 !important;"
    >
      <!-- Top Header Overlay if showOverlay is true (Standalone mode) -->
      <div
        v-if="showOverlay"
        class="absolute top-0 inset-x-0 bg-gradient-to-b from-black/95 via-black/70 to-transparent p-2.5 flex items-center justify-between z-30 text-xs pointer-events-auto"
      >
        <div class="flex items-center gap-2 min-w-0 font-mono">
          <span
            v-if="cameraId"
            class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-950/90 text-blue-300 border border-blue-500/60 shrink-0 shadow-sm"
          >
            {{ cameraId }}
          </span>
          <span
            v-if="cameraName || cameraId"
            class="text-slate-100 font-semibold truncate text-[11px] drop-shadow-sm"
            :title="cameraName || cameraId"
          >
            {{ cameraName || cameraId }}
          </span>
        </div>

        <div class="flex items-center gap-1.5 shrink-0">
          <span class="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold flex items-center gap-1 shadow-sm bg-rose-950/90 text-rose-300 border border-rose-500/70">
            <span class="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
            OFFLINE
          </span>
        </div>
      </div>

      <p class="font-mono text-xs sm:text-sm text-white font-medium tracking-wide">
        error: stream not found, retrying in some second
      </p>
    </div>

    <!-- Error Overlay Lainnya (URL belum dikonfigurasi) -->
    <div
      v-if="hasError && !isOffline"
      class="absolute inset-0 z-20 bg-[#090e18]/95 flex flex-col items-center justify-center p-4 text-center select-none space-y-2.5"
    >
      <div class="w-10 h-10 rounded-xl bg-rose-950/70 border border-rose-500/40 flex items-center justify-center text-rose-400">
        <Video class="w-5 h-5 animate-pulse" />
      </div>

      <div>
        <span class="font-mono text-xs text-slate-200 font-bold block truncate max-w-[260px]">
          {{ cameraName || cameraId }}
        </span>
        <span class="font-mono text-[10px] text-rose-400 block mt-0.5">
          {{ errorMessage || 'Koneksi stream CCTV belum tersedia' }}
        </span>
      </div>

      <div class="flex items-center gap-2">
        <button
          type="button"
          class="px-3 py-1 rounded bg-blue-600 hover:bg-blue-500 border border-blue-400 text-[11px] font-mono text-white transition-all cursor-pointer flex items-center gap-1 shadow"
          @click="initPlayer"
        >
          <RotateCw class="w-3 h-3" />
          <span>Muat Ulang</span>
        </button>
        <button
          v-if="streamUrl"
          type="button"
          class="px-2.5 py-1 rounded bg-[#151f33] hover:bg-slate-700 border border-[#283548] text-[10px] font-mono text-slate-300 transition-all cursor-pointer"
          @click="openDirect"
        >
          Buka Tab Baru ↗
        </button>
      </div>
    </div>

    <!-- Live Status Indicators (Hanya tampil saat Online) -->
    <div
      v-if="showOverlay && isPlaying && !isOffline"
      class="absolute top-2 left-2 z-25 flex items-center gap-1.5 pointer-events-none"
    >
      <span class="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-500/60 shadow flex items-center gap-1">
        <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
        LIVE
      </span>
      <span v-if="isHlsStream" class="px-1 py-0.5 rounded text-[8px] font-mono font-bold bg-blue-950/80 text-blue-300 border border-blue-700/50">
        HLS
      </span>
      <span v-else-if="isWebPlayerStream" class="px-1 py-0.5 rounded text-[8px] font-mono font-bold bg-indigo-950/80 text-indigo-300 border border-indigo-700/50">
        WEBRTC
      </span>
    </div>

    <!-- Bottom Right Quick Floating Video Controls (Hanya tampil saat Online) -->
    <div
      v-if="showOverlay && !isOffline"
      class="absolute bottom-2 right-2 z-25 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-black/75 backdrop-blur-xs p-1 rounded-md border border-white/10 text-slate-300"
    >
      <!-- Mute/Unmute Toggle Button (Hanya jika direct video) -->
      <button
        v-if="!isWebPlayerStream"
        type="button"
        class="p-1 rounded hover:bg-slate-700 hover:text-white transition-colors cursor-pointer"
        :title="isMuted ? 'Nyalakan Audio' : 'Bisukan Audio'"
        @click.stop="toggleMute"
      >
        <Volume2 v-if="!isMuted" class="w-3.5 h-3.5 text-blue-400" />
        <VolumeX v-else class="w-3.5 h-3.5 text-slate-400" />
      </button>

      <!-- Reload Stream -->
      <button
        type="button"
        class="p-1 rounded hover:bg-slate-700 hover:text-white transition-colors cursor-pointer"
        title="Muat Ulang Stream"
        @click.stop="initPlayer"
      >
        <RotateCw class="w-3.5 h-3.5 text-slate-300" />
      </button>

      <!-- Fullscreen / Maximize -->
      <button
        type="button"
        class="p-1 rounded hover:bg-slate-700 hover:text-white transition-colors cursor-pointer"
        title="Layar Penuh"
        @click.stop="requestFullscreen"
      >
        <Maximize class="w-3.5 h-3.5 text-slate-300" />
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import Hls from 'hls.js'
import { Video, RotateCw, Volume2, VolumeX, Maximize } from '@lucide/vue'
import { useAuthStore } from '../../stores/auth.js'

const authStore = useAuthStore()

const props = defineProps({
  streamUrl: {
    type: String,
    default: ''
  },
  cameraName: {
    type: String,
    default: ''
  },
  cameraId: {
    type: String,
    default: ''
  },
  autoplay: {
    type: Boolean,
    default: true
  },
  muted: {
    type: Boolean,
    default: true
  },
  controls: {
    type: Boolean,
    default: false
  },
  showOverlay: {
    type: Boolean,
    default: true
  },
  aspectRatio: {
    type: String,
    default: 'aspect-video'
  },
  status: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['playing', 'error'])

const containerRef = ref(null)
const videoRef = ref(null)
const iframeRef = ref(null)
const isLoading = ref(true)
const isPlaying = ref(false)
const hasError = ref(false)
const errorMessage = ref('')
const isMuted = ref(props.muted)

let hlsInstance = null
let retryCount = 0
let loadTimer = null
const MAX_RETRIES = 3

// Status Offline didapat secara reaktif dari props.status (instan 0ms)
const isOffline = computed(() => {
  return !props.status || props.status.toUpperCase() === 'OFFLINE'
})

// Cek apakah URL berformat HLS playlist (.m3u8)
const isHlsStream = computed(() => {
  if (!props.streamUrl) return false
  const lower = props.streamUrl.toLowerCase()
  return (
    lower.includes('.m3u8') ||
    lower.includes('/video/') ||
    lower.includes('/hls')
  )
})

// Cek apakah URL langsung berupa file video (MP4/WebM/OGG)
const isDirectVideo = computed(() => {
  if (!props.streamUrl) return false
  const clean = props.streamUrl.toLowerCase().split('?')[0]
  return (
    clean.endsWith('.mp4') ||
    clean.endsWith('.webm') ||
    clean.endsWith('.ogg') ||
    clean.endsWith('.mov')
  )
})

// Jika bukan .m3u8 dan bukan file video, maka URL web player (MediaMTX stream page https://stream.zakuyu.fun/...)
const isWebPlayerStream = computed(() => {
  if (!props.streamUrl) return false
  return !isHlsStream.value && !isDirectVideo.value && props.streamUrl.startsWith('http')
})

const iframeUrl = computed(() => {
  if (!props.streamUrl) return ''
  const clean = props.streamUrl.replace(/\/whep$/, '').replace(/\/index\.m3u8$/, '')
  const base = clean.endsWith('/') ? clean : `${clean}/`
  const sep = base.includes('?') ? '&' : '?'
  const jwtParam = authStore.cctvToken ? `jwt=${encodeURIComponent(authStore.cctvToken)}&` : ''
  return `${base}${sep}${jwtParam}autoplay=true&muted=true&controls=${props.controls ? 'true' : 'false'}&playsinline=true`
})

const hlsSourceUrl = computed(() => {
  if (!props.streamUrl) return ''
  if (!authStore.cctvToken) return props.streamUrl
  const sep = props.streamUrl.includes('?') ? '&' : '?'
  return `${props.streamUrl}${sep}jwt=${encodeURIComponent(authStore.cctvToken)}`
})

function destroyPlayer() {
  if (loadTimer) {
    clearTimeout(loadTimer)
    loadTimer = null
  }
  if (hlsInstance) {
    try {
      hlsInstance.destroy()
    } catch (e) {
      // ignore
    }
    hlsInstance = null
  }
  if (videoRef.value) {
    try {
      videoRef.value.pause()
      videoRef.value.removeAttribute('src')
      videoRef.value.load()
    } catch (e) {
      // ignore
    }
  }
}

function initPlayer() {
  destroyPlayer()
  isLoading.value = true
  hasError.value = false
  isPlaying.value = false
  errorMessage.value = ''

  // Jika status kamera offline, jangan inisialisasi player
  if (isOffline.value) {
    isLoading.value = false
    isPlaying.value = false
    return
  }

  if (!props.streamUrl) {
    isLoading.value = false
    hasError.value = true
    errorMessage.value = 'URL Stream belum dikonfigurasi'
    return
  }

  // 1. Jika MediaMTX WebRTC Stream Page (iframe)
  if (isWebPlayerStream.value) {
    if (iframeRef.value) {
      iframeRef.value.src = iframeUrl.value
    }
    loadTimer = setTimeout(() => {
      isLoading.value = false
      isPlaying.value = true
    }, 1200)
    return
  }

  // 2. Jika HLS atau Direct Video
  const video = videoRef.value
  if (!video) return

  video.muted = isMuted.value
  video.autoplay = props.autoplay
  video.playsInline = true
  video.setAttribute('playsinline', 'true')
  video.setAttribute('webkit-playsinline', 'true')

  if (isHlsStream.value && Hls.isSupported()) {
    hlsInstance = new Hls({
      enableWorker: true,
      lowLatencyMode: true,
      backBufferLength: 30,
      manifestLoadingTimeOut: 10000,
      manifestLoadingMaxRetry: 3,
      levelLoadingTimeOut: 10000
    })

    hlsInstance.loadSource(hlsSourceUrl.value)
    hlsInstance.attachMedia(video)

    hlsInstance.on(Hls.Events.MANIFEST_PARSED, () => {
      if (props.autoplay) {
        video.play().catch((err) => {
          console.warn('Autoplay tertahan browser:', err)
        })
      }
    })

    hlsInstance.on(Hls.Events.ERROR, (event, data) => {
      if (data.fatal) {
        switch (data.type) {
          case Hls.ErrorTypes.NETWORK_ERROR:
            if (retryCount < MAX_RETRIES) {
              retryCount++
              hlsInstance.startLoad()
            } else {
              hasError.value = true
              errorMessage.value = 'Koneksi stream CCTV terputus'
              isLoading.value = false
              emit('error', data)
            }
            break
          case Hls.ErrorTypes.MEDIA_ERROR:
            hlsInstance.recoverMediaError()
            break
          default:
            destroyPlayer()
            hasError.value = true
            errorMessage.value = 'Gagal memutar siaran stream'
            isLoading.value = false
            emit('error', data)
            break
        }
      }
    })
  } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
    video.src = props.streamUrl
    if (props.autoplay) {
      video.play().catch(() => {})
    }
  } else {
    video.src = props.streamUrl
    if (props.autoplay) {
      video.play().catch(() => {})
    }
  }
}

function onIframeLoad() {
  isLoading.value = false
  isPlaying.value = true
  hasError.value = false
  emit('playing')
}

function onIframeError(e) {
  isLoading.value = false
  hasError.value = true
  errorMessage.value = 'Gagal memuat player stream'
  emit('error', e)
}

function onPlaying() {
  isLoading.value = false
  isPlaying.value = true
  hasError.value = false
  retryCount = 0
  emit('playing')
}

function onWaiting() {
  if (!isPlaying.value) {
    isLoading.value = true
  }
}

function onError(e) {
  if (!isHlsStream.value || !Hls.isSupported()) {
    isLoading.value = false
    hasError.value = true
    errorMessage.value = 'Gagal memuat video stream'
    emit('error', e)
  }
}

function toggleMute() {
  isMuted.value = !isMuted.value
  if (videoRef.value) {
    videoRef.value.muted = isMuted.value
  }
}

function requestFullscreen() {
  const el = containerRef.value || videoRef.value || iframeRef.value
  if (!el) return
  if (el.requestFullscreen) {
    el.requestFullscreen()
  } else if (el.webkitRequestFullscreen) {
    el.webkitRequestFullscreen()
  }
}

function openDirect() {
  if (props.streamUrl) {
    const targetUrl = isWebPlayerStream.value ? iframeUrl.value : hlsSourceUrl.value
    window.open(targetUrl, '_blank')
  }
}

watch(
  () => props.streamUrl,
  (newUrl) => {
    if (newUrl && !isOffline.value) {
      initPlayer()
    }
  }
)

watch(
  () => authStore.cctvToken,
  (newToken, oldToken) => {
    // Jika token CCTV baru diterima saat stream aktif, muat ulang player
    if (newToken && !oldToken && !isOffline.value) {
      initPlayer()
    }
  }
)

watch(
  () => props.status,
  (newStatus, oldStatus) => {
    const isNowOnline = newStatus?.toUpperCase() === 'ONLINE'
    const wasOffline = !oldStatus || oldStatus?.toUpperCase() === 'OFFLINE'

    if (isNowOnline && wasOffline) {
      // CCTV pulih online: inisialisasi ulang pemutar video
      initPlayer()
    } else if (!isNowOnline) {
      // CCTV mati/offline: segera hentikan pemutar video lokal
      destroyPlayer()
    }
  },
  { immediate: true }
)

onMounted(() => {
  initPlayer()
})

onUnmounted(() => {
  destroyPlayer()
})
</script>
