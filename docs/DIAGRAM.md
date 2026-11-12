# Diagram Submission File Service (Kelompok 4)

Diagram memakai Mermaid (tampil otomatis di GitHub). Gunakan https://mermaid.live untuk mengekspornya menjadi gambar.

## Hubungan antarservice

```mermaid
flowchart LR
    C[Client / Postman] --> G[API Gateway :8101]
    G --> A[Authentication :8102]
    G --> S[Submission File :8105]
    S -- "GET /api/assignments/{id}" --> AS[Assignment :8104]
    S -- "POST /api/notifications" --> N[Notification :8106]
    M[Monitoring :8107] -. "GET /health" .-> S
    S --- D[(data/submissions.json)]
```

## Alur POST /api/submissions

```mermaid
sequenceDiagram
    participant C as Client
    participant S as Submission File (8105)
    participant A as Assignment (8104)
    participant N as Notification (8106)
    C->>S: POST /api/submissions (Bearer token)
    S->>S: Cek token (401 jika gagal), Content-Type (415), validasi field (400)
    S->>A: GET /api/assignments/{assignment_id}
    alt assignment tidak ada
        A-->>S: 404
        S-->>C: 404 assignment_not_found
    else Assignment mati / lambat
        S-->>C: 503 service_unavailable / 504 service_timeout
    else assignment ada
        A-->>S: 200
        S->>S: Simpan ke data/submissions.json
        S->>N: POST /api/notifications
        N-->>S: 201 (atau gagal, diabaikan)
        S-->>C: 201 + meta.notification (sent / failed)
    end
```
