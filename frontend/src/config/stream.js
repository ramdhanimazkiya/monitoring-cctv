/**
 * Konfigurasi Terpusat Endpoint Streaming CCTV & Audio Paging (MediaMTX / WHEP / WHIP)
 * Mendukung konfigurasi via Environment Variable (VITE_STREAM_*)
 */

export const STREAM_GATEWAY_URL = (
  import.meta.env.VITE_STREAM_GATEWAY_URL || 'https://stream.zakuyu.fun'
).replace(/\/$/, '')

export const STREAM_API_URL = (
  import.meta.env.VITE_STREAM_API_URL || 'https://api.zakuyu.fun'
).replace(/\/$/, '')

export const STREAM_RTSP_HOST = (
  import.meta.env.VITE_STREAM_RTSP_HOST || 'stream.zakuyu.fun'
)

/**
 * Menghasilkan URL WHIP untuk WebRTC audio ingestion (PTT / Speaker)
 */
export function getWhipUrl(pathName) {
  if (!pathName) return ''
  const clean = pathName.replace(/^\//, '').replace(/\/$/, '')
  return `${STREAM_GATEWAY_URL}/${clean}/whip`
}

/**
 * Menghasilkan URL RTSP berdasarkan host konfigurasi
 */
export function getRtspUrl(pathName) {
  if (!pathName) return ''
  const clean = pathName.replace(/^\//, '').replace(/\/$/, '')
  return `rtsp://${STREAM_RTSP_HOST}:8554/${clean}`
}

/**
 * Menghasilkan URL Web Player iframe MediaMTX
 */
export function getWebPlayerUrl(pathName) {
  if (!pathName) return ''
  const clean = pathName.replace(/^\//, '').replace(/\/$/, '')
  return `${STREAM_GATEWAY_URL}/${clean}/`
}

/**
 * Menghasilkan URL API pengecekan path MediaMTX
 */
export function getApiPathUrl(pathName) {
  if (!pathName) return ''
  const clean = pathName.replace(/^\//, '').replace(/\/$/, '')
  return `${STREAM_API_URL}/v3/paths/get/${clean}`
}

/**
 * Menghasilkan URL API list paths MediaMTX
 */
export function getApiPathsListUrl() {
  return `${STREAM_API_URL}/v3/paths/list`
}
