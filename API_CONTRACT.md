# API Contract: Submission File Service (Kelompok 4)

## Informasi umum

- Port: 8105
- URL dasar: http://127.0.0.1:8105
- Format data: JSON (`Content-Type: application/json`)
- Header: `Authorization: Bearer <token>` (endpoint terproteksi), `X-Request-ID: <id>` (opsional; jika tidak dikirim, service membuat `req-xxxxxxxx`). Nilai request_id selalu dikembalikan pada `meta.request_id` dan header `X-Request-ID`.

### Format respons

Sukses:
```json
{ "success": true, "data": { }, "meta": { "request_id": "req-001" } }
```
Gagal:
```json
{ "success": false, "error": { "code": "kode_error", "message": "Penjelasan" }, "meta": { "request_id": "req-001" } }
```

### Objek Submission

| Field | Tipe | Keterangan |
|---|---|---|
| id | string | Dibuat otomatis: `sub-001`, `sub-002`, ... |
| assignment_id | string | ID tugas (diperiksa ke Assignment Service) |
| user_id | string | Diambil dari token |
| file_id | string | Opsional saat request; otomatis `file-001`, dst. |
| file_name | string | Nama berkas, maks. 255 karakter, tanpa `/`, `\`, `..` |
| file_url | string | Lokasi berkas, maks. 500 karakter |
| status | string | Selalu `submitted` saat dibuat |
| submitted_at | string | Waktu ISO 8601 (UTC) |

## Endpoint 1: Health check

- Metode dan URL: `GET /health`
- Autentikasi: tidak
- Request body: -
- Respons sukses (200):
```json
{ "success": true,
  "data": { "service": "submission", "name": "Submission File Service", "status": "healthy" },
  "meta": { "request_id": "req-001" } }
```
- Respons gagal: -

## Endpoint 2: Daftar submission

- Metode dan URL: `GET /api/submissions?assignment_id=asg-001`
- Autentikasi: Bearer token wajib
- Parameter: `assignment_id` (opsional; jika diisi, hanya submission tugas itu yang dikembalikan; tidak boleh kosong)
- Request body: -
- Respons sukses (200):
```json
{ "success": true,
  "data": [ { "id": "sub-001", "assignment_id": "asg-001", "user_id": "user-001", "file_id": "file-001",
              "file_name": "laporan.pdf", "file_url": "uploads/laporan.pdf",
              "status": "submitted", "submitted_at": "2026-11-12T10:00:00.000Z" } ],
  "meta": { "request_id": "req-001", "count": 1 } }
```
- Respons gagal:

| Status | error.code | Penyebab |
|---|---|---|
| 400 | validation_error | `assignment_id` ada tetapi kosong |
| 401 | unauthorized / invalid_token / token_expired | Token tidak ada, salah, atau kedaluwarsa |

## Endpoint 3: Tambah submission

- Metode dan URL: `POST /api/submissions`
- Autentikasi: Bearer token wajib
- Header: `Content-Type: application/json`
- Request body:
```json
{ "assignment_id": "asg-001", "file_name": "laporan.pdf", "file_url": "uploads/laporan.pdf" }
```
  Field wajib: `assignment_id`, `file_name`, `file_url`. Opsional: `file_id`, `user_id` (harus sama dengan pemilik token).
- Respons sukses (201):
```json
{ "success": true,
  "data": { "id": "sub-001", "assignment_id": "asg-001", "user_id": "user-001", "file_id": "file-001",
            "file_name": "laporan.pdf", "file_url": "uploads/laporan.pdf",
            "status": "submitted", "submitted_at": "2026-11-12T10:00:00.000Z" },
  "meta": { "request_id": "req-001", "notification": "sent" } }
```
  `meta.notification` bernilai `sent` atau `failed`. Jika `failed`, submission **tetap tersimpan**.
- Respons gagal:

| Status | error.code | Penyebab |
|---|---|---|
| 400 | validation_error | Field wajib kosong, tipe salah, atau `file_name` tidak aman |
| 400 | invalid_json | Isi JSON rusak |
| 401 | unauthorized / invalid_token / token_expired | Masalah token |
| 403 | forbidden | `user_id` pada body berbeda dengan pemilik token |
| 404 | assignment_not_found | `assignment_id` tidak ada di Assignment Service |
| 413 | payload_too_large | Body lebih dari 100 KB |
| 415 | unsupported_media_type | Content-Type bukan application/json |
| 502 | assignment_service_error / invalid_upstream_response | Assignment Service membalas status atau isi yang tidak dikenal |
| 503 | service_unavailable | Assignment Service tidak dapat dihubungi |
| 504 | service_timeout | Assignment Service melewati batas waktu |

## Endpoint 4: Hapus submission

- Metode dan URL: `DELETE /api/submissions/{id}` (contoh: `/api/submissions/sub-001`)
- Autentikasi: Bearer token wajib (pemilik submission, atau role `admin`/`dosen`)
- Request body: -
- Respons sukses (200):
```json
{ "success": true, "data": { "id": "sub-001", "deleted": true }, "meta": { "request_id": "req-001" } }
```
- Respons gagal:

| Status | error.code | Penyebab |
|---|---|---|
| 401 | unauthorized / invalid_token / token_expired | Masalah token |
| 403 | forbidden | Bukan pemilik dan bukan role yang berhak |
| 404 | submission_not_found | ID tidak ditemukan |

## Kesalahan umum

| Status | error.code | Penyebab |
|---|---|---|
| 404 | not_found | Endpoint tidak ada |
| 500 | internal_error / data_corrupt | Kesalahan server atau berkas data rusak |

## Dependensi ke service lain

- **Authentication Service (Kelompok 1)**: token JWT dibuat di sana; service ini memverifikasinya secara lokal dengan secret yang sama.
- **Assignment Service (Kelompok 6)**: `GET /api/assignments/{id}` sebelum submission disimpan (dengan header Authorization dan X-Request-ID diteruskan, timeout `SERVICE_TIMEOUT_MS`).
- **Notification Service (Kelompok 2)**: `POST /api/notifications` setelah submission tersimpan. Kegagalan hanya dicatat dan ditandai pada `meta.notification`.
