<template>
  <div class="flex flex-col items-center justify-center p-8 sm:p-12 text-center bg-[#111827]/40 border border-dashed border-[#283548] rounded-xl">
    <div class="w-12 h-12 rounded-full bg-[#151d2e] border border-[#283548] flex items-center justify-center text-slate-400 mb-3 shadow-inner">
      <slot name="icon">
        <svg class="w-6 h-6 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
        </svg>
      </slot>
    </div>

    <h3 class="text-sm font-semibold text-slate-200">
      {{ title }}
    </h3>
    <p v-if="description" class="text-xs text-slate-400 max-w-sm mt-1">
      {{ description }}
    </p>

    <div v-if="$slots.action" class="mt-4">
      <slot name="action" />
    </div>
  </div>
</template>

<script setup>
defineProps({
  title: {
    type: String,
    default: 'Tidak ada data'
  },
  description: {
    type: String,
    default: 'Belum ada rekaman yang tersedia untuk ditampilkan saat ini.'
  }
})
</script>
