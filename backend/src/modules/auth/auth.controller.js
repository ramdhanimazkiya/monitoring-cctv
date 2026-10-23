import { env } from "../../config/env.js";
import * as authService from "./auth.service.js";
import * as cctvAuthService from "../../services/cctv-auth.service.js";

/**
 * Controller untuk Autentikasi Pengguna.
 */
export async function login(req, res, next) {
  try {
    const { username, password } = req.body;
    const { rawToken, sessionId, user, expiresAt } = await authService.login({
      username,
      password,
      req,
    });

    // Ambil token stream MediaMTX (POST https://auth.zakuyu.fun/api/token)
    let cctvToken = null;
    try {
      cctvToken = await cctvAuthService.fetchMediaMtxToken(username, password);
      if (sessionId) {
        cctvAuthService.registerCctvSession({
          sessionId,
          username,
          password,
          cctvToken,
        });
      }
    } catch (cctvErr) {
      // Kegagalan token CCTV dicatat tetapi tidak menggagalkan login utama
      req.log?.warn?.({ err: cctvErr.message }, "Tidak dapat memperoleh token CCTV saat login");
    }

    // Simpan token di cookie HttpOnly & SameSite
    res.cookie(env.SESSION_COOKIE_NAME, rawToken, {
      httpOnly: true,
      secure: env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      expires: expiresAt,
    });

    res.status(200).json({
      success: true,
      data: {
        user,
        // Sertakan juga token di response body untuk API klien non-browser bila diperlukan
        token: rawToken,
        cctvToken,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function logout(req, res, next) {
  try {
    const rawToken = req.rawSessionToken;
    const sessionId = req.session?.id ? String(req.session.id) : null;
    if (sessionId) {
      cctvAuthService.clearCctvSession(sessionId);
    }

    if (rawToken) {
      await authService.logout({ rawToken, req });
    }

    res.clearCookie(env.SESSION_COOKIE_NAME, {
      httpOnly: true,
      secure: env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });

    res.status(200).json({
      success: true,
      message: "Logout berhasil",
    });
  } catch (err) {
    next(err);
  }
}

export async function getCctvToken(req, res, next) {
  try {
    const sessionId = req.session?.id ? String(req.session.id) : null;
    if (!sessionId) {
      return res.status(401).json({
        success: false,
        message: "Sesi tidak valid",
      });
    }

    const token = await cctvAuthService.getOrRenewCctvToken(sessionId);
    if (!token) {
      return res.status(404).json({
        success: false,
        message: "Token CCTV tidak tersedia untuk sesi ini",
      });
    }

    res.status(200).json({
      success: true,
      data: {
        token,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function me(req, res, next) {
  try {
    res.status(200).json({
      success: true,
      data: {
        user: req.user,
        session: req.session,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function changePassword(req, res, next) {
  try {
    const { currentPassword, newPassword } = req.body;
    await authService.changePassword({
      userId: req.user.id,
      currentPassword,
      newPassword,
      req,
    });

    res.status(200).json({
      success: true,
      message: "Password berhasil diperbarui. Silakan login kembali pada perangkat lain.",
    });
  } catch (err) {
    next(err);
  }
}
