/**
 * Seed data DEMO & data dasar. Idempotent: aman dijalankan berulang kali dan
 * TIDAK menimpa atau menghapus data yang sudah ada.
 *
 *  - SystemSetting : dibuat jika key belum ada (nilai yang sudah diubah admin tidak ditimpa).
 *  - User demo     : dibuat jika username belum ada (password tidak pernah di-reset oleh seed).
 *  - Data demo     : dibuat hanya jika record demo bernama sama belum ada.
 *
 * Seed menolak berjalan pada NODE_ENV=production.
 * ID (USR-/SIT-/ZON-/CAM-/AUD-/GRP-/SCH-) selalu dibuat otomatis oleh database.
 */
import "dotenv/config";
import bcrypt from "bcryptjs";
import { prisma } from "../src/config/database.js";

if (process.env.NODE_ENV === "production") {
  console.error("Seed demo ditolak: NODE_ENV=production.");
  process.exit(1);
}

const BCRYPT_ROUNDS = 12;

function requirePassword(name) {
  const value = process.env[name];
  if (!value || value.length < 12 || value.startsWith("GANTI_")) {
    console.error(`${name} belum diatur (minimal 12 karakter, bukan nilai contoh). Lihat backend/.env.example.`);
    process.exit(1);
  }
  return value;
}

const DEFAULT_SETTINGS = [
  ["app.timezone", "Asia/Jakarta", "Timezone tampilan & default jadwal (IANA)"],
  ["monitoring.check_interval_seconds", 30, "Interval health check perangkat"],
  ["monitoring.check_timeout_ms", 5000, "Timeout satu pemeriksaan perangkat"],
  ["monitoring.offline_after_failures", 3, "Jumlah kegagalan berturut-turut sebelum OFFLINE"],
  ["monitoring.recover_after_successes", 2, "Jumlah sukses berturut-turut sebelum kembali ONLINE"],
  ["paging.ptt_lease_seconds", 60, "Durasi lease kanal PTT tanpa heartbeat"],
  ["paging.tts_max_chars", 500, "Batas panjang teks TTS (maks DB: 1000)"],
  ["paging.mode", "SIMULATION", "SIMULATION atau DEVICE (perangkat nyata)"],
  ["retention.device_status_history_days", 365, "Retensi histori status perangkat"],
  ["retention.events_days", 365, "Retensi event & alarm"],
  ["retention.audio_commands_days", 365, "Retensi riwayat PTT/TTS"],
  ["retention.audit_logs_days", 730, "Retensi audit log"],
  ["retention.sessions_days", 30, "Retensi session kedaluwarsa"],
];

async function seedSettings() {
  for (const [key, value, description] of DEFAULT_SETTINGS) {
    await prisma.systemSetting.upsert({ where: { key }, update: {}, create: { key, value, description } });
  }
  console.log(`  settings : ${DEFAULT_SETTINGS.length} key dipastikan ada`);
}

async function seedUsers() {
  const accounts = [
    { username: "admin", fullName: "Administrator Demo", role: "ADMIN", env: "SEED_ADMIN_PASSWORD" },
    { username: "operator", fullName: "Operator Demo", role: "OPERATOR", env: "SEED_OPERATOR_PASSWORD" },
  ];
  const result = {};
  for (const a of accounts) {
    const existing = await prisma.user.findUnique({ where: { username: a.username } });
    if (existing) {
      result[a.username] = existing;
      console.log(`  user     : ${a.username} sudah ada (${existing.id}), dilewati`);
      continue;
    }
    const passwordHash = await bcrypt.hash(requirePassword(a.env), BCRYPT_ROUNDS);
    result[a.username] = await prisma.user.create({
      data: { username: a.username, fullName: a.fullName, role: a.role, passwordHash },
    });
    console.log(`  user     : ${a.username} dibuat (${result[a.username].id})`);
  }
  return result;
}

/** Cari record demo berdasarkan nama; buat jika belum ada. */
async function ensureDemo(model, where, data) {
  const existing = await model.findFirst({ where: { ...where, isDemo: true, deletedAt: null } });
  if (existing) return existing;
  return model.create({ data: { ...data, isDemo: true } });
}

async function seedDemoMaster(users) {
  const site = await ensureDemo(
    prisma.site,
    { name: "[DEMO] Site A" },
    {
      name: "[DEMO] Site A",
      description: "Data demo untuk pengembangan. Bukan lokasi nyata.",
      address: "Lokasi fiktif",
      latitude: "-6.175400",
      longitude: "106.827200",
    },
  );
  const lobby = await ensureDemo(prisma.zone, { siteId: site.id, name: "[DEMO] Lobby" }, { siteId: site.id, name: "[DEMO] Lobby" });
  const parking = await ensureDemo(prisma.zone, { siteId: site.id, name: "[DEMO] Parkir" }, { siteId: site.id, name: "[DEMO] Parkir" });

  const cameraDefs = [
    { name: "[DEMO] Kamera Lobby 1", streamKey: "demo-lobby-1", zoneId: lobby.id, latitude: "-6.175380", longitude: "106.827180" },
    { name: "[DEMO] Kamera Lobby 2", streamKey: "demo-lobby-2", zoneId: lobby.id, latitude: "-6.175420", longitude: "106.827230" },
    { name: "[DEMO] Kamera Parkir 1", streamKey: "demo-parkir-1", zoneId: parking.id, latitude: "-6.175600", longitude: "106.827500" },
  ];
  for (const c of cameraDefs) {
    const cam = await ensureDemo(prisma.camera, { siteId: site.id, name: c.name }, { ...c, siteId: site.id, adapterType: "mock" });
    if (!cam.streamKey) {
      await prisma.camera.update({ where: { id: cam.id }, data: { streamKey: c.streamKey } });
    }
  }

  const audioDefs = [
    { name: "[DEMO] Speaker Lobby", zoneId: lobby.id, latitude: "-6.175390", longitude: "106.827210" },
    { name: "[DEMO] Speaker Parkir", zoneId: parking.id, latitude: "-6.175580", longitude: "106.827480" },
  ];
  const audioDevices = [];
  for (const a of audioDefs) {
    audioDevices.push(
      await ensureDemo(
        prisma.audioDevice,
        { siteId: site.id, name: a.name },
        { ...a, siteId: site.id, adapterType: "mock", supportsPtt: true, supportsTts: true, supportsDeliveryReceipt: false },
      ),
    );
  }
  console.log("  master   : 1 site, 2 zona, 3 kamera, 2 perangkat audio (DEMO, adapter=mock)");
  return { site, lobby, parking, audioDevices };
}

async function seedDemoAccessAndSchedule(users, master) {
  // Operator demo boleh paging pada zona Lobby saja (contoh pembatasan hak akses target).
  await prisma.userZoneAccess.upsert({
    where: { userId_zoneId: { userId: users.operator.id, zoneId: master.lobby.id } },
    update: {},
    create: { userId: users.operator.id, zoneId: master.lobby.id },
  });

  const name = "[DEMO] Pengumuman Pagi";
  const exists = await prisma.audioSchedule.findFirst({ where: { name, deletedAt: null } });
  if (!exists) {
    await prisma.audioSchedule.create({
      data: {
        name,
        description: "Jadwal demo, NONAKTIF secara default.",
        ttsText: "Selamat pagi. Ini adalah pengumuman demo.",
        timezone: "Asia/Jakarta",
        recurrence: "DAILY",
        timeOfDay: new Date("1970-01-01T08:00:00Z"),
        startDate: new Date("2026-01-01T00:00:00Z"),
        isActive: false,
        createdById: users.admin.id,
        targets: { create: [{ targetType: "ZONE", zoneId: master.lobby.id }] },
      },
    });
    console.log("  schedule : jadwal demo dibuat (nonaktif)");
  } else {
    console.log("  schedule : jadwal demo sudah ada, dilewati");
  }
}

async function main() {
  console.log("Seeding database (settings & default users)...");
  await seedSettings();
  await seedUsers();
  console.log("Seed selesai (tidak ada data dummy/demo).");
}

main()
  .catch((e) => {
    console.error("Seed gagal:", e.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
