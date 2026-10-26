import { z } from "zod";

/**
 * Validasi koordinat GPS (keduanya harus ada bersamaan atau keduanya null).
 */
const coordinatesRefine = (data) => {
  const hasLat = data.latitude !== undefined && data.latitude !== null;
  const hasLng = data.longitude !== undefined && data.longitude !== null;
  return (hasLat && hasLng) || (!hasLat && !hasLng);
};

// -----------------------------------------------------------------------------
// SITE & ZONE SCHEMAS
// -----------------------------------------------------------------------------

const siteShape = {
  name: z.string().trim().min(1, "Nama site wajib diisi").max(120),
  description: z.string().trim().optional().nullable(),
  address: z.string().trim().max(255).optional().nullable(),
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),
  isActive: z.boolean().default(true),
};

export const createSiteSchema = z.object(siteShape).strict().refine(coordinatesRefine, {
  message: "Latitude dan Longitude harus diisi berpasangan",
  path: ["latitude"],
});

export const updateSiteSchema = z.object(siteShape).partial().strict().refine(coordinatesRefine, {
  message: "Latitude dan Longitude harus diisi berpasangan",
  path: ["latitude"],
});

const zoneShape = {
  siteId: z.string().trim().optional().nullable(),
  name: z.string().trim().min(1, "Nama zona wajib diisi").max(120),
  description: z.string().trim().optional().nullable(),
  isActive: z.boolean().default(true),
};

export const createZoneSchema = z.object(zoneShape).strict();
export const updateZoneSchema = z.object(zoneShape).partial().strict();

// -----------------------------------------------------------------------------
// CAMERA SCHEMAS
// Catatan: Kolom status TIDAK ADA di skema CRUD (hanya ditulis monitoring service).
// -----------------------------------------------------------------------------

const cameraShape = {
  name: z.string().trim().min(1, "Nama kamera wajib diisi").max(120),
  siteId: z.string().min(1, "Site ID wajib diisi"),
  zoneId: z.string().optional().nullable(),
  description: z.string().trim().optional().nullable(),
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),
  manufacturer: z.string().trim().max(80).optional().nullable(),
  model: z.string().trim().max(80).optional().nullable(),
  host: z.string().trim().max(255).optional().nullable(),
  port: z.number().int().min(1).max(65535).optional().nullable(),
  adapterType: z.string().trim().max(30).default("mock"),
  adapterConfig: z.record(z.any()).optional().nullable(),
  streamKey: z.string().trim().max(120).optional().nullable(),
  streamUrl: z.string().trim().max(500).optional().nullable(),
  credential: z.string().optional().nullable(), // Password mentah untuk dienkripsi
  isActive: z.boolean().default(true),
};

export const createCameraSchema = z.object(cameraShape).strict().refine(coordinatesRefine, {
  message: "Latitude dan Longitude harus diisi berpasangan",
  path: ["latitude"],
});

export const updateCameraSchema = z.object(cameraShape).partial().strict().refine(coordinatesRefine, {
  message: "Latitude dan Longitude harus diisi berpasangan",
  path: ["latitude"],
});

// -----------------------------------------------------------------------------
// AUDIO DEVICE SCHEMAS
// -----------------------------------------------------------------------------

const audioDeviceShape = {
  name: z.string().trim().min(1, "Nama perangkat audio wajib diisi").max(120),
  siteId: z.string().min(1, "Site ID wajib diisi"),
  zoneId: z.string().optional().nullable(),
  description: z.string().trim().optional().nullable(),
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),
  manufacturer: z.string().trim().max(80).optional().nullable(),
  model: z.string().trim().max(80).optional().nullable(),
  host: z.string().trim().max(255).optional().nullable(),
  port: z.number().int().min(1).max(65535).optional().nullable(),
  adapterType: z.string().trim().max(30).default("mock"),
  adapterConfig: z.record(z.any()).optional().nullable(),
  whipUrl: z.string().trim().max(500).optional().nullable(),
  volume: z.number().int().min(0).max(100).optional().nullable(),
  credential: z.string().optional().nullable(),
  supportsPtt: z.boolean().default(false),
  supportsTts: z.boolean().default(false),
  supportsDeliveryReceipt: z.boolean().default(false),
  isActive: z.boolean().default(true),
};

export const createAudioDeviceSchema = z.object(audioDeviceShape).strict().refine(coordinatesRefine, {
  message: "Latitude dan Longitude harus diisi berpasangan",
  path: ["latitude"],
});

export const updateAudioDeviceSchema = z.object(audioDeviceShape).partial().strict().refine(coordinatesRefine, {
  message: "Latitude dan Longitude harus diisi berpasangan",
  path: ["latitude"],
});

// -----------------------------------------------------------------------------
// QUERY FILTER SCHEMAS
// -----------------------------------------------------------------------------

export const deviceQuerySchema = z.object({
  siteId: z.string().optional(),
  zoneId: z.string().optional(),
  status: z.enum(["UNKNOWN", "ONLINE", "OFFLINE", "WARNING"]).optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});
