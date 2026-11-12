import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { fail } from '../utils/response.js';

// Memvalidasi token JWT (Authorization: Bearer <token>) secara lokal memakai JWT_SECRET
// yang sama dengan Authentication Service. Ini ASUMSI: lihat README bagian Asumsi.
export function authenticate(req, res, next) {
  const header = req.get('Authorization') || '';
  const [scheme, token] = header.split(' ');

  if (!/^Bearer$/i.test(scheme || '') || !token) {
    return fail(res, 401, 'unauthorized', 'Token tidak ada atau format Authorization salah (gunakan: Bearer <token>)');
  }

  let payload;
  try {
    payload = jwt.verify(token, config.jwtSecret, { algorithms: ['HS256'] });
  } catch (err) {
    if (err?.name === 'TokenExpiredError') {
      return fail(res, 401, 'token_expired', 'Token sudah kedaluwarsa, silakan login ulang');
    }
    return fail(res, 401, 'invalid_token', 'Token tidak valid');
  }

  // Nama field identitas pada payload belum ditetapkan modul; beberapa kemungkinan dicoba.
  const userId = payload.id ?? payload.user_id ?? payload.userId ?? payload.sub;
  if (!userId) {
    return fail(res, 401, 'invalid_token', 'Token tidak memuat identitas pengguna');
  }

  req.user = {
    id: String(userId),
    role: payload.role ? String(payload.role).toLowerCase() : null,
    token,
  };
  next();
}
