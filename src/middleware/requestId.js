import { randomUUID } from 'node:crypto';

// Memakai X-Request-ID dari pemanggil (Gateway) jika ada, atau membuat yang baru.
export function requestId(req, res, next) {
  const incoming = req.get('X-Request-ID');
  const id = incoming && /^[\w.\-]{1,100}$/.test(incoming)
    ? incoming
    : `req-${randomUUID().slice(0, 8)}`;
  res.locals.requestId = id;
  res.set('X-Request-ID', id);
  next();
}
