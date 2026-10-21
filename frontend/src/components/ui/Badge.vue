<template>
  <span :class="badgeClasses">
    <span
      v-if="dot"
      :class="['w-1.5 h-1.5 rounded-full shrink-0', dotClass, statusKey === 'ONLINE' ? 'radar-online' : '']"
    ></span>
    <slot>{{ displayLabel }}</slot>
  </span>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  status: {
    type: String,
    default: ''
  },
  label: {
    type: String,
    default: ''
  },
  dot: {
    type: Boolean,
    default: true
  },
  size: {
    type: String,
    default: 'sm',
    validator: (v) => ['xs', 'sm', 'md'].includes(v)
  }
})

const statusKey = computed(() => {
  const val = String(props.status || props.label || '').toUpperCase().trim()
  if (!val || val === 'NULL' || val === 'UNDEFINED') return 'UNKNOWN'
  return val
})

const displayLabel = computed(() => {
  if (props.label) return props.label
  if (!props.status || statusKey.value === 'UNKNOWN') return 'UNKNOWN'
  return props.status
})

const badgeClasses = computed(() => {
  const base = 'inline-flex items-center gap-1.5 font-medium rounded-full border transition-colors select-none font-mono tracking-tight'

  const sizes = {
    xs: 'px-2 py-0.5 text-[10px]',
    sm: 'px-2.5 py-0.5 text-xs',
    md: 'px-3 py-1 text-xs'
  }

  const styles = {
    ONLINE: 'bg-emerald-950/70 text-emerald-300 border-emerald-700/60',
    ACTIVE: 'bg-emerald-950/70 text-emerald-300 border-emerald-700/60',
    SUCCESS: 'bg-emerald-950/70 text-emerald-300 border-emerald-700/60',
    AVAILABLE: 'bg-emerald-950/70 text-emerald-300 border-emerald-700/60',
    RESOLVED: 'bg-emerald-950/70 text-emerald-300 border-emerald-700/60',

    OFFLINE: 'bg-rose-950/70 text-rose-300 border-rose-700/60',
    FAILED: 'bg-rose-950/70 text-rose-300 border-rose-700/60',
    FAILURE: 'bg-rose-950/70 text-rose-300 border-rose-700/60',
    CRITICAL: 'bg-rose-950/80 text-rose-300 border-rose-600/70',
    OPEN: 'bg-rose-950/80 text-rose-300 border-rose-600/70',
    UNAVAILABLE: 'bg-rose-950/70 text-rose-300 border-rose-700/60',

    WARNING: 'bg-amber-950/60 text-amber-300 border-amber-700/50',
    ACKNOWLEDGED: 'bg-amber-950/60 text-amber-300 border-amber-700/50',
    UNCONFIRMED: 'bg-amber-950/60 text-amber-300 border-amber-700/50',
    PARTIAL: 'bg-amber-950/60 text-amber-300 border-amber-700/50',

    INFO: 'bg-blue-950/60 text-blue-300 border-blue-700/50',
    PENDING: 'bg-purple-950/60 text-purple-300 border-purple-700/50',
    RUNNING: 'bg-blue-950/60 text-blue-300 border-blue-700/50',
    SENDING: 'bg-blue-950/60 text-blue-300 border-blue-700/50',

    UNKNOWN: 'bg-slate-800/80 text-slate-400 border-slate-700/60',
    INACTIVE: 'bg-slate-800/80 text-slate-400 border-slate-700/60',
    NOT_CONFIGURED: 'bg-slate-800/80 text-slate-500 border-slate-700/50',

    DEMO: 'bg-indigo-950/80 text-indigo-300 border-indigo-600/60 font-semibold uppercase',
    DEFAULT: 'bg-slate-800/80 text-slate-400 border-slate-700/60'
  }

  return [
    base,
    sizes[props.size] || sizes.sm,
    styles[statusKey.value] || styles.DEFAULT
  ].join(' ')
})

const dotClass = computed(() => {
  const dots = {
    ONLINE: 'bg-emerald-400',
    ACTIVE: 'bg-emerald-400',
    SUCCESS: 'bg-emerald-400',
    AVAILABLE: 'bg-emerald-400',
    RESOLVED: 'bg-emerald-400',

    OFFLINE: 'bg-rose-400',
    FAILED: 'bg-rose-400',
    FAILURE: 'bg-rose-400',
    CRITICAL: 'bg-rose-400',
    OPEN: 'bg-rose-400',
    UNAVAILABLE: 'bg-rose-400',

    WARNING: 'bg-amber-400',
    ACKNOWLEDGED: 'bg-amber-400',
    UNCONFIRMED: 'bg-amber-400',
    PARTIAL: 'bg-amber-400',

    INFO: 'bg-blue-400',
    PENDING: 'bg-purple-400',
    RUNNING: 'bg-blue-400',
    SENDING: 'bg-blue-400',

    UNKNOWN: 'bg-slate-400',
    INACTIVE: 'bg-slate-400',
    NOT_CONFIGURED: 'bg-slate-500',
    DEMO: 'bg-indigo-400',
    DEFAULT: 'bg-slate-400'
  }

  return dots[statusKey.value] || dots.DEFAULT
})
</script>
