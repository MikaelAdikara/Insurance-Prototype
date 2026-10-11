# 03 — Product Spec: SECOND LOOK

> **Bahasa UI = English.** Deskripsi di dokumen ini berbahasa Indonesia, tapi semua teks yang tampil di aplikasi memakai copy di bagian **"UI copy (English)"** paling bawah. Kalau ada label Indonesia di bawah, terjemahkan mengikuti tabel itu.

## Pengguna
| Persona | Kebutuhan | Layar |
|---|---|---|
| **Kepala Retensi / manajemen** | Tahu di mana churn terkonsentrasi dan ke mana anggaran retensi diarahkan | Portfolio X-Ray |
| **Tim retensi / call center** | Daftar polis yang harus dihubungi minggu ini, dengan alasan dan skrip aksi | Retention Watchlist |
| **Agen / underwriting** | Sebelum menerbitkan polis berikutnya: apakah polis ini berisiko dilepas, dan ada alternatif lebih baik? | Second Look Check |
| **Analis / PMO** | Merancang pilot yang bisa membuktikan efek | Pilot Planner |

## Navigasi
Sidebar atau tab atas dengan 4 item. Header: logo teks **SECOND LOOK**, subjudul kecil "Retention Intelligence". Toggle kecil "Data: Asli / Sintetis" (lihat docs/04).

---

## Layar 1 — Portfolio X-Ray

**Tujuan:** dalam 5 detik, audiens melihat bahwa 6% polis = 83% churn.

Komponen:
1. **KPI strip** (4 kartu): Total polis `5.000` · Churn `3,7%` · Polis tambahan `5,9% polis` · Porsi churn dari polis tambahan `82,7%`.
2. **Chart utama:** dua batang 100% berdampingan, "Porsi polis" vs "Porsi churn", diwarnai per segmen S1–S5. S1 berwarna merah/emas, lainnya gradasi indigo/abu.
3. **Tabel segmen** S1–S5: polis, churn, rate (+ Wilson 95% CI), porsi churn, label aksi (badge berwarna).
4. **Panel kecil "Bukan driver"**: gender, status nikah, umur (setelah dikendalikan). Mendukung pesan bahwa segmentasi demografis tidak membantu.

Acceptance:
- Angka sama persis dengan docs/04 tabel reproduksi.
- Klik baris segmen → pindah ke Watchlist dengan filter segmen tersebut.

---

## Layar 2 — Retention Watchlist

**Tujuan:** daftar polis **aktif** (is_churn = False) yang berisiko, diurutkan.

> Catatan: data adalah snapshot. Untuk demo, watchlist menampilkan polis aktif dengan skor tertinggi (polis yang "mirip" dengan yang sudah churn). Polis yang sudah churn bisa ditampilkan lewat filter "Tampilkan yang sudah churn" untuk validasi.

Kolom tabel:
| Kolom | Isi |
|---|---|
| Prioritas | Tinggi / Sedang / Rendah (dari skor) |
| Policy ID | `POL…` |
| Customer ID | `CUST…` (di mode data asli; di mode sintetis ID buatan) |
| Produk · Premi · Cara bayar | ringkas |
| Posisi | "Polis ke-2 dari 3", dst. |
| Skor risiko | % (logistic) |
| Alasan utama | 1–2 *reason codes*, mis. "Polis tambahan", "Bayar bulanan", "Produk sama dengan polis pertama", "PA single premium" |
| Aksi disarankan | dari playbook (lihat di bawah) |

Fitur:
- Filter: segmen, produk, cara bayar, prioritas.
- Klik baris → **panel detail**: semua polis milik nasabah ini dalam bentuk timeline mini (polis 1, 2, 3 …), status masing-masing, alasan, aksi, dan skrip singkat untuk call center.
- Tombol **Ekspor CSV** (daftar kontak minggu ini).

Playbook aksi (mapping reason → aksi):
| Kondisi | Aksi |
|---|---|
| Polis tambahan + bulanan | Tawarkan pindah ke autodebet/tahunan; opsi konsolidasi ke polis utama |
| Polis tambahan + produk sama | Review kebutuhan: gabungkan sebagai top-up/rider di polis utama |
| PA single premium | Pengingat renewal H-30, perpanjangan sekali klik |
| Polis utama nasabah multi-polis | Pantau; hubungi bila ada polis lain milik nasabah yang dilepas |
| Inti (S4/S5) | **Jangan dikontak** oleh program retensi |

Acceptance:
- Urutan default: skor menurun.
- Reason codes konsisten dengan fitur yang benar-benar dimiliki polis (bukan dari SHAP acak).
- Ekspor CSV hanya berisi baris yang sedang terfilter.

---

## Layar 3 — Second Look Check ⭐ (inti demo)

**Tujuan:** agen memasukkan rencana polis berikutnya dan langsung melihat risiko + alternatif.

### Input (panel kiri)
**A. Nasabah** (pilih salah satu):
- *Pilih nasabah yang ada* (dropdown/search `customer_id`, di mode sintetis daftar contoh), **atau**
- *Isi manual*: jumlah polis yang sudah dimiliki (1–8), produk polis pertama, cara bayar polis pertama.

**B. Rencana polis baru:**
- Produk: Life / CI / CIROP / PA
- Premi: 5 kategori
- Cara bayar: Bulanan / Kuartalan / Semesteran / Tahunan / Sekaligus

### Output (panel kanan), update instan setiap input berubah
1. **Gauge/angka besar:** "Risiko polis ini dilepas: **xx%**" + label Tinggi/Sedang/Rendah.
2. **Kenapa:** 2–3 reason chips (mis. "Polis tambahan", "Bayar bulanan", "Produk sama dengan polis yang sudah dimiliki").
3. **Alternatif yang lebih aman** (kartu-kartu, diurutkan dari risiko terendah). Setiap kartu menampilkan skor hasil simulasi:
   - "Top-up / rider di polis yang sudah ada" (tidak menerbitkan polis baru → risiko polis baru = n/a; tampilkan "menghindari polis tambahan")
   - "Polis baru dengan pembayaran tahunan" → skor
   - "Polis baru dengan autodebet bulanan" → tampilkan skor bulanan + catatan "autodebet belum ada di data; efek diuji di pilot"
   - "Produk berbeda (melengkapi, bukan menduplikasi)" → skor
4. **Disclaimer kecil** (wajib): *"Estimasi berbasis pola historis portofolio, bukan efek kausal. Efek sebenarnya diukur lewat pilot."*
5. Tombol **"Catat keputusan"** → menambahkan baris ke log sesi (untuk menunjukkan alur kerja; tidak perlu persisten).

### Contoh skenario demo yang harus bekerja
| Skenario | Input | Ekspektasi |
|---|---|---|
| Berisiko (**preset "Pak Andi"**) | Nasabah punya 1 polis Life (bayar bulanan; di data, polis pertama nasabah seperti ini mayoritas bulanan); rencana: Life, <250K, Bulanan | Risiko **tinggi** (profil ini di data: 62 dari 72 berhenti); reason: extra policy, pays monthly, same product; alternatif teratas: top-up |
| Lebih aman | Sama, tapi cara bayar Tahunan | Risiko turun ke **rendah** |
| Polis pertama | Nasabah baru (0 polis); rencana: Life, <250K, Bulanan | Risiko **rendah** (polis utama) |
| PA | Rencana: PA, <250K, Sekaligus (polis pertama) | Risiko **sedang** (~13%), reason: PA single premium → saran renewal otomatis |

Acceptance:
- Respons < 100 ms (skor dihitung di browser dari koefisien model).
- Skor untuk kombinasi yang tidak pernah ada di data (mis. PA bulanan) ditandai "Kombinasi tidak ada di data historis, estimasi kurang andal".

---

## Layar 4 — Pilot Planner (opsional)

Input: segmen (default S1 bulanan), baseline churn (default dari data, 70,8%), target penurunan (pp), α (0,05), power (0,8), alokasi (50/50), estimasi polis tambahan baru per bulan (input bebas, default 50).
Output: n per kelompok, total, estimasi durasi pilot (bulan), KPI utama & KPI pengaman, desain acak (per agen/cabang).

Rumus: two-proportion z-test, n per arm = (z_{1-α/2} + z_{1-β})² · [p1(1−p1) + p2(1−p2)] / (p1 − p2)².
Acceptance: baseline 0,708, target −10 pp → **350**; −15 pp → **159**; PA 0,135 → 0,085 → **611**.

---

## Non-fungsional
- Berjalan **offline** dari folder build statis (dibuka lewat `npx serve` atau langsung `index.html`).
- Tampilan proyektor: font minimal 16px, kontras tinggi, layout 16:9 tanpa scroll horizontal di 1920×1080 dan 1366×768.
- Palet: indigo `#2E2A6B`, emas `#E3A72F`, merah `#D64545` (hanya risiko tinggi), netral `#6B7280`/`#E5E7EB`, background `#FFFFFF`/`#F7F6FB`. Font: Montserrat (judul), Inter (teks).
- Semua angka dalam format Inggris (titik desimal, koma ribuan), mata uang "Rp".

---

## UI copy (English)

Prinsip: bahasa sederhana untuk audiens yang bukan orang asuransi. Hindari "lapse", "issue", "persistency" di layar utama.

| Konsep | Copy di UI |
|---|---|
| Nama app | **SECOND LOOK** · subtitle *Retention Intelligence* |
| Tab | `Portfolio X-Ray` · `Retention Watchlist` · `Second Look Check` · `Pilot Planner` |
| Churn | `stopped` / `stop rate` (tooltip: "a policy that was cancelled or not continued") |
| Polis tambahan | `second-or-later policy` (singkat: `extra policy`) |
| Polis utama | `first policy` |
| KPI strip | `Policies` · `Stop rate` · `Extra policies (share of book)` · `Share of all stops from extra policies` |
| Segmen | S1 `Extra policies` · S2 `Personal Accident (first policy)` · S3 `First policy, multi-policy customer` · S4 `Single-policy, pays monthly` · S5 `Single-policy, other payment` |
| Label aksi | `PREVENT & RESCUE` · `FIX RENEWAL` · `WATCH` · `LIGHT NUDGE` · `PROTECT: DON'T DISTURB` |
| Panel bukan driver | `Not drivers: gender, marital status, age (once other factors are controlled)` |
| Reason codes | `Extra policy` · `Pays monthly` · `Same product as first policy` · `Personal Accident, single payment` · `Customer holds 3+ policies` |
| Playbook | `Offer auto-debit or annual payment; option to merge into main policy` · `Needs review: add as top-up/rider on existing policy` · `Renewal reminder 30 days before; one-click renewal` · `Watch; contact if another policy of this customer stops` · `Do not contact in retention campaigns` |
| Second Look: judul | `Before you sell the next policy` |
| Second Look: input | `Customer` (`Choose existing` / `Enter manually`: `Policies already held`, `First policy product`, `First policy payment`) · `Planned policy` (`Product`, `Premium band`, `Payment`) · preset button `Load demo: Pak Andi` |
| Second Look: output | `Chance this policy gets cancelled: xx%` + band `High` / `Medium` / `Low` · `Why` · `Safer alternatives` |
| Alternatif | `Top-up / rider on existing policy (no new policy)` · `New policy, paid annually` · `New policy, monthly with auto-debit` · `Different product (complements, not duplicates)` |
| Kombinasi tak pernah ada | `This combination doesn't appear in historical data; estimate is less reliable.` |
| Disclaimer | `Estimate based on historical patterns, not a proven effect. To be tested in a pilot.` |
| Tombol | `Log decision` · `Export CSV` · `Show stopped policies` |
| Pilot Planner | `Target group` · `Current stop rate` · `Target reduction (points)` · `Significance` · `Power` · `New extra policies per month` → `Policies needed per group` · `Estimated pilot length` |
