import { prisma } from "../../config/database.js";
import { recordAuditLog } from "../../services/audit.service.js";
import { NotFoundError, BadRequestError } from "../../utils/errors.js";
import { logger } from "../../utils/logger.js";

/**
 * Ringkasan jumlah item yang berada di tempat sampah (soft-deleted)
 */
export async function getTrashSummary() {
  const [camerasCount, audioCount, sitesCount, zonesCount, usersCount] = await Promise.all([
    prisma.camera.count({ where: { deletedAt: { not: null } } }),
    prisma.audioDevice.count({ where: { deletedAt: { not: null } } }),
    prisma.site.count({ where: { deletedAt: { not: null } } }),
    prisma.zone.count({ where: { deletedAt: { not: null } } }),
    prisma.user.count({ where: { deletedAt: { not: null } } }),
  ]);

  const devicesCount = camerasCount + audioCount;
  const sitesZonesCount = sitesCount + zonesCount;
  const totalCount = devicesCount + sitesZonesCount + usersCount;

  return {
    camerasCount,
    audioCount,
    devicesCount,
    sitesCount,
    zonesCount,
    sitesZonesCount,
    usersCount,
    totalCount,
  };
}

/**
 * 1. PERANGKAT (CAMERAS & AUDIO DEVICES)
 */
export async function listDeletedDevices() {
  const [cameras, audioDevices] = await Promise.all([
    prisma.camera.findMany({
      where: { deletedAt: { not: null } },
      include: {
        site: { select: { id: true, name: true, deletedAt: true } },
        zone: { select: { id: true, name: true, deletedAt: true } },
      },
      orderBy: { deletedAt: "desc" },
    }),
    prisma.audioDevice.findMany({
      where: { deletedAt: { not: null } },
      include: {
        site: { select: { id: true, name: true, deletedAt: true } },
        zone: { select: { id: true, name: true, deletedAt: true } },
      },
      orderBy: { deletedAt: "desc" },
    }),
  ]);

  const normalizedCameras = cameras.map((c) => ({
    ...c,
    deviceType: "CCTV",
    streamUrl: c.adapterConfig?.streamUrl || null,
  }));

  const normalizedAudio = audioDevices.map((a) => ({
    ...a,
    deviceType: "AUDIO",
    whipUrl: a.adapterConfig?.whipUrl || null,
  }));

  return {
    cameras: normalizedCameras,
    audioDevices: normalizedAudio,
    total: normalizedCameras.length + normalizedAudio.length,
  };
}

export async function restoreDevice(type, id, userId, req) {
  const upperType = (type || "").toUpperCase();

  if (upperType === "CCTV" || upperType === "CAMERA" || id.startsWith("CAM-")) {
    const existing = await prisma.camera.findUnique({
      where: { id },
      include: { site: true, zone: true },
    });

    if (!existing || !existing.deletedAt) {
      throw new NotFoundError(`Kamera dengan ID ${id} tidak ditemukan di tempat sampah`);
    }

    if (existing.site && existing.site.deletedAt) {
      throw new BadRequestError(
        `Site ${existing.siteId} (${existing.site.name}) masih diarsipkan. Pulihkan Site tersebut terlebih dahulu.`,
      );
    }

    // Jika zonanya masih diarsipkan, set zoneId menjadi null (Option A) agar kamera tetap dapat dipulihkan
    let targetZoneId = existing.zoneId;
    if (existing.zone && existing.zone.deletedAt) {
      targetZoneId = null;
    }

    const restored = await prisma.camera.update({
      where: { id },
      data: {
        deletedAt: null,
        isActive: true,
        zoneId: targetZoneId,
      },
      include: {
        site: { select: { id: true, name: true } },
        zone: { select: { id: true, name: true } },
      },
    });

    await recordAuditLog({
      userId,
      action: "CAMERA_RESTORED",
      entityType: "camera",
      entityId: id,
      before: existing,
      after: restored,
      req,
    });

    return restored;
  }

  if (upperType === "AUDIO" || id.startsWith("AUD-")) {
    const existing = await prisma.audioDevice.findUnique({
      where: { id },
      include: { site: true, zone: true },
    });

    if (!existing || !existing.deletedAt) {
      throw new NotFoundError(`Perangkat audio dengan ID ${id} tidak ditemukan di tempat sampah`);
    }

    if (existing.site && existing.site.deletedAt) {
      throw new BadRequestError(
        `Site ${existing.siteId} (${existing.site.name}) masih diarsipkan. Pulihkan Site tersebut terlebih dahulu.`,
      );
    }

    let targetZoneId = existing.zoneId;
    if (existing.zone && existing.zone.deletedAt) {
      targetZoneId = null;
    }

    const restored = await prisma.audioDevice.update({
      where: { id },
      data: {
        deletedAt: null,
        isActive: true,
        zoneId: targetZoneId,
      },
      include: {
        site: { select: { id: true, name: true } },
        zone: { select: { id: true, name: true } },
      },
    });

    await recordAuditLog({
      userId,
      action: "AUDIO_DEVICE_RESTORED",
      entityType: "audio_device",
      entityId: id,
      before: existing,
      after: restored,
      req,
    });

    return restored;
  }

  throw new BadRequestError(`Tipe perangkat tidak dikenal: ${type}`);
}

/**
 * 2. SITE & ZONE
 */
export async function listDeletedSitesAndZones() {
  const [sites, zones] = await Promise.all([
    prisma.site.findMany({
      where: { deletedAt: { not: null } },
      include: {
        _count: {
          select: { zones: true, cameras: true, audioDevices: true },
        },
      },
      orderBy: { deletedAt: "desc" },
    }),
    prisma.zone.findMany({
      where: { deletedAt: { not: null } },
      include: {
        site: { select: { id: true, name: true, deletedAt: true } },
        _count: {
          select: { cameras: true, audioDevices: true },
        },
      },
      orderBy: { deletedAt: "desc" },
    }),
  ]);

  return {
    sites,
    zones,
    total: sites.length + zones.length,
  };
}

export async function restoreSite(id, userId, req) {
  const existing = await prisma.site.findUnique({
    where: { id },
  });

  if (!existing || !existing.deletedAt) {
    throw new NotFoundError(`Site dengan ID ${id} tidak ditemukan di tempat sampah`);
  }

  const restored = await prisma.site.update({
    where: { id },
    data: {
      deletedAt: null,
      isActive: true,
    },
  });

  await recordAuditLog({
    userId,
    action: "SITE_RESTORED",
    entityType: "site",
    entityId: id,
    before: existing,
    after: restored,
    req,
  });

  return restored;
}

export async function restoreZone(id, userId, req) {
  const existing = await prisma.zone.findUnique({
    where: { id },
    include: { site: true },
  });

  if (!existing || !existing.deletedAt) {
    throw new NotFoundError(`Zona dengan ID ${id} tidak ditemukan di tempat sampah`);
  }

  if (existing.site && existing.site.deletedAt) {
    throw new BadRequestError(
      `Site induk ${existing.siteId} (${existing.site.name}) masih diarsipkan. Pulihkan Site tersebut terlebih dahulu sebelum memulihkan zona ini.`,
    );
  }

  const restored = await prisma.zone.update({
    where: { id },
    data: {
      deletedAt: null,
      isActive: true,
    },
    include: {
      site: { select: { id: true, name: true } },
    },
  });

  await recordAuditLog({
    userId,
    action: "ZONE_RESTORED",
    entityType: "zone",
    entityId: id,
    before: existing,
    after: restored,
    req,
  });

  return restored;
}

/**
 * 3. USER MANAGEMENT
 */
export async function listDeletedUsers() {
  const users = await prisma.user.findMany({
    where: { deletedAt: { not: null } },
    select: {
      id: true,
      username: true,
      fullName: true,
      email: true,
      role: true,
      createdAt: true,
      deletedAt: true,
      lastLoginAt: true,
    },
    orderBy: { deletedAt: "desc" },
  });

  return {
    users,
    total: users.length,
  };
}

export async function restoreUser(id, userId, req) {
  const existing = await prisma.user.findUnique({
    where: { id },
  });

  if (!existing || !existing.deletedAt) {
    throw new NotFoundError(`Pengguna dengan ID ${id} tidak ditemukan di tempat sampah`);
  }

  // Cek jika username atau email bentrok dengan akun aktif yang ada sekarang
  const conflict = await prisma.user.findFirst({
    where: {
      id: { not: id },
      deletedAt: null,
      OR: [
        { username: existing.username },
        ...(existing.email ? [{ email: existing.email }] : []),
      ],
    },
  });

  if (conflict) {
    throw new BadRequestError(
      `Tidak dapat memulihkan akun: Username '@${existing.username}' atau email sudah dipakai oleh pengguna aktif lain.`,
    );
  }

  const restored = await prisma.user.update({
    where: { id },
    data: {
      deletedAt: null,
      isActive: true,
      failedLoginCount: 0,
      lockedUntil: null,
    },
    select: {
      id: true,
      username: true,
      fullName: true,
      email: true,
      role: true,
      isActive: true,
      deletedAt: true,
    },
  });

  await recordAuditLog({
    userId,
    action: "USER_RESTORED",
    entityType: "user",
    entityId: id,
    before: existing,
    after: restored,
    req,
  });

  return restored;
}
