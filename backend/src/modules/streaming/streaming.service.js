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

  const fromStreamStatus = camera.streamStatus;
  const checkResult = await gatewayAdapter.checkStreamAvailability(camera);
  const toStreamStatus = checkResult.status;

  const now = new Date();
  const hasStreamChanged = fromStreamStatus !== toStreamStatus;

  // Aturan Agregasi: Jika hardware ONLINE tetapi stream UNAVAILABLE, tandai WARNING
  if (camera.status === "ONLINE" && toStreamStatus === "UNAVAILABLE" && camera.streamKey) {
    await prisma.camera.update({
      where: { id: camera.id },
      data: {
        status: "WARNING",
        statusReason: "Kamera terhubung, namun video stream tidak tersedia (Stream Unavailable)",
        statusChangedAt: now,
      },
    });

    wsHub.broadcastDeviceStatus({
      deviceId: camera.id,
      deviceType: "CAMERA",
      status: "WARNING",
      previousStatus: "ONLINE",
      timestamp: now,
    });
  }

  // Jika status stream berubah
  if (hasStreamChanged) {
    logger.info(
      `[Stream ${camera.id}] Status stream berubah: ${fromStreamStatus} -> ${toStreamStatus} (${checkResult.reason})`,
    );

    await prisma.camera.update({
      where: { id: camera.id },
      data: {
        streamStatus: toStreamStatus,
      },
    });

    // Broadcast perubahan stream status via WebSocket
    wsHub.broadcastStreamStatus({
      cameraId: camera.id,
      streamStatus: toStreamStatus,
      streamKey: camera.streamKey,
      timestamp: now,
    });

    // Jika stream terputus dari AVAILABLE -> UNAVAILABLE, buat event alarm
    if (fromStreamStatus === "AVAILABLE" && toStreamStatus === "UNAVAILABLE") {
      const event = await prisma.event.create({
        data: {
          type: "STREAM_UNAVAILABLE",
          severity: "WARNING",
          status: "OPEN",
          title: `[${camera.id}] Video Stream Terputus`,
          message: checkResult.reason,
          cameraId: camera.id,
          siteId: camera.siteId,
          zoneId: camera.zoneId,
          dedupKey: `camera:${camera.id}:stream`,
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
    }
  }

  return {
    cameraId: camera.id,
    fromStreamStatus,
    toStreamStatus,
    reason: checkResult.reason,
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

export async function negotiateWhep(streamKey, sdpOffer) {
  if (!streamKey) {
    throw new BadRequestError("Stream key wajib diisi");
  }
  return gatewayAdapter.negotiateWhep(streamKey, sdpOffer);
}
