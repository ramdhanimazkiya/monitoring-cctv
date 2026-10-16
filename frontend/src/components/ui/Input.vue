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
      <div v-if="$slots.prefix" class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
        <slot name="prefix" />
      </div>

      <input
        :id="id"
        :type="computedType"
        :value="modelValue"
        :placeholder="placeholder"
        :disabled="disabled"
        :readonly="readonly"
        :class="inputClasses"
        @input="$emit('update:modelValue', $event.target.value)"
        @blur="$emit('blur', $event)"
        @focus="$emit('focus', $event)"
        @keydown.enter="$emit('enter', $event)"
      />

      <div class="absolute inset-y-0 right-0 pr-2.5 flex items-center space-x-1">
        <!-- Toggle password visibility button if type is password -->
        <button
          v-if="type === 'password'"
          type="button"
          class="text-slate-400 hover:text-slate-200 focus:outline-none p-1 rounded"
          tabindex="-1"
          @click="showPassword = !showPassword"
        >
          <svg v-if="showPassword" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
          </svg>
          <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
        </button>

        <slot name="suffix" />
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
import { ref, computed, useSlots } from 'vue'

const props = defineProps({
  modelValue: {
    type: [String, Number],
    default: ''
  },
  id: {
    type: String,
    default: () => `input-${Math.random().toString(36).substring(2, 9)}`
  },
  label: {
    type: String,
    default: ''
  },
  type: {
    type: String,
    default: 'text'
  },
  placeholder: {
    type: String,
    default: ''
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
  readonly: {
    type: Boolean,
    default: false
  },
  required: {
    type: Boolean,
    default: false
  }
})

defineEmits(['update:modelValue', 'blur', 'focus', 'enter'])

const slots = useSlots()
const showPassword = ref(false)

const computedType = computed(() => {
  if (props.type === 'password') {
    return showPassword.value ? 'text' : 'password'
  }
  return props.type
})

const inputClasses = computed(() => {
  const base = 'block w-full rounded-md text-sm transition-colors duration-150 bg-[#111827] text-slate-100 placeholder-slate-500 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-offset-[#0b0f17]'
  const border = props.error
    ? 'border border-rose-500 focus:border-rose-500 focus:ring-rose-500/50'
    : 'border border-[#283548] focus:border-blue-500 focus:ring-blue-500/50'
  
  const paddingLeft = slots.prefix ? 'pl-10' : 'pl-3'
  const paddingRight = (slots.suffix || props.type === 'password') ? 'pr-10' : 'pr-3'

  return [
    base,
    border,
    'py-2',
    paddingLeft,
    paddingRight
  ].join(' ')
})
</script>
