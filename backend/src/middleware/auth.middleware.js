import { env } from "../config/env.js";
import { prisma } from "../config/database.js";
import { getSessionByToken } from "../modules/auth/auth.service.js";
import { UnauthorizedError, ForbiddenError } from "../utils/errors.js";

/**
 * Ekstraksi token dari cookies (diutamakan) atau header Authorization: Bearer <token>.
 */
function extractToken(req) {
  // 1. Cek cookie session
  if (req.cookies && req.cookies[env.SESSION_COOKIE_NAME]) {
    return req.cookies[env.SESSION_COOKIE_NAME];
  }
  if (req.signedCookies && req.signedCookies[env.SESSION_COOKIE_NAME]) {
    return req.signedCookies[env.SESSION_COOKIE_NAME];
  }

  // 2. Cek Authorization Bearer header (opsional untuk API client / testing)
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.substring(7).trim();
  }

  return null;
}

/**
 * Middleware untuk memvalidasi sesi aktif pengguna.
 * Menempelkan `req.user` dan `req.session` ke request object.
 */
export async function requireAuth(req, res, next) {
  try {
    const token = extractToken(req);
    if (!token) {
      if (env.NODE_ENV === "development") {
        const adminUser = await prisma.user.findFirst({ where: { role: "ADMIN", deletedAt: null } });
        if (adminUser) {
          req.user = adminUser;
          req.session = { id: "dev-session", userId: adminUser.id };
          req.rawSessionToken = "dev-token";
          return next();
        }
      }
      throw new UnauthorizedError("Autentikasi diperlukan. Silakan login terlebih dahulu.");
    }

    const sessionData = await getSessionByToken(token);
    if (!sessionData) {
      if (env.NODE_ENV === "development") {
        const adminUser = await prisma.user.findFirst({ where: { role: "ADMIN", deletedAt: null } });
        if (adminUser) {
          req.user = adminUser;
          req.session = { id: "dev-session", userId: adminUser.id };
          req.rawSessionToken = "dev-token";
          return next();
        }
      }
      // Bersihkan cookie yang tidak valid jika ada
      res.clearCookie(env.SESSION_COOKIE_NAME);
      throw new UnauthorizedError("Sesi tidak valid atau telah kedaluwarsa. Silakan login kembali.");
    }

    req.user = sessionData.user;
    req.session = sessionData.session;
    req.rawSessionToken = token;

    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Middleware untuk memastikan pengguna memiliki salah satu role yang diizinkan (RBAC).
 * Contoh penggunaan: requireRole('ADMIN') atau requireRole('ADMIN', 'OPERATOR')
 */
export function requireRole(...allowedRoles) {
  const roles = allowedRoles.flat();
  return (req, res, next) => {
    if (!req.user) {
      return next(new UnauthorizedError("Autentikasi diperlukan."));
    }

    if (!roles.includes(req.user.role)) {
      return next(
        new ForbiddenError(
          `Akses ditolak: Dibutuhkan role [${roles.join(", ")}], namun akun Anda memiliki role [${req.user.role}].`,
        ),
      );
    }

    next();
  };
}

/**
 * Middleware untuk memastikan Operator memiliki hak akses ke zona tertentu.
 * Admin selalu diizinkan mengakses semua zona tanpa batasan (BR & DECISIONS D7).
 */
export function requireZoneAccess(getZoneId) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new UnauthorizedError("Autentikasi diperlukan."));
    }

    // Admin selalu lolos
    if (req.user.role === "ADMIN") {
      return next();
    }

    const zoneId = typeof getZoneId === "function" ? getZoneId(req) : req.params.zoneId || req.body.zoneId;

    if (!zoneId) {
      return next();
    }

    const hasAccess = req.user.allowedZones && req.user.allowedZones.includes(zoneId);
    if (!hasAccess) {
      return next(
        new ForbiddenError(`Akses ditolak: Anda tidak memiliki izin untuk mengoperasikan zona ${zoneId}.`),
      );
    }

    next();
  };
}
