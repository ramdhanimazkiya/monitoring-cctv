import {
  startPttSession,
  heartbeatPttSession,
  stopPttSession,
  dispatchTtsMessage,
  listPagingDevices,
  listPagingCommands,
  getPagingCommandById,
} from "./paging.service.js";
import { leaseService } from "./lease.service.js";
import { whipAdapter } from "./whip.adapter.js";

export async function startPttHandler(req, res) {
  const result = await startPttSession(req.user, req.body);
  return res.status(201).json({
    success: true,
    data: result,
  });
}

export async function heartbeatPttHandler(req, res) {
  const result = await heartbeatPttSession(req.user, req.body);
  return res.status(200).json({
    success: true,
    data: result,
  });
}

export async function stopPttHandler(req, res) {
  const result = await stopPttSession(req.user, req.body);
  return res.status(200).json({
    success: true,
    data: result,
  });
}

export async function dispatchTtsHandler(req, res) {
  const result = await dispatchTtsMessage(req.user, req.body);
  return res.status(201).json({
    success: true,
    data: result,
  });
}

export async function listPagingDevicesHandler(req, res) {
  const devices = await listPagingDevices();
  return res.status(200).json({
    success: true,
    data: devices,
  });
}

export async function listCommandsHandler(req, res) {
  const query = req.validatedQuery || req.query;
  const result = await listPagingCommands(query);
  return res.status(200).json({
    success: true,
    data: result.items,
    pagination: {
      total: result.total,
      limit: query.limit || 50,
      offset: query.offset || 0,
    },
  });
}

export async function getCommandHandler(req, res) {
  const result = await getPagingCommandById(req.params.id);
  return res.status(200).json({
    success: true,
    data: result,
  });
}

export async function getActiveLeasesHandler(req, res) {
  const leases = await leaseService.getActiveLeases();
  return res.status(200).json({
    success: true,
    data: leases,
  });
}

export async function handleWhipOfferHandler(req, res) {
  const channelKey = req.params.channelKey;
  let sdpOffer = req.body;
  if (typeof sdpOffer !== "string") {
    sdpOffer = req.body ? req.body.toString("utf8") : "";
  }

  const result = await whipAdapter.handleWhipOffer(channelKey, sdpOffer);

  res.setHeader("Content-Type", "application/sdp");
  res.setHeader("Location", result.location);
  if (result.simulated) {
    res.setHeader("X-Simulated-Audio", "true");
  }

  return res.status(201).send(result.sdpAnswer);
}

export async function handleWhipDeleteHandler(req, res) {
  const channelKey = req.params.channelKey;
  await whipAdapter.handleWhipDelete(channelKey);
  return res.status(204).end();
}
