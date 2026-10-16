# Layanan Audio Paging & TTS System (Tahap 6)

Dokumen ini menjelaskan arsitektur transmisi suara, penguncian kanal (*channel mutual exclusion*), mesin *Text-to-Speech* (TTS), protokol WebRTC WHIP 16kHz Mono, konfirmasi penerimaan jujur (*delivery receipts*), serta integrasi WebSocket real-time.

---

## 1. Arsitektur Layanan Audio Paging & TTS

Modul Paging mengelola dua mode transmisi audio utama:
1. **Push-to-Talk (PTT)**: Siaran suara langsung dari mikrofon operator menggunakan protokol standar WebRTC WHIP (*WebRTC HTTP Ingestion Protocol* - RFC 9329) dengan format Opus 16 kHz Mono.
2. **Text-to-Speech (TTS)**: Sintesis pesan teks menjadi audio yang disiarkan ke satu perangkat, satu zona, grup perangkat, atau seluruh gedung (*broadcast*).

```
┌────────────────────────┐                   ┌─────────────────────────────────────────┐
│     Web Frontend       │                   │          Backend Node.js API            │
│  (Vue 3 Audio Console  │                   │                                         │
│   + useWhipAudio.js)   │                   │                                         │
└───────────┬────────────┘                   └────────────────────┬────────────────────┘
            │                                                     │
            │ 1. POST /api/paging/ptt/start (Kunci Kanal)         │
            │ ◄───────────────────────────────────────────────────┤
            │    201 Created (commandId, whipUrl)                 │
            │                                                     │
            │ 2. POST /api/paging/whip/:key (SDP Offer)           │
            │ ◄───────────────────────────────────────────────────┤
            │    201 Created (SDP Answer 16kHz Mono)              │
            │                                                     │
            │ 3. POST /api/paging/ptt/heartbeat (Tiap 30s)        │
            │ 4. POST /api/paging/ptt/stop (Lepas Kanal)          │
            │                                                     │
            │ 5. WebSocket Hub: room audio:paging                 │
            │ ◄═══════════════════════════════════════════════════╡
            │    - audio:channel_lease (status lock kanal)        │
            │    - audio:command_update (ptt:started/ended)       │
            │                                                     │
            ▼                                                     ▼
┌────────────────────────┐                   ┌─────────────────────────────────────────┐
│  Browser WebRTC Agent  │   WHIP 16kHz Mono │         Media Gateway / Speaker         │
│  (Opus 16k Mono Track) │ ─────────────────►│   (MediaMTX / Speaker IP / Simulator)   │
└────────────────────────┘                   └─────────────────────────────────────────┘
```

---

## 2. Channel Mutual Exclusion (Pencegahan Tabrakan Kanal)

Untuk mencegah dua operator menyiarkan suara ke speaker yang sama secara bersamaan, sistem menerapkan mekanisme **Channel Mutual Exclusion** yang dijamin langsung pada level basis data:

### Mekanisme Penguncian:
1. Tabel `audio_channel_leases` menggunakan `audio_device_id` sebagai **PRIMARY KEY**. Ini menjamin secara fisik bahwa hanya ada satu baris lease per speaker pada saat yang sama.
2. Kolom `commandId` bersifat **UNIQUE**.
3. **Masa Aktif Lease (`expiresAt`)**:
   - Diatur otomatis saat PTT dimulai berdasarkan pengaturan `paging.ptt_lease_seconds` (default: 60 detik).
   - Diperpanjang secara berkala oleh klien melalui endpoint `POST /api/paging/ptt/heartbeat` (perpanjangan 30 detik).
4. **Penanganan Konflik (409 Conflict)**:
   - Jika operator B mencoba memulai PTT pada speaker yang sedang dikunci oleh operator A (di mana `expiresAt > NOW()`), sistem menolak permintaan dengan kode HTTP `409 Conflict` bertipe `CONFLICT` ("*Kanal audio sedang digunakan oleh operator lain*").
5. **Pengambilalihan Otomatis Lease Kedaluwarsa (*Auto-Takeover*)**:
   - Jika koneksi operator A terputus tiba-tiba tanpa mengirimkan perintah `stop`, lease akan kedaluwarsa secara alami (`expiresAt <= NOW()`).
   - Sesi berikutnya otomatis membersihkan lease yang kedaluwarsa dan mengizinkan operator lain mengambil alih kanal tanpa kebuntuan (*deadlock*).

---

## 3. Ekspan Multi-Target & Otorisasi Zona (RBAC)

Perintah PTT maupun TTS mendukung 4 tipe target:
- `DEVICE`: Memilih satu atau beberapa speaker spesifik (`AUD-xxxx`).
- `ZONE`: Memilih zona (`ZON-xxxx`), yang diekspansi secara dinamis menjadi seluruh speaker aktif di dalam zona tersebut.
- `GROUP`: Memilih grup audio (`GRP-xxxx`), yang diekspansi menjadi seluruh anggota grup audio.
- `ALL`: Menyiarkan pengumuman ke seluruh speaker aktif di seluruh site gedung.

### Aturan Hak Akses Operator:
- Pengguna dengan peran `ADMIN` memiliki hak akses penuh ke seluruh zona.
- Pengguna dengan peran `OPERATOR` wajib terdaftar pada tabel `user_zone_access` untuk zona target yang dituju.
- Jika operator mencoba melakukan paging ke speaker atau zona yang tidak diizinkan, sistem menolak permintaan dengan kode HTTP `403 Forbidden`.

---

## 4. Mesin Text-to-Speech (TTS) & Kejujuran Delivery Receipts

Mesin TTS memproses pesan teks dengan batasan dan aturan integritas ketat:

### A. Validasi Karakter:
- Panjang teks dibatasi oleh pengaturan sistem `paging.tts_max_chars` (default: 500 karakter, maksimum database: 1000).
- Teks yang melebihi batas ini ditolak secara langsung dengan `400 Bad Request`.

### B. Prinsip Kejujuran Delivery Receipts:
Sistem tidak pernah memalsukan konfirmasi pengiriman:
1. **Perangkat dengan `supports_delivery_receipt = true`**:
   - Status target dicatat sebagai `DELIVERED`.
   - `delivery_confirmed = true`.
2. **Perangkat dengan `supports_delivery_receipt = false`**:
   - Status target dicatat sebagai `UNCONFIRMED`.
   - `delivery_confirmed = false` dengan keterangan jelas bahwa hardware speaker tidak memiliki kapabilitas konfirmasi pengiriman.
3. **Perangkat sedang `OFFLINE`**:
   - Status target dicatat sebagai `FAILED`.
   - `delivery_confirmed = false`, dengan pesan kegagalan "Perangkat audio sedang OFFLINE".
4. **Perangkat sedang dikunci PTT lain**:
   - Status target dicatat sebagai `FAILED` dengan `error_code: CHANNEL_BUSY`.

---

## 5. Protokol WebRTC WHIP (RFC 9329)

Backend menyediakan endpoint WHIP di `/api/paging/whip/:channelKey`:
1. Menerima SDP Offer dengan header `Content-Type: application/sdp`.
2. Memvalidasi m-line audio dan parameter Opus format 16 kHz Mono (`maxplaybackrate=16000;sprop-maxcapturerate=16000;stereo=0`).
3. Merespons dengan kode `201 Created`, header `Content-Type: application/sdp`, header `Location: /api/paging/whip/:channelKey/session`, dan SDP Answer WebRTC.
4. Penghentian sesi melalui `DELETE /api/paging/whip/:channelKey/session` merespons `204 No Content`.

---

## 6. Ringkasan Endpoint REST API

| Method | Endpoint | Peran Minimal | Deskripsi |
|---|---|---|---|
| `GET` | `/api/paging/devices` | OPERATOR / ADMIN | Mengambil daftar seluruh speaker beserta status konektivitas, kapabilitas, dan lease aktif. |
| `GET` | `/api/paging/leases` | OPERATOR / ADMIN | Mengambil daftar lease kanal audio yang sedang aktif saat ini. |
| `POST` | `/api/paging/ptt/start` | OPERATOR / ADMIN | Memulai sesi PTT dan mengunci kanal speaker target (Mutual Exclusion). |
| `POST` | `/api/paging/ptt/heartbeat` | OPERATOR / ADMIN | Memperpanjang masa aktif lease kanal audio yang sedang berlangsung. |
| `POST` | `/api/paging/ptt/stop` | OPERATOR / ADMIN | Menghentikan transmisi PTT dan melepaskan seluruh lease kanal speaker. |
| `POST` | `/api/paging/tts/dispatch` | OPERATOR / ADMIN | Mengirimkan pesan Text-to-Speech ke target speaker dengan validasi karakter. |
| `GET` | `/api/paging/commands` | OPERATOR / ADMIN | Mengambil riwayat pengiriman audio PTT dan TTS beserta paginasi. |
| `GET` | `/api/paging/commands/:id` | OPERATOR / ADMIN | Mengambil detail satu perintah audio paging beserta hasil per target speaker. |
| `POST` | `/api/paging/whip/:channelKey` | Publik / WebRTC | Negosiasi SDP Offer -> SDP Answer untuk ingress audio WHIP 16kHz Mono. |
| `DELETE`| `/api/paging/whip/:channelKey/session` | Publik / WebRTC | Mengakhiri sesi streaming audio WHIP. |

---

## 7. Event WebSocket Hub (Room `audio:paging`)

Modul ini memancarkan dua event real-time ke room `audio:paging`:
1. `audio:channel_lease`:
   ```json
   {
     "audioDeviceId": "AUD-0001",
     "acquired": true,
     "userId": "USR-0001",
     "username": "admin",
     "expiresAt": "2026-10-12T08:50:39.052Z",
     "timestamp": "2026-10-12T08:50:09.052Z"
   }
   ```
2. `audio:command_update`:
   - `ptt:started` (saat transmisi mikrofon aktif)
   - `ptt:ended` (saat transmisi mikrofon ditutup)
   - `tts:dispatched` (saat siaran TTS dikirimkan ke target)
