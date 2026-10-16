import { Router } from "express";
import express from "express";
import { requireAuth } from "../../middleware/auth.middleware.js";
import * as controller from "./streaming.controller.js";

const router = Router();

// Endpoint info & status stream
router.get("/streaming/cameras", controller.listStreams);
router.get("/streaming/cameras/:id", controller.getStream);
router.post("/streaming/cameras/:id/check", requireAuth, controller.checkStream);
router.post("/streaming/cameras/check-all", requireAuth, controller.checkAllStreams);
router.get("/streaming/gateway/status", controller.getGatewayStatus);

// WHEP Protocol Endpoint untuk pemutar WebRTC browser
router.post(
  "/streaming/whep/:streamKey",
  express.text({ type: ["application/sdp", "text/plain", "*/*"] }),
  controller.handleWhep,
);

export default router;
