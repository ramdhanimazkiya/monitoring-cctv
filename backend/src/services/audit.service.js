import { prisma } from "../config/database.js";
import { logger } from "../utils/logger.js";

const SENSITIVE_KEYS = new Set([
  "password",
  "passwordHash",
  "password_hash",
  "token",
  "secret",
  "credentialCipher",
  "credential_cipher",
  "credential",
]);

/**
 * Membersihkan data sebelum dicatat ke audit log (redaksi rekursif).
 */
export function sanitizeAuditData(data) {
  if (!data || typeof data !== "object") return data;

  let plainData = data;
  try {
    plainData = JSON.parse(JSON.stringify(data));
  } catch (_) {
    plainData = data;
  }

  if (Array.isArray(plainData)) {
    return plainData.map(sanitizeAuditData);
  }

  const clean = {};
  for (const [key, value] of Object.entries(plainData)) {
    if (SENSITIVE_KEYS.has(key)) {
      clean[key] = "[REDACTED]";
    } else if (value && typeof value === "object") {
      clean[key] = sanitizeAuditData(value);
    } else {
      clean[key] = value;
    }
  }
  return clean;
}

/**
 * Mencatat entri audit log ke database PostgreSQL.
 * Kolom before & after otomatis dibersihkan dari password/secret.
 */
export async function recordAuditLog({
  userId = null,
  actorUsername = null,
  action,
  entityType = null,
  entityId = null,
  result = "SUCCESS", // "SUCCESS" | "FAILURE"
  message = null,
  before = null,
  after = null,
  req = null,
}) {
  const ipAddress = req?.ip || req?.socket?.remoteAddress || null;
  const userAgent = req?.headers?.["user-agent"]?.substring(0, 255) || null;
  const requestId = req?.id !== undefined && req?.id !== null ? String(req.id).substring(0, 64) : null;

  const entry = {
    userId,
    actorUsername: actorUsername ? actorUsername.toLowerCase() : null,
    action: action.substring(0, 60),
    entityType: entityType ? entityType.substring(0, 40) : null,
    entityId: entityId ? String(entityId).substring(0, 40) : null,
    result: result === "FAILURE" ? "FAILURE" : "SUCCESS",
    message: message ? message.substring(0, 500) : null,
    before: before ? sanitizeAuditData(before) : undefined,
    after: after ? sanitizeAuditData(after) : undefined,
    ipAddress: ipAddress ? String(ipAddress).substring(0, 45) : null,
    userAgent,
    requestId,
  };

  try {
    const created = await prisma.auditLog.create({
      data: entry,
    });
    return created;
  } catch (err) {
    // Audit log tidak boleh membuat request utama crash, tetapi dicatat ke logger
    logger.error({ err, entry }, "Gagal mencatat audit log ke database");
    return null;
  }
}
