# Role pengguna dan dashboard superadmin

## Tujuan

Aplikasi memiliki dua role: `pengurus` dan `superadmin`. Pengurus aktif dapat menggunakan fitur aplikasi yang tersedia bagi pengguna, sementara pengelolaan pengguna dan informasi aplikasi hanya dapat dilakukan oleh superadmin. Pendaftaran publik memerlukan persetujuan sebelum akses diberikan.

## Pendaftaran dan profil

Formulir pendaftaran meminta nama lengkap, tanggal lahir, domisili, asal Pakin/Makin, email, dan password. Semua kolom wajib bagi pendaftar baru. Tanggal lahir harus berupa tanggal valid yang tidak berada di masa depan. Domisili dan asal Pakin/Makin diisi sebagai teks. Akun baru dibuat dengan role `pengurus` dan status `pending`. Pengguna pending tidak dapat memakai fitur aplikasi sampai disetujui; pengguna yang diblokir juga tidak dapat memakainya.

Superadmin meninjau informasi tersebut dalam detail pengajuan dan dapat menyetujui atau menolaknya. Pengguna yang sudah ada tidak perlu mengisi data baru untuk mempertahankan akses; kolom baru dapat kosong untuk profil lama dan akun yang dibuat melalui jalur administrasi yang ada.

## Hak akses dan migrasi

Superadmin dapat mengelola pengguna, termasuk menyetujui atau menolak pendaftaran, memblokir atau membuka blokir, dan mengubah role sesuai perlindungan akun yang ada. Pengurus tidak dapat memakai endpoint maupun halaman pengelolaan superadmin. Backend memeriksa status dan role pada setiap permintaan yang dilindungi; tampilan menyembunyikan navigasi yang tidak berhak diakses dan menangani respons akses ditolak.

Migrasi mengubah seluruh role `admin` yang ada menjadi `superadmin` untuk mempertahankan hak akses, mengubah role `user` menjadi `pengurus`, memperbarui batasan role database, dan menjadikan profil dengan email `aariel.tron48@gmail.com` sebagai `superadmin`. Migrasi harus memeriksa bahwa akun sasaran ada, tidak membuat akun baru, dan tidak mengubah password atau statusnya. Role baru untuk pendaftaran publik selalu `pengurus`.

## Dashboard dan informasi

Sediakan dashboard superadmin dengan ringkasan pengguna, jumlah pengajuan yang menunggu, dan tautan ke manajemen pengguna serta informasi. Superadmin dapat membuat, mengubah, menerbitkan, dan menghapus informasi sederhana yang terdiri dari judul dan isi. Informasi yang diterbitkan ditampilkan kepada pengguna aktif pada dashboard aplikasi; informasi yang belum diterbitkan hanya dapat dilihat superadmin. Waktu pembuatan dan perubahan disimpan. Data baru dilindungi dari akses langsung browser melalui kebijakan database yang sesuai dengan pola backend proyek.

## Kegagalan dan verifikasi

Formulir menampilkan kesalahan validasi dan kegagalan server tanpa kehilangan masukan. Operasi pengelolaan gagal dengan pesan yang jelas jika akun tidak berwenang atau data tidak valid. Migrasi harus dapat dijalankan pada database dengan profil lama tanpa menghapus data profil.

Verifikasi mencakup pendaftaran dan validasi kolom baru, penolakan akses user dan akun pending ke fungsi superadmin, persetujuan akun, fungsi informasi yang diterbitkan, migrasi role, serta build dan pemeriksaan proyek yang tersedia. Tidak ada perubahan password sebagai bagian pekerjaan ini.
