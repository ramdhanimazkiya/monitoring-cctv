# Analisis Kebutuhan → Desain Database (Tahap 1)

Dokumen ini memetakan kebutuhan pada prompt proyek ke entitas, atribut, relasi, dan aturan bisnis.
Detail relasi: [ERD.md](ERD.md). Keputusan & pertanyaan terbuka: [DECISIONS.md](DECISIONS.md).

## 1. Daftar entitas

| # | Entitas (tabel) | Tujuan | Jenis |
|---|---|---|---|
| 1 | `users` | Akun Admin/Operator, hash password, penguncian login | Master (ID `USR-`) |
| 2 | `sessions` | Session server-side (token ter-hash), revoke & kedaluwarsa | Operasional |
| 3 | `user_zone_access` | Zona yang boleh dipaging oleh Operator | Relasi M:N |
| 4 | `sites` | Lokasi/gedung | Master (`SIT-`) |
| 5 | `zones` | Area/zona dalam site; unit target paging | Master (`ZON-`) |
| 6 | `cameras` | Kamera CCTV + status saat ini | Master (`CAM-`) |
| 7 | `audio_devices` | Speaker/perangkat audio + status saat ini | Master (`AUD-`) |
| 8 | `audio_groups`, `audio_group_members` | Grup target paging lintas zona | Master (`GRP-`) + M:N |
| 9 | `device_status_history` | Riwayat perubahan status perangkat | Histori append-only |
| 10 | `events` | Event & alarm dengan siklus OPEN→ACK→RESOLVED | Histori siklus hidup |
| 11 | `audio_schedules`, `audio_schedule_targets` | Jadwal audio + targetnya | Master (`SCH-`) |
| 12 | `audio_schedule_executions` | Eksekusi tiap kemunculan jadwal (idempotensi) | Histori siklus hidup |
| 13 | `audio_commands`, `audio_command_targets` | PTT/TTS manual maupun terjadwal + hasil per perangkat | Histori siklus hidup |
| 14 | `audio_channel_leases` | Lock/lease kanal PTT per perangkat | Operasional |
| 15 | `audit_logs` | Jejak aktivitas | Histori append-only |
| 16 | `system_settings` | Konfigurasi sistem (key-value) | Konfigurasi |

## 2. Pemetaan kebutuhan → desain

| Kebutuhan (prompt) | Dukungan di database |
|---|---|
| Status ONLINE/OFFLINE/WARNING, diubah monitoring service, bukan CRUD | enum `device_status` (+`UNKNOWN`), kolom status pada perangkat, `device_status_history`; kolom status tidak ada di skema validasi CRUD (Tahap 4) |
| Riwayat perubahan status | `device_status_history` append-only (trigger) |
| Event & alarm | `events` (type, severity, status, ack/resolve oleh user) |
| Peta Leaflet | `latitude/longitude DECIMAL(9,6)` pada `sites`, `cameras`, `audio_devices` (+CHECK rentang) |
| Live view: pemisahan konektivitas vs stream; media gateway | `cameras.status` vs `cameras.stream_status`; `cameras.stream_key` (path di gateway) |
| PTT, TTS, target speaker/zona/grup | `audio_commands.kind`, `audio_command_targets`, `audio_groups`, `target_spec` |
| Konflik kanal PTT, lease | `audio_channel_leases` PK = perangkat |
| Status eksekusi per target, riwayat sukses/gagal | `audio_command_targets.status/error_*`, `audio_commands.status` |
| Jangan klaim audio diputar tanpa konfirmasi | `delivery_confirmed`, status `UNCONFIRMED`, CHECK `DELIVERED ⇒ confirmed`, `supports_delivery_receipt` |
| Mode simulasi vs perangkat nyata | `audio_commands.mode`, `adapter_type='mock'`, `is_demo` |
| Jadwal sekali/berulang, timezone | `recurrence`, `timezone` (IANA), `time_of_day`, `days_of_week`, `day_of_month`, `next_run_at` (UTC) |
| Cegah eksekusi ganda; jadwal terlewat; retry | UNIQUE `(schedule_id, scheduled_for)`, `misfire_policy`, `max_retries`, `attempt`, status `MISSED` |
| Role Admin/Operator; hak akses target Operator | enum `user_role`; `user_zone_access`; otorisasi di backend (Tahap 4–5) |
| Audit log tidak dapat diedit/dihapus | `audit_logs` append-only (trigger) |
| ID otomatis & tidak bisa diedit | `DEFAULT next_xxx_id()` + trigger `prevent_id_change` + CHECK format |
| Kredensial perangkat tidak terbuka | `credential_cipher` terenkripsi; tidak pernah di API/log |
| Konfigurasi sistem, retensi | `system_settings` (kunci `retention.*`, `monitoring.*`, `paging.*`, `app.timezone`) |
| Password tidak plaintext; lockout login | `password_hash`, `failed_login_count`, `locked_until` |

## 3. Aturan bisnis yang ditegakkan database

| Kode | Aturan | Mekanisme | Diuji (`db:verify`) |
|---|---|---|---|
| BR-01 | ID master dibuat sistem, format `PREFIX-NNNN`, tidak dapat diubah | default function + trigger + CHECK | ya |
| BR-02 | Zona perangkat harus satu site dengan perangkat | FK komposit `(zone_id, site_id)` | ya |
| BR-03 | Histori status mengacu tepat satu perangkat | CHECK `num_nonnulls = 1` | ya |
| BR-04 | `device_status_history` & `audit_logs` tidak dapat diubah; hapus hanya via retensi | trigger | ya |
| BR-05 | Master data tidak dihapus fisik; hapus = arsip | trigger `block_delete_unless_purge` + `deleted_at` | ya (zona) |
| BR-06 | Satu perangkat audio hanya punya satu lease PTT aktif | PK `audio_channel_leases.audio_device_id` | ya |
| BR-07 | Satu kemunculan jadwal hanya menghasilkan satu eksekusi | UNIQUE `(schedule_id, scheduled_for)` | ya |
| BR-08 | Kolom jadwal harus sesuai tipe pengulangan | CHECK `audio_schedules_recurrence_chk` | ya |
| BR-09 | Target jadwal tepat satu jenis (device/zone/group) | CHECK | ya |
| BR-10 | Target berstatus `DELIVERED` wajib terkonfirmasi | CHECK | ya |
| BR-11 | Perintah MANUAL wajib punya user; SCHEDULE wajib punya eksekusi; PTT tidak terjadwal | CHECK | sebagian |
| BR-12 | Event mengacu maksimal satu perangkat; status RESOLVED wajib `resolved_at` | CHECK | ya |
| BR-13 | Koordinat valid dan berpasangan | CHECK | ya |
| BR-14 | Username huruf kecil | CHECK | ya |

## 4. Aturan yang ditegakkan **aplikasi** (belum diimplementasikan, Tahap 4+)

- Kolom `status`, `stream_status`, `status_*`, `last_*`, `consecutive_failures` hanya ditulis monitoring service;
  skema Zod CRUD harus `.strict()` dan tidak menyertakan `id`, `code`, maupun kolom status.
- Nama kamera/zona/perangkat unik di antara record **aktif** dalam satu site (dicek di service; sengaja tidak memakai
  unique index agar nama bekas record terarsip dapat dipakai ulang).
- Arsip site/zona ditolak jika masih punya anak aktif (zona, perangkat) atau jadwal aktif yang menargetkannya.
- Validasi nama timezone IANA (`Intl.supportedValuesOf('timeZone')`), batas panjang TTS dari `paging.tts_max_chars`.
- Redaksi password/secret sebelum menulis `audit_logs.before/after`.
- Penentuan akses Operator ke target (zona via `user_zone_access`) pada PTT/TTS.
