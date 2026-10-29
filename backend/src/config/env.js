import "dotenv/config";
import { z } from "zod";

/**
 * Validasi environment saat startup. Gagal cepat dengan pesan jelas,
 * dan tidak pernah mencetak nilai rahasia.
 */
const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  HOST: z.string().default("0.0.0.0"),
  DATABASE_URL: z
    .string({ error: "DATABASE_URL belum diatur. Salin .env.example menjadi .env." })
    .refine((v) => /^postgres(ql)?:\/\//.test(v), "DATABASE_URL harus berformat postgresql://..."),
  CORS_ORIGIN: z.string().default("http://localhost:5173"),
  SESSION_SECRET: z
    .string()
    .min(16, "SESSION_SECRET minimal 16 karakter")
    .default("cctv_monitoring_dev_secret_key_32bytes_change_in_prod"),
  SESSION_COOKIE_NAME: z.string().default("cctv_session"),
  SESSION_TTL_HOURS: z.coerce.number().positive().default(87600),
  SESSION_IDLE_TIMEOUT_MINUTES: z.coerce.number().nonnegative().default(0),
  CREDENTIAL_ENCRYPTION_KEY: z
    .string()
    .optional()
    .refine(
      (v) => !v || Buffer.from(v, "base64").length === 32,
      "CREDENTIAL_ENCRYPTION_KEY harus 32 byte dalam base64",
    ),
  // Konfigurasi Media Streaming Gateway (Tahap 5)
  STREAM_GATEWAY_URL: z.string().default("http://localhost:8554"),
  STREAM_GATEWAY_API_URL: z.string().default("http://localhost:9997"),
  STREAM_GATEWAY_TYPE: z.enum(["mediamtx", "go2rtc", "mock"]).default("mediamtx"),
  CCTV_AUTH_URL: z.string().default("https://auth.zakuyu.fun/api/token"),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues.map((i) => `  - ${i.path.join(".") || "env"}: ${i.message}`);
  console.error(`Konfigurasi environment tidak valid:\n${issues.join("\n")}`);
  process.exit(1);
}

export const env = Object.freeze(parsed.data);
