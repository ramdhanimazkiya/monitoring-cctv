import * as deviceService from "./device.service.js";

// -----------------------------------------------------------------------------
// SITES & ZONES
// -----------------------------------------------------------------------------

export async function listSites(req, res, next) {
  try {
    const data = await deviceService.listSites();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function getSite(req, res, next) {
  try {
    const data = await deviceService.getSiteById(req.params.id);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function createSite(req, res, next) {
  try {
    const data = await deviceService.createSite(req.body, req.user?.id, req);
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function updateSite(req, res, next) {
  try {
    const data = await deviceService.updateSite(req.params.id, req.body, req.user?.id, req);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function deleteSite(req, res, next) {
  try {
    await deviceService.deleteSite(req.params.id, req.user?.id, req);
    res.json({ success: true, message: "Site berhasil diarsipkan" });
  } catch (err) {
    next(err);
  }
}

export async function listZones(req, res, next) {
  try {
    const data = await deviceService.listZones(req.query.siteId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function getZone(req, res, next) {
  try {
    const data = await deviceService.getZoneById(req.params.id);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function createZone(req, res, next) {
  try {
    const data = await deviceService.createZone(req.body, req.user?.id, req);
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function updateZone(req, res, next) {
  try {
    const data = await deviceService.updateZone(req.params.id, req.body, req.user?.id, req);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function deleteZone(req, res, next) {
  try {
    await deviceService.deleteZone(req.params.id, req.user?.id, req);
    res.json({ success: true, message: "Zona berhasil diarsipkan" });
  } catch (err) {
    next(err);
  }
}

// -----------------------------------------------------------------------------
// CAMERAS
// -----------------------------------------------------------------------------

export async function listCameras(req, res, next) {
  try {
    const query = req.validatedQuery || req.query;
    const result = await deviceService.listCameras(query);
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
}

export async function getCamera(req, res, next) {
  try {
    const data = await deviceService.getCameraById(req.params.id);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function createCamera(req, res, next) {
  try {
    const data = await deviceService.createCamera(req.body, req.user?.id, req);
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function updateCamera(req, res, next) {
  try {
    const data = await deviceService.updateCamera(req.params.id, req.body, req.user?.id, req);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function deleteCamera(req, res, next) {
  try {
    await deviceService.deleteCamera(req.params.id, req.user?.id, req);
    res.json({ success: true, message: "Kamera berhasil diarsipkan" });
  } catch (err) {
    next(err);
  }
}

// -----------------------------------------------------------------------------
// AUDIO DEVICES
// -----------------------------------------------------------------------------

export async function listAudioDevices(req, res, next) {
  try {
    const query = req.validatedQuery || req.query;
    const result = await deviceService.listAudioDevices(query);
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
}

export async function getAudioDevice(req, res, next) {
  try {
    const data = await deviceService.getAudioDeviceById(req.params.id);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function createAudioDevice(req, res, next) {
  try {
    const data = await deviceService.createAudioDevice(req.body, req.user?.id, req);
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function updateAudioDevice(req, res, next) {
  try {
    const data = await deviceService.updateAudioDevice(req.params.id, req.body, req.user?.id, req);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function deleteAudioDevice(req, res, next) {
  try {
    await deviceService.deleteAudioDevice(req.params.id, req.user?.id, req);
    res.json({ success: true, message: "Perangkat audio berhasil diarsipkan" });
  } catch (err) {
    next(err);
  }
}

// -----------------------------------------------------------------------------
// STATS & HISTORY
// -----------------------------------------------------------------------------

export async function getStats(req, res, next) {
  try {
    const data = await deviceService.getDeviceStats();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function getHistory(req, res, next) {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : 20;
    const data = await deviceService.getDeviceStatusHistory(req.params.id, limit);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}
