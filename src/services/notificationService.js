import { config } from '../config.js';
import { callService } from './httpClient.js';

const LABEL = 'Notification Service';

// Mengirim notifikasi setelah submission tersimpan.
// Kegagalan Notification tidak membatalkan submission.
// Mengembalikan "sent" atau "failed".
export async function notifySubmission(submission, { token, requestId }) {
  try {
    const { status } = await callService(
      LABEL,
      `${config.notificationUrl}${config.notificationPath}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
          'X-Request-ID': requestId,
        },
        body: JSON.stringify({
          user_id: submission.user_id,
          message: `Submission ${submission.file_name} untuk tugas ${submission.assignment_id} berhasil diterima`,
          type: 'submission',
          submission_id: submission.id,
        }),
      },
    );

    if (status >= 200 && status < 300) return 'sent';

    console.warn(
      `[${requestId}] Notification Service membalas status ${status}`,
    );
    return 'failed';
  } catch (err) {
    console.warn(
      `[${requestId}] Notifikasi gagal dikirim: ${err.message}`,
    );
    return 'failed';
  }
}