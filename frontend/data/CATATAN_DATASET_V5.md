# Catatan Dataset SAVERA v5 (DEMO / SYNTHETIC)

Semua data sintetis. Dataset ini **sengaja dibuat mudah diramal**; hasil forecast di bawah tidak mencerminkan bengkel nyata.
Cantumkan kalimat ini di laporan: *"Dataset sintetis; fluktuasi acak mingguan dikecilkan dan komposisi tiket/part per periode diseimbangkan secara sengaja untuk keperluan demonstrasi pipeline."*

## Beda dengan v4
- Fluktuasi acak mingguan pada jumlah request: 10% -> 2%.
- Komposisi nilai tiket dan part per minggu/bulan diseimbangkan dengan menukar tanggal antar request (jumlah request per hari, ID, dan semua nilai uang tidak berubah). Batasan dijaga: urutan dan jarak >= 7 hari per kendaraan, jendela waktu persona.
- Pola musiman, persona customer, dan `external_factors.csv` sama dengan v4. Ditambah `paint_materials.csv` (dibuat dari v5).

## Uji walk-forward (12 bulan uji: 2025-10 s/d 2026-09; skrip: uji_forecast_walkforward.py)
Model: Ridge pada log(jumlah mingguan) dengan fitur kalender dari external_factors.csv (+ dummy `weeks_to_lebaran` -4..2) dan tren.
Bulanan = jumlah forecast mingguan; per jenis part dan per part_id = total x porsi riwayat. Latih hanya dengan data sebelum periode uji.
nMAE = MAE / rata-rata aktual (sama dengan WAPE bila digabung); nRMSE = RMSE / rata-rata aktual.

| Level | WAPE % | MAPE % | nMAE % | nRMSE % |
|---|---|---|---|---|
| Total demand bulanan | 3.1 | 3.2 | 3.1 | 4.0 |
| Pendapatan bulanan | 5.7 | 5.5 | 5.7 | 6.5 |
| Total demand mingguan | 3.2 | 3.8 | 3.2 | 3.7 |
| Pendapatan mingguan | 6.8 | 6.5 | 6.8 | 9.9 |
| Per jenis part bulanan | 4.1 | 4.5 | 4.1 | 5.2 |
| Per part_id bulanan | 7.9 | 10.3 | 7.9 | 10.2 |

Tanpa dummy `weeks_to_lebaran` (hanya flag biasa), hasilnya lebih lemah: total demand bulanan 5.9%, total demand mingguan 8.9% (nRMSE 20%).
Per part_id per bulan (rata-rata sekitar 5 unit) mendekati batas data; MAPE dan nRMSE-nya sedikit di atas 10%.
