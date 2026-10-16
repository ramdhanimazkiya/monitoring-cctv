# Arsitektur Halaman & Routing Frontend

Dokumentasi routing, otorisasi peran (RBAC), tata letak (layouts), dan hierarki halaman pada aplikasi CCTV Monitoring & Audio Paging System.

---

## 1. Arsitektur Layout

Aplikasi menggunakan dua pola tata letak utama:
1. **Public Layout (`LoginView.vue`):**
   - Halaman login mandiri berpusat di tengah layar tanpa sidebar atau header.
   - Dilengkapi tombol cepat "Akses Demo Pengujian" (Admin / Operator) untuk mempermudah evaluasi pengujian.
2. **Dashboard Layout (`DashboardLayout.vue`):**
   - Mengelilingi seluruh rute terotentikasi.
   - Terdiri dari `AppSidebar` di sebelah kiri (dapat di-collapse), `AppHeader` di atas (dengan breadcrumb dinamis dan role switcher instan), area konten `<router-view>` di tengah, dan wadah global `<ToastContainer>`.

---

## 2. Peta Rute & Matriks Izin Akses (RBAC)

| Path Rute | Nama Rute | Peran Diizinkan | Deskripsi & Isi Halaman |
|---|---|---|---|
| `/login` | `login` | Publik | Autentikasi sesi username & password |
| `/dashboard` | `dashboard` | Admin & Operator | Ringkasan KPI kesehatan CCTV, Audio, Alarm, peta Leaflet interaktif, status worker |
| `/cctv` | `cctv` | Admin & Operator | Inventaris kamera CCTV, status streaming WebRTC/RTSP, inspeksi adapter |
| `/live-view` | `live-view` | Admin & Operator | Matriks multiview live streaming kamera (opsi layout grid 1x1, 2x2, 3x3, 4x4) |
| `/audio-paging` | `audio-paging` | Admin & Operator | Konsol Push-to-Talk (PTT) suara langsung & Text-to-Speech (TTS) bahasa Indonesia |
| `/audio-scheduler` | `audio-scheduler` | Admin (Tulis), Operator (Baca) | Jadwal siaran suara berkala harian/mingguan berbasis zona waktu Asia/Jakarta |
| `/events` | `events` | Admin & Operator | Catatan histori insiden, perubahan status hardware, dan siklus hidup alarm |
| `/reports` | `reports` | Admin & Operator | Rekapitulasi uptime perangkat, aktivitas siaran PTT/TTS, dan ekspor laporan |
| `/devices` | `devices` | **Hanya Admin** | Pendaftaran CCTV & Speaker (menegaskan ID auto-generated dan tidak dapat diedit) |
| `/sites-zones` | `sites-zones` | **Hanya Admin** | Manajemen hierarki lokasi Site (SIT-xxxx) dan Zone (ZON-xxxx) |
| `/users` | `users` | **Hanya Admin** | Manajemen akun pengguna (USR-xxxx) dan penugasan izin target zona paging |
| `/settings` | `settings` | **Hanya Admin** | Konfigurasi parameter sistem (timeout PTT, batas TTS, retensi data) |
| `/audit-logs` | `audit-logs` | **Hanya Admin** | Catatan jejak audit append-only yang tidak dapat diubah oleh siapapun |

---

## 3. Mekanisme Navigation Guard & Role Switcher

Navigasi dilindungi oleh router guard pada `frontend/src/router/index.js`:
1. **Pemeriksaan Sesi (`requiresAuth`):** Pengguna yang belum login otomatis dialihkan ke `/login`.
2. **Pencegahan Akses Ilegal (`requiresAdmin`):** Jika operator mencoba membuka halaman admin (misal `/devices` atau `/users`), router guard akan membatalkan navigasi, memicu notifikasi Toast `Akses Ditolak`, dan mengarahkan kembali ke `/dashboard`.
3. **Pengujian Role Instan:** Pada header aplikasi, terdapat tombol saklar peran yang memungkinkan penguji beralih dari peran `ADMIN` ke `OPERATOR` secara instan tanpa perlu repot logout ulang.
