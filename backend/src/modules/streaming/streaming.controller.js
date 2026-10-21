import * as streamingService from "./streaming.service.js";

export async function listStreams(req, res, next) {
  try {
    const data = await streamingService.listCameraStreams(req.query);
    res.json({ success: true, count: data.length, data });
  } catch (err) {
    next(err);
  }
}

export async function getStream(req, res, next) {
  try {
    const data = await streamingService.getCameraStream(req.params.id);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function checkStream(req, res, next) {
  try {
    const data = await streamingService.checkCameraStream(req.params.id);
    if (!data) {
      return res.status(404).json({ success: false, message: "Kamera tidak ditemukan" });
    }
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function checkAllStreams(req, res, next) {
  try {
    const data = await streamingService.checkAllCameraStreams();
    res.json({ success: true, count: data.length, data });
  } catch (err) {
    next(err);
  }
}

export async function getGatewayStatus(req, res, next) {
  try {
    const data = await streamingService.getGatewayStatus();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function getGatewayPaths(req, res, next) {
  try {
    const data = await streamingService.getGatewayPaths();
    res.json(data);
  } catch (err) {
    next(err);
  }
}

export async function getGatewayPath(req, res, next) {
  try {
    const pathName = req.params[0] || req.params.pathName || req.query.path || "";
    const data = await streamingService.getGatewayPath(pathName);
    if (data && data.notFound) {
      return res.status(404).json(data);
    }
    res.json(data);
  } catch (err) {
    next(err);
  }
}

export async function handleWhep(req, res, next) {
  try {
    const streamKey = req.params.streamKey || req.params[0] || req.params['0'];
    const sdpOffer = typeof req.body === "string" ? req.body : req.body?.sdp || "";

    const { sdpAnswer, patchLocation, simulated } = await streamingService.negotiateWhep(
      streamKey,
      sdpOffer,
    );

    res.status(201);
    res.set({
      "Content-Type": "application/sdp",
      Location: patchLocation,
      "X-Simulated-Stream": simulated ? "true" : "false",
    });
    res.send(sdpAnswer);
  } catch (err) {
    next(err);
  }
}

export async function syncStreamStatus(req, res, next) {
  try {
    const data = await streamingService.syncStreamStatus(req.params.id, req.body);
    if (!data) {
      return res.status(404).json({ success: false, message: "Kamera tidak ditemukan" });
    }
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

