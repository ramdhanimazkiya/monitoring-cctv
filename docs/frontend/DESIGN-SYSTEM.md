# Design System & UI/UX Guidelines — CCTV & Audio Paging System

Dokumentasi standar desain antarmuka (Design System), palet warna, tipografi, dan katalog komponen antarmuka pengguna untuk aplikasi web Security Operations & Control Center.

---

## 1. Konsep & Arah Estetika

Aplikasi dirancang dengan pendekatan **Mission-Critical Control Center UI** (Dark Theme High-Contrast) yang mengutamakan:
- **Keterbacaan Tinggi dalam Ruang Gelap / Shift Malam:** Latar belakang sangat gelap (`#0b0f17`) dengan kontras teks slate terang (`#f8fafc` / `#cbd5e1`).
- **Pembedaan Status Seketika (Zero Ambiguity):** Warna status perangkat dan alarm menggunakan aksen tegas (Emerald, Amber, Rose, Cyan, Blue).
- **ID Master Immutability Visual Cue:** Menampilkan label identitas (`CAM-xxxx`, `AUD-xxxx`, `ZON-xxxx`, `SIT-xxxx`, `USR-xxxx`) dengan tipografi monospace (`JetBrains Mono`) dan badge `[AUTO]` untuk menegaskan bahwa ID tidak dapat diedit pengguna.
- **Prinsip Kejujuran Simulasi (No Deceptive Mocks):** Setiap streaming simulasi, push-to-talk demo, dan kartu data pengujian dilabeli eksplisit dengan badge `DEMO STREAM`, `SIMULATION MODE`, atau `[DEMO]`.

---

## 2. Palet Token Warna (Tailwind & CSS)

| Token Nama | Nilai HEX / CSS | Peruntukan |
|---|---|---|
| `cr-bg` | `#0b0f17` | Latar belakang kanvas aplikasi utama |
| `cr-surface` | `#111827` | Kartu kontainer, modal, panel tabel, dropdown |
| `cr-panel` | `#151d2e` | Kotak filter, input form, header kolom tabel |
| `cr-panel-hover` | `#1c263c` | State hover baris tabel, button ghost hover |
| `cr-border` | `#283548` | Garis batas struktural tabel, separator, input field |
| `status-online` | `#10b981` (Emerald 500) | Perangkat online, stream ready, operasi sukses |
| `status-offline` | `#f43f5e` (Rose 500) | Perangkat down, stream error, alarm CRITICAL |
| `status-warning` | `#f59e0b` (Amber 500) | Latensi tinggi, stream reconnecting, alarm WARNING |
| `status-idle` | `#64748b` (Slate 500) | Perangkat standby, slot kosong, stream idle |
| `brand-primary` | `#2563eb` (Blue 600) | Tombol aksi utama, tautan aktif, aksen sistem |
| `brand-admin` | `#d97706` (Amber 600) | Indikator menu dan badge khusus hak akses ADMIN |

---

## 3. Tipografi

- **Font Antarmuka (UI Text):** `Inter`, `sans-serif` (300, 400, 500, 600, 700).
- **Font Data & Identitas (Monospace):** `JetBrains Mono`, `monospace` (400, 500, 700). Digunakan khusus untuk:
  - Kode ID Perangkat (`CAM-0001`, `AUD-0001`, `ZON-0001`, `SIT-0001`, `USR-0001`, `SCH-0001`)
  - Alamat IP, Host, Port, Latensi (ms), Resolusi, Timestamp, Status Code.

---

## 4. Katalog Komponen UI (`src/components/ui/`)

Semua komponen dibangun reusable, modular, tipe aman, dan mendukung keyboard accessibility / focus ring.

| Komponen | Berkas | Fitur & Deskripsi |
|---|---|---|
| **Button** | `Button.vue` | Varian: `primary`, `secondary`, `danger`, `ghost`, `link`. Ukuran: `xs`, `sm`, `md`, `lg`. Mendukung spinner loading otomatis. |
| **Input** | `Input.vue` | Input teks dengan slot prefix/suffix ikon, validasi error inline, hint text, dan styling dark control room. |
| **Select** | `Select.vue` | Dropdown kustom dengan label, teks bantuan, state disabled, dan error reporting. |
| **Badge** | `Badge.vue` | Indikator status (`ONLINE`, `OFFLINE`, `WARNING`, `ACTIVE`, `CRITICAL`, `DEMO`) dengan dot berdenyut (pulse animation). |
| **Card** | `Card.vue` | Kontainer panel dengan slot header, aksi, subtitle, dan border tipis `#283548`. |
| **Table** | `Table.vue` | Data table adaptif dengan slot kolom dinamis, baris kosong (empty state), dan scrolling responsif. |
| **Pagination** | `Pagination.vue` | Kontrol paginasi dengan indikator halaman aktif, lompatan halaman, dan total item. |
| **Modal** | `Modal.vue` | Dialog modal terpusat dengan backdrop blur, transisi animasi halus, dan tombol penutup Escape/klik luar. |
| **Drawer** | `Drawer.vue` | Panel samping geser (slide-over) dari kanan layar, cocok untuk live inspection dan quick control. |
| **ConfirmationDialog** | `ConfirmationDialog.vue` | Dialog konfirmasi bahaya/penghapusan dengan peringatan dampak data (misal: soft delete perangkat). |
| **ToastContainer** | `ToastContainer.vue` | Wadah notifikasi toast mengambang di pojok kanan atas layar (`success`, `error`, `warning`, `info`). |
| **Loading** | `Loading.vue` | Indikator muat data dengan teks status dan animasi spinner. |
| **EmptyState** | `EmptyState.vue` | Tampilan informatif ketika data tabel atau daftar kosong, dilengkapi tombol aksi pemicu. |
| **ErrorState** | `ErrorState.vue` | Tampilan penanganan kesalahan fetch API dengan tombol coba lagi (retry). |

---

## 5. Komponen Spesifik Sistem

- **`DeviceMap.vue` (`src/components/maps/DeviceMap.vue`):** Peta interaktif Leaflet dengan tema gelap (CartoDB Dark Matter), marker koordinat nyata CCTV dan Speaker, popup status real-time, dan koordinat sinkron data seed PostgreSQL.
- **`AppSidebar.vue` (`src/components/layout/AppSidebar.vue`):** Navigasi vertikal kolapsibel, pembagian menu terstruktur (Operasi Monitoring vs Administrasi Admin), serta role-gated rendering.
- **`AppHeader.vue` (`src/components/layout/AppHeader.vue`):** Breadcrumb dinamis, badge `DEMO MODE`, tombol instan pengalihan peran (Admin ↔ Operator), dropdown notifikasi alarm, dan menu profil.
