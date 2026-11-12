import { config } from '../config.js';
import { AppError } from '../utils/response.js';
import { callService } from './httpClient.js';

const LABEL = 'Assignment Service';

// Memeriksa keberadaan assignment_id lewat GET /api/assignments/{id}
// (endpoint tambahan dari Kelompok 6 untuk Kelompok 4).
export async function getAssignment(assignmentId, { token, requestId }) {
  const path = config.assignmentLookupPath.replace(':id', encodeURIComponent(assignmentId));
  const { status, body } = await callService(LABEL, `${config.assignmentUrl}${path}`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
      'X-Request-ID': requestId,
    },
  });

  if (status === 404) {
    throw new AppError(404, 'assignment_not_found', 'Assignment tidak ditemukan');
  }
  if (status === 200) {
    if (body && body.success === true) return body.data ?? null;
    throw new AppError(502, 'invalid_upstream_response', 'Respons Assignment Service tidak sesuai kontrak');
  }
  throw new AppError(502, 'assignment_service_error', `Assignment Service membalas dengan status ${status}`);
}
