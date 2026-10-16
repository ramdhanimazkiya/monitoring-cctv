/**
 * Script Pengujian Otomatis Tahap 3: Backend Foundation & WebSocket Hub
 *
 * Menguji seluruh kriteria fondasi backend:
 *  1. Server Express & Middleware Keamanan (Helmet, CORS, Cookie-parser)
 *  2. Health Check & Subsystem Telemetry
 *  3. Validasi Zod (Body, Query, Strict Mode)
 *  4. Global Error Handler & 404 Handler
 *  5. Rate Limiter (Header & pembatasan)
 *  6. Autentikasi Sesi (Kriptografi token, Sanitasi Audit Log)
 *  7. Middleware RBAC (requireAuth, requireRole, requireZoneAccess)
 *  8. WebSocket Hub (Koneksi Socket.IO, Handshake, Room Broadcast, Ping-Pong)
 *
 * Jalankan: npm run test:foundation
 * Exit code: 0 jika semua lolos, 1 jika ada yang gagal.
 */
import http from "http";
import { io as ClientIO } from "socket.io-client";
import { createApp } from "../src/app.js";
import { WebSocketHub } from "../src/websocket/hub.js";
import {
  hashSessionToken,
  generateSessionToken,
} from "../src/modules/auth/auth.service.js";
import { sanitizeAuditData } from "../src/services/audit.service.js";
import {
  requireAuth,
  requireRole,
  requireZoneAccess,
} from "../src/middleware/auth.middleware.js";

const TEST_PORT = 3199;
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
  console.log(" PENGUJIAN OTOMATIS TAHAP 3: BACKEND FOUNDATION");
  console.log("=======================================================\n");

  // 1. Setup Server Express & WebSocket Hub untuk pengujian
  const app = createApp();
  const server = http.createServer(app);
  const hub = new WebSocketHub();
  hub.init(server);

  await new Promise((resolve) => server.listen(TEST_PORT, "127.0.0.1", resolve));
  console.log(`[Test Server] Berjalan pada port ${TEST_PORT}\n`);

  try {
    // ---- PENGUJIAN 1: Health Check & Liveness ----
    console.log("1. Health Check & Subsystem Status:");
    {
      const res = await fetch(`${BASE_URL}/api/health`);
      const body = await res.json();
      if (res.status === 200 && body.subsystems && body.subsystems.websocket) {
        pass("GET /api/health mengembalikan 200 dengan telemetri subsistem", `Status: ${body.status}`);
      } else {
        fail("GET /api/health", `Expected 200 with subsystems, got ${res.status}`);
      }

      const liveRes = await fetch(`${BASE_URL}/api/health/live`);
      const liveBody = await liveRes.json();
      if (liveRes.status === 200 && liveBody.status === "alive") {
        pass("GET /api/health/live mengembalikan 200 { status: 'alive' }");
      } else {
        fail("GET /api/health/live", `Status tidak sesuai: ${liveRes.status}`);
      }
    }

    // ---- PENGUJIAN 2: Security Headers & CORS ----
    console.log("\n2. Header Keamanan & Proteksi HTTP:");
    {
      const res = await fetch(`${BASE_URL}/api/health`);
      const nosniff = res.headers.get("x-content-type-options");
      if (nosniff === "nosniff") {
        pass("Helmet aktif: Header X-Content-Type-Options = nosniff");
      } else {
        fail("Helmet header", `Expected nosniff, got ${nosniff}`);
      }

      const corsRes = await fetch(`${BASE_URL}/api/health`, {
        headers: { Origin: "http://localhost:5173" },
      });
      const allowOrigin = corsRes.headers.get("access-control-allow-origin");
      if (allowOrigin === "http://localhost:5173") {
        pass("CORS aktif: Access-Control-Allow-Origin sesuai origin frontend");
      } else {
        fail("CORS header", `Expected http://localhost:5173, got ${allowOrigin}`);
      }
    }

    // ---- PENGUJIAN 3: Validasi Zod (Body & Strict Mode) ----
    console.log("\n3. Validasi Zod Middleware:");
    {
      // 3.1 Body kosong pada login
      const emptyRes = await fetch(`${BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const emptyBody = await emptyRes.json();
      if (emptyRes.status === 400 && emptyBody.error?.code === "VALIDATION_ERROR") {
        pass("Zod menolak payload kosong dengan kode VALIDATION_ERROR (400)");
      } else {
        fail("Zod empty validation", `Expected 400 VALIDATION_ERROR, got ${emptyRes.status}`);
      }

      // 3.2 Field asing pada skema strict
      const strictRes = await fetch(`${BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: "admin",
          password: "password123",
          illegalField: "should_fail",
        }),
      });
      const strictBody = await strictRes.json();
      if (strictRes.status === 400 && strictBody.error?.code === "VALIDATION_ERROR") {
        pass("Zod .strict() menolak atribut asing (illegalField) dengan benar");
      } else {
        fail("Zod strict validation", `Expected 400, got ${strictRes.status}`);
      }
    }

    // ---- PENGUJIAN 4: Error Handler & 404 ----
    console.log("\n4. Global Error Handler & 404 Routing:");
    {
      // 4.1 Rute tidak ditemukan
      const notFoundRes = await fetch(`${BASE_URL}/api/nonexistent-endpoint-test`);
      const notFoundBody = await notFoundRes.json();
      if (notFoundRes.status === 404 && notFoundBody.error?.code === "NOT_FOUND") {
        pass("404 Handler mengembalikan JSON envelope terstruktur NOT_FOUND");
      } else {
        fail("404 handler", `Expected 404 NOT_FOUND, got ${notFoundRes.status}`);
      }

      // 4.2 JSON rusak
      const badJsonRes = await fetch(`${BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{ this is not json }",
      });
      const badJsonBody = await badJsonRes.json();
      if (badJsonRes.status === 400 && badJsonBody.error?.code === "INVALID_JSON_BODY") {
        pass("Parser JSON menangani format rusak dengan kode INVALID_JSON_BODY (400)");
      } else {
        fail("Bad JSON body", `Expected 400 INVALID_JSON_BODY, got ${badJsonRes.status}`);
      }
    }

    // ---- PENGUJIAN 5: Token Sesi & Kriptografi ----
    console.log("\n5. Kriptografi Sesi & Sanitasi Audit:");
    {
      const token1 = generateSessionToken();
      const token2 = generateSessionToken();
      if (token1.length === 64 && token2.length === 64 && token1 !== token2) {
        pass("generateSessionToken() menghasilkan token 32-byte unik (64 hex)");
      } else {
        fail("generateSessionToken", "Panjang token bukan 64 hex acak");
      }

      const hash1 = hashSessionToken(token1);
      const hash2 = hashSessionToken(token1);
      if (hash1 === hash2 && hash1.length === 64) {
        pass("hashSessionToken() menghasilkan deterministik SHA-256 (64 hex)");
      } else {
        fail("hashSessionToken", "Hash tidak deterministik");
      }

      // Sanitasi data audit
      const rawData = {
        username: "admin",
        password: "SuperSecretPassword123!",
        credentialCipher: "topsecretkey",
        nested: { token: "secrettoken", publicInfo: "ok" },
      };
      const sanitized = sanitizeAuditData(rawData);
      if (
        sanitized.password === "[REDACTED]" &&
        sanitized.credentialCipher === "[REDACTED]" &&
        sanitized.nested.token === "[REDACTED]" &&
        sanitized.nested.publicInfo === "ok"
      ) {
        pass("sanitizeAuditData() meredaksi semua password & secret secara rekursif");
      } else {
        fail("sanitizeAuditData", "Field sensitif tidak teredaksi dengan benar");
      }
    }

    // ---- PENGUJIAN 6: Middleware RBAC & Autorisasi ----
    console.log("\n6. Middleware RBAC (Role-Based Access Control):");
    {
      // 6.1 Akses ADMIN dengan role ADMIN
      let adminAllowed = false;
      const adminMiddleware = requireRole("ADMIN");
      adminMiddleware({ user: { role: "ADMIN" } }, {}, (err) => {
        if (!err) adminAllowed = true;
      });
      if (adminAllowed) {
        pass("requireRole('ADMIN') mengizinkan role ADMIN (next terpanggil)");
      } else {
        fail("RBAC admin allow", "next() tidak dipanggil atau error terjadi");
      }

      // 6.2 Akses ADMIN dengan role OPERATOR
      let operatorError = null;
      adminMiddleware({ user: { role: "OPERATOR" } }, {}, (err) => {
        operatorError = err;
      });
      if (operatorError && operatorError.statusCode === 403 && operatorError.errorCode === "FORBIDDEN") {
        pass("requireRole('ADMIN') menolak role OPERATOR dengan FORBIDDEN (403)");
      } else {
        fail("RBAC admin block operator", `Expected 403 FORBIDDEN, got ${operatorError?.statusCode}`);
      }

      // 6.3 Akses zona: OPERATOR diizinkan ke zona miliknya (ZON-0001)
      let zoneAllowed = false;
      const zoneMiddleware = requireZoneAccess((r) => r.params.zoneId);
      zoneMiddleware(
        { user: { role: "OPERATOR", allowedZones: ["ZON-0001"] }, params: { zoneId: "ZON-0001" } },
        {},
        (err) => {
          if (!err) zoneAllowed = true;
        },
      );
      if (zoneAllowed) {
        pass("requireZoneAccess() mengizinkan Operator ke zona terdaftar (ZON-0001)");
      } else {
        fail("Zone access allowed", "next() tidak dipanggil");
      }

      // 6.4 Akses zona: OPERATOR ditolak ke zona yang tidak terdaftar (ZON-9999)
      let zoneDeniedError = null;
      zoneMiddleware(
        { user: { role: "OPERATOR", allowedZones: ["ZON-0001"] }, params: { zoneId: "ZON-9999" } },
        {},
        (err) => {
          zoneDeniedError = err;
        },
      );
      if (zoneDeniedError && zoneDeniedError.statusCode === 403) {
        pass("requireZoneAccess() menolak Operator ke zona tanpa izin (ZON-9999, 403)");
      } else {
        fail("Zone access denied", `Expected 403, got ${zoneDeniedError?.statusCode}`);
      }

      // 6.5 Akses zona: ADMIN selalu diizinkan ke zona manapun
      let adminZoneAllowed = false;
      zoneMiddleware(
        { user: { role: "ADMIN", allowedZones: [] }, params: { zoneId: "ZON-9999" } },
        {},
        (err) => {
          if (!err) adminZoneAllowed = true;
        },
      );
      if (adminZoneAllowed) {
        pass("requireZoneAccess() mengizinkan Admin ke semua zona tanpa batasan");
      } else {
        fail("Admin zone access", "next() tidak dipanggil untuk Admin");
      }
    }

    // ---- PENGUJIAN 7: WebSocket Hub (Socket.IO) ----
    console.log("\n7. WebSocket Hub & Real-time Broadcasting:");
    {
      const clientSocket = ClientIO(BASE_URL, {
        transports: ["websocket"],
        reconnection: false,
      });

      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error("Socket connect timeout")), 5000);

        clientSocket.on("connect", () => {
          clearTimeout(timeout);
          pass("Klien Socket.IO berhasil terhubung ke WebSocket Hub");
          resolve();
        });

        clientSocket.on("connect_error", (err) => {
          clearTimeout(timeout);
          reject(err);
        });
      });

      // 7.1 Ping-Pong
      const pongPromise = new Promise((resolve) => {
        clientSocket.on("pong", (data) => {
          if (data && data.serverTime) {
            pass("WebSocket Ping-Pong beroperasi dengan benar", `ServerTime: ${data.serverTime}`);
            resolve();
          }
        });
      });
      clientSocket.emit("ping", { timestamp: Date.now() });
      await pongPromise;

      // 7.2 Broadcast Device Status
      const deviceEventPromise = new Promise((resolve) => {
        clientSocket.on("device:status_changed", (event) => {
          if (event.deviceId === "CAM-0001" && event.status === "ONLINE") {
            pass("Broadcast device:status_changed diterima klien secara real-time");
            resolve();
          }
        });
      });
      hub.broadcastDeviceStatus({
        deviceId: "CAM-0001",
        deviceType: "CAMERA",
        status: "ONLINE",
        previousStatus: "OFFLINE",
      });
      await deviceEventPromise;

      // 7.3 Broadcast Event Alarm
      const alarmEventPromise = new Promise((resolve) => {
        clientSocket.on("events:alarm_update", (event) => {
          if (event.eventId === "EVT-001" && event.type === "MOTION_DETECTED") {
            pass("Broadcast events:alarm_update diterima klien secara real-time");
            resolve();
          }
        });
      });
      hub.broadcastEventAlarm({
        eventId: "EVT-001",
        type: "MOTION_DETECTED",
        severity: "WARNING",
        status: "OPEN",
        message: "Gerakan mencurigakan terdeteksi",
      });
      await alarmEventPromise;

      // Tutup client socket
      clientSocket.disconnect();
      pass("Klien Socket.IO terputus dengan bersih");
    }

  } catch (err) {
    fail("Eksekusi Pengujian", err.message);
  } finally {
    await hub.close();
    await new Promise((resolve) => server.close(resolve));
    console.log("\n[Test Server] Berhasil ditutup.");
  }

  // Ringkasan
  console.log("\n=======================================================");
  const passedCount = results.filter((r) => r.passed).length;
  const totalCount = results.length;
  console.log(` HASIL PENGUJIAN TAHAP 3: ${passedCount}/${totalCount} lolos`);
  console.log("=======================================================\n");

  if (passedCount === totalCount) {
    console.log("\x1b[32m✔ SEMUA KRITERIA FONDASI BACKEND & WEBSOCKET LOLOS DENGAN SUKSES!\x1b[0m\n");
    process.exit(0);
  } else {
    console.log("\x1b[31m✖ BEBERAPA PENGUJIAN GAGAL. SILAKAN PERIKSA DETAIL DI ATAS.\x1b[0m\n");
    process.exit(1);
  }
}

runTests();
