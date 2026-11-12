// Pengujian end-to-end Submission File Service.
// Jalankan: npm install && npm test
//
// Skrip ini mandiri: ia menyalakan Assignment Service dan Notification Service TIRUAN
// (port 18104 dan 18106) serta Submission File Service sungguhan (port 18105) dengan data sementara,
// sehingga tidak memengaruhi data/submissions.json dan tidak butuh kelompok lain menyala.
import http from 'node:http';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import jwt from 'jsonwebtoken';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SECRET = 'rahasia-pengujian';
const BASE = 'http://127.0.0.1:18105';
const dataFile = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'submission-test-')), 'submissions.json');

const tokenA = jwt.sign({ id: 'user-001', role: 'mahasiswa' }, SECRET, { expiresIn: '1h' });
const tokenB = jwt.sign({ id: 'user-002', role: 'mahasiswa' }, SECRET, { expiresIn: '1h' });
const tokenExpired = jwt.sign({ id: 'user-001' }, SECRET, { expiresIn: -10 });
const tokenWrongSecret = jwt.sign({ id: 'user-001' }, 'secret-lain');

function startMock(port, handler) {
  return new Promise((resolve) => {
    const server = http.createServer(handler);
    server.listen(port, '127.0.0.1', () => resolve(server));
  });
}
const stopMock = (server) => new Promise((resolve) => {
  server.closeAllConnections?.();
  server.close(() => resolve());
});

const assignmentHandler = (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  if (req.url === '/api/assignments/asg-001') {
    return res.end(JSON.stringify({ success: true, data: { id: 'asg-001' }, meta: { request_id: 'x' } }));
  }
  if (req.url === '/api/assignments/asg-lambat') return setTimeout(() => res.end('{}'), 2000);
  res.statusCode = 404;
  return res.end(JSON.stringify({ success: false, error: { code: 'assignment_not_found', message: 'Assignment tidak ditemukan' } }));
};
const notificationHandler = (req, res) => {
  req.resume();
  req.on('end', () => {
    res.statusCode = 201;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ success: true, data: { id: 'notif-001' } }));
  });
};

async function api(method, urlPath, { token, body, headers = {}, raw } = {}) {
  const h = { ...headers };
  if (token) h.Authorization = `Bearer ${token}`;
  let payload;
  if (raw !== undefined) payload = raw;
  else if (body !== undefined) { h['Content-Type'] = 'application/json'; payload = JSON.stringify(body); }
  const res = await fetch(`${BASE}${urlPath}`, { method, headers: h, body: payload });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* biarkan null */ }
  return { status: res.status, json };
}

const results = [];
async function check(no, nama, expectedStatus, fn, extra = () => true) {
  try {
    const r = await fn();
    const passed = r.status === expectedStatus && extra(r);
    results.push({ no, nama, expectedStatus, actual: r.status, passed });
  } catch (err) {
    results.push({ no, nama, expectedStatus, actual: `error: ${err.message}`, passed: false });
  }
}

async function waitHealthy() {
  for (let i = 0; i < 50; i += 1) {
    try { const r = await fetch(`${BASE}/health`); if (r.ok) return; } catch { /* belum siap */ }
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error('Submission File Service tidak menyala dalam 5 detik');
}

const validBody = { assignment_id: 'asg-001', file_name: 'laporan.pdf', file_url: 'uploads/laporan.pdf' };

async function main() {
  let assignmentMock = await startMock(18104, assignmentHandler);
  const notificationMock = await startMock(18106, notificationHandler);
  const child = spawn(process.execPath, ['src/server.js'], {
    cwd: rootDir,
    env: {
      ...process.env,
      PORT: '18105', HOST: '127.0.0.1', JWT_SECRET: SECRET, DATA_FILE: dataFile,
      ASSIGNMENT_URL: 'http://127.0.0.1:18104', NOTIFICATION_URL: 'http://127.0.0.1:18106',
      SERVICE_TIMEOUT_MS: '500',
    },
    stdio: ['ignore', 'ignore', 'inherit'],
  });

  try {
    await waitHealthy();
    let createdId;

    await check(1, 'GET /health berhasil', 200, () => api('GET', '/health'),
      (r) => r.json?.success === true && r.json?.data?.status === 'healthy' && Boolean(r.json?.meta?.request_id));
    await check(2, 'GET /api/submissions berhasil', 200, () => api('GET', '/api/submissions', { token: tokenA }),
      (r) => Array.isArray(r.json?.data));
    await check(3, 'POST /api/submissions berhasil', 201, async () => {
      const r = await api('POST', '/api/submissions', { token: tokenA, body: validBody });
      createdId = r.json?.data?.id;
      return r;
    }, (r) => r.json?.data?.status === 'submitted' && r.json?.data?.user_id === 'user-001' && r.json?.meta?.notification === 'sent');
    await check(4, 'GET filter assignment_id tertentu', 200,
      () => api('GET', '/api/submissions?assignment_id=asg-001', { token: tokenA }),
      (r) => r.json.data.length >= 1 && r.json.data.every((s) => s.assignment_id === 'asg-001'));
    await check(5, 'POST tanpa field wajib', 400,
      () => api('POST', '/api/submissions', { token: tokenA, body: { assignment_id: 'asg-001' } }),
      (r) => r.json?.error?.code === 'validation_error');
    await check(6, 'POST assignment_id tidak tersedia', 404,
      () => api('POST', '/api/submissions', { token: tokenA, body: { ...validBody, assignment_id: 'asg-tidak-ada' } }),
      (r) => r.json?.error?.code === 'assignment_not_found');
    await check(7, 'POST tanpa token', 401, () => api('POST', '/api/submissions', { body: validBody }),
      (r) => r.json?.success === false);
    await check(8, 'POST token tidak valid', 401,
      () => api('POST', '/api/submissions', { token: tokenWrongSecret, body: validBody }));
    await check(9, 'POST token kedaluwarsa', 401,
      () => api('POST', '/api/submissions', { token: tokenExpired, body: validBody }),
      (r) => r.json?.error?.code === 'token_expired');
    await check(10, 'POST JSON rusak', 400,
      () => api('POST', '/api/submissions', { token: tokenA, headers: { 'Content-Type': 'application/json' }, raw: '{rusak' }),
      (r) => r.json?.error?.code === 'invalid_json');
    await check(11, 'POST Content-Type bukan JSON', 415,
      () => api('POST', '/api/submissions', { token: tokenA, headers: { 'Content-Type': 'text/plain' }, raw: 'halo' }));
    await check(12, 'DELETE milik pengguna lain', 403,
      () => api('DELETE', `/api/submissions/${createdId}`, { token: tokenB }));
    await check(13, 'DELETE berhasil', 200, () => api('DELETE', `/api/submissions/${createdId}`, { token: tokenA }),
      (r) => r.json?.data?.deleted === true);
    await check(14, 'DELETE id tidak ditemukan', 404, () => api('DELETE', '/api/submissions/sub-999', { token: tokenA }),
      (r) => r.json?.error?.code === 'submission_not_found');
    await check(15, 'Endpoint tidak dikenal', 404, () => api('GET', '/api/tidak-ada', { token: tokenA }));

    // Skenario kegagalan service eksternal
    await check(16, 'Assignment Service lambat (timeout)', 504,
      () => api('POST', '/api/submissions', { token: tokenA, body: { ...validBody, assignment_id: 'asg-lambat' } }),
      (r) => r.json?.error?.code === 'service_timeout');

    await stopMock(notificationMock);
    await check(17, 'Notification Service mati: submission tetap tersimpan', 201,
      () => api('POST', '/api/submissions', { token: tokenA, body: validBody }),
      (r) => r.json?.meta?.notification === 'failed');

    await stopMock(assignmentMock);
    assignmentMock = null;
    await check(18, 'Assignment Service mati', 503,
      () => api('POST', '/api/submissions', { token: tokenA, body: validBody }),
      (r) => r.json?.error?.code === 'service_unavailable');
    await check(19, 'Service tetap hidup setelah dependency mati (health)', 200, () => api('GET', '/health'));
  } finally {
    child.kill();
    if (assignmentMock) await stopMock(assignmentMock);
  }

  console.log('\nHASIL PENGUJIAN SUBMISSION FILE SERVICE\n');
  for (const r of results) {
    console.log(`${r.passed ? 'LULUS ' : 'GAGAL '} #${String(r.no).padStart(2, '0')} ${r.nama} (harapan ${r.expectedStatus}, aktual ${r.actual})`);
  }
  const lulus = results.filter((r) => r.passed).length;
  console.log(`\n${lulus}/${results.length} skenario lulus`);
  process.exit(lulus === results.length ? 0 : 1);
}

main().catch((err) => { console.error(err); process.exit(1); });
