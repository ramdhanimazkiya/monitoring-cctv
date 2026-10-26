import { Router } from "express";
import { requireAuth, requireRole } from "../../middleware/auth.middleware.js";
import { validateBody, validateQuery } from "../../middleware/validate.js";
import { eventQuerySchema, resolveEventSchema } from "./event.schema.js";
import * as eventController from "./event.controller.js";

const router = Router();

// Endpoint Event & Alarm dapat diakses oleh Admin maupun Operator
router.use(requireAuth, requireRole("ADMIN", "OPERATOR"));

router.get("/stats", eventController.getStats);
router.get("/recap", validateQuery(eventQuerySchema), eventController.getRecap);
router.get("/export", validateQuery(eventQuerySchema), eventController.exportEvents);
router.get("/:id", eventController.getEvent);
router.patch("/:id/acknowledge", eventController.acknowledge);
router.patch("/:id/resolve", validateBody(resolveEventSchema), eventController.resolve);
router.get("/", validateQuery(eventQuerySchema), eventController.listEvents);

export default router;
