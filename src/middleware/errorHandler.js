import { AppError, fail } from '../utils/response.js';

export function notFound(req, res) {
  return fail(res, 404, 'not_found', 'Endpoint tidak ditemukan');
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  if (err instanceof AppError) {
    return fail(res, err.status, err.code, err.message);
  }
  if (err?.type === 'entity.parse.failed') {
    return fail(res, 400, 'invalid_json', 'Isi JSON tidak valid');
  }
  if (err?.type === 'entity.too.large') {
    return fail(res, 413, 'payload_too_large', 'Ukuran request melebihi batas');
  }

  console.error(`[${res.locals.requestId}] Kesalahan tak terduga:`, err);
  return fail(res, 500, 'internal_error', 'Terjadi kesalahan pada server');
}
