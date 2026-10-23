import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useTrashStore = defineStore('trash', () => {
  const loading = ref(false)
  const summary = ref({
    camerasCount: 0,
    audioCount: 0,
    devicesCount: 0,
    sitesCount: 0,
    zonesCount: 0,
    sitesZonesCount: 0,
    usersCount: 0,
    totalCount: 0
  })

  const deletedDevices = ref({
    cameras: [],
    audioDevices: [],
    total: 0
  })

  const deletedSitesAndZones = ref({
    sites: [],
    zones: [],
    total: 0
  })

  const deletedUsers = ref([])

  async function fetchSummary() {
    try {
      const res = await fetch('/api/trash/summary', {
        headers: { Accept: 'application/json' },
        credentials: 'include'
      })
      if (res.ok) {
        const body = await res.json()
        if (body.success && body.data) {
          summary.value = body.data
        }
      }
    } catch (e) {
      console.warn('Gagal memuat ringkasan soft delete:', e)
    }
  }

  async function fetchDeletedDevices() {
    loading.value = true
    try {
      const res = await fetch('/api/trash/devices', {
        headers: { Accept: 'application/json' },
        credentials: 'include'
      })
      const body = await res.json()
      if (res.ok && body.success) {
        deletedDevices.value = body.data || { cameras: [], audioDevices: [], total: 0 }
        await fetchSummary()
        return body.data
      }
      throw new Error(body.error?.message || body.message || 'Gagal memuat perangkat terhapus')
    } finally {
      loading.value = false
    }
  }

  async function restoreDevice(type, id) {
    loading.value = true
    try {
      const res = await fetch(`/api/trash/devices/${type}/${id}/restore`, {
        method: 'POST',
        headers: { Accept: 'application/json' },
        credentials: 'include'
      })
      const body = await res.json()
      if (res.ok && body.success) {
        await fetchDeletedDevices()
        return body.data
      }
      throw new Error(body.error?.message || body.message || 'Gagal memulihkan perangkat')
    } finally {
      loading.value = false
    }
  }

  async function fetchDeletedSitesAndZones() {
    loading.value = true
    try {
      const res = await fetch('/api/trash/sites-zones', {
        headers: { Accept: 'application/json' },
        credentials: 'include'
      })
      const body = await res.json()
      if (res.ok && body.success) {
        deletedSitesAndZones.value = body.data || { sites: [], zones: [], total: 0 }
        await fetchSummary()
        return body.data
      }
      throw new Error(body.error?.message || body.message || 'Gagal memuat Site & Zona terhapus')
    } finally {
      loading.value = false
    }
  }

  async function restoreSite(id) {
    loading.value = true
    try {
      const res = await fetch(`/api/trash/sites/${id}/restore`, {
        method: 'POST',
        headers: { Accept: 'application/json' },
        credentials: 'include'
      })
      const body = await res.json()
      if (res.ok && body.success) {
        await fetchDeletedSitesAndZones()
        return body.data
      }
      throw new Error(body.error?.message || body.message || 'Gagal memulihkan Site')
    } finally {
      loading.value = false
    }
  }

  async function restoreZone(id) {
    loading.value = true
    try {
      const res = await fetch(`/api/trash/zones/${id}/restore`, {
        method: 'POST',
        headers: { Accept: 'application/json' },
        credentials: 'include'
      })
      const body = await res.json()
      if (res.ok && body.success) {
        await fetchDeletedSitesAndZones()
        return body.data
      }
      throw new Error(body.error?.message || body.message || 'Gagal memulihkan Zona')
    } finally {
      loading.value = false
    }
  }

  async function fetchDeletedUsers() {
    loading.value = true
    try {
      const res = await fetch('/api/trash/users', {
        headers: { Accept: 'application/json' },
        credentials: 'include'
      })
      const body = await res.json()
      if (res.ok && body.success) {
        deletedUsers.value = body.data?.users || []
        await fetchSummary()
        return body.data
      }
      throw new Error(body.error?.message || body.message || 'Gagal memuat pengguna terhapus')
    } finally {
      loading.value = false
    }
  }

  async function restoreUser(id) {
    loading.value = true
    try {
      const res = await fetch(`/api/trash/users/${id}/restore`, {
        method: 'POST',
        headers: { Accept: 'application/json' },
        credentials: 'include'
      })
      const body = await res.json()
      if (res.ok && body.success) {
        await fetchDeletedUsers()
        return body.data
      }
      throw new Error(body.error?.message || body.message || 'Gagal memulihkan pengguna')
    } finally {
      loading.value = false
    }
  }

  return {
    loading,
    summary,
    deletedDevices,
    deletedSitesAndZones,
    deletedUsers,
    fetchSummary,
    fetchDeletedDevices,
    restoreDevice,
    fetchDeletedSitesAndZones,
    restoreSite,
    restoreZone,
    fetchDeletedUsers,
    restoreUser
  }
})
