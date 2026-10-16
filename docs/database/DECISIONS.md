# Keputusan Desain & Pertanyaan Terbuka (Tahap 1)

## A. Keputusan yang sudah diambil (default; dapat diubah sebelum Tahap 2)

| # | Keputusan | Alasan |
|---|---|---|
| D1 | **ID master = teks `PREFIX-NNNN`** dari sequence DB (`CAM-0001`, `ZON-0001`, `AUD-0001`, `SIT-`, `GRP-`, `SCH-`, `USR-`). Satu ID saja (tanpa ID internal terpisah). Nomor tidak dipakai ulang; celah nomor normal. | Permintaan: ID otomatis & tidak bisa diedit. Mudah dibaca operator, aman untuk request paralel, tidak bergantung aplikasi. |
| D2 | ID immutable ditegakkan **tiga lapis**: Zod `.strict()` (Tahap 4), service whitelist field, **trigger DB**. | Tidak bisa dilewati lewat API, bug, maupun SQL manual. Catatan: pengguna DB dengan hak penuh tetap dapat memasukkan ID eksplisit berformat valid saat INSERT; aplikasi tidak pernah melakukannya. |
| D3 | Prisma **7.10.0** (dipin). Prisma 8 masih RC. Generator `prisma-client` menghasilkan file TypeScript → diimpor dari JavaScript memakai type-stripping bawaan **Node ≥ 22.18** (`engines` di package.json). | Versi stabil terbaru; tetap JavaScript murni di kode sumber. |
| D4 | **Soft delete** untuk master data; `DELETE` fisik diblok trigger. | Histori & audit harus tetap dapat ditelusuri ke perangkat/pengguna yang sudah “dihapus”. |
| D5 | Status perangkat punya nilai tambahan **`UNKNOWN`** (belum pernah diperiksa). | Tanpa ini perangkat baru akan tampak `OFFLINE`/`ONLINE` padahal belum diperiksa — menyesatkan. |
| D6 | Hierarki lokasi **dua tingkat**: `Site` (lokasi/gedung) → `Zone` (area/zona). | Mencakup “site, area, zona, lokasi” pada prompt tanpa tabel berlebih. Bila perlu tiga tingkat, `zones.parent_id` dapat ditambah dengan migrasi. |
| D7 | Role = **enum** (`ADMIN`, `OPERATOR`), bukan tabel permission. Hak akses Operator per target lewat `user_zone_access`. | Hanya dua role pada tahap awal. |
| D8 | Auth: **session server-side** (cookie `HttpOnly`, `SameSite`, token acak; DB menyimpan hash SHA-256). | Mudah di-revoke, tidak menaruh token di `localStorage`. JWT dapat dipertimbangkan bila ada klien non-browser. |
| D9 | Konten jadwal: **hanya TTS** pada tahap awal. | File audio rekaman butuh storage & manajemen aset; belum ada di kebutuhan eksplisit. |
| D10 | Scheduler: tabel `audio_schedules.next_run_at` + `audio_schedule_executions` (UNIQUE) dipoll worker terpisah dengan `FOR UPDATE SKIP LOCKED`; tanpa Redis/infra tambahan. (pg-boss alternatif; diputuskan di Tahap 8.) | Tahan restart, tanpa Docker/Redis. |
| D11 | Jadwal MONTHLY dengan `day_of_month` 29–31: bulan pendek memakai **hari terakhir bulan**. | Perilaku paling umum dan dapat diprediksi. |
| D12 | Timezone default **Asia/Jakarta** (`system_settings: app.timezone`); penyimpanan selalu UTC. | Sesuai lokasi pengguna; dapat diubah Admin. |
| D13 | Notifikasi (lonceng header) bersumber dari `events` + Socket.IO; tidak ada tabel notifikasi per-user pada tahap ini. | Menghindari tabel yang belum tentu dibutuhkan; dievaluasi di Tahap 9. |
| D14 | Retensi default: status 365 hari, event 365, riwayat audio 365, audit log 730, sesi 30 (`system_settings`). Purge oleh job dengan `SET LOCAL app.allow_purge='on'`. | Angka awal wajar; **perlu konfirmasi** (Q3). |
| D15 | Data DEMO diberi `is_demo = true`, nama berawalan `[DEMO]`, `adapter_type = 'mock'`, status `UNKNOWN`. | UI dapat memberi label DEMO; tidak ada status simulasi yang tampak nyata. |

## B. Perlu keputusan/konfirmasi Anda

| # | Pertanyaan | Default yang saya usulkan | Dampak jika berbeda |
|---|---|---|---|
| Q1 | **Hak akses Operator per zona**: Operator hanya boleh PTT/TTS ke zona yang di-assign (`user_zone_access`)? Atau semua zona? Apakah pembatasan juga berlaku untuk melihat CCTV? | PTT/TTS dibatasi per zona assign; **melihat** CCTV/dashboard untuk semua. | Jika semua zona: tabel `user_zone_access` dapat dibuang. Jika CCTV juga dibatasi: perlu aturan akses kamera. |
| Q2 | **Perangkat nyata**: merek/model kamera, protokol (ONVIF/RTSP), dan **merek/model speaker** + protokolnya (SIP, HTTP API, RTP multicast, …)? | Belum ada → semua adapter `mock`. Saya tidak akan mengarang endpoint vendor. | Menentukan adapter Tahap 6–7 dan nilai `adapter_type`/`adapter_config`. |
| Q3 | **Retensi** data (angka pada D14) dan apakah audit log harus disimpan lebih lama/arsip ke file? | Lihat D14. | Hanya mengubah nilai `system_settings` dan job purge. |
| Q4 | **Media gateway** untuk live view: MediaMTX, go2rtc, atau lainnya? WebRTC (latensi rendah) atau HLS (lebih mudah)? | MediaMTX/go2rtc + WebRTC atau HLS ditentukan di Tahap 6; DB hanya menyimpan `stream_key`. | Mempengaruhi Tahap 6 (tidak mengubah skema). |
| Q5 | **TTS engine**: online (cloud) atau offline/lokal? Bahasa utama? | Adapter TTS dengan engine simulasi; bahasa `id-ID`. | Mempengaruhi Tahap 7. |
| Q6 | Perlu **file audio rekaman** pada jadwal (bukan hanya TTS)? | Tidak (D9). | Tambah tabel aset audio + kolom konten pada jadwal/command. |
| Q7 | Perlu hierarki lokasi **lebih dari dua tingkat** (mis. Wilayah → Gedung → Lantai → Zona)? | Dua tingkat (D6). | Tambah `parent_id` pada `zones` / tabel baru. |
| Q8 | Satu perangkat audio boleh berada di **lebih dari satu zona**? | Tidak; satu `zone_id` (grup menangani lintas zona). | Perlu tabel M:N perangkat↔zona. |
| Q9 | Nama perangkat/zona **boleh kembar** pada site yang sama? | Tidak untuk record aktif (dicek service). | Bila boleh, hapus pengecekan. |
| Q10 | Kebijakan password & sesi (panjang minimal, masa berlaku, lockout)? | ≥12 karakter, lockout setelah 5 gagal/15 menit, sesi 8 jam idle 30 menit. | Diputuskan di Tahap 5. |

## C. Keterbatasan yang diketahui

- **`npm audit`**: 4 temuan *high* berada pada rantai CLI Prisma (`prisma → @prisma/config → deepmerge-ts`, `mysql2`).
  `mysql2` **tidak dipakai** (proyek ini PostgreSQL); saran “fix” otomatis akan menurunkan Prisma ke v6 (breaking), jadi
  tidak dilakukan. Akan ditinjau ulang pada Tahap 10 (hardening) saat versi perbaikan tersedia.
- `updated_at` diisi oleh Prisma Client (bukan default DB). INSERT SQL manual harus mengisinya sendiri.
- Sequence tidak ikut rollback; menjalankan `npm run db:verify` menghabiskan beberapa nomor ID
  (`CAM-0007` dst). **Jangan jalankan `db:verify` pada database produksi.**
- Unique name per-site untuk record aktif tidak ditegakkan database (hanya service) — lihat ANALISIS-KEBUTUHAN §4.
- Validasi timezone IANA dan batas TTS konfigurable dilakukan aplikasi, bukan database.
