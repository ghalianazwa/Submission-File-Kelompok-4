# Pengujian Submission File Service (Kelompok 4)

## Tujuan

Pengujian dilakukan untuk membuktikan bahwa endpoint Submission File Service berjalan sesuai dengan ketentuan pada `API_CONTRACT.md`. Pengujian mencakup kasus berhasil, kesalahan input (400), autentikasi (401), data tidak ditemukan (404), serta penanganan kegagalan layanan lain (503/504) tanpa menghentikan server.

## Lingkungan

| Item | Isi |
|---|---|
| Sistem operasi | Windows 11 |
| Node.js | v26.13.1 |
| npm | 11.20.0 |
| Service diuji | http://127.0.0.1:8105 |
| Alat pengujian | Automated API Testing |
| File pengujian | `tests/test_api.js` |
| Hasil pengujian | 19/19 skenario lulus |

## Cara Pengujian

### A. Pengujian Otomatis

Pengujian dilakukan menggunakan skrip otomatis yang terdapat pada file `tests/test_api.js`.

Langkah pengujian:

1. Jalankan `npm.cmd install` untuk memasang seluruh dependensi.
2. Jalankan `npm.cmd test` untuk memulai pengujian otomatis.
3. Amati hasil pengujian pada terminal.

Skrip pengujian menjalankan Submission File Service bersama layanan Assignment dan Notification tiruan (mock), serta menggunakan data sementara untuk menguji berbagai kondisi endpoint.

### B. Pengujian melalui Postman

Pengujian manual dapat dilakukan dengan mengimpor koleksi `postman/Mini-LMS.postman_collection.json`. Pastikan Submission File Service berjalan dan variabel token telah diisi menggunakan token yang valid dari Authentication Service.

## Skenario dan Hasil

| No. | Skenario | Method | Harapan | Hasil |
|---|---|---|---|---|
| 1 | Health check | GET | 200, status healthy | Lulus |
| 2 | Daftar submission | GET | 200, data array | Lulus |
| 3 | Filter assignment_id | GET | 200, data sesuai filter | Lulus |
| 4 | POST berhasil | POST | 201, status submitted | Lulus |
| 5 | POST tanpa field wajib | POST | 400 validation_error | Lulus |
| 6 | assignment_id tidak tersedia | POST | 404 assignment_not_found | Lulus |
| 7 | Tanpa token | POST | 401 unauthorized | Lulus |
| 8 | Token tidak valid | POST | 401 invalid_token | Lulus |
| 9 | Content-Type bukan JSON | POST | 415 | Lulus |
| 10 | DELETE berhasil | DELETE | 200, deleted true | Lulus |
| 11 | DELETE ID tidak ditemukan | DELETE | 404 submission_not_found | Lulus |
| 12 | Assignment Service tidak tersedia | POST | 503 service_unavailable | Lulus |
| 13 | Notification Service tidak tersedia | POST | 201, notifikasi gagal tetapi submission tersimpan | Lulus |

Selain 13 skenario di atas, skrip otomatis juga menguji token kedaluwarsa, JSON rusak, penghapusan submission milik pengguna lain (403), endpoint tidak dikenal (404), Assignment Service mengalami timeout (504), dan health check tetap memberikan respons 200 setelah dependency mengalami kegagalan.

## Kesimpulan

Berdasarkan pengujian otomatis yang telah dilakukan menggunakan `npm.cmd test`, seluruh 19 skenario berhasil dijalankan sesuai dengan respons HTTP yang diharapkan.

- Total skenario: 19
- Skenario berhasil: 19
- Skenario gagal: 0
- Tingkat keberhasilan: 100%