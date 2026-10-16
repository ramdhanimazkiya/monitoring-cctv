# Setup Database & Migrasi (tanpa Docker)

Prasyarat: **Node.js ≥ 22.18**, **PostgreSQL** terpasang secara lokal (hanya diuji pada PostgreSQL 18.6, Node 22.23;
versi PostgreSQL lain belum diuji).
Contoh perintah memakai PowerShell di Windows.

## 1. Pastikan PostgreSQL berjalan

```powershell
Get-Service postgresql*          # Status harus Running (mis. postgresql-x64-18)
```

`psql` biasanya tidak ada di PATH. Gunakan path lengkap:

```powershell
$psql = "C:\Program Files\PostgreSQL\18\bin\psql.exe"
```

## 2. Buat role dan database

Ganti `PASSWORD_KUAT` dengan password Anda sendiri (jangan di-commit).

```powershell
& $psql -h localhost -U postgres
```
```sql
CREATE ROLE cctv_app LOGIN PASSWORD 'PASSWORD_KUAT' CREATEDB;
CREATE DATABASE monitoring_cctv OWNER cctv_app;
\q
```

- `CREATEDB` dibutuhkan agar `prisma migrate dev` dapat membuat *shadow database*. Pada server produksi
  gunakan `prisma migrate deploy` sehingga role aplikasi tidak memerlukan `CREATEDB`.
- Role harus **pemilik** objek database (menjalankan migrasi), karena fungsi `next_*_id()` memanggil sequence
  sebagai pemanggil.

## 3. Konfigurasi environment

```powershell
cd backend
Copy-Item .env.example .env
notepad .env
```

Isi `DATABASE_URL`, `SEED_ADMIN_PASSWORD`, `SEED_OPERATOR_PASSWORD` (masing-masing ≥ 12 karakter).
Karakter khusus pada password di `DATABASE_URL` harus di-URL-encode (mis. `@` → `%40`).
`.env` sudah masuk `.gitignore`.

## 4. Instal, generate client, migrasi, seed, verifikasi

```powershell
cd backend
npm install
npm run db:generate     # membuat Prisma Client di backend/generated/prisma
npm run db:deploy       # menerapkan migrasi (prisma migrate deploy)
npm run db:seed         # data demo; aman dijalankan berulang
npm run db:verify       # 35 pengujian integritas (rollback-only)
```

Selama pengembangan, ketika `schema.prisma` berubah, gunakan `npm run db:migrate` (= `prisma migrate dev`)
untuk membuat migrasi baru. **Jangan mengedit `0001_init/migration.sql` setelah diterapkan**; buat migrasi baru.

Perintah lain: `npm run db:status` (status migrasi), `npm run db:reset` (**menghapus semua data** lalu migrasi + seed ulang;
hanya development).

## 5. Akun demo

Hanya untuk development. Password **tidak ada di repository**; nilainya yang Anda isi di `.env`.

| Username | Role | Password |
|---|---|---|
| `admin` | ADMIN | nilai `SEED_ADMIN_PASSWORD` |
| `operator` | OPERATOR | nilai `SEED_OPERATOR_PASSWORD` |

Seed menolak berjalan jika `NODE_ENV=production`. Seed hanya membuat user bila username belum ada,
dan tidak pernah mereset password user yang sudah ada.

## 6. Data demo yang dibuat seed

1 site, 2 zona, 3 kamera, 2 perangkat audio — semua bernama `[DEMO] …`, `is_demo = true`,
`adapter_type = 'mock'`, status `UNKNOWN` (belum ada monitoring service), plus 1 jadwal demo **nonaktif**
dan 13 kunci `system_settings`. Koordinat adalah titik fiktif untuk uji peta.

## 7. Backup & restore cepat (development)

```powershell
& "C:\Program Files\PostgreSQL\18\bin\pg_dump.exe" -h localhost -U cctv_app -Fc monitoring_cctv -f backup.dump
& "C:\Program Files\PostgreSQL\18\bin\pg_restore.exe" -h localhost -U cctv_app -d monitoring_cctv --clean --if-exists backup.dump
```

Prosedur backup/restore produksi dilengkapi pada Tahap 10.

## 8. Troubleshooting

| Gejala | Penyebab / solusi |
|---|---|
| `DATABASE_URL belum diatur` | `.env` belum dibuat dari `.env.example`. |
| `password authentication failed` | Password/URL salah; cek encoding karakter khusus. |
| `permission denied to create database` saat `migrate dev` | Role tanpa `CREATEDB`: `ALTER ROLE cctv_app CREATEDB;` |
| `function next_xxx_id() does not exist` | Migrasi belum diterapkan, atau skema bukan `public` (`?schema=public`). |
| `Seed demo ditolak` | `NODE_ENV=production`; seed hanya untuk development. |
| `SEED_ADMIN_PASSWORD belum diatur` | Isi di `.env` (≥ 12 karakter, bukan nilai contoh `GANTI_…`). |
| `Cannot find module '../../generated/prisma/client.ts'` | Jalankan `npm run db:generate`. |
| `Unknown file extension ".ts"` | Node terlalu lama; gunakan Node ≥ 22.18. |
| Update `id` ditolak: `immutable` | Perilaku yang disengaja (lihat DECISIONS D1–D2). |
| `DELETE` ditolak: `tidak diizinkan` | Disengaja; gunakan arsip (`deleted_at`). Retensi memakai `SET LOCAL app.allow_purge='on'`. |
