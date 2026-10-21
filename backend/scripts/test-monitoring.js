/**
 * Script Pengujian Otomatis Tahap 4: Device Monitoring Service
 *
 * Menguji seluruh kriteria pemantauan perangkat:
 *  1. Inventaris Perangkat & Hierarki (Sites, Zones, Cameras, Audio Devices)
 *  2. Enkripsi Kredensial AES-256-GCM & Pencegahan Kebocoran di API
 *  3. Validasi Zod CRUD (.strict() menolak pengubahan manual status & ID)
 *  4. Adapter Ping (Mock Simulasi & TCP Socket Ping)
 *  5. Mesin Transisi Status (UNKNOWN -> ONLINE -> WARNING -> OFFLINE -> RECOVER)
 *  6. Append-Only Status History & Pembuatan Event Alarm Otomatis
 *  7. Broadcast Real-time Perubahan Status via WebSocket Hub
 *  8. Endpoint Telemetri & Manual On-Demand Check
 *
 * Jalankan: npm run test:monitoring
 * Exit code: 0 jika semua lolos, 1 jika ada yang gagal.
 */
import http from "http";
import { io as ClientIO } from "socket.io-client";
import { prisma } from "../src/config/database.js";
import { createApp } from "../src/app.js";
import { wsHub } from "../src/websocket/hub.js";
import { encryptCredential, decryptCredential } from "../src/utils/cipher.js";
import { pingMock, pingTcp } from "../src/modules/monitoring/monitoring.adapter.js";
import { monitoringService } from "../src/modules/monitoring/monitoring.service.js";
import { generateSessionToken, hashSessionToken } from "../src/modules/auth/auth.service.js";

const TEST_PORT = 3299;
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
  console.log(" PENGUJIAN OTOMATIS TAHAP 4: DEVICE MONITORING SERVICE");
  console.log("=======================================================\n");

  // 1. Setup Server Express & Hub
  const app = createApp();
  const server = http.createServer(app);
  wsHub.init(server);

  await new Promise((resolve) => server.listen(TEST_PORT, "127.0.0.1", resolve));
  console.log(`[Test Server] Berjalan pada port ${TEST_PORT}\n`);

  let testSessionCookie = "";
  let adminUserId = "";

  try {
    // Siapkan sesi admin untuk uji otentikasi
    const adminUser = await prisma.user.findUnique({ where: { username: "admin" } });
    if (adminUser) {
      adminUserId = adminUser.id;
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

    // ---- PENGUJIAN 1: Enkripsi Kredensial AES-256-GCM ----
    console.log("1. Enkripsi Kredensial & Proteksi Rahasia:");
    {
      const rawSecret = "KameraSecretPass!2026";
      const cipher = encryptCredential(rawSecret);
      const decrypted = decryptCredential(cipher);

      if (cipher && cipher !== rawSecret && decrypted === rawSecret) {
        pass("Enkripsi AES-256-GCM bekerja secara akurat dan reversibel");
      } else {
        fail("Enkripsi AES-256-GCM", `Gagal mendekripsi: ${decrypted}`);
      }

      // Kredensial rusak/tampered
      const tampered = cipher.substring(0, cipher.length - 4) + "AAAA";
      const tamperedResult = decryptCredential(tampered);
      if (tamperedResult === null) {
        pass("Dekripsi menolak ciphertext yang dimanipulasi (Auth Tag valid)");
      } else {
        fail("Cipher tampered check", "Cipher tampered seharusnya menghasilkan null");
      }
    }

    // ---- PENGUJIAN 2: Inventaris & Statistik Perangkat (API) ----
    console.log("\n2. Endpoint Inventaris & Statistik Perangkat:");
    {
      const statsRes = await fetch(`${BASE_URL}/api/devices/stats`);
      const statsBody = await statsRes.json();
      if (statsRes.status === 200 && statsBody.data?.cameras && statsBody.data?.audioDevices) {
        pass(
          "GET /api/devices/stats mengembalikan ringkasan status perangkat",
          `Total Kamera: ${statsBody.data.cameras.total}, Total Audio: ${statsBody.data.audioDevices.total}`,
        );
      } else {
        fail("GET /api/devices/stats", `Expected 200, got ${statsRes.status}`);
      }

      // Cek Sites & Zones
      const sitesRes = await fetch(`${BASE_URL}/api/sites`);
      const sitesBody = await sitesRes.json();
      if (sitesRes.status === 200 && Array.isArray(sitesBody.data)) {
        pass("GET /api/sites mengembalikan daftar lokasi aktif", `Jumlah: ${sitesBody.data.length}`);
      } else {
        fail("GET /api/sites", `Status tidak sesuai: ${sitesRes.status}`);
      }

      // Cek Cameras & kerahasiaan credentialCipher
      const camRes = await fetch(`${BASE_URL}/api/cameras`);
      const camBody = await camRes.json();
      if (camRes.status === 200 && Array.isArray(camBody.data)) {
        const anyHasSecret = camBody.data.some((c) => "credentialCipher" in c);
        if (!anyHasSecret) {
          pass("GET /api/cameras menyembunyikan credentialCipher dari respons API");
        } else {
          fail("Kerahasiaan kredensial", "credentialCipher bocor di endpoint API!");
        }
      } else {
        fail("GET /api/cameras", `Status tidak sesuai: ${camRes.status}`);
      }
    }

    // ---- PENGUJIAN 3: Validasi Zod Strict & Immutability Status ----
    console.log("\n3. Validasi Zod & Immutability Kolom Status via CRUD:");
    {
      // 3.1 Mencoba mengubah status manual lewat create camera
      const fakeStatusRes = await fetch(`${BASE_URL}/api/cameras`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: testSessionCookie,
        },
        body: JSON.stringify({
          name: "Kamera Uji Ilegal",
          siteId: "SIT-0001",
          status: "ONLINE", // Seharusnya ditolak karena status hanya boleh ditulis monitoring service
        }),
      });
      const fakeStatusBody = await fakeStatusRes.json();
      if (fakeStatusRes.status === 400 && fakeStatusBody.error?.code === "VALIDATION_ERROR") {
        pass("Zod menolak manipulasi kolom status secara manual via API (400)");
      } else {
        fail("Immutability status", `Expected 400, got ${fakeStatusRes.status}`);
      }

      // 3.2 Mencoba mengirim id manual
      const fakeIdRes = await fetch(`${BASE_URL}/api/cameras`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: testSessionCookie,
        },
        body: JSON.stringify({
          id: "CAM-9999",
          name: "Kamera Uji Ilegal",
          siteId: "SIT-0001",
        }),
      });
      if (fakeIdRes.status === 400) {
        pass("Zod menolak penentuan ID manual (ID otomatis dibuat database)");
      } else {
        fail("Immutability ID", `Expected 400, got ${fakeIdRes.status}`);
      }
    }

    // ---- PENGUJIAN 4: Adapter Ping (Mock & TCP) ----
    console.log("\n4. Pengujian Adapter Ping (Mock Simulation & TCP):");
    {
      // Mock normal
      const mockOk = await pingMock({ isDemo: true, adapterConfig: {} });
      if (mockOk.ok && mockOk.latencyMs >= 0) {
        pass("Adapter Mock berhasil merespons dengan latensi realistis", `${mockOk.latencyMs}ms`);
      } else {
        fail("Adapter Mock", "Mock ping gagal");
      }

      // Mock failure simulation
      const mockFail = await pingMock({
        isDemo: true,
        adapterConfig: { simulateFailure: true, simulateReason: "RTSP stream dead" },
      });
      if (!mockFail.ok && mockFail.reason.includes("RTSP stream dead")) {
        pass("Adapter Mock mendeteksi simulasi kegagalan terencana");
      } else {
        fail("Adapter Mock Failure", "Seharusnya gagal");
      }

      // TCP ke port yang tertutup (pasti ditolak cepat)
      const tcpFail = await pingTcp("127.0.0.1", 65432, 500);
      if (!tcpFail.ok) {
        pass("Adapter TCP mendeteksi port tidak aktif dengan benar");
      } else {
        fail("Adapter TCP", "Port 65432 seharusnya tertutup");
      }
    }

    // ---- PENGUJIAN 5: Mesin Transisi Status & Append-Only History ----
    console.log("\n5. Mesin Transisi Status & Append-Only Histori:");
    {
      // Ambil kamera pertama untuk uji siklus
      const targetCam = await prisma.camera.findFirst({
        where: { isDemo: true, deletedAt: null },
      });

      if (targetCam) {
        // Simpan status awal dan pastikan mulai dari UNKNOWN untuk mendeteksi perubahan transisi
        const initialStatus = targetCam.status;
        await prisma.camera.update({ where: { id: targetCam.id }, data: { status: "UNKNOWN" } });
        targetCam.status = "UNKNOWN";

        // 5.1 Uji Ping Sukses -> Transisi ke ONLINE
        const checkResult1 = await monitoringService.checkDevice({
          ...targetCam,
          type: "CAMERA",
          adapterConfig: {}, // simulasi sehat
        });
        if (checkResult1.toStatus === "ONLINE") {
          pass(`Transisi status ke ONLINE berhasil (${targetCam.id})`);
        } else {
          fail("Transisi ONLINE", `Status tidak sesuai: ${checkResult1.toStatus}`);
        }

        // Cek histori status di database
        const latestHistory = await prisma.deviceStatusHistory.findFirst({
          where: { cameraId: targetCam.id },
          orderBy: { occurredAt: "desc" },
        });
        if (latestHistory && latestHistory.toStatus === "ONLINE") {
          pass("Entri append-only berhasil dicatat ke device_status_history", `ID: ${latestHistory.id}`);
        } else {
          fail("Pencatatan device_status_history", "Entri histori tidak ditemukan");
        }

        // 5.2 Uji Kegagalan 1x -> Masuk status WARNING
        const checkResult2 = await monitoringService.checkDevice({
          ...targetCam,
          status: "ONLINE",
          consecutiveFailures: 0,
          type: "CAMERA",
          adapterConfig: { simulateFailure: true, simulateReason: "Paket hilang" },
        });
        if (checkResult2.toStatus === "WARNING") {
          pass("Kegagalan 1x berhasil memicu transisi ke status WARNING");
        } else {
          fail("Transisi WARNING", `Expected WARNING, got ${checkResult2.toStatus}`);
        }

        // 5.3 Uji Kegagalan Berlanjut (3x) -> Masuk status OFFLINE & Event Alarm
        const checkResult3 = await monitoringService.checkDevice({
          ...targetCam,
          status: "WARNING",
          consecutiveFailures: 2, // berikutnya = 3
          type: "CAMERA",
          adapterConfig: { simulateFailure: true, simulateReason: "Koneksi terputus total" },
        });
        if (checkResult3.toStatus === "OFFLINE") {
          pass("Kegagalan 3x berturut-turut memicu transisi ke status OFFLINE");
        } else {
          fail("Transisi OFFLINE", `Expected OFFLINE, got ${checkResult3.toStatus}`);
        }

        // Cek apakah Event Alarm OPEN & CRITICAL otomatis dibuat
        const createdEvent = await prisma.event.findFirst({
          where: { cameraId: targetCam.id, type: "DEVICE_STATUS_CHANGE" },
          orderBy: { occurredAt: "desc" },
        });
        if (createdEvent && createdEvent.severity === "CRITICAL" && createdEvent.status === "OPEN") {
          pass("Event alarm otomatis dibuat saat perangkat OFFLINE (OPEN & CRITICAL)");
        } else {
          fail("Pembuatan Event Alarm", "Event tidak ditemukan atau parameter tidak sesuai");
        }

        // 5.4 Uji Pemulihan (Recovery 2x success)
        monitoringService.consecutiveSuccesses.set(targetCam.id, 0);
        // Sukses ke-1: masih WARNING (verifikasi)
        const recover1 = await monitoringService.checkDevice({
          ...targetCam,
          status: "OFFLINE",
          consecutiveFailures: 3,
          type: "CAMERA",
          adapterConfig: {},
        });
        if (recover1.toStatus === "WARNING") {
          pass("Pemulihan tahap 1 (1/2 sukses) memindahkan status ke WARNING");
        } else {
          fail("Recovery tahap 1", `Expected WARNING, got ${recover1.toStatus}`);
        }

        // Sukses ke-2: kembali ONLINE
        const recover2 = await monitoringService.checkDevice({
          ...targetCam,
          status: "WARNING",
          consecutiveFailures: 0,
          type: "CAMERA",
          adapterConfig: {},
        });
        if (recover2.toStatus === "ONLINE") {
          pass("Pemulihan tahap 2 (2/2 sukses) memulihkan status ke ONLINE");
        } else {
          fail("Recovery tahap 2", `Expected ONLINE, got ${recover2.toStatus}`);
        }
      } else {
        fail("Kamera demo", "Data kamera demo tidak ditemukan");
      }
    }

    // ---- PENGUJIAN 6: WebSocket Broadcast & Telemetri Real-time ----
    console.log("\n6. Broadcast Perubahan Status via WebSocket Hub:");
    {
      const clientSocket = ClientIO(BASE_URL, {
        transports: ["websocket"],
        reconnection: false,
      });

      await new Promise((resolve) => clientSocket.on("connect", resolve));

      const broadcastPromise = new Promise((resolve) => {
        clientSocket.on("device:status_changed", (event) => {
          if (event.deviceId === "AUD-0001" && event.status === "ONLINE") {
            pass("Broadcast event device:status_changed diterima klien WebSocket");
            resolve();
          }
        });
      });

      wsHub.broadcastDeviceStatus({
        deviceId: "AUD-0001",
        deviceType: "AUDIO",
        status: "ONLINE",
        previousStatus: "UNKNOWN",
      });

      await broadcastPromise;
      clientSocket.disconnect();
    }

    // ---- PENGUJIAN 7: Manual On-Demand Check Endpoint ----
    console.log("\n7. Endpoint Pemeriksaan Manual On-Demand:");
    {
      const manualRes = await fetch(`${BASE_URL}/api/monitoring/check-all`, {
        method: "POST",
        headers: {
          Cookie: testSessionCookie,
        },
      });
      const manualBody = await manualRes.json();
      if (manualRes.status === 200 && manualBody.success) {
        pass("POST /api/monitoring/check-all memicu siklus pemeriksaan manual (200 OK)");
      } else {
        fail("Manual check-all", `Status: ${manualRes.status}`);
      }

      // Worker Status
      const workerRes = await fetch(`${BASE_URL}/api/monitoring/status`);
      const workerBody = await workerRes.json();
      if (workerRes.status === 200 && workerBody.data?.settings) {
        pass("GET /api/monitoring/status mengembalikan status & interval worker");
      } else {
        fail("Worker status", `Status: ${workerRes.status}`);
      }
    }

  } catch (err) {
    fail("Eksekusi Pengujian", err.message);
  } finally {
    monitoringService.stop();
    await wsHub.close();
    await new Promise((resolve) => server.close(resolve));
    console.log("\n[Test Server] Berhasil ditutup.");
  }

  // Ringkasan
  console.log("\n=======================================================");
  const passedCount = results.filter((r) => r.passed).length;
  const totalCount = results.length;
  console.log(` HASIL PENGUJIAN TAHAP 4: ${passedCount}/${totalCount} lolos`);
  console.log("=======================================================\n");

  if (passedCount === totalCount) {
    console.log("\x1b[32m✔ SEMUA KRITERIA DEVICE MONITORING SERVICE LOLOS DENGAN SUKSES!\x1b[0m\n");
    process.exit(0);
  } else {
    console.log("\x1b[31m✖ BEBERAPA PENGUJIAN GAGAL. SILAKAN PERIKSA DETAIL DI ATAS.\x1b[0m\n");
    process.exit(1);
  }
}

runTests();
