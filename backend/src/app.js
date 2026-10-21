import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";

import { env } from "./config/env.js";
import { logger } from "./utils/logger.js";
import { apiRateLimiter } from "./middleware/rate-limiter.js";
import { notFoundHandler, globalErrorHandler } from "./middleware/error-handler.js";

import healthRoutes from "./routes/health.routes.js";
import authRoutes from "./modules/auth/auth.routes.js";
import deviceRoutes from "./modules/devices/device.routes.js";
import monitoringRoutes from "./modules/monitoring/monitoring.routes.js";
import streamingRoutes from "./modules/streaming/streaming.routes.js";
import pagingRoutes from "./modules/paging/paging.routes.js";
import userRoutes from "./modules/users/user.routes.js";
import auditRoutes from "./modules/audit/audit.routes.js";
import eventRoutes from "./modules/events/event.routes.js";

// Polyfill serialisasi BigInt untuk respons JSON Prisma
if (!BigInt.prototype.toJSON) {
  BigInt.prototype.toJSON = function () {
    return this.toString();
  };
}

export function createApp() {
  const app = express();

  // Trust proxy jika di belakang reverse proxy (Nginx, load balancer)
  app.set("trust proxy", 1);

  // 1. Logger request HTTP
  if (env.NODE_ENV !== "test") {
    app.use(
      pinoHttp({
        logger,
        autoLogging: {
          ignore: (req) => req.url?.startsWith("/api/health"),
        },
      }),
    );
  }

  // 2. Proteksi Header Keamanan (Helmet)
  app.use(
    helmet({
      contentSecurityPolicy: false, // Memungkinkan komunikasi websocket & Vite dev server
      crossOriginEmbedderPolicy: false,
    }),
  );

  // 3. CORS
  app.use(
    cors({
      origin: env.CORS_ORIGIN,
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
    }),
  );

  // 4. Parser Cookie & Body
  app.use(cookieParser(env.SESSION_SECRET));
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true, limit: "1mb" }));

  // 5. Rate Limiter Global untuk semua rute /api
  app.use("/api", apiRateLimiter);

  // 6. Registrasi Endpoint API
  app.use("/api", healthRoutes);
  app.use("/api/auth", authRoutes);
  app.use("/api", deviceRoutes);
  app.use("/api", monitoringRoutes);
  app.use("/api", streamingRoutes);
  app.use("/api", pagingRoutes);
  app.use("/api/users", userRoutes);
  app.use("/api/audit-logs", auditRoutes);
  app.use("/api/events", eventRoutes);

  // 7. Handler 404 & Global Error
  app.use(notFoundHandler);
  app.use(globalErrorHandler);

  return app;
}
