# Dokumentasi Integrasi Audio Streaming WebRTC (WHIP) & Manajemen Speaker

Dokumentasi arsitektur dan panduan teknis integrasi streaming audio real-time untuk Push-to-Talk (PTT) mikrofon langsung pada CCTV & Audio Paging System.

---

## 1. Spesifikasi Teknis Audio (16 kHz Mono)

Sesuai kebutuhan sistem dan optimasi latensi jaringan komunikasi darurat, aliran audio dari mikrofon dikonfigurasi pada:

| Parameter | Nilai Konfigurasi | Keterangan |
|---|---|---|
| **Sample Rate** | **16.000 Hz (16 kHz)** | Kualitas Wideband optimal untuk transmisi vokal suara manusia |
| **Channel Count** | **1 (Mono)** | Mencegah pemborosan bandwidth saluran stereo yang tidak perlu |
| **Codec** | **Opus Wideband** | Dinegosiasikan via SDP: `maxplaybackrate=16000; sprop-maxcapturerate=16000; stereo=0; sprop-stereo=0` |
| **Protokol Ingest** | **RFC 9329 WHIP** | WebRTC HTTP Ingestion Protocol via HTTP POST |
| **Gateway Endpoint** | `https://stream.zakuyu.fun/audio-raw/whip` | Server MediaMTX (Caddy reverse proxy dengan HTTPS & CORS) |
| **Media Transport** | **WebRTC RTP/SAVPF** | Enkripsi DTLS-SRTP, ICE Candidates via Google STUN |

---

## 2. Manajemen Perangkat Speaker (CRUD)

Pengelolaan speaker audio dikelola melalui Pinia Store reaktif ([audioDevices.js](file:///c:/monitoring-cctv/frontend/src/stores/audioDevices.js)) dan antarmuka manajemen perangkat ([DevicesView.vue](file:///c:/monitoring-cctv/frontend/src/views/DevicesView.vue)):

1. **Auto-Generated ID & Immutability:**
   - ID speaker dialokasikan otomatis oleh sistem (`AUD-0001`, `AUD-0002`, `AUD-0003`, `AUD-0004`, dst.).
   - ID bersifat *read-only* dan tidak dapat diedit atau ditimpa saat pembaruan data.
2. **Atribut Entitas Speaker:**
   - `id`: Kode identitas otomatis (misal: `AUD-0001`)
   - `name`: Nama deskriptif speaker (misal: "Speaker Lobby Utama")
   - `siteId`: Lokasi site (`SIT-0001`)
   - `zoneId` & `zoneName`: Zona paging tujuan
   - `whipUrl`: Endpoint ingestion gateway (misal: `https://stream.zakuyu.fun/audio-raw/whip`)
   - `sampleRate`: `16000` (16 kHz)
   - `channels`: `1` (Mono)
   - `volume`: 0–100%
   - `status`: `ONLINE` / `ON AIR` / `OFFLINE` (Dinamis)
   - `latencyMs`: Nilai latensi respons hasil ping (ms)
3. **Penyimpanan Lokal Persisten:**
   - Seluruh penambahan, pengubahan, dan pengarsipan speaker tersimpan persisten pada `localStorage` browser.

---

## 3. Fitur Status Aktif & Dinamis

- **Uji Ping Gateway Real-Time:**
  Tombol **"Uji Ping Gateway"** (atau tombol **"Ping"** pada tabel) mengirimkan HTTP `OPTIONS` ke endpoint `whipUrl`. Sistem menghitung *round-trip time* dalam milidetik (ms) dan memperbarui status speaker menjadi `ONLINE` beserta latensinya.
- **Transisi Status Otomatis (ON AIR):**
  Saat tombol PTT ditekan pada konsol [AudioPagingView.vue](file:///c:/monitoring-cctv/frontend/src/views/AudioPagingView.vue), speaker target secara dinamis beralih status menjadi **`ON AIR`** (dengan indikator merah menyala berdenyut). Ketika transmisi selesai, status kembali menjadi **`ONLINE`**.
- **Indikator VU Meter 16 kHz:**
  Menggunakan Web Audio API `AudioContext` pada sampel 16 kHz untuk menghitung amplitudo mic secara dinamis (0–100%) dan menggerakkan 20 segmen bar equalizer suara.
