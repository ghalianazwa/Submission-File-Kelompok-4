// Format respons mengikuti kontrak API bersama (modul bagian 8).

export class AppError extends Error {
  constructor(status, code, message) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
  }
}

export function ok(res, data, status = 200, extraMeta = {}) {
  return res.status(status).json({
    success: true,
    data,
    meta: { request_id: res.locals.requestId, ...extraMeta },
  });
}

export function fail(res, status, code, message) {
  return res.status(status).json({
    success: false,
    error: { code, message },
    meta: { request_id: res.locals.requestId },
  });
}
