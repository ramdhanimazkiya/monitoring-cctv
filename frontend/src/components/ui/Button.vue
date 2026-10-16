<template>
  <button
    :type="type"
    :disabled="disabled || loading"
    :class="buttonClasses"
    @click="$emit('click', $event)"
  >
    <svg
      v-if="loading"
      class="animate-spin -ml-0.5 mr-2 h-4 w-4 text-current"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
    </svg>
    <slot name="icon-left" />
    <slot />
    <slot name="icon-right" />
  </button>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  variant: {
    type: String,
    default: 'primary',
    validator: (v) => ['primary', 'secondary', 'ghost', 'danger', 'outline', 'warning'].includes(v)
  },
  size: {
    type: String,
    default: 'md',
    validator: (v) => ['xs', 'sm', 'md', 'lg'].includes(v)
  },
  type: {
    type: String,
    default: 'button'
  },
  disabled: {
    type: Boolean,
    default: false
  },
  loading: {
    type: Boolean,
    default: false
  },
  block: {
    type: Boolean,
    default: false
  }
})

defineEmits(['click'])

const buttonClasses = computed(() => {
  const base = 'inline-flex items-center justify-center font-medium transition-all duration-150 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#0b0f17] disabled:opacity-50 disabled:cursor-not-allowed select-none'
  
  const sizes = {
    xs: 'px-2 py-1 text-xs gap-1',
    sm: 'px-2.5 py-1.5 text-xs gap-1.5',
    md: 'px-3.5 py-2 text-sm gap-2',
    lg: 'px-4 py-2.5 text-base gap-2.5'
  }

  const variants = {
    primary: 'bg-blue-600 hover:bg-blue-500 text-white border border-blue-500/30 focus:ring-blue-500 shadow-sm active:scale-[0.98]',
    secondary: 'bg-[#151d2e] hover:bg-[#1e293b] text-slate-200 border border-[#283548] focus:ring-slate-400 active:scale-[0.98]',
    ghost: 'bg-transparent hover:bg-[#151d2e] text-slate-300 hover:text-white focus:ring-slate-500',
    outline: 'bg-transparent hover:bg-blue-600/10 text-blue-400 hover:text-blue-300 border border-blue-500/40 focus:ring-blue-500',
    danger: 'bg-rose-600 hover:bg-rose-500 text-white border border-rose-500/30 focus:ring-rose-500 shadow-sm active:scale-[0.98]',
    warning: 'bg-amber-600 hover:bg-amber-500 text-white border border-amber-500/30 focus:ring-amber-500 shadow-sm active:scale-[0.98]',
  }

  return [
    base,
    sizes[props.size] || sizes.md,
    variants[props.variant] || variants.primary,
    props.block ? 'w-full' : ''
  ].join(' ')
})
</script>
