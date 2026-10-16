import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useUsersStore = defineStore('users', () => {
  const users = ref([])
  const loading = ref(false)
  const error = ref(null)

  async function fetchUsers() {
    loading.value = true
    error.value = null
    try {
      const res = await fetch('/api/users', {
        headers: { Accept: 'application/json' },
        credentials: 'include',
      })
      const body = await res.json()
      if (body.success && Array.isArray(body.data)) {
        users.value = body.data
        return body.data
      }
      throw new Error(body.error?.message || 'Gagal memuat data pengguna')
    } catch (err) {
      error.value = err.message
      console.error('fetchUsers error:', err)
      return []
    } finally {
      loading.value = false
    }
  }

  async function createUser(payload) {
    loading.value = true
    error.value = null
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(payload),
      })
      const body = await res.json()
      if (!res.ok || !body.success) {
        throw new Error(body.error?.message || body.message || 'Gagal menambahkan pengguna')
      }
      await fetchUsers()
      return body.data
    } finally {
      loading.value = false
    }
  }

  async function updateUser(id, payload) {
    loading.value = true
    error.value = null
    try {
      const res = await fetch(`/api/users/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(payload),
      })
      const body = await res.json()
      if (!res.ok || !body.success) {
        throw new Error(body.error?.message || body.message || 'Gagal memperbarui pengguna')
      }
      await fetchUsers()
      return body.data
    } finally {
      loading.value = false
    }
  }

  async function deleteUser(id) {
    loading.value = true
    error.value = null
    try {
      const res = await fetch(`/api/users/${id}`, {
        method: 'DELETE',
        headers: { Accept: 'application/json' },
        credentials: 'include',
      })
      const body = await res.json()
      if (!res.ok || !body.success) {
        throw new Error(body.error?.message || body.message || 'Gagal menghapus pengguna')
      }
      await fetchUsers()
      return body.data
    } finally {
      loading.value = false
    }
  }

  return {
    users,
    loading,
    error,
    fetchUsers,
    createUser,
    updateUser,
    deleteUser,
  }
})
