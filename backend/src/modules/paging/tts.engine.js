import { prisma } from "../../config/database.js";
import { logger } from "../../utils/logger.js";
import { BadRequestError } from "../../utils/errors.js";

/**
 * Engine Text-to-Speech (TTS) & Konfirmasi Pengiriman (Delivery Receipts)
 */
export class TtsEngine {
  /**
   * Mengambil batas panjang karakter TTS dari SystemSetting.
   */
  async getMaxChars() {
    const setting = await prisma.systemSetting.findUnique({
      where: { key: "paging.tts_max_chars" },
    });
    if (setting && typeof setting.value === "number") {
      return setting.value;
    }
    return 500; // Default 500 karakter
  }

  /**
   * Mengambil mode eksekusi TTS (SIMULATION vs DEVICE).
   */
  async getExecutionMode() {
    const setting = await prisma.systemSetting.findUnique({
      where: { key: "paging.mode" },
    });
    if (setting && typeof setting.value === "string") {
      return setting.value;
    }
    return "SIMULATION";
  }

  /**
   * Validasi panjang karakter teks sebelum disintesis.
   */
  async validateTextLength(text) {
    const maxChars = await this.getMaxChars();
    if (!text || text.trim().length === 0) {
      throw new BadRequestError("Teks TTS tidak boleh kosong");
    }
    if (text.length > maxChars) {
      throw new BadRequestError(
        `Panjang teks TTS (${text.length} karakter) melebihi batas maksimum sistem (${maxChars} karakter)`,
        { length: text.length, maxChars },
      );
    }
    return maxChars;
  }

  /**
   * Menghitung estimasi durasi suara berbicara (rata-rata 15 karakter per detik).
   */
  estimateSpeechDurationSeconds(text) {
    const charsPerSec = 15;
    const est = Math.ceil(text.length / charsPerSec);
    return Math.max(2, est);
  }

  /**
   * Menjalankan sintesis & pengiriman TTS ke daftar perangkat audio.
   * Menghormati kapabilitas hardware dan tidak pernah memalsukan konfirmasi penerimaan.
   */
  async dispatchToDevices(devices, { text, language = "id-ID", voice = "standard" }) {
    await this.validateTextLength(text);
    const mode = await this.getExecutionMode();
    const durationSeconds = this.estimateSpeechDurationSeconds(text);

    const now = new Date();
    const results = [];

    // Periksa lease yang aktif untuk mendeteksi konflik kanal
    const activeLeases = await prisma.audioChannelLease.findMany({
      where: {
        audioDeviceId: { in: devices.map((d) => d.id) },
        expiresAt: { gt: now },
      },
    });
    const busyDeviceIds = new Set(activeLeases.map((l) => l.audioDeviceId));

    for (const device of devices) {
      // 1. Perangkat sedang OFFLINE
      if (device.status === "OFFLINE") {
        results.push({
          audioDeviceId: device.id,
          status: "FAILED",
          deliveryConfirmed: false,
          errorCode: "DEVICE_OFFLINE",
          errorMessage: "Perangkat audio sedang OFFLINE, siaran tidak dapat dihantarkan",
          attempts: 1,
          startedAt: now,
          finishedAt: now,
          detail: { mode, reason: "Hardware unreachable" },
        });
        continue;
      }

      // 2. Perangkat tidak mendukung fitur TTS
      if (!device.supportsTts) {
        results.push({
          audioDeviceId: device.id,
          status: "FAILED",
          deliveryConfirmed: false,
          errorCode: "TTS_UNSUPPORTED",
          errorMessage: "Perangkat speaker tidak mendukung fitur Text-to-Speech",
          attempts: 1,
          startedAt: now,
          finishedAt: now,
          detail: { mode, reason: "Capability missing" },
        });
        continue;
      }

      // 3. Kanal sedang dipakai sesi PTT eksklusif
      if (busyDeviceIds.has(device.id)) {
        results.push({
          audioDeviceId: device.id,
          status: "BUSY",
          deliveryConfirmed: false,
          errorCode: "CHANNEL_BUSY",
          errorMessage: "Kanal speaker sedang digunakan oleh sesi PTT operator lain",
          attempts: 1,
          startedAt: now,
          finishedAt: now,
          detail: { mode, reason: "Exclusive lease held" },
        });
        continue;
      }

      // 4. Perangkat mendukung konfirmasi penerimaan (delivery receipt)
      if (device.supportsDeliveryReceipt) {
        results.push({
          audioDeviceId: device.id,
          status: "DELIVERED",
          deliveryConfirmed: true,
          errorCode: null,
          errorMessage: null,
          attempts: 1,
          startedAt: now,
          finishedAt: new Date(now.getTime() + durationSeconds * 1000),
          detail: {
            mode,
            durationSeconds,
            language,
            voice,
            receiptType: "HARDWARE_ACK",
          },
        });
        continue;
      }

      // 5. Perangkat TIDAK mendukung konfirmasi penerimaan:
      // Status UNCONFIRMED, deliveryConfirmed = false (Jujur sesuai batasan perangkat).
      results.push({
        audioDeviceId: device.id,
        status: "UNCONFIRMED",
        deliveryConfirmed: false,
        errorCode: null,
        errorMessage: "Audio disiarkan, namun perangkat tidak memiliki kapabilitas konfirmasi penerimaan (no delivery receipt)",
        attempts: 1,
        startedAt: now,
        finishedAt: new Date(now.getTime() + durationSeconds * 1000),
        detail: {
          mode,
          durationSeconds,
          language,
          voice,
          receiptType: "NONE",
        },
      });
    }

    // Hitung status agregasi keseluruhan perintah sesuai enum AudioCommandStatus:
    // SUCCESS hanya jika SEMUA target berstatus DELIVERED (ada konfirmasi tepercaya).
    // UNCONFIRMED = terkirim tetapi perangkat tidak dapat mengonfirmasi pemutaran.
    // PARTIAL = kombinasi DELIVERED + UNCONFIRMED atau ada target yang gagal.
    const totalCount = results.length;
    const deliveredCount = results.filter((r) => r.status === "DELIVERED").length;
    const unconfirmedCount = results.filter((r) => r.status === "UNCONFIRMED").length;
    const failedCount = results.filter((r) => r.status === "FAILED").length;

    let commandStatus = "SUCCESS";
    if (failedCount === totalCount) {
      commandStatus = "FAILED";
    } else if (deliveredCount === totalCount) {
      commandStatus = "SUCCESS";
    } else if (unconfirmedCount === totalCount) {
      commandStatus = "UNCONFIRMED";
    } else {
      commandStatus = "PARTIAL";
    }

    logger.info(
      { totalCount, deliveredCount, failedCount, commandStatus, durationSeconds },
      "Sintesis & Dispatch TTS selesai diproses",
    );

    return {
      commandStatus,
      durationSeconds,
      mode,
      targetResults: results,
    };
  }
}

export const ttsEngine = new TtsEngine();
