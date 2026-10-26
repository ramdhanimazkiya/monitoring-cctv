import { prisma } from "../../config/database.js";
import { encryptCredential } from "../../utils/cipher.js";
import { recordAuditLog } from "../../services/audit.service.js";
import { NotFoundError, BadRequestError, ConflictError } from "../../utils/errors.js";

// -----------------------------------------------------------------------------
// HELPER SERIALISASI
// -----------------------------------------------------------------------------

function sanitizeDeviceOutput(device) {
  if (!device) return null;
  const { credentialCipher, ...rest } = device;

  // Jika zona yang terikat telah dihapus (soft-deleted) atau tidak ada, kosongkan zone dan zoneId (Unassigned)
  const isZoneDeleted =
    !device.zoneId ||
    (device.zone && device.zone.deletedAt !== null && device.zone.deletedAt !== undefined);

  const cleanZone = isZoneDeleted ? null : device.zone;
  const cleanZoneId = isZoneDeleted ? null : device.zoneId;

  const streamUrl =
    device.adapterConfig && typeof device.adapterConfig === "object" && device.adapterConfig.streamUrl
      ? device.adapterConfig.streamUrl
      : device.streamKey && device.streamKey.startsWith("http")
      ? device.streamKey
      : null;

  const whipUrl =
    device.adapterConfig && typeof device.adapterConfig === "object" && device.adapterConfig.whipUrl
      ? device.adapterConfig.whipUrl
      : device.host && device.host.startsWith("http")
      ? device.host
      : null;

  const volume =
    device.adapterConfig && typeof device.adapterConfig === "object" && typeof device.adapterConfig.volume === "number"
      ? device.adapterConfig.volume
      : 80;

  return {
    ...rest,
    zoneId: cleanZoneId,
    zone: cleanZone,
    streamUrl,
    whipUrl,
    volume,
    hasCredential: !!credentialCipher,
  };
}

function normalizeUrl(url) {
  if (!url || typeof url !== "string") return "";
  return url.trim().toLowerCase().replace(/\/+$/, "");
}

function isUrlMatch(urlA, urlB) {
  const a = normalizeUrl(urlA);
  const b = normalizeUrl(urlB);
  if (!a || !b) return false;
  if (a === b) return true;
  if (a.endsWith("/" + b) || b.endsWith("/" + a)) return true;
  return false;
}

// -----------------------------------------------------------------------------
// SITES & ZONES
// -----------------------------------------------------------------------------

export async function listSites() {
  const sites = await prisma.site.findMany({
    where: { deletedAt: null },
    include: {
      _count: {
        select: {
          zones: { where: { deletedAt: null } },
          cameras: { where: { deletedAt: null } },
          audioDevices: { where: { deletedAt: null } },
        },
      },
    },
    orderBy: { id: "asc" },
  });

  return sites.map((s) => ({
    ...s,
    counts: {
      zones: s._count.zones,
      cameras: s._count.cameras,
      audioDevices: s._count.audioDevices,
    },
  }));
}

export async function getSiteById(id) {
  const site = await prisma.site.findFirst({
    where: { id, deletedAt: null },
    include: {
      zones: { where: { deletedAt: null }, orderBy: { id: "asc" } },
      _count: {
        select: {
          cameras: { where: { deletedAt: null } },
          audioDevices: { where: { deletedAt: null } },
        },
      },
    },
  });

  if (!site) throw new NotFoundError(`Site dengan ID ${id} tidak ditemukan`);
  return site;
}

export async function createSite(data, userId, req) {
  // Generate ID dengan format SIT-0001 (4 digit+) sesuai CHECK constraint DB
  let siteId = data.id;
  if (!siteId) {
    const existing = await prisma.site.findMany({ select: { id: true } });
    const nums = existing.map((s) => {
      const m = s.id.match(/\d+/);
      return m ? parseInt(m[0], 10) : 0;
    });
    const maxNum = nums.length > 0 ? Math.max(...nums) : 0;
    siteId = `SIT-${String(maxNum + 1).padStart(4, "0")}`;
  }

  const created = await prisma.site.create({
    data: {
      ...data,
      id: siteId,
    },
  });
  await recordAuditLog({
    userId,
    action: "SITE_CREATED",
    entityType: "site",
    entityId: created.id,
    after: created,
    req,
  });
  return created;
}

export async function updateSite(id, data, userId, req) {
  const existing = await getSiteById(id);
  const updated = await prisma.site.update({
    where: { id },
    data,
  });
  await recordAuditLog({
    userId,
    action: "SITE_UPDATED",
    entityType: "site",
    entityId: id,
    before: existing,
    after: updated,
    req,
  });
  return updated;
}

export async function deleteSite(id, userId, req) {
  const existing = await getSiteById(id);
  // Cek apakah masih memiliki child aktif (BR-05)
  const activeChildren = await prisma.zone.count({
    where: { siteId: id, deletedAt: null },
  });
  if (activeChildren > 0) {
    throw new BadRequestError("Tidak dapat menghapus Site yang masih memiliki zona aktif");
  }

  const updated = await prisma.site.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
  await recordAuditLog({
    userId,
    action: "SITE_DELETED",
    entityType: "site",
    entityId: id,
    before: existing,
    req,
  });
  return updated;
}

export async function listZones(siteId = null) {
  const where = { deletedAt: null };
  if (siteId) where.siteId = siteId;

  const zones = await prisma.zone.findMany({
    where,
    include: {
      site: { select: { id: true, name: true } },
      cameras: {
        where: { deletedAt: null },
        select: { id: true, name: true, status: true },
        orderBy: { id: "asc" },
      },
      audioDevices: {
        where: { deletedAt: null },
        select: { id: true, name: true, status: true },
        orderBy: { id: "asc" },
      },
      _count: {
        select: {
          cameras: { where: { deletedAt: null } },
          audioDevices: { where: { deletedAt: null } },
        },
      },
    },
    orderBy: { id: "asc" },
  });

  return zones.map((z) => ({
    ...z,
    counts: {
      cameras: z._count?.cameras || z.cameras?.length || 0,
      audioDevices: z._count?.audioDevices || z.audioDevices?.length || 0,
    },
  }));
}

export async function createZone(data, userId, req) {
  // Pastikan ada siteId yang valid jika tidak dikirim dari form input
  let siteId = data.siteId;
  if (!siteId) {
    let defaultSite = await prisma.site.findFirst({
      where: { deletedAt: null },
      orderBy: { id: "asc" },
    });
    if (!defaultSite) {
      defaultSite = await prisma.site.create({
        data: {
          id: "SIT-0001",
          name: "Site Utama",
          description: "Site otomatis sistem",
        },
      });
    }
    siteId = defaultSite.id;
  }

  // Cek keunikan nama dalam site
  const duplicate = await prisma.zone.findFirst({
    where: { siteId, name: data.name, deletedAt: null },
  });
  if (duplicate) {
    throw new ConflictError(`Zona bernama '${data.name}' sudah ada di site ${siteId}`);
  }

  // Generate ID dengan format ZON-0001 (4 digit+) sesuai CHECK constraint DB
  let zoneId = data.id;
  if (!zoneId) {
    const existingZones = await prisma.zone.findMany({ select: { id: true } });
    const nums = existingZones.map((z) => {
      const m = z.id.match(/\d+/);
      return m ? parseInt(m[0], 10) : 0;
    });
    const maxNum = nums.length > 0 ? Math.max(...nums) : 0;
    zoneId = `ZON-${String(maxNum + 1).padStart(4, "0")}`;
  }

  const created = await prisma.zone.create({
    data: {
      ...data,
      siteId,
      id: zoneId,
    },
  });
  await recordAuditLog({
    userId,
    action: "ZONE_CREATED",
    entityType: "zone",
    entityId: created.id,
    after: created,
    req,
  });
  return created;
}

export async function updateZone(id, data, userId, req) {
  const existing = await prisma.zone.findFirst({ where: { id, deletedAt: null } });
  if (!existing) throw new NotFoundError(`Zona dengan ID ${id} tidak ditemukan`);

  const targetSiteId = data.siteId || existing.siteId;
  if (data.name && data.name !== existing.name) {
    const duplicate = await prisma.zone.findFirst({
      where: { siteId: targetSiteId, name: data.name, deletedAt: null, NOT: { id } },
    });
    if (duplicate) {
      throw new ConflictError(`Zona bernama '${data.name}' sudah ada di site tersebut`);
    }
  }

  const updated = await prisma.zone.update({
    where: { id },
    data,
  });
  await recordAuditLog({
    userId,
    action: "ZONE_UPDATED",
    entityType: "zone",
    entityId: id,
    before: existing,
    after: updated,
    req,
  });
  return updated;
}

export async function deleteZone(id, userId, req) {
  const existing = await prisma.zone.findFirst({ where: { id, deletedAt: null } });
  if (!existing) throw new NotFoundError(`Zona dengan ID ${id} tidak ditemukan`);

  // Lepaskan penugasan zona (zoneId = null) pada seluruh perangkat (CCTV dan Audio)
  // sehingga perangkat otomatis unassigned dan TIDAK ikut hilang.
  const [detachedCameras, detachedAudio, updated] = await prisma.$transaction([
    prisma.camera.updateMany({
      where: { zoneId: id },
      data: { zoneId: null },
    }),
    prisma.audioDevice.updateMany({
      where: { zoneId: id },
      data: { zoneId: null },
    }),
    prisma.zone.update({
      where: { id },
      data: { deletedAt: new Date() },
    }),
  ]);

  await recordAuditLog({
    userId,
    action: "ZONE_DELETED",
    entityType: "zone",
    entityId: id,
    before: existing,
    after: updated,
    detail: {
      strategy: "OPTION_A_DETACH_DEVICES",
      detachedCamerasCount: detachedCameras.count,
      detachedAudioCount: detachedAudio.count,
    },
    req,
  });

  return {
    ...updated,
    detachedCamerasCount: detachedCameras.count,
    detachedAudioCount: detachedAudio.count,
  };
}

// -----------------------------------------------------------------------------
// CAMERAS
// -----------------------------------------------------------------------------

export async function listCameras(query = {}) {
  const where = { deletedAt: null };
  if (query.siteId) where.siteId = query.siteId;
  if (query.zoneId) where.zoneId = query.zoneId;
  if (query.status) where.status = query.status;
  if (query.search) {
    where.OR = [
      { name: { contains: query.search, mode: "insensitive" } },
      { id: { contains: query.search, mode: "insensitive" } },
      { host: { contains: query.search, mode: "insensitive" } },
    ];
  }

  const page = parseInt(query.page, 10) || 1;
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || 50, 1), 100);
  const skip = (page - 1) * limit;
  const take = limit;

  const [total, cameras] = await Promise.all([
    prisma.camera.count({ where }),
    prisma.camera.findMany({
      where,
      include: {
        site: { select: { id: true, name: true } },
        zone: { select: { id: true, name: true, deletedAt: true } },
      },
      orderBy: { id: "asc" },
      skip,
      take,
    }),
  ]);

  return {
    total,
    page: query.page || 1,
    limit: take,
    data: cameras.map(sanitizeDeviceOutput),
  };
}

export async function getCameraById(id) {
  const camera = await prisma.camera.findFirst({
    where: { id, deletedAt: null },
    include: {
      site: { select: { id: true, name: true } },
      zone: { select: { id: true, name: true, deletedAt: true } },
      statusHistory: {
        orderBy: { occurredAt: "desc" },
        take: 10,
      },
      events: {
        where: { status: { in: ["OPEN", "ACKNOWLEDGED"] } },
        orderBy: { occurredAt: "desc" },
        take: 5,
      },
    },
  });

  if (!camera) throw new NotFoundError(`Kamera dengan ID ${id} tidak ditemukan`);
  return sanitizeDeviceOutput(camera);
}

export async function createCamera(data, userId, req) {
  // Cek keunikan nama dalam site yang sama
  const duplicate = await prisma.camera.findFirst({
    where: { siteId: data.siteId, name: data.name, deletedAt: null },
  });
  if (duplicate) {
    throw new ConflictError(`Kamera bernama '${data.name}' sudah ada di site tersebut`);
  }

  // Cek keunikan URL stream kamera jika diisi
  if (data.streamUrl && data.streamUrl.trim()) {
    const activeCams = await prisma.camera.findMany({ where: { deletedAt: null } });
    const duplicateUrl = activeCams.find((c) => {
      return (
        isUrlMatch(data.streamUrl, c.adapterConfig?.streamUrl) ||
        isUrlMatch(data.streamUrl, c.streamKey) ||
        isUrlMatch(data.streamUrl, c.host)
      );
    });
    if (duplicateUrl) {
      throw new ConflictError(
        `URL stream '${data.streamUrl}' sudah digunakan oleh kamera ${duplicateUrl.id} (${duplicateUrl.name})`
      );
    }
  }

  // Jika ada zoneId, validasi dan otomatis sinkronkan dengan site pemilik zona
  if (data.zoneId) {
    const zone = await prisma.zone.findFirst({
      where: { id: data.zoneId, deletedAt: null },
    });
    if (!zone) {
      throw new BadRequestError(`Zona ${data.zoneId} tidak valid atau telah dihapus`);
    }
    data.siteId = zone.siteId;
  } else if (data.zoneId === "" || data.zoneId === null) {
    data.zoneId = null;
  }

  const { credential, streamUrl, ...cameraFields } = data;
  const credentialCipher = credential ? encryptCredential(credential) : undefined;

  if (streamUrl !== undefined) {
    const existingConfig =
      cameraFields.adapterConfig && typeof cameraFields.adapterConfig === "object"
        ? cameraFields.adapterConfig
        : {};
    cameraFields.adapterConfig = {
      ...existingConfig,
      streamUrl: streamUrl || null,
    };
    if (streamUrl && !cameraFields.streamKey) {
      try {
        const u = new URL(streamUrl);
        const path = u.pathname.replace(/^\/|\/$/g, "");
        cameraFields.streamKey = path.substring(0, 120) || streamUrl.substring(0, 120);
      } catch (_) {
        cameraFields.streamKey = streamUrl.substring(0, 120);
      }
    }
  }

  const created = await prisma.camera.create({
    data: {
      ...cameraFields,
      credentialCipher,
    },
    include: {
      site: { select: { id: true, name: true } },
      zone: { select: { id: true, name: true, deletedAt: true } },
    },
  });

  await recordAuditLog({
    userId,
    action: "CAMERA_CREATED",
    entityType: "camera",
    entityId: created.id,
    after: created,
    req,
  });

  return sanitizeDeviceOutput(created);
}

export async function updateCamera(id, data, userId, req) {
  const existing = await prisma.camera.findFirst({
    where: { id, deletedAt: null },
  });
  if (!existing) throw new NotFoundError(`Kamera dengan ID ${id} tidak ditemukan`);

  let siteId = data.siteId || existing.siteId;

  if (data.name && data.name !== existing.name) {
    const duplicate = await prisma.camera.findFirst({
      where: { siteId, name: data.name, deletedAt: null, id: { not: id } },
    });
    if (duplicate) {
      throw new ConflictError(`Kamera bernama '${data.name}' sudah ada di site tersebut`);
    }
  }

  // Cek keunikan URL stream kamera jika diisi saat edit
  if (data.streamUrl && data.streamUrl.trim()) {
    const activeCams = await prisma.camera.findMany({ where: { deletedAt: null, id: { not: id } } });
    const duplicateUrl = activeCams.find((c) => {
      return (
        isUrlMatch(data.streamUrl, c.adapterConfig?.streamUrl) ||
        isUrlMatch(data.streamUrl, c.streamKey) ||
        isUrlMatch(data.streamUrl, c.host)
      );
    });
    if (duplicateUrl) {
      throw new ConflictError(
        `URL stream '${data.streamUrl}' sudah digunakan oleh kamera ${duplicateUrl.id} (${duplicateUrl.name})`
      );
    }
  }

  const { credential, streamUrl, ...updateFields } = data;

  if (data.zoneId) {
    const zone = await prisma.zone.findFirst({
      where: { id: data.zoneId, deletedAt: null },
    });
    if (!zone) {
      throw new BadRequestError(`Zona ${data.zoneId} tidak valid atau telah dihapus`);
    }
    siteId = zone.siteId;
    updateFields.siteId = zone.siteId;
    updateFields.zoneId = zone.id;
  } else if (data.zoneId === null || data.zoneId === "") {
    updateFields.zoneId = null;
  }
  if (credential) {
    updateFields.credentialCipher = encryptCredential(credential);
  }

  if (streamUrl !== undefined) {
    const currentConfig =
      existing.adapterConfig && typeof existing.adapterConfig === "object"
        ? existing.adapterConfig
        : {};
    updateFields.adapterConfig = {
      ...currentConfig,
      streamUrl: streamUrl || null,
    };
    if (streamUrl && (!updateFields.streamKey && !existing.streamKey)) {
      try {
        const u = new URL(streamUrl);
        const path = u.pathname.replace(/^\/|\/$/g, "");
        updateFields.streamKey = path.substring(0, 120) || streamUrl.substring(0, 120);
      } catch (_) {
        updateFields.streamKey = streamUrl.substring(0, 120);
      }
    }
  }

  const updated = await prisma.camera.update({
    where: { id },
    data: updateFields,
    include: {
      site: { select: { id: true, name: true } },
      zone: { select: { id: true, name: true, deletedAt: true } },
    },
  });

  await recordAuditLog({
    userId,
    action: "CAMERA_UPDATED",
    entityType: "camera",
    entityId: id,
    before: existing,
    after: updated,
    req,
  });

  return sanitizeDeviceOutput(updated);
}

export async function deleteCamera(id, userId, req) {
  const existing = await prisma.camera.findFirst({ where: { id, deletedAt: null } });
  if (!existing) throw new NotFoundError(`Kamera dengan ID ${id} tidak ditemukan`);

  const updated = await prisma.camera.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  await recordAuditLog({
    userId,
    action: "CAMERA_DELETED",
    entityType: "camera",
    entityId: id,
    before: existing,
    req,
  });

  return sanitizeDeviceOutput(updated);
}

// -----------------------------------------------------------------------------
// AUDIO DEVICES
// -----------------------------------------------------------------------------

export async function listAudioDevices(query = {}) {
  const where = { deletedAt: null };
  if (query.siteId) where.siteId = query.siteId;
  if (query.zoneId) where.zoneId = query.zoneId;
  if (query.status) where.status = query.status;
  if (query.search) {
    where.OR = [
      { name: { contains: query.search, mode: "insensitive" } },
      { id: { contains: query.search, mode: "insensitive" } },
      { host: { contains: query.search, mode: "insensitive" } },
    ];
  }

  const page = parseInt(query.page, 10) || 1;
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || 50, 1), 100);
  const skip = (page - 1) * limit;
  const take = limit;

  const [total, devices] = await Promise.all([
    prisma.audioDevice.count({ where }),
    prisma.audioDevice.findMany({
      where,
      include: {
        site: { select: { id: true, name: true } },
        zone: { select: { id: true, name: true, deletedAt: true } },
        channelLease: {
          select: { userId: true, acquiredAt: true, expiresAt: true },
        },
      },
      orderBy: { id: "asc" },
      skip,
      take,
    }),
  ]);

  return {
    total,
    page: query.page || 1,
    limit: take,
    data: devices.map(sanitizeDeviceOutput),
  };
}

export async function getAudioDeviceById(id) {
  const device = await prisma.audioDevice.findFirst({
    where: { id, deletedAt: null },
    include: {
      site: { select: { id: true, name: true } },
      zone: { select: { id: true, name: true, deletedAt: true } },
      channelLease: true,
      statusHistory: {
        orderBy: { occurredAt: "desc" },
        take: 10,
      },
      events: {
        where: { status: { in: ["OPEN", "ACKNOWLEDGED"] } },
        orderBy: { occurredAt: "desc" },
        take: 5,
      },
    },
  });

  if (!device) throw new NotFoundError(`Perangkat audio dengan ID ${id} tidak ditemukan`);
  return sanitizeDeviceOutput(device);
}

export async function createAudioDevice(data, userId, req) {
  const duplicate = await prisma.audioDevice.findFirst({
    where: { siteId: data.siteId, name: data.name, deletedAt: null },
  });
  if (duplicate) {
    throw new ConflictError(`Perangkat audio bernama '${data.name}' sudah ada di site tersebut`);
  }

  // Cek keunikan URL stream audio WHIP jika diisi
  if (data.whipUrl && data.whipUrl.trim()) {
    const activeAuds = await prisma.audioDevice.findMany({ where: { deletedAt: null } });
    const duplicateUrl = activeAuds.find((a) => {
      return (
        isUrlMatch(data.whipUrl, a.adapterConfig?.whipUrl) ||
        isUrlMatch(data.whipUrl, a.host)
      );
    });
    if (duplicateUrl) {
      throw new ConflictError(
        `URL stream audio WHIP '${data.whipUrl}' sudah digunakan oleh speaker ${duplicateUrl.id} (${duplicateUrl.name})`
      );
    }
  }

  // Jika ada zoneId, validasi dan sinkronkan dengan site pemilik zona
  if (data.zoneId) {
    const zone = await prisma.zone.findFirst({
      where: { id: data.zoneId, deletedAt: null },
    });
    if (!zone) {
      throw new BadRequestError(`Zona ${data.zoneId} tidak valid atau telah dihapus`);
    }
    data.siteId = zone.siteId;
  } else if (data.zoneId === "" || data.zoneId === null) {
    data.zoneId = null;
  }

  const { credential, whipUrl, volume, ...deviceFields } = data;
  const credentialCipher = credential ? encryptCredential(credential) : undefined;

  const currentConfig =
    deviceFields.adapterConfig && typeof deviceFields.adapterConfig === "object"
      ? deviceFields.adapterConfig
      : {};

  const adapterConfig = {
    ...currentConfig,
    ...(whipUrl ? { whipUrl } : {}),
    ...(volume !== undefined ? { volume } : {}),
  };

  const created = await prisma.audioDevice.create({
    data: {
      ...deviceFields,
      adapterConfig,
      credentialCipher,
    },
    include: {
      site: { select: { id: true, name: true } },
      zone: { select: { id: true, name: true, deletedAt: true } },
    },
  });

  await recordAuditLog({
    userId,
    action: "AUDIO_DEVICE_CREATED",
    entityType: "audio_device",
    entityId: created.id,
    after: created,
    req,
  });

  return sanitizeDeviceOutput(created);
}

export async function updateAudioDevice(id, data, userId, req) {
  const existing = await prisma.audioDevice.findFirst({ where: { id, deletedAt: null } });
  if (!existing) throw new NotFoundError(`Perangkat audio dengan ID ${id} tidak ditemukan`);

  let siteId = data.siteId || existing.siteId;

  if (data.name && data.name !== existing.name) {
    const duplicate = await prisma.audioDevice.findFirst({
      where: { siteId, name: data.name, deletedAt: null, id: { not: id } },
    });
    if (duplicate) {
      throw new ConflictError(`Perangkat audio bernama '${data.name}' sudah ada di site tersebut`);
    }
  }

  // Cek keunikan URL stream audio WHIP jika diisi saat edit
  if (data.whipUrl && data.whipUrl.trim()) {
    const activeAuds = await prisma.audioDevice.findMany({ where: { deletedAt: null, id: { not: id } } });
    const duplicateUrl = activeAuds.find((a) => {
      return (
        isUrlMatch(data.whipUrl, a.adapterConfig?.whipUrl) ||
        isUrlMatch(data.whipUrl, a.host)
      );
    });
    if (duplicateUrl) {
      throw new ConflictError(
        `URL stream audio WHIP '${data.whipUrl}' sudah digunakan oleh speaker ${duplicateUrl.id} (${duplicateUrl.name})`
      );
    }
  }

  const { credential, whipUrl, volume, ...updateFields } = data;

  if (data.zoneId) {
    const zone = await prisma.zone.findFirst({
      where: { id: data.zoneId, deletedAt: null },
    });
    if (!zone) {
      throw new BadRequestError(`Zona ${data.zoneId} tidak valid atau telah dihapus`);
    }
    siteId = zone.siteId;
    updateFields.siteId = zone.siteId;
    updateFields.zoneId = zone.id;
  } else if (data.zoneId === null || data.zoneId === "") {
    updateFields.zoneId = null;
  }
  if (credential) {
    updateFields.credentialCipher = encryptCredential(credential);
  }

  if (whipUrl !== undefined || volume !== undefined) {
    const currentConfig =
      existing.adapterConfig && typeof existing.adapterConfig === "object"
        ? existing.adapterConfig
        : {};
    updateFields.adapterConfig = {
      ...currentConfig,
      ...(whipUrl !== undefined ? { whipUrl: whipUrl || null } : {}),
      ...(volume !== undefined ? { volume } : {}),
    };
  }

  const updated = await prisma.audioDevice.update({
    where: { id },
    data: updateFields,
    include: {
      site: { select: { id: true, name: true } },
      zone: { select: { id: true, name: true, deletedAt: true } },
    },
  });

  await recordAuditLog({
    userId,
    action: "AUDIO_DEVICE_UPDATED",
    entityType: "audio_device",
    entityId: id,
    before: existing,
    after: updated,
    req,
  });

  return sanitizeDeviceOutput(updated);
}

export async function deleteAudioDevice(id, userId, req) {
  const existing = await prisma.audioDevice.findFirst({ where: { id, deletedAt: null } });
  if (!existing) throw new NotFoundError(`Perangkat audio dengan ID ${id} tidak ditemukan`);

  const updated = await prisma.audioDevice.update({
    where: { id },
    data: { deletedAt: new Date(), isActive: false },
  });

  await recordAuditLog({
    userId,
    action: "AUDIO_DEVICE_DELETED",
    entityType: "audio_device",
    entityId: id,
    before: existing,
    req,
  });

  return sanitizeDeviceOutput(updated);
}

// -----------------------------------------------------------------------------
// STATS & HISTORY
// -----------------------------------------------------------------------------

export async function getDeviceStats() {
  const [cameraStats, audioStats] = await Promise.all([
    prisma.camera.groupBy({
      by: ["status"],
      where: { deletedAt: null },
      _count: { _all: true },
    }),
    prisma.audioDevice.groupBy({
      by: ["status"],
      where: { deletedAt: null },
      _count: { _all: true },
    }),
  ]);

  const stats = {
    cameras: { total: 0, ONLINE: 0, OFFLINE: 0, WARNING: 0, UNKNOWN: 0 },
    audioDevices: { total: 0, ONLINE: 0, OFFLINE: 0, WARNING: 0, UNKNOWN: 0 },
  };

  for (const item of cameraStats) {
    stats.cameras[item.status] = item._count._all;
    stats.cameras.total += item._count._all;
  }

  for (const item of audioStats) {
    stats.audioDevices[item.status] = item._count._all;
    stats.audioDevices.total += item._count._all;
  }

  return stats;
}

export async function getDeviceStatusHistory(deviceId, limit = 20) {
  const isCamera = deviceId.startsWith("CAM-");
  const where = isCamera ? { cameraId: deviceId } : { audioDeviceId: deviceId };
  const take = parseInt(limit, 10) || 20;

  return prisma.deviceStatusHistory.findMany({
    where,
    orderBy: { occurredAt: "desc" },
    take,
  });
}
