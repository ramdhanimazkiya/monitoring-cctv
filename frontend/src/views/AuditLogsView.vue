<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between pb-2 border-b border-[#283548]">
      <div>
        <div class="flex items-center gap-2">
          <h2 class="text-lg font-bold text-slate-100 tracking-tight">Audit Trail & Log Administratif</h2>
          <Badge status="ACTIVE" label="ADMIN ONLY" size="xs" />
        </div>
        <p class="text-xs text-slate-400 mt-0.5 font-mono">
          Jejak aktivitas keamanan append-only. <strong>Log ini tidak dapat diedit atau dihapus oleh siapapun melalui aplikasi.</strong>
        </p>
      </div>
    </div>

    <!-- Audit Table -->
    <Table
      title="Catatan Audit Keamanan"
      :count="logs.length"
      :columns="columns"
      :data="logs"
    >
      <template #action="{ row }">
        <span class="font-mono text-xs font-semibold text-blue-400">{{ row.action }}</span>
      </template>

      <template #result="{ row }">
        <Badge :status="row.result" :label="row.result" size="xs" />
      </template>

      <template #createdAt="{ row }">
        <span class="font-mono text-xs text-slate-400">{{ row.createdAt }}</span>
      </template>
    </Table>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { Table, Badge } from '../components/ui/index.js'

const columns = [
  { key: 'createdAt', label: 'Waktu (UTC)', width: 'w-40' },
  { key: 'actor', label: 'Pengguna / Aktor', width: 'w-36' },
  { key: 'action', label: 'Aksi' },
  { key: 'entity', label: 'Target Entitas' },
  { key: 'ipAddress', label: 'IP Asal', width: 'w-32' },
  { key: 'result', label: 'Hasil', width: 'w-24' }
]

const logs = ref([
  { id: '1', createdAt: '12-10-2026 09:30:15', actor: 'admin (USR-0001)', action: 'auth.login', entity: 'Session', ipAddress: '127.0.0.1', result: 'SUCCESS' },
  { id: '2', createdAt: '12-10-2026 09:32:00', actor: 'admin (USR-0001)', action: 'camera.create', entity: 'CAM-0001', ipAddress: '127.0.0.1', result: 'SUCCESS' },
  { id: '3', createdAt: '12-10-2026 09:32:10', actor: 'admin (USR-0001)', action: 'audio.create', entity: 'AUD-0001', ipAddress: '127.0.0.1', result: 'SUCCESS' },
  { id: '4', createdAt: '12-10-2026 09:35:40', actor: 'operator (USR-0002)', action: 'audio.ptt_acquire', entity: 'AUD-0001', ipAddress: '127.0.0.1', result: 'SUCCESS' },
])
</script>
