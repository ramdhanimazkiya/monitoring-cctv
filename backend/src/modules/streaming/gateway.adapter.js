import { env } from "../../config/env.js";
import { logger } from "../../utils/logger.js";

/**
 * Adapter untuk integrasi Media Streaming Gateway (MediaMTX / go2rtc).
 * Mendukung WHEP (WebRTC HTTP Egress Protocol), HLS, RTSP, serta simulasi cerdas
 * ketika binary gateway eksternal belum dijalankan secara lokal.
 */
export class StreamGatewayAdapter {
  constructor() {
    this.gatewayUrl = env.STREAM_GATEWAY_URL.replace(/\/$/, "");
    this.apiUrl = env.STREAM_GATEWAY_API_URL.replace(/\/$/, "");
    this.gatewayType = env.STREAM_GATEWAY_TYPE; // "mediamtx" | "go2rtc" | "mock"
  }

  /**
   * Menghasilkan URL pemutaran video untuk tiap format streaming berdasarkan streamKey dan adapterConfig.
   */
  resolveStreamUrls(streamKey, adapterConfig = null) {
    const customUrl =
      (adapterConfig && typeof adapterConfig === "object" && adapterConfig.streamUrl) ||
      (streamKey && streamKey.startsWith("http") ? streamKey : null);

    if (customUrl) {
      const cleanUrl = customUrl.replace(/\/$/, "");
      return {
        webrtcUrl: `${cleanUrl}/whep`,
        whepUrl: `${cleanUrl}/whep`,
        hlsUrl: cleanUrl.endsWith(".m3u8") ? cleanUrl : `${cleanUrl}/index.m3u8`,
        rtspUrl: `rtsp://${new URL(this.gatewayUrl).hostname}:8554/${streamKey || "live"}`,
        playbackUrl: `${cleanUrl}/`,
        directStreamUrl: customUrl,
      };
    }

    if (!streamKey) {
      return {
        webrtcUrl: null,
        whepUrl: null,
        hlsUrl: null,
        rtspUrl: null,
        playbackUrl: null,
        directStreamUrl: null,
      };
    }

    const host = new URL(this.gatewayUrl).hostname;

    return {
      webrtcUrl: `${this.gatewayUrl}/${streamKey}/whep`,
      whepUrl: `${this.gatewayUrl}/${streamKey}/whep`,
      hlsUrl: `${this.gatewayUrl}/${streamKey}/index.m3u8`,
      rtspUrl: `rtsp://${host}:8554/${streamKey}`,
      playbackUrl: `${this.gatewayUrl}/${streamKey}`,
      directStreamUrl: `${this.gatewayUrl}/${streamKey}/index.m3u8`,
    };
  }

  /**
   * Mengekstrak nama path pada MediaMTX dari streamKey, adapterConfig, atau streamUrl.
   */
  extractPathName(camera) {
    if (camera.streamKey && !camera.streamKey.startsWith("http")) {
      return camera.streamKey.trim().replace(/^\//, "").replace(/\/$/, "");
    }
    const url = camera.adapterConfig?.streamUrl || camera.streamKey || "";
    if (url) {
      try {
        const parsed = new URL(url);
        const parts = parsed.pathname.split("/").filter(Boolean);
        if (parts.length > 0) {
          if (parts[parts.length - 1] === "index.m3u8" || parts[parts.length - 1] === "whep") {
            return parts.slice(0, parts.length - 1).join("/");
          }
          return parts.join("/");
        }
      } catch {
        // Bukan URL
      }
    }
    return camera.id ? camera.id.toLowerCase() : null;
  }

  /**
   * Memeriksa apakah sumber video CCTV aktif pada gateway media.
   */
  async checkStreamAvailability(camera) {
    const pathName = this.extractPathName(camera);
    if (!pathName && !camera.streamKey && !camera.adapterConfig?.streamUrl) {
      return {
        available: false,
        status: "NOT_CONFIGURED",
        reason: "Stream key belum dikonfigurasi",
      };
    }

    // Jika mode mock atau simulasi demo eksplisit
    if (this.gatewayType === "mock" || camera.isDemo) {
      return this.checkMockStream(camera);
    }

    // Cek ke API MediaMTX nyata
    return this.checkRealGatewayStream(camera);
  }

  /**
   * Pengecekan simulasi mock untuk demo.
   */
  async checkMockStream(camera) {
    const config = camera.adapterConfig || {};

    // Jika kamera sengaja disimulasikan video loss
    if (config.simulateVideoLoss === true) {
      return {
        available: false,
        status: "UNAVAILABLE",
        latencyMs: 0,
        reason: "Simulasi kehilangan sinyal video (video loss)",
        telemetry: { fps: 0, bitrateKbps: 0 },
      };
    }

    // Jika kamera hardware ONLINE/WARNING, stream demo tersedia
    return {
      available: true,
      status: "AVAILABLE",
      latencyMs: 18,
      reason: "Stream aktif pada Media Gateway (Simulasi Demo)",
      telemetry: {
        fps: 25,
        bitrateKbps: 2048,
        codec: "H264 / Opus",
        resolution: "1920x1080",
        viewers: 1,
      },
    };
  }

  /**
   * Pengecekan status aktual stream kamera CCTV.
   * Menggunakan API MediaMTX /v3/paths/list:
   * const cameraPath = data.items.find(item => item.name === pathName);
   * const isOnline = Boolean(cameraPath && cameraPath.source);
   * - ONLINE (AVAILABLE): Kamera hidup dan aktif mem-publish frame video (cameraPath.source != null).
   * - OFFLINE (UNAVAILABLE): Kamera mati, terputus, atau belum mem-publish sinyal video.
   */
  async checkRealGatewayStream(camera) {
    const pathName = this.extractPathName(camera) || camera.streamKey;
    const start = performance.now();

    // 1. Pengecekan MediaMTX API spesifik per kamera (/v3/paths/get/{name})
    try {
      const cleanPath = pathName ? pathName.replace(/^\//, "").replace(/\/$/, "") : "";
      const response = await fetch(`${this.apiUrl}/v3/paths/get/${cleanPath}`, {
        signal: AbortSignal.timeout(3000),
      });
      const latencyMs = Math.round(performance.now() - start);

      if (response.ok) {
        const data = await response.json();
        const isOnline = Boolean(data && data.source);

        return {
          available: isOnline,
          status: isOnline ? "AVAILABLE" : "UNAVAILABLE",
          latencyMs: isOnline ? Math.max(1, latencyMs) : null,
          reason: isOnline
            ? `Sumber video CCTV aktif (${data.source?.type || "Online"})`
            : "Sumber video CCTV mati / kamera offline (source: null)",
          telemetry: {
            tracks: data.tracks?.length || 0,
            readers: data.readers?.length || 0,
            bytesReceived: data.bytesReceived || 0,
          },
        };
      } else if (response.status === 404) {
        return {
          available: false,
          status: "UNAVAILABLE",
          latencyMs: null,
          reason: `Stream path '${cleanPath}' tidak ditemukan / kamera mati (404)`,
          telemetry: null,
        };
      }
    } catch (err) {
      // Fallback ke pengecekan WHEP jika fetch API gagal
    }

    // 2. Fallback WHEP jika ada custom URL
    const customUrl =
      camera.adapterConfig?.streamUrl ||
      (camera.streamKey && camera.streamKey.startsWith("http") ? camera.streamKey : null);

    if (customUrl) {
      const cleanUrl = customUrl.replace(/\/$/, "");
      const whepUrl = cleanUrl.endsWith("/whep") ? cleanUrl : `${cleanUrl}/whep`;

      try {
        const whepStart = performance.now();
        const whepRes = await fetch(whepUrl, {
          method: "POST",
          headers: { "Content-Type": "application/sdp" },
          body: "v=0\r\no=- 0 0 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\nm=video 9 UDP/TLS/RTP/SAVPF 96\r\nc=IN IP4 0.0.0.0\r\na=recvonly\r\n",
          signal: AbortSignal.timeout(3000),
        });
        const latencyMs = Math.round(performance.now() - whepStart);

        if (whepRes.status === 201) {
          return {
            available: true,
            status: "AVAILABLE",
            latencyMs,
            reason: "Sumber video CCTV aktif dan mengalirkan frame video",
          };
        }

        return {
          available: false,
          status: "UNAVAILABLE",
          latencyMs,
          reason: "Sumber video CCTV mati / kamera tidak mengirim sinyal video",
        };
      } catch (err) {
        // Fallback
      }
    }

    if (camera.isDemo) {
      return this.checkMockStream(camera);
    }

    return {
      available: false,
      status: "UNAVAILABLE",
      latencyMs: 0,
      reason: `Sumber video CCTV mati / tidak dapat dijangkau`,
    };
  }

  /**
   * Memeriksa kesehatan & konektivitas server MediaMTX secara terpisah.
   */
  async getGatewayHealth() {
    const start = performance.now();
    try {
      const res = await fetch(`${this.apiUrl}/v3/paths/list`, {
        signal: AbortSignal.timeout(2000),
      });
      const latencyMs = Math.round(performance.now() - start);
      if (res.ok) {
        const data = await res.json();
        const items = data.items || [];
        return {
          connected: true,
          status: "ONLINE",
          latencyMs,
          gatewayType: this.gatewayType,
          gatewayUrl: this.gatewayUrl,
          apiUrl: this.apiUrl,
          activePathsCount: items.length,
          paths: items.map((p) => ({
            name: p.name,
            ready: p.ready === true,
            tracks: p.tracks?.length || 0,
            readers: p.readers?.length || 0,
          })),
        };
      }
    } catch {
      // Gateway belum aktif
    }

    return {
      connected: false,
      status: "OFFLINE",
      latencyMs: null,
      gatewayType: this.gatewayType,
      gatewayUrl: this.gatewayUrl,
      apiUrl: this.apiUrl,
      activePathsCount: 0,
      paths: [],
      note: "Server MediaMTX tidak dapat dijangkau",
    };
  }

  /**
   * Mengambil daftar path mentah langsung dari API MediaMTX (/v3/paths/list).
   */
  async getPathsList() {
    try {
      const res = await fetch(`${this.apiUrl}/v3/paths/list`, {
        signal: AbortSignal.timeout(3500),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      logger.warn({ err }, "Gagal mengambil daftar paths dari MediaMTX API");
    }
    return { itemCount: 0, pageCount: 0, items: [] };
  }

  /**
   * Mengambil info 1 path kamera spesifik langsung dari API MediaMTX (/v3/paths/get/{name}).
   */
  async getPath(pathName) {
    const cleanPath = pathName ? pathName.replace(/^\//, "").replace(/\/$/, "") : "";
    if (!cleanPath) return { status: "error", error: "path name required" };

    try {
      const res = await fetch(`${this.apiUrl}/v3/paths/get/${cleanPath}`, {
        signal: AbortSignal.timeout(3000),
      });
      if (res.ok) {
        return await res.json();
      }
      if (res.status === 404) {
        return { notFound: true, status: "error", error: "path not found" };
      }
    } catch (err) {
      logger.warn({ err }, `Gagal mengambil path '${cleanPath}' dari MediaMTX API`);
    }
    return { notFound: true, status: "error", error: "gateway unreachable" };
  }

  /**
   * Negosiasi WHEP (WebRTC HTTP Egress Protocol) untuk WebRTC Live View.
   */
  async negotiateWhep(streamKey, sdpOffer) {
    if (!sdpOffer || typeof sdpOffer !== "string") {
      throw new Error("SDP Offer wajib diisi");
    }

    try {
      // Coba kirimkan ke MediaMTX WHEP endpoint jika aktif
      const whepUrl = `${this.gatewayUrl}/${streamKey}/whep`;
      const res = await fetch(whepUrl, {
        method: "POST",
        headers: { "Content-Type": "application/sdp" },
        body: sdpOffer,
        signal: AbortSignal.timeout(4000),
      });

      if (res.ok) {
        const sdpAnswer = await res.text();
        const patchLocation = res.headers.get("location") || "";
        return { sdpAnswer, patchLocation, simulated: false };
      }
    } catch {
      // Fallback simulasi SDP jika gateway eksternal belum aktif
    }

    // Buat respons SDP simulasi standar
    const mockAnswer = [
      "v=0",
      `o=- ${Date.now()} 2 IN IP4 127.0.0.1`,
      "s=CCTV Demo Live Stream",
      "t=0 0",
      "m=video 9 UDP/TLS/RTP/SAVPF 96",
      "c=IN IP4 127.0.0.1",
      "a=sendonly",
      "a=rtpmap:96 H264/90000",
      "a=fmtp:96 packetization-mode=1;profile-level-id=42e01f",
    ].join("\r\n");

    return {
      sdpAnswer: mockAnswer,
      patchLocation: `/api/streaming/whep/${streamKey}`,
      simulated: true,
    };
  }
}

export const gatewayAdapter = new StreamGatewayAdapter();
