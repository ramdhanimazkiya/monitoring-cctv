<template>
  <div class="min-h-screen bg-[#070b12] flex flex-col justify-center items-center px-4 sm:px-6 lg:px-8 relative overflow-hidden select-none">
    <!-- Sophisticated background grid & radial ambiance -->
    <div class="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:28px_28px] opacity-35"></div>
    <div class="absolute -top-44 -right-44 w-[480px] h-[480px] rounded-full blur-[130px] pointer-events-none bg-blue-600/15"></div>
    <div class="absolute -bottom-44 -left-44 w-[480px] h-[480px] rounded-full blur-[130px] pointer-events-none bg-cyan-600/10"></div>

    <div class="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
      <!-- Enterprise Brand Header -->
      <div class="text-center mb-6">
        <div class="inline-flex items-center justify-center w-14 h-14 rounded-2xl border border-blue-500/50 bg-blue-950/40 text-blue-400 shadow-lg shadow-blue-500/20 mb-3 transition-transform hover:scale-105 duration-300">
          <ShieldCheck class="w-7 h-7" />
        </div>

        <h1 class="text-xl font-bold tracking-wider text-slate-100 font-mono uppercase">
          CCTV & AUDIO PAGING
        </h1>
        <p class="text-xs text-slate-400 font-mono tracking-tight mt-0.5">
          Security Operations Control Center Portal
        </p>
      </div>

      <!-- Main Login Card (Single Unified Form) -->
      <div class="bg-[#0f1624]/95 border border-slate-800/80 shadow-2xl rounded-2xl py-6 px-6 sm:px-8 backdrop-blur-md transition-all duration-300 hover:border-slate-700">
        <!-- Subheader / Scope -->
        <div class="mb-5 pb-3.5 border-b border-[#1e2a3b]">
          <div class="flex items-center justify-between">
            <!-- <span class="text-[10px] font-mono font-bold px-2.5 py-1 rounded border uppercase tracking-wider bg-blue-950/70 text-blue-300 border-blue-600/50">
              Autentikasi Terpadu
            </span> -->
            <!-- <span class="text-[10px] font-mono text-slate-400 flex items-center gap-1.5">
              <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Sesi Terenkripsi
            </span> -->
          </div>

          <p class="text-xs text-slate-400 mt-2.5 leading-relaxed">
            Masukkan kredensial akun terdaftar Anda untuk mengakses pemantauan CCTV, kontrol audio paging, dan administrasi sistem.
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

        <!-- Unified Single Form -->
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
            <!-- <span class="text-slate-400 text-[11px] font-mono flex items-center gap-1.5">
              <Lock class="w-3 h-3 text-slate-500" />
              HttpOnly Secure Cookie
            </span> -->
            <!-- <span class="text-slate-500 text-[11px] font-mono">
              Argon2id & Stream JWT
            </span> -->
          </div>

          <Button
            type="submit"
            variant="primary"
            size="md"
            block
            :loading="loading"
            class="mt-3 font-semibold shadow-lg shadow-blue-600/25 hover:shadow-blue-600/40 transition-shadow"
          >
            Login
          </Button>
        </form>

        <!-- Compliance & Security Assurance Badge -->
        <div class="mt-5 pt-3.5 border-t border-[#1e2a3b] flex items-center justify-between text-[10px] font-mono text-slate-500">
          <!-- <span>Keamanan Sesi: TLS 1.3</span> -->
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
import { ShieldCheck, User, Lock, AlertCircle } from '@lucide/vue'

const router = useRouter()
const authStore = useAuthStore()
const toast = useToast()

const loading = ref(false)
const errorMessage = ref('')

const form = reactive({
  username: '',
  password: ''
})

const errors = reactive({
  username: '',
  password: ''
})

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
