# Layanan Gateway Streaming CCTV & Integrasi Media (Tahap 5)

Dokumen ini menjelaskan arsitektur, integrasi protokol media (WHEP WebRTC, HLS, RTSP), aturan agregasi status, negosiasi SDP, dan API streaming CCTV.

---

## 1. Arsitektur Gateway Streaming

Layanan Gateway Streaming bertindak sebagai perantara (*facade/proxy & orchestrator*) antara klien antarmuka (web browser) dengan server gateway media lokal (MediaMTX / go2rtc / WebRTC Egress):

```
┌────────────────────────┐                   ┌─────────────────────────────────────────┐
│     Web Frontend       │                   │          Backend Node.js API            │
│  (Vue 3 + HTML5 Video  │                   │                                         │
│   / WebRTC WHEP)       │                   │                                         │
└───────────┬────────────┘                   └────────────────────┬────────────────────┘
            │                                                     │
            │ 1. GET /api/streaming/cameras                       │
            │ 2. POST /api/streaming/whep/:streamKey (SDP Offer) │
            │ ◄───────────────────────────────────────────────────┤
            │    201 Created (SDP Answer WebRTC)                  │
            │                                                     │
            │ 3. WebSocket Hub: room cctv:streams                 │
            │ ◄═══════════════════════════════════════════════════╡
            │    event: cctv:stream_status                        │
            │                                                     │
            ▼                                                     ▼
┌────────────────────────┐                   ┌─────────────────────────────────────────┐
│   Media Stream Client  │  Direct WHEP/HLS  │       Media Streaming Gateway           │
│   (WebRTC PeerConnection│ ◄────────────────►│       (MediaMTX / go2rtc)               │
│    / HLS.js Player)    │                   │   Port: 8554 (RTSP/WebRTC), 9997 (API)  │
└────────────────────────┘                   └────────────────────▲────────────────────┘
                                                                  │
                                                     RTSP Pull    │
                                                                  ▼
                                                     ┌─────────────────────────┐
                                                     │      Kamera IP CCTV     │
                                                     │  (RTSP / H.264 / ONVIF) │
                                                     └─────────────────────────┘
```

---

## 2. Pemisahan Status Hardware vs Ketersediaan Stream

Sistem secara ketat membedakan dua dimensi kondisi:
1. **Hardware Connectivity Status** (`status` di tabel `cameras`):
   - `UNKNOWN`: Kondisi awal saat registrasi.
   - `ONLINE`: Perangkat merespons ping TCP/ICMP secara normal.
   - `WARNING`: Perangkat mengalami latensi tinggi, packet loss berkala, atau kegagalan stream.
   - `OFFLINE`: Perangkat gagal dijangkau (gagal 3x berturut-turut).
2. **Stream Availability Status** (`streamStatus` di tabel `cameras`):
   - `UNKNOWN`: Belum diverifikasi ke gateway media.
   - `NOT_CONFIGURED`: Kamera belum memiliki `streamKey`.
   - `AVAILABLE`: Gateway media menerima sinyal video aktif dari kamera dan siap ditonton.
   - `UNAVAILABLE`: Kamera tidak mengirimkan sinyal video ke gateway atau format terputus.

### Aturan Agregasi & Hubungan Dependensi:
- **Kamera OFFLINE**: Jika konektivitas hardware kamera mati (`OFFLINE`), stream video dipaksa menjadi `UNAVAILABLE` secara otomatis, karena perangkat tidak dapat mengirimkan data video.
- **Hardware ONLINE tetapi Stream UNAVAILABLE**: Jika perangkat hardware merespons ping (`ONLINE`) namun gateway media mendeteksi *video loss* atau stream terputus (`UNAVAILABLE`), status perangkat hardware secara otomatis diturunkan ke `WARNING`.
- **Pembuatan Event Alarm Otomatis**: Ketika stream bertransisi dari `AVAILABLE` ke `UNAVAILABLE`, sistem secara otomatis membuat alarm event:
  - Tipe: `STREAM_UNAVAILABLE`
  - Severity: `WARNING`
  - Status: `OPEN`
  - Judul: `[CAM-XXXX] Video Stream Terputus`
  - Deduplication Key: `camera:CAM-XXXX:stream`

---

## 3. Resolusi Format URL Streaming

Metode `gatewayAdapter.resolveStreamUrls(streamKey)` menghasilkan paket URL lengkap untuk berbagai protokol:

| Protokol | Format URL | Keterangan & Karakteristik |
|---|---|---|
| **WebRTC WHEP** | `http://localhost:8554/{streamKey}/whep` | Latensi sangat rendah (< 500ms), protokol standar WHEP (RFC draft). |
| **HLS (HTTP Live)** | `http://localhost:8554/{streamKey}/index.m3u8` | Kompatibilitas luas, failover jika WebRTC diblokir firewall (latensi 2-4s). |
| **RTSP** | `rtsp://localhost:8554/{streamKey}` | Digunakan untuk NVR, AI video analytics, atau re-encoding. |
| **Direct Playback** | `http://localhost:8554/{streamKey}` | Tautan pemutar bawaan MediaMTX untuk debugging cepat. |

Jika `streamKey` tidak terdefinisi (`null`/kosong), seluruh URL di atas mengembalikan `null` secara aman.

---

## 4. Negosiasi WebRTC WHEP (SDP Offer / Answer)

Backend mengimplementasikan endpoint WHEP di `/api/streaming/whep/:streamKey`:
1. Klien web membuat *WebRTC SDP Offer* menggunakan `RTCPeerConnection.createOffer()`.
2. Klien mengirim `POST /api/streaming/whep/:streamKey` dengan header `Content-Type: application/sdp` dan body SDP Offer.
3. Gateway Adapter meneruskan penawaran ke MediaMTX API atau menghasilkan SDP Answer simulasi valid jika berjalan dalam mode demo/lokal tanpa gateway eksternal aktif.
4. Server merespons `201 Created` dengan `Content-Type: application/sdp` yang berisi *SDP Answer*.
5. Klien menyetel `peerConnection.setRemoteDescription()` dan video langsung muncul.

---

## 5. Ringkasan Endpoint REST API

| Method | Endpoint | Hak Akses | Deskripsi |
|---|---|---|---|
| `GET` | `/api/streaming/cameras` | Publik/Authenticated | Mengambil daftar seluruh kamera dengan status hardware, status stream, dan URL playback. |
| `GET` | `/api/streaming/cameras/:id` | Publik/Authenticated | Mengambil detail spesifik kamera beserta konfigurasi resolusi dan status gateway. |
| `POST` | `/api/streaming/cameras/:id/check` | Operator / Admin | Memicu verifikasi on-demand status stream ke gateway media secara langsung. |
| `GET` | `/api/streaming/gateway/status` | Publik/Authenticated | Memeriksa konektivitas dan tipe gateway streaming aktif (MediaMTX / go2rtc / mock). |
| `POST` | `/api/streaming/whep/:streamKey` | Publik/Client Video | Menangani negosiasi WHEP SDP Offer -> SDP Answer untuk pemutaran WebRTC. |

---

## 6. Event WebSocket Hub

Modul streaming terintegrasi ke WebSocket Hub pada room `cctv:streams`:
- Event `cctv:stream_status`:
  ```json
  {
    "cameraId": "CAM-0001",
    "streamStatus": "AVAILABLE",
    "streamKey": "demo-lobby-1",
    "timestamp": "2026-10-12T08:36:25.894Z"
  }
  ```
- Event `events:alarm_update`: Dikirim ketika alarm `STREAM_UNAVAILABLE` dibuat secara otomatis saat stream terputus.
