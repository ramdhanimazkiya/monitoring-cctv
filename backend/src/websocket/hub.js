import { Server as SocketIOServer } from "socket.io";
import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";
import { getSessionByToken } from "../modules/auth/auth.service.js";

/**
 * Parsing cookie mentah dari handshake header HTTP WebSocket.
 */
function parseCookieHeader(cookieString) {
  const cookies = {};
  if (!cookieString) return cookies;
  for (const pair of cookieString.split(";")) {
    const [key, ...rest] = pair.trim().split("=");
    if (key) {
      cookies[key] = decodeURIComponent(rest.join("="));
    }
  }
  return cookies;
}

export class WebSocketHub {
  constructor() {
    this.io = null;
    this.connectedSockets = new Map();
  }

  /**
   * Menginisialisasi WebSocket Hub dengan HTTP server.
   */
  init(httpServer) {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: env.CORS_ORIGIN,
        credentials: true,
      },
      pingTimeout: 20000,
      pingInterval: 25000,
    });

    // Middleware Autentikasi Socket.IO
    this.io.use(async (socket, next) => {
      try {
        const cookies = parseCookieHeader(socket.handshake.headers.cookie);
        const token =
          socket.handshake.auth?.token ||
          cookies[env.SESSION_COOKIE_NAME] ||
          null;

        if (token) {
          const sessionData = await getSessionByToken(token);
          if (sessionData) {
            socket.user = sessionData.user;
            socket.session = sessionData.session;
            socket.isAuthenticated = true;
            return next();
          }
        }

        // Jika tidak ada sesi valid: tandai sebagai guest/unauthenticated
        socket.user = null;
        socket.session = null;
        socket.isAuthenticated = false;

        // Izinkan koneksi publik (untuk dashboard monitoring tampilan demo),
        // namun aksi berizin (PTT, Admin channel) akan dibatasi di handler event.
        next();
      } catch (err) {
        logger.warn({ err }, "Kesalahan saat autentikasi handshake Socket.IO");
        next();
      }
    });

    this.setupEvents();
    logger.info("WebSocket Hub berhasil diinisialisasi");
    return this.io;
  }

  /**
   * Mendaftarkan event listener koneksi socket.
   */
  setupEvents() {
    this.io.on("connection", (socket) => {
      const clientId = socket.id;
      const user = socket.user;
      const username = user ? user.username : "guest";

      this.connectedSockets.set(clientId, {
        socketId: clientId,
        userId: user?.id || null,
        username,
        role: user?.role || "GUEST",
        connectedAt: new Date(),
      });

      logger.info(
        { socketId: clientId, username, role: user?.role || "GUEST" },
        "Klien WebSocket terhubung",
      );

      // Secara default otomatis bergabung ke channel publik
      socket.join("devices:status");
      socket.join("events:alarms");
      socket.join("cctv:streams");
      socket.join("audio:paging");

      // Jika terautentikasi, bergabung ke room user dan role
      if (user) {
        socket.join(`user:${user.id}`);
        socket.join(`role:${user.role.toLowerCase()}`);
      }

      // Kirim konfirmasi koneksi
      socket.emit("connected", {
        socketId: clientId,
        serverTime: new Date().toISOString(),
        isAuthenticated: socket.isAuthenticated,
        user: socket.user || null,
      });

      // Handler Subscribe & Unsubscribe ruangan
      socket.on("subscribe", (roomName) => {
        if (typeof roomName === "string" && roomName.length <= 50) {
          socket.join(roomName);
          logger.debug({ clientId, roomName }, "Klien subscribe room");
        }
      });

      socket.on("unsubscribe", (roomName) => {
        if (typeof roomName === "string") {
          socket.leave(roomName);
          logger.debug({ clientId, roomName }, "Klien unsubscribe room");
        }
      });

      // Heartbeat ping-pong
      socket.on("ping", (data) => {
        socket.emit("pong", {
          clientTime: data?.timestamp,
          serverTime: Date.now(),
        });
      });

      // Putus koneksi
      socket.on("disconnect", (reason) => {
        this.connectedSockets.delete(clientId);
        logger.info({ socketId: clientId, reason }, "Klien WebSocket terputus");
      });
    });
  }

  // ---- Metode Publik untuk Broadcast ke Seluruh Klien ----

  /**
   * Broadcast perubahan status konektivitas perangkat (CAM/AUD)
   */
  broadcastDeviceStatus({ deviceId, deviceType, status, previousStatus, timestamp = new Date() }) {
    if (!this.io) return;
    this.io.to("devices:status").emit("device:status_changed", {
      deviceId,
      deviceType,
      status,
      previousStatus,
      timestamp: timestamp.toISOString ? timestamp.toISOString() : timestamp,
    });
  }

  /**
   * Broadcast status ketersediaan stream kamera
   */
  broadcastStreamStatus({ cameraId, streamStatus, streamKey, timestamp = new Date() }) {
    if (!this.io) return;
    this.io.to("cctv:streams").emit("cctv:stream_status", {
      cameraId,
      streamStatus,
      streamKey,
      timestamp: timestamp.toISOString ? timestamp.toISOString() : timestamp,
    });
  }

  /**
   * Broadcast progres & pembaruan perintah audio (PTT/TTS)
   */
  broadcastAudioPagingUpdate(payload) {
    if (!this.io) return;
    this.io.to("audio:paging").emit("audio:command_update", {
      ...payload,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Broadcast akuisisi atau pelepasan lease kanal PTT speaker
   */
  broadcastChannelLeaseUpdate({ audioDeviceId, acquired, userId, username, expiresAt }) {
    if (!this.io) return;
    this.io.to("audio:paging").emit("audio:channel_lease", {
      audioDeviceId,
      acquired,
      userId,
      username,
      expiresAt: expiresAt?.toISOString ? expiresAt.toISOString() : expiresAt,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Broadcast event/alarm baru atau pembaruan status alarm (ACK/RESOLVE)
   */
  broadcastEventAlarm(eventData) {
    if (!this.io) return;
    this.io.to("events:alarms").emit("events:alarm_update", {
      ...eventData,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Kirim pesan langsung ke satu pengguna tertentu
   */
  emitToUser(userId, eventName, payload) {
    if (!this.io) return;
    this.io.to(`user:${userId}`).emit(eventName, payload);
  }

  /**
   * Mengembalikan status koneksi WebSocket saat ini untuk monitoring & healthcheck.
   */
  getStats() {
    return {
      totalConnected: this.connectedSockets.size,
      authenticatedUsers: Array.from(this.connectedSockets.values()).filter((c) => c.userId).length,
    };
  }

  /**
   * Menutup koneksi WebSocket saat graceful shutdown.
   */
  async close() {
    if (this.io) {
      await new Promise((resolve) => this.io.close(resolve));
      this.io = null;
      this.connectedSockets.clear();
      logger.info("WebSocket Hub berhasil ditutup");
    }
  }
}

export const wsHub = new WebSocketHub();
