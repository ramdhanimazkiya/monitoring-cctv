import { prisma } from "../../config/database.js";
import { NotFoundError } from "../../utils/errors.js";

function formatAuditLog(log) {
  if (!log) return null;
  const actor = log.user?.username || log.actorUsername || (log.userId ? log.userId : "Sistem");
  return {
    id: log.id.toString(),
    userId: log.userId,
    actorUsername: log.actorUsername,
    actor,
    userFullName: log.user?.fullName || null,
    userRole: log.user?.role || null,
    action: log.action,
    entityType: log.entityType,
    entityId: log.entityId,
    result: log.result,
    message: log.message,
    before: log.before,
    after: log.after,
    ipAddress: log.ipAddress,
    userAgent: log.userAgent,
    requestId: log.requestId,
    createdAt: log.createdAt.toISOString(),
  };
}

export async function listAuditLogs(params = {}) {
  const page = Math.max(1, Number(params.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(params.limit) || 20));
  const skip = (page - 1) * limit;

  const where = {};

  if (params.result && ["SUCCESS", "FAILURE"].includes(params.result)) {
    where.result = params.result;
  }

  if (params.entityType && params.entityType !== "ALL") {
    where.entityType = { equals: params.entityType, mode: "insensitive" };
  }

  if (params.action && params.action !== "ALL") {
    where.action = { contains: params.action, mode: "insensitive" };
  }

  if (params.startDate || params.endDate) {
    where.createdAt = {};
    if (params.startDate) {
      where.createdAt.gte = new Date(params.startDate);
    }
    if (params.endDate) {
      const end = new Date(params.endDate);
      if (params.endDate.length <= 10) {
        end.setHours(23, 59, 59, 999);
      }
      where.createdAt.lte = end;
    }
  }

  if (params.search && params.search.trim()) {
    const q = params.search.trim();
    where.OR = [
      { action: { contains: q, mode: "insensitive" } },
      { actorUsername: { contains: q, mode: "insensitive" } },
      { userId: { contains: q, mode: "insensitive" } },
      { entityType: { contains: q, mode: "insensitive" } },
      { entityId: { contains: q, mode: "insensitive" } },
      { message: { contains: q, mode: "insensitive" } },
      { ipAddress: { contains: q, mode: "insensitive" } },
    ];
  }

  const [total, logs] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            fullName: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
  ]);

  return {
    logs: logs.map(formatAuditLog),
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
}

export async function getAuditLogById(id) {
  let bigId;
  try {
    bigId = BigInt(id);
  } catch {
    throw new NotFoundError(`ID Audit log tidak valid: ${id}`);
  }

  const log = await prisma.auditLog.findUnique({
    where: { id: bigId },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          fullName: true,
          role: true,
        },
      },
    },
  });

  if (!log) {
    throw new NotFoundError(`Audit log dengan ID ${id} tidak ditemukan`);
  }

  return formatAuditLog(log);
}

export async function getAuditStats() {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const [total, successCount, failureCount, todayCount, rawActions, rawEntities] = await Promise.all([
    prisma.auditLog.count(),
    prisma.auditLog.count({ where: { result: "SUCCESS" } }),
    prisma.auditLog.count({ where: { result: "FAILURE" } }),
    prisma.auditLog.count({ where: { createdAt: { gte: startOfDay } } }),
    prisma.auditLog.findMany({
      select: { action: true },
      distinct: ["action"],
      orderBy: { action: "asc" },
    }),
    prisma.auditLog.findMany({
      where: { entityType: { not: null } },
      select: { entityType: true },
      distinct: ["entityType"],
      orderBy: { entityType: "asc" },
    }),
  ]);

  const actions = rawActions.map((a) => a.action);
  const entityTypes = rawEntities.map((e) => e.entityType).filter(Boolean);

  return {
    total,
    successCount,
    failureCount,
    todayCount,
    actions,
    entityTypes,
  };
}

export async function exportAuditLogs(params = {}) {
  const result = await listAuditLogs({ ...params, page: 1, limit: 2000 });
  return result.logs;
}
