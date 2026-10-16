/**
 * Verifikasi integritas database (bukti uji untuk kriteria Tahap 1).
 *
 * Setiap pengujian berjalan di dalam transaksi yang SELALU di-rollback,
 * sehingga tidak ada data yang tertinggal dan aman dijalankan pada DB berisi data.
 *
 * Jalankan setelah migrasi:  npm run db:verify
 * Exit code 0 = semua lolos, 1 = ada yang gagal.
 */
import { prisma } from "../src/config/database.js";

class Rollback extends Error {
  constructor(value) {
    super("rollback");
    this.value = value;
  }
}

/** Jalankan fn di dalam transaksi, kembalikan hasilnya, lalu rollback. */
async function inTx(fn) {
  try {
    await prisma.$transaction(async (tx) => {
      throw new Rollback(await fn(tx));
    });
  } catch (e) {
    if (e instanceof Rollback) return e.value;
    throw e;
  }
}

const errText = (e) => [e?.message, e?.cause?.message, JSON.stringify(e?.meta ?? {})].filter(Boolean).join(" | ");

const results = [];

async function expectOk(name, fn) {
  try {
    await inTx(fn);
    results.push({ name, ok: true });
  } catch (e) {
    results.push({ name, ok: false, detail: `harusnya berhasil, tetapi: ${errText(e)}` });
  }
}

async function expectReject(name, pattern, fn) {
  try {
    await inTx(fn);
    results.push({ name, ok: false, detail: "harusnya DITOLAK database, tetapi berhasil" });
  } catch (e) {
    const text = errText(e);
    results.push(
      pattern.test(text)
        ? { name, ok: true }
        : { name, ok: false, detail: `ditolak, tetapi alasan tidak sesuai (${pattern}): ${text}` },
    );
  }
}

// ---- Fixture ---------------------------------------------------------------
let seq = 0;
const uniq = () => `${Date.now().toString(36)}${(seq++).toString(36)}`;
const mkUser = (tx, role = "OPERATOR") =>
  tx.user.create({ data: { username: `vt_${uniq()}`, fullName: "Verify", passwordHash: "x", role } });
const mkSite = (tx) => tx.site.create({ data: { name: "verify-site" } });
const mkZone = (tx, siteId) => tx.zone.create({ data: { siteId, name: "verify-zone" } });
const mkCamera = (tx, siteId, extra = {}) => tx.camera.create({ data: { siteId, name: "verify-cam", ...extra } });
const mkAudio = (tx, siteId, extra = {}) => tx.audioDevice.create({ data: { siteId, name: "verify-audio", ...extra } });
const purge = (tx) => tx.$executeRawUnsafe("SELECT set_config('app.allow_purge', 'on', true)");

async function main() {
  // ===== 1. ID otomatis & immutable =====
  await expectOk("ID kamera dibuat otomatis berformat CAM-0001 dan menaik", async (tx) => {
    const site = await mkSite(tx);
    const a = await mkCamera(tx, site.id);
    const b = await mkCamera(tx, site.id);
    if (!/^CAM-\d{4,}$/.test(a.id)) throw new Error(`format salah: ${a.id}`);
    if (Number(b.id.slice(4)) <= Number(a.id.slice(4))) throw new Error(`tidak menaik: ${a.id} -> ${b.id}`);
  });

  await expectOk("ID otomatis untuk site, zone, audio, group, schedule, user", async (tx) => {
    const user = await mkUser(tx);
    const site = await mkSite(tx);
    const zone = await mkZone(tx, site.id);
    const audio = await mkAudio(tx, site.id);
    const group = await tx.audioGroup.create({ data: { name: "verify-group" } });
    const sch = await tx.audioSchedule.create({
      data: {
        name: "verify", ttsText: "uji", timezone: "Asia/Jakarta", recurrence: "ONCE",
        runAt: new Date(Date.now() + 3600_000), createdById: user.id,
      },
    });
    const checks = [
      [user.id, /^USR-\d{4,}$/], [site.id, /^SIT-\d{4,}$/], [zone.id, /^ZON-\d{4,}$/],
      [audio.id, /^AUD-\d{4,}$/], [group.id, /^GRP-\d{4,}$/], [sch.id, /^SCH-\d{4,}$/],
    ];
    for (const [id, re] of checks) if (!re.test(id)) throw new Error(`format ID salah: ${id}`);
  });

  for (const [label, table, make] of [
    ["kamera", "cameras", async (tx) => (await mkCamera(tx, (await mkSite(tx)).id)).id],
    ["zona", "zones", async (tx) => (await mkZone(tx, (await mkSite(tx)).id)).id],
    ["perangkat audio", "audio_devices", async (tx) => (await mkAudio(tx, (await mkSite(tx)).id)).id],
    ["user", "users", async (tx) => (await mkUser(tx)).id],
  ]) {
    await expectReject(`UPDATE id ${label} ditolak (immutable)`, /immutable/i, async (tx) => {
      const id = await make(tx);
      await tx.$executeRawUnsafe(`UPDATE "${table}" SET "id" = 'XXX-9999' WHERE "id" = '${id}'`);
    });
  }

  await expectReject("INSERT dengan format ID tidak valid ditolak", /id_format_chk|check constraint/i, async (tx) => {
    const site = await mkSite(tx);
    await tx.camera.create({ data: { id: "kamera-manual", siteId: site.id, name: "x" } });
  });

  // ===== 2. Relasi & integritas =====
  await expectReject("Kamera tidak boleh memakai zona milik site lain", /foreign key|zone_id_site_id_fkey/i, async (tx) => {
    const siteA = await mkSite(tx);
    const siteB = await mkSite(tx);
    const zoneB = await mkZone(tx, siteB.id);
    await mkCamera(tx, siteA.id, { zoneId: zoneB.id });
  });
  await expectOk("Kamera dengan zona pada site yang sama diterima", async (tx) => {
    const site = await mkSite(tx);
    const zone = await mkZone(tx, site.id);
    await mkCamera(tx, site.id, { zoneId: zone.id });
  });
  await expectReject("Zona tidak boleh dihapus fisik (trigger)", /tidak diizinkan|integrity/i, async (tx) => {
    const zone = await mkZone(tx, (await mkSite(tx)).id);
    await tx.$executeRawUnsafe(`DELETE FROM "zones" WHERE "id" = '${zone.id}'`);
  });
  await expectOk("Penghapusan fisik hanya lolos dengan izin purge retensi", async (tx) => {
    const zone = await mkZone(tx, (await mkSite(tx)).id);
    await purge(tx);
    const n = await tx.$executeRawUnsafe(`DELETE FROM "zones" WHERE "id" = '${zone.id}'`);
    if (n !== 1) throw new Error("zona tidak terhapus");
  });
  await expectReject("Username huruf besar ditolak", /username_lowercase_chk|check constraint/i, async (tx) => {
    await tx.user.create({ data: { username: "AdminBesar", fullName: "x", passwordHash: "x" } });
  });
  await expectReject("Koordinat di luar rentang ditolak", /coordinates_chk|check constraint/i, async (tx) => {
    await mkCamera(tx, (await mkSite(tx)).id, { latitude: "95.000000", longitude: "10.000000" });
  });
  await expectReject("Latitude tanpa longitude ditolak", /coordinates_chk|check constraint/i, async (tx) => {
    await mkCamera(tx, (await mkSite(tx)).id, { latitude: "-6.2" });
  });

  // ===== 3. Histori append-only =====
  await expectOk("Histori status untuk satu kamera diterima", async (tx) => {
    const cam = await mkCamera(tx, (await mkSite(tx)).id);
    await tx.deviceStatusHistory.create({ data: { cameraId: cam.id, fromStatus: "UNKNOWN", toStatus: "ONLINE" } });
  });
  await expectReject("Histori status dengan kamera DAN audio sekaligus ditolak", /one_device_chk|check constraint/i, async (tx) => {
    const site = await mkSite(tx);
    const cam = await mkCamera(tx, site.id);
    const aud = await mkAudio(tx, site.id);
    await tx.deviceStatusHistory.create({ data: { cameraId: cam.id, audioDeviceId: aud.id, toStatus: "ONLINE" } });
  });
  await expectReject("Histori status tanpa perangkat ditolak", /one_device_chk|check constraint/i, async (tx) => {
    await tx.deviceStatusHistory.create({ data: { toStatus: "ONLINE" } });
  });
  await expectReject("UPDATE histori status ditolak (append-only)", /append-only/i, async (tx) => {
    const cam = await mkCamera(tx, (await mkSite(tx)).id);
    const h = await tx.deviceStatusHistory.create({ data: { cameraId: cam.id, toStatus: "ONLINE" } });
    await tx.$executeRawUnsafe(`UPDATE "device_status_history" SET "reason" = 'diubah' WHERE "id" = ${h.id}`);
  });
  await expectReject("DELETE histori status ditolak tanpa izin purge", /tidak diizinkan|integrity/i, async (tx) => {
    const cam = await mkCamera(tx, (await mkSite(tx)).id);
    const h = await tx.deviceStatusHistory.create({ data: { cameraId: cam.id, toStatus: "ONLINE" } });
    await tx.$executeRawUnsafe(`DELETE FROM "device_status_history" WHERE "id" = ${h.id}`);
  });
  await expectReject("UPDATE audit log ditolak (append-only)", /append-only/i, async (tx) => {
    const a = await tx.auditLog.create({ data: { action: "verify.test" } });
    await tx.$executeRawUnsafe(`UPDATE "audit_logs" SET "action" = 'dipalsukan' WHERE "id" = ${a.id}`);
  });
  await expectReject("DELETE audit log ditolak tanpa izin purge", /tidak diizinkan|integrity/i, async (tx) => {
    const a = await tx.auditLog.create({ data: { action: "verify.test" } });
    await tx.$executeRawUnsafe(`DELETE FROM "audit_logs" WHERE "id" = ${a.id}`);
  });
  await expectOk("DELETE audit log lolos hanya dengan izin purge retensi", async (tx) => {
    const a = await tx.auditLog.create({ data: { action: "verify.test" } });
    await purge(tx);
    const n = await tx.$executeRawUnsafe(`DELETE FROM "audit_logs" WHERE "id" = ${a.id}`);
    if (n !== 1) throw new Error("baris tidak terhapus");
  });

  // ===== 4. Jadwal & paging =====
  const scheduleBase = (userId) => ({
    name: "verify", ttsText: "uji", timezone: "Asia/Jakarta", createdById: userId,
  });
  await expectReject("Jadwal WEEKLY tanpa hari ditolak", /recurrence_chk|check constraint/i, async (tx) => {
    const u = await mkUser(tx);
    await tx.audioSchedule.create({
      data: { ...scheduleBase(u.id), recurrence: "WEEKLY", timeOfDay: new Date("1970-01-01T08:00:00Z"), startDate: new Date("2026-01-01") },
    });
  });
  await expectOk("Jadwal WEEKLY Senin & Kamis diterima", async (tx) => {
    const u = await mkUser(tx);
    await tx.audioSchedule.create({
      data: { ...scheduleBase(u.id), recurrence: "WEEKLY", daysOfWeek: [1, 4], timeOfDay: new Date("1970-01-01T08:00:00Z"), startDate: new Date("2026-01-01") },
    });
  });
  await expectReject("Jadwal ONCE tanpa run_at ditolak", /recurrence_chk|check constraint/i, async (tx) => {
    const u = await mkUser(tx);
    await tx.audioSchedule.create({ data: { ...scheduleBase(u.id), recurrence: "ONCE" } });
  });
  await expectReject("Hari dalam minggu di luar 1..7 ditolak", /days_chk|check constraint/i, async (tx) => {
    const u = await mkUser(tx);
    await tx.audioSchedule.create({
      data: { ...scheduleBase(u.id), recurrence: "WEEKLY", daysOfWeek: [8], timeOfDay: new Date("1970-01-01T08:00:00Z"), startDate: new Date("2026-01-01") },
    });
  });
  await expectReject("Eksekusi ganda untuk (jadwal, waktu) yang sama ditolak (idempotensi)", /unique|P2002|audio_schedule_executions_schedule_id_scheduled_for_key/i, async (tx) => {
    const u = await mkUser(tx);
    const s = await tx.audioSchedule.create({ data: { ...scheduleBase(u.id), recurrence: "ONCE", runAt: new Date(Date.now() + 60_000) } });
    const when = new Date("2026-12-01T01:00:00Z");
    await tx.audioScheduleExecution.create({ data: { scheduleId: s.id, scheduledFor: when } });
    await tx.audioScheduleExecution.create({ data: { scheduleId: s.id, scheduledFor: when } });
  });
  await expectReject("Target jadwal harus tepat satu jenis target", /type_chk|check constraint/i, async (tx) => {
    const u = await mkUser(tx);
    const site = await mkSite(tx);
    const zone = await mkZone(tx, site.id);
    const aud = await mkAudio(tx, site.id);
    const s = await tx.audioSchedule.create({ data: { ...scheduleBase(u.id), recurrence: "ONCE", runAt: new Date(Date.now() + 60_000) } });
    await tx.audioScheduleTarget.create({ data: { scheduleId: s.id, targetType: "ZONE", zoneId: zone.id, deviceId: aud.id } });
  });
  await expectReject("Perintah MANUAL tanpa user ditolak", /source_chk|check constraint/i, async (tx) => {
    await tx.audioCommand.create({ data: { kind: "PTT", source: "MANUAL", mode: "SIMULATION", targetSpec: {} } });
  });
  await expectReject("Perintah TTS tanpa teks ditolak", /kind_chk|check constraint/i, async (tx) => {
    const u = await mkUser(tx);
    await tx.audioCommand.create({ data: { kind: "TTS", mode: "SIMULATION", userId: u.id, targetSpec: {} } });
  });
  await expectReject("Target berstatus DELIVERED tanpa konfirmasi ditolak (kejujuran status)", /delivered_chk|check constraint/i, async (tx) => {
    const u = await mkUser(tx);
    const aud = await mkAudio(tx, (await mkSite(tx)).id);
    const c = await tx.audioCommand.create({ data: { kind: "PTT", mode: "SIMULATION", userId: u.id, targetSpec: {} } });
    await tx.audioCommandTarget.create({ data: { commandId: c.id, audioDeviceId: aud.id, status: "DELIVERED" } });
  });
  await expectOk("Target UNCONFIRMED tanpa konfirmasi diterima", async (tx) => {
    const u = await mkUser(tx);
    const aud = await mkAudio(tx, (await mkSite(tx)).id);
    const c = await tx.audioCommand.create({ data: { kind: "PTT", mode: "SIMULATION", userId: u.id, targetSpec: {} } });
    await tx.audioCommandTarget.create({ data: { commandId: c.id, audioDeviceId: aud.id, status: "UNCONFIRMED" } });
  });
  await expectReject("Dua lease PTT aktif pada perangkat yang sama ditolak (konflik kanal)", /unique|P2002|audio_channel_leases_pkey/i, async (tx) => {
    const u1 = await mkUser(tx);
    const u2 = await mkUser(tx);
    const aud = await mkAudio(tx, (await mkSite(tx)).id);
    const mkCmd = (u) => tx.audioCommand.create({ data: { kind: "PTT", mode: "SIMULATION", userId: u.id, targetSpec: {} } });
    const [c1, c2] = [await mkCmd(u1), await mkCmd(u2)];
    const exp = new Date(Date.now() + 60_000);
    await tx.audioChannelLease.create({ data: { audioDeviceId: aud.id, commandId: c1.id, userId: u1.id, expiresAt: exp } });
    await tx.audioChannelLease.create({ data: { audioDeviceId: aud.id, commandId: c2.id, userId: u2.id, expiresAt: exp } });
  });

  // ===== 5. Event =====
  await expectReject("Event berstatus RESOLVED tanpa resolved_at ditolak", /lifecycle_chk|check constraint/i, async (tx) => {
    await tx.event.create({ data: { type: "SYSTEM", title: "uji", status: "RESOLVED" } });
  });
  await expectReject("Event dengan kamera dan audio sekaligus ditolak", /one_device_chk|check constraint/i, async (tx) => {
    const site = await mkSite(tx);
    const cam = await mkCamera(tx, site.id);
    const aud = await mkAudio(tx, site.id);
    await tx.event.create({ data: { type: "OTHER", title: "uji", cameraId: cam.id, audioDeviceId: aud.id } });
  });
}

main()
  .catch((e) => {
    results.push({ name: "Eksekusi script verifikasi", ok: false, detail: errText(e) });
  })
  .finally(async () => {
    await prisma.$disconnect();
    let failed = 0;
    for (const r of results) {
      if (!r.ok) failed++;
      console.log(`${r.ok ? "LOLOS " : "GAGAL "} ${r.name}${r.ok ? "" : `\n         -> ${r.detail}`}`);
    }
    console.log(`\n${results.length - failed}/${results.length} pengujian lolos.`);
    process.exit(failed ? 1 : 0);
  });
