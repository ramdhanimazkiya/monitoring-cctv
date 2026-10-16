import { AppError, NotFoundError } from "../utils/errors.js";
import { logger } from "../utils/logger.js";
import { env } from "../config/env.js";

/**
 * Middleware untuk menangkap rute yang tidak ditemukan (404).
 */
export function notFoundHandler(req, res, next) {
  next(new NotFoundError(`Rute tidak ditemukan: ${req.method} ${req.originalUrl}`));
}

/**
 * Global Error Handler untuk Express.
 * Memastikan semua error dikembalikan dalam amplop JSON terstandarisasi.
 */
export function globalErrorHandler(err, req, res, next) {
  // Jika respons sudah mulai dikirim (streaming), delegasikan ke default Express handler
  if (res.headersSent) {
    return next(err);
  }

  let statusCode = 500;
  let errorCode = "INTERNAL_SERVER_ERROR";
  let message = "Terjadi kesalahan internal server";
  let details = null;

  // 1. Error turunan AppError
  if (err instanceof AppError) {
    statusCode = err.statusCode;
    errorCode = err.errorCode;
    message = err.message;
    details = err.details;
  }
  // 2. SyntaxError dari JSON parser (misal format JSON rusak di body)
  else if (err instanceof SyntaxError && "body" in err) {
    statusCode = 400;
    errorCode = "INVALID_JSON_BODY";
    message = "Format JSON di body permintaan tidak valid";
  }
  // 3. Error Prisma Client
  else if (err.code && typeof err.code === "string" && err.code.startsWith("P")) {
    statusCode = 400;
    errorCode = `DATABASE_${err.code}`;
    message = "Kesalahan operasi database";
    if (err.code === "P2002") {
      statusCode = 409;
      errorCode = "DUPLICATE_ENTRY";
      message = "Data yang dimasukkan bertabrakan dengan data yang sudah ada (unique constraint)";
    } else if (err.code === "P2025") {
      statusCode = 404;
      errorCode = "RECORD_NOT_FOUND";
      message = "Data sasaran tidak ditemukan di database";
    }
  }

  // Catat ke log
  if (statusCode >= 500) {
    logger.error(
      {
        err,
        url: req.originalUrl,
        method: req.method,
        ip: req.ip,
      },
      `Server Error [${errorCode}]: ${message}`,
    );
  } else {
    logger.warn(
      {
        statusCode,
        errorCode,
        url: req.originalUrl,
        method: req.method,
      },
      `Client Error [${errorCode}]: ${message}`,
    );
  }

  // Format respons
  const responseBody = {
    success: false,
    error: {
      code: errorCode,
      message,
    },
  };

  if (details) {
    responseBody.error.details = details;
  }

  // Tampilkan stack trace hanya saat development & internal error
  if (env.NODE_ENV === "development" && statusCode >= 500 && err.stack) {
    responseBody.error.stack = err.stack;
  }

  res.status(statusCode).json(responseBody);
}
