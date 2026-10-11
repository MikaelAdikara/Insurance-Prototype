# Data

## Data asli (tidak di-commit)
Taruh file data asli di:

```
data/raw/data.xlsx
```

Isi file: 3 sheet, yaitu `policy` (5.000 baris), `customer` (4.704 baris), dan `claim` (17 baris). Kamus data ada di docs/01.

File ini **tidak boleh** masuk git karena repo public dan data asli bersifat privat. `.gitignore` sudah mengecualikan `data/raw/`, `*.xlsx`, dan hasil olahannya.

## Data sintetis (boleh di-commit)
`data/synthetic/` berisi data buatan dengan struktur dan pola agregat yang mirip (dibangkitkan oleh `pipeline/make_synthetic.py`) supaya:
- repo bisa dijalankan orang lain tanpa data asli;
- versi online (kalau di-deploy) tidak membocorkan data asli.

Saat presentasi, gunakan **mode data asli** (lokal, offline).
