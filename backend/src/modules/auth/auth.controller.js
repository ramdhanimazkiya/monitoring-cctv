import { env } from "../../config/env.js";
import * as authService from "./auth.service.js";

/**
 * Controller untuk Autentikasi Pengguna.
 */
export async function login(req, res, next) {
  try {
    const { username, password } = req.body;
    const { rawToken, user, expiresAt } = await authService.login({
      username,
      password,
      req,
    });

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
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function logout(req, res, next) {
  try {
    const rawToken = req.rawSessionToken;
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
