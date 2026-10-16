<template>
  <div class="space-y-6">
    <!-- Header: Title & Actions -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#283548]">
      <div>
        <div class="flex items-center gap-2 flex-wrap">
          <h2 class="text-lg font-bold text-slate-100 tracking-tight">Manajemen Pengguna (User Management)</h2>
          <span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-950/70 text-amber-300 border border-amber-800">
            ADMINISTRASI
          </span>
          <span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-950/70 text-blue-300 border border-blue-800">
            RBAC
          </span>
        </div>
        <p class="text-xs text-slate-400 mt-1 font-mono">
          Pengaturan akun pengguna sistem dan pembagian hak peran (Admin / Operator).
        </p>
      </div>

      <!-- Action Button -->
      <div class="flex items-center gap-2">
        <Button variant="primary" size="sm" @click="openCreateUserModal">
          + Tambah Pengguna
        </Button>
      </div>
    </div>

    <!-- Metric Summary Cards -->
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
      <div class="p-3 bg-[#0d131f] border border-[#1e2a3b] rounded-xl flex items-center justify-between">
        <div>
          <span class="text-[10px] text-slate-400 uppercase block">Total Pengguna:</span>
          <p class="text-xl font-bold text-slate-100">{{ usersStore.users.length }}</p>
        </div>
        <div class="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
          <Users class="w-4 h-4" />
        </div>
      </div>

      <div class="p-3 bg-[#0d131f] border border-[#1e2a3b] rounded-xl flex items-center justify-between">
        <div>
          <span class="text-[10px] text-slate-400 uppercase block">Administrator:</span>
          <p class="text-xl font-bold text-amber-400">{{ totalAdmins }}</p>
        </div>
        <div class="w-8 h-8 rounded-lg bg-amber-600/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
          <ShieldCheck class="w-4 h-4" />
        </div>
      </div>

      <div class="p-3 bg-[#0d131f] border border-[#1e2a3b] rounded-xl flex items-center justify-between">
        <div>
          <span class="text-[10px] text-slate-400 uppercase block">Operator:</span>
          <p class="text-xl font-bold text-indigo-400">{{ totalOperators }}</p>
        </div>
        <div class="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
          <UserCheck class="w-4 h-4" />
        </div>
      </div>

      <div class="p-3 bg-[#0d131f] border border-[#1e2a3b] rounded-xl flex items-center justify-between">
        <div>
          <span class="text-[10px] text-slate-400 uppercase block">Akun Aktif:</span>
          <p class="text-xl font-bold text-emerald-400">{{ totalActiveUsers }}</p>
        </div>
        <div class="w-8 h-8 rounded-lg bg-emerald-600/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
          <CheckCircle2 class="w-4 h-4" />
        </div>
      </div>
    </div>

    <!-- Filter & Search Controls -->
    <div class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#0d131f] border border-[#1e2a3b] p-2.5 rounded-xl text-xs font-mono">
      <div class="flex items-center gap-2 flex-1">
        <Filter class="w-4 h-4 text-slate-400 shrink-0 ml-1" />
        <select
          v-model="selectedRoleFilter"
          class="bg-transparent text-slate-200 text-xs focus:outline-none cursor-pointer"
        >
          <option value="ALL" class="bg-[#111827] text-slate-200">Semua Peran (Role)</option>
          <option value="ADMIN" class="bg-[#111827] text-slate-200">Administrator</option>
          <option value="OPERATOR" class="bg-[#111827] text-slate-200">Operator</option>
        </select>

        <div class="w-px h-6 bg-[#283548]"></div>

        <select
          v-model="selectedStatusFilter"
          class="bg-transparent text-slate-200 text-xs focus:outline-none cursor-pointer"
        >
          <option value="ALL" class="bg-[#111827] text-slate-200">Semua Status</option>
          <option value="ACTIVE" class="bg-[#111827] text-slate-200">Aktif</option>
          <option value="INACTIVE" class="bg-[#111827] text-slate-200">Nonaktif</option>
        </select>

        <div class="w-px h-6 bg-[#283548]"></div>

        <input
          v-model="searchQuery"
          type="text"
          placeholder="Cari username, nama lengkap, ID, atau email..."
          class="flex-1 bg-transparent text-slate-200 placeholder-slate-500 focus:outline-none"
        />
      </div>

      <div class="flex items-center gap-2">
        <span class="text-[11px] text-slate-400 font-mono">
          Total: <strong class="text-blue-400">{{ filteredUsers.length }}</strong> Pengguna
        </span>
      </div>
    </div>

    <!-- Users Table -->
    <Table
      title="Daftar Pengguna Sistem"
      subtitle="Otoritas akses autentikasi portal dan hak operasional perangkat"
      :count="filteredUsers.length"
      :columns="columns"
      :data="paginatedUsers"
    >
      <!-- Slot ID -->
      <template #id="{ row }">
        <div class="flex items-center gap-1.5 font-mono">
          <span class="font-bold text-purple-400">{{ row.id }}</span>
          <span class="text-[10px] text-slate-500" title="ID dibuat otomatis oleh database (Immutable)">[AUTO]</span>
        </div>
      </template>

      <!-- Slot User (Username & Email) -->
      <template #user="{ row }">
        <div class="flex items-center gap-2.5">
          <div
            :class="[
              'w-7 h-7 rounded-full flex items-center justify-center font-mono font-bold text-xs uppercase shrink-0',
              row.role === 'ADMIN' ? 'bg-amber-950/80 text-amber-300 border border-amber-700/80' : 'bg-indigo-950/80 text-indigo-300 border border-indigo-700/80'
            ]"
          >
            {{ row.username?.substring(0, 2) || 'US' }}
          </div>
          <div>
            <span class="font-mono font-bold text-xs text-slate-100 block">@{{ row.username }}</span>
            <span v-if="row.email" class="text-[10px] text-slate-400 font-mono block truncate max-w-[180px]">
              {{ row.email }}
            </span>
          </div>
        </div>
      </template>

      <!-- Slot Nama Lengkap -->
      <template #fullName="{ row }">
        <span class="text-xs font-medium text-slate-200">{{ row.fullName }}</span>
      </template>

      <!-- Slot Role -->
      <template #role="{ row }">
        <span
          :class="[
            'px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase inline-flex items-center gap-1',
            row.role === 'ADMIN'
              ? 'bg-amber-950/80 text-amber-300 border border-amber-800'
              : 'bg-indigo-950/80 text-indigo-300 border border-indigo-800'
          ]"
        >
          <ShieldCheck v-if="row.role === 'ADMIN'" class="w-3 h-3 text-amber-400" />
          <UserCheck v-else class="w-3 h-3 text-indigo-400" />
          {{ row.role }}
        </span>
      </template>


      <!-- Slot Status Akun -->
      <template #status="{ row }">
        <Badge
          :status="row.isActive ? 'ACTIVE' : 'INACTIVE'"
          :label="row.isActive ? 'AKTIF' : 'NONAKTIF'"
          size="xs"
        />
      </template>

      <!-- Slot Aksi -->
      <template #actions="{ row }">
        <div class="flex items-center justify-end gap-1.5">
          <Button variant="ghost" size="xs" @click="handleEditUser(row)">
            Edit
          </Button>
          <Button
            variant="ghost"
            size="xs"
            class="text-rose-400 hover:text-rose-300"
            :disabled="row.id === authStore.user?.id"
            :title="row.id === authStore.user?.id ? 'Tidak dapat menghapus akun sendiri' : 'Hapus pengguna'"
            @click="handleDeleteUser(row)"
          >
            Hapus
          </Button>
        </div>
      </template>

      <!-- Pagination Footer -->
      <template #footer>
        <div class="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono text-slate-400">
          <div>
            <span>Menampilkan </span>
            <strong class="text-slate-200">
              {{ filteredUsers.length === 0 ? 0 : (currentPage - 1) * pageSize + 1 }} - {{ Math.min(currentPage * pageSize, filteredUsers.length) }}
            </strong>
            <span> dari </span>
            <strong class="text-slate-200">{{ filteredUsers.length }}</strong>
            <span> pengguna terdaftar</span>
          </div>

          <div class="flex items-center gap-1.5">
            <button
              type="button"
              :disabled="currentPage <= 1"
              class="px-2.5 py-1 rounded bg-[#151f33] border border-[#283548] text-slate-300 hover:text-white hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              @click="currentPage--"
            >
              &larr; Sebelumnya
            </button>

            <span class="px-2.5 py-1 text-slate-300 bg-[#0d131f] border border-[#283548] rounded font-bold">
              {{ currentPage }} / {{ totalPages }}
            </span>

            <button
              type="button"
              :disabled="currentPage >= totalPages"
              class="px-2.5 py-1 rounded bg-[#151f33] border border-[#283548] text-slate-300 hover:text-white hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              @click="currentPage++"
            >
              Selanjutnya &rarr;
            </button>
          </div>
        </div>
      </template>
    </Table>

    <!-- ===================================================================== -->
    <!-- MODAL: TAMBAH / EDIT PENGGUNA                                         -->
    <!-- ===================================================================== -->
    <Modal
      v-model="userModalOpen"
      :title="userModalMode === 'create' ? 'Tambah Pengguna Baru' : `Edit Pengguna: ${activeUser.id}`"
      description="Kelola akun pengguna dan hak akses peran (RBAC)."
      size="md"
    >
      <div class="space-y-3.5">
        <!-- Auto Generated ID Display -->
        <div class="p-2.5 rounded bg-[#151d2e] border border-[#283548] text-xs font-mono flex items-center justify-between">
          <span class="text-slate-400">ID Pengguna (Terkunci & Immutable): </span>
          <strong class="text-purple-400 font-bold">
            {{ userModalMode === 'create' ? `[AUTO: ${previewNextUserId}]` : activeUser.id }}
          </strong>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <!-- Username -->
          <div>
            <label class="text-xs font-medium text-slate-300 block mb-1">
              Username <span class="text-rose-400">*</span>
            </label>
            <input
              v-model="activeUser.username"
              type="text"
              :disabled="userModalMode === 'edit'"
              placeholder="contoh: operator_1"
              class="w-full bg-[#111827] border border-[#283548] rounded px-3 py-1.5 text-xs font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 disabled:opacity-60 disabled:cursor-not-allowed"
            />
            <span v-if="userModalMode === 'edit'" class="text-[10px] text-slate-500 font-mono mt-0.5 block">
              Username tidak dapat diubah setelah dibuat.
            </span>
          </div>

          <!-- Role -->
          <div>
            <label class="text-xs font-medium text-slate-300 block mb-1">
              Peran Akun (Role) <span class="text-rose-400">*</span>
            </label>
            <select
              v-model="activeUser.role"
              class="w-full bg-[#111827] border border-[#283548] rounded px-3 py-1.5 text-xs font-mono text-slate-100 focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="OPERATOR">OPERATOR</option>
              <option value="ADMIN">ADMIN (Akses Penuh Semua Modul)</option>
            </select>
          </div>
        </div>

        <!-- Nama Lengkap -->
        <div>
          <label class="text-xs font-medium text-slate-300 block mb-1">
            Nama Lengkap <span class="text-rose-400">*</span>
          </label>
          <input
            v-model="activeUser.fullName"
            type="text"
            placeholder="contoh: Budi Santoso"
            class="w-full bg-[#111827] border border-[#283548] rounded px-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        <!-- Email & Password -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label class="text-xs font-medium text-slate-300 block mb-1">
              Email (Opsional)
            </label>
            <input
              v-model="activeUser.email"
              type="email"
              placeholder="budi@instansi.go.id"
              class="w-full bg-[#111827] border border-[#283548] rounded px-3 py-1.5 text-xs font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label class="text-xs font-medium text-slate-300 block mb-1">
              Password <span v-if="userModalMode === 'create'" class="text-rose-400">*</span>
            </label>
            <div class="relative">
              <input
                v-model="activeUser.password"
                :type="showPassword ? 'text' : 'password'"
                autocomplete="new-password"
                :placeholder="userModalMode === 'create' ? 'Minimal 6 karakter' : 'Kosongkan jika tidak diubah'"
                class="w-full bg-[#111827] border border-[#283548] rounded px-3 py-1.5 pr-9 text-xs font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
              <button
                type="button"
                class="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-200 focus:outline-none cursor-pointer"
                tabindex="-1"
                :title="showPassword ? 'Sembunyikan password' : 'Lihat password'"
                @click="showPassword = !showPassword"
              >
                <EyeOff v-if="showPassword" class="w-4 h-4" />
                <Eye v-else class="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        <!-- Status Akun -->
        <div class="flex items-center gap-2 pt-1">
          <input
            id="user-active-checkbox"
            v-model="activeUser.isActive"
            type="checkbox"
            class="w-4 h-4 rounded bg-[#111827] border-[#283548] text-blue-500 focus:ring-0 cursor-pointer"
          />
          <label for="user-active-checkbox" class="text-xs font-medium text-slate-200 cursor-pointer">
            Akun Aktif (Dapat Login ke Portal)
          </label>
        </div>
      </div>

      <template #footer="{ close }">
        <Button variant="secondary" size="sm" @click="close">Batal</Button>
        <Button variant="primary" size="sm" :loading="usersStore.loading" @click="saveUser">
          {{ userModalMode === 'create' ? 'Daftarkan Pengguna' : 'Simpan Perubahan' }}
        </Button>
      </template>
    </Modal>

    <!-- Modal Konfirmasi Hapus -->
    <ConfirmationDialog
      v-model="deleteConfirmOpen"
      title="Konfirmasi Hapus Pengguna"
      :message="`Apakah Anda yakin ingin menghapus akun pengguna ${toDeleteTarget?.id} (@${toDeleteTarget?.username})?`"
      warning="Akun akan dinonaktifkan dan diarsipkan (soft delete). Riwayat audit log pengguna tetap tersimpan."
      @confirm="confirmDeleteUser"
    />
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { Table, Badge, Button, Modal, ConfirmationDialog } from '../components/ui/index.js'
import { useUsersStore } from '../stores/users.js'
import { useAuthStore } from '../stores/auth.js'
import { useToast } from '../composables/useToast.js'
import { Users, ShieldCheck, UserCheck, CheckCircle2, Filter, Eye, EyeOff } from '@lucide/vue'

const toast = useToast()
const usersStore = useUsersStore()
const authStore = useAuthStore()

// -----------------------------------------------------------------------------
// FILTER & PAGINATION STATE
// -----------------------------------------------------------------------------
const selectedRoleFilter = ref('ALL')
const selectedStatusFilter = ref('ALL')
const searchQuery = ref('')
const pageSize = 5
const currentPage = ref(1)

const columns = [
  { key: 'id', label: 'ID (Auto)', width: 'w-28' },
  { key: 'user', label: 'Username' },
  { key: 'fullName', label: 'Nama Lengkap' },
  { key: 'role', label: 'Peran (Role)', width: 'w-32' },
  { key: 'status', label: 'Status Akun', width: 'w-28' },
  { key: 'actions', label: 'Aksi', align: 'right', width: 'w-28' }
]

const totalAdmins = computed(() => usersStore.users.filter((u) => u.role === 'ADMIN').length)
const totalOperators = computed(() => usersStore.users.filter((u) => u.role === 'OPERATOR').length)
const totalActiveUsers = computed(() => usersStore.users.filter((u) => u.isActive).length)

const filteredUsers = computed(() => {
  return usersStore.users.filter((u) => {
    // Role Filter
    if (selectedRoleFilter.value !== 'ALL' && u.role !== selectedRoleFilter.value) {
      return false
    }
    // Status Filter
    if (selectedStatusFilter.value === 'ACTIVE' && !u.isActive) return false
    if (selectedStatusFilter.value === 'INACTIVE' && u.isActive) return false

    // Search Query
    if (searchQuery.value.trim()) {
      const q = searchQuery.value.toLowerCase()
      const matchId = u.id?.toLowerCase().includes(q)
      const matchUsername = u.username?.toLowerCase().includes(q)
      const matchName = u.fullName?.toLowerCase().includes(q)
      const matchEmail = u.email?.toLowerCase().includes(q)
      if (!matchId && !matchUsername && !matchName && !matchEmail) return false
    }
    return true
  })
})

const totalPages = computed(() => Math.ceil(filteredUsers.value.length / pageSize) || 1)
const paginatedUsers = computed(() => {
  const start = (currentPage.value - 1) * pageSize
  return filteredUsers.value.slice(start, start + pageSize)
})

// -----------------------------------------------------------------------------
// MODAL STATE & ACTIVE USER
// -----------------------------------------------------------------------------
const userModalOpen = ref(false)
const userModalMode = ref('create')
const showPassword = ref(false)

const deleteConfirmOpen = ref(false)
const toDeleteTarget = ref(null)

const activeUser = reactive({
  id: '',
  username: '',
  fullName: '',
  email: '',
  password: '',
  role: 'OPERATOR',
  isActive: true
})

const previewNextUserId = computed(() => {
  const nums = usersStore.users.map((u) => {
    const m = String(u.id).match(/\d+/)
    return m ? parseInt(m[0], 10) : 0
  })
  const maxNum = nums.length > 0 ? Math.max(...nums) : 0
  return `USR-${String(maxNum + 1).padStart(4, '0')}`
})

function openCreateUserModal() {
  userModalMode.value = 'create'
  showPassword.value = false
  activeUser.id = ''
  activeUser.username = ''
  activeUser.fullName = ''
  activeUser.email = ''
  activeUser.password = ''
  activeUser.role = 'OPERATOR'
  activeUser.isActive = true
  userModalOpen.value = true
}

function handleEditUser(row) {
  userModalMode.value = 'edit'
  showPassword.value = false
  activeUser.id = row.id
  activeUser.username = row.username
  activeUser.fullName = row.fullName
  activeUser.email = row.email || ''
  activeUser.password = '' // Kosongkan saat edit
  activeUser.role = row.role || 'OPERATOR'
  activeUser.isActive = row.isActive !== false
  userModalOpen.value = true
}

function handleDeleteUser(row) {
  toDeleteTarget.value = row
  deleteConfirmOpen.value = true
}

async function saveUser() {
  if (userModalMode.value === 'create') {
    if (!activeUser.username.trim()) {
      toast.error('Form Belum Lengkap', 'Username wajib diisi.')
      return
    }
    if (!activeUser.password || activeUser.password.length < 6) {
      toast.error('Password Tidak Valid', 'Password minimal 6 karakter.')
      return
    }
  }

  if (!activeUser.fullName.trim()) {
    toast.error('Form Belum Lengkap', 'Nama lengkap wajib diisi.')
    return
  }

  const payload = {
    fullName: activeUser.fullName.trim(),
    email: activeUser.email?.trim() || null,
    role: activeUser.role,
    isActive: activeUser.isActive,
    zoneIds: []
  }

  if (activeUser.password && activeUser.password.trim().length >= 6) {
    payload.password = activeUser.password.trim()
  }

  try {
    if (userModalMode.value === 'create') {
      payload.username = activeUser.username.trim().toLowerCase()
      const created = await usersStore.createUser(payload)
      toast.success('Pengguna Dibuat', `Pengguna ${created.id} (@${created.username}) berhasil didaftarkan!`)
    } else {
      await usersStore.updateUser(activeUser.id, payload)
      toast.success('Pengguna Diperbarui', `Data pengguna ${activeUser.id} berhasil diperbarui.`)
    }
    userModalOpen.value = false
  } catch (err) {
    toast.error('Gagal Menyimpan Pengguna', err.message || 'Terjadi kesalahan sistem')
  }
}

async function confirmDeleteUser() {
  deleteConfirmOpen.value = false
  if (!toDeleteTarget.value) return

  try {
    await usersStore.deleteUser(toDeleteTarget.value.id)
    if (currentPage.value > totalPages.value) {
      currentPage.value = Math.max(1, totalPages.value)
    }
    toast.success('Pengguna Dihapus', `${toDeleteTarget.value.id} (@${toDeleteTarget.value.username}) berhasil diarsipkan.`)
  } catch (err) {
    toast.error('Gagal Menghapus', err.message || 'Terjadi kesalahan')
  }
}

onMounted(async () => {
  await usersStore.fetchUsers()
})
</script>
