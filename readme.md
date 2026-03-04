# 🎴 Flipeek Online

> Game kartu memori multiplayer real-time — uji ingatan dan strategi kamu!

---

## 🎯 Tujuan Game

Kumpulkan **10 poin** sebelum pemain lain. Gunakan ingatanmu untuk menghafalkan posisi icon di papan, lalu klaim kartu target yang tepat untuk mendapat poin!

---

## 👥 Cara Bergabung

1. Buka link game di browser
2. Masukkan **nama pemain** kamu
3. Pilih salah satu:
   - **Buat Room** — kamu jadi Host, bagikan ID Room ke teman
   - **Join via ID Room** — masukkan ID yang diberi temanmu
   - **Lihat Daftar Room** — pilih room yang tersedia
4. Tunggu minimal **2 pemain** di room
5. Host klik **▶️ Mulai Game**

---

## 🃏 Papan Permainan

```
┌───┬───┬───┐
│ ? │ ? │ ? │
├───┼───┼───┤
│ ? │ ? │ ? │   +   🎯 3 Kartu Target
├───┼───┼───┤
│ ? │ ? │ ? │
└───┴───┴───┘
  9 Kartu Tertutup
```

- **Papan** berisi 9 kartu yang tersusun tertutup dalam grid 3×3
- Setiap kartu menyimpan **1 icon** di baliknya
- **3 Kartu Target** ditampilkan di sebelah kanan papan
- Semua icon yang ada di kartu target **dijamin tersedia** di papan

---

## ⚡ Sistem Giliran

Pemain bermain **bergantian**. Setiap giliran punya waktu **30 detik**.
Jika waktu habis, giliran otomatis dilewati.

---

## 🎮 3 Aksi per Giliran

Setiap giliran, kamu **wajib memilih 1** dari 3 aksi berikut:

### 👁️ Peek — Intip
> Intip icon 1 kartu secara diam-diam

- Pilih **1 kartu** tertutup di papan
- Icon kartu tersebut akan muncul **hanya di layarmu** selama **2 detik**
- Pemain lain **tidak tahu** icon apa yang kamu lihat
- Gunakan aksi ini untuk menghafalkan posisi icon!

---

### 🔄 Flip — Buka
> Buka 2 kartu untuk dilihat semua pemain

- Pilih **2 kartu** tertutup di papan
- Kedua kartu terbuka dan **semua pemain** bisa melihat iconnya selama **3-4 detik**
- Kartu otomatis tertutup kembali setelahnya
- Gunakan aksi ini untuk berbagi informasi — atau justru mengecoh lawan!

---

### 🎯 Claim — Klaim
> Coba cocokkan icon papan dengan salah satu Kartu Target

- Pilih **1 Kartu Target** yang ingin diklaim
- Pilih kartu-kartu di papan yang kamu yakini berisi icon yang cocok
- Jumlah kartu yang dipilih harus **sama persis** dengan jumlah icon di target
- Urutan pilihan **tidak berpengaruh** — yang penting iconnya tepat!

#### ✅ Jika BENAR:
- Kamu mendapat **poin** sesuai Kartu Target tersebut
- Posisi kartu di papan **diacak ulang**
- Kartu Target yang diklaim **diganti baru**
- Giliran berlanjut ke pemain berikutnya

#### ❌ Jika SALAH:
- Tidak dapat poin
- Posisi kartu di papan **diacak ulang** (hukuman!)
- **Semua 3 Kartu Target diganti baru** (hukuman berat!)
- Giliran berlanjut ke pemain berikutnya

---

## ⭐ Sistem Poin

| Jumlah Icon di Target | Poin |
|:---:|:---:|
| 3 icon | 4 poin |
| 4 icon | 5 poin |
| 5 icon | 6 poin |

---

## 🏆 Kondisi Menang & Kalah

| Kondisi | Status |
|---|---|
| Pertama mencapai **10 poin** | 👑 **WINNER** |
| Pemain terakhir yang tersisa | 💀 **LOSER** |

- Pemain yang sudah menang **tidak ikut giliran lagi**, tapi tetap bisa melihat jalannya game
- Game berlanjut sampai hanya tersisa **1 pemain aktif** (dia jadi Loser)
- Jika ada pemain yang **disconnect**, giliran mereka otomatis dilewati

---

## 💬 Chat

- Tersedia **chat room** di ruang tunggu dan **chat in-game** saat bermain
- Gunakan untuk koordinasi, gertakan, atau sekadar ngobrol!

---

## 💡 Tips & Strategi

- **Hafalkan posisi icon** saat pemain lain melakukan Flip — informasi itu gratis!
- **Gunakan Peek** untuk mengintip icon yang belum kamu tahu tanpa memberi tahu lawan
- **Jangan buru-buru Claim** kalau belum yakin — salah Claim bisa membalik keadaan
- **Perhatikan reaksi pemain lain** saat mereka Peek — bisa jadi petunjuk!
- **Timing Claim itu penting** — kalau papan baru diacak, semua orang kehilangan ingatan mereka juga

---

## ⚙️ Info Teknis

- Tidak perlu akun — cukup masuk sebagai **Guest** dengan nama
- Bisa dimainkan di **HP maupun Desktop**
- Dibangun dengan **Node.js + Socket.io**
- Semua data tersimpan sementara di server — tidak ada database

---

Disclaimer !
Ini game yang dibuat 100% oleh ai, namun ide nya tidak