<template>
  <div ref="containerRef" :class="['relative overflow-hidden bg-black select-none group', aspectRatio]">
    <!-- 1. MediaMTX / WebRTC Web Page Stream Embed (via iframe) -->
    <iframe
      v-if="isWebPlayerStream"
      ref="iframeRef"
      :src="iframeUrl"
      class="w-full h-full border-0 absolute inset-0 z-10 bg-black"
      allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
      allowfullscreen
      @load="onIframeLoad"
      @error="onIframeError"
    ></iframe>

    <!-- 2. Direct Video Element for HLS (.m3u8) or standard MP4/WebM files -->
    <video
      v-else
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

    <!-- Loading Spinner Overlay -->
    <div
      v-if="isLoading && !hasError"
      class="absolute inset-0 z-20 bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center p-3 text-center pointer-events-none"
    >
      <div class="w-8 h-8 rounded-full border-2 border-blue-500/30 border-t-blue-400 animate-spin mb-2"></div>
      <span class="text-[11px] font-mono text-slate-300">Menyambungkan Stream...</span>
      <span class="text-[9px] font-mono text-slate-500 truncate max-w-[200px] mt-0.5">{{ cameraName || cameraId }}</span>
    </div>

    <!-- Fallback / Error State Overlay (Jika stream gagal dimuat setelah retry) -->
    <div
      v-if="hasError"
      class="absolute inset-0 z-20 bg-[#090e18]/95 flex flex-col items-center justify-center p-4 text-center select-none space-y-2.5"
    >
      <div class="w-10 h-10 rounded-xl bg-blue-950/70 border border-blue-500/40 flex items-center justify-center text-blue-400">
        <Video class="w-5 h-5 animate-pulse" />
      </div>

      <div>
        <span class="font-mono text-xs text-slate-200 font-bold block truncate max-w-[260px]">
          {{ cameraName || cameraId }}
        </span>
        <span class="font-mono text-[10px] text-amber-400 block mt-0.5">
          {{ errorMessage || 'Mencoba menghubungkan ulang stream...' }}
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

    <!-- Live Status Indicators -->
    <div
      v-if="showOverlay && isPlaying"
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

    <!-- Bottom Right Quick Floating Video Controls -->
    <div
      v-if="showOverlay"
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
const MAX_RETRIES = 3

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

// Jika bukan .m3u8 dan bukan file video, maka URL web player (seperti MediaMTX WebRTC Reader https://stream.zakuyu.fun/...)
const isWebPlayerStream = computed(() => {
  if (!props.streamUrl) return false
  return !isHlsStream.value && !isDirectVideo.value && props.streamUrl.startsWith('http')
})

const iframeUrl = computed(() => {
  if (!props.streamUrl) return ''
  const sep = props.streamUrl.includes('?') ? '&' : '?'
  return `${props.streamUrl}${sep}autoplay=true&muted=true&controls=${props.controls ? 'true' : 'false'}&playsinline=true`
})

function destroyHls() {
  if (hlsInstance) {
    try {
      hlsInstance.destroy()
    } catch (e) {
      // ignore
    }
    hlsInstance = null
  }
}

function initPlayer() {
  destroyHls()
  isLoading.value = true
  hasError.value = false
  errorMessage.value = ''

  if (!props.streamUrl) {
    isLoading.value = false
    hasError.value = true
    errorMessage.value = 'URL Stream belum dikonfigurasi'
    return
  }

  // Jika WebRTC / MediaMTX Web Player Iframe
  if (isWebPlayerStream.value) {
    if (iframeRef.value) {
      iframeRef.value.src = iframeUrl.value
    }
    // Set fallback timeout agar loading indicator tidak macet
    setTimeout(() => {
      isLoading.value = false
      isPlaying.value = true
    }, 1500)
    return
  }

  const video = videoRef.value
  if (!video) return

  video.muted = isMuted.value
  video.autoplay = props.autoplay
  video.playsInline = true
  video.setAttribute('playsinline', 'true')
  video.setAttribute('webkit-playsinline', 'true')

  // Cek apakah format HLS dan didukung oleh Hls.js
  if (isHlsStream.value && Hls.isSupported()) {
    hlsInstance = new Hls({
      enableWorker: true,
      lowLatencyMode: true,
      backBufferLength: 30,
      manifestLoadingTimeOut: 10000,
      manifestLoadingMaxRetry: 3,
      levelLoadingTimeOut: 10000
    })

    hlsInstance.loadSource(props.streamUrl)
    hlsInstance.attachMedia(video)

    hlsInstance.on(Hls.Events.MANIFEST_PARSED, () => {
      if (props.autoplay) {
        video.play().catch((err) => {
          console.warn('Autoplay tertahan oleh browser:', err)
        })
      }
    })

    hlsInstance.on(Hls.Events.ERROR, (event, data) => {
      if (data.fatal) {
        switch (data.type) {
          case Hls.ErrorTypes.NETWORK_ERROR:
            console.warn('HLS Network error, mencoba memulihkan...', data)
            if (retryCount < MAX_RETRIES) {
              retryCount++
              hlsInstance.startLoad()
            } else {
              hasError.value = true
              errorMessage.value = 'Koneksi stream terputus'
              isLoading.value = false
              emit('error', data)
            }
            break
          case Hls.ErrorTypes.MEDIA_ERROR:
            console.warn('HLS Media error, mencoba memulihkan...', data)
            hlsInstance.recoverMediaError()
            break
          default:
            destroyHls()
            hasError.value = true
            errorMessage.value = 'Gagal memutar siaran stream'
            isLoading.value = false
            emit('error', data)
            break
        }
      }
    })
  } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
    // Dukungan native HLS (Safari/iOS)
    video.src = props.streamUrl
    if (props.autoplay) {
      video.play().catch(() => {})
    }
  } else {
    // Standard format (MP4, WebM)
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
    window.open(props.streamUrl, '_blank')
  }
}

watch(
  () => props.streamUrl,
  (newUrl) => {
    if (newUrl) {
      initPlayer()
    }
  }
)

onMounted(() => {
  initPlayer()
})

onUnmounted(() => {
  destroyHls()
})
</script>
