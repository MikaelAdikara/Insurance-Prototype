# SECOND LOOK: Retention Prototype

Prototype (MVP) analitik retensi untuk portofolio asuransi jiwa.
Case: churn polis di portofolio asuransi jiwa.

> **Status:** MVP jalan. Pipeline Python + 5 layar (Portfolio X-Ray dengan konstelasi 3D, Retention Watchlist, Second Look Check, Campaign Simulator, Pilot Planner) + asisten offline "Ask SECOND LOOK". Shortcut: `1`–`5` pindah layar, `/` buka asisten. Build = satu file `app/dist/index.html` yang bisa dibuka offline.

## Satu kalimat
SECOND LOOK membantu perusahaan asuransi **mencegah churn di titik jual polis berikutnya**, sekaligus memberi tim retensi daftar polis berisiko lengkap dengan alasan dan aksi yang disarankan.

## Kenapa produk ini
Analisis tim menemukan bahwa polis **tambahan** (polis ke-2, ke-3, … milik nasabah yang sama) hanya 6% portofolio tapi menyumbang **83% churn**. Polis tambahan yang dibayar **bulanan** churn 71%, yang dibayar **tahunan** 0%. Jadi momen paling murah untuk bertindak adalah **sebelum polis tambahan terbit**. Detail di [docs/01_CONTEXT.md](docs/01_CONTEXT.md).

## Cara menjalankan

```bash
pip install pandas openpyxl scikit-learn statsmodels scipy pytest
# data asli (lokal saja): taruh di data/raw/data.xlsx
python pipeline/build.py              # -> app/src/data/real/   (gitignored)
python pipeline/make_synthetic.py     # -> data/synthetic/*.csv (butuh data asli)
python pipeline/build.py --synthetic  # -> app/src/data/synthetic/
python -m pytest -q pipeline/tests    # angka reproduksi docs/04 §5 + test anti join-per-posisi

cd app
npm install
npm run dev      # development
npm run build    # -> app/dist/index.html, buka langsung (double-click), tanpa internet
```

Tanpa data asli, repo tetap jalan pakai data sintetis yang sudah di-commit (toggle **Data: Real / Synthetic** di kanan atas; Real nonaktif kalau `app/src/data/real/` tidak ada).

## Hasil (data asli)
| Cek | Hasil |
|---|---|
| Polis / nasabah / churn | 5,000 / 4,704 / 185 |
| S1–S5 (n, churn) | (296,153) (126,17) (185,2) (2,721,12) (1,672,1) |
| Aturan satu baris | 340 ditandai, 170 tertangkap |
| Logistic L2, 5-fold OOF | AUC 0.964 · PR-AUC 0.761 · top 10% menangkap 92% churn |
| Pak Andi (Life, <250K, bulanan, polis ke-2) | 76% High → bayar tahunan 4% Low |
| Pilot | 350 / 159 / 611 per kelompok |

Contoh demo Watchlist: **POL004016 / CUST001175**. Keputusan teknis: [docs/DECISIONS.md](docs/DECISIONS.md).

## Urutan baca
| File | Isi |
|---|---|
| [CLAUDE.md](CLAUDE.md) | **Mulai di sini kalau kamu yang akan membangun.** Aturan kerja & batasan |
| [docs/01_CONTEXT.md](docs/01_CONTEXT.md) | Konteks case, data, temuan kunci beserta angkanya |
| [docs/02_MVP_OPTIONS.md](docs/02_MVP_OPTIONS.md) | Opsi MVP yang dipertimbangkan dan alasan memilih SECOND LOOK |
| [docs/03_PRODUCT_SPEC.md](docs/03_PRODUCT_SPEC.md) | Layar, fitur, user story, acceptance criteria |
| [docs/04_DATA_AND_MODEL.md](docs/04_DATA_AND_MODEL.md) | Pipeline data, fitur, model, aturan, skema JSON, angka yang harus tereproduksi |
| [docs/05_DEMO_SCRIPT.md](docs/05_DEMO_SCRIPT.md) | Skrip demo 60 detik di panggung + rencana cadangan |
| [docs/06_BUILD_PLAN.md](docs/06_BUILD_PLAN.md) | Stack, struktur folder, milestone, definition of done |

## Data
Data asli (`data.xlsx`) **tidak** di-commit ke repo ini (repo public). Lihat [data/README.md](data/README.md).
