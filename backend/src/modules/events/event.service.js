import { prisma } from "../../config/database.js";
import { recordAuditLog } from "../../services/audit.service.js";
import { NotFoundError, BadRequestError } from "../../utils/errors.js";

function formatEvent(e) {
  if (!e) return null;
  const targetDevice = e.camera
    ? { type: "camera", id: e.camera.id, name: e.camera.name, status: e.camera.status }
    : e.audioDevice
    ? { type: "audio", id: e.audioDevice.id, name: e.audioDevice.name, status: e.audioDevice.status }
    : null;

  const isResolved = e.status === "RESOLVED";

  return {
    id: e.id.toString(),
    type: e.type,
    severity: isResolved ? "RESOLVED" : "CRITICAL",
    status: isResolved ? "RESOLVED" : "OFFLINE",
    rawStatus: e.status,
    title: e.title,
    message: e.message,
    cameraId: e.cameraId,
    audioDeviceId: e.audioDeviceId,
    targetDevice,
    siteId: e.siteId,
    siteName: e.site?.name || null,
    zoneId: e.zoneId,
    zoneName: e.zone?.name || null,
    statusHistoryId: e.statusHistoryId ? e.statusHistoryId.toString() : null,
    dedupKey: e.dedupKey,
    detail: e.detail,
    occurredAt: e.occurredAt.toISOString(),
    acknowledgedById: e.acknowledgedById,
    acknowledgedByName: e.acknowledgedBy?.fullName || e.acknowledgedBy?.username || null,
    acknowledgedAt: e.acknowledgedAt ? e.acknowledgedAt.toISOString() : null,
    resolvedById: e.resolvedById,
    resolvedByName: e.resolvedBy?.fullName || e.resolvedBy?.username || null,
    resolvedAt: e.resolvedAt ? e.resolvedAt.toISOString() : null,
    resolutionNote: e.resolutionNote,
    createdAt: e.createdAt.toISOString(),
  };
}

export async function listEvents(params = {}) {
  const page = Math.max(1, Number(params.page) || 1);
  const maxLimit = params.isExport ? 10000 : 100;
  const limit = Math.min(maxLimit, Math.max(1, Number(params.limit) || 20));
  const skip = (page - 1) * limit;

  // Filter inti: Hanya rekaman insiden OFFLINE dan RESOLVED
  const baseCondition = {
    OR: [
      { title: { contains: "OFFLINE", mode: "insensitive" } },
      { message: { contains: "OFFLINE", mode: "insensitive" } },
      { status: "RESOLVED" },
    ],
  };

  const andConditions = [baseCondition];

  // Filter spesifik berdasarkan Status (OFFLINE vs RESOLVED)
  if (params.status === "OFFLINE") {
    andConditions.push({
      status: { not: "RESOLVED" },
      OR: [
        { title: { contains: "OFFLINE", mode: "insensitive" } },
        { message: { contains: "OFFLINE", mode: "insensitive" } },
      ],
    });
  } else if (params.status === "RESOLVED") {
    andConditions.push({ status: "RESOLVED" });
  }

  // Filter tipe perangkat
  if (params.deviceType === "CAMERA") {
    andConditions.push({ cameraId: { not: null } });
  } else if (params.deviceType === "AUDIO") {
    andConditions.push({ audioDeviceId: { not: null } });
  }

  if (params.cameraId) {
    andConditions.push({ cameraId: params.cameraId });
  }

  if (params.audioDeviceId) {
    andConditions.push({ audioDeviceId: params.audioDeviceId });
  }

  if (params.startDate || params.endDate) {
    const dateFilter = {};
    if (params.startDate) {
      dateFilter.gte = new Date(params.startDate);
    }
    if (params.endDate) {
      const end = new Date(params.endDate);
      if (params.endDate.length <= 10) {
        end.setHours(23, 59, 59, 999);
      }
      dateFilter.lte = end;
    }
    andConditions.push({ occurredAt: dateFilter });
  }

  if (params.search && params.search.trim()) {
    const q = params.search.trim();
    andConditions.push({
      OR: [
        { title: { contains: q, mode: "insensitive" } },
        { message: { contains: q, mode: "insensitive" } },
        { cameraId: { contains: q, mode: "insensitive" } },
        { audioDeviceId: { contains: q, mode: "insensitive" } },
        { resolutionNote: { contains: q, mode: "insensitive" } },
      ],
    });
  }

  const where = { AND: andConditions };

  const [total, events] = await Promise.all([
    prisma.event.count({ where }),
    prisma.event.findMany({
      where,
      include: {
        camera: { select: { id: true, name: true, status: true } },
        audioDevice: { select: { id: true, name: true, status: true } },
        site: { select: { id: true, name: true } },
        zone: { select: { id: true, name: true } },
        acknowledgedBy: { select: { id: true, username: true, fullName: true } },
        resolvedBy: { select: { id: true, username: true, fullName: true } },
      },
      orderBy: { occurredAt: "desc" },
      skip,
      take: limit,
    }),
  ]);

  return {
    events: events.map(formatEvent),
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
}

export async function getEventById(id) {
  let bigId;
  try {
    bigId = BigInt(id);
  } catch {
    throw new NotFoundError(`ID Event tidak valid: ${id}`);
  }

  const event = await prisma.event.findUnique({
    where: { id: bigId },
    include: {
      camera: { select: { id: true, name: true, status: true } },
      audioDevice: { select: { id: true, name: true, status: true } },
      site: { select: { id: true, name: true } },
      zone: { select: { id: true, name: true } },
      acknowledgedBy: { select: { id: true, username: true, fullName: true } },
      resolvedBy: { select: { id: true, username: true, fullName: true } },
    },
  });

  if (!event) {
    throw new NotFoundError(`Event dengan ID ${id} tidak ditemukan`);
  }

  return formatEvent(event);
}

export async function acknowledgeEvent(id, user, req) {
  let bigId;
  try {
    bigId = BigInt(id);
  } catch {
    throw new NotFoundError(`ID Event tidak valid: ${id}`);
  }

  const existing = await prisma.event.findUnique({ where: { id: bigId } });
  if (!existing) {
    throw new NotFoundError(`Event dengan ID ${id} tidak ditemukan`);
  }

  if (existing.status === "RESOLVED") {
    throw new BadRequestError("Event sudah berstatus RESOLVED dan tidak perlu di-acknowledge lagi");
  }

  const now = new Date();
  const updated = await prisma.event.update({
    where: { id: bigId },
    data: {
      status: "ACKNOWLEDGED",
      acknowledgedById: user.id,
      acknowledgedAt: now,
    },
    include: {
      camera: { select: { id: true, name: true, status: true } },
      audioDevice: { select: { id: true, name: true, status: true } },
      site: { select: { id: true, name: true } },
      zone: { select: { id: true, name: true } },
      acknowledgedBy: { select: { id: true, username: true, fullName: true } },
      resolvedBy: { select: { id: true, username: true, fullName: true } },
    },
  });

  await recordAuditLog({
    userId: user.id,
    actorUsername: user.username,
    action: "EVENT_ACKNOWLEDGED",
    entityType: "event",
    entityId: String(id),
    message: `Alarm event #${id} di-acknowledge oleh @${user.username}`,
    before: { status: existing.status },
    after: { status: "ACKNOWLEDGED", acknowledgedAt: now },
    req,
  });

  return formatEvent(updated);
}

export async function resolveEvent(id, user, resolutionNote, req) {
  let bigId;
  try {
    bigId = BigInt(id);
  } catch {
    throw new NotFoundError(`ID Event tidak valid: ${id}`);
  }

  const existing = await prisma.event.findUnique({ where: { id: bigId } });
  if (!existing) {
    throw new NotFoundError(`Event dengan ID ${id} tidak ditemukan`);
  }

  const now = new Date();
  const note = resolutionNote?.trim() || "Insiden telah ditangani dan dinyatakan RESOLVED oleh operator";

  const updated = await prisma.event.update({
    where: { id: bigId },
    data: {
      status: "RESOLVED",
      resolvedById: user.id,
      resolvedAt: now,
      resolutionNote: note,
    },
    include: {
      camera: { select: { id: true, name: true, status: true } },
      audioDevice: { select: { id: true, name: true, status: true } },
      site: { select: { id: true, name: true } },
      zone: { select: { id: true, name: true } },
      acknowledgedBy: { select: { id: true, username: true, fullName: true } },
      resolvedBy: { select: { id: true, username: true, fullName: true } },
    },
  });

  await recordAuditLog({
    userId: user.id,
    actorUsername: user.username,
    action: "EVENT_RESOLVED",
    entityType: "event",
    entityId: String(id),
    message: `Alarm event #${id} diselesaikan (RESOLVED): ${note}`,
    before: { status: existing.status },
    after: { status: "RESOLVED", resolvedAt: now, resolutionNote: note },
    req,
  });

  return formatEvent(updated);
}

export async function getEventStats() {
  const baseCondition = {
    OR: [
      { title: { contains: "OFFLINE", mode: "insensitive" } },
      { message: { contains: "OFFLINE", mode: "insensitive" } },
      { status: "RESOLVED" },
    ],
  };

  const [
    total,
    offlineActiveCount,
    resolvedCount,
    cameraCount,
    audioCount,
    cameraOfflineCount,
    audioOfflineCount,
    recap,
  ] = await Promise.all([
    prisma.event.count({ where: baseCondition }),
    prisma.event.count({
      where: {
        AND: [
          baseCondition,
          { status: { not: "RESOLVED" } },
          {
            OR: [
              { title: { contains: "OFFLINE", mode: "insensitive" } },
              { message: { contains: "OFFLINE", mode: "insensitive" } },
            ],
          },
        ],
      },
    }),
    prisma.event.count({
      where: {
        AND: [baseCondition, { status: "RESOLVED" }],
      },
    }),
    prisma.event.count({
      where: {
        AND: [baseCondition, { cameraId: { not: null } }],
      },
    }),
    prisma.event.count({
      where: {
        AND: [baseCondition, { audioDeviceId: { not: null } }],
      },
    }),
    prisma.event.count({
      where: {
        AND: [
          baseCondition,
          { cameraId: { not: null } },
          { status: { not: "RESOLVED" } },
          {
            OR: [
              { title: { contains: "OFFLINE", mode: "insensitive" } },
              { message: { contains: "OFFLINE", mode: "insensitive" } },
            ],
          },
        ],
      },
    }),
    prisma.event.count({
      where: {
        AND: [
          baseCondition,
          { audioDeviceId: { not: null } },
          { status: { not: "RESOLVED" } },
          {
            OR: [
              { title: { contains: "OFFLINE", mode: "insensitive" } },
              { message: { contains: "OFFLINE", mode: "insensitive" } },
            ],
          },
        ],
      },
    }),
    getSystemRecap(),
  ]);

  return {
    total,
    offlineActiveCount,
    resolvedCount,
    cameraCount,
    audioCount,
    cameraOfflineCount,
    audioOfflineCount,
    recap,
  };
}

export async function getSystemRecap(params = {}) {
  const commandDateFilter = {};
  if (params.startDate) {
    commandDateFilter.gte = new Date(params.startDate);
  }
  if (params.endDate) {
    const end = new Date(params.endDate);
    if (params.endDate.length <= 10) {
      end.setHours(23, 59, 59, 999);
    }
    commandDateFilter.lte = end;
  }

  const hasDateFilter = Boolean(params.startDate || params.endDate);
  const commandWhereDate = hasDateFilter ? { requestedAt: commandDateFilter } : {};

  const [totalCameras, onlineCameras, offlineCameras, pttCount] = await Promise.all([
    prisma.camera.count({ where: { deletedAt: null } }),
    prisma.camera.count({ where: { deletedAt: null, status: "ONLINE" } }),
    prisma.camera.count({ where: { deletedAt: null, status: "OFFLINE" } }),
    prisma.audioCommand.count({
      where: {
        AND: [{ kind: "PTT" }, commandWhereDate],
      },
    }),
  ]);

  const onlinePercent =
    totalCameras > 0 ? Number(((onlineCameras / totalCameras) * 100).toFixed(1)) : 100.0;
  const offlinePercent =
    totalCameras > 0 ? Number((100 - onlinePercent).toFixed(1)) : 0.0;

  return {
    cctv: {
      onlinePercent,
      offlinePercent,
    },
    audio: {
      totalPtt: pttCount,
      totalSessions: pttCount,
    },
  };
}

export async function exportEvents(params = {}) {
  const result = await listEvents({ ...params, page: 1, limit: 5000, isExport: true });
  return result.events;
}
