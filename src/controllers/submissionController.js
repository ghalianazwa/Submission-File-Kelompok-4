import { config } from '../config.js';
import { ok, AppError } from '../utils/response.js';
import { getAssignment } from '../services/assignmentService.js';
import { notifySubmission } from '../services/notificationService.js';
import {
  listSubmissions,
  createSubmission,
  deleteSubmission,
} from '../services/submissionService.js';

const isText = (v) => typeof v === 'string' && v.trim().length > 0;
const isPrivileged = (user) => Boolean(user.role) && config.privilegedRoles.includes(user.role);

export function validateCreateBody(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return ['body harus berupa objek JSON'];
  }
  const errors = [];

  if (!isText(body.assignment_id)) errors.push('assignment_id (wajib, berupa teks)');
  else if (body.assignment_id.length > 100) errors.push('assignment_id (maksimal 100 karakter)');

  if (!isText(body.file_name)) errors.push('file_name (wajib, berupa teks)');
  else if (body.file_name.length > 255) errors.push('file_name (maksimal 255 karakter)');
  else if (/[\\/\u0000-\u001f]|\.\./.test(body.file_name)) {
    errors.push('file_name (tidak boleh memuat / \\ .. atau karakter kontrol)');
  }

  if (!isText(body.file_url)) errors.push('file_url (wajib, berupa teks)');
  else if (body.file_url.length > 500) errors.push('file_url (maksimal 500 karakter)');

  if (body.file_id !== undefined && (!isText(body.file_id) || body.file_id.length > 100)) {
    errors.push('file_id (opsional, teks maksimal 100 karakter)');
  }
  if (body.user_id !== undefined && !isText(body.user_id)) {
    errors.push('user_id (opsional, berupa teks)');
  }
  return errors;
}

export async function list(req, res, next) {
  try {
    const raw = req.query.assignment_id;
    if (raw !== undefined && !isText(raw)) {
      throw new AppError(400, 'validation_error', 'Parameter assignment_id tidak boleh kosong');
    }
    const items = await listSubmissions({ assignmentId: raw?.trim() });
    return ok(res, items, 200, { count: items.length });
  } catch (err) {
    return next(err);
  }
}

export async function create(req, res, next) {
  try {
    const errors = validateCreateBody(req.body);
    if (errors.length > 0) {
      throw new AppError(400, 'validation_error', `Field tidak valid atau kurang: ${errors.join('; ')}`);
    }
    const { assignment_id, file_id, file_name, file_url, user_id } = req.body;

    // user_id selalu berasal dari token; pengguna tidak boleh mengumpulkan atas nama orang lain.
    if (user_id !== undefined && user_id !== req.user.id && !isPrivileged(req.user)) {
      throw new AppError(403, 'forbidden', 'user_id tidak sesuai dengan pemilik token');
    }
    const ownerId = user_id !== undefined && isPrivileged(req.user) ? user_id : req.user.id;

    const ctx = { token: req.user.token, requestId: res.locals.requestId };

    // Wajib memeriksa assignment_id ke Assignment Service sebelum menyimpan.
    await getAssignment(assignment_id.trim(), ctx);

    const record = await createSubmission({
      assignment_id: assignment_id.trim(),
      user_id: ownerId,
      file_id: file_id?.trim(),
      file_name: file_name.trim(),
      file_url: file_url.trim(),
    });

    // Gagal kirim notifikasi tidak membatalkan submission.
    const notification = await notifySubmission(record, ctx);
    return ok(res, record, 201, { notification });
  } catch (err) {
    return next(err);
  }
}

export async function remove(req, res, next) {
  try {
    const removed = await deleteSubmission(req.params.id, (record) => {
      if (record.user_id !== req.user.id && !isPrivileged(req.user)) {
        throw new AppError(403, 'forbidden', 'Anda tidak berhak menghapus submission ini');
      }
    });
    return ok(res, { id: removed.id, deleted: true });
  } catch (err) {
    return next(err);
  }
}
