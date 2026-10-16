import { z } from "zod";

/**
 * Skema validasi untuk Modul Audio Paging & TTS
 */

// Skema untuk memulai transmisi PTT
export const startPttSchema = z.object({
  targetType: z.enum(["DEVICE", "ZONE", "GROUP", "ALL"], {
    errorMap: () => ({ message: "targetType harus berupa DEVICE, ZONE, GROUP, atau ALL" }),
  }),
  targetId: z.string().trim().min(1, "targetId tidak boleh kosong").optional(),
  targetIds: z.array(z.string().trim().min(1)).min(1, "targetIds minimal memiliki 1 ID").optional(),
  durationSeconds: z.number().int().min(5).max(300).default(60).optional(),
}).refine(
  (data) => {
    if (data.targetType === "ALL") return true;
    return !!(data.targetId || (data.targetIds && data.targetIds.length > 0));
  },
  {
    message: "targetId atau targetIds wajib diisi untuk targetType DEVICE, ZONE, atau GROUP",
    path: ["targetId"],
  },
);

// Skema untuk perpanjangan lease PTT (Heartbeat)
export const heartbeatPttSchema = z.object({
  commandId: z.union([z.string().trim().min(1), z.number(), z.bigint()], {
    errorMap: () => ({ message: "commandId wajib diisi" }),
  }),
  extensionSeconds: z.number().int().min(5).max(120).default(30).optional(),
});

// Skema untuk menghentikan transmisi PTT
export const stopPttSchema = z.object({
  commandId: z.union([z.string().trim().min(1), z.number(), z.bigint()], {
    errorMap: () => ({ message: "commandId wajib diisi" }),
  }),
});

// Skema untuk pengiriman pesan TTS
export const dispatchTtsSchema = z.object({
  text: z
    .string({ required_error: "Teks TTS wajib diisi" })
    .trim()
    .min(1, "Teks TTS tidak boleh kosong")
    .max(1000, "Teks TTS maksimal 1000 karakter"),
  language: z.string().trim().max(10).default("id-ID").optional(),
  voice: z.string().trim().max(60).optional(),
  targetType: z.enum(["DEVICE", "ZONE", "GROUP", "ALL"], {
    errorMap: () => ({ message: "targetType harus berupa DEVICE, ZONE, GROUP, atau ALL" }),
  }),
  targetId: z.string().trim().min(1).optional(),
  targetIds: z.array(z.string().trim().min(1)).optional(),
}).refine(
  (data) => {
    if (data.targetType === "ALL") return true;
    return !!(data.targetId || (data.targetIds && data.targetIds.length > 0));
  },
  {
    message: "targetId atau targetIds wajib diisi untuk targetType DEVICE, ZONE, atau GROUP",
    path: ["targetId"],
  },
);

// Skema query riwayat Audio Command
export const listCommandsQuerySchema = z.object({
  kind: z.enum(["PTT", "TTS"]).optional(),
  status: z.enum(["PENDING", "ACTIVE", "SUCCESS", "PARTIAL", "UNCONFIRMED", "FAILED", "CANCELLED", "TIMEOUT"]).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50).optional(),
  offset: z.coerce.number().int().min(0).default(0).optional(),
});
