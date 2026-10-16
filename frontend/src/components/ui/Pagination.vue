<template>
  <div class="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400 select-none">
    <!-- Total information -->
    <div class="flex items-center gap-2">
      <span>
        Menampilkan <strong class="text-slate-200">{{ fromIndex }}</strong> - <strong class="text-slate-200">{{ toIndex }}</strong> dari <strong class="text-slate-200">{{ total }}</strong> data
      </span>
      <div v-if="showPerPage" class="flex items-center gap-1.5 ml-3">
        <span>Baris per halaman:</span>
        <select
          :value="perPage"
          class="bg-[#151d2e] border border-[#283548] text-slate-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
          @change="$emit('update:perPage', Number($event.target.value))"
        >
          <option :value="10">10</option>
          <option :value="20">20</option>
          <option :value="50">50</option>
          <option :value="100">100</option>
        </select>
      </div>
    </div>

    <!-- Page buttons -->
    <div class="flex items-center space-x-1">
      <button
        type="button"
        :disabled="page <= 1"
        class="px-2.5 py-1 rounded border border-[#283548] bg-[#151d2e] text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        @click="$emit('update:page', page - 1)"
      >
        Sebelumnya
      </button>

      <span class="px-2.5 py-1 text-xs text-slate-300 font-mono">
        Hal <strong class="text-white">{{ page }}</strong> / {{ totalPages || 1 }}
      </span>

      <button
        type="button"
        :disabled="page >= totalPages"
        class="px-2.5 py-1 rounded border border-[#283548] bg-[#151d2e] text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        @click="$emit('update:page', page + 1)"
      >
        Selanjutnya
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  page: {
    type: Number,
    default: 1
  },
  perPage: {
    type: Number,
    default: 10
  },
  total: {
    type: Number,
    default: 0
  },
  showPerPage: {
    type: Boolean,
    default: true
  }
})

defineEmits(['update:page', 'update:perPage'])

const totalPages = computed(() => {
  return Math.ceil(props.total / props.perPage) || 1
})

const fromIndex = computed(() => {
  if (props.total === 0) return 0
  return (props.page - 1) * props.perPage + 1
})

const toIndex = computed(() => {
  return Math.min(props.page * props.perPage, props.total)
})
</script>
