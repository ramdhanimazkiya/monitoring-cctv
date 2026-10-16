import rateLimit from "express-rate-limit";
import { env } from "../config/env.js";

/**
 * Handler kustom untuk format respons JSON standar saat rate limit terlampaui.
 */
function createRateLimitHandler(message) {
  return (req, res, next, options) => {
    const retryAfter = Math.ceil(options.windowMs / 1000);
    res.status(options.statusCode).json({
      success: false,
      error: {
        code: "RATE_LIMIT_EXCEEDED",
        message,
        retryAfterSeconds: retryAfter,
      },
    });
  };
}

/**
 * Pembatas laju umum untuk semua rute /api/*
 * Standar: 300 request per 1 menit per IP. (Dilonggarkan saat NODE_ENV=test).
 */
export const apiRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: env.NODE_ENV === "test" ? 10000 : 300,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  handler: createRateLimitHandler("Terlalu banyak permintaan API. Silakan coba sesaat lagi."),
});

/**
 * Pembatas laju ketat untuk endpoint login / otentikasi (mencegah brute-force).
 * Standar: 10 percobaan per 15 menit per IP (DECISIONS Q10).
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: env.NODE_ENV === "test" ? 1000 : 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Percobaan gagal yang dihitung
  handler: createRateLimitHandler("Terlalu banyak percobaan login gagal. Silakan tunggu 15 menit sebelum mencoba kembali."),
});
