<template>
  <aside
    :class="[
      'h-screen sticky top-0 bg-[#0e1422] border-r border-[#283548] flex flex-col z-30 transition-all duration-200 select-none shrink-0',
      collapsed ? 'w-16' : 'w-64'
    ]"
  >
    <!-- Brand / System Title -->
    <div class="h-14 border-b border-[#283548] flex items-center px-4 justify-between bg-[#0b0f17]/60">
      <div v-if="!collapsed" class="flex items-center gap-2.5 min-w-0">
        <div class="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400 shrink-0">
          <Radio class="w-4 h-4 animate-pulse" />
        </div>
        <div class="truncate">
          <h1 class="text-xs font-bold text-slate-100 tracking-wider uppercase font-mono truncate">
            CCTV & PAGING
          </h1>
          <span class="text-[10px] text-blue-400 font-mono flex items-center gap-1">
            <span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            OPS CONTROL
          </span>
        </div>
      </div>
      <div v-else class="mx-auto">
        <div class="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
          <Radio class="w-4 h-4" />
        </div>
      </div>

      <button
        v-if="!collapsed"
        type="button"
        class="text-slate-400 hover:text-white p-1 rounded-md hover:bg-slate-800 transition-colors"
        title="Perkecil Sidebar"
        @click="$emit('toggle-collapse')"
      >
        <ChevronLeft class="w-4 h-4" />
      </button>
    </div>

    <!-- Navigation Menu Items -->
    <div class="flex-1 overflow-y-auto py-3 px-2 space-y-6">
      <!-- OPERATOR SECTION -->
      <div>
        <div
          v-if="!collapsed"
          class="px-2.5 mb-1.5 text-[10px] font-semibold text-slate-500 uppercase tracking-wider font-mono"
        >
          Operasi Monitoring
        </div>
        <nav class="space-y-0.5">
          <router-link
            v-for="item in operatorNav"
            :key="item.path"
            :to="item.path"
            :class="[
              'flex items-center gap-3 px-2.5 py-2 rounded-md text-xs font-medium transition-all group relative',
              isActive(item.path)
                ? 'bg-blue-600/15 text-blue-400 border border-blue-500/30 font-semibold'
                : 'text-slate-300 hover:bg-[#151f33] hover:text-white'
            ]"
            :title="collapsed ? item.label : ''"
          >
            <component :is="item.icon" class="w-4 h-4 shrink-0 transition-transform group-hover:scale-105" />
            <span v-if="!collapsed" class="truncate">{{ item.label }}</span>
            <span
              v-if="item.badge && !collapsed"
              class="ml-auto text-[10px] font-mono px-1.5 py-0.2 rounded bg-blue-900/60 text-blue-300 border border-blue-700/40"
            >
              {{ item.badge }}
            </span>
          </router-link>
        </nav>
      </div>

      <!-- ADMIN SECTION -->
      <div v-if="authStore.isAdmin">
        <div
          v-if="!collapsed"
          class="px-2.5 mb-1.5 text-[10px] font-semibold text-slate-500 uppercase tracking-wider font-mono flex items-center justify-between"
        >
          <span>Administrasi</span>
          <span class="text-[9px] text-amber-400 font-mono">ADMIN</span>
        </div>
        <nav class="space-y-0.5">
          <template v-for="item in adminNav" :key="item.path">
            <!-- Non-child item -->
            <router-link
              v-if="!item.children"
              :to="item.path"
              :class="[
                'flex items-center gap-3 px-2.5 py-2 rounded-md text-xs font-medium transition-all group',
                isActive(item.path)
                  ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30 font-semibold'
                  : 'text-slate-300 hover:bg-[#151f33] hover:text-white'
              ]"
              :title="collapsed ? item.label : ''"
            >
              <component :is="item.icon" class="w-4 h-4 shrink-0 transition-transform group-hover:scale-105" />
              <span v-if="!collapsed" class="truncate">{{ item.label }}</span>
            </router-link>

            <!-- Parent item with children (Soft Delete) -->
            <div v-else class="space-y-0.5">
              <div
                :class="[
                  'flex items-center justify-between px-2.5 py-2 rounded-md text-xs font-medium transition-all group cursor-pointer select-none',
                  isSoftDeleteActive
                    ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30 font-semibold'
                    : 'text-slate-300 hover:bg-[#151f33] hover:text-white'
                ]"
                :title="collapsed ? item.label : ''"
                @click="toggleSoftDeleteExpand"
              >
                <div class="flex items-center gap-3 min-w-0">
                  <component :is="item.icon" class="w-4 h-4 shrink-0 transition-transform group-hover:scale-105" />
                  <span v-if="!collapsed" class="truncate">{{ item.label }}</span>
                </div>
                <div v-if="!collapsed" class="flex items-center gap-1.5">
                  <span
                    v-if="trashStore.summary.totalCount > 0"
                    class="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-950/80 text-amber-300 border border-amber-800"
                  >
                    {{ trashStore.summary.totalCount }}
                  </span>
                  <component :is="softDeleteExpanded ? ChevronDown : ChevronRight" class="w-3.5 h-3.5 text-slate-400" />
                </div>
              </div>

              <!-- Children list (Indented) -->
              <div
                v-if="!collapsed && softDeleteExpanded"
                class="pl-4 ml-3 border-l border-amber-500/30 space-y-0.5 py-1 transition-all"
              >
                <router-link
                  v-for="sub in item.children"
                  :key="sub.path"
                  :to="sub.path"
                  :class="[
                    'flex items-center justify-between px-2 py-1.5 rounded-md text-[11px] font-medium transition-all group font-mono',
                    route.path === sub.path
                      ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40'
                      : 'text-slate-400 hover:bg-[#151f33] hover:text-slate-100'
                  ]"
                >
                  <div class="flex items-center gap-2 truncate">
                    <component :is="sub.icon" class="w-3.5 h-3.5 shrink-0 opacity-80" />
                    <span class="truncate">{{ sub.label }}</span>
                  </div>
                  <span
                    v-if="sub.badge && sub.badge() > 0"
                    class="ml-auto text-[9px] font-mono px-1 rounded bg-[#101726] text-amber-400 border border-amber-800/60"
                  >
                    {{ sub.badge() }}
                  </span>
                </router-link>
              </div>
            </div>
          </template>
        </nav>
      </div>
    </div>

    <!-- Sidebar Bottom: Collapse button if collapsed & Demo Role Indicator -->
    <div class="p-2 border-t border-[#283548] bg-[#0b0f17]/40 space-y-2">
      <button
        v-if="collapsed"
        type="button"
        class="w-full flex items-center justify-center p-2 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        title="Perluas Sidebar"
        @click="$emit('toggle-collapse')"
      >
        <ChevronRight class="w-4 h-4" />
      </button>

      <div
        v-if="!collapsed"
        class="p-2 rounded-md bg-[#131b2c] border border-[#283548] text-[11px] text-slate-400"
      >
        <div class="flex items-center justify-between mb-1">
          <span class="font-mono text-slate-500 text-[10px]">AKTIF SEBAGAI:</span>
          <span
            :class="[
              'px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold',
              authStore.isAdmin ? 'bg-amber-950 text-amber-300 border border-amber-800' : 'bg-blue-950 text-blue-300 border border-blue-800'
            ]"
          >
            {{ authStore.user?.role }}
          </span>
        </div>
        <p class="truncate font-medium text-slate-200">
          {{ authStore.user?.fullName }}
        </p>
      </div>
    </div>
  </aside>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth.js'
import { useTrashStore } from '../../stores/trash.js'
import {
  LayoutDashboard,
  Video,
  Megaphone,
  BellRing,
  Server,
  MapPin,
  Users,
  ClipboardList,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Radio,
  ArchiveRestore
} from '@lucide/vue'

const props = defineProps({
  collapsed: {
    type: Boolean,
    default: false
  }
})

defineEmits(['toggle-collapse'])

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const trashStore = useTrashStore()

const softDeleteExpanded = ref(true)
const isSoftDeleteActive = computed(() => route.path.startsWith('/soft-delete'))

function toggleSoftDeleteExpand() {
  if (props.collapsed) {
    router.push('/soft-delete/devices')
  } else {
    softDeleteExpanded.value = !softDeleteExpanded.value
    if (!isSoftDeleteActive.value) {
      router.push('/soft-delete/devices')
    }
  }
}

onMounted(() => {
  if (authStore.isAdmin) {
    trashStore.fetchSummary()
  }
})

const operatorNav = [
  { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { label: 'CCTV Monitoring', path: '/cctv', icon: Video, badge: 'GRID & MAP' },
  { label: 'Audio Paging', path: '/audio-paging', icon: Megaphone },
  { label: 'Event & Alarm', path: '/events', icon: BellRing }
]

const adminNav = [
  { label: 'Device Management', path: '/devices', icon: Server },
  { label: 'Site & Zone', path: '/sites-zones', icon: MapPin },
  { label: 'User Management', path: '/users', icon: Users },
  {
    label: 'Soft Delete',
    path: '/soft-delete',
    icon: ArchiveRestore,
    children: [
      {
        label: 'Device Management',
        path: '/soft-delete/devices',
        icon: Server,
        badge: () => trashStore.summary.devicesCount
      },
      {
        label: 'Site & Zone',
        path: '/soft-delete/sites-zones',
        icon: MapPin,
        badge: () => trashStore.summary.sitesZonesCount
      },
      {
        label: 'User Management',
        path: '/soft-delete/users',
        icon: Users,
        badge: () => trashStore.summary.usersCount
      }
    ]
  },
  { label: 'Audit Log', path: '/audit-logs', icon: ClipboardList },
]

function isActive(path) {
  return route.path === path || route.path.startsWith(path + '/')
}
</script>
