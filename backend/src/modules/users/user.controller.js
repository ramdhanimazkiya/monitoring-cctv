import * as userService from "./user.service.js";

export async function listUsers(req, res, next) {
  try {
    const data = await userService.listUsers();
    res.json({
      success: true,
      data,
    });
  } catch (err) {
    next(err);
  }
}

export async function getUser(req, res, next) {
  try {
    const data = await userService.getUserById(req.params.id);
    res.json({
      success: true,
      data,
    });
  } catch (err) {
    next(err);
  }
}

export async function createUser(req, res, next) {
  try {
    const actorId = req.user?.id || "system";
    const data = await userService.createUser(req.body, actorId, req);
    res.status(201).json({
      success: true,
      data,
      message: "Pengguna baru berhasil didaftarkan",
    });
  } catch (err) {
    next(err);
  }
}

export async function updateUser(req, res, next) {
  try {
    const actorId = req.user?.id || "system";
    const data = await userService.updateUser(req.params.id, req.body, actorId, req);
    res.json({
      success: true,
      data,
      message: "Data pengguna berhasil diperbarui",
    });
  } catch (err) {
    next(err);
  }
}

export async function deleteUser(req, res, next) {
  try {
    const actorId = req.user?.id || "system";
    const data = await userService.deleteUser(req.params.id, actorId, req);
    res.json({
      success: true,
      data,
      message: "Pengguna berhasil diarsipkan",
    });
  } catch (err) {
    next(err);
  }
}
