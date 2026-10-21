import { defineStore } from 'pinia'
import { ref, reactive } from 'vue'

export const useAuditStore = defineStore('audit', () => {
  const logs = ref([])
  const loading = ref(false)
  const statsLoading = ref(false)
  const error = ref(null)

  const pagination = reactive({
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 1
  })

  const stats = reactive({
    total: 0,
    successCount: 0,
    failureCount: 0,
    todayCount: 0,
    actions: [],
    entityTypes: []
  })

  const selectedLog = ref(null)

  async function fetchStats() {
    statsLoading.value = true
    try {
      const res = await fetch('/api/audit-logs/stats', {
        headers: { Accept: 'application/json' },
        credentials: 'include'
      })
      const body = await res.json()
      if (body.success && body.data) {
        stats.total = body.data.total || 0
        stats.successCount = body.data.successCount || 0
        stats.failureCount = body.data.failureCount || 0
        stats.todayCount = body.data.todayCount || 0
        stats.actions = body.data.actions || []
        stats.entityTypes = body.data.entityTypes || []
      }
    } catch (err) {
      console.error('fetchStats audit error:', err)
    } finally {
      statsLoading.value = false
    }
  }

  async function fetchLogs(query = {}) {
    loading.value = true
    error.value = null

    try {
      const searchParams = new URLSearchParams()
      if (query.page) searchParams.set('page', String(query.page))
      if (query.limit) searchParams.set('limit', String(query.limit))
      if (query.action && query.action !== 'ALL') searchParams.set('action', query.action)
      if (query.result && query.result !== 'ALL') searchParams.set('result', query.result)
      if (query.entityType && query.entityType !== 'ALL') searchParams.set('entityType', query.entityType)
      if (query.search && query.search.trim()) searchParams.set('search', query.search.trim())
      if (query.startDate) searchParams.set('startDate', query.startDate)
      if (query.endDate) searchParams.set('endDate', query.endDate)

      const url = `/api/audit-logs?${searchParams.toString()}`
      const res = await fetch(url, {
        headers: { Accept: 'application/json' },
        credentials: 'include'
      })

      const body = await res.json()
      if (!res.ok || !body.success) {
        throw new Error(body.error?.message || body.message || 'Gagal memuat catatan audit log')
      }

      logs.value = body.data || []
      if (body.pagination) {
        pagination.total = body.pagination.total
        pagination.page = body.pagination.page
        pagination.limit = body.pagination.limit
        pagination.totalPages = body.pagination.totalPages
      }
      return body.data
    } catch (err) {
      error.value = err.message
      console.error('fetchLogs audit error:', err)
      return []
    } finally {
      loading.value = false
    }
  }

  async function fetchLogById(id) {
    try {
      const res = await fetch(`/api/audit-logs/${id}`, {
        headers: { Accept: 'application/json' },
        credentials: 'include'
      })
      const body = await res.json()
      if (body.success && body.data) {
        selectedLog.value = body.data
        return body.data
      }
      throw new Error(body.error?.message || 'Gagal mengambil detail log')
    } catch (err) {
      console.error('fetchLogById error:', err)
      throw err
    }
  }

  function downloadExport(query = {}, format = 'csv') {
    const searchParams = new URLSearchParams()
    if (query.action && query.action !== 'ALL') searchParams.set('action', query.action)
    if (query.result && query.result !== 'ALL') searchParams.set('result', query.result)
    if (query.entityType && query.entityType !== 'ALL') searchParams.set('entityType', query.entityType)
    if (query.search && query.search.trim()) searchParams.set('search', query.search.trim())
    if (query.startDate) searchParams.set('startDate', query.startDate)
    if (query.endDate) searchParams.set('endDate', query.endDate)
    searchParams.set('format', format)

    const url = `/api/audit-logs/export?${searchParams.toString()}`
    window.open(url, '_blank')
  }

  return {
    logs,
    loading,
    statsLoading,
    error,
    pagination,
    stats,
    selectedLog,
    fetchStats,
    fetchLogs,
    fetchLogById,
    downloadExport
  }
})
