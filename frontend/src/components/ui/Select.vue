<template>
  <div class="w-full">
    <div v-if="label" class="flex items-center justify-between mb-1.5">
      <label :for="id" class="block text-xs font-medium text-slate-300">
        {{ label }}
        <span v-if="required" class="text-rose-400 ml-0.5">*</span>
      </label>
      <slot name="label-right" />
    </div>

    <div class="relative rounded-md shadow-sm">
      <select
        :id="id"
        :value="modelValue"
        :disabled="disabled"
        :class="selectClasses"
        @change="$emit('update:modelValue', $event.target.value)"
      >
        <option v-if="placeholder" value="" disabled :selected="!modelValue">
          {{ placeholder }}
        </option>
        <option
          v-for="opt in normalizedOptions"
          :key="opt.value"
          :value="opt.value"
          class="bg-[#111827] text-slate-100 py-1"
        >
          {{ opt.label }}
        </option>
      </select>

      <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-slate-400">
        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>

    <p v-if="error" class="mt-1.5 text-xs text-rose-400 flex items-center gap-1">
      <svg class="w-3.5 h-3.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
        <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
      </svg>
      {{ error }}
    </p>
    <p v-else-if="help" class="mt-1.5 text-xs text-slate-400">
      {{ help }}
    </p>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  modelValue: {
    type: [String, Number],
    default: ''
  },
  id: {
    type: String,
    default: () => `select-${Math.random().toString(36).substring(2, 9)}`
  },
  label: {
    type: String,
    default: ''
  },
  placeholder: {
    type: String,
    default: ''
  },
  options: {
    type: Array,
    default: () => []
  },
  error: {
    type: String,
    default: ''
  },
  help: {
    type: String,
    default: ''
  },
  disabled: {
    type: Boolean,
    default: false
  },
  required: {
    type: Boolean,
    default: false
  }
})

defineEmits(['update:modelValue'])

const normalizedOptions = computed(() => {
  return props.options.map(opt => {
    if (typeof opt === 'string' || typeof opt === 'number') {
      return { value: opt, label: String(opt) }
    }
    return opt
  })
})

const selectClasses = computed(() => {
  const base = 'block w-full appearance-none rounded-md text-sm transition-colors duration-150 bg-[#111827] text-slate-100 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-offset-[#0b0f17] pl-3 pr-8 py-2'
  const border = props.error
    ? 'border border-rose-500 focus:border-rose-500 focus:ring-rose-500/50'
    : 'border border-[#283548] focus:border-blue-500 focus:ring-blue-500/50'
  
  return `${base} ${border}`
})
</script>
