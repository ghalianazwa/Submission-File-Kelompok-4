import express from 'express';
import { config } from './config.js';
import { requestId } from './middleware/requestId.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';
import { ok } from './utils/response.js';
import submissionRoutes from './routes/submissionRoutes.js';

if (!config.jwtSecret) {
  console.error('JWT_SECRET belum diisi. Salin .env.example menjadi .env lalu isi JWT_SECRET.');
  process.exit(1);
}

const app = express();
app.disable('x-powered-by');
app.use(requestId);

// Health check: tanpa token, dipakai Gateway dan Monitoring.
app.get('/health', (req, res) =>
  ok(res, { service: config.serviceName, name: config.serviceTitle, status: 'healthy' }),
);

app.use('/api/submissions', submissionRoutes);
app.use(notFound);
app.use(errorHandler);

// Kegagalan tak terduga dicatat, tetapi server tetap berjalan.
process.on('unhandledRejection', (reason) => console.error('unhandledRejection:', reason));
process.on('uncaughtException', (err) => console.error('uncaughtException:', err));

app.listen(config.port, config.host, () => {
  console.log(`${config.serviceTitle} (Kelompok ${config.group}) berjalan di http://${config.host}:${config.port}`);
  console.log(`Assignment Service  : ${config.assignmentUrl}`);
  console.log(`Notification Service: ${config.notificationUrl}`);
});
