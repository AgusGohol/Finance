# Kas Pribadi

Aplikasi keuangan pribadi: catat pemasukan dan pengeluaran, pantau anggaran bulanan per kategori, dan lihat grafik pengeluaran harian.

- **Android:** file APK, dibangun otomatis oleh GitHub Actions.
- **Komputer & iPhone:** versi web di GitHub Pages, bisa dipasang ke layar utama.
- **Login email + password** (Firebase). Data sama di semua perangkat dan tetap bisa dicatat saat offline; terkirim otomatis begitu online lagi.

---

## 1. Siapkan Firebase (sekali saja, ±10 menit)

1. Buka <https://console.firebase.google.com> dan masuk dengan akun Google.
2. **Buat proyek** → beri nama `kas-pribadi` → Google Analytics boleh dimatikan → **Buat proyek**.
3. **Aktifkan login email:** menu kiri **Build → Authentication** → **Get started** → tab **Sign-in method** → pilih **Email/Password** → nyalakan **Enable** (yang pertama saja) → **Save**.
4. **Buat database:** menu kiri **Build → Firestore Database** → **Create database** →
   - Lokasi: **asia-southeast2 (Jakarta)**
   - Mode: **Start in production mode** → **Create**.
5. **Pasang aturan keamanan:** masih di Firestore, buka tab **Rules**, hapus isinya, tempel isi file [`firestore.rules`](firestore.rules), lalu **Publish**. Aturan ini membuat setiap akun hanya bisa membaca datanya sendiri.
6. **Ambil pengaturan aplikasi:** klik ikon roda gigi → **Project settings** → bagian **Your apps** → klik ikon web **`</>`** → nama aplikasi `Kas Pribadi` → **jangan** centang Firebase Hosting → **Register app**. Akan muncul kode berisi `firebaseConfig = { apiKey: "...", ... }`.
7. Salin nilai-nilai itu ke file [`firebase-config.json`](firebase-config.json) (di GitHub: buka file → ikon pensil → isi → **Commit changes**).

> Pengaturan ini memang aman berada di repositori publik. Yang menjaga datamu adalah login dan aturan Firestore di langkah 5, bukan kerahasiaan `apiKey`.

## 2. Siapkan GitHub

1. Buat repositori baru bernama `kas-pribadi` dengan visibilitas **Public** (GitHub Pages gratis hanya untuk repositori publik; data keuanganmu tidak tersimpan di repositori).
2. Unggah semua file proyek ini ke repositori tersebut.
3. **Kunci tanda tangan APK:** buka **Settings → Secrets and variables → Actions → New repository secret**, lalu buat dua secret dari file `secrets.txt` yang diberikan bersama proyek ini:
   - `KEYSTORE_PASSWORD`
   - `KEYSTORE_BASE64`

   Kunci ini harus selalu sama. Kalau berubah, APK baru tidak bisa dipasang di atas yang lama. Simpan `secrets.txt` dan `kaspribadi-release.keystore` di tempat aman (mis. Google Drive pribadi), jangan diunggah ke repositori.
4. **Aktifkan GitHub Pages:** **Settings → Pages** → **Source: GitHub Actions**.
5. Buka tab **Actions** → pilih **Bangun aplikasi** → **Run workflow**. Proses ±5–8 menit.

Hasilnya:
- Versi web: `https://<username-github>.github.io/kas-pribadi/`
- APK: tab **Releases** di repositori (mis. `KasPribadi-1.0.1.apk`).

## 3. Pasang di perangkat

**Android**
1. Di HP, buka halaman **Releases** repositori, unduh file `.apk` terbaru.
2. Buka file tersebut. Kalau diminta, izinkan browser untuk **memasang aplikasi tidak dikenal**.
3. Jika Play Protect memperingatkan aplikasi tidak dikenal, pilih **Detail lainnya → Tetap instal**. Peringatan ini muncul karena aplikasi tidak berasal dari Play Store.

**iPhone**
1. Buka alamat versi web di **Safari**.
2. Tekan **Bagikan** → **Tambahkan ke Layar Utama** → **Tambah**.

**Komputer**
Buka alamat versi web di Chrome atau Edge. Untuk memasangnya seperti aplikasi, klik ikon pasang di ujung kanan kolom alamat.

Pertama kali, pilih **Buat akun** lalu daftar dengan email dan password. Di perangkat lain cukup **Masuk** dengan akun yang sama.

## 4. Pembaruan

- Setiap perubahan di cabang `main` otomatis membangun versi web dan APK baru.
- Versi web dan iPhone langsung memakai versi terbaru (muat ulang halaman).
- Aplikasi Android menampilkan pemberitahuan **Versi baru tersedia** beserta tombol unduh. Pasang APK baru di atas yang lama; data tetap aman karena tersimpan di akunmu.

## 5. Tutup pendaftaran (disarankan)

Setelah akunmu jadi, orang lain sebaiknya tidak bisa membuat akun di aplikasimu:
Firebase → **Authentication → Settings → User actions** → matikan **Enable create (sign-up)** → **Save**.

## Masalah umum

| Gejala | Penyebab & solusi |
| --- | --- |
| Muncul "Pengaturan belum lengkap" | `firebase-config.json` masih kosong. Isi sesuai langkah 1.7. |
| "Login email/password belum diaktifkan" | Ulangi langkah 1.3. |
| "Akses data ditolak" | Aturan Firestore belum dipasang. Ulangi langkah 1.5. |
| Job **APK Android** gagal: secret belum diisi | Isi dua secret di langkah 2.3. |
| Job **Versi web** gagal di langkah Pages | Aktifkan Pages dengan Source **GitHub Actions** (langkah 2.4), lalu jalankan ulang. |
| APK baru gagal dipasang ("konflik paket") | Kunci tanda tangan berubah. Pakai lagi secret lama, atau hapus aplikasi lama lalu pasang yang baru (data tetap ada di akun). |

## Struktur proyek

```
src/                 kode aplikasi (tampilan, data, service worker, ikon web)
firebase-config.json pengaturan Firebase milikmu
firestore.rules      aturan keamanan database
resources/android/   ikon & layar pembuka Android
scripts/             skrip build
.github/workflows/   GitHub Actions: versi web + APK
```

Data tersimpan di Firestore pada `users/{id-akun}/tx` (transaksi) dan `users/{id-akun}/settings/anggaran`.
