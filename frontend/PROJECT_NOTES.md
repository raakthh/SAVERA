# SAVERA — PROJECT_NOTES

## (a) Ringkasan

**Stack.** Vanilla JS (tanpa framework/bundler), HTML string + `innerHTML`, Chart.js 4.4.0 (CDN), IBM Plex Sans/Mono, satu `styles.css`. Tiap file = IIFE yang **meng-override** fungsi global `app.js` (`renderShell`, `renderContent`, `handleNav`, `attachLoginEvents`) dan objek bersama `window.SAVERA_V2` (`VIEWS`, `ACT`, `NAV`, `W`). Routing: `state.view` → `VIEWS[view]()` → `window.after_<view>()`. Tombol: `data-act` → `ACT[nama](id)`; navigasi: `data-nav`.

**Cara membuka app (keputusan: server lokal).** Di folder frontend: `python3 -m http.server 8000` → buka `http://localhost:8000`. (file:// juga jalan karena data dimuat sebagai `.js`, bukan `fetch`.) Chart.js & font dari CDN → butuh internet.
Setelah dataset/hasil model berubah: `python3 tools/build_data.py` (menulis ulang `data/savera-dataset.js` + `data/savera-model-results.js`).

**Urutan load (index.html):** `app.js` → `savera-data*.js` (data demo LAMA, halaman operasional) → `savera-assessment-core.js` → `savera-cv-adapter.js` → `savera-assessment-mock.js` → `savera-v2.js` → `savera-i18n.js` → `savera-review.js` → `savera-customer.js` → `savera-workshop.js` → `savera-photo-viewer.js` → `savera-findings.js` → `savera-costing.js` → `savera-decision.js` → `savera-invoice.js` → `savera-documents.js` → `savera-insights.js` → `savera-stock-forecast.js` → **Tahap 7–8:** `data/savera-dataset.js` → `data/savera-model-results.js` → `savera-analytics-core.js` → `savera-api.js` → `savera-analytics-ui.js` → `savera-demand-forecast.js` → `savera-analytics.js`.
Arsip (tidak dimuat): `arsip/index_lama.html`, `arsip/assessment_lama.js`, `arsip/SAVERA_DB_bentuk.json`. Tes: `tests/` (Node, tanpa dependensi). Hasil model mentah: `modeling/` (salinan folder hasil tim model + `forecast_demand_bulanan_per_part_id.csv`).

**Design system** (`:root`): navy `--navy-900`, cyan `--cyan-500`, ink `--ink-*`, `--ok/--warn/--bad(-bg)`, radius 6/10/16, `--font-ui/--font-mono`. Komponen dipakai ulang: `.card`, `.btn-*`, `.badge-*`, `.field/.input/.select`, `.table-wrap`, `.banner`, `.empty-state`, `.modal-*`, `.summary-row`, `.img-stage/.bbox`, `.tab-bar/.tab-btn`, `.toggle`, `.stat-card`, `.sv-chip`, `.report-doc…`, `.no-print`. CSS baru (akhir `styles.css`): `.pv-*` viewer, `.fd-*` temuan, `.ct-*` biaya, `.st-*` stepper, `.dc-*` keputusan, `.doc-*` dokumen, **`.an-*` Analytics** (tab, skeleton loading, tooltip info `.an-tip` hover+fokus, menu Export `<details>`, segmented control, kartu segmen). Warna grafik: aktual cyan `#13A8C4`, forecast oranye putus-putus + rentang 80% oranye transparan, rata-rata bergerak navy, terpakai abu putus-putus, status "≤ ROP" merah `--bad` (selalu dengan label).

**Model CV.** Klasifikasi gambar (ConvNeXt/DINOv2/ViT, ensemble), 3 keluaran terpisah per foto (part, damage_type, severity + confidence). Tanpa bounding box & damage %. Semua pemetaan di **`savera-cv-adapter.js`**:
- `CV_LABEL_MAP`: label model → **kosakata UI** (Title Case, sama dengan data SR/sparepart: "Rear Bumper", "Headlamp", "Tail Lamp").
- `PRICING_KEY` + `pricingKey()` + `pricingMatcher()` (**baru**): kosakata UI → kunci kamus `matchPricing()` asli di app.js, yang huruf kecil & generik (`bumper`, `door`, `fender`, `headlamp`, `windshield`; `dent`, `broken`, `scratch`, `shatter`). `matchPricing` tidak diubah; wrapper hanya menerjemahkan argumen.
- Label tanpa padanan CV → "Unmapped"; kosakata tanpa kunci harga (mis. Crack, Tail Lamp) → `no_match` → "Pricing data unavailable" (tidak ditebak).

**Biaya.** `matchPricing()` app.js apa adanya (3 tingkat) lewat `priceFinding()`; total baris `lineTotal()`; ringkasan `calcSummary()` (diskon nominal, PPN `pricing.tax_rate`). Override manual per temuan di draft.

**Analytics (Tahap 7–8).** Data historis = **dataset v5** (`data/*.csv`), hasil model = **`modeling/`**; keduanya dirangkum `tools/build_data.py` → dibaca hanya lewat **`savera-api.js`**. UI tidak menghitung ulang model. Yang dihitung di JS (`savera-analytics-core.js`, murni & dites) hanya aturan bisnis: rekomendasi order, stok cukup sampai kapan, urutan risiko, penyusunan deret grafik. Halaman operasional (SR, assessment, antrian, inventory, PPIC, procurement) **masih data demo lama** (keputusan: migrasi tahap berikutnya).

**File per halaman**
| Halaman | File / fungsi |
|---|---|
| Assessment detail SR (Workshop) | `savera-workshop.js` `VIEWS["w-assessment"]` → `headCard` + `V.findings` + `V.costing` + `V.decision` |
| Viewer multi-foto | `savera-photo-viewer.js` |
| Kartu temuan per region | `savera-findings.js` |
| Rincian biaya + Cost Summary | `savera-costing.js` |
| Stepper + keputusan | `savera-decision.js` |
| Invoice & Work Order | `savera-documents.js`; isi dari `docModel()` (core) |
| Assessment detail (Customer) | `savera-customer.js` `VIEWS["c-detail"]` |
| Store review bersama | `savera-review.js` (`V.review`: `draft`, `working`, `editable`, `options` = kosakata UI dari data, `engine` = matchPricing + penerjemah) |
| i18n EN/ID | `savera-i18n.js` (`SAVERA_I18N.t/add/set`, default `id`) |
| **Analytics › Ringkasan** | `savera-analytics.js` `VIEWS["w-analytics"]` (menggantikan isi lama dari v2/insights/stock-forecast) |
| **Analytics › Revenue Forecast** | `savera-analytics.js` `VIEWS["w-an-revenue"]` |
| **Analytics › Demand Forecast** | `savera-demand-forecast.js` `VIEWS["w-an-demand"]` |
| **Analytics › Customer Segmentation** | `savera-analytics.js` `VIEWS["w-an-segment"]` |
| Komponen bersama Analytics | `savera-analytics-ui.js` (`window.SAVERA_AN_UI`: tab, loading/error/kosong, Export, tooltip, format, dataset grafik, judul halaman 2 bahasa, sidebar "Analytics" aktif di sub-page) |
| Forecast lama (data lama) + PPIC | `savera-stock-forecast.js` (`window.SAVERA_FORECAST` termasuk `registerModel` dipertahankan; hanya dipakai kolom Forecast di halaman PPIC) |
| Dashboard Workshop / Customer | `savera-invoice.js` `w-dashboard` / `savera-insights.js` `c-dashboard` |

**Kontrak API (`savera-api.js`).** `SAVERA_API.load(name)` → Promise; `peek(name)` → `{status: idle|loading|ready|error, data, error}`; `use(name)` = peek + mulai load (dipakai render sinkron; selesai → `renderContent()` otomatis). Mode `mock` (default) menggabungkan `SAVERA_DATASET[name]` + `SAVERA_MODEL_RESULTS[name]`; mode `http`: `window.SAVERA_API_CONFIG = { mode: "http", baseUrl }` → `GET {baseUrl}/api/v1/analytics/{name}` dengan JSON berbentuk sama. Validasi kolom wajib → state error yang jelas.
- `revenue`: `{ unit:"Rp juta", model, weekly:{ actual:[{week_start,value}], moving_avg:{window,values[]}, forecast:[{week_start,forecast,lower_80,upper_80}], backtest:[{week_start,actual,predicted}], error:{wape_pct,mape_pct,bias_pct,scope,n} }, monthly:{ …sama dengan period… }, month_to_date:{period,as_of,value_rp,n_invoices,complete} }`
- `demand`: `{ unit, model, periods[], forecast_periods[], parts:[{part_id,part_name,brand,model,vehicle_part,current_stock,reorder_point,safety_stock,max_stock,lead_time_days,unit_cost,stock_as_of,open_po:[{po_id,qty,expected_date,status}],open_po_qty,actual:[{period,demand,used}]}], forecast_by_part:{PT…:[{period,forecast,share,lower_80,upper_80}]}, backtest_by_part:{}, vehicle_part_forecast:{<jenis>|TOTAL:[…]}, error:{part_id,vehicle_part,total}, band_source:"total_x_share" }`
- `segments`: `{ model, unit_M:"Rp juta", unit_R, profiles:[{segment_id,segment_name,count,share_pct,R_median,F_median,M_median,description,kind:model|rule,kind_label}], customers:[{customer_id,name,city,customer_type,segment_id,R,F,M}] }`
- `ops`: `{ range:{from,to}, by_action:[{repair_action,revenue_rp,est_cost_rp,n_orders,n_invoices}], by_severity:[{severity,n}], by_damage:[{damage_type,n}] }`

**Aturan data di `build_data.py`** (sama dengan laporan_modeling.md): minggu mulai Senin; pendapatan aktual = Σ `total_amount` invoice per minggu penuh / **bulan kalender penuh** sebelum forecast pertama; demand aktual = Σ `quantity_required` repair order bukan Cancelled & > 0 per bulan `scheduled_date` (bulan pertama yang tidak penuh dibuang); "Terpakai" = STOCK_OUT `inventory_transactions`; PO berjalan = status Open/Draft/Ordered/Partially Received (`quantity_ordered − received_quantity`). Forecast per part_id = file tim model (`forecast_demand_bulanan_per_part_id.csv`, versi yang jumlahnya = TOTAL); rentang 80% per part_id = rentang TOTAL × porsi (cara yang sama dengan forecast per part_id). "Rata-rata meleset ±X%" = WAPE walk-forward 12 bulan dari `metrik_utama.csv` (part_id 9,1%; pendapatan bulanan 4,9%, mingguan 6,5%).

**Bentuk data assessment (`SAVERA_ASSESSMENT.mock`)**: tidak berubah dari Tahap 6 (`photos[].model_output` → `detections[]`, `review{edits,removed,added,boxes,costing,discount,notes}`, `pricing`, `costing/summary` snapshot saat Approve, `decision`, `documents`). Fungsi murni core: `formatRupiah, lineTotal, calcSummary, checkRange, stockStatus, groupFindings, linkDuplicates, priceFinding, buildWorking, findPart, serviceFor, nextId, invoiceNo, stepperModel, canDecide, validateReason, docModel, reserveStatus`.

**Hal yang janggal**
1. **Kamus harga app.js generik**: kunci `bumper` mencakup Front + Rear Bumper sekaligus, jadi harga "Rear Bumper" bisa diambil dari baris Front Bumper (tie-break tahun). Tidak ada kunci untuk Crack, Missing Part, Deformation, Paint Damage, Tail Lamp/Taillight, Hood, Trunk, Grille, Quarter Panel, Side Mirror walau baris harganya ada di PRICING_DATA. Di demo AS0001 hanya Rear Bumper yang berharga; Front Bumper (Crack) & Tail Lamp perlu biaya manual atau di-uncheck sebelum Approve. Perlu keputusan: tambah kunci di `PART_ALIASES/DAMAGE_ALIASES` app.js (ubah data app.js) atau biarkan.
2. `CV_LABEL_MAP` masih label mock — perlu daftar kelas asli + contoh JSON dari tim model.
3. **Dua sumber data berjalan bersamaan**: Analytics = dataset v5 (ID `CU####`, `PT0001–PT0032`); halaman operasional = data demo lama (ID `C####`, part lama). Angka stok di Inventory/PPIC ≠ Analytics › Demand Forecast. Badge segmen di halaman operasional belum bisa (ID pelanggan tidak cocok) — dikerjakan saat migrasi.
4. "Menunggu ACC workshop" & "Status pekerjaan" memakai data operasional live (ditandai chip), karena dataset v5 hanya berisi pekerjaan Completed/Cancelled.
5. Pendapatan aktual bulanan = bulan kalender penuh; laporan model memakai pembagian mingguan per hari, jadi angka aktual bisa beda ±2% dari tabel laporan (forecast sama persis).
6. Rentang 80% per part = rentang total × porsi → cenderung terlalu sempit di level part; teks "rata-rata meleset ±9,1%" lebih jujur untuk part.
7. "Prediksi backtest" (Revenue & Demand) nonaktif: tim model belum mengekspor prediksi backtest. Bila file `modeling/backtest_pendapatan_bulanan.csv` / `backtest_pendapatan_mingguan.csv` (kolom `periode|week_start, aktual, prediksi`) dan `backtest_demand_bulanan_per_part_id.csv` (`periode, part_id, aktual, prediksi`) ditambahkan lalu `build_data.py` dijalankan, toggle otomatis aktif.
8. Rekomendasi order bulan ini 0 untuk semua part: lead time 5–7 hari × demand ~2–10 unit/bulan kecil dibanding stok + safety, dan part yang habis sudah tertutup PO berjalan. Ini hasil rumus yang diminta, bukan bug.
9. Kolom Forecast di PPIC masih dihitung JS dari data lama (`SAVERA_FORECAST.syncPpic`) — bertentangan dengan "tanpa hitung ulang di JS", dibiarkan sampai PPIC dimigrasi ke dataset v5.
10. Repair Order masih satu part (RO = temuan severity tertinggi; biaya RO = subtotal). Hari pengerjaan = `damage%/12` (min 1). `matchPricing` tidak memakai repair action.
11. Shell lama tidak responsif di HP (topbar meluber di 375px); komponen baru tidak meluber (diuji 375 & 1366). Halaman lama belum memakai `t()`; nilai data (part, nama segmen, deskripsi segmen) tampil apa adanya (ID).
12. Data review/keputusan hanya di memori (hilang saat reload).
13. Chart.js tidak bisa diunduh di lingkungan uji → grafik diuji dengan stub perekam konfigurasi (data, sumbu, dataset tervalidasi; tampilan visual akhir Chart.js asli perlu dicek sekali di browser).

## Log tahap
- **Tahap 1–6**: lihat fitur di tabel di atas (data/mock, viewer, kartu temuan, biaya, keputusan, dokumen). Digabung ke frontend asli 20 Okt 2026 tanpa konflik (versi tahap 1–6 = versi user + tambahan). File arsip dipindah ke `arsip/`.
- **Perbaikan setelah gabung (diuji dengan app.js asli)**: sebelumnya semua temuan AI jadi "Unmapped" & biaya Rp 0 karena kamus app.js berbeda dengan fixture tes. Ditambah `PRICING_KEY/pricingKey/pricingMatcher` (adapter), `V.review.engine` & mock memakai wrapper, opsi dropdown = kosakata UI dari data; CV `headlamp` → "Headlamp" (sama dengan data sparepart). Tes app.js asli ditambahkan.
- **Lapisan data**: `tools/build_data.py`, `data/savera-dataset.js`, `data/savera-model-results.js`, `savera-api.js` (mock/http, validasi kontrak, state loading/error), `savera-analytics-core.js`.
- **Tahap 7 — Demand Forecast** (sub-page): pilih part (dikelompokkan per jenis); 3 kartu (Forecast bulan pertama + rentang 80% + "rata-rata meleset ±X%"; Stok + status + reorder point/safety + PO berjalan; Rekomendasi order = ⌈forecast selama lead time + safety − stok − PO⌉ + "stok cukup sampai kira-kira <bulan>" / "sudah tidak mencukupi"); grafik Aktual + Forecast + rentang 80%, toggle "Terpakai" & "Prediksi backtest" (default mati; backtest nonaktif + alasan); penjelasan di tooltip ⓘ; tabel forecast per bulan (tampilan tabel grafik); tabel rekomendasi stok semua part (urut risiko, klik untuk pilih); menu Export (3 CSV). Bagian "Stock Demand Forecast" lama di Analytics dihapus (ikon `ICONS.cart` "undefined" ikut hilang); `SAVERA_FORECAST` & `registerModel` tetap.
- **Tahap 8 — Analytics**: tab Ringkasan | Revenue Forecast | Demand Forecast | Customer Segmentation. Ringkasan: KPI (Pendapatan bulan ini vs forecast bulan yang sama; Menunggu ACC workshop; Part di/bawah ROP), tren pendapatan Bulanan/Mingguan (default Bulanan) + rata-rata bergerak + forecast putus-putus + rentang, Demand per Part (dropdown, 12 bln + forecast 3 bln, tautan), Status pekerjaan (SR + repair digabung, urutan stepper), Pendapatan & estimasi biaya per jenis perbaikan (gabungan), Tingkat kerusakan 3 tingkat, Jenis kerusakan, Inventory vs ROP (12 paling berisiko, merah bila ≤ ROP). Dihapus: PPIC forecast vs recommended, Demand history, forecast JS lama. Revenue Forecast: kartu forecast berikut + rentang + meleset, total horizon, perubahan vs aktual terakhir; grafik; tabel; Export. Customer Segmentation: kartu per segmen (model dulu, lalu aturan; jumlah, porsi, median R/F/M, arti bisnis; klik = filter), daftar pelanggan (filter segmen, cari, pager), Export 2 CSV. Tanpa Model Evaluation.
- File lama yang diubah (minimal): `savera-cv-adapter.js`, `savera-review.js`, `savera-assessment-mock.js` (1 baris), `savera-stock-forecast.js` (hapus bagian Analytics, teks banner PPIC), `styles.css` (tambahan di akhir), `index.html` (7 script), `tests/assessment-core.test.js`.

## Cara uji
- `node tests/assessment-core.test.js` → 54 lulus (termasuk 4 tes terhadap `matchPricing`/PRICING_DATA asli dari app.js).
- `node tests/analytics-core.test.js` → 31 lulus (rekomendasi order, cakupan stok, urutan risiko, deret grafik, kontrak API, data hasil build: forecast = file model, Σ part_id = TOTAL, rentang mengapit forecast, jumlah segmen = profil).
- `python3 tools/build_data.py` → mencetak periode & jumlah part; jalankan ulang setelah CSV/hasil model berubah.
- Browser (server lokal): Workshop › Assessment › SR1272 (Pajero Sport B 1721 SVR) → Rear Bumper berharga ("Matched"), Front Bumper/Tail Lamp "Pricing data unavailable" → isi biaya manual + pilih action → Approve → Lihat invoice / work order → Repair Queue Start/Complete → invoice final. Customer (demo, Rahmat Hidayat) → My Assessments → detail.
- Analytics: tiap tab; ganti Bulanan/Mingguan; ganti part (dropdown & klik baris tabel); toggle Terpakai; Export (cek CSV); tooltip ⓘ dengan Tab (keyboard); EN/ID; lebar 375 (sidebar collapse) & 1366. Error state: `window.SAVERA_API_CONFIG = { mode: "http", baseUrl: "http://localhost:1" }` sebelum script → kartu "Data gagal dimuat" + Coba lagi.
- Regresi: halaman Dashboard, Service Requests, Queue, Orders, Inventory, PPIC, Procurement, Paint, Settings, Invoices dibandingkan dengan frontend asli → sama, kecuali SR1272 (mock Tahap 1) dan teks banner PPIC.

## ATURAN UMUM
- Jangan ubah logika CV/backend/model; UI hanya menampilkan dan mengedit hasilnya.
- Pertahankan design system (warna, font, komponen). Responsif.
- Label UI 2 bahasa (Inggris dan indonesia). Format rupiah id-ID.
- Sediakan state loading, kosong, error. Tanpa angka hardcode; semua dari data/props.
- Data dummy tetap dipakai; perluas strukturnya.
- Total biaya SELALU dihitung dari field (satu sumber kebenaran).
- Tiap tahap: rencana + daftar file dulu, tunggu konfirmasi, baru kode. Ubah seminimal
  mungkin (jangan tulis ulang seluruh file untuk perubahan kecil). Sebutkan file yang
  berubah + cara uji. Akhiri dengan memperbarui PROJECT_NOTES.md.
