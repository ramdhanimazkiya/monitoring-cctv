<template>
  <div v-if="skeleton" class="w-full space-y-3 animate-pulse">
    <div
      v-for="i in lines"
      :key="i"
      :class="['bg-[#1f293d]/50 rounded', i === 1 ? 'h-6 w-3/4' : 'h-4 w-full']"
    ></div>
  </div>
  <div v-else class="flex flex-col items-center justify-center p-8 text-slate-400 space-y-3">
    <svg
      :class="['animate-spin text-blue-500', sizeClass]"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle class="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
      <path class="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
    </svg>
    <p v-if="text" class="text-xs font-medium text-slate-400">
      {{ text }}
    </p>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  skeleton: {
    type: Boolean,
    default: false
  },
  lines: {
    type: Number,
    default: 3
  },
  text: {
    type: String,
    default: 'Memuat data...'
  },
  size: {
    type: String,
    default: 'md',
    validator: (v) => ['sm', 'md', 'lg'].includes(v)
  }
})

const sizeClass = computed(() => {
  const sizes = {
    sm: 'h-4 w-4',
    md: 'h-7 w-7',
    lg: 'h-10 w-10'
  }
  return sizes[props.size] || sizes.md
})
</script>
