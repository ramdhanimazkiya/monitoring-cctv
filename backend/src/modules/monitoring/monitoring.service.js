import { prisma } from "../../config/database.js";
import { logger } from "../../utils/logger.js";
import { wsHub } from "../../websocket/hub.js";
import { pingDevice } from "./monitoring.adapter.js";
import { checkCameraStream } from "../streaming/streaming.service.js";

class DeviceMonitoringService {
  constructor() {
    this.timer = null;
    this.isRunning = false;
    this.isChecking = false;
    this.consecutiveSuccesses = new Map(); // deviceId -> number
    this.settings = {
      intervalSeconds: 30,
      timeoutMs: 5000,
      offlineAfterFailures: 3,
      recoverAfterSuccesses: 2,
    };
  }

  /**
   * Memuat konfigurasi monitoring dari tabel system_settings.
   */
  async loadSettings() {
    try {
      const keys = [
        "monitoring.check_interval_seconds",
        "monitoring.check_timeout_ms",
        "monitoring.offline_after_failures",
        "monitoring.recover_after_successes",
      ];
      const rows = await prisma.systemSetting.findMany({
        where: { key: { in: keys } },
      });

      for (const row of rows) {
        if (row.key === "monitoring.check_interval_seconds" && typeof row.value === "number") {
          this.settings.intervalSeconds = row.value;
        } else if (row.key === "monitoring.check_timeout_ms" && typeof row.value === "number") {
          this.settings.timeoutMs = row.value;
        } else if (row.key === "monitoring.offline_after_failures" && typeof row.value === "number") {
          this.settings.offlineAfterFailures = row.value;
        } else if (row.key === "monitoring.recover_after_successes" && typeof row.value === "number") {
          this.settings.recoverAfterSuccesses = row.value;
        }
      }
    } catch (err) {
      logger.warn({ err }, "Gagal memuat setting monitoring dari DB, menggunakan nilai default");
    }
  }

  /**
   * Menjalankan monitoring service di latar belakang.
   */
  async start() {
    if (this.isRunning) return;
    this.isRunning = true;

    await this.loadSettings();

    logger.info(
      `Device Monitoring Service dimulai (interval: ${this.settings.intervalSeconds}s, timeout: ${this.settings.timeoutMs}ms)`,
    );

    // Jalankan pemeriksaan awal
    this.runCycle();

    // Jadwalkan putaran berkala
    this.timer = setInterval(() => {
      this.runCycle();
    }, this.settings.intervalSeconds * 1000);
  }

  /**
   * Menghentikan background service saat server shutdown.
   */
  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.isRunning = false;
    logger.info("Device Monitoring Service dihentikan");
  }

  /**
   * Satu siklus pemeriksaan seluruh perangkat aktif.
   */
  async runCycle() {
    if (this.isChecking) return;
    this.isChecking = true;

    try {
      const [cameras, audioDevices] = await Promise.all([
        prisma.camera.findMany({
          where: { isActive: true, deletedAt: null },
          select: {
            id: true,
            name: true,
            siteId: true,
            zoneId: true,
            host: true,
            port: true,
            adapterType: true,
            adapterConfig: true,
            streamKey: true,
            status: true,
            streamStatus: true,
            consecutiveFailures: true,
            isDemo: true,
          },
        }),
        prisma.audioDevice.findMany({
          where: { isActive: true, deletedAt: null },
          select: {
            id: true,
            name: true,
            siteId: true,
            zoneId: true,
            host: true,
            port: true,
            adapterType: true,
            adapterConfig: true,
            status: true,
            consecutiveFailures: true,
            isDemo: true,
          },
        }),
      ]);

      const allDevices = [
        ...cameras.map((c) => ({ ...c, type: "CAMERA" })),
        ...audioDevices.map((a) => ({ ...a, type: "AUDIO" })),
      ];

      if (allDevices.length > 0) {
        logger.debug(`Memulai pemeriksaan status untuk ${allDevices.length} perangkat`);
        // Jalankan pemeriksaan paralel dengan pembatasan
        for (const device of allDevices) {
          await this.checkDevice(device);
        }
      }
    } catch (err) {
      logger.error({ err }, "Error saat menjalankan siklus monitoring perangkat");
    } finally {
      this.isChecking = false;
    }
  }

  /**
   * Memeriksa satu perangkat, menghitung transisi status, dan mencatat histori/alarm jika berubah.
   */
  async checkDevice(device) {
    const isCamera = device.type === "CAMERA";
    const now = new Date();
    const fromStatus = device.status;

    // Untuk kamera CCTV nyata: status harus mencerminkan ketersediaan aktual stream video
    if (isCamera && (device.streamKey || device.adapterConfig?.streamUrl) && !device.isDemo) {
      try {
        const streamRes = await checkCameraStream(device);
        if (streamRes) {
          return {
            deviceId: device.id,
            fromStatus,
            toStatus: streamRes.status,
            latencyMs: streamRes.latencyMs,
            ok: streamRes.status === "ONLINE",
          };
        }
      } catch (err) {
        logger.warn({ err }, `Gagal memeriksa stream kamera ${device.id}`);
      }
    }

    let pingResult;
    try {
      pingResult = await pingDevice(device, this.settings.timeoutMs);
    } catch (err) {
      pingResult = { ok: false, latencyMs: 0, reason: err.message };
    }

    let toStatus = fromStatus;
    let nextFailures = device.consecutiveFailures;
    let statusReason = null;
    let consecutiveSuccess = this.consecutiveSuccesses.get(device.id) || 0;

    if (pingResult.ok) {
      // PING BERHASIL
      consecutiveSuccess += 1;
      this.consecutiveSuccesses.set(device.id, consecutiveSuccess);
      nextFailures = 0;

      if (fromStatus === "UNKNOWN") {
        toStatus = "ONLINE";
        statusReason = "Pemeriksaan awal berhasil";
      } else if (fromStatus === "OFFLINE" || fromStatus === "WARNING") {
        if (consecutiveSuccess >= this.settings.recoverAfterSuccesses) {
          toStatus = "ONLINE";
          statusReason = `Perangkat pulih kembali normal (lolos ${consecutiveSuccess}x uji)`;
        } else {
          toStatus = "WARNING";
          statusReason = `Merespons kembali, menunggu konfirmasi (${consecutiveSuccess}/${this.settings.recoverAfterSuccesses})`;
        }
      } else {
        // Tetap ONLINE
        toStatus = "ONLINE";
        statusReason = "Koneksi normal";
      }
    } else {
      // PING GAGAL
      consecutiveSuccess = 0;
      this.consecutiveSuccesses.set(device.id, 0);
      nextFailures += 1;

      if (fromStatus === "UNKNOWN" || nextFailures >= this.settings.offlineAfterFailures) {
        toStatus = "OFFLINE";
        statusReason = pingResult.reason || `Tidak merespons setelah ${nextFailures}x percobaan`;
      } else {
        toStatus = "WARNING";
        statusReason = pingResult.reason || `Gagal merespons (${nextFailures}/${this.settings.offlineAfterFailures} percobaan)`;
      }
    }

    const hasChanged = fromStatus !== toStatus;

    // Perbarui record perangkat di database
    const updateData = {
      status: toStatus,
      statusReason,
      lastCheckedAt: now,
      consecutiveFailures: nextFailures,
      ...(pingResult.ok && { lastSeenAt: now }),
      ...(hasChanged && { statusChangedAt: now }),
    };

    try {
      if (isCamera) {
        await prisma.camera.update({ where: { id: device.id }, data: updateData });
      } else {
        await prisma.audioDevice.update({ where: { id: device.id }, data: updateData });
      }

      // Jika terjadi perubahan status: catat append-only history, alarm event, dan broadcast via WebSocket
      if (hasChanged) {
        logger.info(
          `[Perangkat ${device.id}] Perubahan status: ${fromStatus} -> ${toStatus} (${statusReason})`,
        );

        // 1. Catat ke device_status_history
        const history = await prisma.deviceStatusHistory.create({
          data: {
            cameraId: isCamera ? device.id : null,
            audioDeviceId: !isCamera ? device.id : null,
            fromStatus,
            toStatus,
            reason: statusReason,
            latencyMs: pingResult.latencyMs || null,
            detail: pingResult.details || null,
            occurredAt: now,
          },
        });

        // 2. Buat Event Alarm HANYA jika perangkat berubah menjadi OFFLINE
        if (toStatus === "OFFLINE") {
          const event = await prisma.event.create({
            data: {
              type: "DEVICE_STATUS_CHANGE",
              severity: "CRITICAL",
              status: "OPEN",
              title: `[${device.id}] ${device.name} berubah status menjadi OFFLINE`,
              message: statusReason,
              cameraId: isCamera ? device.id : null,
              audioDeviceId: !isCamera ? device.id : null,
              siteId: device.siteId,
              zoneId: device.zoneId,
              statusHistoryId: history.id,
              dedupKey: `device:${device.id}:offline`,
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
            deviceId: device.id,
            timestamp: now,
          });
        }

        // 3. Jika perangkat pulih kembali ONLINE, otomatis selesaikan (RESOLVED) alarm OFFLINE terbuka
        if (toStatus === "ONLINE" && fromStatus === "OFFLINE") {
          await prisma.event.updateMany({
            where: {
              status: { in: ["OPEN", "ACKNOWLEDGED"] },
              OR: [{ cameraId: device.id }, { audioDeviceId: device.id }],
            },
            data: {
              status: "RESOLVED",
              resolvedAt: now,
              resolutionNote: "Perangkat pulih otomatis kembali ONLINE (Koneksi normal)",
            },
          });
        }

        // 3. Broadcast status perubahan perangkat via WebSocket Hub
        wsHub.broadcastDeviceStatus({
          deviceId: device.id,
          deviceType: device.type,
          status: toStatus,
          previousStatus: fromStatus,
          timestamp: now,
        });
      }

      // 4. Jika kamera memiliki streamKey, periksa juga ketersediaan video stream
      if (isCamera && device.streamKey) {
        await checkCameraStream({ ...device, status: toStatus });
      }
    } catch (err) {
      logger.error({ err, deviceId: device.id }, "Gagal menyimpan hasil pemantauan status perangkat");
    }

    return {
      deviceId: device.id,
      fromStatus,
      toStatus,
      latencyMs: pingResult.latencyMs,
      ok: pingResult.ok,
    };
  }

  /**
   * Pemicu manual: periksa semua perangkat sekarang juga (on-demand).
   */
  async checkAllNow() {
    await this.runCycle();
    return { success: true, message: "Pemeriksaan seluruh perangkat telah dijalankan" };
  }

  /**
   * Pemicu manual: periksa satu perangkat tertentu sekarang juga.
   */
  async checkSingleNow(deviceId) {
    const isCamera = deviceId.startsWith("CAM-");
    let device;

    if (isCamera) {
      device = await prisma.camera.findFirst({
        where: { id: deviceId, deletedAt: null },
      });
      if (device) device.type = "CAMERA";
    } else {
      device = await prisma.audioDevice.findFirst({
        where: { id: deviceId, deletedAt: null },
      });
      if (device) device.type = "AUDIO";
    }

    if (!device) return null;
    return this.checkDevice(device);
  }

  /**
   * Mendapatkan status monitoring worker.
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      isChecking: this.isChecking,
      settings: this.settings,
    };
  }
}

export const monitoringService = new DeviceMonitoringService();
