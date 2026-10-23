<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between pb-2 border-b border-[#283548]">
      <div>
        <div class="flex items-center gap-2">
          <h2 class="text-lg font-bold text-slate-100 tracking-tight">System Settings</h2>
          <!-- <Badge status="ACTIVE" label="ADMIN ONLY" size="xs" /> -->
        </div>
        <p class="text-xs text-slate-400 mt-0.5 font-mono">
          Konfigurasi sistem global (disimpan pada tabel system_settings di PostgreSQL).
        </p>
      </div>

      <Button variant="primary" size="sm" @click="saveSettings">
        Simpan Perubahan
      </Button>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card title="Waktu & Zona Waktu Operasi" subtitle="Standar representasi waktu sistem">
        <div class="space-y-3">
          <Input label="Zona Waktu Sistem (IANA)" v-model="settings.timezone" help="Standar: Asia/Jakarta (WIB)" />
          <Input label="Interval Health Check Perangkat (detik)" v-model="settings.checkInterval" help="Default: 30 detik" />
        </div>
      </Card>

      <Card title="Parameter Audio Paging" subtitle="Batas durasi kanal dan gateway transmisi">
        <div class="space-y-3">
          <Input label="PTT Channel Lease Timeout (detik)" v-model="settings.leaseSeconds" help="Batas maksimal bicara per sesi tanpa perpanjangan" />
          <Input label="Gateway WHIP Endpoint URL" v-model="settings.whipUrl" placeholder="https://..." />
        </div>
      </Card>

      <Card title="Kebijakan Retensi Histori" subtitle="Pembersihan otomatis data lawas" class="md:col-span-2">
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Input label="Retensi Histori Status (hari)" v-model="settings.retentionStatus" />
          <Input label="Retensi Event & Alarm (hari)" v-model="settings.retentionEvents" />
          <Input label="Retensi Audit Log (hari)" v-model="settings.retentionAudit" />
        </div>
      </Card>
    </div>
  </div>
</template>

<script setup>
import { reactive } from 'vue'
import { Card, Input, Button, Badge } from '../components/ui/index.js'
import { useToast } from '../composables/useToast.js'

const toast = useToast()

const settings = reactive({
  timezone: 'Asia/Jakarta',
  checkInterval: '30',
  leaseSeconds: '60',
  whipUrl: '',
  retentionStatus: '365',
  retentionEvents: '365',
  retentionAudit: '730'
})

function saveSettings() {
  toast.success('Pengaturan Disimpan [DEMO]', 'Parameter konfigurasi sistem diperbarui.')
}
</script>
