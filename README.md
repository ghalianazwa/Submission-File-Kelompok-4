# Submission File Service (Kelompok 4)

Proyek Mini LMS Terdistribusi, mata kuliah Sistem Terdistribusi, PTIK.

## Identitas Kelompok

| Nama | NIM | Kontribusi |
| --- | --- | --- |
| Nur Asma  | 240209500049 | Pencatat, Mencatat setiap pertanyaan, mencatat kendala yang muncul saat demo. |
| Magfirah Ahmad | 240209500038 | Penjelas Alur, Menjelaskan gambaran besar sistem, arsitektur, dan bagaimana perpindahan request terjadi antar-service. |
| Aisyah Nurhidayati Az-zahrah | 240209504003 | Penguji, Menunjukkan dan mempraktikkan kasus sukses, kasus gagal (error), serta skenario recovery (pemulihan). |
| Nur Salmi | 240209500036 | Penjelas Alur 2, Membantu Penjelas Alur 1 dengan merinci alur data yang masuk dan keluar, serta menjelaskan skenario fitur yang sedang didemonstrasikan. |
| Nazwa Ghalia Abdillah | 240209500046 | Operator, Menjalankan service (backend/lokal) dan mengeksekusi request demo. |

## Deskripsi Service

Service ini mencatat pengumpulan tugas mahasiswa beserta **metadata berkas** (nama berkas dan lokasi berkas) berdasarkan `assignment_id`. Sebelum menyimpan, service memeriksa keberadaan `assignment_id` ke Assignment Service. Setelah submission tersimpan, service mengirim notifikasi ke Notification Service. Kegagalan service lain tidak menghentikan server ini.

Service ini **tidak mengunggah berkas fisik**. Modul hanya mewajibkan pencatatan metadata, sehingga `file_url` diperlakukan sebagai teks lokasi berkas.

## Teknologi

| Komponen | Teknologi |
|---|---|
| Bahasa / Runtime | JavaScript / Node.js (minimal 18, diuji dengan 26.13.1) |
| Framework | Express.js 4.19.2 |
| Sistem modul | ES Modules |
| Penyimpanan | JSON file (`data/submissions.json`) |
| Autentikasi | JWT (`jsonwebtoken` 9.0.2) |
| Konfigurasi | `dotenv` 16.4.5 |
| Pemanggilan antarservice | `fetch` bawaan Node.js (dengan timeout) |
| Pengujian | Postman dan `tests/test_api.js` |

## Persyaratan

- Node.js 18 atau lebih baru (`node -v`)
- npm
- Postman (untuk pengujian)

## Instalasi dan Menjalankan
### 1. Instalasi Dependensi

Pastikan Node.js dan npm sudah terpasang. Periksa menggunakan perintah:

```bash
node --version
npm.cmd --version
```

Kemudian, buka terminal pada direktori proyek dan jalankan:

```bash
npm.cmd install
```

### 2. Konfigurasi Environment

Salin file `.env.example` menjadi `.env`.

Untuk Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Untuk Windows CMD:

```cmd
copy .env.example .env
```

Jika file `.env` sudah tersedia, langkah penyalinan tidak perlu dilakukan lagi.

Buka file `.env`, kemudian isi `JWT_SECRET` menggunakan secret yang sama dengan Authentication Service.

### 3. Menjalankan Service

Jalankan service menggunakan:

```bash
npm.cmd run dev
```

Atau untuk menjalankan tanpa mode pengembangan:

```bash
npm.cmd start
```

### 4. Memeriksa Service

Buka alamat berikut melalui browser:

http://127.0.0.1:8105/health

Service berhasil berjalan apabila memberikan respons HTTP 200 dengan status `healthy`.

Untuk memungkinkan service diakses dari laptop lain, gunakan `HOST=0.0.0.0`, izinkan port 8105 melalui firewall, dan gunakan alamat IP laptop tersebut pada konfigurasi `services.json` milik kelompok lain.

## Konfigurasi Environment (`.env`)

| Variabel | Default | Keterangan |
|---|---|---|
| `PORT` | 8105 | Port service |
| `HOST` | 0.0.0.0 | Alamat yang didengarkan |
| `JWT_SECRET` | (wajib) | Secret JWT, sama dengan Authentication Service. Server menolak menyala jika kosong. |
| `DATA_FILE` | data/submissions.json | Berkas penyimpanan |
| `ASSIGNMENT_URL` | dari `services.json` | Alamat Assignment Service |
| `NOTIFICATION_URL` | dari `services.json` | Alamat Notification Service |
| `ASSIGNMENT_LOOKUP_PATH` | /api/assignments/:id | Path cek assignment |
| `NOTIFICATION_PATH` | /api/notifications | Path pembuatan notifikasi |
| `SERVICE_TIMEOUT_MS` | 3000 | Batas waktu panggilan antarservice |
| `PRIVILEGED_ROLES` | admin,dosen | Role yang boleh menghapus submission orang lain |

Alamat service lain dibaca dari `services.json` (format sama dengan contoh pada modul bagian 9). Variabel `.env` menimpa nilai tersebut.

## Daftar Endpoint

| Method | URL | Token | Keterangan |
|---|---|---|---|
| GET | `/health` | Tidak | Status service |
| GET | `/api/submissions?assignment_id=...` | Ya | Daftar submission, dapat difilter |
| POST | `/api/submissions` | Ya | Tambah submission |
| DELETE | `/api/submissions/{id}` | Ya | Hapus submission |

Dokumentasi lengkap ada di [API_CONTRACT.md](API_CONTRACT.md).

## Contoh Penggunaan

```bash
# Tambah submission
curl.exe -X POST http://127.0.0.1:8105/api/submissions ^
  -H "Authorization: Bearer <token>" -H "Content-Type: application/json" ^
  -d "{\"assignment_id\":\"asg-001\",\"file_name\":\"laporan.pdf\",\"file_url\":\"uploads/laporan.pdf\"}"

# Daftar submission untuk satu tugas
curl.exe "http://127.0.0.1:8105/api/submissions?assignment_id=asg-001" -H "Authorization: Bearer <token>"

# Hapus
curl.exe -X DELETE http://127.0.0.1:8105/api/submissions/sub-001 -H "Authorization: Bearer <token>"
```

(Perintah di atas memakai pemisah baris `^` untuk Windows CMD; di Bash/Git Bash ganti dengan `\` dan gunakan tanda kutip tunggal pada `-d`.)

## Struktur Folder

```
kelompok-4-submission-file/
├── README.md, API_CONTRACT.md, .env.example, .gitignore, services.json, package.json
├── src/
│   ├── server.js                 Titik masuk: middleware, rute, /health, listen
│   ├── config.js                 Membaca .env dan services.json
│   ├── routes/submissionRoutes.js
│   ├── controllers/submissionController.js   Validasi dan alur tiap endpoint
│   ├── services/
│   │   ├── submissionService.js  Baca/tulis JSON file (antrean tulis, penulisan atomik)
│   │   ├── assignmentService.js  Cek assignment_id ke Assignment Service
│   │   ├── notificationService.js Kirim notifikasi (tidak pernah melempar error)
│   │   └── httpClient.js         fetch dengan timeout, memetakan kegagalan ke 503/504/502
│   ├── middleware/               requestId, auth (JWT), requireJson, errorHandler
│   └── utils/response.js         Format respons dan AppError
├── data/submissions.json         Data (awal: kosong)
├── tests/test_api.js             Uji end-to-end otomatis
├── postman/Mini-LMS.postman_collection.json
└── docs/ TESTING.md, DIAGRAM.md, bukti/
```

## Integrasi dengan Service Lain

| Service | Kelompok | Cara | Status kontrak |
|---|---|---|---|
| Authentication | 1 | Token JWT diverifikasi lokal (`JWT_SECRET` bersama) | Asumsi, lihat bawah |
| Assignment | 6 | `GET /api/assignments/{id}` | Dikonfirmasi oleh Kelompok 6 |
| Notification | 2 | `POST /api/notifications` | Path dari modul, isi body asumsi |
| API Gateway | 5 | Menerima request yang diteruskan (port 8105); `X-Request-ID` dipakai ulang | Sesuai modul |

## Asumsi (bukan dari modul)

1. **Validasi token** dilakukan lokal dengan `JWT_SECRET` yang sama dengan Authentication Service, algoritma HS256. Identitas pengguna dibaca dari `id`, `user_id`, `userId`, atau `sub` pada payload; role dari `role`. Jika Kelompok 1 memakai cara lain, ubah `src/middleware/auth.js`.
2. **Body notifikasi**: `{ "user_id", "type": "submission_created", "message", "reference_id" }`. Sesuaikan dengan kontrak Kelompok 2 pada `src/services/notificationService.js`.
3. **Respons Assignment Service** berformat kontrak bersama (`success: true`, `data`). Status 404 berarti assignment tidak ada.
4. **`user_id`** diambil dari token. Pengguna biasa tidak dapat mengumpulkan atas nama pengguna lain (403).
5. **Hak hapus**: pemilik submission, atau role di `PRIVILEGED_ROLES` (default `admin`, `dosen`). Modul menyebut status 403 tetapi tidak menentukan siapa yang berhak.
6. **`file_id`** (ada pada contoh ringkasan course di modul) bersifat opsional pada request. Jika kosong, dibuat otomatis (`file-001`, dst.).
7. **Format `data` pada GET** berupa array langsung, dengan `meta.count`.
8. **ID** berurutan `sub-001`, `sub-002`, dst. berdasarkan nomor terbesar yang ada.

## Keterbatasan yang Diketahui

- Tidak ada unggah berkas fisik; hanya metadata. Batas jenis dan ukuran berkas tidak berlaku.
- `GET /api/submissions` menampilkan semua submission (sesuai filter) kepada pengguna yang punya token valid; belum dibatasi per pengguna.
- JSON file cocok untuk skala demo, bukan produksi. Antrean tulis hanya melindungi satu proses (jangan menjalankan dua instance pada berkas yang sama).
- Token tidak divalidasi ke Authentication Service sehingga token yang dicabut tetap diterima sampai kedaluwarsa.
- Notifikasi dikirim sekali tanpa percobaan ulang; jika gagal, hanya ditandai `meta.notification: "failed"`.
- Pengujian `tests/test_api.js` memakai service tiruan; integrasi nyata lintas kelompok perlu diuji bersama saat demo.
