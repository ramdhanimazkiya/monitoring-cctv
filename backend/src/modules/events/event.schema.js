import { z } from "zod";

export const eventQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: z.enum(["ALL", "OFFLINE", "RESOLVED"]).optional(),
  deviceType: z.enum(["ALL", "CAMERA", "AUDIO"]).optional(),
  search: z.string().trim().optional(),
  cameraId: z.string().trim().optional(),
  audioDeviceId: z.string().trim().optional(),
  startDate: z.string().trim().optional(),
  endDate: z.string().trim().optional(),
  format: z.enum(["csv", "json"]).optional(),
});

export const resolveEventSchema = z.object({
  resolutionNote: z.string().trim().max(500, "Catatan maksimal 500 karakter").optional(),
});
