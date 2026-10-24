/* SAVERA — fungsi murni untuk Analytics, Revenue Forecast, Demand Forecast, Customer Segmentation (tanpa DOM).
   Tidak ada model di sini: forecast & segmen datang dari savera-api.js. Yang dihitung hanya aturan bisnis yang
   diminta (rekomendasi order, perkiraan stok cukup sampai kapan) dan penyusunan deret untuk grafik.
   Diuji di tests/analytics-core.test.js. */
(function (root) {
  "use strict";
  const num = (v) => (v == null || v === "" || !Number.isFinite(+v) ? 0 : +v);
  const isNum = (v) => v != null && v !== "" && Number.isFinite(+v);

  /* ---------- tanggal ---------- */
  const pad2 = (n) => String(n).padStart(2, "0");
  const iso = (t) => `${t.getUTCFullYear()}-${pad2(t.getUTCMonth() + 1)}-${pad2(t.getUTCDate())}`;
  const parse = (s) => { const [y, m, d] = String(s).slice(0, 10).split("-").map(Number); return new Date(Date.UTC(y, (m || 1) - 1, d || 1)); };
  const addDays = (s, n) => { const t = parse(s); t.setUTCDate(t.getUTCDate() + n); return iso(t); };
  const periodOf = (s) => String(s).slice(0, 7);
  const daysInMonth = (p) => { const [y, m] = String(p).split("-").map(Number); return new Date(Date.UTC(y, m, 0)).getUTCDate(); };
  const nextPeriod = (p) => { let [y, m] = String(p).split("-").map(Number); m++; if (m > 12) { m = 1; y++; } return `${y}-${pad2(m)}`; };
  const lastDay = (p) => `${p}-${pad2(daysInMonth(p))}`;

  /* ---------- demand: forecast harian dari forecast bulanan ---------- */
  /* rate(fc, "2026-10-14") → forecast bulan itu ÷ jumlah hari. Setelah horizon → null (tidak ditebak). Sebelum horizon → bulan pertama. */
  function dailyRate(fc, day) {
    const list = (fc || []).filter((r) => isNum(r.forecast)).slice().sort((a, b) => (a.period < b.period ? -1 : 1));
    if (!list.length) return null;
    const p = periodOf(day), row = list.find((r) => r.period === p) || (p < list[0].period ? list[0] : null);
    return row ? num(row.forecast) / daysInMonth(row.period) : null;
  }
  const horizonEnd = (fc) => { const ps = (fc || []).filter((r) => isNum(r.forecast)).map((r) => r.period).sort(); return ps.length ? lastDay(ps[ps.length - 1]) : null; };

  /* forecast selama lead time: jumlah rate harian dari (stok per tanggal + 1) sampai (+ lead_time_days). null bila keluar horizon. */
  function leadTimeDemand(part, fc) {
    const lt = Math.max(0, Math.round(num(part && part.lead_time_days))), start = part && part.stock_as_of;
    if (!start || !fc || !fc.length) return null;
    let sum = 0;
    for (let k = 1; k <= lt; k++) { const r = dailyRate(fc, addDays(start, k)); if (r == null) return null; sum += r; }
    return sum;
  }

  /* orderPlan(part, fc) — aturan: order = ⌈forecast selama lead time + safety stock − stok − PO berjalan⌉, minimal 0.
     status: "out" (stok 0) | "reorder" (stok ≤ reorder point) | "ok" */
  function orderPlan(part, fc) {
    const stock = num(part && part.current_stock), rop = num(part && part.reorder_point), ss = num(part && part.safety_stock), po = num(part && part.open_po_qty);
    const lt = leadTimeDemand(part, fc);
    const order = lt == null ? null : Math.max(0, Math.ceil(lt + ss - stock - po - 1e-9));
    const status = stock <= 0 ? "out" : stock <= rop ? "reorder" : "ok";
    return { stock, rop, safety: ss, open_po: po, lead_time_days: num(part && part.lead_time_days), lt_demand: lt, order, status, below_rop: stock <= rop };
  }

  /* coverage(part, fc) — sampai kapan stok (+ PO berjalan pada expected_date) cukup memenuhi forecast harian.
     → { date, period } bila habis di dalam horizon; { beyond: true, until } bila masih cukup sampai akhir horizon; null bila tanpa forecast. */
  function coverage(part, fc) {
    const end = horizonEnd(fc), start = part && part.stock_as_of;
    if (!end || !start) return null;
    let left = num(part.current_stock);
    const arrivals = {};
    (part.open_po || []).forEach((p) => { if (p && p.expected_date) arrivals[p.expected_date] = (arrivals[p.expected_date] || 0) + num(p.qty); });
    if (left <= 0 && !Object.keys(arrivals).length) return { date: start, period: periodOf(start), beyond: false };
    for (let day = addDays(start, 1); day <= end; day = addDays(day, 1)) {
      left += arrivals[day] || 0;
      left -= dailyRate(fc, day) || 0;
      if (left < 0) return { date: day, period: periodOf(day), beyond: false };
    }
    return { beyond: true, until: periodOf(end) };
  }

  /* risiko stok untuk urutan grafik inventory: makin kecil stok/ROP makin berisiko */
  const stockRisk = (part) => { const rop = num(part.reorder_point); return rop > 0 ? num(part.current_stock) / rop : num(part.current_stock) > 0 ? Infinity : 0; };
  const sortByRisk = (parts) => (parts || []).slice().sort((a, b) => stockRisk(a) - stockRisk(b) || num(a.current_stock) - num(b.current_stock) || String(a.part_id).localeCompare(String(b.part_id)));

  /* ---------- deret grafik: aktual + forecast (+ rentang 80%) pada satu sumbu waktu ---------- */
  /* timeline({ actual:[{key,value}], forecast:[{key,forecast,lower_80,upper_80}], extra:{ nama:[{key,value}] } })
     → { keys, actual[], forecast[] (diawali titik aktual terakhir agar garis menyambung), lower[], upper[], extra{}, nActual } */
  function timeline(o) {
    const act = (o.actual || []).slice().sort((a, b) => (a.key < b.key ? -1 : 1)), fc = (o.forecast || []).slice().sort((a, b) => (a.key < b.key ? -1 : 1));
    const keys = [...new Set(act.map((x) => x.key).concat(fc.map((x) => x.key)))].sort();
    const A = new Map(act.map((x) => [x.key, x.value])), F = new Map(fc.map((x) => [x.key, x]));
    const lastA = act.length ? act[act.length - 1].key : null;
    const val = (v) => (isNum(v) ? +v : null);
    const out = { keys, nActual: act.length, lastActual: lastA,
      actual: keys.map((k) => (A.has(k) ? val(A.get(k)) : null)),
      forecast: keys.map((k) => (F.has(k) ? val(F.get(k).forecast) : k === lastA && fc.length ? val(A.get(k)) : null)),
      lower: keys.map((k) => (F.has(k) ? val(F.get(k).lower_80) : null)),
      upper: keys.map((k) => (F.has(k) ? val(F.get(k).upper_80) : null)), extra: {} };
    Object.entries(o.extra || {}).forEach(([name, list]) => { const M = new Map((list || []).map((x) => [x.key, x.value])); out.extra[name] = keys.map((k) => (M.has(k) ? val(M.get(k)) : null)); });
    return out;
  }

  /* revenueView(rev, "weekly"|"monthly") → deret siap grafik + ringkasan forecast */
  function revenueView(rev, gran) {
    const g = rev && rev[gran === "weekly" ? "weekly" : "monthly"], kk = gran === "weekly" ? "week_start" : "period";
    if (!g) return null;
    const actual = (g.actual || []).map((x) => ({ key: x[kk], value: x.value }));
    const ma = g.moving_avg && Array.isArray(g.moving_avg.values) ? actual.map((x, i) => ({ key: x.key, value: g.moving_avg.values[i] })) : [];
    const bt = (g.backtest || []).map((x) => ({ key: x[kk], value: x.predicted }));
    const forecast = (g.forecast || []).map((x) => ({ key: x[kk], forecast: x.forecast, lower_80: x.lower_80, upper_80: x.upper_80 }));
    const tl = timeline({ actual, forecast, extra: { ma, backtest: bt } });
    const next = forecast[0] || null, last = actual.length ? actual[actual.length - 1] : null;
    const horizonTotal = forecast.reduce((a, x) => a + num(x.forecast), 0);
    return { gran: gran === "weekly" ? "weekly" : "monthly", tl, next, last, forecast, horizonTotal, maWindow: g.moving_avg ? g.moving_avg.window : null,
      error: g.error || null, hasBacktest: bt.length > 0, growth: next && last && num(last.value) > 0 ? (num(next.forecast) - num(last.value)) / num(last.value) : null };
  }

  /* demandView(demand, partId) → part + deret aktual/terpakai/forecast + rencana stok */
  function demandView(demand, partId) {
    const part = ((demand && demand.parts) || []).find((p) => p.part_id === partId) || null;
    if (!part) return null;
    const fcRaw = (demand.forecast_by_part && demand.forecast_by_part[partId]) || [];
    const fc = fcRaw.map((x) => ({ period: x.period, forecast: x.forecast, lower_80: x.lower_80, upper_80: x.upper_80 }));
    const bt = ((demand.backtest_by_part && demand.backtest_by_part[partId]) || []).map((x) => ({ key: x.period, value: x.predicted }));
    const tl = timeline({ actual: (part.actual || []).map((x) => ({ key: x.period, value: x.demand })), forecast: fc.map((x) => ({ key: x.period, ...x })),
      extra: { used: (part.actual || []).map((x) => ({ key: x.period, value: x.used })), backtest: bt } });
    return { part, fc, tl, next: fc[0] || null, plan: orderPlan(part, fc), cover: coverage(part, fc), hasBacktest: bt.length > 0 };
  }

  /* kpi pendapatan bulan berjalan vs forecast bulan yang sama (bila ada) */
  function monthToDate(rev) {
    const m = rev && rev.month_to_date;
    if (!m) return null;
    const f = ((rev.monthly && rev.monthly.forecast) || []).find((x) => x.period === m.period);
    const fRp = f && isNum(f.forecast) ? f.forecast * (rev.unit === "Rp juta" ? 1e6 : 1) : null;
    return { period: m.period, as_of: m.as_of, value_rp: num(m.value_rp), n: num(m.n_invoices), complete: !!m.complete, forecast_rp: fRp, share: fRp ? num(m.value_rp) / fRp : null,
      elapsed: m.as_of ? Number(String(m.as_of).slice(8, 10)) / daysInMonth(m.period) : null };
  }

  /* ---------- segmentasi ---------- */
  function segmentSummary(seg) {
    const prof = ((seg && seg.profiles) || []).slice().sort((a, b) => (a.kind === b.kind ? b.count - a.count : a.kind === "model" ? -1 : 1));
    const total = prof.reduce((a, p) => a + num(p.count), 0);
    return prof.map((p) => ({ ...p, share_all: total ? num(p.count) / total : 0 }));
  }
  function filterCustomers(seg, f) {
    const q = String((f && f.q) || "").trim().toLowerCase(), sid = f && f.segment != null && f.segment !== "" ? Number(f.segment) : null;
    return ((seg && seg.customers) || []).filter((c) => (sid == null || c.segment_id === sid) && (!q || [c.customer_id, c.name, c.city].some((v) => String(v || "").toLowerCase().includes(q))));
  }

  /* ---------- CSV ---------- */
  function toCSV(rows, cols) {
    if (!rows || !rows.length) return "";
    const c = cols || Object.keys(rows[0]), q = (v) => { const s = v == null ? "" : String(v); return /[",\n;]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
    return c.join(",") + "\n" + rows.map((r) => c.map((k) => q(r[k])).join(",")).join("\n") + "\n";
  }

  const api = { num, isNum, addDays, periodOf, daysInMonth, nextPeriod, lastDay, dailyRate, horizonEnd, leadTimeDemand, orderPlan, coverage, stockRisk, sortByRisk,
    timeline, revenueView, demandView, monthToDate, segmentSummary, filterCustomers, toCSV };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.SAVERA_ANALYTICS = api;
})(typeof window !== "undefined" ? window : globalThis);
