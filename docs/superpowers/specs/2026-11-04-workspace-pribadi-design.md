# Workspace pribadi dan isolasi data

## Tujuan dan akses

Setiap akun aktif memiliki workspace pribadi berdasarkan UUID akun yang telah diautentikasi. Pengurus hanya dapat melihat dan mengubah data workspace miliknya sendiri, termasuk petugas, slideshow, gambar latar, umat, absensi, dan rekap. Pengurus mengelola umat di workspace sendiri. Superadmin memiliki workspace sendiri dengan aturan yang sama, dan dapat mengelola akun, menerbitkan informasi, serta memantau aktivitas pengguna. Superadmin tidak otomatis memperoleh akses membaca atau mengubah isi workspace orang lain. Data ayat adalah referensi bersama; informasi yang diterbitkan superadmin tersedia untuk seluruh akun aktif.

## Isolasi server dan database

Tambahkan `owner_id` UUID ke setiap tabel data workspace. Server selalu memperoleh pemilik dari token yang diverifikasi dan membatasi setiap daftar, detail, pembuatan, perubahan, penghapusan, pencarian duplikat, relasi, dan rekap berdasarkan pemilik tersebut. ID yang tidak dimiliki pengguna menghasilkan 404 tanpa mengungkap keberadaan data. Absensi harus merujuk hanya pada umat di workspace yang sama; constraint database turut menegakkan relasi ini. Pengguna tidak dapat memilih `owner_id` melalui input. Kebijakan database dan hak akses langsung browser harus mencegah akses lintas workspace meskipun backend menggunakan service role.

Audit yang tersedia bagi superadmin hanya memuat metadata aktivitas (aktor, waktu, tindakan, jenis objek dan identitas objek); jangan kembalikan isi data workspace atau snapshot sebelum/sesudah kepada superadmin. Aktivitas pengelolaan akun dan pengumuman tetap tercatat.

## Gambar latar

Gambar baru disimpan dalam bucket privat dengan jalur yang diikat ke UUID pemilik. Akses baca harus melalui pemeriksaan kepemilikan atau URL bertanda tangan berumur pendek setelah pemeriksaan tersebut; setiap unggahan dan referensi latar divalidasi agar tidak dapat menunjuk ke gambar workspace lain. Gambar lama dipindahkan atau diisolasi tanpa meninggalkan salinan publik yang dapat diakses; migrasi harus memeriksa referensi dan kepemilikan sebelum akses publik ditutup. Jangan mengklaim privasi gambar sampai langkah penyimpanan ini berhasil.

## Migrasi data lama

Migrasi mempertahankan seluruh data dan menentukan pemilik berdasarkan bukti pencipta yang andal dan cocok dengan satu profil. `updated_by` slideshow tidak membuktikan pencipta karena dapat berubah; jangan menetapkan kepemilikannya berdasarkan nilai itu saja. Data yang pemiliknya tidak dapat dipastikan disimpan terpisah dan tidak ditampilkan pada workspace mana pun sampai pemiliknya ditentukan. Catatan absensi mengikuti pemilik umat hanya jika hubungan tersebut dapat dipastikan. Buat laporan jumlah data yang dipetakan dan yang menunggu penetapan, tanpa menghapus data. Migrasi berjalan secara transaksional jika memungkinkan dan tidak memperluas akses selama transisi. Migrasi role sebelumnya tetap diperlukan: `admin` menjadi `superadmin`, `user` menjadi `pengurus`, dan akun aariel.tron48@gmail.com menjadi superadmin.

## Verifikasi

Gunakan dua akun aktif dan data terpisah pada lingkungan uji yang terisolasi. Uji daftar dan detail, perubahan dan penghapusan lintas pemilik dengan ID yang diketahui, pemilihan umat dan pencatatan absensi, impor dan rekap, serta gambar yang diminta oleh pemilik lain. Pastikan pemilik tetap dapat memakai datanya dan superadmin hanya melihat metadata audit. Uji data lama yang memiliki bukti pemilik maupun yang tidak, kegagalan migrasi, dan batas akses langsung database/storage. Jalankan build backend dan frontend. Jangan gunakan data produksi sebagai fixture pengujian atau mengklaim perubahan aktif sebelum migrasi dan deployment selesai.
