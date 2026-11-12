import { fail } from '../utils/response.js';

// Modul bagian 8.3: 415 jika Content-Type bukan JSON padahal diwajibkan.
export function requireJson(req, res, next) {
  if (!req.is('application/json')) {
    return fail(res, 415, 'unsupported_media_type', 'Content-Type harus application/json');
  }
  next();
}
