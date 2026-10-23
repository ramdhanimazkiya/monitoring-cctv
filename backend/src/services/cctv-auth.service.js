import crypto from "crypto";
import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";

// Kunci enkripsi acak simetris di RAM (32 bytes). Dibuat saat runtime backend start
const MEMORY_SECRET_KEY = crypto.randomBytes(32);

// Session Vault in-memory: Map<sessionId, SessionData>
const sessionVault = new Map();

/**
 * Enkripsi teks password sebelum disimpan sementara di RAM
 * @param {string} plainText
 * @returns {{ iv: string, authTag: string, data: string }}
 */
function encryptPassword(plainText) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", MEMORY_SECRET_KEY, iv);
  let encrypted = cipher.update(plainText, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag().toString("hex");
  return { iv: iv.toString("hex"), authTag, data: encrypted };
}

/**
 * Dekripsi password dari RAM saat ingin meminta token baru dari MediaMTX
 * @param {{ iv: string, authTag: string, data: string }} encryptedObj
 * @returns {string}
 */
function decryptPassword(encryptedObj) {
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    MEMORY_SECRET_KEY,
    Buffer.from(encryptedObj.iv, "hex")
  );
  decipher.setAuthTag(Buffer.from(encryptedObj.authTag, "hex"));
  let decrypted = decipher.update(encryptedObj.data, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

/**
 * Meminta token JWT stream ke service autentikasi MediaMTX (POST https://auth.zakuyu.fun/api/token)
 * @param {string} username
 * @param {string} password
 * @returns {Promise<string>} Token JWT
 */
export async function fetchMediaMtxToken(username, password) {
  try {
    const res = await fetch(env.CCTV_AUTH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        username: username.trim(),
        password,
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`MediaMTX Auth gagal [HTTP ${res.status}]: ${errText}`);
    }

    const data = await res.json();
    if (!data.token) {
      throw new Error("Respon auth MediaMTX tidak mengandung properti 'token'");
    }

    return data.token;
  } catch (err) {
    logger.error({ err: err.message, url: env.CCTV_AUTH_URL }, "Gagal mengambil token stream MediaMTX");
    throw err;
  }
}

/**
 * Mendaftarkan sesi CCTV ke memory vault saat user login
 * @param {{ sessionId: string, username: string, password: string, cctvToken: string }} param0
 */
export function registerCctvSession({ sessionId, username, password, cctvToken }) {
  if (!sessionId) return;
  const encryptedPassword = encryptPassword(password);
  sessionVault.set(String(sessionId), {
    username,
    encryptedPassword,
    cctvToken,
    // Set auto-refresh di menit ke-50 (JWT MediaMTX berlaku 60 menit)
    refreshAfter: Date.now() + 50 * 60 * 1000,
  });
  logger.info({ sessionId: String(sessionId), username }, "Sesi CCTV MediaMTX berhasil didaftarkan di session vault");
}

/**
 * Mengambil token yang tersimpan atau memperbarui token secara otomatis jika sudah > 50 menit
 * @param {string} sessionId
 * @returns {Promise<string|null>} Token JWT yang valid
 */
export async function getOrRenewCctvToken(sessionId) {
  if (!sessionId) return null;
  const entry = sessionVault.get(String(sessionId));
  if (!entry) {
    return null;
  }

  // Jika token masih di bawah 50 menit, gunakan token yang ada
  if (Date.now() < entry.refreshAfter) {
    return entry.cctvToken;
  }

  // Jika sudah melewati 50 menit, lakukan silent renewal
  try {
    logger.info({ sessionId: String(sessionId) }, "Token CCTV mendekati kedaluwarsa (>50m), melakukan auto-renewal dari MediaMTX...");
    const plainPassword = decryptPassword(entry.encryptedPassword);
    const newToken = await fetchMediaMtxToken(entry.username, plainPassword);

    entry.cctvToken = newToken;
    entry.refreshAfter = Date.now() + 50 * 60 * 1000;
    sessionVault.set(String(sessionId), entry);

    logger.info({ sessionId: String(sessionId) }, "Auto-renewal token CCTV MediaMTX berhasil");
    return newToken;
  } catch (err) {
    logger.warn({ err: err.message, sessionId: String(sessionId) }, "Auto-renewal token CCTV gagal, memakai token lama sebagai fallback");
    return entry.cctvToken;
  }
}

/**
 * Menghapus data sesi dari memory vault saat user logout
 * @param {string} sessionId
 */
export function clearCctvSession(sessionId) {
  if (!sessionId) return;
  sessionVault.delete(String(sessionId));
  logger.info({ sessionId: String(sessionId) }, "Sesi CCTV MediaMTX dibersihkan dari session vault");
}
