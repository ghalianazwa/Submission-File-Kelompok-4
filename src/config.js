import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

function loadServices() {
  const file = path.resolve(rootDir, process.env.SERVICES_FILE || 'services.json');
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return {};
  }
}

const stripSlash = (url) => String(url).replace(/\/+$/, '');
const services = loadServices();

export const config = {
  serviceName: 'submission',
  serviceTitle: 'Submission File Service',
  group: 4,
  port: Number(process.env.PORT) || 8105,
  host: process.env.HOST || '0.0.0.0',
  jwtSecret: process.env.JWT_SECRET || '',
  dataFile: path.resolve(rootDir, process.env.DATA_FILE || 'data/submissions.json'),
  assignmentUrl: stripSlash(process.env.ASSIGNMENT_URL || services.assignment || 'http://127.0.0.1:8104'),
  notificationUrl: stripSlash(process.env.NOTIFICATION_URL || services.notification || 'http://127.0.0.1:8106'),
  assignmentLookupPath: process.env.ASSIGNMENT_LOOKUP_PATH || '/api/assignments/:id',
  notificationPath: process.env.NOTIFICATION_PATH || '/api/notifications',
  timeoutMs: Number(process.env.SERVICE_TIMEOUT_MS) || 3000,
  privilegedRoles: (process.env.PRIVILEGED_ROLES || 'admin,dosen')
    .split(',')
    .map((r) => r.trim().toLowerCase())
    .filter(Boolean),
};
