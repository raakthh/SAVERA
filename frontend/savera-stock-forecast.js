/* SAVERA — Stock Demand Forecast layer (data demo LAMA: SAVERA_DEMO.demand_history + inventory + ppic_recommendations).
   Tahap 7: tampilan forecast pindah ke sub-page Analytics › Demand Forecast (savera-demand-forecast.js, hasil model
   Python atas dataset v5). File ini sekarang hanya: API window.SAVERA_FORECAST (termasuk registerModel, dipertahankan)
   + sinkronisasi kolom Forecast di halaman PPIC (halaman operasional, masih data lama sampai migrasi).

   UNTUK MODELING (semua ada di console lewat window.SAVERA_FORECAST):
     SAVERA_FORECAST.series("PT0002")            -> deret bulanan satu part
     SAVERA_FORECAST.dataset()                   -> tabel fitur siap model (lag, rolling, bulan sin/cos, target bulan depan)
     SAVERA_FORECAST.toCSV(SAVERA_FORECAST.dataset())  -> teks CSV (juga ada tombol Download di UI)
     SAVERA_FORECAST.backtest(y, SAVERA_FORECAST.models.holt)  -> MAE / RMSE / WAPE walk-forward
     SAVERA_FORECAST.registerModel("nama", (y) => angka)  -> model baru otomatis ikut dibandingkan di UI
     window.SAVERA_ML_FORECAST = { PT0002: 14.2, ... }    -> hasil model ML dari Python (forecast bulan depan), tampil sebagai kolom "ML"
*/
(function () {
  const V = window.SAVERA_V2, D = window.SAVERA_DEMO;
  if (!D || !Array.isArray(D.demand_history)) return;

  /* ============================================================
     CORE — fungsi murni, tanpa DOM
     ============================================================ */
  const nextPeriod = (p) => { let [y, m] = p.split("-").map(Number); m++; if (m > 12) { m = 1; y++; } return `${y}-${String(m).padStart(2, "0")}`; };
  const range = (a, b) => { const o = []; for (let p = a; p <= b; p = nextPeriod(p)) o.push(p); return o; };
  const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
  const clamp0 = (v) => (Number.isFinite(v) ? Math.max(0, v) : 0);

  const PERIODS = (() => { const ps = D.demand_history.map((r) => r.period).sort(); return ps.length ? range(ps[0], ps[ps.length - 1]) : []; })();
  const LAST = PERIODS[PERIODS.length - 1] || "";
  const NEXT = LAST ? nextPeriod(LAST) : "";
  /* horizon forecast: dari bulan pertama setelah data aktual sampai akhir tahun (ubah lewat window.SAVERA_FORECAST_END, mis. "2027-03") */
  const HORIZON_END = window.SAVERA_FORECAST_END || "2026-12";
  const FUTURE = NEXT ? (NEXT <= HORIZON_END ? range(NEXT, HORIZON_END) : [NEXT]) : [];

  const byPart = {};
  D.demand_history.forEach((r) => { (byPart[r.part_id] = byPart[r.part_id] || {})[r.period] = r; });
  const partIds = () => Object.keys(byPart).sort();

  /* deret lengkap per part; bulan yang tidak ada diisi 0 dan ditandai missing:true */
  function series(partId) {
    const m = byPart[partId] || {};
    return PERIODS.map((p) => { const r = m[p]; return r ? { period: p, demanded: +r.quantity_demanded || 0, used: +r.quantity_used || 0, stockout: +r.stockout_days || 0, avgRO: +r.average_repair_orders || 0, missing: false } : { period: p, demanded: 0, used: 0, stockout: 0, avgRO: 0, missing: true }; });
  }

  /* ---------- model: fn(y: number[]) -> forecast 1 langkah ke depan ---------- */
  const lastN = (y, n) => y.slice(-n);
  function ses(y, a) { let l = y[0]; for (let i = 1; i < y.length; i++) l = a * y[i] + (1 - a) * l; return l; }
  function holtRun(y, a, b) { let l = y[0], t = y.length > 1 ? y[1] - y[0] : 0, sse = 0; for (let i = 1; i < y.length; i++) { const f = l + t; sse += (y[i] - f) ** 2; const nl = a * y[i] + (1 - a) * (l + t); t = b * (nl - l) + (1 - b) * t; l = nl; } return { l, t, sse }; }
  const GA = [0.2, 0.4, 0.6], GB = [0.05, 0.1, 0.2];
  const models = {
    naive: (y) => y[y.length - 1],
    ma3: (y) => mean(lastN(y, 3)),
    wma6: (y) => { const w = lastN(y, 6), s = (w.length * (w.length + 1)) / 2; return w.reduce((a, v, i) => a + v * (i + 1), 0) / s; },
    ses: (y) => { let best = null; GA.forEach((a) => { let l = y[0], sse = 0; for (let i = 1; i < y.length; i++) { sse += (y[i] - l) ** 2; l = a * y[i] + (1 - a) * l; } if (!best || sse < best.sse) best = { a, sse }; }); return ses(y, best.a); },
    holt: (y) => { let best = null; GA.forEach((a) => GB.forEach((b) => { const r = holtRun(y, a, b); if (!best || r.sse < best.sse) best = r; })); return best.l + best.t; },
    snaive: (y) => (y.length >= 12 ? y[y.length - 12] : y[y.length - 1]),
    /* seasonal naive disesuaikan tren: nilai tahun lalu × (rata-rata 6 bln terakhir / rata-rata 6 bln yang sama tahun lalu) */
    seasonal_ratio: (y) => { const n = y.length; if (n < 18) return models.wma6(y); const prev = mean(y.slice(n - 18, n - 12)), cur = mean(y.slice(n - 6)); const r = prev > 0 ? Math.min(2, Math.max(0.5, cur / prev)) : 1; return y[n - 12] * r; },
  };
  models.ensemble = (y) => mean([models.wma6(y), models.holt(y), models.ses(y), models.seasonal_ratio(y)]);
  const LABEL = { naive: "Naive (bulan lalu)", ma3: "Moving Avg 3", wma6: "Weighted MA 6", ses: "Exp. Smoothing", holt: "Holt (tren)", snaive: "Seasonal Naive", seasonal_ratio: "Seasonal + Tren", ensemble: "Ensemble" };
  function registerModel(name, fn, label) { models[name] = fn; LABEL[name] = label || name; }

  /* walk-forward 1 langkah: latih sampai t-1, uji di t */
  function backtest(y, fn, minTrain) {
    minTrain = minTrain || 12; const errs = [], preds = [];
    for (let t = minTrain; t < y.length; t++) { const p = clamp0(fn(y.slice(0, t))); preds.push(p); errs.push(y[t] - p); }
    if (!errs.length) return { n: 0, mae: null, rmse: null, wape: null, bias: null, preds };
    const act = y.slice(minTrain), sumAct = act.reduce((a, v) => a + v, 0), sumAbs = errs.reduce((a, e) => a + Math.abs(e), 0);
    return { n: errs.length, mae: sumAbs / errs.length, rmse: Math.sqrt(mean(errs.map((e) => e * e))), wape: sumAct > 0 ? sumAbs / sumAct : null, bias: mean(errs), preds };
  }
  const OWN = () => Object.keys(models);

  /* forecast satu part: bandingkan semua model, pilih MAE terkecil */
  const cache = {};
  function forecast(partId) {
    if (cache[partId]) return cache[partId];
    const ser = series(partId), y = ser.map((s) => s.demanded);
    const table = OWN().map((k) => { const bt = backtest(y, models[k]); let f = 0; try { f = clamp0(models[k](y)); } catch (e) { f = NaN; } return { key: k, label: LABEL[k] || k, f, mae: bt.mae, rmse: bt.rmse, wape: bt.wape, bias: bt.bias, n: bt.n }; })
      .filter((r) => Number.isFinite(r.f));
    const ranked = table.filter((r) => r.mae != null).sort((a, b) => a.mae - b.mae);
    const best = ranked[0] || table[0];
    const ml = window.SAVERA_ML_FORECAST && window.SAVERA_ML_FORECAST[partId] != null ? +window.SAVERA_ML_FORECAST[partId] : null;
    const out = { partId, ser, y, table, best, ml, next: NEXT, band: best && best.rmse != null ? 1.28 * best.rmse : null }; /* ±1.28·RMSE ≈ rentang 80% bila error mendekati normal */
    return (cache[partId] = out);
  }

  /* forecast multi-bulan (rekursif): hasil forecast bulan ke-h dipakai sebagai input bulan ke-(h+1).
     Rentang 80% dilebarkan sebesar akar(h) × 1.28·RMSE backtest 1-langkah (pendekatan; makin jauh makin tidak pasti). */
  function path(partId, key) {
    const fc = forecast(partId), row = key && key !== "best" ? fc.table.find((r) => r.key === key) || fc.best : fc.best;
    const fn = models[row.key], y = fc.y.slice(), out = [];
    FUTURE.forEach((period, i) => {
      let f; try { f = clamp0(fn(y)); } catch (e) { f = NaN; }
      if (!Number.isFinite(f)) f = y[y.length - 1];
      y.push(f);
      const band = row.rmse != null ? 1.28 * row.rmse * Math.sqrt(i + 1) : null;
      out.push({ period, f, lo: band == null ? null : Math.max(0, f - band), hi: band == null ? null : f + band });
    });
    return out;
  }

  /* prediksi walk-forward untuk tiap bulan yang sudah ada datanya (untuk grafik): bulan ke-t diprediksi HANYA dari data sebelum t.
     Bulan awal (< minTrain) tidak punya prediksi karena datanya belum cukup. */
  function fitted(partId, key, minTrain) {
    minTrain = minTrain || 3;
    const fc = forecast(partId), row = key && key !== "best" ? fc.table.find((r) => r.key === key) || fc.best : fc.best, fn = models[row.key];
    return fc.y.map((_, t) => { if (t < minTrain) return null; try { const v = clamp0(fn(fc.y.slice(0, t))); return Number.isFinite(v) ? v : null; } catch (e) { return null; } });
  }

  /* ---------- rekomendasi stok ---------- */
  /* stok & PO dibaca LIVE dari state aplikasi (V.W) bila ada, supaya sama dengan halaman Inventory/PPIC */
  const liveInv = () => (V && V.W && V.W.inv) || D.inventory || [];
  const livePO = () => (V && V.W && V.W.po) || D.purchase_orders || [];
  const OPEN_PO = ["Draft", "Ordered", "Partially Received"];
  const invOf = (id) => liveInv().find((i) => i.part_id === id) || {};
  const pendOf = (id) => livePO().filter((p) => p.part_id === id && OPEN_PO.includes(p.status)).reduce((a, p) => a + (+p.quantity || 0), 0);
  const nameOf = (id) => { const h = D.demand_history.find((r) => r.part_id === id), i = invOf(id); return (h && h.part_name) || i.part_name || id; };
  function stockPlan(id, fcValue) {
    const inv = invOf(id), f = fcValue != null ? fcValue : forecast(id).best.f;
    const stock = +inv.current_stock || 0, rop = +inv.reorder_point || 0, ss = +inv.safety_stock || 0, pend = pendOf(id);
    const order = Math.max(0, Math.ceil(f + ss - stock - pend));
    const status = stock < f ? "Critical" : stock <= rop ? "Reorder" : "OK";
    return { stock, rop, ss, pend, order, status, cover: f > 0 ? stock / f : null };
  }

  /* ---------- dataset siap modeling (1 baris per part × bulan) ---------- */
  function dataset() {
    const rows = [];
    partIds().forEach((id) => {
      const ser = series(id), y = ser.map((s) => s.demanded);
      ser.forEach((s, i) => {
        const lag = (k) => (i - k >= 0 ? y[i - k] : ""), roll = (k) => (i - k + 1 >= 0 ? Math.round(mean(y.slice(i - k + 1, i + 1)) * 100) / 100 : "");
        const m = Number(s.period.slice(5)) - 1;
        rows.push({ part_id: id, period: s.period, month: m + 1, month_sin: Math.round(Math.sin((2 * Math.PI * m) / 12) * 1e4) / 1e4, month_cos: Math.round(Math.cos((2 * Math.PI * m) / 12) * 1e4) / 1e4, t_index: i,
          quantity_demanded: s.demanded, quantity_used: s.used, stockout_days: s.stockout, average_repair_orders: s.avgRO, was_missing: s.missing ? 1 : 0,
          lag_1: lag(1), lag_2: lag(2), lag_3: lag(3), lag_6: lag(6), lag_12: lag(12), roll_mean_3: roll(3), roll_mean_6: roll(6),
          target_next_month: i + 1 < y.length ? y[i + 1] : "" });
      });
    });
    return rows;
  }
  function toCSV(rows) {
    if (!rows.length) return "";
    const cols = Object.keys(rows[0]), q = (v) => (/[",\n]/.test(String(v)) ? '"' + String(v).replace(/"/g, '""') + '"' : String(v));
    return cols.join(",") + "\n" + rows.map((r) => cols.map((c) => q(r[c])).join(",")).join("\n") + "\n";
  }
  function download(name, text) {
    try { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([text], { type: "text/csv;charset=utf-8" })); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); } catch (e) { console.error(e); }
  }

  /* ---------- PPIC: ganti forecast_demand statis dengan forecast model (runtime saja, file data tidak diubah) ---------- */
  const CFG = Object.assign({ syncPpic: true }, window.SAVERA_FORECAST_CONFIG || {});
  function syncPpic(on) {
    if (!Array.isArray(D.ppic_recommendations)) return 0;
    let n = 0;
    partIds().forEach((id) => {
      let rec = D.ppic_recommendations.find((r) => r.part_id === id);
      if (on) {
        if (!rec) { const i = invOf(id); rec = { part_id: id, part_name: nameOf(id), brand: i.brand, model: i.model, vehicle_part: i.vehicle_part, forecast_demand: 0, __synthetic: true }; D.ppic_recommendations.push(rec); }
        if (!("__fc0" in rec)) rec.__fc0 = rec.forecast_demand;
        rec.forecast_demand = Math.round(forecast(id).best.f); n++;
      } else if (rec && "__fc0" in rec) { rec.forecast_demand = rec.__fc0; delete rec.__fc0; n++; }
    });
    if (!on) { for (let k = D.ppic_recommendations.length - 1; k >= 0; k--) if (D.ppic_recommendations[k].__synthetic) D.ppic_recommendations.splice(k, 1); }
    return n;
  }

  window.SAVERA_FORECAST = { syncPpic, periods: PERIODS, nextPeriod: NEXT, partIds, series, models, labels: LABEL, registerModel, backtest, forecast, path, fitted, future: FUTURE, stockPlan, dataset, toCSV,
    clearCache: () => Object.keys(cache).forEach((k) => delete cache[k]) };

  /* ============================================================
     UI — hanya catatan di halaman PPIC (bagian Analytics lama dihapus di Tahap 7)
     ============================================================ */
  if (!V) return;
  const { VIEWS } = V;
  if (!VIEWS) return;
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const periodLabel = (p) => new Date(p + "-01T00:00:00").toLocaleDateString("id-ID", { month: "short", year: "2-digit" });

  if (CFG.syncPpic) syncPpic(true);
  if (VIEWS["w-ppic"]) {
    const origPpic = VIEWS["w-ppic"];
    VIEWS["w-ppic"] = function () {
      const note = CFG.syncPpic && D.ppic_recommendations.some((r) => "__fc0" in r) ? `<div class="banner banner-info" style="margin-bottom:16px;"><div>Kolom <b>Forecast</b> dihitung dari <b>demand_history ${PERIODS.length} bulan</b> (sampai ${esc(periodLabel(LAST))}) memakai model terbaik per part. Forecast hasil model Python (dataset v5): <b>Analytics → Demand Forecast</b>.</div></div>` : "";
      return note + origPpic();
    };
  }
})();
