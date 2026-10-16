import http from "http";
import { env } from "./config/env.js";
import { logger } from "./utils/logger.js";
import { prisma, checkDatabaseConnection } from "./config/database.js";
import { createApp } from "./app.js";
import { wsHub } from "./websocket/hub.js";
import { monitoringService } from "./modules/monitoring/monitoring.service.js";

const app = createApp();
const server = http.createServer(app);

// Inisialisasi WebSocket Hub
wsHub.init(server);

// Mulai dengarkan koneksi
server.listen(env.PORT, env.HOST, async () => {
  logger.info(
    `Server Backend CCTV Monitoring berjalan di http://${env.HOST === "0.0.0.0" ? "localhost" : env.HOST}:${env.PORT} [${env.NODE_ENV}]`,
  );
  logger.info(`WebSocket Hub aktif pada path /socket.io/`);

  // Cek koneksi database awal
  const dbStatus = await checkDatabaseConnection();
  if (dbStatus.connected) {
    logger.info(`Koneksi Database PostgreSQL OK (latensi: ${dbStatus.latencyMs}ms)`);
    // Mulai background worker pemantau status perangkat
    await monitoringService.start();
  } else {
    logger.warn(
      `Database PostgreSQL belum terhubung: ${dbStatus.error}. Pastikan kredensial di .env sesuai dan service PostgreSQL berjalan.`,
    );
  }
});

// Penanganan Graceful Shutdown
let isShuttingDown = false;

async function gracefulShutdown(signal) {
  if (isShuttingDown) return;
  isShuttingDown = true;

  logger.info(`Menerima sinyal ${signal}. Menutup server secara aman (graceful shutdown)...`);

  // Timeout paksa jika penutupan memakan waktu terlalu lama (10 detik)
  const forceExitTimeout = setTimeout(() => {
    logger.error("Penutupan paksa: timeout 10 detik terlampaui");
    process.exit(1);
  }, 10000);
  forceExitTimeout.unref();

  try {
    // 0. Hentikan background monitoring worker
    monitoringService.stop();

    // 1. Hentikan penerimaan koneksi baru HTTP
    await new Promise((resolve) => server.close(resolve));
    logger.info("HTTP Server ditutup");

    // 2. Tutup koneksi WebSocket
    await wsHub.close();

    // 3. Putus koneksi Prisma Client
    await prisma.$disconnect();
    logger.info("Koneksi database ditutup");

    logger.info("Aplikasi berhasil ditutup dengan bersih");
    process.exit(0);
  } catch (err) {
    logger.error({ err }, "Terjadi kesalahan saat graceful shutdown");
    process.exit(1);
  }
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

process.on("uncaughtException", (err) => {
  logger.fatal({ err }, "Uncaught Exception terdeteksi");
  gracefulShutdown("uncaughtException");
});

process.on("unhandledRejection", (reason) => {
  logger.error({ reason }, "Unhandled Rejection terdeteksi");
});
