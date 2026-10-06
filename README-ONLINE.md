# Visit AO — Online / HP

Versi ini siap dideploy ke hosting Node.js. Untuk penyimpanan SQLite + foto tetap bertahan setelah restart/deploy, hosting harus menyediakan persistent disk/volume.

## Opsi tercepat: Render

1. Upload folder ini ke GitHub sebagai repository baru.
2. Di Render pilih **New > Blueprint** dan pilih repository tersebut.
3. Render akan membaca `render.yaml`.
4. Saat diminta, isi `OWNER_KEY` dengan kunci rahasia sendiri.
5. Deploy. Setelah selesai, Render memberi URL HTTPS. Buka URL itu dari HP.
6. Izinkan **Camera** dan **Location** di browser HP.

File `render.yaml` sudah mengatur persistent disk 1 GB pada `/var/data`, sehingga database SQLite dan foto diarahkan ke lokasi yang persisten. Render mendokumentasikan bahwa persistent disk diperlukan agar perubahan filesystem bertahan setelah restart/deploy.

## Opsi Railway

1. Buat project/service dari repository ini.
2. Generate public domain dari pengaturan Networking.
3. Tambahkan Volume dengan mount path `/app/data`.
4. Set `DATA_DIR=/app/data` dan `UPLOAD_DIR=/app/data/uploads`.
5. Set `OWNER_KEY` sendiri.

## Catatan penting

- HP tidak perlu Node.js. Node.js hanya berjalan di server/cloud.
- HTTPS penting agar GPS/kamera dapat digunakan dengan normal.
- SQLite + satu persistent volume cocok untuk demo/internal skala kecil satu instance. Untuk production bank, pindahkan database ke PostgreSQL managed dan file foto ke object storage.
- Jangan gunakan `OWNER-2026` untuk deployment nyata.
