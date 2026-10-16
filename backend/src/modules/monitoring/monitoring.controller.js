import { monitoringService } from "./monitoring.service.js";

export async function getStatus(req, res, next) {
  try {
    const data = monitoringService.getStatus();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function checkAll(req, res, next) {
  try {
    const result = await monitoringService.checkAllNow();
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function checkSingle(req, res, next) {
  try {
    const result = await monitoringService.checkSingleNow(req.params.id);
    if (!result) {
      return res.status(404).json({ success: false, message: "Perangkat tidak ditemukan" });
    }
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}
