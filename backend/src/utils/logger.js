import pino from "pino";
import { env } from "../config/env.js";

const isDev = env.NODE_ENV === "development";

/**
 * Konfigurasi logger Pino.
 * Otomatis menyamarkan (redact) data sensitif seperti password, hash, dan token.
 */
export const logger = pino({
  level: isDev ? "debug" : "info",
  redact: {
    paths: [
      "password",
      "*.password",
      "passwordHash",
      "*.passwordHash",
      "token",
      "*.token",
      "secret",
      "*.secret",
      "credentialCipher",
      "*.credentialCipher",
      "req.headers.cookie",
      "req.headers.authorization",
    ],
    censor: "[REDACTED]",
  },
  transport: isDev
    ? {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "HH:MM:ss.l",
          ignore: "pid,hostname",
        },
      }
    : undefined,
});
