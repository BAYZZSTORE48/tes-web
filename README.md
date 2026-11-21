# AM Verif Web

Website untuk kirim magic link ke email, lalu verifikasi dengan menempelkan link dari email.
Alurnya sama dengan command bot `.amverif send email` dan `.amverif verify email|link`.
Email dan link tidak disimpan. Server hanya meneruskannya ke API.

## Jalankan lokal
```
node server.js        # butuh Node.js 18+
```
Buka http://localhost:3000

## Upload ke GitHub
```
git init
git add .
git commit -m "AM Verif Web"
git branch -M main
git remote add origin https://github.com/USERNAME/am-verif-web.git
git push -u origin main
```

## Jalankan di Pterodactyl (egg Node.js)
1. Pakai egg Node.js, versi Node 18 atau lebih baru.
2. Isi variabel Git Address dengan URL repo GitHub (repo private perlu Git Username dan token), atau upload file lewat File Manager.
3. Main file: `server.js`. Tidak perlu `npm install` karena tanpa dependensi.
4. Server otomatis memakai port dari `SERVER_PORT`. Pastikan allocation-nya terbuka, lalu start.
5. Buka `http://IP-NODE:PORT`. Untuk domain, arahkan reverse proxy (Nginx/Cloudflare) ke port itu.

## Struktur
```
server.js         server + proxy API (batas 8 permintaan/menit per IP)
public/index.html tampilan (3D, latar grid kotak jatuh)
package.json
```
