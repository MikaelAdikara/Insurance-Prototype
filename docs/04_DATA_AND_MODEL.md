# 04 — Data Pipeline & Model

## Alur
```
data/raw/data.xlsx
   └─ pipeline/build.py
        1. load 3 sheet
        2. validate (schema, key, join)          → gagal = stop
        3. join policy ⟵ customer ON customer_id (left, validate="many_to_one")
        4. feature engineering (level polis)
        5. segmentasi S1–S5 + aturan satu baris
        6. fit logistic (L2) + evaluasi 5-fold OOF
        7. export JSON untuk frontend
   └─ app/public/data/real/*.json   (gitignored)

pipeline/make_synthetic.py → data/synthetic/*.csv → build.py --synthetic → app/public/data/synthetic/*.json (boleh di-commit)
```

## 1. Validasi (wajib, dengan test)
- `policy.policy_id` unik; `customer.customer_id` unik.
- Setiap `policy.customer_id` ada di `customer` (harus 100%).
- Setelah join: 5.000 baris, 0 missing di `age`, `gender`, `tenure`, `marital_status`.
- `is_churn` sum = 185.
- **Anti-regresi:** test yang gagal kalau join dilakukan berdasarkan posisi (mis. cek bahwa `CUST007264` mendapat `tenure` miliknya sendiri, bukan milik `CUST030335`).

## 2. Fitur (level polis)
| Fitur | Definisi | Dipakai di model? |
|---|---|---|
| `pol_seq` | urutan polis dalam satu nasabah, berdasarkan angka di `policy_id` (rank naik, method="first") | turunan |
| `is_added` | `pol_seq > 1` | ✅ |
| `n_pol` | jumlah polis nasabah | ✅ (sebagai `n_pol_gt2` = n_pol > 2) |
| `same_as_first` | `insurance_type` polis ini == `insurance_type` polis pertama nasabah (False untuk polis pertama) | ✅ |
| `insurance_type` | one-hot (ref: Life) | ✅ |
| `premium` | one-hot (ref: <250K) | ✅ |
| `payment_frequency` | one-hot (ref: ANNUALLY). QUARTERLY & SEMESTER boleh digabung jadi `OTHER_INSTALLMENT` | ✅ |
| `is_added × monthly` | interaksi | ✅ |
| `age`, `gender`, `marital_status` | demografi | ❌ (tidak signifikan, dan menghindari isu fairness) |
| `tenure` | berpotensi bocor / proxy | ❌ (tampilkan deskriptif saja) |
| `occupation`, klaim | artefak / n kecil | ❌ |

Di Second Look Check, fitur dihitung dari input form:
- `is_added` = jumlah polis yang sudah dimiliki ≥ 1
- `n_pol_gt2` = (polis yang dimiliki + 1) > 2
- `same_as_first` = produk rencana == produk polis pertama

## 3. Model
- `sklearn.linear_model.LogisticRegression(penalty="l2", C=1.0, max_iter=5000)` pada fitur di atas (tanpa scaling untuk one-hot; tidak ada fitur kontinu).
- Separasi hampir sempurna (mis. polis tambahan tahunan = 0 churn) → **wajib** regularisasi L2 agar koefisien tetap terbatas.
- Evaluasi: StratifiedKFold(5, shuffle=True, random_state=42), OOF ROC-AUC, PR-AUC, Brier, capture top 10%.
- Fit final di seluruh data → export koefisien.
- Kategori risiko untuk UI: Tinggi ≥ 30% · Sedang 5–30% · Rendah < 5% (boleh disesuaikan; catat di DECISIONS.md).
- Reason codes: ambil kontribusi `coef × x` positif terbesar (maks 3), dipetakan ke label Indonesia.

Opsional: bandingkan dengan HistGradientBoosting di notebook/pipeline untuk laporan, tapi **frontend memakai logistic**.

## 4. Export JSON (kontrak frontend)

`model.json`
```json
{
  "version": "2026-10-xx",
  "intercept": -5.1,
  "coef": {"is_added": 3.2, "n_pol_gt2": 0.8, "same_as_first": 0.5,
           "type_CI": 0.1, "type_CIROP": 0.2, "type_PA": 2.9,
           "prem_250K-500K": -0.6, "prem_500K-1M": -1.0, "prem_1M-3M": -0.3, "prem_>3M": -0.5,
           "pay_MONTHLY": 1.7, "pay_SINGLEPREMIUM": 1.0, "pay_OTHER_INSTALLMENT": -0.5,
           "added_x_monthly": 1.4},
  "reason_labels": {"is_added": "Polis tambahan", "pay_MONTHLY": "Bayar bulanan", "...": "..."},
  "risk_bands": {"high": 0.30, "medium": 0.05},
  "metrics": {"oof_auc": 0.0, "oof_pr_auc": 0.0, "brier": 0.0, "top10_capture": 0.0},
  "unseen_combos": [["PA", "MONTHLY"], ["...", "..."]]
}
```
*(angka koefisien di atas hanya contoh bentuk, bukan hasil)*

`segments.json`: array S1–S5 `{code, name, n, churn, rate, ci_low, ci_high, share_policies, share_churn, action}` + KPI strip.

`watchlist.json`: array polis `{policy_id, customer_id, segment, insurance_type, premium, payment_frequency, pol_seq, n_pol, same_as_first, is_churn, score, priority, reasons[], action}`.

`customers_index.json`: untuk dropdown Second Look `{customer_id, n_pol, first_type, first_payment}`.

`pilot_defaults.json`: baseline per segmen.

## 5. Angka yang harus tereproduksi (test)
| Metrik | Nilai |
|---|---|
| Polis / nasabah / churn | 5.000 / 4.704 / 185 |
| Polis tambahan | 296 polis, 153 churn |
| Polis utama | 4.704 polis, 32 churn |
| Tambahan × bulanan | 195 polis, 138 churn |
| Tambahan × tahunan | 80 polis, 0 churn |
| Tambahan, produk sama | 159 polis, rate 0,642 |
| S1 / S2 / S3 / S4 / S5 (n, churn) | (296,153) / (126,17) / (185,2) / (2.721,12) / (1.672,1) |
| Aturan satu baris | 340 ditandai, 170 churner tertangkap |
| OOF AUC logistic (fitur portofolio, tanpa tenure) | ≈ 0,96–0,97 (cek cepat: 0,969 dengan set fitur sedikit berbeda) |
| Sample size pilot | 350 / 159 / 611 |

## 6. Mode data
| Mode | Sumber | Dipakai untuk |
|---|---|---|
| **Asli** | `data/raw/data.xlsx` (lokal) | Presentasi & rekaman demo |
| **Sintetis** | `data/synthetic/` dari `make_synthetic.py` | Repo public, deploy online, development tanpa data asli |

Generator sintetis: bangkitkan ±5.000 polis dengan distribusi marginal produk/premi/cara bayar dan **rate churn per sel (segmen × cara bayar × produk)** mengikuti tabel di docs/01, ID baru (`SYN-POL-xxxxx`), tanpa menyalin baris asli. Pipeline yang sama harus bisa berjalan di kedua mode.
