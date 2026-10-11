# 01 — Konteks Case & Temuan

## Case
Perusahaan asuransi jiwa ingin memahami churn polis dan meresponsnya **secara tertarget**. Analisis diposisikan sebagai tim data analytics untuk manajemen. Audiens: kombinasi akademisi statistika dan praktisi asuransi. Model performance **bukan** fokus utama; yang penting adalah insight, kekuatan bukti, prioritas bisnis, dan rekomendasi yang actionable.

Empat pertanyaan analisis:
1. Memahami lanskap churn
2. Dari pola ke prioritas bisnis
3. Menguji faktor yang berasosiasi dengan churn (kekuatan bukti, keterbatasan, bukan kausal)
4. Strategi retensi: aksi apa, untuk siapa

MVP ini adalah bagian dari jawaban **pertanyaan 4**: bukti bahwa rekomendasi bisa dijalankan.

## Data (`data.xlsx`)

| Sheet | Baris | Kolom |
|---|---|---|
| `policy` | 5.000 | `policy_id`, `customer_id`, `insurance_type` (PA, Life, CI, CIROP), `premium` (kategori: <250K, 250K-500K, 500K-1M, 1M-3M, >3M), `payment_frequency` (SINGLEPREMIUM, ANNUALLY, MONTHLY, SEMESTER, QUARTERLY), `is_churn` (bool) |
| `customer` | 4.704 | `customer_id`, `age`, `occupation` (95,8% kosong), `gender`, `tenure` (dictionary: "total hari"; nilainya bilangan bulat + 0,6296), `marital_status` (bool) |
| `claim` | 17 | `claim_id`, `customer_id`, `claim_processing_days`, `claim_amount` (kategori); hanya 7 nasabah |

Kode produk: PA = Personal Accident, Life = Jiwa, CI = Critical Illness, CIROP = Critical Illness + Return of Premium.

## Jebakan data (wajib dibaca)
1. **Join per `customer_id`, bukan per posisi baris.** Urutan baris di sheet `policy` dan `customer` berbeda. Menempelkan kolom berdasarkan posisi hanya cocok di 0,04% baris.
2. Tidak ada duplikat di `policy`. n = 5.000 polis, churn = 185 (3,7%).
3. **Polis tambahan** tidak ada sebagai kolom. Didefinisikan sebagai: urutkan polis milik satu nasabah berdasarkan nomor di `policy_id` (`POL000123` → 123); polis dengan urutan > 1 adalah polis tambahan.
4. PA **selalu** SINGLEPREMIUM dan **selalu** <250K. Ketiganya tidak bisa dipisahkan.
5. `tenure` hampir identik dengan status multi-polis (tenure > 60 → 98% multi-polis) dan berpotensi bocor. **Jangan pakai tenure di model produk.** Boleh ditampilkan deskriptif.
6. `occupation` yang terisi berkorelasi dengan churn (19,7% vs 3,0%), tapi kemungkinan artefak pencatatan. Jangan dipakai di model.
7. Klaim hanya 7 nasabah. Jangan dipakai di model.

## Temuan kunci (angka sudah dicek dari data)

| Temuan | Angka |
|---|---|
| Churn portofolio | 185 / 5.000 = **3,7%** |
| Polis tambahan | 296 polis (5,9%) → 153 churn (**51,7%**), **82,7%** dari semua churn |
| Polis utama | 4.704 polis → 32 churn (**0,7%**) |
| Polis tambahan × cara bayar | bulanan 138/195 (**70,8%**) · tahunan **0/80** · single premium 15/19 · kuartalan 0/2 |
| Polis tambahan × produk | CI 39,8% · CIROP 32,4% · Life 61,9% · PA 88,2% |
| Polis tambahan × premi | <250K 67,3% · lainnya 10–28% |
| Polis tambahan, produk sama dengan polis pertama | 64,2% vs berbeda 37,2% |
| PA sebagai polis utama | 17/126 = **13,5%** |
| Polis utama non-PA ("inti") | 15/4.578 = **0,3%** |
| Gender, status nikah | tidak berbeda (p = 0,78; 0,25) |
| Umur | kelompok 26–35 tahun 5,9%, tapi tidak signifikan setelah dikendalikan (logit p = 0,18) |

### 5 segmen prioritas (saling lepas, menjumlah 5.000)
| Kode | Definisi | Polis | Churn | Rate | Porsi churn | Aksi |
|---|---|---|---|---|---|---|
| S1 | Polis tambahan | 296 | 153 | 51,7% | 82,7% | CEGAH & SELAMATKAN |
| S2 | Polis utama, PA | 126 | 17 | 13,5% | 9,2% | PERBAIKI RENEWAL |
| S3 | Polis utama milik nasabah multi-polis (non-PA) | 185 | 2 | 1,1% | 1,1% | PANTAU |
| S4 | Single-polis, bayar bulanan (non-PA) | 2.721 | 12 | 0,4% | 6,5% | NUDGE RINGAN |
| S5 | Single-polis, non-bulanan (non-PA) | 1.672 | 1 | 0,1% | 0,5% | JAGA |

Urutan penentuan segmen: (1) polis tambahan → S1; (2) PA → S2; (3) nasabah multi-polis → S3; (4) bulanan → S4; (5) sisanya → S5.

### Aturan satu baris
`flag = (polis_tambahan AND payment_frequency IN {MONTHLY, SINGLEPREMIUM}) OR (polis_utama AND insurance_type == PA)`
→ menandai **340 polis (6,8%)**, menangkap **170 dari 185 churner (91,9%)**, presisi **50%**.

### Model (cek cepat, 5-fold stratified OOF, seed 42)
| Fitur | Logistic AUC | HistGB AUC |
|---|---|---|
| Atribut polis saja | 0,762 | 0,774 |
| + demografi | 0,788 | 0,852 |
| + struktur portofolio (polis tambahan, jumlah polis), tanpa tenure | **0,969** | 0,968 |

Pesan untuk demo: model sederhana (logistic) sudah cukup → bisa dijalankan di browser.

## Strategi yang didukung MVP (dari deck)
1. **CEGAH di titik jual polis berikutnya** (fokus utama MVP): sebelum polis tambahan terbit, cek risikonya. Kalau produk sama → tawarkan top-up/rider di polis yang ada. Kalau tetap polis baru → arahkan ke tahunan/autodebet.
2. **SELAMATKAN** polis tambahan aktif yang berisiko: pengingat, konsolidasi, turun manfaat.
3. **PERBAIKI RENEWAL PA.**
4. **JAGA** nasabah inti: tidak dikontak program retensi.
5. Semua diuji lewat **pilot A/B** (±350 polis per kelompok untuk mendeteksi penurunan 10 pp di polis tambahan bulanan).
