import * as auditService from "./audit.service.js";

export async function listLogs(req, res, next) {
  try {
    const query = req.validatedQuery || req.query;
    const result = await auditService.listAuditLogs(query);
    res.json({
      success: true,
      data: result.logs,
      pagination: result.pagination,
    });
  } catch (err) {
    next(err);
  }
}

export async function getLog(req, res, next) {
  try {
    const data = await auditService.getAuditLogById(req.params.id);
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
    const data = await auditService.getAuditStats();
    res.json({
      success: true,
      data,
    });
  } catch (err) {
    next(err);
  }
}

export async function exportLogs(req, res, next) {
  try {
    const query = req.validatedQuery || req.query;
    const logs = await auditService.exportAuditLogs(query);

    const format = req.query.format || "csv";
    if (format === "json") {
      res.setHeader("Content-Disposition", 'attachment; filename="audit_logs.json"');
      res.setHeader("Content-Type", "application/json");
      return res.send(JSON.stringify(logs, null, 2));
    }

    // Format CSV
    const headers = ["ID", "Waktu", "Aktor", "Aksi", "Tipe Entitas", "ID Entitas", "Hasil", "IP Address", "Pesan"];
    const escapeCsv = (val) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = logs.map((l) => [
      escapeCsv(l.id),
      escapeCsv(l.createdAt),
      escapeCsv(l.actor),
      escapeCsv(l.action),
      escapeCsv(l.entityType),
      escapeCsv(l.entityId),
      escapeCsv(l.result),
      escapeCsv(l.ipAddress),
      escapeCsv(l.message),
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");

    res.setHeader("Content-Disposition", 'attachment; filename="audit_logs.csv"');
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    return res.send(csvContent);
  } catch (err) {
    next(err);
  }
}
