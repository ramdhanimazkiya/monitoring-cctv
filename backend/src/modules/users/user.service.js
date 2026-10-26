import bcrypt from "bcryptjs";
import { prisma } from "../../config/database.js";
import { recordAuditLog } from "../../services/audit.service.js";
import { NotFoundError, BadRequestError, ConflictError } from "../../utils/errors.js";

const BCRYPT_ROUNDS = 12;

function sanitizeUser(user) {
  if (!user) return null;
  const { passwordHash, ...rest } = user;
  const zoneAccess = user.zoneAccess || [];
  return {
    ...rest,
    zoneIds: zoneAccess.map((za) => za.zoneId),
    zones: zoneAccess.map((za) => za.zone || { id: za.zoneId }),
  };
}

export async function listUsers() {
  const users = await prisma.user.findMany({
    where: { deletedAt: null },
    include: {
      zoneAccess: {
        include: {
          zone: {
            select: { id: true, name: true, siteId: true },
          },
        },
      },
    },
    orderBy: { id: "asc" },
  });

  return users.map(sanitizeUser);
}

export async function getUserById(id) {
  const user = await prisma.user.findFirst({
    where: { id, deletedAt: null },
    include: {
      zoneAccess: {
        include: {
          zone: {
            select: { id: true, name: true, siteId: true },
          },
        },
      },
    },
  });

  if (!user) {
    throw new NotFoundError(`Pengguna dengan ID ${id} tidak ditemukan`);
  }

  return sanitizeUser(user);
}

export async function createUser(data, actorId, req) {
  const normalizedUsername = data.username.toLowerCase().trim();

  // 1. Cek keunikan username (termasuk yang soft-deleted untuk integritas constraint)
  const existingUsername = await prisma.user.findFirst({
    where: { username: normalizedUsername },
  });
  if (existingUsername) {
    if (existingUsername.deletedAt) {
      throw new ConflictError(`Username '${normalizedUsername}' pernah digunakan sebelumnya (diarsipkan)`);
    }
    throw new ConflictError(`Username '${normalizedUsername}' sudah digunakan`);
  }

  // 2. Cek keunikan email jika diisi
  if (data.email) {
    const normalizedEmail = data.email.toLowerCase().trim();
    const existingEmail = await prisma.user.findFirst({
      where: { email: normalizedEmail, deletedAt: null },
    });
    if (existingEmail) {
      throw new ConflictError(`Email '${normalizedEmail}' sudah terdaftar`);
    }
  }

  // 3. Hash password
  const passwordHash = await bcrypt.hash(data.password, BCRYPT_ROUNDS);

  // 4. Generate user ID otomatis USR-xxxx
  const existingUsers = await prisma.user.findMany({ select: { id: true } });
  const nums = existingUsers.map((u) => {
    const m = u.id.match(/\d+/);
    return m ? parseInt(m[0], 10) : 0;
  });
  const maxNum = nums.length > 0 ? Math.max(...nums) : 0;
  const userId = `USR-${String(maxNum + 1).padStart(4, "0")}`;

  const zoneIds = Array.isArray(data.zoneIds) ? data.zoneIds : [];

  const created = await prisma.user.create({
    data: {
      id: userId,
      username: normalizedUsername,
      fullName: data.fullName.trim(),
      email: data.email?.trim() || null,
      passwordHash,
      role: data.role || "OPERATOR",
      isActive: data.isActive !== false,
      zoneAccess: zoneIds.length > 0
        ? {
            create: zoneIds.map((zoneId) => ({ zoneId })),
          }
        : undefined,
    },
    include: {
      zoneAccess: {
        include: {
          zone: {
            select: { id: true, name: true, siteId: true },
          },
        },
      },
    },
  });

  const safe = sanitizeUser(created);

  await recordAuditLog({
    userId: actorId,
    action: "USER_CREATED",
    entityType: "user",
    entityId: created.id,
    after: safe,
    req,
  });

  return safe;
}

export async function updateUser(id, data, actorId, req) {
  const existing = await prisma.user.findFirst({
    where: { id, deletedAt: null },
    include: {
      zoneAccess: true,
    },
  });

  if (!existing) {
    throw new NotFoundError(`Pengguna dengan ID ${id} tidak ditemukan`);
  }

  // Cek email jika diubah
  if (data.email && data.email !== existing.email) {
    const normalizedEmail = data.email.toLowerCase().trim();
    const duplicateEmail = await prisma.user.findFirst({
      where: { email: normalizedEmail, id: { not: id }, deletedAt: null },
    });
    if (duplicateEmail) {
      throw new ConflictError(`Email '${normalizedEmail}' sudah digunakan oleh pengguna lain`);
    }
  }

  // Proteksi: Jika menonaktifkan atau mengubah role admin terakhir
  if (existing.role === "ADMIN" && (data.isActive === false || (data.role && data.role !== "ADMIN"))) {
    const activeAdminCount = await prisma.user.count({
      where: { role: "ADMIN", isActive: true, deletedAt: null },
    });
    if (activeAdminCount <= 1) {
      throw new BadRequestError("Tidak dapat menonaktifkan atau menurunkan role satu-satunya Administrator yang aktif");
    }
  }

  const updateData = {};
  if (data.fullName !== undefined) updateData.fullName = data.fullName.trim();
  if (data.email !== undefined) updateData.email = data.email?.trim() || null;
  if (data.role !== undefined) updateData.role = data.role;
  if (data.isActive !== undefined) updateData.isActive = data.isActive;

  if (data.password && data.password.trim().length >= 8) {
    updateData.passwordHash = await bcrypt.hash(data.password.trim(), BCRYPT_ROUNDS);
  }

  // Update zona akses jika zoneIds disertakan
  if (Array.isArray(data.zoneIds)) {
    await prisma.userZoneAccess.deleteMany({
      where: { userId: id },
    });
    if (data.zoneIds.length > 0) {
      await prisma.userZoneAccess.createMany({
        data: data.zoneIds.map((zoneId) => ({ userId: id, zoneId })),
        skipDuplicates: true,
      });
    }
  }

  const updated = await prisma.user.update({
    where: { id },
    data: updateData,
    include: {
      zoneAccess: {
        include: {
          zone: {
            select: { id: true, name: true, siteId: true },
          },
        },
      },
    },
  });

  const safe = sanitizeUser(updated);

  await recordAuditLog({
    userId: actorId,
    action: "USER_UPDATED",
    entityType: "user",
    entityId: id,
    before: sanitizeUser(existing),
    after: safe,
    req,
  });

  return safe;
}

export async function deleteUser(id, actorId, req) {
  if (id === actorId) {
    throw new BadRequestError("Anda tidak dapat menghapus akun Anda sendiri");
  }

  const existing = await prisma.user.findFirst({
    where: { id, deletedAt: null },
  });

  if (!existing) {
    throw new NotFoundError(`Pengguna dengan ID ${id} tidak ditemukan`);
  }

  if (existing.role === "ADMIN") {
    const activeAdminCount = await prisma.user.count({
      where: { role: "ADMIN", isActive: true, deletedAt: null },
    });
    if (activeAdminCount <= 1) {
      throw new BadRequestError("Tidak dapat menghapus satu-satunya Administrator aktif");
    }
  }

  // Soft delete user & nonaktifkan sesi
  const updated = await prisma.user.update({
    where: { id },
    data: {
      deletedAt: new Date(),
      isActive: false,
    },
  });

  // Cabut semua sesi aktif
  await prisma.session.updateMany({
    where: { userId: id, revokedAt: null },
    data: { revokedAt: new Date() },
  });

  await recordAuditLog({
    userId: actorId,
    action: "USER_DELETED",
    entityType: "user",
    entityId: id,
    before: sanitizeUser(existing),
    req,
  });

  return sanitizeUser(updated);
}
