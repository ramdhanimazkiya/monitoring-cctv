import { Router } from "express";
import { requireAuth, requireRole } from "../../middleware/auth.middleware.js";
import * as controller from "./monitoring.controller.js";

const router = Router();

// Endpoint monitoring status & manual trigger
router.get("/monitoring/status", controller.getStatus);
router.post("/monitoring/check-all", requireAuth, requireRole("ADMIN", "OPERATOR"), controller.checkAll);
router.post("/monitoring/check/:id", requireAuth, requireRole("ADMIN", "OPERATOR"), controller.checkSingle);

export default router;
