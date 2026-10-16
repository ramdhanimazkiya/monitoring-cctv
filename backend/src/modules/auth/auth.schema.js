import { z } from "zod";

/**
 * Skema validasi untuk login pengguna.
 * Username dipaksa huruf kecil sesuai aturan DB (BR-14).
 */
export const loginSchema = z
  .object({
    username: z
      .string({ required_error: "Username wajib diisi" })
      .trim()
      .min(3, "Username minimal 3 karakter")
      .max(50, "Username maksimal 50 karakter")
      .toLowerCase(),
    password: z
      .string({ required_error: "Password wajib diisi" })
      .min(1, "Password wajib diisi"),
  })
  .strict();

/**
 * Skema validasi untuk ubah password.
 */
export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Password saat ini wajib diisi"),
    newPassword: z
      .string()
      .min(12, "Password baru minimal 12 karakter")
      .max(100, "Password baru maksimal 100 karakter"),
  })
  .strict();
