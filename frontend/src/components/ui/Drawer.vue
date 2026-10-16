<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition-opacity duration-200 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-150 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="modelValue"
        class="fixed inset-0 z-50 overflow-hidden bg-black/70 backdrop-blur-xs"
        @click.self="handleBackdropClick"
      >
        <div class="fixed inset-y-0 right-0 max-w-full flex pl-10">
          <Transition
            enter-active-class="transform transition ease-in-out duration-250 sm:duration-300"
            enter-from-class="translate-x-full"
            enter-to-class="translate-x-0"
            leave-active-class="transform transition ease-in-out duration-200 sm:duration-250"
            leave-from-class="translate-x-0"
            leave-to-class="translate-x-full"
          >
            <div
              v-if="modelValue"
              :class="['w-screen bg-[#111827] border-l border-[#283548] shadow-2xl flex flex-col h-full', maxWidthClass]"
            >
              <!-- Drawer Header -->
              <div class="px-5 py-4 border-b border-[#283548] flex items-center justify-between bg-[#131b2c]">
                <div class="min-w-0 pr-4">
                  <h3 class="text-base font-semibold text-slate-100 truncate">
                    {{ title }}
                  </h3>
                  <p v-if="subtitle" class="text-xs text-slate-400 truncate mt-0.5">
                    {{ subtitle }}
                  </p>
                </div>
                <button
                  type="button"
                  class="text-slate-400 hover:text-white rounded-lg p-1.5 hover:bg-[#1f293d] transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                  aria-label="Tutup"
                  @click="close"
                >
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <!-- Drawer Content -->
              <div class="p-5 flex-1 overflow-y-auto space-y-4 text-sm text-slate-200">
                <slot />
              </div>

              <!-- Drawer Footer -->
              <div
                v-if="$slots.footer"
                class="px-5 py-3.5 bg-[#0e1422] border-t border-[#283548] flex items-center justify-end gap-2.5 shrink-0"
              >
                <slot name="footer" :close="close" />
              </div>
            </div>
          </Transition>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { computed, onMounted, onUnmounted, watch } from 'vue'

const props = defineProps({
  modelValue: {
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
  size: {
    type: String,
    default: 'md',
    validator: (v) => ['sm', 'md', 'lg', 'xl'].includes(v)
  },
  closeOnBackdrop: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits(['update:modelValue', 'close'])

const maxWidthClass = computed(() => {
  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl'
  }
  return sizes[props.size] || sizes.md
})

function close() {
  emit('update:modelValue', false)
  emit('close')
}

function handleBackdropClick() {
  if (props.closeOnBackdrop) {
    close()
  }
}

function handleKeydown(e) {
  if (e.key === 'Escape' && props.modelValue) {
    close()
  }
}

watch(
  () => props.modelValue,
  (val) => {
    if (val) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
  }
)

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
  document.body.style.overflow = ''
})
</script>
