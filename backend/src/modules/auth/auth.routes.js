import { Router } from "express";
import { authRateLimiter } from "../../middleware/rate-limiter.js";
import { validateBody } from "../../middleware/validate.js";
import { requireAuth } from "../../middleware/auth.middleware.js";
import { loginSchema, changePasswordSchema } from "./auth.schema.js";
import * as authController from "./auth.controller.js";

const router = Router();

// Endpoint publik (dibatasi rate limiter ketat untuk mencegah brute-force)
router.post("/login", authRateLimiter, validateBody(loginSchema), authController.login);

// Endpoint terproteksi (memerlukan autentikasi sesi aktif)
router.post("/logout", requireAuth, authController.logout);
router.get("/me", requireAuth, authController.me);
router.get("/cctv-token", requireAuth, authController.getCctvToken);
router.post("/change-password", requireAuth, validateBody(changePasswordSchema), authController.changePassword);

export default router;
