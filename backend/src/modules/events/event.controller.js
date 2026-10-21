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

export async function exportEvents(req, res, next) {
  try {
    const query = req.validatedQuery || req.query;
    const events = await eventService.exportEvents(query);

    const format = req.query.format || "csv";
    if (format === "json") {
      res.setHeader("Content-Disposition", 'attachment; filename="events_alarms.json"');
      res.setHeader("Content-Type", "application/json");
      return res.send(JSON.stringify(events, null, 2));
    }

    // Default CSV
    const headers = [
      "ID",
      "Waktu Kejadian",
      "Tingkat",
      "Tipe",
      "Status",
      "Judul",
      "Pesan",
      "Kamera ID",
      "Audio Device ID",
      "Site",
      "Zona",
      "Di-Acknowledge Oleh",
      "Diselesaikan Oleh",
      "Catatan Resolusi",
    ];

    const escapeCsv = (val) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = events.map((e) => [
      escapeCsv(e.id),
      escapeCsv(e.occurredAt),
      escapeCsv(e.severity),
      escapeCsv(e.type),
      escapeCsv(e.status),
      escapeCsv(e.title),
      escapeCsv(e.message),
      escapeCsv(e.cameraId),
      escapeCsv(e.audioDeviceId),
      escapeCsv(e.siteName),
      escapeCsv(e.zoneName),
      escapeCsv(e.acknowledgedByName),
      escapeCsv(e.resolvedByName),
      escapeCsv(e.resolutionNote),
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");

    res.setHeader("Content-Disposition", 'attachment; filename="events_alarms.csv"');
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    return res.send(csvContent);
  } catch (err) {
    next(err);
  }
}
