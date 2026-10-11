# CLAUDE.md: instruksi untuk yang membangun prototype

Kamu membangun **SECOND LOOK**, MVP untuk demo 60 detik di presentasi analisis data asuransi. Baca semua file di `docs/` sebelum menulis kode, urut 01 → 06.

## Tujuan nomor satu
Demo **harus jalan mulus di laptop presentasi, tanpa internet**, dan menceritakan satu pesan: *churn paling murah dicegah sebelum polis tambahan terbit*. Fitur yang tidak mendukung pesan itu boleh dibuang.

## Aturan keras
1. **Join data wajib lewat `customer_id`.** Jangan pernah menggabungkan sheet `policy` dan `customer` berdasarkan posisi baris. (Notebook analisis lama melakukan ini dan merusak semua variabel nasabah; lihat docs/01 bagian "Jebakan data".) Tulis test yang memastikan setiap polis menemukan pemiliknya.
2. **Jangan commit data asli.** `data/raw/` dan `*.xlsx` ada di `.gitignore`. Repo ini public. Yang boleh di-commit: kode, dokumen, dan **data sintetis** untuk mode demo publik (lihat docs/04, "Mode data").
3. **Angka di UI harus cocok dengan tabel "Angka yang harus tereproduksi"** di docs/04. Kalau hasil pipeline berbeda, berhenti dan laporkan, jangan menyesuaikan angka secara manual.
4. **Bahasa UI: English** (deck dan presentasi berbahasa Inggris). Pakai bahasa sederhana untuk audiens non-asuransi: "stopped / cancelled", "second policy", "pays monthly". Gunakan copy di docs/03 bagian "UI copy". Format angka gaya Inggris (titik desimal, koma ribuan), mata uang "Rp".
5. **Jujur soal kausalitas.** Skor dan simulasi "switch to annual" adalah **asosiasi**. Setiap layar yang menampilkan simulasi wajib punya catatan kecil: *"Estimate based on historical patterns, not a proven effect. To be tested in a pilot."*
6. Tidak ada login, tidak ada backend server yang wajib hidup saat demo. Lihat stack di docs/06.
7. **Persona demo:** "Pak Andi" (36, married, long-time customer, one life policy, about to buy a second life policy, small premium, monthly). Ini tokoh pembuka di pitch, jadi sediakan sebagai preset di Second Look Check (`Load demo: Pak Andi`).

## Definisi selesai (ringkas)
- `npm run build` (atau setara) menghasilkan folder statis yang bisa dibuka offline.
- 4 layar di docs/03 berfungsi, termasuk Second Look Check yang merespons input secara instan (<100 ms).
- Pipeline Python mereproduksi angka kunci di docs/04 (ada test).
- README diperbarui dengan cara menjalankan & screenshot.

## Kalau ragu
Pilih yang paling sederhana dan paling stabil untuk demo. Catat keputusan dan pertanyaan terbuka di `docs/DECISIONS.md`.
