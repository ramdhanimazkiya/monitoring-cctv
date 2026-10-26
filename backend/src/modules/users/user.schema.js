import { z } from "zod";

export const createUserSchema = z.object({
  username: z
    .string()
    .trim()
    .toLowerCase()
    .min(3, "Username minimal 3 karakter")
    .max(50, "Username maksimal 50 karakter")
    .regex(/^[a-z0-9_.-]+$/, "Username hanya boleh huruf kecil, angka, garis bawah, titik, dan strip"),
  fullName: z
    .string()
    .trim()
    .min(2, "Nama lengkap minimal 2 karakter")
    .max(120, "Nama lengkap maksimal 120 karakter"),
  email: z
    .string()
    .trim()
    .email("Format email tidak valid")
    .optional()
    .nullable()
    .or(z.literal("")),
  password: z
    .string()
    .min(8, "Password minimal 8 karakter")
    .max(100, "Password maksimal 100 karakter"),
  role: z.enum(["ADMIN", "OPERATOR"]).default("OPERATOR"),
  isActive: z.boolean().default(true),
  zoneIds: z.array(z.string()).optional().default([]),
});

export const updateUserSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Nama lengkap minimal 2 karakter")
    .max(120, "Nama lengkap maksimal 120 karakter")
    .optional(),
  email: z
    .string()
    .trim()
    .email("Format email tidak valid")
    .optional()
    .nullable()
    .or(z.literal("")),
  password: z
    .string()
    .min(8, "Password minimal 8 karakter")
    .max(100, "Password maksimal 100 karakter")
    .optional()
    .nullable()
    .or(z.literal("")),
  role: z.enum(["ADMIN", "OPERATOR"]).optional(),
  isActive: z.boolean().optional(),
  zoneIds: z.array(z.string()).optional(),
});
