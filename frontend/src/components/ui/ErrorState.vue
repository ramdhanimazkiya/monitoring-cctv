<template>
  <div class="flex flex-col items-center justify-center p-8 text-center bg-rose-950/20 border border-rose-900/40 rounded-xl">
    <div class="w-12 h-12 rounded-full bg-rose-950/50 border border-rose-800/60 flex items-center justify-center text-rose-400 mb-3">
      <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    </div>

    <h3 class="text-sm font-semibold text-rose-200">
      {{ title }}
    </h3>
    <p v-if="message" class="text-xs text-rose-300/80 max-w-sm mt-1">
      {{ message }}
    </p>

    <div v-if="retryable" class="mt-4">
      <button
        type="button"
        class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-rose-900/60 hover:bg-rose-900 text-rose-200 border border-rose-700/50 transition-colors"
        @click="$emit('retry')"
      >
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        Coba Lagi
      </button>
    </div>
  </div>
</template>

<script setup>
defineProps({
  title: {
    type: String,
    default: 'Gagal Memuat Data'
  },
  message: {
    type: String,
    default: 'Terjadi kendala saat menghubungkan ke server monitoring.'
  },
  retryable: {
    type: Boolean,
    default: true
  }
})

defineEmits(['retry'])
</script>
