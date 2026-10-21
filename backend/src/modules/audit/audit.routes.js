import { Router } from "express";
import { requireAuth, requireRole } from "../../middleware/auth.middleware.js";
import { validateQuery } from "../../middleware/validate.js";
import { auditQuerySchema } from "./audit.schema.js";
import * as auditController from "./audit.controller.js";

const router = Router();

// Endpoint audit trail hanya dapat diakses oleh akun Administrator (ADMIN)
router.use(requireAuth, requireRole("ADMIN"));

router.get("/stats", auditController.getStats);
router.get("/export", validateQuery(auditQuerySchema), auditController.exportLogs);
router.get("/:id", auditController.getLog);
router.get("/", validateQuery(auditQuerySchema), auditController.listLogs);

export default router;
