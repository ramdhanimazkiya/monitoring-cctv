import { z } from "zod";

export const auditQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  action: z.string().trim().optional(),
  result: z.enum(["SUCCESS", "FAILURE"]).optional(),
  entityType: z.string().trim().optional(),
  search: z.string().trim().optional(),
  startDate: z.string().trim().optional(),
  endDate: z.string().trim().optional(),
  format: z.enum(["csv", "json"]).optional(),
});
