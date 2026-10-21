import net from "net";

/**
 * Adapter Ping Simulasi (Mock).
 * Untuk perangkat pengujian atau demo tanpa menyentuh jaringan luar.
 */
export async function pingMock(device, timeoutMs = 5000) {
  const start = Date.now();
  // Simulasi latensi realistis (10 - 45 ms)
  const delay = Math.floor(Math.random() * 35) + 10;
  await new Promise((r) => setTimeout(r, delay));

  const config = device.adapterConfig || {};

  // Memungkinkan pengujian simulasi perangkat down secara terencana
  if (config.simulateFailure === true) {
    return {
      ok: false,
      latencyMs: Date.now() - start,
      reason: config.simulateReason || "Simulasi kegagalan koneksi perangkat (mock)",
    };
  }

  return {
    ok: true,
    latencyMs: Date.now() - start,
    details: {
      adapter: "mock",
      isDemo: device.isDemo,
    },
  };
}

/**
 * Adapter Ping TCP Socket Sungguhan.
 * Mencoba membuka koneksi TCP ke host:port perangkat.
 */
export async function pingTcp(host, port, timeoutMs = 5000) {
  if (!host || !port) {
    return {
      ok: false,
      latencyMs: 0,
      reason: "Host atau port belum dikonfigurasi",
    };
  }

  const start = Date.now();

  return new Promise((resolve) => {
    let resolved = false;
    const socket = new net.Socket();

    const finish = (ok, reason = null) => {
      if (resolved) return;
      resolved = true;
      socket.destroy();
      resolve({
        ok,
        latencyMs: Date.now() - start,
        reason,
        details: { protocol: "TCP", host, port },
      });
    };

    socket.setTimeout(timeoutMs);

    socket.connect(port, host, () => {
      finish(true);
    });

    socket.on("timeout", () => {
      finish(false, `Timeout koneksi TCP (${timeoutMs}ms) ke ${host}:${port}`);
    });

    socket.on("error", (err) => {
      finish(false, `Gagal koneksi TCP ke ${host}:${port}: ${err.message}`);
    });
  });
}

/**
 * Dispatcher ping perangkat berdasarkan adapterType.
 */
export async function pingDevice(device, timeoutMs = 5000) {
  // Hanya jika perangkat secara eksplisit merupakan perangkat simulasi demo (isDemo)
  if (device.isDemo) {
    return pingMock(device, timeoutMs);
  }

  // Jika host & port terkonfigurasi, uji koneksi TCP
  if (device.host && device.port) {
    return pingTcp(device.host, device.port, timeoutMs);
  }

  return {
    ok: false,
    latencyMs: 0,
    reason: "Host atau port perangkat belum dikonfigurasi",
  };
}
