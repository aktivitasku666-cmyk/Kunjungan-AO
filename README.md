# Visit AO

Aplikasi web responsive, mobile-first untuk pendataan dan monitoring kunjungan calon debitur PNS/ASN.

## Fitur
- 12 akun AO dummy tanpa data nasabah asli.
- Unduh Excel semua AO dari halaman awal tanpa login.
- Beranda: total kunjungan, bulan ini, berhasil booking, tidak berhasil booking.
- Form kunjungan 7 langkah dengan progress, validasi, dummy data.
- Foto 1–3 JPG/PNG, kamera diprioritaskan di HP, kompresi otomatis dan preview.
- GPS wajib: latitude, longitude, Google Maps. Tidak membuat lokasi palsu jika izin ditolak.
- Submit menghasilkan Visit ID unik, status Submitted, timestamp, dan pembuat.
- Riwayat per AO, pencarian, detail lengkap.
- NIK selalu dimasking pada tampilan dan ekspor.
- Tombol "Ya, jadi" / "Tidak jadi" pada detail; status ikut dashboard.
- Export Excel per AO dan semua AO.
- Reset semua data untuk pemilik dengan konfirmasi RESET.
- SQLite persisten di `data/visit-ao.sqlite`; foto di `uploads/`.
- Mode terang/gelap.

## Menjalankan
Butuh Node.js 18+.

```bash
npm install
npm start
```

Buka `http://localhost:3000`.

## Deploy
Aplikasi dapat dijalankan pada VM/server/container Node.js yang memiliki disk persisten. Untuk penggunaan lintas perangkat, arahkan domain HTTPS ke server tersebut.

**Penting:** browser umumnya hanya mengizinkan geolocation melalui HTTPS (kecuali localhost). Karena itu production sebaiknya memakai HTTPS.

## Kunci pemilik
Default:
`OWNER-2026`

Ganti sebelum production:
```bash
OWNER_KEY="kunci-rahasia-baru" npm start
```

## Catatan production
Untuk bank/production, tambahkan SSO/OAuth perusahaan, role-based access control, audit log, enkripsi database/storage, backup, retention policy, antivirus/image scanning, HTTPS, reverse proxy, rate limiting, CSRF protection, dan secret management. Akun AO pada proyek ini sengaja berupa pilihan dummy sesuai permintaan.
