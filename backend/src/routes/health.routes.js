import { Router } from "express";
import { checkDatabaseConnection } from "../config/database.js";
import { wsHub } from "../websocket/hub.js";

const router = Router();

/**
 * Endpoint status kesehatan sistem (Health Check).
 */
router.get("/health", async (req, res) => {
  const dbStatus = await checkDatabaseConnection();
  const wsStats = wsHub.getStats();

  const isHealthy = dbStatus.connected;

  const payload = {
    status: isHealthy ? "healthy" : "degraded",
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    version: "0.1.0",
    environment: process.env.NODE_ENV || "development",
    subsystems: {
      database: {
        status: dbStatus.connected ? "connected" : "disconnected",
        latencyMs: dbStatus.latencyMs,
        ...(dbStatus.error && { error: dbStatus.error }),
      },
      websocket: {
        status: "active",
        ...wsStats,
      },
      memory: {
        rssMb: Math.round(process.memoryUsage().rss / 1024 / 1024),
        heapUsedMb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      },
    },
  };

  res.status(isHealthy ? 200 : 503).json(payload);
});

/**
 * Liveness probe: memastikan proses Node.js hidup & merespons HTTP.
 */
router.get("/health/live", (req, res) => {
  res.status(200).json({ status: "alive" });
});

/**
 * Readiness probe: memastikan dependensi utama (database) siap melayani trafik.
 */
router.get("/health/ready", async (req, res) => {
  const dbStatus = await checkDatabaseConnection();
  if (dbStatus.connected) {
    res.status(200).json({ status: "ready" });
  } else {
    res.status(503).json({ status: "not_ready", reason: dbStatus.error });
  }
});

export default router;
