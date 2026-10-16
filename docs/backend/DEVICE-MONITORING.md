# Layanan Pemantauan Perangkat (Device Monitoring Service - Tahap 4)

Dokumen ini menjelaskan arsitektur, mesin transisi status (*state transition machine*), adapter ping, pencatatan histori *append-only*, serta proteksi enkripsi kredensial pada modul pemantauan perangkat CCTV dan speaker audio.

---

## 1. Arsitektur Layanan Pemantauan

Layanan pemantauan perangkat berjalan secara otonom di latar belakang (*background worker*) di dalam proses server Express. Pemantauan ini memisahkan status konektivitas perangkat dari CRUD administratif sesuai aturan bisnis sistem:

```
┌────────────────────────────────────────────────────────────────────────┐
│             DeviceMonitoringService (Background Worker Loop)           │
├────────────────────────────────────────────────────────────────────────┤
│ Interval: monitoring.check_interval_seconds (Default: 30 detik)        │
│ Timeout : monitoring.check_timeout_ms (Default: 5000 ms)               │
└──────────────────┬─────────────────────────────────┬───────────────────┘
                   │                                 │
                   ▼                                 ▼
      ┌─────────────────────────┐       ┌─────────────────────────┐
      │   Kamera Aktif (CAM-)   │       │ Perangkat Audio (AUD-)  │
      └────────────┬────────────┘       └────────────┬────────────┘
                   │                                 │
                   └────────────────┬────────────────┘
                                    ▼
                ┌───────────────────────────────────────┐
                │        Dispatcher Ping Adapter        │
                ├───────────────────┬───────────────────┤
                │ Adapter Mock      │ Adapter TCP Ping  │
                │ (Simulasi latensi │ (net.Socket host: │
                │  & kegagalan)     │  port nyata)      │
                └───────────────────┴───────────────────┘
                                    │ Hasil (ok, latencyMs, reason)
                                    ▼
                ┌───────────────────────────────────────┐
                │        Mesin Transisi Status          │
                │ UNKNOWN ──► ONLINE ◄──► WARNING       │
                │                ▲           │          │
                │                └── OFFLINE ◄          │
                └───────────────────┬───────────────────┘
                                    │ Jika status berubah (from != to)
                    ┌───────────────┴───────────────┐
                    ▼                               ▼
       ┌─────────────────────────┐     ┌─────────────────────────┐
       │   device_status_history │     │   WebSocket Hub         │
       │   (Append-Only Trigger) │     │   Broadcast real-time:  │
       │                         │     │   - device:status_changed│
       │   events (Alarm OPEN)   │     │   - events:alarm_update │
       │   (Jika WARNING/OFFLINE)│     │                         │
       └─────────────────────────┘     └─────────────────────────┘
```

---

## 2. Aturan Transisi Status (State Transition Logic)

Status perangkat memiliki 4 nilai (`UNKNOWN`, `ONLINE`, `WARNING`, `OFFLINE`).

### A. Kondisi Berhasil (Ping Sukses)
1. **Dari `UNKNOWN`**:
   - Langsung bertransisi ke `ONLINE` (pemeriksaan awal berhasil).
2. **Dari `OFFLINE` atau `WARNING`**:
   - Membutuhkan **2 kali sukses berturut-turut** (`recover_after_successes`):
     - Sukses ke-1: Masuk status `WARNING` (*"Merespons kembali, menunggu konfirmasi 1/2"*).
     - Sukses ke-2: Pulih sepenuhnya ke status `ONLINE` (*"Perangkat pulih kembali normal"*).
3. **Dari `ONLINE`**:
   - Tetap `ONLINE`, reset `consecutiveFailures = 0`, dan memperbarui `lastSeenAt = now()`.

### B. Kondisi Gagal (Ping Gagal / Timeout)
1. Setiap kegagalan menaikkan counter `consecutiveFailures`.
2. **Kegagalan ke-1 atau ke-2** (kurang dari `offline_after_failures = 3`):
   - Bertransisi ke status `WARNING` (*"Gagal merespons 1x/2x"*).
3. **Kegagalan ke-3 atau lebih**:
   - Bertransisi ke status `OFFLINE` (*"Tidak merespons setelah 3x percobaan"*).
   - Menghasilkan entri alarm **`Event` baru** dengan status `OPEN`, keparahan `CRITICAL`, dan `dedupKey = device:<id>:status`.

---

## 3. Integritas Data & Keamanan (Zero Leakage)

1. **Immutability Status via API**:
   - Kolom `status`, `streamStatus`, `statusReason`, `statusChangedAt`, `lastCheckedAt`, `lastSeenAt`, dan `consecutiveFailures` **TIDAK TERSEDIA** pada skema Zod `createCameraSchema`, `updateCameraSchema`, `createAudioDeviceSchema`.
   - Skema Zod menggunakan `.strict()`; pengiriman field status atau field `id` manual akan ditolak langsung dengan status HTTP 400 (`VALIDATION_ERROR`).
2. **Enkripsi Kredensial AES-256-GCM**:
   - Kata sandi kamera dan speaker dienkripsi menggunakan algoritma **AES-256-GCM** dengan IV 12-byte acak dan Auth Tag 16-byte melalui utilitas `src/utils/cipher.js`.
   - Kolom `credentialCipher` **TIDAK PERNAH dikembalikan oleh API manapun**. Serializer output menggantinya dengan atribut boolean `hasCredential: true/false`.
3. **Append-Only History**:
   - Perubahan status dicatat ke tabel `device_status_history` yang dilindungi oleh trigger PostgreSQL (operasi `UPDATE` dan `DELETE` fisik diblokir database).

---

## 4. Daftar Endpoint REST API Modul Perangkat

### Telemetri & Statistik
- `GET /api/devices/stats`: Ringkasan jumlah kamera & speaker per status (`total`, `ONLINE`, `OFFLINE`, `WARNING`, `UNKNOWN`).
- `GET /api/devices/:id/history`: 20 entri riwayat perubahan status terakhir untuk perangkat tertentu.
- `GET /api/monitoring/status`: Telemetri status background worker monitoring.
- `POST /api/monitoring/check-all`: Pemicu manual pemeriksaan seluruh perangkat saat itu juga (*on-demand*).
- `POST /api/monitoring/check/:id`: Pemicu manual pemeriksaan satu perangkat tertentu.

### Lokasi (Sites & Zones)
- `GET /api/sites`: Daftar seluruh lokasi (beserta counter jumlah zona & kamera).
- `GET /api/sites/:id`: Detail lokasi beserta daftar zona aktifnya.
- `POST /api/sites`: Tambah lokasi baru (Admin only).
- `PATCH /api/sites/:id`: Perbarui data lokasi (Admin only).
- `DELETE /api/sites/:id`: Arsipkan lokasi (Ditolak jika masih memiliki zona aktif).
- `GET /api/zones`: Daftar zona (dapat difilter dengan query `?siteId=...`).
- `GET /api/zones/:id`: Detail zona.
- `POST /api/zones`: Tambah zona baru (Admin only, nama unik per site).
- `PATCH /api/zones/:id`: Perbarui data zona (Admin only).
- `DELETE /api/zones/:id`: Arsipkan zona (Ditolak jika masih memiliki kamera/speaker aktif).

### Kamera CCTV
- `GET /api/cameras`: Daftar kamera (filter: `siteId`, `zoneId`, `status`, `search`, pagination).
- `GET /api/cameras/:id`: Detail kamera beserta 10 status history terakhir dan active alarms.
- `POST /api/cameras`: Tambah kamera (Admin only, password otomatis dienkripsi).
- `PATCH /api/cameras/:id`: Perbarui metadata kamera (Admin only).
- `DELETE /api/cameras/:id`: Arsipkan kamera (Admin only).

### Speaker Audio Paging
- `GET /api/audio-devices`: Daftar perangkat audio (filter: `siteId`, `zoneId`, `status`, pagination).
- `GET /api/audio-devices/:id`: Detail perangkat audio beserta lease status & history.
- `POST /api/audio-devices`: Tambah perangkat audio (Admin only).
- `PATCH /api/audio-devices/:id`: Perbarui metadata perangkat audio (Admin only).
- `DELETE /api/audio-devices/:id`: Arsipkan perangkat audio (Admin only).

---

## 5. Pengujian Otomatis (20 Kriteria)

Jalankan rangkaian pengujian otomatis dengan perintah:

```powershell
npm run test:monitoring
```

Pengujian ini memverifikasi:
1. Enkripsi dan dekripsi simetris AES-256-GCM.
2. Penolakan ciphertext rusak/dimanipulasi oleh auth tag.
3. Statistik agregasi status pada `GET /api/devices/stats`.
4. Kerahasiaan `credentialCipher` pada endpoint kamera dan speaker.
5. Zod `.strict()` menolak input manual kolom status.
6. Zod `.strict()` menolak input manual `id` perangkat.
7. Adapter Mock menghasilkan respons realistis.
8. Adapter Mock mendeteksi simulasi kegagalan terencana.
9. Adapter TCP mendeteksi port tertutup secara akurat.
10. Transisi otomatis perangkat baru `UNKNOWN` -> `ONLINE`.
11. Pencatatan entri append-only ke `device_status_history`.
12. Transisi kegagalan 1x ke status `WARNING`.
13. Transisi kegagalan 3x berturut-turut ke status `OFFLINE`.
14. Pembuatan otomatis `Event` alarm `OPEN` berkategori `CRITICAL`.
15. Pemulihan bertahap tahap 1 (1/2 sukses) ke status `WARNING`.
16. Pemulihan bertahap tahap 2 (2/2 sukses) kembali ke status `ONLINE`.
17. Broadcast real-time `device:status_changed` via WebSocket Hub.
18. Endpoint manual `POST /api/monitoring/check-all`.
19. Endpoint telemetri worker `GET /api/monitoring/status`.
20. Penutupan aman worker saat shutdown.
