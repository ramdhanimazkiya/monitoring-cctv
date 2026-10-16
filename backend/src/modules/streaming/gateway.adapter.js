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
   * Memeriksa apakah stream aktif pada gateway media.
   */
  async checkStreamAvailability(camera) {
    if (!camera.streamKey) {
      return {
        available: false,
        status: "NOT_CONFIGURED",
        reason: "Stream key belum dikonfigurasi",
      };
    }

    // Jika perangkat hardware mati (OFFLINE), stream pasti UNAVAILABLE
    if (camera.status === "OFFLINE") {
      return {
        available: false,
        status: "UNAVAILABLE",
        reason: "Kamera hardware OFFLINE, tidak ada sinyal stream",
      };
    }

    // Jika mode mock atau simulasi demo
    if (this.gatewayType === "mock" || camera.adapterType === "mock" || camera.isDemo) {
      return this.checkMockStream(camera);
    }

    // Cek ke API MediaMTX / go2rtc nyata
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
        reason: "Simulasi kehilangan sinyal video (video loss)",
        telemetry: { fps: 0, bitrateKbps: 0 },
      };
    }

    // Jika kamera hardware ONLINE/WARNING, stream demo tersedia
    return {
      available: true,
      status: "AVAILABLE",
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
   * Pengecekan ke API MediaMTX nyata (/v3/paths/get/:name).
   */
  async checkRealGatewayStream(camera) {
    try {
      const response = await fetch(`${this.apiUrl}/v3/paths/get/${encodeURIComponent(camera.streamKey)}`, {
        signal: AbortSignal.timeout(3000),
      });

      if (!response.ok) {
        if (response.status === 404) {
          return {
            available: false,
            status: "UNAVAILABLE",
            reason: `Stream path '${camera.streamKey}' tidak ditemukan pada Media Gateway`,
          };
        }
        return {
          available: false,
          status: "UNAVAILABLE",
          reason: `Gateway HTTP Error: ${response.status}`,
        };
      }

      const data = await response.json();
      const isReady = data.ready === true;

      return {
        available: isReady,
        status: isReady ? "AVAILABLE" : "UNAVAILABLE",
        reason: isReady ? "Stream aktif dan terhubung" : "Stream terdaftar namun belum siap (not ready)",
        telemetry: {
          tracks: data.tracks?.length || 0,
          readers: data.readers?.length || 0,
        },
      };
    } catch (err) {
      // Jika gateway offline/belum dinyalakan, fallback dengan penanganan ramah
      logger.debug({ err: err.message }, "Media Gateway API tidak dapat dijangkau");
      // Jika kamera demo, fallback ke status demo
      if (camera.isDemo) {
        return this.checkMockStream(camera);
      }
      return {
        available: false,
        status: "UNAVAILABLE",
        reason: `Media Gateway tidak dapat dijangkau: ${err.message}`,
      };
    }
  }

  /**
   * Memeriksa kesehatan Media Gateway secara umum.
   */
  async getGatewayHealth() {
    try {
      const res = await fetch(`${this.apiUrl}/v3/paths/list`, {
        signal: AbortSignal.timeout(2000),
      });
      if (res.ok) {
        const data = await res.json();
        return {
          connected: true,
          gatewayType: this.gatewayType,
          gatewayUrl: this.gatewayUrl,
          apiUrl: this.apiUrl,
          activePathsCount: data.items?.length || 0,
        };
      }
    } catch {
      // Gateway belum aktif
    }

    return {
      connected: false,
      gatewayType: this.gatewayType,
      gatewayUrl: this.gatewayUrl,
      apiUrl: this.apiUrl,
      activePathsCount: 0,
      note: "Media Gateway eksternal belum dijalankan; sistem berjalan dalam mode fallback/simulasi demo.",
    };
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
