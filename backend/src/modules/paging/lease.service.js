import { prisma } from "../../config/database.js";
import { logger } from "../../utils/logger.js";
import { ConflictError, NotFoundError } from "../../utils/errors.js";
import { wsHub } from "../../websocket/hub.js";

/**
 * Service untuk mengelola Channel Mutual Exclusion pada Audio Device
 * Menggunakan tabel `audio_channel_leases` dengan PRIMARY KEY = audio_device_id.
 */
export class ChannelLeaseService {
  /**
   * Menghapus lease yang telah melewati batas kedaluwarsa (expires_at <= now).
   */
  async cleanExpiredLeases(client = prisma) {
    const now = new Date();
    const expired = await client.audioChannelLease.findMany({
      where: { expiresAt: { lte: now } },
      include: { user: { select: { username: true } } },
    });

    if (expired.length > 0) {
      const expiredIds = expired.map((l) => l.audioDeviceId);
      await client.audioChannelLease.deleteMany({
        where: { audioDeviceId: { in: expiredIds } },
      });

      for (const lease of expired) {
        wsHub.broadcastChannelLeaseUpdate({
          audioDeviceId: lease.audioDeviceId,
          acquired: false,
          userId: lease.userId,
          username: lease.user?.username,
          expiresAt: lease.expiresAt,
        });
      }

      logger.info(
        { count: expired.length, deviceIds: expiredIds },
        "Lease audio kedaluwarsa otomatis dibersihkan",
      );
    }

    return expired;
  }

  /**
   * Mengakuisisi lease eksklusif untuk satu atau beberapa audio device.
   * Menjamin hanya satu sesi aktif per perangkat (mutual exclusion).
   */
  async acquireLeases(client, { deviceIds, userId, username, commandId, durationSeconds = 60 }) {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + durationSeconds * 1000);

    // 1. Bersihkan lease yang sudah kedaluwarsa terlebih dahulu
    await client.audioChannelLease.deleteMany({
      where: {
        audioDeviceId: { in: deviceIds },
        expiresAt: { lte: now },
      },
    });

    // 2. Periksa apakah ada kanal yang sedang aktif dikunci pengguna lain
    const activeLeases = await client.audioChannelLease.findMany({
      where: {
        audioDeviceId: { in: deviceIds },
        expiresAt: { gt: now },
      },
      include: {
        user: { select: { id: true, username: true, fullName: true } },
        device: { select: { id: true, name: true } },
      },
    });

    const busyByOthers = activeLeases.filter((l) => l.userId !== userId);
    if (busyByOthers.length > 0) {
      const details = busyByOthers.map((l) => ({
        deviceId: l.audioDeviceId,
        deviceName: l.device?.name,
        occupiedByUserId: l.userId,
        occupiedByUsername: l.user?.username,
        expiresAt: l.expiresAt,
      }));

      throw new ConflictError(
        `Kanal audio sedang digunakan oleh operator lain (${busyByOthers[0].user?.username || busyByOthers[0].userId})`,
        details,
      );
    }

    // 3. Buat / perbarui lease untuk seluruh deviceIds
    const acquired = [];
    for (const deviceId of deviceIds) {
      const lease = await client.audioChannelLease.upsert({
        where: { audioDeviceId: deviceId },
        update: {
          commandId: BigInt(commandId),
          userId,
          acquiredAt: now,
          heartbeatAt: now,
          expiresAt,
        },
        create: {
          audioDeviceId: deviceId,
          commandId: BigInt(commandId),
          userId,
          acquiredAt: now,
          heartbeatAt: now,
          expiresAt,
        },
      });

      acquired.push(lease);

      // Siarkan pembaruan lease via WebSocket
      wsHub.broadcastChannelLeaseUpdate({
        audioDeviceId: deviceId,
        acquired: true,
        userId,
        username,
        expiresAt,
      });
    }

    logger.info(
      { userId, commandId: String(commandId), deviceCount: acquired.length, expiresAt },
      "Channel lease PTT berhasil diakuisisi",
    );

    return acquired;
  }

  /**
   * Memperpanjang masa aktif lease kanal (Heartbeat PTT).
   */
  async heartbeatLeases(client, { commandId, userId, extensionSeconds = 30 }) {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + extensionSeconds * 1000);
    const bigCommandId = BigInt(commandId);

    const leases = await client.audioChannelLease.findMany({
      where: { commandId: bigCommandId },
    });

    if (leases.length === 0) {
      throw new NotFoundError("Lease kanal audio untuk sesi ini tidak ditemukan atau telah berakhir");
    }

    // Pastikan dimiliki oleh user yang sama
    if (leases.some((l) => l.userId !== userId)) {
      throw new ConflictError("Sesi lease ini tidak dimiliki oleh pengguna aktif");
    }

    await client.audioChannelLease.updateMany({
      where: { commandId: bigCommandId },
      data: {
        heartbeatAt: now,
        expiresAt,
      },
    });

    logger.debug(
      { commandId: String(commandId), extensionSeconds, expiresAt },
      "Heartbeat PTT diterima, masa aktif lease diperpanjang",
    );

    return { commandId: String(commandId), expiresAt };
  }

  /**
   * Melepaskan lease kanal audio saat sesi PTT selesai.
   */
  async releaseLeases(client, { commandId, userId, username }) {
    const bigCommandId = BigInt(commandId);
    const leases = await client.audioChannelLease.findMany({
      where: { commandId: bigCommandId },
    });

    if (leases.length === 0) {
      return [];
    }

    const deviceIds = leases.map((l) => l.audioDeviceId);

    await client.audioChannelLease.deleteMany({
      where: { commandId: bigCommandId },
    });

    for (const deviceId of deviceIds) {
      wsHub.broadcastChannelLeaseUpdate({
        audioDeviceId: deviceId,
        acquired: false,
        userId,
        username,
        expiresAt: new Date(),
      });
    }

    logger.info(
      { commandId: String(commandId), deviceIds },
      "Lease kanal audio berhasil dilepaskan",
    );

    return deviceIds;
  }

  /**
   * Mengambil daftar seluruh lease kanal audio yang sedang aktif.
   */
  async getActiveLeases() {
    await this.cleanExpiredLeases(prisma);

    const now = new Date();
    const leases = await prisma.audioChannelLease.findMany({
      where: { expiresAt: { gt: now } },
      include: {
        user: { select: { id: true, username: true, fullName: true, role: true } },
        device: { select: { id: true, name: true, siteId: true, zoneId: true, status: true } },
      },
      orderBy: { acquiredAt: "desc" },
    });

    return leases.map((l) => ({
      audioDeviceId: l.audioDeviceId,
      deviceName: l.device?.name,
      deviceStatus: l.device?.status,
      commandId: l.commandId.toString(),
      userId: l.userId,
      username: l.user?.username,
      fullName: l.user?.fullName,
      acquiredAt: l.acquiredAt,
      heartbeatAt: l.heartbeatAt,
      expiresAt: l.expiresAt,
    }));
  }
}

export const leaseService = new ChannelLeaseService();
