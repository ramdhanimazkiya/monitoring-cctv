import "dotenv/config";
import bcrypt from "bcryptjs";
import { prisma } from "../src/config/database.js";

async function main() {
  console.log("=== MENGOSONGKAN SELURUH ISI DATABASE ===");

  // 1. Ambil hitungan sebelum pengosongan
  const countsBefore = {
    sites: await prisma.site.count(),
    zones: await prisma.zone.count(),
    cameras: await prisma.camera.count(),
    audioDevices: await prisma.audioDevice.count(),
    events: await prisma.event.count(),
    deviceStatusHistory: await prisma.deviceStatusHistory.count(),
    audioSchedules: await prisma.audioSchedule.count(),
    audioCommands: await prisma.audioCommand.count(),
    audioGroups: await prisma.audioGroup.count(),
    auditLogs: await prisma.auditLog.count(),
    sessions: await prisma.session.count(),
    users: await prisma.user.count(),
  };
  console.log("Jumlah data sebelum dikosongkan:", countsBefore);

  // 2. Truncate semua tabel data operasional dengan CASCADE
  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE 
      "audit_logs",
      "audio_schedule_executions",
      "audio_schedule_targets",
      "audio_schedules",
      "audio_command_targets",
      "audio_commands",
      "audio_channel_leases",
      "audio_group_members",
      "audio_groups",
      "device_status_history",
      "events",
      "cameras",
      "audio_devices",
      "user_zone_access",
      "zones",
      "sites",
      "sessions"
    CASCADE;
  `);
  console.log("✓ Semua tabel operasional berhasil di-TRUNCATE (CASCADE).");

  // 3. Reset Sequences agar ID berikutnya mulai dari 1 (SIT-0001, CAM-0001, dst)
  await prisma.$executeRawUnsafe(`
    ALTER SEQUENCE IF EXISTS site_id_seq RESTART WITH 1;
    ALTER SEQUENCE IF EXISTS zone_id_seq RESTART WITH 1;
    ALTER SEQUENCE IF EXISTS camera_id_seq RESTART WITH 1;
    ALTER SEQUENCE IF EXISTS audio_device_id_seq RESTART WITH 1;
    ALTER SEQUENCE IF EXISTS audio_group_id_seq RESTART WITH 1;
    ALTER SEQUENCE IF EXISTS audio_schedule_id_seq RESTART WITH 1;
  `);
  console.log("✓ Sequence ID perangkat, zona, dan site berhasil di-reset ke 1.");

  // 4. Periksa pengguna yang ada
  const existingUsers = await prisma.user.findMany({
    select: { id: true, username: true, role: true, isActive: true },
  });
  console.log("Pengguna yang terdaftar saat ini:", existingUsers);

  // Hapus pengguna non-seeder jika ada (dengan app.allow_purge = 'on')
  await prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(`SET LOCAL app.allow_purge = 'on';`);
    await tx.$executeRawUnsafe(`DELETE FROM "users" WHERE "username" NOT IN ('admin', 'operator');`);
  });

  const BCRYPT_ROUNDS = 12;
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || "AdminPassword123!";
  const operatorPassword = process.env.SEED_OPERATOR_PASSWORD || "OperatorPassword123!";

  const adminHash = await bcrypt.hash(adminPassword, BCRYPT_ROUNDS);
  const opHash = await bcrypt.hash(operatorPassword, BCRYPT_ROUNDS);

  // Upsert user admin
  await prisma.user.upsert({
    where: { username: "admin" },
    update: {
      passwordHash: adminHash,
      failedLoginCount: 0,
      lockedUntil: null,
      isActive: true,
      role: "ADMIN",
      deletedAt: null,
    },
    create: {
      username: "admin",
      fullName: "Administrator",
      role: "ADMIN",
      passwordHash: adminHash,
    },
  });

  // Upsert user operator
  await prisma.user.upsert({
    where: { username: "operator" },
    update: {
      passwordHash: opHash,
      failedLoginCount: 0,
      lockedUntil: null,
      isActive: true,
      role: "OPERATOR",
      deletedAt: null,
    },
    create: {
      username: "operator",
      fullName: "Operator",
      role: "OPERATOR",
      passwordHash: opHash,
    },
  });
  console.log("✓ Seeder login (admin & operator) berhasil dipastikan tersedia.");

  // 5. Verifikasi jumlah data setelah pengosongan
  const countsAfter = {
    sites: await prisma.site.count(),
    zones: await prisma.zone.count(),
    cameras: await prisma.camera.count(),
    audioDevices: await prisma.audioDevice.count(),
    events: await prisma.event.count(),
    deviceStatusHistory: await prisma.deviceStatusHistory.count(),
    audioSchedules: await prisma.audioSchedule.count(),
    audioCommands: await prisma.audioCommand.count(),
    audioGroups: await prisma.audioGroup.count(),
    auditLogs: await prisma.auditLog.count(),
    sessions: await prisma.session.count(),
    users: await prisma.user.count(),
  };
  console.log("Jumlah data setelah dikosongkan:", countsAfter);
  console.log("=== PENGOSONGAN DATABASE SELESAI ===");
}

main()
  .catch((e) => {
    console.error("Gagal mengosongkan database:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
