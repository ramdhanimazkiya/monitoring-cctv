import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth.js'
import { useToast } from '../composables/useToast.js'

import DashboardLayout from '../layouts/DashboardLayout.vue'
import LoginView from '../views/LoginView.vue'
import DashboardView from '../views/DashboardView.vue'
import CctvView from '../views/CctvView.vue'
import AudioPagingView from '../views/AudioPagingView.vue'
import AudioSchedulerView from '../views/AudioSchedulerView.vue'
import EventsView from '../views/EventsView.vue'
import ReportsView from '../views/ReportsView.vue'
import DevicesView from '../views/DevicesView.vue'
import SitesZonesView from '../views/SitesZonesView.vue'
import UsersView from '../views/UsersView.vue'
import SettingsView from '../views/SettingsView.vue'
import AuditLogsView from '../views/AuditLogsView.vue'
import SoftDeleteView from '../views/SoftDeleteView.vue'

const routes = [
  {
    path: '/login',
    name: 'login',
    component: LoginView,
    meta: {
      title: 'Login Portal',
      public: true
    }
  },
  {
    path: '/',
    component: DashboardLayout,
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        redirect: '/dashboard'
      },
      {
        path: 'dashboard',
        name: 'dashboard',
        component: DashboardView,
        meta: { title: 'Dashboard Overview' }
      },
      {
        path: 'cctv',
        name: 'cctv',
        component: CctvView,
        meta: { title: 'CCTV Monitoring' }
      },
      {
        path: 'live-view',
        redirect: '/cctv'
      },
      {
        path: 'audio-paging',
        name: 'audio-paging',
        component: AudioPagingView,
        meta: { title: 'Audio Paging Console' }
      },
      {
        path: 'audio-scheduler',
        name: 'audio-scheduler',
        component: AudioSchedulerView,
        meta: { title: 'Audio Scheduler' }
      },
      {
        path: 'events',
        name: 'events',
        component: EventsView,
        meta: { title: 'Event & Alarm' }
      },
      {
        path: 'reports',
        name: 'reports',
        component: ReportsView,
        meta: { title: 'Laporan & Statistik' }
      },
      // Admin Only Views
      {
        path: 'devices',
        name: 'devices',
        component: DevicesView,
        meta: { title: 'Device Management', requiresAdmin: true }
      },
      {
        path: 'sites-zones',
        name: 'sites-zones',
        component: SitesZonesView,
        meta: { title: 'Site & Zone Management', requiresAdmin: true }
      },
      {
        path: 'users',
        name: 'users',
        component: UsersView,
        meta: { title: 'User Management', requiresAdmin: true }
      },
      {
        path: 'soft-delete',
        redirect: '/soft-delete/devices'
      },
      {
        path: 'soft-delete/:sub(devices|sites-zones|users)',
        name: 'soft-delete',
        component: SoftDeleteView,
        meta: { title: 'Data Terhapus (Soft Delete)', requiresAdmin: true }
      },
      {
        path: 'settings',
        name: 'settings',
        component: SettingsView,
        meta: { title: 'System Settings', requiresAdmin: true }
      },
      {
        path: 'audit-logs',
        name: 'audit-logs',
        component: AuditLogsView,
        meta: { title: 'Audit Trail Logs', requiresAdmin: true }
      }
    ]
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/dashboard'
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  const authStore = useAuthStore()
  const toast = useToast()

  // Update dynamic document title
  const pageTitle = to.meta.title ? `${to.meta.title} | CCTV & Audio Paging` : 'CCTV & Audio Paging System'
  document.title = pageTitle

  // Check public / auth
  if (!to.meta.public && !authStore.isAuthenticated) {
    return next({ path: '/login' })
  }

  // If already authenticated and trying to go to login
  if (to.meta.public && authStore.isAuthenticated) {
    return next({ path: '/dashboard' })
  }

  // Check admin permission
  if (to.meta.requiresAdmin && !authStore.isAdmin) {
    toast.error('Akses Ditolak', 'Halaman ini hanya dapat diakses oleh peran Administrator.')
    return next({ path: '/dashboard' })
  }

  next()
})

export default router
