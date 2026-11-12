import { config } from '../config.js';
import { AppError } from '../utils/response.js';

// Pemanggil HTTP antarservice dengan timeout. Kegagalan diubah menjadi AppError
// (503 = tidak dapat dihubungi, 504 = timeout, 502 = respons rusak) agar server tidak berhenti.
export async function callService(label, url, { method = 'GET', headers = {}, body } = {}) {
  let response;
  try {
    response = await fetch(url, {
      method,
      headers,
      body,
      signal: AbortSignal.timeout(config.timeoutMs),
    });
  } catch (err) {
    if (err?.name === 'TimeoutError' || err?.name === 'AbortError') {
      throw new AppError(504, 'service_timeout', `${label} tidak menjawab dalam ${config.timeoutMs} ms`);
    }
    throw new AppError(503, 'service_unavailable', `${label} tidak dapat dihubungi`);
  }

  let text = '';
  try {
    text = await response.text();
  } catch (err) {
    if (err?.name === 'TimeoutError' || err?.name === 'AbortError') {
      throw new AppError(504, 'service_timeout', `${label} tidak menjawab dalam ${config.timeoutMs} ms`);
    }
    throw new AppError(502, 'invalid_upstream_response', `Respons ${label} tidak dapat dibaca`);
  }

  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  return { status: response.status, body: json };
}
