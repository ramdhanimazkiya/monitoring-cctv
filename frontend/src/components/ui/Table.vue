<template>
  <div class="w-full bg-[#111827] border border-[#283548] rounded-lg shadow-crisp overflow-hidden flex flex-col">
    <!-- Optional Table Header Tools (search, filters, actions) -->
    <div
      v-if="$slots.header || title"
      class="px-4 py-3 border-b border-[#283548] bg-[#131b2c] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
    >
      <div v-if="title">
        <h3 class="text-sm font-semibold text-slate-100 flex items-center gap-2">
          {{ title }}
          <span v-if="count !== undefined" class="text-xs font-mono font-normal px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
            {{ count }}
          </span>
        </h3>
        <p v-if="subtitle" class="text-xs text-slate-400 mt-0.5">
          {{ subtitle }}
        </p>
      </div>
      <div class="w-full sm:w-auto flex items-center gap-2.5">
        <slot name="header" />
      </div>
    </div>

    <!-- Table Responsive Wrapper -->
    <div class="overflow-x-auto w-full relative">
      <table class="w-full text-left text-sm text-slate-200 border-collapse">
        <thead class="bg-[#0e1524] border-b border-[#283548] text-xs font-medium text-slate-400 uppercase tracking-wider select-none">
          <tr>
            <th
              v-for="col in columns"
              :key="col.key"
              :class="[
                'px-4 py-3 font-semibold',
                col.sortable ? 'cursor-pointer hover:text-slate-100 transition-colors' : '',
                col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left',
                col.width ? col.width : ''
              ]"
              @click="col.sortable && handleSort(col.key)"
            >
              <div
                :class="[
                  'inline-flex items-center gap-1.5',
                  col.align === 'right' ? 'justify-end' : col.align === 'center' ? 'justify-center' : 'justify-start'
                ]"
              >
                <span>{{ col.label }}</span>
                <span v-if="col.sortable" class="text-slate-500">
                  <svg
                    v-if="sortKey === col.key && sortOrder === 'asc'"
                    class="w-3.5 h-3.5 text-blue-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />
                  </svg>
                  <svg
                    v-else-if="sortKey === col.key && sortOrder === 'desc'"
                    class="w-3.5 h-3.5 text-blue-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                  </svg>
                  <svg
                    v-else
                    class="w-3.5 h-3.5 opacity-40 hover:opacity-100"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                  </svg>
                </span>
              </div>
            </th>
          </tr>
        </thead>

        <tbody class="divide-y divide-[#1e293b]/80">
          <!-- Loading State -->
          <tr v-if="loading">
            <td :colspan="columns.length" class="px-4 py-12 text-center text-slate-400">
              <div class="flex flex-col items-center justify-center gap-2">
                <svg class="animate-spin h-6 w-6 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                </svg>
                <span class="text-xs">Memuat data...</span>
              </div>
            </td>
          </tr>

          <!-- Empty State -->
          <tr v-else-if="!data || data.length === 0">
            <td :colspan="columns.length" class="px-4 py-12 text-center">
              <slot name="empty">
                <div class="flex flex-col items-center justify-center text-slate-400">
                  <svg class="w-8 h-8 text-slate-500 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                  <p class="text-sm font-medium text-slate-300">Tidak ada data ditemukan</p>
                  <p class="text-xs text-slate-500 mt-0.5">Coba ubah kata kunci pencarian atau filter.</p>
                </div>
              </slot>
            </td>
          </tr>

          <!-- Data Rows -->
          <tr
            v-for="(row, idx) in data"
            v-else
            :key="row.id || idx"
            class="hover:bg-[#151f33]/60 transition-colors"
          >
            <td
              v-for="col in columns"
              :key="col.key"
              :class="[
                'px-4 py-3 text-sm text-slate-200',
                col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
              ]"
            >
              <slot :name="col.key" :row="row" :value="row[col.key]">
                {{ row[col.key] !== undefined && row[col.key] !== null ? row[col.key] : '-' }}
              </slot>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Optional Footer / Pagination Slot -->
    <div v-if="$slots.footer" class="border-t border-[#283548] bg-[#0e1524] px-4 py-2.5">
      <slot name="footer" />
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  columns: {
    type: Array,
    required: true
    // example: [{ key: 'id', label: 'ID', sortable: true, width: 'w-24', align: 'left' }]
  },
  data: {
    type: Array,
    default: () => []
  },
  loading: {
    type: Boolean,
    default: false
  },
  title: {
    type: String,
    default: ''
  },
  subtitle: {
    type: String,
    default: ''
  },
  count: {
    type: Number,
    default: undefined
  },
  sortKey: {
    type: String,
    default: ''
  },
  sortOrder: {
    type: String,
    default: 'asc', // 'asc' | 'desc'
    validator: (v) => ['asc', 'desc'].includes(v)
  }
})

const emit = defineEmits(['sort'])

function handleSort(key) {
  let newOrder = 'asc'
  if (props.sortKey === key) {
    newOrder = props.sortOrder === 'asc' ? 'desc' : 'asc'
  }
  emit('sort', { key, order: newOrder })
}
</script>
