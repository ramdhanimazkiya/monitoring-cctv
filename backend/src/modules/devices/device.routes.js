import { Router } from "express";
import { requireAuth, requireRole } from "../../middleware/auth.middleware.js";
import { validateBody, validateQuery } from "../../middleware/validate.js";
import {
  createSiteSchema,
  updateSiteSchema,
  createZoneSchema,
  updateZoneSchema,
  createCameraSchema,
  updateCameraSchema,
  createAudioDeviceSchema,
  updateAudioDeviceSchema,
  deviceQuerySchema,
} from "./device.schema.js";
import * as controller from "./device.controller.js";

const router = Router();

// ---- STATS & HISTORY ----
router.get("/devices/stats", controller.getStats);
router.get("/devices/:id/history", controller.getHistory);

// ---- SITES ----
router.get("/sites", controller.listSites);
router.get("/sites/:id", controller.getSite);
router.post("/sites", requireAuth, requireRole("ADMIN"), validateBody(createSiteSchema), controller.createSite);
router.patch("/sites/:id", requireAuth, requireRole("ADMIN"), validateBody(updateSiteSchema), controller.updateSite);
router.delete("/sites/:id", requireAuth, requireRole("ADMIN"), controller.deleteSite);

// ---- ZONES ----
router.get("/zones", controller.listZones);
router.get("/zones/:id", controller.getZone);
router.post("/zones", requireAuth, requireRole("ADMIN"), validateBody(createZoneSchema), controller.createZone);
router.patch("/zones/:id", requireAuth, requireRole("ADMIN"), validateBody(updateZoneSchema), controller.updateZone);
router.delete("/zones/:id", requireAuth, requireRole("ADMIN"), controller.deleteZone);

// ---- CAMERAS ----
router.get("/cameras", validateQuery(deviceQuerySchema), controller.listCameras);
router.get("/cameras/:id", controller.getCamera);
router.post("/cameras", requireAuth, requireRole("ADMIN"), validateBody(createCameraSchema), controller.createCamera);
router.patch("/cameras/:id", requireAuth, requireRole("ADMIN"), validateBody(updateCameraSchema), controller.updateCamera);
router.delete("/cameras/:id", requireAuth, requireRole("ADMIN"), controller.deleteCamera);

// ---- AUDIO DEVICES ----
router.get("/audio-devices", validateQuery(deviceQuerySchema), controller.listAudioDevices);
router.get("/audio-devices/:id", controller.getAudioDevice);
router.post("/audio-devices", requireAuth, requireRole("ADMIN"), validateBody(createAudioDeviceSchema), controller.createAudioDevice);
router.patch("/audio-devices/:id", requireAuth, requireRole("ADMIN"), validateBody(updateAudioDeviceSchema), controller.updateAudioDevice);
router.delete("/audio-devices/:id", requireAuth, requireRole("ADMIN"), controller.deleteAudioDevice);

export default router;
