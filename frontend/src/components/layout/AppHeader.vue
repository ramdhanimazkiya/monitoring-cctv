<template>
  <header class="h-14 bg-[#0e1422] border-b border-[#283548] px-4 sm:px-6 flex items-center justify-between z-20 shrink-0 sticky top-0">
    <!-- Left: Mobile Menu Button & Breadcrumb / Page Title -->
    <div class="flex items-center gap-3">
      <button
        type="button"
        class="lg:hidden text-slate-400 hover:text-white p-1.5 rounded-md hover:bg-slate-800 transition-colors"
        @click="$emit('toggle-mobile-sidebar')"
      >
        <Menu class="w-5 h-5" />
      </button>

      <div>
        <div class="flex items-center gap-2 text-xs text-slate-400 font-mono">
          <span class="hover:text-slate-200 cursor-pointer">Control Center</span>
          <ChevronRight class="w-3 h-3 text-slate-600" />
          <span class="text-slate-200 font-semibold">{{ currentTitle }}</span>
        </div>
      </div>
    </div>

    <!-- Right: Connection pill, quick demo role switch, notifications, user profile -->
    <div class="flex items-center gap-3">
      <!-- DEMO MODE BADGE -->
      <!-- <div class="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-950/70 border border-indigo-700/60 text-indigo-300 text-[10px] font-mono font-semibold tracking-wide shadow-xs">
        <span class="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse"></span>
        <span>DEMO MODE</span>
      </div> -->

      <!-- Quick Role Toggle Button for testing -->
      <!-- <button
        type="button"
        class="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#151d2e] hover:bg-[#1e293b] text-slate-300 border border-[#283548] text-xs font-mono transition-colors"
        title="Klik untuk beralih role secara instan (Pengujian Otorisasi)"
        @click="toggleRole"
      >
        <UserCheck class="w-3.5 h-3.5 text-blue-400" />
        <span>Ganti Role:</span>
        <strong :class="authStore.isAdmin ? 'text-amber-400' : 'text-blue-400'">
          {{ authStore.user?.role }}
        </strong>
      </button> -->

      <!-- Notification Bell -->
      <div class="relative">
        <button
          type="button"
          class="relative text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-colors focus:outline-none"
          title="Notifikasi & Alarm"
          @click="showNotifications = !showNotifications"
        >
          <Bell class="w-4 h-4" />
          <span class="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500"></span>
        </button>

        <!-- Notification Dropdown Preview -->
        <div
          v-if="showNotifications"
          class="absolute right-0 mt-2 w-80 bg-[#111827] border border-[#283548] rounded-lg shadow-2xl py-2 z-50 text-xs text-slate-200"
        >
          <div class="px-3 py-2 border-b border-[#283548] flex items-center justify-between font-semibold">
            <span>Notifikasi Alarm Terbaru</span>
            <span class="text-[10px] font-mono text-rose-400 bg-rose-950/60 px-1.5 py-0.5 rounded border border-rose-800">
              2 OPEN
            </span>
          </div>
          <div class="divide-y divide-[#1e293b] max-h-64 overflow-y-auto">
            <div class="px-3 py-2.5 hover:bg-[#151d2e] cursor-pointer">
              <div class="flex items-center justify-between">
                <span class="font-semibold text-rose-400">Stream Putus</span>
                <span class="text-[10px] text-slate-500 font-mono">10m lalu</span>
              </div>
              <p class="text-[11px] text-slate-300 mt-0.5">[DEMO] Kamera Parkir 1 tidak terhubung.</p>
            </div>
            <div class="px-3 py-2.5 hover:bg-[#151d2e] cursor-pointer">
              <div class="flex items-center justify-between">
                <span class="font-semibold text-amber-400">Peringatan Latensi</span>
                <span class="text-[10px] text-slate-500 font-mono">25m lalu</span>
              </div>
              <p class="text-[11px] text-slate-300 mt-0.5">[DEMO] Speaker Lobby latency > 300ms.</p>
            </div>
          </div>
          <div class="px-3 py-1.5 border-t border-[#283548] text-center">
            <router-link to="/events" class="text-blue-400 hover:text-blue-300 text-[11px] font-medium" @click="showNotifications = false">
              Lihat Semua Event & Alarm →
            </router-link>
          </div>
        </div>
      </div>

      <!-- User Profile Menu -->
      <div class="relative">
        <button
          type="button"
          class="flex items-center gap-2 pl-2 pr-3 py-1 rounded-lg hover:bg-slate-800 transition-colors border border-transparent hover:border-slate-700"
          @click="showProfileMenu = !showProfileMenu"
        >
          <div class="w-7 h-7 rounded-full bg-blue-600/30 border border-blue-500/50 flex items-center justify-center text-blue-300 text-xs font-bold font-mono">
            {{ authStore.user?.username?.charAt(0).toUpperCase() }}
          </div>
          <div class="hidden sm:block text-left">
            <p class="text-xs font-medium text-slate-200 leading-tight">
              {{ authStore.user?.fullName }}
            </p>
            <p class="text-[10px] text-slate-400 font-mono">
              {{ authStore.user?.id }}
            </p>
          </div>
          <ChevronDown class="w-3.5 h-3.5 text-slate-400 ml-1" />
        </button>

        <!-- Dropdown Menu -->
        <div
          v-if="showProfileMenu"
          class="absolute right-0 mt-2 w-56 bg-[#111827] border border-[#283548] rounded-lg shadow-2xl py-1 z-50 text-xs"
        >
          <div class="px-3 py-2.5 border-b border-[#283548]">
            <p class="font-semibold text-slate-100">{{ authStore.user?.fullName }}</p>
            <p class="text-slate-400 font-mono text-[10px] mt-0.5">{{ authStore.user?.username }} • {{ authStore.user?.id }}</p>
            <div class="mt-2 flex items-center justify-between">
              <span class="text-[10px] text-slate-400">Hak Akses:</span>
              <span
                v-if="authStore.isAdmin"
                class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-950/80 text-amber-300 border border-amber-600/50"
              >
                ADMINISTRATOR
              </span>
              <span
                v-else
                class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-950/80 text-blue-300 border border-blue-600/50"
              >
                OPERATOR
              </span>
            </div>
            <p class="text-[10px] text-slate-500 mt-2 leading-tight">
              Peran dikunci oleh sesi aktif. Untuk berganti peran, silakan logout.
            </p>
          </div>
          <button
            type="button"
            class="w-full text-left px-3 py-2 text-rose-400 hover:bg-rose-950/40 hover:text-rose-300 flex items-center gap-2 mt-1"
            @click="handleLogout"
          >
            <LogOut class="w-3.5 h-3.5" />
            <span>Keluar (Logout)</span>
          </button>
        </div>
      </div>
    </div>
  </header>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth.js'
import { useToast } from '../../composables/useToast.js'
import { Menu, ChevronRight, ChevronDown, Bell, LogOut } from '@lucide/vue'

defineEmits(['toggle-mobile-sidebar'])

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const toast = useToast()

const showNotifications = ref(false)
const showProfileMenu = ref(false)

const currentTitle = computed(() => {
  return route.meta?.title || 'Dashboard'
})

async function handleLogout() {
  showProfileMenu.value = false
  await authStore.logout()
  router.push('/login')
  toast.success('Berhasil keluar')
}
</script>
