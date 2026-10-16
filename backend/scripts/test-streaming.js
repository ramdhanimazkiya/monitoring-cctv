/**
 * Script Pengujian Otomatis Tahap 5: CCTV Stream Gateway & Media Integration
 *
 * Menguji seluruh kriteria integrasi streaming CCTV:
 *  1. Resolver URL Stream (WebRTC WHEP, HLS index.m3u8, RTSP, Playback)
 *  2. Pemisahan Status Hardware vs Ketersediaan Stream Gateway
 *  3. Aturan Agregasi (Kamera OFFLINE -> Stream UNAVAILABLE; Stream hilang -> Hardware WARNING)
 *  4. Pembuatan Otomatis Alarm Event (type: STREAM_UNAVAILABLE)
 *  5. Negosiasi Protokol WHEP (SDP Offer -> SDP Answer 201 Created)
 *  6. REST API Endpoints (/api/streaming/*)
 *  7. Broadcast Real-time Ketersediaan Stream via WebSocket Hub (room cctv:streams)
 *
 * Jalankan: npm run test:streaming
 * Exit code: 0 jika semua lolos, 1 jika ada yang gagal.
 */
import http from "http";
import { io as ClientIO } from "socket.io-client";
import { prisma } from "../src/config/database.js";
import { createApp } from "../src/app.js";
import { wsHub } from "../src/websocket/hub.js";
import { gatewayAdapter } from "../src/modules/streaming/gateway.adapter.js";
import {
  checkCameraStream,
  listCameraStreams,
  getCameraStream,
} from "../src/modules/streaming/streaming.service.js";
import { generateSessionToken, hashSessionToken } from "../src/modules/auth/auth.service.js";

const TEST_PORT = 3399;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;

const results = [];

function pass(name, detail = "") {
  results.push({ name, passed: true, detail });
  console.log(`  \x1b[32m✔\x1b[0m ${name}${detail ? ` (${detail})` : ""}`);
}

function fail(name, reason) {
  results.push({ name, passed: false, reason });
  console.log(`  \x1b[31m✖\x1b[0m ${name}: ${reason}`);
}

async function runTests() {
  console.log("\n=======================================================");
  console.log(" PENGUJIAN OTOMATIS TAHAP 5: CCTV STREAM GATEWAY");
  console.log("=======================================================\n");

  const app = createApp();
  const server = http.createServer(app);
  wsHub.init(server);

  await new Promise((resolve) => server.listen(TEST_PORT, "127.0.0.1", resolve));
  console.log(`[Test Server] Berjalan pada port ${TEST_PORT}\n`);

  let testSessionCookie = "";

  try {
    // Siapkan sesi admin
    const adminUser = await prisma.user.findUnique({ where: { username: "admin" } });
    if (adminUser) {
      const rawToken = generateSessionToken();
      await prisma.session.create({
        data: {
          userId: adminUser.id,
          tokenHash: hashSessionToken(rawToken),
          expiresAt: new Date(Date.now() + 3600000),
        },
      });
      testSessionCookie = `cctv_session=${rawToken}`;
    }

    // Pastikan seluruh kamera demo memiliki streamKey terkonfigurasi untuk pengujian streaming
    const demoCameras = await prisma.camera.findMany({ where: { isDemo: true, deletedAt: null }, orderBy: { id: "asc" } });
    for (let i = 0; i < demoCameras.length; i++) {
      if (!demoCameras[i].streamKey) {
        await prisma.camera.update({
          where: { id: demoCameras[i].id },
          data: { streamKey: `demo-cam-0${i + 1}` },
        });
      }
    }

    const targetCam = await prisma.camera.findFirst({
      where: { isDemo: true, deletedAt: null },
      orderBy: { id: "asc" },
    });

    if (targetCam && !targetCam.streamKey) {
      targetCam.streamKey = "demo-cam-01";
      await prisma.camera.update({
        where: { id: targetCam.id },
        data: { streamKey: targetCam.streamKey },
      });
    }

    // ---- PENGUJIAN 1: Resolver URL Streaming ----
    console.log("1. Resolusi URL Streaming (WebRTC / HLS / RTSP):");
    {
      const streamKey = "lobby-cam-01";
      const urls = gatewayAdapter.resolveStreamUrls(streamKey);

      if (
        urls.whepUrl &&
        urls.whepUrl.endsWith("/lobby-cam-01/whep") &&
        urls.hlsUrl &&
        urls.hlsUrl.endsWith("/lobby-cam-01/index.m3u8") &&
        urls.rtspUrl &&
        urls.rtspUrl.includes("rtsp://")
      ) {
        pass("resolveStreamUrls() menghasilkan URL WHEP WebRTC, HLS, dan RTSP dengan format baku");
      } else {
        fail("resolveStreamUrls", "Format URL streaming tidak sesuai");
      }

      // Stream key null / tidak terkonfigurasi
      const emptyUrls = gatewayAdapter.resolveStreamUrls(null);
      if (emptyUrls.whepUrl === null && emptyUrls.hlsUrl === null) {
        pass("Kamera tanpa streamKey mengembalikan URL null secara aman");
      } else {
        fail("Empty streamKey", "Seharusnya mengembalikan null");
      }
    }

    // ---- PENGUJIAN 2: Gateway Health & Adapter Status ----
    console.log("\n2. Status Kesehatan Gateway Streaming:");
    {
      const health = await gatewayAdapter.getGatewayHealth();
      if (health.gatewayType && health.gatewayUrl) {
        pass(
          "getGatewayHealth() mengembalikan metadata gateway media",
          `Tipe: ${health.gatewayType}, URL: ${health.gatewayUrl}`,
        );
      } else {
        fail("Gateway Health", "Metadata gateway tidak lengkap");
      }
    }

    // ---- PENGUJIAN 3: Pemisahan Status & Aturan Agregasi ----
    console.log("\n3. Pemisahan Status Hardware vs Stream Gateway & Aturan Agregasi:");
    {
      if (targetCam) {
        // 3.1 Kamera Hardware ONLINE & Stream Tersedia -> AVAILABLE
        await prisma.camera.update({
          where: { id: targetCam.id },
          data: { status: "ONLINE", streamStatus: "UNKNOWN" },
        });

        const checkResult1 = await checkCameraStream(targetCam.id);
        if (checkResult1.toStreamStatus === "AVAILABLE") {
          pass(`Kamera ONLINE dengan stream aktif bertransisi ke streamStatus = AVAILABLE (${targetCam.id})`);
        } else {
          fail("Stream AVAILABLE", `Expected AVAILABLE, got ${checkResult1.toStreamStatus}`);
        }

        // 3.2 Kamera Hardware OFFLINE -> Stream otomatis UNAVAILABLE
        await prisma.camera.update({
          where: { id: targetCam.id },
          data: { status: "OFFLINE", streamStatus: "AVAILABLE" },
        });

        const checkResult2 = await checkCameraStream(targetCam.id);
        if (checkResult2.toStreamStatus === "UNAVAILABLE") {
          pass("Kamera hardware OFFLINE otomatis memaksa streamStatus = UNAVAILABLE");
        } else {
          fail("OFFLINE stream check", `Expected UNAVAILABLE, got ${checkResult2.toStreamStatus}`);
        }

        // 3.3 Aturan Agregasi: Hardware ONLINE tapi Stream Rusak -> Hardware turun ke WARNING
        await prisma.camera.update({
          where: { id: targetCam.id },
          data: {
            status: "ONLINE",
            streamStatus: "AVAILABLE",
            adapterConfig: { simulateVideoLoss: true },
          },
        });

        const checkResult3 = await checkCameraStream(targetCam.id);
        const updatedCam = await prisma.camera.findUnique({ where: { id: targetCam.id } });

        if (checkResult3.toStreamStatus === "UNAVAILABLE" && updatedCam.status === "WARNING") {
          pass("Aturan Agregasi: Stream terputus otomatis menurunkan status hardware ke WARNING");
        } else {
          fail("Aturan Agregasi", `Expected stream UNAVAILABLE & cam WARNING, got stream=${checkResult3.toStreamStatus}, cam=${updatedCam.status}`);
        }

        // 3.4 Pembuatan Event Alarm Otomatis saat stream hilang
        const streamEvent = await prisma.event.findFirst({
          where: { cameraId: targetCam.id, type: "STREAM_UNAVAILABLE" },
          orderBy: { occurredAt: "desc" },
        });
        if (streamEvent && streamEvent.status === "OPEN" && streamEvent.severity === "WARNING") {
          pass("Event alarm STREAM_UNAVAILABLE (OPEN/WARNING) otomatis dibuat", `ID: ${streamEvent.id}`);
        } else {
          fail("Event STREAM_UNAVAILABLE", "Event alarm stream terputus tidak ditemukan");
        }

        // Kembalikan konfigurasi normal
        await prisma.camera.update({
          where: { id: targetCam.id },
          data: {
            status: "ONLINE",
            streamStatus: "AVAILABLE",
            adapterConfig: {},
          },
        });
      } else {
        fail("Data kamera", "Kamera demo tidak ditemukan");
      }
    }

    // ---- PENGUJIAN 4: Negosiasi Protokol WHEP (WebRTC) ----
    console.log("\n4. Protokol WHEP (WebRTC HTTP Egress):");
    {
      const streamKey = targetCam?.streamKey || "demo-cam-01";
      const dummySdpOffer = "v=0\r\no=- 123456 2 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\nm=video 9 UDP/TLS/RTP/SAVPF 96\r\n";
      const whepRes = await fetch(`${BASE_URL}/api/streaming/whep/${streamKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/sdp" },
        body: dummySdpOffer,
      });

      const sdpAnswer = await whepRes.text();
      const contentType = whepRes.headers.get("content-type");

      if (whepRes.status === 201 && contentType?.includes("application/sdp") && sdpAnswer.includes("v=0")) {
        pass("POST /api/streaming/whep/:streamKey merespons 201 Created dengan SDP Answer WebRTC valid");
      } else {
        fail("WHEP negotiation", `Expected 201 with SDP answer, got ${whepRes.status}`);
      }
    }

    // ---- PENGUJIAN 5: REST API Endpoints Streaming ----
    console.log("\n5. REST API Endpoints Streaming:");
    {
      const targetId = targetCam?.id || "CAM-0001";

      // 5.1 List Streams
      const listRes = await fetch(`${BASE_URL}/api/streaming/cameras`);
      const listBody = await listRes.json();
      if (listRes.status === 200 && Array.isArray(listBody.data)) {
        const first = listBody.data[0];
        if (first && first.urls && first.urls.whepUrl && first.hardwareStatus) {
          pass("GET /api/streaming/cameras mengembalikan daftar kamera beserta status dan URL streaming");
        } else {
          fail("List streams", "Data kamera tidak memiliki URL atau hardwareStatus");
        }
      } else {
        fail("GET /api/streaming/cameras", `Status: ${listRes.status}`);
      }

      // 5.2 Single Stream Detail
      const singleRes = await fetch(`${BASE_URL}/api/streaming/cameras/${targetId}`);
      const singleBody = await singleRes.json();
      if (singleRes.status === 200 && singleBody.data?.urls?.hlsUrl) {
        pass(`GET /api/streaming/cameras/:id mengembalikan detail stream kamera (${targetId})`);
      } else {
        fail("GET /api/streaming/cameras/:id", `Status: ${singleRes.status}`);
      }

      // 5.3 Gateway Status
      const gwRes = await fetch(`${BASE_URL}/api/streaming/gateway/status`);
      const gwBody = await gwRes.json();
      if (gwRes.status === 200 && gwBody.data?.gatewayType) {
        pass("GET /api/streaming/gateway/status mengembalikan status konektivitas gateway media");
      } else {
        fail("GET /api/streaming/gateway/status", `Status: ${gwRes.status}`);
      }

      // 5.4 On-demand Stream Check (Protected)
      const checkRes = await fetch(`${BASE_URL}/api/streaming/cameras/${targetId}/check`, {
        method: "POST",
        headers: { Cookie: testSessionCookie },
      });
      const checkBody = await checkRes.json();
      if (checkRes.status === 200 && checkBody.data?.toStreamStatus) {
        pass("POST /api/streaming/cameras/:id/check memicu verifikasi stream on-demand");
      } else {
        fail("Stream check on-demand", `Status: ${checkRes.status}`);
      }
    }

    // ---- PENGUJIAN 6: WebSocket Real-time Broadcast ----
    console.log("\n6. Broadcast Real-time Ketersediaan Stream via WebSocket Hub:");
    {
      const targetId = targetCam?.id || "CAM-0001";
      const targetKey = targetCam?.streamKey || "demo-cam-01";

      const clientSocket = ClientIO(BASE_URL, {
        transports: ["websocket"],
        reconnection: false,
      });

      await new Promise((resolve) => clientSocket.on("connect", resolve));

      const streamBroadcastPromise = new Promise((resolve) => {
        clientSocket.on("cctv:stream_status", (event) => {
          if (event.cameraId === targetId && event.streamStatus === "AVAILABLE") {
            pass("Broadcast event cctv:stream_status diterima klien WebSocket");
            resolve();
          }
        });
      });

      wsHub.broadcastStreamStatus({
        cameraId: targetId,
        streamStatus: "AVAILABLE",
        streamKey: targetKey,
      });

      await streamBroadcastPromise;
      clientSocket.disconnect();
    }

  } catch (err) {
    fail("Eksekusi Pengujian", err.message);
  } finally {
    await wsHub.close();
    await new Promise((resolve) => server.close(resolve));
    console.log("\n[Test Server] Berhasil ditutup.");
  }

  // Ringkasan
  console.log("\n=======================================================");
  const passedCount = results.filter((r) => r.passed).length;
  const totalCount = results.length;
  console.log(` HASIL PENGUJIAN TAHAP 5: ${passedCount}/${totalCount} lolos`);
  console.log("=======================================================\n");

  if (passedCount === totalCount) {
    console.log("\x1b[32m✔ SEMUA KRITERIA CCTV STREAM GATEWAY LOLOS DENGAN SUKSES!\x1b[0m\n");
    process.exit(0);
  } else {
    console.log("\x1b[31m✖ BEBERAPA PENGUJIAN GAGAL. SILAKAN PERIKSA DETAIL DI ATAS.\x1b[0m\n");
    process.exit(1);
  }
}

runTests();
