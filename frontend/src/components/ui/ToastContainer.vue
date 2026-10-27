<template>
  <Teleport to="body">
    <div
      class="fixed bottom-4 right-4 z-[100] flex flex-col space-y-2 pointer-events-none max-w-sm w-full"
      aria-live="polite"
    >
      <TransitionGroup
        enter-active-class="transform ease-out duration-250 transition"
        enter-from-class="translate-y-2 opacity-0 sm:translate-y-0 sm:translate-x-4"
        enter-to-class="translate-y-0 opacity-100 sm:translate-x-0"
        leave-active-class="transition ease-in duration-200"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div
          v-for="toast in toasts"
          :key="toast.id"
          class="pointer-events-auto w-full bg-[#151d2e] border rounded-lg shadow-xl p-3.5 flex items-start gap-3 overflow-hidden text-sm"
          :class="borderClasses[toast.type] || borderClasses.info"
        >
          <!-- Status icon -->
          <div class="shrink-0 mt-0.5">
            <svg
              v-if="toast.type === 'success'"
              class="w-5 h-5 text-emerald-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <svg
              v-else-if="toast.type === 'error'"
              class="w-5 h-5 text-rose-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <svg
              v-else-if="toast.type === 'warning'"
              class="w-5 h-5 text-amber-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <svg
              v-else
              class="w-5 h-5 text-blue-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>

          <div class="flex-1 min-w-0">
            <h4 class="font-semibold text-slate-100 text-xs">
              {{ toast.title }}
            </h4>
            <p v-if="toast.message" class="text-xs text-slate-300 mt-0.5 break-words">
              {{ toast.message }}
            </p>
          </div>

          <button
            type="button"
            class="text-slate-400 hover:text-white shrink-0 p-1 rounded hover:bg-slate-800 focus:outline-none"
            aria-label="Tutup notifikasi"
            @click="removeToast(toast.id)"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<script setup>
import { useToast } from '../../composables/useToast.js'

const { toasts, removeToast } = useToast()

const borderClasses = {
  success: 'border-emerald-600/60 bg-emerald-950/40 text-emerald-100',
  error: 'border-rose-600/60 bg-rose-950/40 text-rose-100',
  warning: 'border-amber-600/60 bg-amber-950/40 text-amber-100',
  info: 'border-blue-600/60 bg-blue-950/40 text-blue-100'
}
</script>
