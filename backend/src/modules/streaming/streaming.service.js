import { prisma } from "../../config/database.js";
import { logger } from "../../utils/logger.js";
import { wsHub } from "../../websocket/hub.js";
import { gatewayAdapter } from "./gateway.adapter.js";
import { NotFoundError, BadRequestError } from "../../utils/errors.js";

/**
 * Service untuk orkestrasi integrasi streaming CCTV, pemisahan status, dan gateway.
 */
export async function listCameraStreams(query = {}) {
  const where = { deletedAt: null };
  if (query.siteId) where.siteId = query.siteId;
  if (query.zoneId) where.zoneId = query.zoneId;
  if (query.status) where.status = query.status;
  if (query.streamStatus) where.streamStatus = query.streamStatus;

  const cameras = await prisma.camera.findMany({
    where,
    include: {
      site: { select: { id: true, name: true } },
      zone: { select: { id: true, name: true } },
    },
    orderBy: { id: "asc" },
  });

  return cameras.map((camera) => {
    const urls = gatewayAdapter.resolveStreamUrls(camera.streamKey, camera.adapterConfig);
    const streamUrl = camera.adapterConfig?.streamUrl || (camera.streamKey?.startsWith("http") ? camera.streamKey : null);
    return {
      id: camera.id,
      name: camera.name,
      siteId: camera.siteId,
      siteName: camera.site?.name,
      zoneId: camera.zoneId,
      zoneName: camera.zone?.name,
      hardwareStatus: camera.status,
      streamStatus: camera.streamStatus,
      streamKey: camera.streamKey,
      streamUrl,
      isDemo: camera.isDemo,
      urls,
    };
  });
}

export async function getCameraStream(cameraId) {
  const camera = await prisma.camera.findFirst({
    where: { id: cameraId, deletedAt: null },
    include: {
      site: { select: { id: true, name: true } },
      zone: { select: { id: true, name: true } },
    },
  });

  if (!camera) {
    throw new NotFoundError(`Kamera dengan ID ${cameraId} tidak ditemukan`);
  }

  const urls = gatewayAdapter.resolveStreamUrls(camera.streamKey, camera.adapterConfig);
  const streamCheck = await gatewayAdapter.checkStreamAvailability(camera);
  const streamUrl = camera.adapterConfig?.streamUrl || (camera.streamKey?.startsWith("http") ? camera.streamKey : null);

  return {
    id: camera.id,
    name: camera.name,
    siteId: camera.siteId,
    siteName: camera.site?.name,
    zoneId: camera.zoneId,
    zoneName: camera.zone?.name,
    hardwareStatus: camera.status,
    streamStatus: camera.streamStatus,
    streamKey: camera.streamKey,
    streamUrl,
    adapterType: camera.adapterType,
    isDemo: camera.isDemo,
    urls,
    streamCheck,
  };
}

/**
 * Memeriksa dan memperbarui status stream satu kamera di database.
 * Menerapkan aturan agregasi: jika hardware online tapi stream mati -> hardware status jadi WARNING.
 */
export async function checkCameraStream(cameraOrId) {
  let camera = cameraOrId;
  if (typeof cameraOrId === "string") {
    camera = await prisma.camera.findFirst({
      where: { id: cameraOrId, deletedAt: null },
    });
  }

  if (!camera) return null;

  const fromStatus = camera.status;
  const fromStreamStatus = camera.streamStatus;
  const checkResult = await gatewayAdapter.checkStreamAvailability(camera);
  let toStreamStatus = checkResult.status;
  if (camera.status === "OFFLINE") {
    toStreamStatus = "UNAVAILABLE";
  }

  // IMPORTANT: Status ONLINE/OFFLINE setiap kamera mencerminkan apakah sumber video
  // CCTV masih aktif, BUKAN apakah server MediaMTX dapat di-ping.
  let toStatus = fromStatus;
  if (camera.adapterConfig?.simulateVideoLoss === true) {
    toStatus = "WARNING";
    toStreamStatus = "UNAVAILABLE";
  } else if (toStreamStatus === "AVAILABLE") {
    toStatus = "ONLINE";
  } else if (toStreamStatus === "UNAVAILABLE") {
    toStatus = "OFFLINE";
  } else if (toStreamStatus === "NOT_CONFIGURED") {
    toStatus = "UNKNOWN";
  }

  const now = new Date();
  const hasStatusChanged = fromStatus !== toStatus;
  const hasStreamChanged = fromStreamStatus !== toStreamStatus;
  const statusReason = checkResult.reason;

  // Selalu update record kamera dengan status aktual sumber video
  await prisma.camera.update({
    where: { id: camera.id },
    data: {
      status: toStatus,
      streamStatus: toStreamStatus,
      statusReason,
      lastCheckedAt: now,
      ...(toStatus === "ONLINE" && { lastSeenAt: now }),
      ...(hasStatusChanged && { statusChangedAt: now }),
    },
  });

  // Jika status kamera berubah (ONLINE <-> OFFLINE <-> UNKNOWN)
  if (hasStatusChanged) {
    logger.info(
      `[Kamera ${camera.id}] Perubahan status: ${fromStatus} -> ${toStatus} (${statusReason})`,
    );

    // 1. Catat ke device_status_history
    try {
      await prisma.deviceStatusHistory.create({
        data: {
          cameraId: camera.id,
          fromStatus,
          toStatus,
          reason: statusReason,
          latencyMs: checkResult.latencyMs || null,
          detail: checkResult.telemetry || null,
          occurredAt: now,
        },
      });
    } catch (err) {
      logger.warn({ err }, "Gagal mencatat device_status_history");
    }

    // 2. Broadcast via WebSocket Hub
    wsHub.broadcastDeviceStatus({
      deviceId: camera.id,
      deviceType: "CAMERA",
      status: toStatus,
      previousStatus: fromStatus,
      timestamp: now,
    });

    // 3. Jika kamera berubah menjadi OFFLINE (kamera dimatikan / stream putus), buat Alarm Insiden OFFLINE
    if (toStatus === "OFFLINE") {
      try {
        const event = await prisma.event.create({
          data: {
            type: "DEVICE_STATUS_CHANGE",
            severity: "CRITICAL",
            status: "OPEN",
            title: `[${camera.id}] ${camera.name} OFFLINE (Sumber Video CCTV Mati)`,
            message: statusReason || "Sumber video CCTV tidak aktif / kamera mati",
            cameraId: camera.id,
            siteId: camera.siteId,
            zoneId: camera.zoneId,
            dedupKey: `camera:${camera.id}:offline`,
            occurredAt: now,
          },
        });

        wsHub.broadcastEventAlarm({
          id: String(event.id),
          type: event.type,
          severity: event.severity,
          status: event.status,
          title: event.title,
          message: event.message,
          deviceId: camera.id,
          timestamp: now,
        });
      } catch (err) {
        logger.warn({ err }, "Gagal membuat alarm OFFLINE kamera");
      }
    }

    // 4. Jika pulih kembali ONLINE, otomatis selesaikan (RESOLVED) alarm
    if (toStatus === "ONLINE" && fromStatus === "OFFLINE") {
      try {
        await prisma.event.updateMany({
          where: {
            status: { in: ["OPEN", "ACKNOWLEDGED"] },
            cameraId: camera.id,
          },
          data: {
            status: "RESOLVED",
            resolvedAt: now,
            resolutionNote: "Sumber video CCTV pulih kembali ONLINE (Stream aktif)",
          },
        });
      } catch (err) {
        logger.warn({ err }, "Gagal menyelesaikan alarm pulih kamera");
      }
    }
  }

  // Jika status stream berubah, broadcast stream status
  if (hasStreamChanged) {
    wsHub.broadcastStreamStatus({
      cameraId: camera.id,
      streamStatus: toStreamStatus,
      streamKey: camera.streamKey,
      timestamp: now,
    });
  }

  return {
    cameraId: camera.id,
    status: toStatus,
    streamStatus: toStreamStatus,
    toStreamStatus,
    reason: statusReason,
    latencyMs: checkResult.latencyMs || 0,
    telemetry: checkResult.telemetry || null,
  };
}

/**
 * Memeriksa seluruh kamera aktif.
 */
export async function checkAllCameraStreams() {
  const cameras = await prisma.camera.findMany({
    where: { isActive: true, deletedAt: null },
  });

  const results = [];
  for (const cam of cameras) {
    results.push(await checkCameraStream(cam));
  }
  return results;
}

export async function getGatewayStatus() {
  return gatewayAdapter.getGatewayHealth();
}

export async function getGatewayPaths() {
  return gatewayAdapter.getPathsList();
}

export async function getGatewayPath(pathName) {
  return gatewayAdapter.getPath(pathName);
}

export async function negotiateWhep(streamKey, sdpOffer) {
  if (!streamKey) {
    throw new BadRequestError("Stream key wajib diisi");
  }
  return gatewayAdapter.negotiateWhep(streamKey, sdpOffer);
}

/**
 * Sinkronisasi status stream dari klien video player (WebRTC / HLS).
 * Ketika player di frontend memutar video -> ONLINE.
 * Ketika player di frontend mengalami error / stream putus -> OFFLINE.
 */
export async function syncStreamStatus(cameraId, payload = {}) {
  const camera = await prisma.camera.findFirst({
    where: { id: cameraId, deletedAt: null },
  });
  if (!camera) return null;

  const toStatus = payload.status === "ONLINE" ? "ONLINE" : payload.status === "UNKNOWN" ? "UNKNOWN" : "OFFLINE";
  const toStreamStatus = toStatus === "ONLINE" ? "AVAILABLE" : toStatus === "UNKNOWN" ? "NOT_CONFIGURED" : "UNAVAILABLE";
  const statusReason =
    payload.reason ||
    (toStatus === "ONLINE"
      ? "Sumber video CCTV aktif dan mengalirkan frame video"
      : "Sumber video CCTV mati / kamera tidak mengirim sinyal video");

  const fromStatus = camera.status;
  const hasStatusChanged = fromStatus !== toStatus;
  const now = new Date();

  await prisma.camera.update({
    where: { id: camera.id },
    data: {
      status: toStatus,
      streamStatus: toStreamStatus,
      statusReason,
      lastCheckedAt: now,
      ...(toStatus === "ONLINE" && { lastSeenAt: now, consecutiveFailures: 0 }),
      ...(toStatus === "OFFLINE" && { consecutiveFailures: camera.consecutiveFailures + 1 }),
      ...(hasStatusChanged && { statusChangedAt: now }),
    },
  });

  if (hasStatusChanged) {
    logger.info(`[Kamera ${camera.id}] Status diperbarui: ${fromStatus} -> ${toStatus} (${statusReason})`);

    try {
      await prisma.deviceStatusHistory.create({
        data: {
          cameraId: camera.id,
          fromStatus,
          toStatus,
          reason: statusReason,
          latencyMs: payload.latencyMs || (toStatus === "ONLINE" ? 18 : null),
          occurredAt: now,
        },
      });
    } catch (err) {
      logger.warn({ err }, "Gagal mencatat status history");
    }

    wsHub.broadcastDeviceStatus({
      deviceId: camera.id,
      deviceType: "CAMERA",
      status: toStatus,
      previousStatus: fromStatus,
      timestamp: now,
    });

    if (toStatus === "OFFLINE") {
      try {
        const event = await prisma.event.create({
          data: {
            type: "DEVICE_STATUS_CHANGE",
            severity: "CRITICAL",
            status: "OPEN",
            title: `[${camera.id}] ${camera.name} OFFLINE (Kamera CCTV Mati)`,
            message: statusReason,
            cameraId: camera.id,
            siteId: camera.siteId,
            zoneId: camera.zoneId,
            dedupKey: `camera:${camera.id}:offline`,
            occurredAt: now,
          },
        });

        wsHub.broadcastEventAlarm({
          id: String(event.id),
          type: event.type,
          severity: event.severity,
          status: event.status,
          title: event.title,
          message: event.message,
          deviceId: camera.id,
          timestamp: now,
        });
      } catch (err) {
        // ignore
      }
    } else if (toStatus === "ONLINE" && fromStatus === "OFFLINE") {
      try {
        await prisma.event.updateMany({
          where: {
            status: { in: ["OPEN", "ACKNOWLEDGED"] },
            cameraId: camera.id,
          },
          data: {
            status: "RESOLVED",
            resolvedAt: now,
            resolutionNote: "Kamera CCTV kembali ONLINE (Stream aktif)",
          },
        });
      } catch (err) {
        // ignore
      }
    }
  }

  return {
    cameraId: camera.id,
    status: toStatus,
    streamStatus: toStreamStatus,
    reason: statusReason,
  };
}
