# Laporan Modeling SAVERA: pendapatan, demand sparepart, segmentasi pelanggan

> **PENTING: seluruh hasil berasal dari data simulasi (DEMO / SYNTHETIC).** Dataset sintetis; fluktuasi acak mingguan dikecilkan dan komposisi tiket/part per periode diseimbangkan secara sengaja untuk keperluan demonstrasi pipeline (CATATAN_DATASET_V5). Angka di bawah hanya menunjukkan bahwa pipeline berjalan, **bukan** performa bengkel nyata.

> **Penyimpangan dari permintaan: PyCaret TIDAK dipakai.** PyCaret tidak bisa dipasang di lingkungan ini (Python 3.12, PyCaret butuh 3.9-3.11, dan pip tidak punya akses jaringan). Atas persetujuan pengguna, "perbandingan model" dilakukan dengan loop scikit-learn buatan sendiri: 16 regressor (+3 baseline) untuk A/B dan 5 algoritma klaster untuk C. Ini **bukan** `compare_models` PyCaret, dan daftar modelnya bisa berbeda. Karena PyCaret tidak ada, pengecekan "skor model manual setara skor PyCaret" tidak bisa dilakukan; yang dilaporkan adalah selisih antara skor loop perbandingan dan skor model manual `Pipeline` (hasilnya hampir nol karena estimatornya sama; selisih 0,002-0,003 pada demand berasal dari pemotongan prediksi ke >= 0 di loop perbandingan).

## 1. Rancangan
- Seed tetap 20261013. Data dari `dataset_v5.zip`.
- **Pendapatan (A):** jumlah `total_amount` per minggu (Senin) menurut `invoice_date`, Rp juta, 102 minggu penuh (2024-10-14 s/d 2026-09-21). Dilaporkan **mingguan dan bulanan** (bulanan = prediksi mingguan dibagi rata per hari lalu dijumlah per bulan kalender; aktual bulanan dihitung dengan cara yang sama, September 2026 hanya 1-27 September).
- **Demand (B), atas permintaan dimodelkan langsung BULANAN:** `repair_orders` berstatus bukan Cancelled dan `quantity_required > 0`, jumlah unit per bulan kalender per `vehicle_part` menurut `scheduled_date`. 23 bulan penuh (2024-11 s/d 2026-09; Oktober 2024 dibuang karena data baru mulai 7 Oktober) x 8 jenis part = 184 baris, satu model gabungan dengan dummy `vehicle_part`. Hanya **8 dari 12** jenis part yang masuk: Door, Quarter Panel, Roof, dan Trunk selalu punya `quantity_required = 0` sehingga tereliminasi oleh aturan `> 0`. Model mingguan sebelumnya diarsipkan di `arsip_demand_mingguan/`.
- **Fitur:** kolom kalender `external_factors.csv`, dummy `weeks_to_lebaran` -4..2, indeks tren. Untuk demand bulanan, fitur kalender diubah menjadi porsi hari bertanda per bulan (dan jumlah hari kerja per bulan). **Tanpa fitur lag**, sehingga forecast tidak perlu rekursif dan tidak ada target periode yang sama sebagai fitur.
- **Holdout:** pendapatan 12 minggu terakhir (2026-07-06 s/d 2026-09-21); demand 3 bulan terakhir (2026-07 s/d 2026-09, 24 baris). Tidak dipakai untuk perbandingan maupun tuning. CV deret waktu: 5 fold expanding window; uji 8 minggu untuk pendapatan (identik dengan `TimeSeriesSplit(n_splits=5, test_size=8)`) dan uji 2 bulan untuk demand (latih awal 10 bulan).
- **Tuning:** `RandomizedSearchCV`, 30 kombinasi, skor MAE. Pengecualian: Linear Regression tidak punya hiperparameter bermakna (hanya 4 kombinasi `fit_intercept`/`positive`).
- **Walk-forward:** 12 bulan (2025-10 s/d 2026-09). Setiap bulan uji dilatih hanya dengan data (minggu atau bulan) yang sudah selesai sebelum bulan itu, memakai hiperparameter hasil tuning (tidak disetel ulang per bulan).
- **Segmentasi (C):** RFM dari `invoices` (R = hari dari invoice terakhir ke 2026-10-07, F = jumlah invoice, M = total Rp juta), log1p lalu standardisasi.

### Temuan data yang berbeda dari asumsi di permintaan
1. **Fleet dan Insurance punya invoice** (Fleet 728, Insurance 412, Individual 4.930), bukan hanya Individual. Saya tetap mengikuti desain Anda: hanya Individual yang masuk model, Fleet dan Insurance diberi segmen berbasis aturan (dengan R/F/M tetap dilaporkan sebagai informasi). Pendapatan A tetap menjumlah semua invoice.
2. Satu `part_id` bisa muncul pada beberapa `vehicle_part` (sampai 4). Karena itu demand per `part_id` (hanya informasi) dihitung sebagai **total demand x porsi `part_id` dalam total riwayat latih**, bukan porsi di dalam satu `vehicle_part`. Ada 32 `part_id` yang punya demand.
3. 23 pelanggan Individual tidak punya invoice, jadi tidak masuk model (segmen aturan "tanpa transaksi").

## 2. Tugas A: forecast pendapatan mingguan (Rp juta)
### Perbandingan model (CV 5 fold, tanpa holdout), diurutkan MAE
| model | tipe | MAE | RMSE | WAPE | R2 |
|---|---|---|---|---|---|
| Huber | model | 10.34 | 13.96 | 7.45 | 0.63 |
| Linear Regression | model | 11.45 | 14.64 | 8.35 | 0.55 |
| Ridge | model | 11.61 | 14.84 | 8.47 | 0.53 |
| Bayesian Ridge | model | 11.63 | 14.88 | 8.49 | 0.53 |
| Lasso | model | 12.49 | 16.17 | 9.07 | 0.43 |
| MLP | model | 13.15 | 17.38 | 9.42 | 0.39 |
| Extra Trees | model | 15.09 | 19.78 | 10.53 | 0.47 |
| Gradient Boosting | model | 17.02 | 20.84 | 12.08 | 0.27 |
| Elastic Net | model | 17.78 | 22.06 | 12.66 | -0.08 |
| Random Forest | model | 18.53 | 24.31 | 13.25 | 0.18 |
| AdaBoost | model | 20.38 | 24.62 | 14.69 | -0.76 |
| SVR (RBF) | model | 22.22 | 28.84 | 15.71 | -0.06 |
| KNN | model | 24.48 | 33.09 | 16.95 | -0.68 |
| Decision Tree | model | 25.93 | 30.97 | 18.14 | -0.01 |
| Hist Gradient Boosting | model | 28.51 | 37.49 | 19.63 | -1.38 |
| Orthogonal Matching Pursuit | model | 30.11 | 34.62 | 21.18 | -1.88 |
| Seasonal Naive (minggu sama tahun lalu) | baseline | 31.30 | 41.35 | 21.98 |  |
| Rata-rata riwayat | baseline | 35.23 | 43.42 | 24.68 |  |
| Rata-rata 4 minggu terakhir | baseline | 41.71 | 48.89 | 30.21 |  |

Catatan: baris Seasonal Naive hanya dievaluasi pada baris yang punya data tahun lalu.

### 3 model terbaik: sebelum dan sesudah tuning, dan holdout
| model | n_kombinasi | CV MAE (perbandingan) | CV MAE manual (default) | selisih | CV MAE setelah tuning | holdout_MAE | holdout_WAPE_% |
|---|---|---|---|---|---|---|---|
| Huber | 30 | 10.343 | 10.343 | 0.000 | 10.350 | 3.806 | 3.418 |
| Linear Regression | 4 | 11.455 | 11.455 | 0.000 | 11.455 | 6.231 | 5.595 |
| Ridge | 30 | 11.609 | 11.609 | 0.000 | 11.455 | 6.231 | 5.595 |

Parameter sebelum/sesudah:
| model | params_sebelum | params_sesudah |
|---|---|---|
| Huber | {"model__epsilon": 1.35, "model__alpha": 0.0001} | {"model__alpha": 5.5488188527884217e-05, "model__epsilon": 1.3038684138902443} |
| Linear Regression | {"model__fit_intercept": true, "model__positive": false} | {"model__positive": false, "model__fit_intercept": true} |
| Ridge | {"model__alpha": 1.0} | {"model__alpha": 0.0024194520890651575} |

Tuning hampir tidak mengubah apa pun: Huber dan Linear Regression tidak membaik, Ridge hanya turun sedikit. Skor "setelah tuning" dipilih pada fold yang sama sehingga cenderung optimis. Ridge hasil tuning memilih alpha sangat kecil sehingga praktis sama dengan Linear Regression, dan hasil holdout keduanya identik.

### Evaluasi holdout 12 minggu
| model | MAE | RMSE | WAPE | MAPE | Bias_pct | nMAE | nRMSE |
|---|---|---|---|---|---|---|---|
| Huber (manual, tuned) | 3.806 | 4.925 | 3.418 | 3.528 | 1.162 | 3.418 | 4.422 |
| Linear Regression (manual, tuned) | 6.231 | 7.275 | 5.595 | 5.852 | 4.858 | 5.595 | 6.532 |
| Ridge (manual, tuned) | 6.231 | 7.275 | 5.595 | 5.852 | 4.858 | 5.595 | 6.532 |
| Blend rata-rata 3 model | 5.336 | 6.279 | 4.791 | 5.000 | 3.626 | 4.791 | 5.638 |
| Baseline: Rata-rata riwayat | 18.677 | 20.957 | 16.770 | 17.609 | 16.770 | 16.770 | 18.817 |
| Baseline: Rata-rata 4 minggu terakhir | 10.182 | 11.389 | 9.143 | 9.523 | 5.632 | 9.143 | 10.226 |
| Baseline: Seasonal Naive (minggu sama tahun lalu) | 6.221 | 7.405 | 5.585 | 5.453 | -4.673 | 5.585 | 6.649 |

Model ML dipakai: WAPE holdout model ML terbaik menurut CV (Huber) = 3.42% vs baseline terbaik (Seasonal Naive (minggu sama tahun lalu)) = 5.59%; perbaikan relatif 38.8% (syarat minimal 3%). **Model final pendapatan: Huber.**
Pemilihan model ML memakai skor CV setelah tuning; baseline terbaik ditentukan dari WAPE holdout karena baseline tidak punya CV-tuning.
Holdout 12 minggu ini jatuh pada Juli-September 2026 dan **tidak memuat Lebaran maupun akhir tahun**, jadi tidak menguji minggu puncak.

## 3. Tugas B: forecast demand per vehicle_part, BULANAN (unit per bulan)
Target adalah jumlah unit per bulan kalender per vehicle_part. Baseline: rata-rata riwayat, rata-rata 3 bulan terakhir (pengganti "4 minggu" di level bulanan), dan Seasonal Naive (bulan yang sama tahun lalu).
### Perbandingan model (CV 5 fold, uji 2 bulan, tanpa holdout), MAE per baris (part x bulan)
| model | tipe | MAE | RMSE | WAPE | R2 |
|---|---|---|---|---|---|
| Linear Regression | model | 1.49 | 1.91 | 8.08 | 0.93 |
| Bayesian Ridge | model | 1.51 | 1.93 | 8.08 | 0.92 |
| Ridge | model | 1.51 | 1.94 | 8.10 | 0.92 |
| Huber | model | 1.59 | 2.08 | 8.38 | 0.91 |
| MLP | model | 1.68 | 2.04 | 9.05 | 0.90 |
| Extra Trees | model | 2.00 | 2.28 | 10.57 | 0.89 |
| Random Forest | model | 2.35 | 2.70 | 12.45 | 0.84 |
| Gradient Boosting | model | 2.38 | 2.70 | 12.72 | 0.83 |
| SVR (RBF) | model | 2.77 | 3.96 | 14.39 | 0.65 |
| Lasso | model | 2.86 | 3.58 | 15.36 | 0.74 |
| Decision Tree | model | 2.86 | 3.33 | 14.88 | 0.74 |
| AdaBoost | model | 2.97 | 3.70 | 16.36 | 0.72 |
| Elastic Net | model | 3.02 | 3.95 | 16.46 | 0.68 |
| Seasonal Naive (bulan sama tahun lalu) | baseline | 3.12 | 3.58 | 15.55 |  |
| KNN | model | 3.47 | 4.30 | 17.54 | 0.57 |
| Rata-rata riwayat | baseline | 3.59 | 4.07 | 19.99 |  |
| Rata-rata 3 bulan terakhir | baseline | 4.20 | 4.67 | 23.64 |  |
| Orthogonal Matching Pursuit | model | 4.23 | 5.14 | 23.51 | 0.45 |
| Hist Gradient Boosting | model | 5.93 | 7.47 | 33.30 | -0.16 |

Seasonal Naive hanya dievaluasi pada baris yang punya data tahun lalu (64 dari 80).

### 3 model terbaik: sebelum dan sesudah tuning, dan holdout (per part-bulan)
| model | n_kombinasi | CV MAE (perbandingan) | CV MAE manual (default) | selisih | CV MAE setelah tuning | holdout_MAE | holdout_WAPE_% |
|---|---|---|---|---|---|---|---|
| Linear Regression | 4 | 1.490 | 1.490 | 0.000 | 1.490 | 0.780 | 5.031 |
| Bayesian Ridge | 30 | 1.505 | 1.505 | 0.000 | 1.505 | 0.771 | 4.974 |
| Ridge | 30 | 1.508 | 1.508 | 0.000 | 1.490 | 0.780 | 5.031 |

Parameter sebelum/sesudah:
| model | params_sebelum | params_sesudah |
|---|---|---|
| Linear Regression | {"model__fit_intercept": true, "model__positive": false} | {"model__positive": false, "model__fit_intercept": true} |
| Bayesian Ridge | {"model__alpha_1": 1e-06, "model__alpha_2": 1e-06, "model__lambda_1": 1e-06, "model__lambda_2": 1e-06} | {"model__alpha_1": 0.00027691523765846797, "model__alpha_2": 1.317097970742613e-07, "model__lambda_1": 5.370211217981951e-06, "model__lambda_2": 0.0003711256145240025} |
| Ridge | {"model__alpha": 1.0} | {"model__alpha": 0.0024194520890651575} |

Ketiga model terbaik semuanya linear dan hasilnya hampir sama, sehingga **tidak ada keragaman** dan blend tidak menambah apa-apa. Ridge hasil tuning memilih alpha sangat kecil sehingga praktis menjadi Linear Regression; skor CV keduanya hanya beda di desimal ke-5, jadi pemilihan Linear Regression menurut aturan CV adalah keputusan nyaris seri. Model pohon dan boosting kalah pada data sekecil ini (160 baris latih).

### Evaluasi holdout 3 bulan (per vehicle_part-bulan, 24 baris)
| model | MAE | RMSE | WAPE | MAPE | Bias_pct | nMAE | nRMSE |
|---|---|---|---|---|---|---|---|
| Linear Regression (manual, tuned) | 0.780 | 1.077 | 5.031 | 5.182 | 3.669 | 5.031 | 6.951 |
| Bayesian Ridge (manual, tuned) | 0.771 | 1.064 | 4.974 | 5.168 | 3.566 | 4.974 | 6.867 |
| Ridge (manual, tuned) | 0.780 | 1.077 | 5.031 | 5.182 | 3.669 | 5.031 | 6.951 |
| Blend rata-rata 3 model | 0.777 | 1.073 | 5.012 | 5.177 | 3.635 | 5.012 | 6.921 |
| Baseline: Rata-rata riwayat | 2.056 | 2.529 | 13.266 | 15.611 | 11.976 | 13.266 | 16.313 |
| Baseline: Rata-rata 3 bulan terakhir | 1.458 | 1.654 | 9.409 | 10.503 | -1.344 | 9.409 | 10.672 |
| Baseline: Seasonal Naive (bulan sama tahun lalu) | 1.333 | 1.683 | 8.602 | 8.330 | -6.989 | 8.602 | 10.860 |

Level total (jumlah 8 part, hanya 3 titik bulan):
| model | MAE | RMSE | WAPE | Bias_pct |
|---|---|---|---|---|
| Linear Regression (manual, tuned) | 4.550 | 5.504 | 3.669 | 3.669 |
| Bayesian Ridge (manual, tuned) | 4.422 | 5.557 | 3.566 | 3.566 |
| Ridge (manual, tuned) | 4.549 | 5.505 | 3.669 | 3.669 |
| Blend rata-rata 3 model | 4.507 | 5.520 | 3.635 | 3.635 |
| Baseline: Rata-rata riwayat | 15.617 | 19.110 | 12.594 | 11.976 |
| Baseline: Rata-rata 3 bulan terakhir | 10.111 | 12.143 | 8.154 | -1.344 |
| Baseline: Seasonal Naive (bulan sama tahun lalu) | 10.000 | 11.489 | 8.065 | -6.989 |

Model ML dipakai: WAPE holdout model ML terbaik menurut CV (Linear Regression) = 5.03% vs baseline terbaik (Seasonal Naive (bulan sama tahun lalu)) = 8.60%; perbaikan relatif 41.5% (syarat minimal 3%). **Model final demand: Linear Regression.**
Holdout hanya 3 bulan (Juli-September 2026), tidak memuat Lebaran atau akhir tahun, dan sangat sedikit titik; walk-forward 12 bulan di bagian 4 lebih bisa dipercaya.

## 4. Metrik utama model final (walk-forward 12 bulan dan holdout)
| level | cakupan | MAE | RMSE | WAPE | MAPE | Bias_pct | nMAE | nRMSE | n |
|---|---|---|---|---|---|---|---|---|---|
| pendapatan_mingguan | holdout 12 minggu | 3.81 | 4.93 | 3.42 | 3.53 | 1.16 | 3.42 | 4.42 | 12 |
| pendapatan_mingguan | walk-forward 12 bulan | 8.57 | 13.50 | 6.47 | 5.99 | -2.07 | 6.47 | 10.18 | 51 |
| pendapatan_bulanan | walk-forward 12 bulan | 28.03 | 33.83 | 4.92 | 4.71 | -2.18 | 4.92 | 5.93 | 12 |
| demand_bulanan_per_vehicle_part | holdout 3 bulan | 0.78 | 1.08 | 5.03 | 5.18 | 3.67 | 5.03 | 6.95 | 24 |
| demand_bulanan_total | holdout 3 bulan | 4.55 | 5.50 | 3.67 | 3.94 | 3.67 | 3.67 | 4.44 | 3 |
| demand_bulanan_per_part_id (informasi) | walk-forward 12 bulan | 0.40 | 0.50 | 9.06 | 11.36 | -0.10 | 9.06 | 11.33 | 384 |
| demand_bulanan_per_vehicle_part | walk-forward 12 bulan | 1.18 | 1.70 | 6.67 | 6.58 | -0.10 | 6.67 | 9.57 | 96 |
| demand_bulanan_total | walk-forward 12 bulan | 6.43 | 8.24 | 4.53 | 4.23 | -0.10 | 4.53 | 5.80 | 12 |

Level "demand per part_id" hanya informasi (total prediksi x porsi `part_id` dalam riwayat latih). Level demand mingguan tidak lagi dihitung karena demand dimodelkan bulanan. Sebagai catatan, model mingguan lama (diarsipkan) memberi WAPE sekitar 34-37% per vehicle_part-minggu, karena hitungan 1-5 unit per minggu terlalu berisik; pada level bulanan WAPE turun jauh (tabel di atas).

### Galat per bulan (walk-forward)
Pendapatan bulanan:
| periode | aktual | prediksi | galat_pct |
|---|---|---|---|
| 2025-10 | 463.92 | 454.86 | -1.95 |
| 2025-11 | 565.20 | 554.98 | -1.81 |
| 2025-12 | 703.81 | 680.33 | -3.34 |
| 2026-01 | 715.65 | 660.91 | -7.65 |
| 2026-02 | 700.23 | 724.54 | 3.47 |
| 2026-03 | 745.68 | 696.04 | -6.66 |
| 2026-04 | 600.38 | 529.54 | -11.80 |
| 2026-05 | 446.54 | 471.14 | 5.51 |
| 2026-06 | 466.59 | 483.85 | 3.70 |
| 2026-07 | 554.22 | 529.27 | -4.50 |
| 2026-08 | 462.44 | 479.63 | 3.72 |
| 2026-09 | 417.99 | 428.09 | 2.42 |

Demand bulanan: total dan WAPE rata-rata per part (puncak = 1 bila bulan memuat minggu Lebaran, sebelum/sesudahnya, atau akhir tahun):
| periode | aktual | prediksi | galat | abs_galat_pct | puncak | WAPE_per_part |
|---|---|---|---|---|---|---|
| 2025-10 | 115.00 | 116.80 | 1.80 | 1.57 | 0 | 4.74 |
| 2025-11 | 145.00 | 143.96 | -1.04 | 0.72 | 0 | 3.91 |
| 2025-12 | 171.00 | 158.84 | -12.16 | 7.11 | 1 | 8.64 |
| 2026-01 | 175.00 | 163.75 | -11.25 | 6.43 | 1 | 8.40 |
| 2026-02 | 190.00 | 175.06 | -14.94 | 7.86 | 1 | 9.89 |
| 2026-03 | 169.00 | 183.13 | 14.13 | 8.36 | 1 | 10.20 |
| 2026-04 | 140.00 | 142.90 | 2.90 | 2.07 | 1 | 3.09 |
| 2026-05 | 108.00 | 112.59 | 4.59 | 4.25 | 0 | 8.44 |
| 2026-06 | 119.00 | 122.00 | 3.00 | 2.52 | 0 | 5.04 |
| 2026-07 | 140.00 | 140.77 | 0.77 | 0.55 | 0 | 2.66 |
| 2026-08 | 111.00 | 119.33 | 8.33 | 7.50 | 0 | 7.88 |
| 2026-09 | 121.00 | 123.25 | 2.25 | 1.86 | 0 | 4.28 |

### Apakah galat terkumpul di periode puncak?
Pendapatan (mingguan, walk-forward 51 minggu):
| kelompok | n_minggu | MAE | WAPE_pct |
|---|---|---|---|
| minggu biasa | 40 | 7.17 | 6.05 |
| minggu puncak (Lebaran -/+ , akhir tahun) | 11 | 13.68 | 7.45 |

Minggu dengan galat terbesar (pendapatan):
| week_start | y | pred | galat | abs_galat_pct | puncak |
|---|---|---|---|---|---|
| 2026-04-06 | 160.01 | 107.15 | -52.86 | 33.04 | 0 |
| 2026-03-02 | 289.19 | 251.60 | -37.59 | 13.00 | 1 |
| 2026-03-30 | 229.72 | 194.75 | -34.97 | 15.22 | 1 |
| 2026-01-12 | 161.64 | 130.23 | -31.42 | 19.44 | 0 |
| 2026-02-16 | 176.32 | 203.32 | 27.00 | 15.32 | 1 |

Demand (bulanan per vehicle_part, walk-forward 12 bulan):
| puncak | n_bulan | MAE | WAPE_pct |
|---|---|---|---|
| bulan biasa | 7 | 0.78 | 5.11 |
| bulan puncak (memuat minggu Lebaran, sebelum/sesudahnya, atau akhir tahun) | 5 | 1.75 | 8.26 |

Perbandingan ini kasar: pendapatan hanya punya sekitar 11 minggu puncak, demand hanya 5 bulan puncak dari 12. Pada kedua tugas galat absolut dan relatif di periode puncak lebih besar daripada periode biasa.

### Koefisien model final
Pendapatan (Huber, fitur terstandardisasi; `is_lebaran_week` dan `wtl_0` kolinear sehingga koefisiennya berbagi nilai):
| fitur | nilai |
|---|---|
| is_rainy_season | 16.281 |
| wtl_-2 | 13.896 |
| is_pre_lebaran | 12.844 |
| is_year_end | 12.036 |
| wtl_-3 | 11.235 |
| wtl_2 | 9.279 |
| wtl_0 | -4.738 |
| is_lebaran_week | -4.738 |

Demand (Linear Regression):
| fitur | nilai |
|---|---|
| part_Front Bumper Assembly | 4.463 |
| part_Front Grille | -3.012 |
| is_rainy_season | 2.102 |
| part_Hood Assembly | -1.507 |
| part_Rear Bumper Assembly | 1.503 |
| part_Front Fender | -1.341 |
| is_year_end | 1.317 |
| part_Headlamp Assembly | 1.106 |


## 5. Forecast 2026-09-28 s/d 2026-12-28 (14 minggu)
Model final dilatih dengan seluruh data sampai 2026-09-21. Tanpa fitur lag, forecast tidak rekursif. Model linear mengekstrapolasi indeks tren secara linear, dan itu dapat bias jika tren sebenarnya melandai.

**Rentang 80%:** dari kuantil 10% dan 90% galat walk-forward model final (bukan dari holdout). Pendapatan: relatif (aktual/prediksi - 1), dari 51 minggu (mingguan) dan 12 bulan (bulanan). Demand: per vehicle_part memakai galat standar ((aktual - prediksi)/akar(prediksi)) dari 96 part-bulan, dan total bulanan memakai galat relatif dari 12 bulan. Jumlah galatnya sedikit, jadi rentang kasar dan cakupan 80%-nya tidak diverifikasi. Interval tidak memasukkan ketidakpastian struktural di luar pola yang sudah terlihat.

Pendapatan bulanan (Rp juta):
| periode | forecast | lower_80 | upper_80 | model |
|---|---|---|---|---|
| 2026-10 | 489.5 | 472.0 | 529.5 | Huber |
| 2026-11 | 611.3 | 589.4 | 661.3 | Huber |
| 2026-12 | 737.7 | 711.3 | 798.0 | Huber |

Demand bulanan total (unit):
| periode | vehicle_part | forecast | lower_80 | upper_80 | model |
|---|---|---|---|---|---|
| 2026-10 | TOTAL | 126.7 | 118.2 | 136.3 | Linear Regression |
| 2026-11 | TOTAL | 159.6 | 149.0 | 171.7 | Linear Regression |
| 2026-12 | TOTAL | 186.5 | 174.0 | 200.6 | Linear Regression |

Demand bulanan per vehicle_part (unit, titik prakiraan):
| periode | Front Bumper Assembly | Front Fender | Front Grille | Headlamp Assembly | Hood Assembly | Rear Bumper Assembly | Side Mirror Assembly | Windshield |
|---|---|---|---|---|---|---|---|---|
| 2026-10 | 29.1 | 11.8 | 6.8 | 19.2 | 11.4 | 20.4 | 13.6 | 14.4 |
| 2026-11 | 33.2 | 15.9 | 10.9 | 23.3 | 15.5 | 24.5 | 17.8 | 18.5 |
| 2026-12 | 36.6 | 19.3 | 14.2 | 26.7 | 18.9 | 27.9 | 21.1 | 21.9 |

Detail ada di `forecast_pendapatan_mingguan.csv`, `forecast_pendapatan_bulanan.csv`, dan `forecast_demand_bulanan.csv` (termasuk `lower_80`/`upper_80` per vehicle_part). Pendapatan bulanan memakai pembagian per hari dari minggu (Oktober 1-31, Desember 1-31 dengan minggu 2026-12-28 dibagi 4/7 ke Desember); demand bulanan diprediksi langsung per bulan.

## 6. Tugas C: segmentasi pelanggan Individual (N = 1751)
### Perbandingan (parameter default, k terbaik per algoritma, cluster terkecil >= 5%)
| nama | k | silhouette | CH | DB | min_cluster_pct |
|---|---|---|---|---|---|
| K-Means | 4 | 0.421 | 1,554.514 | 0.824 | 12.050 |
| Gaussian Mixture (tambahan) | 4 | 0.396 | 1,417.892 | 0.853 | 13.421 |
| Spectral Clustering | 4 | 0.377 | 1,168.063 | 0.780 | 8.681 |
| Hierarchical (Ward) | 3 | 0.362 | 1,094.752 | 0.951 | 12.393 |
| Birch | 3 | 0.313 | 1,064.967 | 1.043 | 12.164 |

Tabel lengkap k = 3..8 ada di `perbandingan_model_segmentasi.csv`. Birch dan Spectral menghasilkan cluster sangat kecil (< 5%) untuk banyak k. Gaussian Mixture adalah tambahan di luar daftar yang Anda minta.

### Tuning dan stabilitas (10 x 80% data, rata-rata ARI)
| nama | k_sebelum | silhouette_sebelum | k_sesudah | params_sesudah | silhouette_sesudah | stabilitas_ARI_mean | min_cluster_pct | lolos |
|---|---|---|---|---|---|---|---|---|
| K-Means | 4 | 0.421 | 4 | {"init": "k-means++", "n_init": 10} | 0.421 | 0.974 | 12.050 | True |
| Gaussian Mixture (tambahan) | 4 | 0.396 | 4 | {"covariance_type": "spherical"} | 0.419 | 0.920 | 11.936 | True |
| Spectral Clustering | 4 | 0.377 | 4 | {"affinity": "rbf", "gamma": 0.1} | 0.401 | 0.989 | 11.822 | True |

Ketiganya lolos stabilitas >= 0,7. **Model final: K-Means, k = 4** (Silhouette 0.421, stabilitas ARI 0.974, cluster terkecil 12.1%). Silhouette sekitar 0,42 berarti struktur klaster sedang, bukan terpisah tegas; data RFM kontinu sehingga batas antarsegmen bersifat buatan.

### Profil segmen
| segment_id | segment_name | jumlah | persen | R_median | F_median | M_median | jenis |
|---|---|---|---|---|---|---|---|
| 0 | Pendatang Tidak Aktif - Nilai rendah | 476 | 27.2 | 524.5 | 1.0 | 2.3 | model K-Means |
| 1 | Loyal Aktif - Nilai tinggi | 293 | 16.7 | 43.0 | 5.0 | 12.1 | model K-Means |
| 2 | Pendatang Aktif - Nilai rendah | 211 | 12.1 | 46.0 | 1.0 | 2.7 | model K-Means |
| 3 | Reguler Cukup Baru - Nilai menengah | 771 | 44.0 | 218.0 | 3.0 | 6.5 | model K-Means |
| 90 | Individual tanpa transaksi (aturan) | 23 |  |  |  |  | aturan (tidak ikut model) |
| 91 | Fleet (aturan) | 25 |  | 42.0 | 24.0 | 56.6 | aturan (tidak ikut model) |
| 92 | Asuransi (aturan) | 8 |  | 32.0 | 46.5 | 108.3 | aturan (tidak ikut model) |

Arti bisnis:
- **Pendatang Tidak Aktif - Nilai rendah**: Terakhir datang 524 hari lalu (tidak aktif), median 1 invoice (jarang), median belanja Rp2.3 juta (nilai rendah). Datang sedikit dan sudah lama tidak kembali; risiko hilang, biaya promosi harus hemat.
- **Loyal Aktif - Nilai tinggi**: Terakhir datang 43 hari lalu (aktif), median 5 invoice (sering), median belanja Rp12.1 juta (nilai tinggi). Pelanggan setia dan baru berkunjung; prioritas program loyalitas dan perawatan berkala.
- **Pendatang Aktif - Nilai rendah**: Terakhir datang 46 hari lalu (aktif), median 1 invoice (jarang), median belanja Rp2.7 juta (nilai rendah). Baru datang dan baru sedikit transaksi; kandidat pelanggan baru yang perlu dibina agar kembali.
- **Reguler Cukup Baru - Nilai menengah**: Terakhir datang 218 hari lalu (cukup baru), median 3 invoice (sedang), median belanja Rp6.5 juta (nilai menengah). Pelanggan menengah: frekuensi dan nilai belanja di sekitar rata-rata dan terakhir datang cukup lama; sasaran pengingat servis berkala dan promo agar frekuensi naik sebelum mereka menjadi tidak aktif.
- **Individual tanpa transaksi (aturan)**: Segmen berbasis aturan menurut customer_type; RFM hanya informasi.
- **Fleet (aturan)**: Segmen berbasis aturan menurut customer_type; RFM hanya informasi.
- **Asuransi (aturan)**: Segmen berbasis aturan menurut customer_type; RFM hanya informasi.

## 7. Keterbatasan
- **Data sintetis** dan sengaja dibuat mudah diramal; hasil tidak boleh dibaca sebagai performa bengkel nyata.
- **Hanya sekitar 2 siklus musiman** (Lebaran 2025-03-31 dan 2026-03-16; akhir tahun hanya 2024 dan 2025 di dalam data latih, dan hanya 2024 pada asal walk-forward Desember 2025). Dummy `weeks_to_lebaran` untuk Lebaran 2026 dipelajari dari satu siklus saja pada beberapa asal walk-forward.
- **Demand bulanan per vehicle_part hanya 160 baris latih (20 bulan x 8 part)** dengan 27 fitur, rata-rata sekitar 17 unit per part-bulan; holdout hanya 3 bulan. Per `part_id` hanyalah pembagian porsi, bukan model sendiri.
- **Tidak PyCaret:** daftar model dan skor perbandingan bisa berbeda dari PyCaret. Tiga model terbaik untuk A dan B sangat mirip (linear), jadi blend tidak memberi keragaman.
- **Tuning nyaris tanpa efek**, dan skor CV setelah tuning optimis karena dipilih pada fold yang sama.
- Fold awal CV dilatih dengan hanya 50 minggu (pendapatan) atau 10 bulan (demand); Seasonal Naive tidak punya acuan tahun lalu pada sebagian fold awal. Walk-forward demand bulan pertama (2025-10) dilatih dengan 11 bulan.
- Rentang 80% berasal dari 51 minggu / 12 bulan galat walk-forward, kasar dan belum diuji cakupannya.
- Tidak ada hasil yang diperkirakan tanpa dihitung; semua angka di laporan dibaca dari file CSV hasil jalan kode ini.

## 8. Berkas
`perbandingan_model_*.csv`, `hasil_tuning_*.csv`, `evaluasi_holdout_*.csv`, `backtest_bulanan.csv`, `backtest_mingguan_pendapatan.csv`, `arsip_demand_mingguan/` (hasil demand mingguan sebelumnya), `metrik_utama.csv`, `galat_per_minggu_pendapatan.csv`, `galat_per_bulan_demand.csv`, `importance_*.csv`, `forecast_*.csv`, `segmentasi_pelanggan.csv`, `profil_segmen.csv`. Kode: `common.py`, `regresi.py` (pendapatan), `regresi_demand_bulanan.py`, `segmentasi.py`, `buat_laporan.py`, `jalankan_semua.sh`.
