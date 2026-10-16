import { env } from "../../config/env.js";
import { logger } from "../../utils/logger.js";
import { BadRequestError } from "../../utils/errors.js";

/**
 * Adapter untuk WebRTC Ingestion WHIP (WebRTC HTTP Ingestion Protocol - RFC 9329)
 * Menerima transmisi Push-to-Talk 16 kHz Mono dari mikrofon browser.
 */
export class WhipAdapter {
  constructor() {
    this.gatewayUrl = env.STREAM_GATEWAY_URL.replace(/\/$/, "");
  }

  /**
   * Menangani negosiasi SDP Offer -> SDP Answer untuk publikasi audio WHIP.
   */
  async handleWhipOffer(channelKey, sdpOffer) {
    if (!sdpOffer || typeof sdpOffer !== "string" || !sdpOffer.includes("m=audio")) {
      throw new BadRequestError("SDP Offer tidak valid: tidak ditemukan track audio");
    }

    // Jika menggunakan gateway eksternal nyata (MediaMTX)
    if (env.STREAM_GATEWAY_TYPE === "mediamtx") {
      try {
        const targetUrl = `${this.gatewayUrl}/${channelKey}/whip`;
        const res = await fetch(targetUrl, {
          method: "POST",
          headers: { "Content-Type": "application/sdp" },
          body: sdpOffer,
        });

        if (res.ok) {
          const sdpAnswer = await res.text();
          const location = res.headers.get("location") || `/api/paging/whip/${channelKey}/session`;
          return { sdpAnswer, location, simulated: false };
        }
      } catch (err) {
        logger.debug(
          { channelKey, err: err.message },
          "Gateway media lokal tidak aktif, beralih ke simulasi WHIP internal",
        );
      }
    }

    // Fallback simulasi SDP Answer valid (Opus 16kHz Mono)
    const simulatedAnswer = [
      "v=0",
      `o=- ${Date.now()} 2 IN IP4 127.0.0.1`,
      "s=CCTV-Monitoring-WHIP-Audio",
      "t=0 0",
      "a=group:BUNDLE 0",
      "m=audio 9 UDP/TLS/RTP/SAVPF 111",
      "c=IN IP4 127.0.0.1",
      "a=mid:0",
      "a=sendrecv",
      "a=rtpmap:111 opus/48000/2",
      "a=fmtp:111 maxplaybackrate=16000;sprop-maxcapturerate=16000;stereo=0;sprop-stereo=0",
      "a=ice-ufrag:whipaudio123",
      "a=ice-pwd:whipaudiopassword123",
      "a=fingerprint:sha-256 00:11:22:33:44:55:66:77:88:99:AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99:AA:BB:CC:DD:EE:FF",
      "a=setup:active",
      "",
    ].join("\r\n");

    return {
      sdpAnswer: simulatedAnswer,
      location: `/api/paging/whip/${channelKey}/session`,
      simulated: true,
    };
  }

  /**
   * Menangani penghentian sesi publikasi audio WHIP (DELETE).
   */
  async handleWhipDelete(channelKey) {
    if (env.STREAM_GATEWAY_TYPE === "mediamtx") {
      try {
        const targetUrl = `${this.gatewayUrl}/${channelKey}/whip`;
        await fetch(targetUrl, { method: "DELETE" });
      } catch (_) {
        // Abaikan jika offline
      }
    }
    return true;
  }
}

export const whipAdapter = new WhipAdapter();
