<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between pb-2 border-b border-[#283548]">
      <div>
        <div class="flex items-center gap-2">
          <h2 class="text-lg font-bold text-slate-100 tracking-tight">Laporan & Audit Operasional</h2>
          <Badge status="DEMO" label="DEMO" size="xs" :dot="false" />
        </div>
        <p class="text-xs text-slate-400 mt-0.5 font-mono">
          Ekspor log performa perangkat, rekap siaran audio PTT/TTS, dan histori insiden.
        </p>
      </div>

      <Button variant="secondary" size="sm" @click="toast.info('Ekspor CSV', 'Fitur ekspor CSV akan aktif pada Tahap 9')">
        Unduh Laporan CSV
      </Button>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card title="Rekapitulasi CCTV" subtitle="30 hari terakhir">
        <div class="space-y-2 text-xs font-mono">
          <div class="flex justify-between text-slate-300">
            <span>Uptime Rata-rata:</span>
            <span class="text-emerald-400 font-bold">99.4%</span>
          </div>
          <div class="flex justify-between text-slate-300">
            <span>Total Insiden Offline:</span>
            <span class="text-rose-400 font-bold">3 kali</span>
          </div>
        </div>
      </Card>

      <Card title="Rekapitulasi Audio Paging" subtitle="30 hari terakhir">
        <div class="space-y-2 text-xs font-mono">
          <div class="flex justify-between text-slate-300">
            <span>Total Sesi PTT:</span>
            <span class="text-blue-400 font-bold">42 sesi</span>
          </div>
          <div class="flex justify-between text-slate-300">
            <span>Siaran WHIP Gateway:</span>
            <span class="text-purple-400 font-bold">118 kali</span>
          </div>
        </div>
      </Card>

      <Card title="Jadwal Eksekusi" subtitle="Status worker scheduler">
        <div class="space-y-2 text-xs font-mono">
          <div class="flex justify-between text-slate-300">
            <span>Tingkat Keberhasilan:</span>
            <span class="text-emerald-400 font-bold">100%</span>
          </div>
          <div class="flex justify-between text-slate-300">
            <span>Terlewat (Misfire):</span>
            <span class="text-slate-400 font-bold">0</span>
          </div>
        </div>
      </Card>
    </div>
  </div>
</template>

<script setup>
import { Card, Badge, Button } from '../components/ui/index.js'
import { useToast } from '../composables/useToast.js'

const toast = useToast()
</script>
