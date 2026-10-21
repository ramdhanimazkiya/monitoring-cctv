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
      <!-- Notification Bell with Real Database Integration -->
      <div class="relative">
        <button
          type="button"
          class="relative text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-colors focus:outline-none"
          title="Notifikasi & Alarm"
          @click="toggleNotifications"
        >
          <Bell class="w-4 h-4" />
          <!-- Active OFFLINE Alarm Indicator -->
          <span
            v-if="eventsStore.stats.offlineActiveCount > 0"
            class="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-600 border border-slate-900 text-white text-[10px] font-bold font-mono flex items-center justify-center animate-pulse shadow-sm"
          >
            {{ eventsStore.stats.offlineActiveCount > 9 ? '9+' : eventsStore.stats.offlineActiveCount }}
          </span>
        </button>

        <!-- Click outside backdrop -->
        <div
          v-if="showNotifications"
          class="fixed inset-0 z-40"
          @click="showNotifications = false"
        ></div>

        <!-- Notification Dropdown Preview -->
        <div
          v-if="showNotifications"
          class="absolute right-0 mt-2 w-84 bg-[#111827] border border-[#283548] rounded-xl shadow-2xl py-2 z-50 text-xs text-slate-200 font-sans"
        >
          <div class="px-3.5 py-2 border-b border-[#283548] flex items-center justify-between font-semibold">
            <span class="text-slate-100 font-bold">Notifikasi Alarm & Insiden</span>
            <span
              v-if="eventsStore.stats.offlineActiveCount > 0"
              class="text-[10px] font-mono font-bold text-rose-300 bg-rose-950/70 px-2 py-0.5 rounded-full border border-rose-800 flex items-center gap-1"
            >
              <span class="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse"></span>
              {{ eventsStore.stats.offlineActiveCount }} OFFLINE
            </span>
            <!-- <span
              v-else
              class="text-[10px] font-mono font-bold text-emerald-300 bg-emerald-950/70 px-2 py-0.5 rounded-full border border-emerald-800 flex items-center gap-1"
            >
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              SEMUA NORMAL
            </span> -->
          </div>

          <div class="divide-y divide-[#1e293b] max-h-72 overflow-y-auto font-mono">
            <!-- Loading State -->
            <div v-if="eventsStore.notificationsLoading" class="p-4 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
              <RefreshCw class="w-3.5 h-3.5 animate-spin text-blue-400" />
              <span>Menyinkronkan alarm...</span>
            </div>

            <!-- Empty State -->
            <div
              v-else-if="eventsStore.recentNotifications.length === 0"
              class="p-4 text-center text-slate-400 text-[11px]"
            >
              <CheckCircle2 class="w-5 h-5 text-emerald-400 mx-auto mb-1.5" />
              <p>Tidak ada perangkat OFFLINE.</p>
              <span class="text-[10px] text-slate-500">Semua koneksi perangkat terpantau normal.</span>
            </div>

            <!-- Notification Items -->
            <div
              v-for="item in eventsStore.recentNotifications"
              :key="item.id"
              class="px-3.5 py-2.5 hover:bg-[#151d2e] cursor-pointer transition-colors"
              @click="handleSelectNotification(item)"
            >
              <div class="flex items-center justify-between gap-2">
                <div class="flex items-center gap-1.5 truncate">
                  <span
                    v-if="item.status === 'OFFLINE'"
                    class="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-950 text-rose-300 border border-rose-800"
                  >
                    OFFLINE
                  </span>
                  <span
                    v-else
                    class="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800"
                  >
                    RESOLVED
                  </span>
                  <span class="font-bold text-slate-200 text-xs truncate">
                    {{ item.targetDevice?.id || item.cameraId || item.audioDeviceId || `#${item.id}` }}
                  </span>
                </div>
                <span class="text-[10px] text-slate-500 shrink-0">{{ formatTimeAgo(item.occurredAt) }}</span>
              </div>
              <p class="text-[11px] text-slate-300 mt-1 line-clamp-2 font-sans">{{ item.title }}</p>
              <p v-if="item.status === 'RESOLVED' && item.resolutionNote" class="text-[10px] text-emerald-400/90 mt-0.5 truncate italic font-sans">
                ✓ {{ item.resolutionNote }}
              </p>
            </div>
          </div>

          <div class="px-3.5 py-2 border-t border-[#283548] text-center bg-[#0e1422]/70">
            <router-link
              to="/events"
              class="text-blue-400 hover:text-blue-300 text-[11px] font-medium font-sans flex items-center justify-center gap-1"
              @click="showNotifications = false"
            >
              <span>Lihat Semua (Total: {{ eventsStore.stats.total }})</span>
              <span>→</span>
            </router-link>
          </div>
        </div>
      </div>

      <!-- User Profile Menu -->
      <div class="relative">
        <button
          type="button"
          class="flex items-center gap-2 pl-2 pr-3 py-1 rounded-lg hover:bg-slate-800 transition-colors border border-transparent hover:border-slate-700"
          @click="toggleProfileMenu"
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

        <!-- Click outside backdrop for profile -->
        <div
          v-if="showProfileMenu"
          class="fixed inset-0 z-40"
          @click="showProfileMenu = false"
        ></div>

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
            class="w-full text-left px-3 py-2 text-rose-400 hover:bg-rose-950/40 hover:text-rose-300 flex items-center gap-2 mt-1 cursor-pointer"
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
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth.js'
import { useEventsStore } from '../../stores/events.js'
import { useToast } from '../../composables/useToast.js'
import {
  Menu,
  ChevronRight,
  ChevronDown,
  Bell,
  LogOut,
  RefreshCw,
  CheckCircle2
} from '@lucide/vue'

defineEmits(['toggle-mobile-sidebar'])

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const eventsStore = useEventsStore()
const toast = useToast()

const showNotifications = ref(false)
const showProfileMenu = ref(false)
let pollTimer = null

const currentTitle = computed(() => {
  return route.meta?.title || 'Dashboard'
})

function toggleNotifications() {
  showNotifications.value = !showNotifications.value
  if (showNotifications.value) {
    showProfileMenu.value = false
    eventsStore.fetchStats()
    eventsStore.fetchRecentNotifications()
  }
}

function toggleProfileMenu() {
  showProfileMenu.value = !showProfileMenu.value
  if (showProfileMenu.value) {
    showNotifications.value = false
  }
}

function handleSelectNotification() {
  showNotifications.value = false
  router.push('/events')
}

function formatTimeAgo(isoStr) {
  if (!isoStr) return '-'
  const d = new Date(isoStr)
  if (isNaN(d.getTime())) return isoStr
  const diffSec = Math.floor((Date.now() - d.getTime()) / 1000)
  if (diffSec < 60) return 'Baru saja'
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin}m lalu`
  const diffHour = Math.floor(diffMin / 60)
  if (diffHour < 24) return `${diffHour}j lalu`
  const diffDay = Math.floor(diffHour / 24)
  return `${diffDay}h lalu`
}

async function handleLogout() {
  showProfileMenu.value = false
  await authStore.logout()
  router.push('/login')
  toast.success('Berhasil keluar')
}

onMounted(() => {
  eventsStore.fetchStats()
  eventsStore.fetchRecentNotifications()
  // Polling status alarm setiap 20 detik agar badge navbar selalu real-time
  pollTimer = setInterval(() => {
    eventsStore.fetchStats()
  }, 20000)
})

onUnmounted(() => {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
})
</script>
