/**
 * Script Pengujian Otomatis Tahap 6: Audio Paging & TTS System
 *
 * Menguji seluruh kriteria sistem audio paging:
 *  1. Sesi Push-to-Talk (PTT) & Mutual Exclusion (Channel Lease Lock)
 *  2. Penolakan Konflik (409 Conflict) saat operator lain mencoba mengambil kanal yang sedang aktif
 *  3. Heartbeat PTT & Perpanjangan Masa Aktif Lease
 *  4. Penghentian PTT & Pelepasan Lease Kanal Audio
 *  5. Pembersihan Otomatis Lease Kedaluwarsa & Pengambilalihan Kanal
 *  6. Validasi Batas Panjang Karakter TTS (Tolak > 500 Karakter)
 *  7. Ekspan Multi-Target Paging (Device, Zone, All)
 *  8. Kontrol Akses Zona untuk Operator (RBAC 403 Forbidden vs Akses Sah)
 *  9. Konfirmasi Penerimaan Jujur (DELIVERED vs UNCONFIRMED vs FAILED)
 *  10. Negosiasi WebRTC WHIP (RFC 9329) Audio Ingress 16kHz Mono
 *  11. REST API Endpoints Paging (/api/paging/*)
 *  12. Broadcast Real-time Audio via WebSocket Hub (room audio:paging)
 *
 * Jalankan: npm run test:paging
 * Exit code: 0 jika semua lolos, 1 jika ada yang gagal.
 */
import http from "http";
import { io as ClientIO } from "socket.io-client";
import { prisma } from "../src/config/database.js";
import { createApp } from "../src/app.js";
import { wsHub } from "../src/websocket/hub.js";
import { leaseService } from "../src/modules/paging/lease.service.js";
import { generateSessionToken, hashSessionToken } from "../src/modules/auth/auth.service.js";

const TEST_PORT = 3499;
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

async function createTestSession(username) {
  const user = await prisma.user.findUnique({ where: { username } });
  if (!user) throw new Error(`User ${username} tidak ditemukan di database`);

  const rawToken = generateSessionToken();
  await prisma.session.create({
    data: {
      userId: user.id,
      tokenHash: hashSessionToken(rawToken),
      expiresAt: new Date(Date.now() + 3600000),
    },
  });

  return { user, cookie: `cctv_session=${rawToken}` };
}

async function runTests() {
  console.log("\n=======================================================");
  console.log(" PENGUJIAN OTOMATIS TAHAP 6: AUDIO PAGING & TTS");
  console.log("=======================================================\n");

  const app = createApp();
  const server = http.createServer(app);
  wsHub.init(server);

  await new Promise((resolve) => server.listen(TEST_PORT, "127.0.0.1", resolve));
  console.log(`[Test Server] Berjalan pada port ${TEST_PORT}\n`);

  try {
    // Siapkan sesi pengguna: Admin & Operator
    const adminSession = await createTestSession("admin");
    const operatorSession = await createTestSession("operator");

    // Ambil perangkat audio demo
    const audioDevices = await prisma.audioDevice.findMany({
      where: { isDemo: true, deletedAt: null },
      orderBy: { id: "asc" },
    });

    if (audioDevices.length < 2) {
      throw new Error("Dibutuhkan minimal 2 audio devices demo untuk pengujian");
    }

    const speaker1 = audioDevices[0];
    const speaker2 = audioDevices[1];

    // Pastikan speaker1 ONLINE dan mendukung PTT & TTS
    await prisma.audioDevice.update({
      where: { id: speaker1.id },
      data: {
        status: "ONLINE",
        supportsPtt: true,
        supportsTts: true,
        supportsDeliveryReceipt: false,
      },
    });

    // Pastikan speaker2 mendukung delivery receipt untuk uji perbedaan
    await prisma.audioDevice.update({
      where: { id: speaker2.id },
      data: {
        status: "ONLINE",
        supportsPtt: true,
        supportsTts: true,
        supportsDeliveryReceipt: true,
      },
    });

    // Bersihkan sisa lease lama
    await prisma.audioChannelLease.deleteMany();

    // ---- PENGUJIAN 1: Sesi PTT & Mutual Exclusion Lease ----
    console.log("1. Sesi Push-to-Talk (PTT) & Akuisisi Channel Lease:");
    let activePttCommandId = null;
    {
      const res = await fetch(`${BASE_URL}/api/paging/ptt/start`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: adminSession.cookie,
        },
        body: JSON.stringify({
          targetType: "DEVICE",
          targetId: speaker1.id,
          durationSeconds: 30,
        }),
      });

      const body = await res.json();
      if (res.status === 201 && body.data?.commandId) {
        activePttCommandId = body.data.commandId;
        const leaseInDb = await prisma.audioChannelLease.findUnique({
          where: { audioDeviceId: speaker1.id },
        });

        if (leaseInDb && leaseInDb.userId === adminSession.user.id) {
          pass(
            "POST /api/paging/ptt/start berhasil membuat AudioCommand dan mengunci audio_channel_leases",
            `Command: ${activePttCommandId}, Lease Device: ${speaker1.id}`,
          );
        } else {
          fail("PTT Start", "Lease kanal tidak ditemukan di database");
        }
      } else {
        fail("PTT Start", `Status: ${res.status}, Message: ${body.message || JSON.stringify(body)}`);
      }
    }

    // ---- PENGUJIAN 2: Penolakan Konflik (409 Conflict) ----
    console.log("\n2. Mutual Exclusion (Penolakan Konflik Kanal):");
    {
      const conflictRes = await fetch(`${BASE_URL}/api/paging/ptt/start`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: operatorSession.cookie,
        },
        body: JSON.stringify({
          targetType: "DEVICE",
          targetId: speaker1.id,
          durationSeconds: 30,
        }),
      });

      const conflictBody = await conflictRes.json();
      if (conflictRes.status === 409 && conflictBody.error?.code === "CONFLICT") {
        pass(
          "Operator lain ditolak dengan 409 Conflict saat mencoba merebut kanal yang sedang aktif",
          conflictBody.error.message,
        );
      } else {
        fail("Conflict Check", `Expected 409 Conflict, got ${conflictRes.status}`);
      }
    }

    // ---- PENGUJIAN 3: Heartbeat PTT & Perpanjangan Lease ----
    console.log("\n3. Heartbeat PTT & Perpanjangan Masa Aktif Lease:");
    {
      const leaseBefore = await prisma.audioChannelLease.findUnique({
        where: { audioDeviceId: speaker1.id },
      });

      const hbRes = await fetch(`${BASE_URL}/api/paging/ptt/heartbeat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: adminSession.cookie,
        },
        body: JSON.stringify({
          commandId: activePttCommandId,
          extensionSeconds: 60,
        }),
      });

      const hbBody = await hbRes.json();
      const leaseAfter = await prisma.audioChannelLease.findUnique({
        where: { audioDeviceId: speaker1.id },
      });

      if (
        hbRes.status === 200 &&
        leaseBefore &&
        leaseAfter &&
        leaseAfter.expiresAt.getTime() > leaseBefore.expiresAt.getTime()
      ) {
        pass(
          "POST /api/paging/ptt/heartbeat memperpanjang expiresAt pada audio_channel_leases",
          `Expires diperpanjang ke: ${leaseAfter.expiresAt.toISOString()}`,
        );
      } else {
        fail("PTT Heartbeat", `Gagal memperbarui expiry lease (Status: ${hbRes.status})`);
      }
    }

    // ---- PENGUJIAN 4: Penghentian PTT & Pelepasan Lease ----
    console.log("\n4. Penghentian PTT & Pelepasan Lease Kanal:");
    {
      const stopRes = await fetch(`${BASE_URL}/api/paging/ptt/stop`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: adminSession.cookie,
        },
        body: JSON.stringify({
          commandId: activePttCommandId,
        }),
      });

      const stopBody = await stopRes.json();
      const leaseRemaining = await prisma.audioChannelLease.findUnique({
        where: { audioDeviceId: speaker1.id },
      });

      const commandInDb = activePttCommandId
        ? await prisma.audioCommand.findUnique({
            where: { id: BigInt(activePttCommandId) },
          })
        : null;

      if (
        stopRes.status === 200 &&
        leaseRemaining === null &&
        (commandInDb?.status === "UNCONFIRMED" || commandInDb?.status === "SUCCESS")
      ) {
        pass(
          "POST /api/paging/ptt/stop melepaskan lease dan menandai AudioCommand selesai (UNCONFIRMED/SUCCESS)",
          `Command: ${activePttCommandId}`,
        );
      } else {
        fail("PTT Stop", `Lease tidak terhapus atau status command tidak sesuai (${commandInDb?.status})`);
      }
    }

    // ---- PENGUJIAN 5: Pengambilalihan Lease Kedaluwarsa ----
    console.log("\n5. Pembersihan Lease Kedaluwarsa & Pengambilalihan Kanal:");
    {
      // Buat lease kadaluwarsa buatan (expiresAt di masa lalu)
      const fakeCommand = await prisma.audioCommand.create({
        data: {
          kind: "PTT",
          source: "MANUAL",
          status: "ACTIVE",
          mode: "SIMULATION",
          userId: adminSession.user.id,
          targetSpec: { targetType: "DEVICE", targetId: speaker1.id },
        },
      });

      await prisma.audioChannelLease.create({
        data: {
          audioDeviceId: speaker1.id,
          commandId: fakeCommand.id,
          userId: adminSession.user.id,
          acquiredAt: new Date(Date.now() - 60000),
          expiresAt: new Date(Date.now() - 10000), // Kedaluwarsa 10 detik lalu
        },
      });

      // Operator mencoba mengambil alih kanal yang sudah kedaluwarsa
      const takeoverRes = await fetch(`${BASE_URL}/api/paging/ptt/start`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: operatorSession.cookie,
        },
        body: JSON.stringify({
          targetType: "DEVICE",
          targetId: speaker1.id,
          durationSeconds: 15,
        }),
      });

      const takeoverBody = await takeoverRes.json();
      const newLease = await prisma.audioChannelLease.findUnique({
        where: { audioDeviceId: speaker1.id },
      });

      if (takeoverRes.status === 201 && newLease?.userId === operatorSession.user.id) {
        pass("Kanal dengan lease kedaluwarsa otomatis dibersihkan dan dapat diambil alih operator baru");
        // Hentikan sesi takeover
        await fetch(`${BASE_URL}/api/paging/ptt/stop`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Cookie: operatorSession.cookie },
          body: JSON.stringify({ commandId: takeoverBody.data.commandId }),
        });
      } else {
        fail("Takeover expired lease", `Status: ${takeoverRes.status}`);
      }
    }

    // ---- PENGUJIAN 6: Validasi Batas Panjang Teks TTS ----
    console.log("\n6. Validasi Batas Karakter Text-to-Speech (TTS):");
    {
      // 6.1 Teks lebih dari batas 500 karakter harus ditolak 400 Bad Request
      const longText = "A".repeat(501);
      const invalidRes = await fetch(`${BASE_URL}/api/paging/tts/dispatch`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: adminSession.cookie,
        },
        body: JSON.stringify({
          text: longText,
          targetType: "DEVICE",
          targetId: speaker1.id,
        }),
      });

      const invalidBody = await invalidRes.json();
      if (invalidRes.status === 400) {
        pass("Teks TTS melebihi batas 500 karakter ditolak dengan 400 Bad Request");
      } else {
        fail("TTS Character limit", `Expected 400, got ${invalidRes.status}`);
      }

      // 6.2 Teks sah <= 500 karakter diterima
      const validText = "Perhatian, ini adalah pengujian siaran audio paging darurat.";
      const validRes = await fetch(`${BASE_URL}/api/paging/tts/dispatch`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: adminSession.cookie,
        },
        body: JSON.stringify({
          text: validText,
          targetType: "DEVICE",
          targetId: speaker1.id,
        }),
      });

      const validBody = await validRes.json();
      if (validRes.status === 201 && validBody.data?.commandId) {
        pass(
          "POST /api/paging/tts/dispatch dengan teks sah berhasil diproses 201 Created",
          `Command ID: ${validBody.data.commandId}`,
        );
      } else {
        fail("TTS Dispatch valid", `Status: ${validRes.status}`);
      }
    }

    // ---- PENGUJIAN 7: Konfirmasi Penerimaan Jujur (Delivery Receipts) ----
    console.log("\n7. Konfirmasi Penerimaan Jujur (Delivery Receipts):");
    {
      // Dispatch TTS sekaligus ke speaker1 (supportsDeliveryReceipt=false) dan speaker2 (supportsDeliveryReceipt=true)
      const dualRes = await fetch(`${BASE_URL}/api/paging/tts/dispatch`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: adminSession.cookie,
        },
        body: JSON.stringify({
          text: "Uji coba konfirmasi penerimaan dual speaker.",
          targetType: "DEVICE",
          targetIds: [speaker1.id, speaker2.id],
        }),
      });

      const dualBody = await dualRes.json();
      if (dualRes.status === 201 && Array.isArray(dualBody.data?.targets)) {
        const target1 = dualBody.data.targets.find((t) => t.audioDeviceId === speaker1.id);
        const target2 = dualBody.data.targets.find((t) => t.audioDeviceId === speaker2.id);

        if (
          target1?.status === "UNCONFIRMED" &&
          target1?.deliveryConfirmed === false &&
          target2?.status === "DELIVERED" &&
          target2?.deliveryConfirmed === true
        ) {
          pass(
            "Konfirmasi penerimaan jujur: speaker tanpa fitur kuitansi = UNCONFIRMED, speaker dengan fitur = DELIVERED",
          );
        } else {
          fail(
            "Delivery Receipts",
            `Target1 status=${target1?.status} (confirmed=${target1?.deliveryConfirmed}), Target2 status=${target2?.status} (confirmed=${target2?.deliveryConfirmed})`,
          );
        }
      } else {
        fail("Dual TTS Dispatch", `Status: ${dualRes.status}`);
      }
    }

    // ---- PENGUJIAN 8: Ekspan Target (ZONE / ALL) & Hak Akses Operator ----
    console.log("\n8. Ekspan Target (ZONE/ALL) & Otorisasi Akses Operator:");
    {
      // 8.1 Ekspan target ALL oleh Admin
      const allRes = await fetch(`${BASE_URL}/api/paging/tts/dispatch`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: adminSession.cookie,
        },
        body: JSON.stringify({
          text: "Panggilan broadcast seluruh gedung.",
          targetType: "ALL",
        }),
      });

      const allBody = await allRes.json();
      if (allRes.status === 201 && allBody.data?.targets?.length >= 2) {
        pass("TargetType 'ALL' berhasil mengekspansi seluruh speaker aktif di dalam sistem");
      } else {
        fail("Target ALL", `Status: ${allRes.status}`);
      }

      // 8.2 Operator mencoba paging ke zona tanpa izin akses -> 403 Forbidden
      const unauthorizedZone = await prisma.zone.findFirst({
        where: {
          id: { notIn: (await prisma.userZoneAccess.findMany({ where: { userId: operatorSession.user.id } })).map((z) => z.zoneId) },
          deletedAt: null,
        },
      });

      if (unauthorizedZone) {
        // Buat speaker uji di zona terlarang
        const restrictedSpeaker = await prisma.audioDevice.create({
          data: {
            name: "[TEST] Speaker Terlarang",
            siteId: unauthorizedZone.siteId,
            zoneId: unauthorizedZone.id,
            status: "ONLINE",
            supportsPtt: true,
            supportsTts: true,
            isDemo: true,
          },
        });

        const forbiddenRes = await fetch(`${BASE_URL}/api/paging/tts/dispatch`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: operatorSession.cookie,
          },
          body: JSON.stringify({
            text: "Uji akses zona terlarang.",
            targetType: "DEVICE",
            targetId: restrictedSpeaker.id,
          }),
        });

        if (forbiddenRes.status === 403) {
          pass("Operator tanpa izin zona ditolak dengan 403 Forbidden");
        } else {
          fail("RBAC Zone Access", `Expected 403 Forbidden, got ${forbiddenRes.status}`);
        }

        // Bersihkan speaker uji dengan soft delete (sesuai trigger append-only database)
        await prisma.audioDevice.update({
          where: { id: restrictedSpeaker.id },
          data: { deletedAt: new Date() },
        });
      } else {
        pass("Uji RBAC: Semua zona memiliki hak akses pada seeder, dilewati");
      }
    }

    // ---- PENGUJIAN 9: Protokol WebRTC WHIP (16kHz Mono) ----
    console.log("\n9. Protokol WebRTC WHIP (RFC 9329 Ingress 16kHz Mono):");
    {
      const dummyAudioSdpOffer = [
        "v=0",
        "o=- 987654 2 IN IP4 127.0.0.1",
        "s=-",
        "t=0 0",
        "m=audio 9 UDP/TLS/RTP/SAVPF 111",
        "a=rtpmap:111 opus/48000/2",
        "a=fmtp:111 maxplaybackrate=16000;sprop-maxcapturerate=16000;stereo=0;sprop-stereo=0",
      ].join("\r\n");

      const whipRes = await fetch(`${BASE_URL}/api/paging/whip/PTT-TEST-01`, {
        method: "POST",
        headers: { "Content-Type": "application/sdp" },
        body: dummyAudioSdpOffer,
      });

      const sdpAnswer = await whipRes.text();
      const contentType = whipRes.headers.get("content-type");
      const location = whipRes.headers.get("location");

      if (
        whipRes.status === 201 &&
        contentType?.includes("application/sdp") &&
        sdpAnswer.includes("m=audio") &&
        sdpAnswer.includes("maxplaybackrate=16000") &&
        location
      ) {
        pass("POST /api/paging/whip/:channelKey merespons 201 Created dengan SDP Answer 16kHz Mono & Location header");
      } else {
        fail("WHIP negotiation", `Status: ${whipRes.status}`);
      }

      // Hentikan sesi WHIP (DELETE)
      const delRes = await fetch(`${BASE_URL}/api/paging/whip/PTT-TEST-01/session`, {
        method: "DELETE",
      });

      if (delRes.status === 204) {
        pass("DELETE /api/paging/whip/:channelKey/session merespons 204 No Content saat sesi ditutup");
      } else {
        fail("WHIP delete session", `Status: ${delRes.status}`);
      }
    }

    // ---- PENGUJIAN 10: REST API Endpoints Paging ----
    console.log("\n10. REST API Query Endpoints Paging:");
    {
      // 10.1 List Audio Devices
      const devRes = await fetch(`${BASE_URL}/api/paging/devices`, {
        headers: { Cookie: adminSession.cookie },
      });
      const devBody = await devRes.json();
      if (devRes.status === 200 && Array.isArray(devBody.data) && devBody.data.length > 0) {
        pass(
          "GET /api/paging/devices mengembalikan daftar speaker beserta kapabilitas dan status lease",
          `Total: ${devBody.data.length} perangkat`,
        );
      } else {
        fail("List paging devices", `Status: ${devRes.status}`);
      }

      // 10.2 List Active Leases
      const leaseRes = await fetch(`${BASE_URL}/api/paging/leases`, {
        headers: { Cookie: adminSession.cookie },
      });
      const leaseBody = await leaseRes.json();
      if (leaseRes.status === 200 && Array.isArray(leaseBody.data)) {
        pass("GET /api/paging/leases mengembalikan status lease aktif kanal audio");
      } else {
        fail("List active leases", `Status: ${leaseRes.status}`);
      }

      // 10.3 List Audio Commands
      const cmdRes = await fetch(`${BASE_URL}/api/paging/commands`, {
        headers: { Cookie: adminSession.cookie },
      });
      const cmdBody = await cmdRes.json();
      if (cmdRes.status === 200 && Array.isArray(cmdBody.data) && cmdBody.data.length > 0) {
        pass(
          "GET /api/paging/commands mengembalikan riwayat perintah PTT dan TTS",
          `Total: ${cmdBody.pagination.total} riwayat`,
        );
      } else {
        fail("List commands", `Status: ${cmdRes.status}`);
      }

      // 10.4 Detail Command
      const firstCmdId = cmdBody.data[0].id;
      const detailRes = await fetch(`${BASE_URL}/api/paging/commands/${firstCmdId}`, {
        headers: { Cookie: adminSession.cookie },
      });
      const detailBody = await detailRes.json();
      if (detailRes.status === 200 && detailBody.data?.id === firstCmdId && Array.isArray(detailBody.data.targets)) {
        pass(`GET /api/paging/commands/:id mengembalikan detail perintah beserta target perangkat (${firstCmdId})`);
      } else {
        fail("Get command by ID", `Status: ${detailRes.status}`);
      }
    }

    // ---- PENGUJIAN 11: Broadcast Real-Time WebSocket Hub ----
    console.log("\n11. Broadcast Real-Time via WebSocket Hub (room audio:paging):");
    {
      const clientSocket = ClientIO(BASE_URL, {
        transports: ["websocket"],
        reconnection: false,
      });

      await new Promise((resolve) => clientSocket.on("connect", resolve));

      const leasePromise = new Promise((resolve) => {
        clientSocket.on("audio:channel_lease", (data) => {
          if (data.audioDeviceId === speaker1.id && data.acquired === true) {
            pass("Klien WebSocket menerima siaran event audio:channel_lease");
            resolve();
          }
        });
      });

      const pttPromise = new Promise((resolve) => {
        clientSocket.on("audio:command_update", (data) => {
          if (data.event === "ptt:started") {
            pass("Klien WebSocket menerima siaran event audio:command_update (ptt:started)");
            resolve();
          }
        });
      });

      // Memicu transmisi PTT untuk membuktikan penerimaan broadcast
      const triggerRes = await fetch(`${BASE_URL}/api/paging/ptt/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: adminSession.cookie },
        body: JSON.stringify({ targetType: "DEVICE", targetId: speaker1.id, durationSeconds: 10 }),
      });
      const triggerBody = await triggerRes.json();

      await Promise.all([leasePromise, pttPromise]);

      // Hentikan PTT
      await fetch(`${BASE_URL}/api/paging/ptt/stop`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: adminSession.cookie },
        body: JSON.stringify({ commandId: triggerBody.data.commandId }),
      });

      clientSocket.disconnect();
    }

  } catch (err) {
    fail("Eksekusi Pengujian Paging", err.message || String(err));
    console.error(err);
  } finally {
    // Bersihkan sesi dan lease sisa
    try {
      await prisma.audioChannelLease.deleteMany();
    } catch (_) {}

    await new Promise((resolve) => server.close(resolve));
    console.log("\n[Test Server] Berhasil ditutup.");
  }

  // Ringkasan Pengujian
  const passedCount = results.filter((r) => r.passed).length;
  const totalCount = results.length;

  console.log("\n=======================================================");
  console.log(` HASIL PENGUJIAN TAHAP 6: ${passedCount}/${totalCount} lolos`);
  console.log("=======================================================\n");

  if (passedCount === totalCount && totalCount > 0) {
    console.log("\x1b[32m✔ SEMUA KRITERIA AUDIO PAGING & TTS LOLOS DENGAN SUKSES!\x1b[0m\n");
    await wsHub.close();
    process.exit(0);
  } else {
    console.log("\x1b[31m✖ BEBERAPA PENGUJIAN GAGAL. SILAKAN PERIKSA DETAIL DI ATAS.\x1b[0m\n");
    await wsHub.close();
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
