# CCTV Monitoring & Audio Paging System

Aplikasi web full-stack untuk monitoring CCTV dan audio paging (PTT, TTS, scheduler).
Dijalankan secara lokal **tanpa Docker**.

## Status Proyek

| Tahap | Modul & Cakupan | Status |
|---|---|---|
| **1** | Analisis kebutuhan, ERD, skema Prisma, migrasi SQL, seeder, audit trigger, verifikasi DB | **SELESAI & TERVERIFIKASI** (35/35 test lolos) |
| **2** | Design system, UI/UX control center, Tailwind tokens, 14 komponen UI reusable, 13 halaman tampilan, Leaflet dark map, routing & RBAC guard | **SELESAI & TERVALIDASI** (Build Vite 100% lolos) |
| **3** | Backend Foundation (Express, WebSocket Hub, validasi Zod, rate limiter, middleware auth) | **SELESAI & TERVALIDASI** (21/21 test lolos) |
| **4** | Device Monitoring Service (Health checker, ICMP/TCP ping, status history, enkripsi kredensial) | **SELESAI & TERVALIDASI** (20/20 test lolos) |
| **5** | CCTV Stream Gateway & Media Integration (WebRTC WHEP, HLS, RTSP resolver, status agregasi & alarm stream) | **SELESAI & TERVALIDASI** (13/13 test lolos) |
| **6** | Audio Paging & TTS System (Push-to-Talk, channel mutual exclusion, TTS engine, delivery receipts) | **SELESAI & TERVALIDASI** (18/18 test lolos) |
| **7** | Audio Scheduler & Automated Paging (Cron/wall-clock parser, timezone handling, misfire policy) | *Tahap selanjutnya* |
| **8–10** | Events & Alarms, Full E2E Integration, QA Hardening | Belum dimulai |

> **Catatan Status Implementasi:**
> Seluruh antarmuka saat ini menyajikan data demo yang disinkronkan dengan seed database lokal (`CAM-0001`, `AUD-0001`, `ZON-0001`, `SIT-0001`, dll.). Seluruh streaming dan audio PTT/TTS dilabeli secara jujur sebagai `DEMO STREAM` / `SIMULATION MODE`.

---

## Stack Teknologi

- **Frontend:** Vue 3 (Composition API, `<script setup>`), Vite 8, Tailwind CSS v3.4, Vue Router 4, Pinia 3, Leaflet, Lucide Icons.
- **Backend:** Node.js ≥ 22.18 (ESM, JavaScript), Express, Prisma 7.10.0 + PostgreSQL, Socket.IO, Zod, Pino, bcryptjs.

---

## Struktur Direktori

```
monitoring-cctv/
├── backend/
│   ├── prisma/             # schema.prisma, migrations/, seed.js
│   ├── prisma7.config.ts   # Konfigurasi Prisma CLI v7
│   ├── scripts/            # db-verify.js (uji 35 aturan integritas DB)
│   └── src/config/         # env.js, database.js
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── layout/     # AppSidebar.vue, AppHeader.vue
│   │   │   ├── maps/       # DeviceMap.vue (Leaflet dark theme)
│   │   │   └── ui/         # 14 Komponen UI reusable (Button, Modal, Drawer, Table, dll.)
│   │   ├── composables/    # useToast.js
│   │   ├── layouts/        # DashboardLayout.vue
│   │   ├── router/         # index.js (Peta rute, meta judul, RBAC navigation guard)
│   │   ├── stores/         # auth.js (State Pinia: user, session, role switcher)
│   │   ├── views/          # 13 Halaman operasional & administrasi
│   │   ├── App.vue
│   │   ├── main.js
│   │   └── style.css       # Tailwind directives, dark map styling, radar animation
│   ├── index.html
│   ├── package.json
│   ├── tailwind.config.js  # Control center dark tokens & shadows
│   └── vite.config.js
└── docs/
    ├── database/           # ERD.md, ANALISIS-KEBUTUHAN.md, DECISIONS.md, SETUP.md
    └── frontend/           # DESIGN-SYSTEM.md, ROUTING-AND-PAGES.md
```

---

## Panduan Menjalankan Sistem

### 1. Database & Backend Setup (Tahap 1)

```powershell
cd backend
npm install
Copy-Item .env.example .env      # Isi DATABASE_URL PostgreSQL lokal
npm run db:deploy                # Menjalankan migrasi SQL + function + trigger ID otomatis
npm run db:seed                  # Memasukkan data awal demo
npm run db:verify                # Menjalankan 35 pengujian integritas skema & immutability
```

### 2. Menjalankan Server Backend & Pengujian (Tahap 3 & 4)

```powershell
cd backend
npm run test:foundation          # Menjalankan 21 pengujian otomatis fondasi Express & WebSocket
npm run test:monitoring          # Menjalankan 20 pengujian otomatis Device Monitoring Service
npm run test:streaming           # Menjalankan 13 pengujian otomatis CCTV Stream Gateway & WHEP
npm run test:paging              # Menjalankan 18 pengujian otomatis Audio Paging & TTS System
npm run dev                      # Menjalankan backend server dengan auto-reload (port 3000)
```

### 3. Frontend Development Server (Tahap 2)

```powershell
cd frontend
npm install
npm run dev                      # Menjalankan dev server Vite pada http://localhost:5173
```

Untuk memvalidasi bundle produksi:
```powershell
npm run build                    # Kompilasi sukses tanpa error TypeScript/Vite
```

---

## Dokumentasi Teknis

- **Database:**
  - [ERD & Relasi Tabel](docs/database/ERD.md)
  - [Analisis Kebutuhan & Aturan Bisnis](docs/database/ANALISIS-KEBUTUHAN.md)
  - [Keputusan Desain & Keputusan Arsitektur](docs/database/DECISIONS.md)
  - [Panduan Setup & Troubleshooting Database](docs/database/SETUP.md)
- **Backend, Streaming & Audio:**
  - [Arsitektur Backend & WebSocket Hub (Tahap 3)](docs/backend/FOUNDATION.md)
  - [Layanan Pemantauan Perangkat & Health Checker (Tahap 4)](docs/backend/DEVICE-MONITORING.md)
  - [Layanan Gateway Streaming CCTV & Integrasi Media (Tahap 5)](docs/backend/STREAM-GATEWAY.md)
  - [Layanan Audio Paging & TTS System (Tahap 6)](docs/backend/AUDIO-PAGING.md)
- **Frontend & UI/UX:**
  - [Design System & UI Guidelines](docs/frontend/DESIGN-SYSTEM.md)
  - [Arsitektur Halaman & Routing (RBAC)](docs/frontend/ROUTING-AND-PAGES.md)
