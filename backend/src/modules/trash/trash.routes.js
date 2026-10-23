import { Router } from "express";
import { requireAuth, requireRole } from "../../middleware/auth.middleware.js";
import * as controller from "./trash.controller.js";

const router = Router();

// Seluruh rute soft delete / recycle bin hanya dapat diakses oleh ADMIN
router.use(requireAuth, requireRole("ADMIN"));

// Ringkasan
router.get("/summary", controller.getTrashSummary);

// 1. Device Management (Cameras & Audio Devices)
router.get("/devices", controller.listDeletedDevices);
router.post("/devices/:type/:id/restore", controller.restoreDevice);

// 2. Site & Zone
router.get("/sites-zones", controller.listDeletedSitesAndZones);
router.post("/sites/:id/restore", controller.restoreSite);
router.post("/zones/:id/restore", controller.restoreZone);

// 3. User Management
router.get("/users", controller.listDeletedUsers);
router.post("/users/:id/restore", controller.restoreUser);

export default router;
