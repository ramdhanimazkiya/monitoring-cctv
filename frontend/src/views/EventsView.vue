<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between pb-2 border-b border-[#283548]">
      <div>
        <div class="flex items-center gap-2">
          <h2 class="text-lg font-bold text-slate-100 tracking-tight">Event & Alarm History</h2>
          <Badge status="DEMO" label="DEMO" size="xs" :dot="false" />
        </div>
        <p class="text-xs text-slate-400 mt-0.5 font-mono">
          Pencatatan riwayat insiden, perubahan status hardware, dan siklus hidup alarm.
        </p>
      </div>
    </div>

    <!-- Filter & Table -->
    <Table
      title="Catatan Histori Event"
      :count="events.length"
      :columns="columns"
      :data="events"
    >
      <template #severity="{ row }">
        <span
          :class="[
            'px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase',
            row.severity === 'CRITICAL' ? 'bg-rose-950 text-rose-300 border border-rose-800' :
            row.severity === 'WARNING' ? 'bg-amber-950 text-amber-300 border border-amber-800' :
            'bg-blue-950 text-blue-300 border border-blue-800'
          ]"
        >
          {{ row.severity }}
        </span>
      </template>

      <template #status="{ row }">
        <Badge :status="row.status" :label="row.status" size="xs" />
      </template>

      <template #actions="{ row }">
        <Button variant="ghost" size="xs" @click="toast.info('Log Event', `Event ID: ${row.id} - ${row.title}`)">
          Detail
        </Button>
      </template>
    </Table>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { Table, Badge, Button } from '../components/ui/index.js'
import { useToast } from '../composables/useToast.js'

const toast = useToast()

const columns = [
  { key: 'severity', label: 'Tingkat', width: 'w-24' },
  { key: 'type', label: 'Tipe Event', width: 'w-44' },
  { key: 'title', label: 'Judul' },
  { key: 'status', label: 'Status', width: 'w-28' },
  { key: 'occurredAt', label: 'Waktu Kejadian', width: 'w-36' },
  { key: 'actions', label: 'Aksi', align: 'right', width: 'w-24' }
]

const events = ref([
  { id: '1', severity: 'CRITICAL', type: 'STREAM_UNAVAILABLE', title: 'Kamera Parkir 1 stream putus', status: 'OPEN', occurredAt: '12-10-2026 09:15:02' },
  { id: '2', severity: 'WARNING', type: 'AUDIO_FAILURE', title: 'Latensi speaker melebihi ambang batas', status: 'OPEN', occurredAt: '12-10-2026 08:42:19' },
  { id: '3', severity: 'INFO', type: 'DEVICE_STATUS_CHANGE', title: 'Kamera Lobby 1 kembali ONLINE', status: 'RESOLVED', occurredAt: '12-10-2026 07:30:00' }
])
</script>
