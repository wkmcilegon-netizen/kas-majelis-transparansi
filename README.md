# Majlis Kas Tracker

Buatkan aplikasi kas MT. JAM'YYYAH SIMTHUDDURAR AL-ISTIOMAH

Halaman depan sebatas informasi TOTAL KAS ACARA (pemasukan & pengeluaran dibawah total kas berupa tabel yang berisi PEMASUKAN (nama dan nominal), pengeluaran (keterangan pembelian dan nominal) dan pamflet acara yang kan di upload oleh admin dari galeri beserta deskripsi acara jika nanti ada acara sebagai informasi ke publik  pmfelet posisi berada di atas beserta dengan deskripsi dengan posisi stay meskipun publik scroll kebawah.

Pada halaman admin buat login dengan username MT-JSI dan password 123456

Halaman admin bisa membuat akun login untuk anggota dengan formulir hanya nama dan password saja. 

Pada halaman admin yang berbeda admin hanya dapat approve ataupun menolak permintaan dari anggota majlis. Setiap yang sudah terkonfirmasi baik pemasukan ataupun pengeluaran secara otomatis akan menjadi laporan ke halaman utama ataupun anggota.

Admin juga dapat mengubah nama, menghapus ataupun mereset password anggota jika anggota lupa password maka password akan kembali normal ke 123456.

Buatkan pengaturan pada halaman admin agar admin dapat merubah password. Jika admin lupa password maka admin harus memasukan code gh1gh415 dan password kembali normal 123456 untuk admin. Untuk username admin tidak dapat diubah.

Admin dapat menghapus ataupun mengedit pemasukan atau pengeluaran dan segala informasi akan diketahui oleh anggota sebagai transparansi kepada anggota.

Pada halaman anggota yang sudah terdaftar buatkan form pengajuan pembelian yang berisi keterangan dan nominal yang akan dikirim ke halaman admin. Anggota juga dapat menginput pemasukan yang berisi nama, nominal dan tujuan (acara dan kas internal) jika mengisi untuk acara maka saldo akan bertambah setelah dikonfirmasi oleh admin ke halaman utama dan jika pilihannya untuk kas internal maka saldo akan bertambah ke kas anggota setelah dikonfirmasi oleh admin. Dan buat pengaturan untuk merubah password saja.

Setelah 1 bulan setelah acara, tabel pada halaman depan terhapus secara otomatis dan akan muncul ketika admin menginput pemasukan dan pengeluaran saat ada acara kembali. Pamflet buat posisi paling awal agar terlihat jelas oleh publik.

Halaman anggota dan admin buatkan tombol kembali

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://kas-majelis-transparansi.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/0bcedb86-a299-48bc-87ae-8f864746b131).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
