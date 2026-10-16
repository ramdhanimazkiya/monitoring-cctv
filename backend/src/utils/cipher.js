import crypto from "crypto";
import { env } from "../config/env.js";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // 96-bit IV standar untuk GCM
const TAG_LENGTH = 16; // 128-bit auth tag

/**
 * Mendapatkan kunci enkripsi 32-byte.
 * Jika CREDENTIAL_ENCRYPTION_KEY tidak disediakan di dev, gunakan turunan dari SESSION_SECRET.
 */
function getEncryptionKey() {
  if (env.CREDENTIAL_ENCRYPTION_KEY) {
    const key = Buffer.from(env.CREDENTIAL_ENCRYPTION_KEY, "base64");
    if (key.length === 32) return key;
  }
  // Fallback dev: SHA-256 dari SESSION_SECRET selalu menghasilkan 32 byte
  return crypto.createHash("sha256").update(env.SESSION_SECRET).digest();
}

/**
 * Mengenkripsi kredensial (password perangkat, secret) menggunakan AES-256-GCM.
 * Format output: Base64 dari gabungan [IV (12 byte) + Tag (16 byte) + Ciphertext].
 */
export function encryptCredential(plaintext) {
  if (!plaintext || typeof plaintext !== "string") return null;

  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, { authTagLength: TAG_LENGTH });

  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  // Gabungkan iv + tag + ciphertext menjadi 1 buffer
  const combined = Buffer.concat([iv, tag, encrypted]);
  return combined.toString("base64");
}

/**
 * Mendekripsi kredensial tersimpan.
 */
export function decryptCredential(encryptedBase64) {
  if (!encryptedBase64 || typeof encryptedBase64 !== "string") return null;

  try {
    const key = getEncryptionKey();
    const combined = Buffer.from(encryptedBase64, "base64");

    if (combined.length < IV_LENGTH + TAG_LENGTH) {
      throw new Error("Panjang ciphertext tidak valid");
    }

    const iv = combined.subarray(0, IV_LENGTH);
    const tag = combined.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
    const ciphertext = combined.subarray(IV_LENGTH + TAG_LENGTH);

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, { authTagLength: TAG_LENGTH });
    decipher.setAuthTag(tag);

    const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return decrypted.toString("utf8");
  } catch (err) {
    return null;
  }
}
