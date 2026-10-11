# 06 — Build Plan

## Stack (rekomendasi)
| Bagian | Pilihan | Alasan |
|---|---|---|
| Pipeline | Python 3.11+, pandas, openpyxl, scikit-learn, pytest | Sama dengan ekosistem analisis |
| Frontend | **Vite + React + TypeScript**, Recharts (chart), CSS sederhana / Tailwind | Build statis, offline, cepat dikembangkan |
| Scoring | Logistic dihitung di browser dari `model.json` | Respons instan, tanpa server |
| Hosting (opsional) | Vercel / GitHub Pages **hanya mode sintetis** | Repo public, data asli tidak boleh online |

Alternatif kalau tim lebih nyaman Python saja: Streamlit. Konsekuensinya: butuh Python di laptop presentasi dan startup lebih lambat. Kalau memilih ini, catat di `docs/DECISIONS.md`.

## Struktur folder target
```
Insurance-Prototype/
├── CLAUDE.md
├── README.md
├── docs/
│   ├── 01_CONTEXT.md … 06_BUILD_PLAN.md
│   └── DECISIONS.md
├── data/
│   ├── README.md
│   ├── raw/            (gitignored: data.xlsx)
│   └── synthetic/      (committed)
├── pipeline/
│   ├── build.py
│   ├── features.py
│   ├── segments.py
│   ├── model.py
│   ├── make_synthetic.py
│   └── tests/test_pipeline.py
└── app/
    ├── index.html
    ├── src/
    │   ├── pages/ (XRay, Watchlist, SecondLook, PilotPlanner)
    │   ├── lib/score.ts, format.ts, sampleSize.ts
    │   └── components/
    └── public/data/{real (gitignored), synthetic}/
```

## Milestone
| # | Milestone | Isi | Selesai jika |
|---|---|---|---|
| M1 | Pipeline & validasi | load, validate, join, fitur, segmen, aturan | Test angka reproduksi (docs/04 §5) lulus |
| M2 | Model & export | logistic, OOF metrics, JSON | `model.json` + metrics tercetak; AUC ≈ 0,96–0,97 |
| M3 | Second Look Check | layar 3 penuh + 4 skenario | Skenario di docs/03 menghasilkan band risiko yang benar |
| M4 | Portfolio X-Ray | layar 1 | Angka cocok dengan deck |
| M5 | Watchlist | layar 2 + panel detail + ekspor | Filter & ekspor jalan |
| M6 | Pilot Planner | layar 4 | 350 / 159 / 611 tereproduksi |
| M7 | Sintetis & polish | data sintetis, mode toggle, tampilan proyektor, README + screenshot | Build statis berjalan offline |

Urutan prioritas jika waktu sempit: M1 → M2 → M3 → M4 → M7 → M5 → M6.

## Definition of done
- [ ] `python pipeline/build.py` (mode asli) dan `--synthetic` berjalan tanpa error
- [ ] `pytest` lulus, termasuk test anti join-per-posisi
- [ ] `npm run build` menghasilkan `app/dist/` yang jalan offline
- [ ] 4 skenario Second Look sesuai ekspektasi
- [ ] Tidak ada data asli di git history (`git log --stat` dicek)
- [ ] README berisi cara menjalankan + 3 screenshot (mode sintetis)
