import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useAuthStore = defineStore('auth', () => {
  // Ambil state tersimpan dari localStorage jika ada
  const cachedUserStr = typeof window !== 'undefined' ? localStorage.getItem('cctv_user') : null
  let initialUser = null
  try {
    initialUser = cachedUserStr ? JSON.parse(cachedUserStr) : null
  } catch (_) {
    initialUser = null
  }

  // Jika belum ada session sama sekali, gunakan null (wajib login)
  const user = ref(initialUser)
  const isAuthenticated = ref(!!initialUser)
  const isInitializing = ref(false)

  const isAdmin = computed(() => user.value?.role === 'ADMIN')
  const isOperator = computed(() => user.value?.role === 'OPERATOR')
  const currentRole = computed(() => user.value?.role || 'GUEST')

  /**
   * Mengambil data user yang sedang login dari server session (GET /api/auth/me)
   */
  async function fetchCurrentUser() {
    isInitializing.value = true
    try {
      const res = await fetch('/api/auth/me', {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        credentials: 'include',
      })

      if (res.ok) {
        const body = await res.json()
        if (body.success && body.data?.user) {
          user.value = body.data.user
          isAuthenticated.value = true
          localStorage.setItem('cctv_user', JSON.stringify(body.data.user))
          return body.data.user
        }
      }

      // Jika cookie tidak ada atau session kadaluwarsa di server
      user.value = null
      isAuthenticated.value = false
      localStorage.removeItem('cctv_user')
      return null
    } catch (err) {
      console.warn('Gagal memuat sesi auth dari server:', err)
      return null
    } finally {
      isInitializing.value = false
    }
  }

  /**
   * Proses login ke backend dengan pemisahan portal ketat (ADMIN vs OPERATOR)
   */
  async function login({ username, password, targetPortal = null }) {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        username: username.trim(),
        password,
      }),
    })

    const body = await res.json()

    if (!res.ok || !body.success) {
      const errMsg = body.error?.message || body.message || 'Login gagal. Periksa username dan password.'
      throw new Error(errMsg)
    }

    const authenticatedUser = body.data.user

    // Validasi Pemisahan Portal: Pastikan role akun cocok dengan portal yang dipilih
    if (targetPortal === 'ADMIN' && authenticatedUser.role !== 'ADMIN') {
      // Segera bersihkan session di server karena tidak berhak masuk portal Admin
      await logout()
      throw new Error('Akses Ditolak: Akun Anda tidak memiliki izin akses Administrator pada portal ini.')
    }

    if (targetPortal === 'OPERATOR' && authenticatedUser.role !== 'OPERATOR') {
      // Akun Admin mencoba login di portal Operator
      await logout()
      throw new Error('Akun Anda memiliki hak akses Administrator. Silakan gunakan tab Portal Administrator.')
    }

    // Set state pengguna (Terkunci permanen, tidak bisa diganti di dashboard)
    user.value = authenticatedUser
    isAuthenticated.value = true
    localStorage.setItem('cctv_user', JSON.stringify(authenticatedUser))

    return authenticatedUser
  }

  /**
   * Proses logout dan pembersihan sesi di server & client
   */
  async function logout() {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'Accept': 'application/json' },
        credentials: 'include',
      })
    } catch (_) {
      // Abaikan jika network offline
    } finally {
      user.value = null
      isAuthenticated.value = false
      localStorage.removeItem('cctv_user')
    }
  }

  return {
    user,
    isAuthenticated,
    isInitializing,
    isAdmin,
    isOperator,
    currentRole,
    fetchCurrentUser,
    login,
    logout,
  }
})
