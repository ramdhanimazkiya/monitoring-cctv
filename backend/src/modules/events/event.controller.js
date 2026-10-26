import * as eventService from "./event.service.js";

export async function listEvents(req, res, next) {
  try {
    const query = req.validatedQuery || req.query;
    const result = await eventService.listEvents(query);
    res.json({
      success: true,
      data: result.events,
      pagination: result.pagination,
    });
  } catch (err) {
    next(err);
  }
}

export async function getEvent(req, res, next) {
  try {
    const data = await eventService.getEventById(req.params.id);
    res.json({
      success: true,
      data,
    });
  } catch (err) {
    next(err);
  }
}

export async function getStats(req, res, next) {
  try {
    const data = await eventService.getEventStats();
    res.json({
      success: true,
      data,
    });
  } catch (err) {
    next(err);
  }
}

export async function acknowledge(req, res, next) {
  try {
    const data = await eventService.acknowledgeEvent(req.params.id, req.user, req);
    res.json({
      success: true,
      data,
      message: "Event alarm berhasil di-acknowledge",
    });
  } catch (err) {
    next(err);
  }
}

export async function resolve(req, res, next) {
  try {
    const note = req.body?.resolutionNote;
    const data = await eventService.resolveEvent(req.params.id, req.user, note, req);
    res.json({
      success: true,
      data,
      message: "Event alarm berhasil diselesaikan (RESOLVED)",
    });
  } catch (err) {
    next(err);
  }
}

export async function getRecap(req, res, next) {
  try {
    const query = req.validatedQuery || req.query;
    const data = await eventService.getSystemRecap(query);
    res.json({
      success: true,
      data,
    });
  } catch (err) {
    next(err);
  }
}

export async function exportEvents(req, res, next) {
  try {
    const query = req.validatedQuery || req.query;
    const [events, recap] = await Promise.all([
      eventService.exportEvents(query),
      eventService.getSystemRecap(query),
    ]);

    const format = req.query.format || "csv";
    if (format === "json") {
      res.setHeader("Content-Disposition", 'attachment; filename="laporan_event_alarm_rekapitulasi.json"');
      res.setHeader("Content-Type", "application/json");
      return res.send(JSON.stringify({ recap, events }, null, 2));
    }

    const escapeCsv = (val) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const formatWib = (isoStr) => {
      if (!isoStr) return "-";
      const d = new Date(isoStr);
      if (isNaN(d.getTime())) return String(isoStr);
      return (
        d.toLocaleString("id-ID", {
          timeZone: "Asia/Jakarta",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        }) + " WIB"
      );
    };

    const nowWib = formatWib(new Date().toISOString());
    const filterRangeStr =
      query.startDate || query.endDate
        ? `${query.startDate || "Awal"} s/d ${query.endDate || "Sekarang"}`
        : "Semua Rentang Waktu";
    const filterStatusStr =
      query.status && query.status !== "ALL" ? query.status : "Semua Status (OFFLINE & RESOLVED)";
    const filterDeviceTypeStr =
      query.deviceType && query.deviceType !== "ALL" ? query.deviceType : "Semua Jenis Perangkat";

    const lines = [];

    // Header metadata report
    lines.push("# ==============================================================================");
    lines.push("# LAPORAN REKAPITULASI CCTV & AUDIO PAGING SERTA LOG EVENT ALARM");
    lines.push(`# Waktu Unduh Laporan : ${nowWib}`);
    lines.push(`# Filter Rentang Waktu: ${filterRangeStr}`);
    lines.push(`# Filter Status       : ${filterStatusStr}`);
    lines.push(`# Filter Perangkat    : ${filterDeviceTypeStr}`);
    lines.push("# ==============================================================================");
    lines.push("");

    // BAGIAN 1: REKAPITULASI CCTV
    lines.push("# ------------------------------------------------------------------------------");
    lines.push("# BAGIAN 1: REKAPITULASI CCTV");
    lines.push("# ------------------------------------------------------------------------------");
    lines.push(["Metrik CCTV", "Persentase"].map(escapeCsv).join(","));
    lines.push(
      ["Rata-rata CCTV Online", `${recap.cctv.onlinePercent}%`].map(escapeCsv).join(","),
    );
    lines.push(
      ["Rata-rata CCTV Offline", `${recap.cctv.offlinePercent}%`].map(escapeCsv).join(","),
    );
    lines.push("");

    // BAGIAN 2: REKAPITULASI AUDIO
    lines.push("# ------------------------------------------------------------------------------");
    lines.push("# BAGIAN 2: REKAPITULASI AUDIO");
    lines.push("# ------------------------------------------------------------------------------");
    lines.push(["Metrik Audio", "Nilai"].map(escapeCsv).join(","));
    lines.push(
      ["Rata-rata Audio Online", `${recap.audio.onlinePercent ?? 0}%`].map(escapeCsv).join(","),
    );
    lines.push(
      ["Rata-rata Audio Offline", `${recap.audio.offlinePercent ?? 0}%`].map(escapeCsv).join(","),
    );
    lines.push(["Total PTT", recap.audio.totalPtt].map(escapeCsv).join(","));
    lines.push(["Total Sesi", `${recap.audio.totalSessions} Sesi`].map(escapeCsv).join(","));
    lines.push("");

    // BAGIAN 3: DAFTAR RINCIAN INSIDEN EVENT & ALARM
    lines.push("# ------------------------------------------------------------------------------");
    lines.push("# BAGIAN 3: DAFTAR RINCIAN LOG INSIDEN EVENT & ALARM");
    lines.push("# ------------------------------------------------------------------------------");
    const headers = [
      "ID Insiden",
      "Waktu Kejadian (WIB)",
      "Status",
      "Tingkat Keparahan",
      "Tipe Perangkat",
      "Tipe Event",
      "Judul Insiden",
      "Pesan Insiden",
      "ID Kamera",
      "ID Audio Speaker",
      "Lokasi Site",
      "Zona Area",
      "Di-Acknowledge Oleh",
      "Diselesaikan Oleh",
      "Waktu Pemulihan (WIB)",
      "Catatan Resolusi",
    ];
    lines.push(headers.map(escapeCsv).join(","));

    for (const e of events) {
      const deviceType = e.cameraId ? "Kamera CCTV" : e.audioDeviceId ? "Audio Speaker" : "Perangkat Lain";
      lines.push(
        [
          escapeCsv(e.id),
          escapeCsv(formatWib(e.occurredAt)),
          escapeCsv(e.status),
          escapeCsv(e.severity),
          escapeCsv(deviceType),
          escapeCsv(e.type),
          escapeCsv(e.title),
          escapeCsv(e.message),
          escapeCsv(e.cameraId || "-"),
          escapeCsv(e.audioDeviceId || "-"),
          escapeCsv(e.siteName || "-"),
          escapeCsv(e.zoneName || "-"),
          escapeCsv(e.acknowledgedByName || "-"),
          escapeCsv(e.resolvedByName || "-"),
          escapeCsv(e.resolvedAt ? formatWib(e.resolvedAt) : "-"),
          escapeCsv(e.resolutionNote || "-"),
        ].join(","),
      );
    }

    const csvContent = "\uFEFF" + lines.join("\r\n");

    res.setHeader("Content-Disposition", 'attachment; filename="laporan_event_alarm_rekapitulasi.csv"');
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    return res.send(csvContent);
  } catch (err) {
    next(err);
  }
}
