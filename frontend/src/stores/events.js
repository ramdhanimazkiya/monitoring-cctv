import { defineStore } from 'pinia'
import { ref, reactive } from 'vue'

export const useEventsStore = defineStore('events', () => {
  const events = ref([])
  const loading = ref(false)
  const statsLoading = ref(false)
  const actionLoading = ref(false)
  const error = ref(null)

  const pagination = reactive({
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 1
  })

  const stats = reactive({
    total: 0,
    offlineActiveCount: 0,
    resolvedCount: 0,
    cameraCount: 0,
    audioCount: 0
  })

  const selectedEvent = ref(null)

  async function fetchStats() {
    statsLoading.value = true
    try {
      const res = await fetch('/api/events/stats', {
        headers: { Accept: 'application/json' },
        credentials: 'include'
      })
      const body = await res.json()
      if (body.success && body.data) {
        stats.total = body.data.total || 0
        stats.offlineActiveCount = body.data.offlineActiveCount || 0
        stats.resolvedCount = body.data.resolvedCount || 0
        stats.cameraCount = body.data.cameraCount || 0
        stats.audioCount = body.data.audioCount || 0
      }
    } catch (err) {
      console.error('fetchStats events error:', err)
    } finally {
      statsLoading.value = false
    }
  }

  async function fetchEvents(query = {}) {
    loading.value = true
    error.value = null

    try {
      const searchParams = new URLSearchParams()
      if (query.page) searchParams.set('page', String(query.page))
      if (query.limit) searchParams.set('limit', String(query.limit))
      if (query.status && query.status !== 'ALL') searchParams.set('status', query.status)
      if (query.deviceType && query.deviceType !== 'ALL') searchParams.set('deviceType', query.deviceType)
      if (query.search && query.search.trim()) searchParams.set('search', query.search.trim())
      if (query.startDate) searchParams.set('startDate', query.startDate)
      if (query.endDate) searchParams.set('endDate', query.endDate)

      const url = `/api/events?${searchParams.toString()}`
      const res = await fetch(url, {
        headers: { Accept: 'application/json' },
        credentials: 'include'
      })

      const body = await res.json()
      if (!res.ok || !body.success) {
        throw new Error(body.error?.message || body.message || 'Gagal memuat catatan events & alarms')
      }

      events.value = body.data || []
      if (body.pagination) {
        pagination.total = body.pagination.total
        pagination.page = body.pagination.page
        pagination.limit = body.pagination.limit
        pagination.totalPages = body.pagination.totalPages
      }
      return body.data
    } catch (err) {
      error.value = err.message
      console.error('fetchEvents error:', err)
      return []
    } finally {
      loading.value = false
    }
  }

  async function fetchEventById(id) {
    try {
      const res = await fetch(`/api/events/${id}`, {
        headers: { Accept: 'application/json' },
        credentials: 'include'
      })
      const body = await res.json()
      if (body.success && body.data) {
        selectedEvent.value = body.data
        return body.data
      }
      throw new Error(body.error?.message || 'Gagal memuat detail event')
    } catch (err) {
      console.error('fetchEventById error:', err)
      throw err
    }
  }

  async function acknowledgeEvent(id) {
    actionLoading.value = true
    try {
      const res = await fetch(`/api/events/${id}/acknowledge`, {
        method: 'PATCH',
        headers: { Accept: 'application/json' },
        credentials: 'include'
      })
      const body = await res.json()
      if (!res.ok || !body.success) {
        throw new Error(body.error?.message || 'Gagal me-acknowledge alarm')
      }
      const idx = events.value.findIndex((e) => e.id === String(id))
      if (idx !== -1) {
        events.value[idx] = body.data
      }
      if (selectedEvent.value && selectedEvent.value.id === String(id)) {
        selectedEvent.value = body.data
      }
      await fetchStats()
      return body.data
    } finally {
      actionLoading.value = false
    }
  }

  async function resolveEvent(id, resolutionNote = '') {
    actionLoading.value = true
    try {
      const res = await fetch(`/api/events/${id}/resolve`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ resolutionNote })
      })
      const body = await res.json()
      if (!res.ok || !body.success) {
        throw new Error(body.error?.message || 'Gagal menyelesaikan alarm')
      }
      const idx = events.value.findIndex((e) => e.id === String(id))
      if (idx !== -1) {
        events.value[idx] = body.data
      }
      if (selectedEvent.value && selectedEvent.value.id === String(id)) {
        selectedEvent.value = body.data
      }
      await fetchStats()
      return body.data
    } finally {
      actionLoading.value = false
    }
  }

  function downloadExport(query = {}, format = 'csv') {
    const searchParams = new URLSearchParams()
    if (query.status && query.status !== 'ALL') searchParams.set('status', query.status)
    if (query.deviceType && query.deviceType !== 'ALL') searchParams.set('deviceType', query.deviceType)
    if (query.search && query.search.trim()) searchParams.set('search', query.search.trim())
    if (query.startDate) searchParams.set('startDate', query.startDate)
    if (query.endDate) searchParams.set('endDate', query.endDate)
    searchParams.set('format', format)

    const url = `/api/events/export?${searchParams.toString()}`
    window.open(url, '_blank')
  }

  const recentNotifications = ref([])
  const notificationsLoading = ref(false)

  async function fetchRecentNotifications() {
    notificationsLoading.value = true
    try {
      const res = await fetch('/api/events?limit=5', {
        headers: { Accept: 'application/json' },
        credentials: 'include'
      })
      const body = await res.json()
      if (body.success && Array.isArray(body.data)) {
        recentNotifications.value = body.data
      }
    } catch (err) {
      console.warn('Gagal memuat notifikasi recent navbar:', err)
    } finally {
      notificationsLoading.value = false
    }
  }

  return {
    events,
    recentNotifications,
    notificationsLoading,
    loading,
    statsLoading,
    actionLoading,
    error,
    pagination,
    stats,
    selectedEvent,
    fetchStats,
    fetchEvents,
    fetchRecentNotifications,
    fetchEventById,
    acknowledgeEvent,
    resolveEvent,
    downloadExport
  }
})
