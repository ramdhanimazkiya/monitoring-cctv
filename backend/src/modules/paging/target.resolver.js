import { prisma } from "../../config/database.js";
import { ForbiddenError, NotFoundError, BadRequestError } from "../../utils/errors.js";

/**
 * Resolver Target Audio Device & Validasi Otorisasi Zona
 */
export async function resolveAudioTargets(user, { targetType, targetId, targetIds = [] }) {
  const ids = targetIds.length > 0 ? targetIds : targetId ? [targetId] : [];

  let devices = [];

  switch (targetType) {
    case "DEVICE": {
      if (ids.length === 0) {
        throw new BadRequestError("targetId atau targetIds wajib diisi untuk target DEVICE");
      }
      devices = await prisma.audioDevice.findMany({
        where: {
          id: { in: ids },
          deletedAt: null,
          isActive: true,
        },
        include: {
          zone: { select: { id: true, name: true } },
          site: { select: { id: true, name: true } },
        },
      });
      break;
    }

    case "ZONE": {
      if (ids.length === 0) {
        throw new BadRequestError("targetId atau targetIds zona wajib diisi untuk target ZONE");
      }
      devices = await prisma.audioDevice.findMany({
        where: {
          zoneId: { in: ids },
          deletedAt: null,
          isActive: true,
        },
        include: {
          zone: { select: { id: true, name: true } },
          site: { select: { id: true, name: true } },
        },
      });
      break;
    }

    case "GROUP": {
      if (ids.length === 0) {
        throw new BadRequestError("targetId atau targetIds grup wajib diisi untuk target GROUP");
      }
      const memberships = await prisma.audioGroupMember.findMany({
        where: { groupId: { in: ids } },
        select: { audioDeviceId: true },
      });
      const deviceIds = Array.from(new Set(memberships.map((m) => m.audioDeviceId)));

      if (deviceIds.length > 0) {
        devices = await prisma.audioDevice.findMany({
          where: {
            id: { in: deviceIds },
            deletedAt: null,
            isActive: true,
          },
          include: {
            zone: { select: { id: true, name: true } },
            site: { select: { id: true, name: true } },
          },
        });
      }
      break;
    }

    case "ALL": {
      devices = await prisma.audioDevice.findMany({
        where: {
          deletedAt: null,
          isActive: true,
        },
        include: {
          zone: { select: { id: true, name: true } },
          site: { select: { id: true, name: true } },
        },
      });
      break;
    }

    default:
      throw new BadRequestError(`Target type tidak dikenali: ${targetType}`);
  }

  if (devices.length === 0) {
    throw new NotFoundError("Tidak ada perangkat audio aktif yang cocok dengan target yang dipilih");
  }

  // Validasi Hak Akses Zona untuk Role OPERATOR (Admin selalu diizinkan semua zona)
  if (user && user.role === "OPERATOR") {
    const allowedZoneAccess = await prisma.userZoneAccess.findMany({
      where: { userId: user.id },
      select: { zoneId: true },
    });
    const allowedZoneIds = new Set(allowedZoneAccess.map((z) => z.zoneId));

    for (const dev of devices) {
      if (dev.zoneId && !allowedZoneIds.has(dev.zoneId)) {
        throw new ForbiddenError(
          `Operator tidak memiliki izin paging pada zona ${dev.zone?.name || dev.zoneId} (${dev.name})`,
        );
      }
    }
  }

  return devices;
}
