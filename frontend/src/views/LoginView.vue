<template>
  <div class="min-h-screen bg-[#070b12] flex flex-col justify-center items-center px-4 sm:px-6 lg:px-8 relative overflow-hidden select-none">
    <!-- Sophisticated background grid & radial ambiance -->
    <div class="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:28px_28px] opacity-35"></div>
    <div
      :class="[
        'absolute -top-44 -right-44 w-[450px] h-[450px] rounded-full blur-[120px] pointer-events-none transition-all duration-700',
        selectedPortal === 'ADMIN' ? 'bg-amber-500/10' : 'bg-blue-600/10'
      ]"
    ></div>
    <div
      :class="[
        'absolute -bottom-44 -left-44 w-[450px] h-[450px] rounded-full blur-[120px] pointer-events-none transition-all duration-700',
        selectedPortal === 'ADMIN' ? 'bg-amber-600/5' : 'bg-cyan-600/5'
      ]"
    ></div>

    <div class="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
      <!-- Enterprise Brand Header -->
      <div class="text-center mb-6">
        <div
          :class="[
            'inline-flex items-center justify-center w-14 h-14 rounded-2xl border transition-all duration-500 mb-3 shadow-lg',
            selectedPortal === 'ADMIN'
              ? 'bg-amber-950/40 border-amber-500/60 text-amber-400 shadow-amber-500/10'
              : 'bg-blue-950/40 border-blue-500/60 text-blue-400 shadow-blue-500/10'
          ]"
        >
          <ShieldAlert v-if="selectedPortal === 'ADMIN'" class="w-7 h-7" />
          <Radio v-else class="w-7 h-7 animate-pulse" />
        </div>

        <h1 class="text-xl font-bold tracking-wider text-slate-100 font-mono uppercase">
          CCTV & AUDIO PAGING
        </h1>
        <p class="text-xs text-slate-400 font-mono tracking-tight mt-0.5">
          Security Operations Control Center Portal
        </p>
      </div>

      <!-- Portal Tabs (Option A: Explicit Separation) -->
      <div class="grid grid-cols-2 p-1 bg-[#0b101b] border border-[#1e2a3b] rounded-xl text-xs font-mono mb-3 shadow-inner">
        <button
          type="button"
          :class="[
            'flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg font-semibold transition-all duration-200 cursor-pointer',
            selectedPortal === 'OPERATOR'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-[#121929]'
          ]"
          @click="selectPortal('OPERATOR')"
        >
          <Radio class="w-3.5 h-3.5" />
          <span>PORTAL OPERATOR</span>
        </button>

        <button
          type="button"
          :class="[
            'flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg font-semibold transition-all duration-200 cursor-pointer',
            selectedPortal === 'ADMIN'
              ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-[#121929]'
          ]"
          @click="selectPortal('ADMIN')"
        >
          <ShieldAlert class="w-3.5 h-3.5" />
          <span>PORTAL ADMIN</span>
        </button>
      </div>

      <!-- Main Login Card -->
      <div
        :class="[
          'bg-[#0f1624] border py-6 px-6 sm:px-8 shadow-2xl rounded-2xl transition-all duration-500 backdrop-blur-sm',
          selectedPortal === 'ADMIN' ? 'border-amber-500/40' : 'border-blue-500/40'
        ]"
      >
        <!-- Portal Subheader / Scope -->
        <div class="mb-5 pb-3 border-b border-[#1e2a3b]">
          <div class="flex items-center justify-between">
            <span
              :class="[
                'text-[10px] font-mono font-bold px-2 py-0.5 rounded border uppercase tracking-wider',
                selectedPortal === 'ADMIN'
                  ? 'bg-amber-950/70 text-amber-300 border-amber-600/50'
                  : 'bg-blue-950/70 text-blue-300 border-blue-600/50'
              ]"
            >
              {{ selectedPortal === 'ADMIN' ? 'Otoritas: Administrator Sistem' : 'Otoritas: Operator Monitoring' }}
            </span>
            <span class="text-[10px] font-mono text-slate-400 flex items-center gap-1">
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              Sesi Terenkripsi
            </span>
          </div>

          <p class="text-xs text-slate-400 mt-2 leading-relaxed">
            <template v-if="selectedPortal === 'OPERATOR'">
              Akses operasional khusus: pemantauan CCTV multi-kamera, kontrol audio paging PTT/TTS, dan pelaporan insiden lapangan.
            </template>
            <template v-else>
              Akses administratif khusus: manajemen perangkat, integrasi site & zona, pengelolaan hak akses akun, dan audit trail sistem.
            </template>
          </p>
        </div>

        <!-- Error Notification Banner -->
        <div
          v-if="errorMessage"
          class="mb-4 p-3 rounded-lg bg-rose-950/80 border border-rose-800 text-xs text-rose-200 flex items-start gap-2.5 animate-in fade-in duration-200"
        >
          <AlertCircle class="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <div class="flex-1">
            <strong class="font-semibold block">Otentikasi Gagal</strong>
            <span>{{ errorMessage }}</span>
          </div>
          <button
            type="button"
            class="text-rose-400 hover:text-white text-xs underline shrink-0 ml-1 cursor-pointer"
            @click="errorMessage = ''"
          >
            Tutup
          </button>
        </div>

        <!-- Professional Form (Tanpa Placeholder, Input Manual Kredensial Asli) -->
        <form class="space-y-4" @submit.prevent="handleSubmit">
          <Input
            v-model="form.username"
            label="Nama Pengguna (Username)"
            required
            :error="errors.username"
            autocomplete="username"
          >
            <template #prefix>
              <User class="w-4 h-4" />
            </template>
          </Input>

          <Input
            v-model="form.password"
            type="password"
            label="Kata Sandi (Password)"
            required
            :error="errors.password"
            autocomplete="current-password"
          >
            <template #prefix>
              <Lock class="w-4 h-4" />
            </template>
          </Input>

          <div class="flex items-center justify-between text-xs pt-1">
            <span class="text-slate-400 text-[11px] font-mono flex items-center gap-1.5">
              <Lock class="w-3 h-3 text-slate-500" />
              HttpOnly Secure Cookie
            </span>
            <span class="text-slate-500 text-[11px] font-mono">
              Argon2id / SHA-256
            </span>
          </div>

          <Button
            type="submit"
            :variant="selectedPortal === 'ADMIN' ? 'warning' : 'primary'"
            size="md"
            block
            :loading="loading"
            class="mt-3 font-semibold"
          >
            {{ selectedPortal === 'ADMIN' ? 'Masuk ke Portal Administrator' : 'Masuk ke Portal Operator' }}
          </Button>
        </form>

        <!-- Compliance & Security Assurance Badge -->
        <div class="mt-5 pt-3.5 border-t border-[#1e2a3b] flex items-center justify-between text-[10px] font-mono text-slate-500">
          <span>Keamanan Sesi: TLS 1.3</span>
          <span class="text-slate-400">Audit Logging Terpasang</span>
        </div>
      </div>

      <!-- Legal & Security Disclaimer -->
      <div class="text-center mt-6 space-y-1">
        <p class="text-[11px] text-slate-500 font-mono">
          PERINGATAN SISTEM: Akses dibatasi untuk personel terdaftar.
        </p>
        <p class="text-[10px] text-slate-600 font-mono">
          Semua aktivitas otentikasi dan operasi tercatat secara permanen dalam Audit Trail.
        </p>
      </div>
    </div>

    <ToastContainer />
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth.js'
import { useToast } from '../composables/useToast.js'
import { Input, Button, ToastContainer } from '../components/ui/index.js'
import { ShieldAlert, Radio, User, Lock, AlertCircle } from '@lucide/vue'

const router = useRouter()
const authStore = useAuthStore()
const toast = useToast()

const selectedPortal = ref('OPERATOR') // 'OPERATOR' | 'ADMIN'
const loading = ref(false)
const errorMessage = ref('')

// Form murni kosong untuk pengisian kredensial asli oleh pengguna (Non-Demo)
const form = reactive({
  username: '',
  password: ''
})

const errors = reactive({
  username: '',
  password: ''
})

function selectPortal(portal) {
  if (selectedPortal.value === portal) return
  selectedPortal.value = portal
  errorMessage.value = ''
  errors.username = ''
  errors.password = ''
  // Reset input saat berpindah portal untuk memastikan keamanan kredensial
  form.username = ''
  form.password = ''
}

async function handleSubmit() {
  errorMessage.value = ''
  errors.username = ''
  errors.password = ''

  if (!form.username.trim()) {
    errors.username = 'Nama pengguna wajib diisi'
    return
  }
  if (!form.password) {
    errors.password = 'Kata sandi wajib diisi'
    return
  }

  loading.value = true

  try {
    const user = await authStore.login({
      username: form.username.trim(),
      password: form.password,
      targetPortal: selectedPortal.value,
    })

    toast.success('Otentikasi Berhasil', `Selamat datang, ${user.fullName} (${user.role})`)
    router.push('/dashboard')
  } catch (err) {
    errorMessage.value = err.message || 'Terjadi kesalahan saat memverifikasi kredensial'
    toast.error('Autentikasi Ditolak', errorMessage.value)
  } finally {
    loading.value = false
  }
}
</script>
