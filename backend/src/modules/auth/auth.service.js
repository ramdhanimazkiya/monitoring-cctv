import crypto from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "../../config/database.js";
import { env } from "../../config/env.js";
import { recordAuditLog } from "../../services/audit.service.js";
import { UnauthorizedError, NotFoundError, BadRequestError } from "../../utils/errors.js";
import { logger } from "../../utils/logger.js";

const BCRYPT_ROUNDS = 12;
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

/**
 * Hash raw session token dengan SHA-256.
 * DB hanya menyimpan tokenHash berukuran 64 karakter heksadesimal.
 */
export function hashSessionToken(rawToken) {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

/**
 * Menghasilkan token acak kriptografis 32 byte (64 karakter heksadesimal).
 */
export function generateSessionToken() {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Proses login pengguna.
 * Menegakkan proteksi brute-force, pencatatan audit log, dan pembuatan session server-side.
 */
export async function login({ username, password, req = null }) {
  const normalizedUsername = username.toLowerCase().trim();
  const ipAddress = req?.ip || req?.socket?.remoteAddress || null;
  const userAgent = req?.headers?.["user-agent"]?.substring(0, 255) || null;

  const user = await prisma.user.findUnique({
    where: { username: normalizedUsername },
    include: {
      zoneAccess: { select: { zoneId: true } },
    },
  });

  if (!user || user.deletedAt) {
    await recordAuditLog({
      actorUsername: normalizedUsername,
      action: "AUTH_LOGIN_FAILED",
      entityType: "user",
      result: "FAILURE",
      message: "Percobaan login gagal: pengguna tidak ditemukan",
      req,
    });
    throw new UnauthorizedError("Username atau password salah");
  }

  if (!user.isActive) {
    await recordAuditLog({
      userId: user.id,
      actorUsername: normalizedUsername,
      action: "AUTH_LOGIN_FAILED",
      entityType: "user",
      entityId: user.id,
      result: "FAILURE",
      message: "Percobaan login ditolak: akun nonaktif",
      req,
    });
    throw new UnauthorizedError("Akun telah dinonaktifkan. Hubungi Administrator.");
  }

  // Cek apakah akun sedang terkunci (lockout)
  const now = new Date();
  if (user.lockedUntil && user.lockedUntil > now) {
    const sisaMenit = Math.ceil((user.lockedUntil.getTime() - now.getTime()) / (60 * 1000));
    await recordAuditLog({
      userId: user.id,
      actorUsername: normalizedUsername,
      action: "AUTH_LOGIN_LOCKED",
      entityType: "user",
      entityId: user.id,
      result: "FAILURE",
      message: `Percobaan login pada akun yang terkunci (${sisaMenit} menit tersisa)`,
      req,
    });
    throw new UnauthorizedError(`Akun terkunci sementara karena beberapa kegagalan login. Silakan tunggu ${sisaMenit} menit.`);
  }

  // Verifikasi hash password
  const isMatch = await bcrypt.compare(password, user.passwordHash);

  if (!isMatch) {
    const nextFailedCount = user.failedLoginCount + 1;
    const shouldLock = nextFailedCount >= MAX_FAILED_ATTEMPTS;
    const lockedUntil = shouldLock ? new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000) : null;

    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginCount: nextFailedCount,
        lockedUntil,
      },
    });

    await recordAuditLog({
      userId: user.id,
      actorUsername: normalizedUsername,
      action: shouldLock ? "AUTH_ACCOUNT_LOCKED" : "AUTH_LOGIN_FAILED",
      entityType: "user",
      entityId: user.id,
      result: "FAILURE",
      message: shouldLock
        ? `Akun dikunci selama ${LOCKOUT_MINUTES} menit setelah ${nextFailedCount} kegagalan`
        : `Password salah (${nextFailedCount}/${MAX_FAILED_ATTEMPTS} percobaan)`,
      req,
    });

    if (shouldLock) {
      throw new UnauthorizedError(`Terlalu banyak percobaan gagal. Akun dikunci sementara selama ${LOCKOUT_MINUTES} menit.`);
    }

    throw new UnauthorizedError("Username atau password salah");
  }

  // Login berhasil: reset gagal login & perbarui last_login_at
  await prisma.user.update({
    where: { id: user.id },
    data: {
      failedLoginCount: 0,
      lockedUntil: null,
      lastLoginAt: now,
    },
  });

  // Buat sesi baru
  const rawToken = generateSessionToken();
  const tokenHash = hashSessionToken(rawToken);
  const expiresAt = new Date(Date.now() + env.SESSION_TTL_HOURS * 3600 * 1000);

  const session = await prisma.session.create({
    data: {
      userId: user.id,
      tokenHash,
      ipAddress: ipAddress ? String(ipAddress).substring(0, 45) : null,
      userAgent,
      expiresAt,
    },
  });

  await recordAuditLog({
    userId: user.id,
    actorUsername: normalizedUsername,
    action: "AUTH_LOGIN_SUCCESS",
    entityType: "session",
    entityId: String(session.id),
    result: "SUCCESS",
    message: "Login berhasil",
    req,
  });

  const safeUser = {
    id: user.id,
    username: user.username,
    fullName: user.fullName,
    email: user.email,
    role: user.role,
    mustChangePassword: user.mustChangePassword,
    allowedZones: user.zoneAccess.map((za) => za.zoneId),
  };

  return {
    rawToken,
    user: safeUser,
    expiresAt,
  };
}

/**
 * Mencari dan memvalidasi sesi berdasarkan raw cookie token.
 * Memeriksa kedaluwarsa waktu (TTL) serta idle timeout.
 */
export async function getSessionByToken(rawToken) {
  if (!rawToken || typeof rawToken !== "string") {
    return null;
  }

  const tokenHash = hashSessionToken(rawToken);
  const now = new Date();

  try {
    const session = await prisma.session.findUnique({
      where: { tokenHash },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            fullName: true,
            email: true,
            role: true,
            isActive: true,
            mustChangePassword: true,
            deletedAt: true,
            zoneAccess: { select: { zoneId: true } },
          },
        },
      },
    });

    if (!session || session.revokedAt || session.expiresAt <= now) {
      return null;
    }

    if (!session.user || !session.user.isActive || session.user.deletedAt) {
      return null;
    }

    // Cek idle timeout (inactivity)
    const idleLimitMs = env.SESSION_IDLE_TIMEOUT_MINUTES * 60 * 1000;
    const timeSinceLastSeen = now.getTime() - new Date(session.lastSeenAt).getTime();
    if (timeSinceLastSeen > idleLimitMs) {
      // Cabut sesi karena idle
      await prisma.session.update({
        where: { id: session.id },
        data: { revokedAt: now },
      });
      return null;
    }

    // Perbarui last_seen_at dengan throttling (maksimum 1x per 60 detik)
    if (timeSinceLastSeen > 60 * 1000) {
      prisma.session
        .update({
          where: { id: session.id },
          data: { lastSeenAt: now },
        })
        .catch((err) => logger.debug({ err }, "Gagal memperbarui lastSeenAt sesi"));
    }

    return {
      session: {
        id: session.id,
        createdAt: session.createdAt,
        expiresAt: session.expiresAt,
      },
      user: {
        id: session.user.id,
        username: session.user.username,
        fullName: session.user.fullName,
        email: session.user.email,
        role: session.user.role,
        mustChangePassword: session.user.mustChangePassword,
        allowedZones: session.user.zoneAccess.map((za) => za.zoneId),
      },
    };
  } catch (err) {
    logger.error({ err }, "Error saat memeriksa sesi di database");
    return null;
  }
}

/**
 * Logout: mencabut (revoke) sesi di database.
 */
export async function logout({ rawToken, req = null }) {
  if (!rawToken) return false;

  const tokenHash = hashSessionToken(rawToken);
  const now = new Date();

  try {
    const session = await prisma.session.findUnique({
      where: { tokenHash },
    });

    if (session && !session.revokedAt) {
      await prisma.session.update({
        where: { id: session.id },
        data: { revokedAt: now },
      });

      await recordAuditLog({
        userId: session.userId,
        action: "AUTH_LOGOUT",
        entityType: "session",
        entityId: String(session.id),
        result: "SUCCESS",
        message: "Logout pengguna",
        req,
      });
    }

    return true;
  } catch (err) {
    logger.error({ err }, "Error saat logout sesi");
    return false;
  }
}

/**
 * Ubah password pengguna.
 */
export async function changePassword({ userId, currentPassword, newPassword, req = null }) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user || !user.isActive || user.deletedAt) {
    throw new NotFoundError("Pengguna tidak ditemukan atau nonaktif");
  }

  const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!isMatch) {
    await recordAuditLog({
      userId,
      actorUsername: user.username,
      action: "AUTH_CHANGE_PASSWORD_FAILED",
      entityType: "user",
      entityId: userId,
      result: "FAILURE",
      message: "Password saat ini salah",
      req,
    });
    throw new BadRequestError("Password saat ini tidak cocok");
  }

  const newHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

  await prisma.user.update({
    where: { id: userId },
    data: {
      passwordHash: newHash,
      mustChangePassword: false,
    },
  });

  // Cabut semua sesi lain demi keamanan
  await prisma.session.updateMany({
    where: {
      userId,
      revokedAt: null,
    },
    data: {
      revokedAt: new Date(),
    },
  });

  await recordAuditLog({
    userId,
    actorUsername: user.username,
    action: "AUTH_CHANGE_PASSWORD_SUCCESS",
    entityType: "user",
    entityId: userId,
    result: "SUCCESS",
    message: "Password berhasil diubah",
    req,
  });

  return true;
}
