# Arsitektur & Fondasi Backend (Tahap 3)

Dokumen ini menjelaskan struktur fondasi server backend, pipeline middleware, sistem sesi & autentikasi, serta WebSocket Hub terpusat untuk CCTV Monitoring & Audio Paging System.

---

## 1. Ringkasan Arsitektur

Backend dibangun menggunakan **Node.js (>=22.18, ESM murni)** dan **Express**, dipadukan dengan **Socket.IO** untuk komunikasi dua arah secara *real-time*. Seluruh interaksi database memanfaatkan **Prisma Client (v7.10.0)** dengan driver adapter PostgreSQL `@prisma/adapter-pg`.

```
                    ┌──────────────────────────────┐
                    │     Frontend (Vue 3 / Vite)  │
                    └──────────────┬───────────────┘
                                   │
              HTTP REST (Cookies)  │  WebSocket (ws/wss)
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        Backend Server (Express)                        │
├────────────────────────────────────────────────────────────────────────┤
│ 1. Helmet (Security Headers)                                           │
│ 2. CORS (Origin frontend yang diizinkan)                               │
│ 3. Cookie Parser (HttpOnly Session Cookie)                             │
│ 4. Pino HTTP Logger (Structured logging + redaction)                   │
│ 5. Express Rate Limit (Global API: 300/min, Auth: 10/15min)            │
├────────────────────────────────────────────────────────────────────────┤
│                          Routing & Controllers                         │
│  - /api/health          (Liveness, Readiness, Subsystem Telemetry)     │
│  - /api/auth            (Login, Logout, Me, Change Password)           │
│  - /api/* (Tahap 4–8)   (Devices, CCTV Streams, PTT/TTS, Schedules)    │
├────────────────────────────────────────────────────────────────────────┤
│                          WebSocket Hub (Socket.IO)                     │
│  - devices:status       (Online/Offline/Warning status broadcast)      │
│  - cctv:streams         (RTSP/WebRTC stream gateway status)            │
│  - audio:paging         (PTT lease locks, TTS playback progress)       │
│  - events:alarms        (Open/Ack/Resolved alarm events)               │
│  - user:<userId>        (Notifikasi langsung per pengguna)             │
├────────────────────────────────────────────────────────────────────────┤
│                             Lapisan Data                               │
│  - Prisma Client        (PostgreSQL lokal tanpa Docker)                │
│  - Audit Service        (Append-only dengan redaksi otomatis data rahasia)│
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Pipeline Middleware Express

Setiap permintaan HTTP melewati tahapan pemrosesan berikut:

1. **Keamanan Header (`helmet`)**:
   - `X-Content-Type-Options: nosniff`
   - `X-Frame-Options: SAMEORIGIN`
   - Content Security Policy (CSP) dinonaktifkan untuk meloloskan koneksi proxy lokal Vite dan WebSocket.
2. **CORS (`cors`)**:
   - Mengizinkan origin frontend yang dikonfigurasi (`CORS_ORIGIN`, default: `http://localhost:5173`).
   - `credentials: true` diaktifkan agar cookie sesi dapat dikirim dari browser.
3. **Cookie Parser (`cookie-parser`)**:
   - Membaca cookie HTTP-only berformat aman dengan signing `SESSION_SECRET`.
4. **Body Parser**:
   - `express.json({ limit: '1mb' })` dan `express.urlencoded({ extended: true, limit: '1mb' })`.
   - Menangani *malformed JSON* dengan kode error terstruktur `INVALID_JSON_BODY` (400).
5. **Rate Limiting (`express-rate-limit`)**:
   - **API Rate Limiter**: 300 request / menit per IP (headers `RateLimit-Limit`, `RateLimit-Remaining`).
   - **Auth Rate Limiter**: 10 percobaan / 15 menit per IP pada rute login untuk mencegah serangan brute-force.
6. **Validasi Request Body & Query (`src/middleware/validate.js`)**:
   - Menggunakan skema **Zod** dengan aturan `.strict()`.
   - Memformat issue validasi menjadi field, pesan, dan kode error yang ramah pengguna.
7. **Global Error Handler (`src/middleware/error-handler.js`)**:
   - Mengembalikan semua error dalam amplop JSON standar:
     ```json
     {
       "success": false,
       "error": {
         "code": "ERROR_CODE",
         "message": "Pesan deskriptif",
         "details": []
       }
     }
     ```

---

## 3. Sistem Autentikasi & Sesi (Server-Side)

Mengacu pada keputusan desain **D8** & **Q10** ([DECISIONS.md](../database/DECISIONS.md)):

### Siklus Sesi
1. **Login (`POST /api/auth/login`)**:
   - Kredensial diverifikasi dengan `bcryptjs` (salt 12 rounds).
   - Akun diperiksa terhadap status lockout: 5 kali gagal berturut-turut akan mengunci akun selama 15 menit.
   - Dihasilkan token acak 32-byte kriptografis (`crypto.randomBytes(32).toString('hex')`).
   - Token di-hash dengan **SHA-256** dan disimpan pada tabel `sessions` (`token_hash`).
   - Browser menerima token mentah melalui cookie `cctv_session` bertipe `HttpOnly`, `SameSite=Lax`, dan `Path=/`.
2. **Validasi Sesi (`requireAuth`)**:
   - Mengekstrak token dari cookie atau header `Authorization: Bearer <token>`.
   - Menghitung SHA-256 dari token dan mencocokkannya ke database (`revoked_at IS NULL` dan `expires_at > NOW()`).
   - Memeriksa batas *idle timeout* (30 menit tanpa aktivitas). Jika idle terlampaui, sesi dicabut.
   - Memperbarui kolom `last_seen_at` dengan mekanisme *throttling* (maksimal 1x per 60 detik).
3. **Role-Based Access Control (`requireRole`)**:
   - Menjamin endpoint hanya dapat diakses oleh role yang ditentukan (`ADMIN` atau `OPERATOR`).
4. **Pembatasan Hak Akses Zona (`requireZoneAccess`)**:
   - Operator hanya dapat mengontrol/paging ke zona yang terdaftar pada `user_zone_access`.
   - Admin memiliki akses penuh ke seluruh zona tanpa pembatasan.
5. **Logout (`POST /api/auth/logout`)**:
   - Mengisi kolom `revoked_at` pada record sesi di database.
   - Menghapus cookie pada browser.
6. **Audit Trail Otomatis**:
   - Setiap keberhasilan/kegagalan login, logout, dan ubah password dicatat ke tabel `audit_logs`.
   - Layanan `audit.service.js` secara rekursif menyamarkan (*redact*) nilai kunci sensitif seperti `password`, `token`, `secret`, dan `credentialCipher`.

---

## 4. WebSocket Hub (Socket.IO)

WebSocket Hub (`src/websocket/hub.js`) mengelola kanal komunikasi *real-time* untuk seluruh antarmuka monitoring:

### Ruangan (Rooms) Standar

| Room | Deskripsi Event |
|---|---|
| `devices:status` | Perubahan status konektivitas perangkat (`ONLINE`, `OFFLINE`, `WARNING`) |
| `cctv:streams` | Status ketersediaan RTSP/WebRTC stream gateway |
| `audio:paging` | Lock kanal PTT, progres TTS, dan akuisisi/pelepasan lease speaker |
| `events:alarms` | Event alarm terbuka, diakui (*ACK*), atau diselesaikan (*RESOLVED*) |
| `user:<userId>` | Notifikasi personal langsung kepada pengguna tertentu |
| `role:admin` | Pesan sistem internal khusus Administrator |

### Event Klien
- `subscribe`: Bergabung ke ruangan tertentu.
- `unsubscribe`: Keluar dari ruangan.
- `ping`: Mengirim `{ timestamp }`, dibalas oleh server dengan event `pong` berisi waktu server.

---

## 5. Health Check & Observabilitas

Endpoint observabilitas tersedia pada:
- `GET /api/health`: Status keseluruhan, status konektivitas PostgreSQL (latensi milidetik), jumlah klien WebSocket aktif, dan penggunaan memori (RSS & Heap).
- `GET /api/health/live`: Liveness probe (200 OK jika proses berjalan).
- `GET /api/health/ready`: Readiness probe (200 OK jika database terhubung, 503 jika belum siap).

---

## 6. Pengujian Otomatis Fondasi

Skrip pengujian otomatis komprehensif disediakan di `backend/scripts/test-foundation.js`.
Jalankan dengan:

```powershell
npm run test:foundation
```

Pengujian ini memvalidasi 21 kriteria secara otomatis tanpa bergantung pada dependensi eksternal:
1. Endpoint Health Check mengembalikan 200 dengan telemetri subsistem.
2. Endpoint Liveness probe merespons status `alive`.
3. Header Helmet (`X-Content-Type-Options: nosniff`) aktif.
4. Header CORS disinkronkan dengan origin frontend.
5. Zod menolak payload kosong dengan kode `VALIDATION_ERROR` (400).
6. Zod `.strict()` menolak atribut asing yang tidak sah.
7. 404 Handler mengembalikan JSON envelope terstruktur `NOT_FOUND`.
8. JSON parser menangani body rusak dengan kode `INVALID_JSON_BODY` (400).
9. Pembangkitan token acak 32-byte menghasilkan 64 hex unik.
10. Hash token SHA-256 bersifat deterministik (64 hex).
11. Layanan audit meredaksi password dan rahasia secara rekursif.
12. Middleware `requireRole('ADMIN')` mengizinkan user ADMIN.
13. Middleware `requireRole('ADMIN')` memblokir user OPERATOR dengan `FORBIDDEN` (403).
14. Middleware `requireZoneAccess()` mengizinkan Operator ke zona terdaftar.
15. Middleware `requireZoneAccess()` memblokir Operator ke zona tidak terdaftar (403).
16. Middleware `requireZoneAccess()` mengizinkan Admin ke semua zona tanpa batasan.
17. Klien Socket.IO terhubung sukses ke WebSocket Hub.
18. WebSocket Ping-Pong roundtrip bekerja normal.
19. Broadcast event status perangkat (`device:status_changed`) diterima secara real-time.
20. Broadcast event alarm (`events:alarm_update`) diterima secara real-time.
21. Klien Socket.IO dan server ditutup secara bersih (*graceful*).
