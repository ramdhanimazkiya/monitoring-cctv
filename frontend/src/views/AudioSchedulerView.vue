<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between pb-2 border-b border-[#283548]">
      <div>
        <div class="flex items-center gap-2">
          <h2 class="text-lg font-bold text-slate-100 tracking-tight">Audio Scheduler</h2>
          <Badge status="DEMO" label="DEMO" size="xs" :dot="false" />
        </div>
        <p class="text-xs text-slate-400 mt-0.5 font-mono">
          Jadwal otomatis siaran suara berkala (harian, mingguan, bulanan) dengan zona waktu Asia/Jakarta.
        </p>
      </div>

      <Button
        v-if="authStore.isAdmin"
        variant="primary"
        size="sm"
        @click="createScheduleModal = true"
      >
        Buat Jadwal Baru
      </Button>
      <Badge
        v-else
        status="INACTIVE"
        label="HAK AKSES BACA SAJA (OPERATOR)"
        size="xs"
      />
    </div>

    <!-- Table of Schedules -->
    <Table
      title="Daftar Jadwal Audio Terdaftar"
      :count="schedules.length"
      :columns="columns"
      :data="schedules"
    >
      <template #id="{ row }">
        <span class="font-mono font-semibold text-blue-400">{{ row.id }}</span>
      </template>

      <template #recurrence="{ row }">
        <span class="px-2 py-0.5 rounded text-xs font-mono font-medium bg-[#151d2e] border border-[#283548] text-slate-300">
          {{ row.recurrence }}
        </span>
      </template>

      <template #isActive="{ row }">
        <Badge :status="row.isActive ? 'ACTIVE' : 'INACTIVE'" :label="row.isActive ? 'AKTIF' : 'NONAKTIF'" size="xs" />
      </template>

      <template #actions="{ row }">
        <Button variant="ghost" size="xs" @click="toast.info('Detail Jadwal', `Melihat ${row.id} - ${row.name}`)">
          Detail
        </Button>
      </template>
    </Table>

    <!-- Create Schedule Modal (Preview UI) -->
    <Modal
      v-model="createScheduleModal"
      title="Buat Jadwal Audio Baru"
      description="Konfigurasi siaran suara otomatis"
      size="md"
    >
      <div class="space-y-3">
        <Input label="Nama Jadwal" placeholder="Contoh: Pengumuman Jam Istirahat" />
        <Select
          label="Pengulangan"
          :options="[
            { value: 'ONCE', label: 'Sekali Jalan' },
            { value: 'DAILY', label: 'Setiap Hari (Harian)' },
            { value: 'WEEKLY', label: 'Mingguan' }
          ]"
        />
        <Input label="Pesan Audio Siaran" placeholder="Pesan / audio yang akan disiarkan..." />
      </div>

      <template #footer="{ close }">
        <Button variant="secondary" size="sm" @click="close">Batal</Button>
        <Button variant="primary" size="sm" @click="close(); toast.success('Jadwal Disimpan [DEMO]')">Simpan Jadwal</Button>
      </template>
    </Modal>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { Table, Badge, Button, Modal, Input, Select } from '../components/ui/index.js'
import { useAuthStore } from '../stores/auth.js'
import { useToast } from '../composables/useToast.js'

const authStore = useAuthStore()
const toast = useToast()

const createScheduleModal = ref(false)

const columns = [
  { key: 'id', label: 'ID Jadwal', width: 'w-28' },
  { key: 'name', label: 'Nama Jadwal' },
  { key: 'recurrence', label: 'Pengulangan', width: 'w-32' },
  { key: 'time', label: 'Waktu (WIB)', width: 'w-28' },
  { key: 'target', label: 'Target Zona' },
  { key: 'isActive', label: 'Status', width: 'w-28' },
  { key: 'actions', label: 'Aksi', align: 'right', width: 'w-24' }
]

const schedules = ref([
  {
    id: 'SCH-0001',
    name: '[DEMO] Pengumuman Pagi',
    recurrence: 'DAILY',
    time: '08:00 WIB',
    target: 'Zona Lobby (ZON-0001)',
    isActive: false
  }
])
</script>
