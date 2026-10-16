import express from "express";
import { requireAuth, requireRole } from "../../middleware/auth.middleware.js";
import { validateBody, validateQuery } from "../../middleware/validate.js";
import {
  startPttSchema,
  heartbeatPttSchema,
  stopPttSchema,
  dispatchTtsSchema,
  listCommandsQuerySchema,
} from "./paging.schema.js";
import {
  startPttHandler,
  heartbeatPttHandler,
  stopPttHandler,
  dispatchTtsHandler,
  listPagingDevicesHandler,
  listCommandsHandler,
  getCommandHandler,
  getActiveLeasesHandler,
  handleWhipOfferHandler,
  handleWhipDeleteHandler,
} from "./paging.controller.js";

const router = express.Router();

// Parser khusus SDP untuk endpoint WebRTC WHIP
const sdpBodyParser = express.text({ type: ["application/sdp", "text/plain"], limit: "500kb" });

// ---- WHIP WebRTC Audio Ingestion (RFC 9329) ----
router.post("/paging/whip/:channelKey", sdpBodyParser, handleWhipOfferHandler);
router.delete("/paging/whip/:channelKey/session", handleWhipDeleteHandler);

// ---- Manajemen Audio Devices & Active Leases ----
router.get("/paging/devices", requireAuth, requireRole("ADMIN", "OPERATOR"), listPagingDevicesHandler);
router.get("/paging/leases", requireAuth, requireRole("ADMIN", "OPERATOR"), getActiveLeasesHandler);

// ---- Push-to-Talk (PTT) Session Endpoints ----
router.post(
  "/paging/ptt/start",
  requireAuth,
  requireRole("ADMIN", "OPERATOR"),
  validateBody(startPttSchema),
  startPttHandler,
);

router.post(
  "/paging/ptt/heartbeat",
  requireAuth,
  requireRole("ADMIN", "OPERATOR"),
  validateBody(heartbeatPttSchema),
  heartbeatPttHandler,
);

router.post(
  "/paging/ptt/stop",
  requireAuth,
  requireRole("ADMIN", "OPERATOR"),
  validateBody(stopPttSchema),
  stopPttHandler,
);

// ---- Text-to-Speech (TTS) Dispatch ----
router.post(
  "/paging/tts/dispatch",
  requireAuth,
  requireRole("ADMIN", "OPERATOR"),
  validateBody(dispatchTtsSchema),
  dispatchTtsHandler,
);

// ---- Riwayat & Detail Audio Commands ----
router.get(
  "/paging/commands",
  requireAuth,
  requireRole("ADMIN", "OPERATOR"),
  validateQuery(listCommandsQuerySchema),
  listCommandsHandler,
);

router.get(
  "/paging/commands/:id",
  requireAuth,
  requireRole("ADMIN", "OPERATOR"),
  getCommandHandler,
);

export default router;
