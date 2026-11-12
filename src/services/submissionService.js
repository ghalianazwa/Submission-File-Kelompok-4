import fs from 'node:fs/promises';
import path from 'node:path';
import { config } from '../config.js';
import { AppError } from '../utils/response.js';

// Lapisan penyimpanan JSON file. Semua operasi tulis diantre (satu per satu) agar dua request
// bersamaan tidak saling menimpa, dan berkas ditulis atomik (tulis ke .tmp lalu rename).

let queue = Promise.resolve();

function withLock(fn) {
  const run = queue.then(() => fn());
  queue = run.catch(() => {});
  return run;
}

async function readAll() {
  let raw;
  try {
    raw = await fs.readFile(config.dataFile, 'utf8');
  } catch (err) {
    if (err.code === 'ENOENT') {
      await fs.mkdir(path.dirname(config.dataFile), { recursive: true });
      await fs.writeFile(config.dataFile, '[]\n');
      return [];
    }
    throw err;
  }
  try {
    const parsed = JSON.parse(raw || '[]');
    if (!Array.isArray(parsed)) throw new Error('bukan array');
    return parsed;
  } catch {
    throw new AppError(500, 'data_corrupt', 'Berkas data submission rusak');
  }
}

async function writeAll(items) {
  const tmp = `${config.dataFile}.tmp`;
  await fs.writeFile(tmp, `${JSON.stringify(items, null, 2)}\n`);
  await fs.rename(tmp, config.dataFile);
}

function nextNumber(items) {
  let max = 0;
  for (const item of items) {
    const match = /^sub-(\d+)$/.exec(item.id || '');
    if (match) max = Math.max(max, Number(match[1]));
  }
  return max + 1;
}

export function listSubmissions({ assignmentId } = {}) {
  return withLock(async () => {
    const items = await readAll();
    return assignmentId ? items.filter((s) => s.assignment_id === assignmentId) : items;
  });
}

export function createSubmission({ assignment_id, user_id, file_id, file_name, file_url }) {
  return withLock(async () => {
    const items = await readAll();
    const number = nextNumber(items);
    const padded = String(number).padStart(3, '0');
    const record = {
      id: `sub-${padded}`,
      assignment_id,
      user_id,
      file_id: file_id || `file-${padded}`,
      file_name,
      file_url,
      status: 'submitted',
      submitted_at: new Date().toISOString(),
    };
    items.push(record);
    await writeAll(items);
    return record;
  });
}

// authorize(record) dijalankan di dalam antrean dan boleh melempar AppError (mis. 403).
export function deleteSubmission(id, authorize = () => {}) {
  return withLock(async () => {
    const items = await readAll();
    const index = items.findIndex((s) => s.id === id);
    if (index === -1) {
      throw new AppError(404, 'submission_not_found', 'Submission tidak ditemukan');
    }
    authorize(items[index]);
    const [removed] = items.splice(index, 1);
    await writeAll(items);
    return removed;
  });
}
