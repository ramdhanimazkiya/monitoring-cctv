<template>
  <div
    :class="[
      'bg-[#111827] border rounded-lg overflow-hidden transition-shadow duration-200',
      highlight ? 'border-blue-500/50 shadow-panel' : 'border-[#283548] shadow-crisp',
      hover ? 'hover:border-slate-600' : ''
    ]"
  >
    <!-- Header -->
    <div
      v-if="$slots.header || title"
      class="px-4 py-3 border-b border-[#283548] flex items-center justify-between gap-3 bg-[#131b2c]/60"
    >
      <div class="flex items-center gap-2.5 min-w-0">
        <slot name="icon" />
        <div class="truncate">
          <h3 v-if="title" class="text-sm font-semibold text-slate-100 truncate">
            {{ title }}
          </h3>
          <p v-if="subtitle" class="text-xs text-slate-400 truncate mt-0.5">
            {{ subtitle }}
          </p>
        </div>
      </div>
      <div v-if="$slots.actions" class="flex items-center gap-2 shrink-0">
        <slot name="actions" />
      </div>
    </div>

    <!-- Body -->
    <div :class="padding ? 'p-4' : ''">
      <slot />
    </div>

    <!-- Footer -->
    <div
      v-if="$slots.footer"
      class="px-4 py-2.5 bg-[#0e1422] border-t border-[#283548] text-xs text-slate-400 flex items-center justify-between"
    >
      <slot name="footer" />
    </div>
  </div>
</template>

<script setup>
defineProps({
  title: {
    type: String,
    default: ''
  },
  subtitle: {
    type: String,
    default: ''
  },
  padding: {
    type: Boolean,
    default: true
  },
  highlight: {
    type: Boolean,
    default: false
  },
  hover: {
    type: Boolean,
    default: false
  }
})
</script>
