import { ValidationError } from "../utils/errors.js";

/**
 * Memformat Zod issues menjadi daftar yang mudah dibaca frontend.
 */
function formatZodIssues(issues) {
  return issues.map((issue) => ({
    field: issue.path.join(".") || "body",
    message: issue.message,
    code: issue.code,
  }));
}

/**
 * Middleware untuk memvalidasi request body dengan skema Zod.
 * Mendukung sanitasi otomatis dan membuang field tidak dikenal jika .strict() dipakai.
 */
export function validateBody(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const issues = formatZodIssues(result.error.issues);
      return next(new ValidationError("Validasi data body gagal", issues));
    }
    req.body = result.data;
    req.validatedBody = result.data;
    next();
  };
}

/**
 * Middleware untuk memvalidasi request query parameters.
 * Kompatibel dengan Express 5 (req.query berbasis getter).
 */
export function validateQuery(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      const issues = formatZodIssues(result.error.issues);
      return next(new ValidationError("Validasi query string gagal", issues));
    }
    req.validatedQuery = result.data;
    try {
      Object.defineProperty(req, "query", {
        value: result.data,
        writable: true,
        configurable: true,
      });
    } catch {
      try {
        Object.assign(req.query, result.data);
      } catch {
        // Fallback
      }
    }
    next();
  };
}

/**
 * Middleware untuk memvalidasi route parameters (:id, dll).
 */
export function validateParams(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.params);
    if (!result.success) {
      const issues = formatZodIssues(result.error.issues);
      return next(new ValidationError("Validasi parameter URL gagal", issues));
    }
    try {
      Object.assign(req.params, result.data);
    } catch {
      // Fallback jika frozen
    }
    req.validatedParams = result.data;
    next();
  };
}
