import { Router } from "express";
import express from "express";
import { requireAuth } from "../../middleware/auth.middleware.js";
import * as controller from "./streaming.controller.js";

const router = Router();

// Endpoint info & status stream
router.get("/streaming/cameras", controller.listStreams);
router.get("/streaming/cameras/:id", controller.getStream);
router.get("/streaming/cameras/:id/check", requireAuth, controller.checkStream);
router.post("/streaming/cameras/:id/check", requireAuth, controller.checkStream);
router.post("/streaming/cameras/:id/status-sync", requireAuth, controller.syncStreamStatus);
router.get("/streaming/cameras/check-all", requireAuth, controller.checkAllStreams);
router.post("/streaming/cameras/check-all", requireAuth, controller.checkAllStreams);
router.get("/streaming/gateway/status", controller.getGatewayStatus);
router.get("/streaming/gateway/paths", controller.getGatewayPaths);
router.get(/^\/streaming\/gateway\/paths\/get\/(.+)$/, controller.getGatewayPath);

// WHEP Protocol Endpoint untuk pemutar WebRTC browser (mendukung streamKey dengan slash)
router.post(
  /^\/streaming\/whep\/(.+)$/,
  express.text({ type: ["application/sdp", "text/plain", "*/*"] }),
  controller.handleWhep,
);

export default router;
