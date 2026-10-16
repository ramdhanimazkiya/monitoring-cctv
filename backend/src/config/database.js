import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, Prisma } from "../../generated/prisma/client.ts";
import { env } from "./env.js";

/**
 * Prisma Client singleton (Prisma 7 memakai driver adapter `pg`).
 * Client digenerate oleh `npm run db:generate` ke backend/generated/prisma.
 */
const adapter = new PrismaPg({ connectionString: env.DATABASE_URL });

export const prisma = new PrismaClient({
  adapter,
  log: env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
});

/**
 * Memeriksa konektivitas database untuk healthcheck dan kesiapan sistem.
 * @returns {Promise<{ connected: boolean, latencyMs?: number, error?: string }>}
 */
export async function checkDatabaseConnection() {
  const start = Date.now();
  try {
    await prisma.$queryRawUnsafe("SELECT 1");
    return {
      connected: true,
      latencyMs: Date.now() - start,
    };
  } catch (err) {
    return {
      connected: false,
      error: err.message || "Database connection error",
    };
  }
}

export { Prisma };
