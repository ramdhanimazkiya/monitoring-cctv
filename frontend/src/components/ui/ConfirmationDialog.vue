<template>
  <Modal
    :model-value="modelValue"
    size="sm"
    :title="title"
    :description="subtitle"
    @close="cancel"
  >
    <template #icon>
      <div
        :class="[
          'w-8 h-8 rounded-full flex items-center justify-center shrink-0',
          variant === 'danger' ? 'bg-rose-950/70 border border-rose-800 text-rose-400' : 'bg-amber-950/70 border border-amber-800 text-amber-400'
        ]"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
    </template>

    <div class="py-1">
      <p class="text-sm text-slate-300">
        {{ message }}
      </p>
      <p v-if="warning" class="mt-2 text-xs text-rose-400/90 font-medium">
        Perhatian: {{ warning }}
      </p>
    </div>

    <template #footer>
      <Button variant="ghost" size="sm" :disabled="loading" @click="cancel">
        {{ cancelText }}
      </Button>
      <Button
        :variant="variant === 'danger' ? 'danger' : 'warning'"
        size="sm"
        :loading="loading"
        @click="confirm"
      >
        {{ confirmText }}
      </Button>
    </template>
  </Modal>
</template>

<script setup>
import Modal from './Modal.vue'
import Button from './Button.vue'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  title: {
    type: String,
    default: 'Konfirmasi Tindakan'
  },
  subtitle: {
    type: String,
    default: ''
  },
  message: {
    type: String,
    default: 'Apakah Anda yakin ingin melanjutkan tindakan ini?'
  },
  warning: {
    type: String,
    default: 'Tindakan ini tidak dapat dibatalkan.'
  },
  confirmText: {
    type: String,
    default: 'Ya, Lanjutkan'
  },
  cancelText: {
    type: String,
    default: 'Batal'
  },
  variant: {
    type: String,
    default: 'danger',
    validator: (v) => ['danger', 'warning'].includes(v)
  },
  loading: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue', 'confirm', 'cancel'])

function confirm() {
  emit('confirm')
}

function cancel() {
  emit('update:modelValue', false)
  emit('cancel')
}
</script>
