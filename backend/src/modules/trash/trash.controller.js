import * as trashService from "./trash.service.js";

export async function getTrashSummary(req, res, next) {
  try {
    const data = await trashService.getTrashSummary();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function listDeletedDevices(req, res, next) {
  try {
    const data = await trashService.listDeletedDevices();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function restoreDevice(req, res, next) {
  try {
    const { type, id } = req.params;
    const data = await trashService.restoreDevice(type, id, req.user?.id, req);
    res.json({
      success: true,
      message: `Perangkat ${id} berhasil dipulihkan dari arsip`,
      data,
    });
  } catch (err) {
    next(err);
  }
}

export async function listDeletedSitesAndZones(req, res, next) {
  try {
    const data = await trashService.listDeletedSitesAndZones();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function restoreSite(req, res, next) {
  try {
    const { id } = req.params;
    const data = await trashService.restoreSite(id, req.user?.id, req);
    res.json({
      success: true,
      message: `Site ${id} berhasil dipulihkan dari arsip`,
      data,
    });
  } catch (err) {
    next(err);
  }
}

export async function restoreZone(req, res, next) {
  try {
    const { id } = req.params;
    const data = await trashService.restoreZone(id, req.user?.id, req);
    res.json({
      success: true,
      message: `Zona ${id} berhasil dipulihkan dari arsip`,
      data,
    });
  } catch (err) {
    next(err);
  }
}

export async function listDeletedUsers(req, res, next) {
  try {
    const data = await trashService.listDeletedUsers();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function restoreUser(req, res, next) {
  try {
    const { id } = req.params;
    const data = await trashService.restoreUser(id, req.user?.id, req);
    res.json({
      success: true,
      message: `Pengguna ${id} (@${data.username}) berhasil dipulihkan dari arsip`,
      data,
    });
  } catch (err) {
    next(err);
  }
}
