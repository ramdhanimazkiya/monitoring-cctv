/**
 * Kelas error aplikasi kustom untuk kontrol kode status HTTP dan kode error terstruktur.
 */
export class AppError extends Error {
  constructor(message, statusCode = 500, errorCode = "INTERNAL_SERVER_ERROR", details = null) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class BadRequestError extends AppError {
  constructor(message = "Permintaan tidak valid", details = null) {
    super(message, 400, "BAD_REQUEST", details);
  }
}

export class ValidationError extends AppError {
  constructor(message = "Data masukan tidak memenuhi validasi", issues = []) {
    super(message, 400, "VALIDATION_ERROR", issues);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Autentikasi diperlukan atau sesi kedaluwarsa") {
    super(message, 401, "UNAUTHORIZED");
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Akses ditolak: Anda tidak memiliki izin untuk tindakan ini") {
    super(message, 403, "FORBIDDEN");
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Sumber daya tidak ditemukan") {
    super(message, 404, "NOT_FOUND");
  }
}

export class ConflictError extends AppError {
  constructor(message = "Terjadi konflik dengan data yang ada") {
    super(message, 409, "CONFLICT");
  }
}

export class TooManyRequestsError extends AppError {
  constructor(message = "Terlalu banyak permintaan. Silakan coba lagi nanti.") {
    super(message, 429, "RATE_LIMIT_EXCEEDED");
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(message = "Layanan sedang tidak tersedia") {
    super(message, 503, "SERVICE_UNAVAILABLE");
  }
}
