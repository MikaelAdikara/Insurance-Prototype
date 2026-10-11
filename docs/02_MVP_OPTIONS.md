# 02 — Opsi MVP & Rekomendasi

## Kriteria memilih
| Kriteria | Bobot | Kenapa |
|---|---|---|
| Menguatkan pesan utama deck ("cegah di titik jual polis berikutnya") | Tinggi | Demo harus jadi bukti rekomendasi, bukan pamer teknologi |
| Relevan untuk praktisi asuransi | Tinggi | Praktisi menilai "apakah ini bisa dipakai besok di kantor saya?" |
| Bisa didemokan dalam 60 detik dengan momen "wow" | Tinggi | Waktu panggung terbatas |
| Stabil offline | Tinggi | Risiko proyektor/internet di hari H |
| Bisa dibangun dalam beberapa hari | Sedang | Waktu terbatas |
| Jujur secara statistik | Wajib | Reviewer akademis akan menyerang klaim kausal |

## Opsi yang dipertimbangkan

### A. Dashboard analitik portofolio
Grafik churn per segmen, filter, drill-down.
- ➕ Mudah dibuat, aman.
- ➖ Generik; tidak ada "momen keputusan". Audiens sudah melihat ini di slide.
- **Skor: rendah**

### B. Retention Watchlist (CRM-style)
Daftar polis berisiko + alasan + aksi + ekspor ke tim call center.
- ➕ Operasional, praktisi paham.
- ➖ Reaktif (setelah polis terbit). Tidak menunjukkan ide paling segar di deck.
- **Skor: sedang**

### C. Second Look Check (point-of-sale)
Form singkat yang dipakai agen sebelum menerbitkan polis berikutnya. Input: profil polis yang sudah dimiliki + rencana polis baru. Output: risiko churn 12 bulan, alasan, dan alternatif yang lebih aman (top-up/rider, bayar tahunan, autodebet), dengan simulasi instan.
- ➕ Langsung memvisualkan rekomendasi utama; ada momen "wow" ketika risiko turun saat cara bayar diubah.
- ➕ Praktisi langsung kebayang tempatnya di proses bisnis (aplikasi agen / underwriting).
- ➖ Harus hati-hati menyatakan bahwa simulasi itu asosiatif.
- **Skor: tinggi**

### D. Pilot Planner
Kalkulator desain A/B: segmen, baseline churn, efek target → sample size, durasi, KPI.
- ➕ Menunjukkan kedewasaan metodologi.
- ➖ Kurang menarik sebagai demo utama.
- **Skor: sedang (bagus sebagai pelengkap)**

## Rekomendasi: **SECOND LOOK** = C sebagai inti + A ringkas + B + D ringan

Satu aplikasi dengan 4 layar, urutan sesuai cerita deck:

| # | Layar | Asal opsi | Peran di demo |
|---|---|---|---|
| 1 | **Portfolio X-Ray** | A (ringkas) | 10 detik: "masalahnya di sini" (5 segmen) |
| 2 | **Retention Watchlist** | B | 12 detik: "siapa yang harus diselamatkan sekarang" |
| 3 | **Second Look Check** | C | 25 detik: momen utama, "cegah sebelum terbit" |
| 4 | **Pilot Planner** | D | Opsional; untuk Q&A |

Kalau waktu build sangat terbatas, prioritasnya: **3 → 1 → 2 → 4**.

## Yang sengaja TIDAK dibuat
- Login, multi-user, database server.
- Chatbot/LLM. Tidak menambah bukti dan menambah risiko demo.
- Upload file bebas di panggung (rawan error). Cukup data yang sudah dimuat.
- Rekomendasi otomatis yang "menjanjikan" penurunan churn tertentu.
