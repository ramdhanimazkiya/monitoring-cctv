import { prisma } from "../../config/database.js";
import { logger } from "../../utils/logger.js";
import { wsHub } from "../../websocket/hub.js";
import { leaseService } from "./lease.service.js";
import { resolveAudioTargets } from "./target.resolver.js";
import { ttsEngine } from "./tts.engine.js";
import { NotFoundError, BadRequestError, ConflictError } from "../../utils/errors.js";

/**
 * Service Utama Orkestrasi Audio Paging & TTS
 */
export async function startPttSession(user, { targetType, targetId, targetIds, durationSeconds = 60 }) {
  // 1. Ekspan target speaker & verifikasi otorisasi zona
  const devices = await resolveAudioTargets(user, { targetType, targetId, targetIds });

  // 2. Verifikasi seluruh perangkat target mendukung PTT
  const unsupported = devices.filter((d) => !d.supportsPtt);
  if (unsupported.length > 0) {
    throw new BadRequestError(
      `Perangkat ${unsupported.map((d) => d.name).join(", ")} tidak mendukung fitur Push-to-Talk (PTT)`,
    );
  }

  // 3. Verifikasi apakah ada perangkat yang sedang OFFLINE
  const offline = devices.filter((d) => d.status === "OFFLINE");
  if (offline.length === devices.length) {
    throw new BadRequestError("Semua perangkat audio target sedang OFFLINE, tidak dapat memulai transmisi PTT");
  }

  const activeDevices = devices.filter((d) => d.status !== "OFFLINE");
  const deviceIds = activeDevices.map((d) => d.id);
  const now = new Date();

  // 4. Buat record AudioCommand & akuisisi lease kanal dalam transaksi
  return await prisma.$transaction(async (tx) => {
    // 4.1 Buat baris AudioCommand
    const command = await tx.audioCommand.create({
      data: {
        kind: "PTT",
        source: "MANUAL",
        status: "ACTIVE",
        mode: "SIMULATION",
        userId: user.id,
        targetSpec: {
          targetType,
          targetId: targetId || null,
          targetIds: targetIds || null,
          requestedDeviceCount: devices.length,
          activeDeviceCount: activeDevices.length,
        },
        startedAt: now,
      },
    });

    // 4.2 Kunci kanal speaker dengan mutual exclusion lease
    const leases = await leaseService.acquireLeases(tx, {
      deviceIds,
      userId: user.id,
      username: user.username,
      commandId: command.id,
      durationSeconds,
    });

    // 4.3 Buat target hasil per perangkat (AudioCommandTarget)
    for (const dev of devices) {
      const isDevOffline = dev.status === "OFFLINE";
      await tx.audioCommandTarget.create({
        data: {
          commandId: command.id,
          audioDeviceId: dev.id,
          status: isDevOffline ? "FAILED" : "PENDING",
          deliveryConfirmed: false,
          startedAt: isDevOffline ? now : now,
          finishedAt: isDevOffline ? now : null,
          errorCode: isDevOffline ? "DEVICE_OFFLINE" : null,
          errorMessage: isDevOffline ? "Perangkat sedang OFFLINE saat transmisi dimulai" : null,
        },
      });
    }

    const whipUrl = `/api/paging/whip/PTT-${command.id}`;

    // Siarkan pembaruan audio paging via WebSocket
    wsHub.broadcastAudioPagingUpdate({
      event: "ptt:started",
      commandId: command.id.toString(),
      userId: user.id,
      username: user.username,
      targetType,
      deviceIds,
      whipUrl,
    });

    return {
      commandId: command.id.toString(),
      status: command.status,
      targetType,
      durationSeconds,
      whipUrl,
      startedAt: command.startedAt,
      expiresAt: leases[0]?.expiresAt || new Date(now.getTime() + durationSeconds * 1000),
      targets: activeDevices.map((d) => ({
        id: d.id,
        name: d.name,
        status: d.status,
        supportsDeliveryReceipt: d.supportsDeliveryReceipt,
      })),
      skippedOffline: offline.map((d) => ({ id: d.id, name: d.name })),
    };
  });
}

/**
 * Memperpanjang masa aktif lease PTT (Heartbeat).
 */
export async function heartbeatPttSession(user, { commandId, extensionSeconds = 30 }) {
  const bigCommandId = BigInt(commandId);
  const command = await prisma.audioCommand.findUnique({
    where: { id: bigCommandId },
  });

  if (!command) {
    throw new NotFoundError(`Perintah audio PTT dengan ID ${commandId} tidak ditemukan`);
  }

  if (command.status !== "ACTIVE") {
    throw new BadRequestError(`Sesi PTT sudah tidak aktif (status saat ini: ${command.status})`);
  }

  const result = await leaseService.heartbeatLeases(prisma, {
    commandId: bigCommandId,
    userId: user.id,
    extensionSeconds,
  });

  return result;
}

/**
 * Menghentikan transmisi PTT dan melepaskan seluruh lease kanal audio.
 */
export async function stopPttSession(user, { commandId }) {
  const bigCommandId = BigInt(commandId);
  const command = await prisma.audioCommand.findUnique({
    where: { id: bigCommandId },
    include: { targets: true },
  });

  if (!command) {
    throw new NotFoundError(`Perintah audio PTT dengan ID ${commandId} tidak ditemukan`);
  }

  // Jika operator, pastikan yang menghentikan adalah pemilik sesi atau admin
  if (user.role === "OPERATOR" && command.userId !== user.id) {
    throw new ConflictError("Hanya operator pemilik sesi atau Administrator yang dapat menghentikan PTT ini");
  }

  const now = new Date();

  return await prisma.$transaction(async (tx) => {
    // 1. Lepaskan lease kanal audio
    const releasedDeviceIds = await leaseService.releaseLeases(tx, {
      commandId: bigCommandId,
      userId: user.id,
      username: user.username,
    });

    // 2. Perbarui status target
    for (const target of command.targets) {
      if (target.status === "PENDING") {
        const dev = await tx.audioDevice.findUnique({ where: { id: target.audioDeviceId } });
        const confirmed = !!dev?.supportsDeliveryReceipt;
        await tx.audioCommandTarget.update({
          where: { id: target.id },
          data: {
            status: confirmed ? "DELIVERED" : "UNCONFIRMED",
            deliveryConfirmed: confirmed,
            finishedAt: now,
            errorMessage: confirmed
              ? null
              : "Transmisi selesai, perangkat tidak mendukung delivery receipt konfirmasi",
          },
        });
      }
    }

    // 3. Perbarui status induk AudioCommand
    const finalTargets = await tx.audioCommandTarget.findMany({ where: { commandId: bigCommandId } });
    const allDelivered = finalTargets.length > 0 && finalTargets.every((t) => t.status === "DELIVERED");
    const allUnconfirmed = finalTargets.length > 0 && finalTargets.every((t) => t.status === "UNCONFIRMED");
    const finalStatus = allDelivered ? "SUCCESS" : allUnconfirmed ? "UNCONFIRMED" : "PARTIAL";

    const updatedCommand = await tx.audioCommand.update({
      where: { id: bigCommandId },
      data: {
        status: finalStatus,
        endedAt: now,
      },
    });

    // Siarkan pemberitahuan PTT selesai via WebSocket
    wsHub.broadcastAudioPagingUpdate({
      event: "ptt:ended",
      commandId: String(commandId),
      userId: user.id,
      endedAt: now,
    });

    return {
      commandId: String(commandId),
      status: updatedCommand.status,
      startedAt: command.startedAt,
      endedAt: updatedCommand.endedAt,
      releasedDevices: releasedDeviceIds,
    };
  });
}

/**
 * Mengirimkan pesan suara Text-to-Speech (TTS) ke target speaker terpilih.
 */
export async function dispatchTtsMessage(user, { text, language = "id-ID", voice = "standard", targetType, targetId, targetIds }) {
  // 1. Validasi panjang karakter teks
  await ttsEngine.validateTextLength(text);

  // 2. Ekspan target speaker & verifikasi hak akses zona
  const devices = await resolveAudioTargets(user, { targetType, targetId, targetIds });

  // 3. Jalankan pemrosesan TTS melalui engine
  const { commandStatus, durationSeconds, mode, targetResults } = await ttsEngine.dispatchToDevices(devices, {
    text,
    language,
    voice,
  });

  const now = new Date();
  const endedAt = new Date(now.getTime() + durationSeconds * 1000);

  // 4. Catat transaksi AudioCommand dan detail target
  const result = await prisma.$transaction(async (tx) => {
    const command = await tx.audioCommand.create({
      data: {
        kind: "TTS",
        source: "MANUAL",
        status: commandStatus,
        mode,
        userId: user.id,
        ttsText: text,
        ttsLanguage: language,
        targetSpec: {
          targetType,
          targetId: targetId || null,
          targetIds: targetIds || null,
          voice,
          deviceCount: devices.length,
        },
        startedAt: now,
        endedAt,
      },
    });

    for (const item of targetResults) {
      await tx.audioCommandTarget.create({
        data: {
          commandId: command.id,
          audioDeviceId: item.audioDeviceId,
          status: item.status,
          deliveryConfirmed: item.deliveryConfirmed,
          attempts: item.attempts,
          startedAt: item.startedAt,
          finishedAt: item.finishedAt,
          errorCode: item.errorCode,
          errorMessage: item.errorMessage,
          detail: item.detail,
        },
      });
    }

    return command;
  });

  // Siarkan event TTS via WebSocket
  wsHub.broadcastAudioPagingUpdate({
    event: "tts:dispatched",
    commandId: result.id.toString(),
    userId: user.id,
    username: user.username,
    status: commandStatus,
    targetCount: targetResults.length,
    durationSeconds,
  });

  return {
    commandId: result.id.toString(),
    status: commandStatus,
    ttsText: text,
    ttsLanguage: language,
    durationSeconds,
    targets: targetResults,
  };
}

/**
 * Mengambil daftar seluruh perangkat audio beserta status lease aktif.
 */
export async function listPagingDevices() {
  await leaseService.cleanExpiredLeases(prisma);

  const devices = await prisma.audioDevice.findMany({
    where: { deletedAt: null },
    include: {
      site: { select: { id: true, name: true } },
      zone: { select: { id: true, name: true } },
      channelLease: {
        include: {
          user: { select: { id: true, username: true, fullName: true } },
        },
      },
    },
    orderBy: { id: "asc" },
  });

  const now = new Date();

  return devices.map((d) => {
    const lease = d.channelLease && d.channelLease.expiresAt > now ? d.channelLease : null;
    return {
      id: d.id,
      name: d.name,
      siteId: d.siteId,
      siteName: d.site?.name,
      zoneId: d.zoneId,
      zoneName: d.zone?.name,
      status: d.status,
      supportsPtt: d.supportsPtt,
      supportsTts: d.supportsTts,
      supportsDeliveryReceipt: d.supportsDeliveryReceipt,
      isDemo: d.isDemo,
      whipUrl: `/api/paging/whip/${d.id}`,
      activeLease: lease
        ? {
            userId: lease.userId,
            username: lease.user?.username,
            fullName: lease.user?.fullName,
            expiresAt: lease.expiresAt,
          }
        : null,
    };
  });
}

/**
 * Mengambil riwayat perintah audio paging (PTT / TTS).
 */
export async function listPagingCommands(query = {}) {
  const where = {};
  if (query.kind) where.kind = query.kind;
  if (query.status) where.status = query.status;

  const take = query.limit || 50;
  const skip = query.offset || 0;

  const [commands, total] = await Promise.all([
    prisma.audioCommand.findMany({
      where,
      include: {
        user: { select: { id: true, username: true, fullName: true, role: true } },
        targets: {
          include: {
            device: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { requestedAt: "desc" },
      take,
      skip,
    }),
    prisma.audioCommand.count({ where }),
  ]);

  return {
    total,
    items: commands.map((c) => ({
      id: c.id.toString(),
      kind: c.kind,
      source: c.source,
      status: c.status,
      mode: c.mode,
      ttsText: c.ttsText,
      targetSpec: c.targetSpec,
      requestedAt: c.requestedAt,
      startedAt: c.startedAt,
      endedAt: c.endedAt,
      user: c.user,
      targets: c.targets.map((t) => ({
        audioDeviceId: t.audioDeviceId,
        deviceName: t.device?.name,
        status: t.status,
        deliveryConfirmed: t.deliveryConfirmed,
        errorMessage: t.errorMessage,
      })),
    })),
  };
}

/**
 * Mengambil detail satu perintah audio paging berdasarkan ID.
 */
export async function getPagingCommandById(id) {
  const bigId = BigInt(id);
  const command = await prisma.audioCommand.findUnique({
    where: { id: bigId },
    include: {
      user: { select: { id: true, username: true, fullName: true, role: true } },
      targets: {
        include: {
          device: { select: { id: true, name: true, supportsDeliveryReceipt: true } },
        },
      },
    },
  });

  if (!command) {
    throw new NotFoundError(`Perintah audio dengan ID ${id} tidak ditemukan`);
  }

  return {
    id: command.id.toString(),
    kind: command.kind,
    source: command.source,
    status: command.status,
    mode: command.mode,
    ttsText: command.ttsText,
    ttsLanguage: command.ttsLanguage,
    targetSpec: command.targetSpec,
    requestedAt: command.requestedAt,
    startedAt: command.startedAt,
    endedAt: command.endedAt,
    user: command.user,
    targets: command.targets.map((t) => ({
      id: t.id.toString(),
      audioDeviceId: t.audioDeviceId,
      deviceName: t.device?.name,
      status: t.status,
      deliveryConfirmed: t.deliveryConfirmed,
      attempts: t.attempts,
      startedAt: t.startedAt,
      finishedAt: t.finishedAt,
      errorCode: t.errorCode,
      errorMessage: t.errorMessage,
      detail: t.detail,
    })),
  };
}
