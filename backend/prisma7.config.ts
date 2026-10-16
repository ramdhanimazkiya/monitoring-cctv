// Konfigurasi Prisma CLI (Prisma 7.10+: nama file prisma7.config.ts).
// Prisma 7 tidak lagi memuat .env otomatis, sehingga dotenv di-import eksplisit.
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "node prisma/seed.js",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
});
