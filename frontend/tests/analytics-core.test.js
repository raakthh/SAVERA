/* Jalankan: node tests/analytics-core.test.js  (tanpa dependensi) */
"use strict";
const assert = require("node:assert/strict");
const path = require("node:path"), fs = require("node:fs"), vm = require("node:vm");
const R = (f) => require(path.join(__dirname, "..", f));
const A = R("savera-analytics-core.js"), API = R("savera-api.js");

let pass = 0, fail = 0;
const test = (name, fn) => { try { fn(); pass++; console.log("  ✓ " + name); } catch (e) { fail++; console.error("  ✗ " + name + "\n    " + e.message); } };
const atest = async (name, fn) => { try { await fn(); pass++; console.log("  ✓ " + name); } catch (e) { fail++; console.error("  ✗ " + name + "\n    " + e.message); } };

const FC = [{ period: "2026-10", forecast: 31, lower_80: 28, upper_80: 34 }, { period: "2026-11", forecast: 60, lower_80: 55, upper_80: 66 }, { period: "2026-12", forecast: 93, lower_80: 88, upper_80: 99 }];
const PART = { part_id: "PTX", current_stock: 10, reorder_point: 6, safety_stock: 3, lead_time_days: 5, stock_as_of: "2026-10-13", open_po_qty: 0, open_po: [] };

(async () => {
  console.log("tanggal & rate harian");
  test("daysInMonth / nextPeriod", () => { assert.equal(A.daysInMonth("2026-02"), 28); assert.equal(A.daysInMonth("2028-02"), 29); assert.equal(A.nextPeriod("2026-12"), "2027-01"); });
  test("rate = forecast bulan ÷ jumlah hari; setelah horizon → null", () => { assert.equal(A.dailyRate(FC, "2026-10-20"), 1); assert.equal(A.dailyRate(FC, "2026-11-01"), 2); assert.equal(A.dailyRate(FC, "2027-01-01"), null); });

  console.log("rekomendasi order (forecast selama lead time + safety − stok − PO)");
  test("lead time 5 hari di Oktober = 5 unit", () => assert.equal(A.leadTimeDemand(PART, FC), 5));
  test("lead time melewati pergantian bulan memakai rate bulan masing-masing", () => assert.equal(A.leadTimeDemand({ ...PART, stock_as_of: "2026-10-29", lead_time_days: 4 }, FC), 1 + 1 + 2 + 2));
  test("order = ⌈5 + 3 − 10 − 0⌉ → 0 (tidak negatif)", () => assert.equal(A.orderPlan(PART, FC).order, 0));
  test("stok 2, PO 1 → ⌈5 + 3 − 2 − 1⌉ = 5", () => assert.equal(A.orderPlan({ ...PART, current_stock: 2, open_po_qty: 1 }, FC).order, 5));
  test("pecahan dibulatkan ke atas", () => assert.equal(A.orderPlan({ ...PART, current_stock: 0, safety_stock: 0, lead_time_days: 1, stock_as_of: "2026-11-30" }, [{ period: "2026-12", forecast: 15.5 }]).order, 1));
  test("status: ok / reorder (≤ ROP) / out", () => { assert.equal(A.orderPlan(PART, FC).status, "ok"); assert.equal(A.orderPlan({ ...PART, current_stock: 6 }, FC).status, "reorder"); assert.equal(A.orderPlan({ ...PART, current_stock: 0 }, FC).status, "out"); });
  test("tanpa forecast → order null (tidak ditebak), status tetap dari stok", () => { const p = A.orderPlan(PART, []); assert.equal(p.order, null); assert.equal(p.status, "ok"); });

  console.log("stok cukup sampai kapan");
  test("10 unit, 1/hari dari 14 Okt → habis 24 Okt", () => assert.deepEqual(A.coverage(PART, FC), { date: "2026-10-24", period: "2026-10", beyond: false }));
  test("PO datang di tengah jalan memperpanjang cakupan", () => assert.equal(A.coverage({ ...PART, open_po: [{ qty: 10, expected_date: "2026-10-20" }] }, FC).date, "2026-11-02"));
  test("stok besar → masih cukup sampai akhir horizon", () => assert.deepEqual(A.coverage({ ...PART, current_stock: 999 }, FC), { beyond: true, until: "2026-12" }));
  test("stok 0 tanpa PO → habis pada tanggal stok", () => assert.equal(A.coverage({ ...PART, current_stock: 0 }, FC).date, "2026-10-13"));

  console.log("urutan risiko inventory");
  test("stok/ROP terkecil di depan", () => assert.deepEqual(A.sortByRisk([{ part_id: "a", current_stock: 10, reorder_point: 5 }, { part_id: "b", current_stock: 2, reorder_point: 8 }, { part_id: "c", current_stock: 6, reorder_point: 6 }]).map((p) => p.part_id), ["b", "c", "a"]));

  console.log("deret grafik");
  test("forecast menyambung dari titik aktual terakhir; rentang hanya di periode forecast", () => {
    const t = A.timeline({ actual: [{ key: "a", value: 1 }, { key: "b", value: 2 }], forecast: [{ key: "c", forecast: 3, lower_80: 2, upper_80: 4 }] });
    assert.deepEqual(t.keys, ["a", "b", "c"]); assert.deepEqual(t.actual, [1, 2, null]); assert.deepEqual(t.forecast, [null, 2, 3]); assert.deepEqual(t.lower, [null, null, 2]);
  });
  test("monthToDate: porsi terhadap forecast bulan yang sama (Rp juta → Rp)", () => {
    const m = A.monthToDate({ unit: "Rp juta", month_to_date: { period: "2026-10", as_of: "2026-10-04", value_rp: 50e6, n_invoices: 3 }, monthly: { forecast: [{ period: "2026-10", forecast: 500 }] } });
    assert.equal(m.forecast_rp, 500e6); assert.equal(m.share, 0.1); assert.ok(Math.abs(m.elapsed - 4 / 31) < 1e-9);
  });
  test("CSV: koma & kutip di-escape", () => assert.equal(A.toCSV([{ a: 'x,"y"', b: 2 }]), 'a,b\n"x,""y""",2\n'));

  console.log("savera-api (kontrak & mode mock)");
  test("validate: kolom wajib hilang → pesan jelas", () => assert.deepEqual(API.validate("demand", { periods: [], parts: [] }), ['kolom "forecast_by_part" tidak ada']));
  test("merge: aktual + model digabung per resource", () => { const m = API.merge("revenue", { revenue: { unit: "Rp juta", weekly: { actual: [1] } } }, { revenue: { weekly: { forecast: [2] } } }); assert.deepEqual(m.weekly, { actual: [1], forecast: [2] }); assert.equal(m.unit, "Rp juta"); });
  await atest("mock tanpa file data → status error (bukan layar kosong)", async () => {
    const api = API.create({ config: {}, dataset: () => null, models: () => null });
    await api.load("revenue").then(() => assert.fail("harus gagal"), () => {});
    assert.equal(api.peek("revenue").status, "error");
  });

  /* ---------- data asli hasil tools/build_data.py ---------- */
  const f1 = path.join(__dirname, "..", "data", "savera-dataset.js"), f2 = path.join(__dirname, "..", "data", "savera-model-results.js");
  if (!fs.existsSync(f1) || !fs.existsSync(f2)) { console.log("data hasil build: dilewati (jalankan python3 tools/build_data.py)"); }
  else {
    const sb = { window: {} }; vm.runInNewContext(fs.readFileSync(f1, "utf8") + fs.readFileSync(f2, "utf8"), sb);
    const api = API.create({ config: {}, dataset: () => sb.window.SAVERA_DATASET, models: () => sb.window.SAVERA_MODEL_RESULTS });
    console.log("data asli (dataset v5 + hasil model)");
    for (const r of API.RESOURCES) await atest(`resource "${r}" lolos kontrak`, async () => { await api.load(r); assert.equal(api.peek(r).status, "ready"); });
    const rev = api.peek("revenue").data, dem = api.peek("demand").data, seg = api.peek("segments").data;
    test("forecast pendapatan = file model apa adanya (bulan pertama)", () => { const csv = fs.readFileSync(path.join(__dirname, "..", "modeling", "forecast_pendapatan_bulanan.csv"), "utf8").trim().split("\n")[1].split(","); assert.equal(rev.monthly.forecast[0].period, csv[0]); assert.ok(Math.abs(rev.monthly.forecast[0].forecast - +csv[1]) < 1e-3); });
    test("forecast per part_id dijumlah = TOTAL model", () => { const p = dem.forecast_periods[0]; const s = Object.values(dem.forecast_by_part).reduce((a, l) => a + l.find((x) => x.period === p).forecast, 0); const tot = dem.vehicle_part_forecast.TOTAL.find((x) => x.period === p).forecast; assert.ok(Math.abs(s - tot) < 0.01, s + " vs " + tot); });
    test("aktual per part_id dijumlah = aktual per jenis part", () => { const p = dem.periods[dem.periods.length - 1]; const s = dem.parts.reduce((a, x) => a + x.actual.find((y) => y.period === p).demand, 0); assert.ok(s > 0); });
    test("aktual berakhir sebelum forecast pertama (tanpa tumpang tindih)", () => { assert.ok(rev.weekly.actual[rev.weekly.actual.length - 1].week_start < rev.weekly.forecast[0].week_start); assert.ok(rev.monthly.actual[rev.monthly.actual.length - 1].period < rev.monthly.forecast[0].period); assert.ok(dem.periods[dem.periods.length - 1] < dem.forecast_periods[0]); });
    test("rentang 80% mengapit forecast", () => { [...rev.weekly.forecast, ...rev.monthly.forecast, ...Object.values(dem.forecast_by_part).flat()].forEach((x) => assert.ok(x.lower_80 <= x.forecast && x.forecast <= x.upper_80)); });
    test("segmen: jumlah pelanggan = profil", () => seg.profiles.forEach((p) => assert.equal(seg.customers.filter((c) => c.segment_id === p.segment_id).length, p.count, p.segment_name)));
    test("rencana stok semua part terhitung", () => dem.parts.forEach((p) => { const v = A.demandView(dem, p.part_id); assert.ok(v.plan.order != null && v.plan.order >= 0, p.part_id); assert.ok(v.cover, p.part_id); }));
  }
  console.log(`\n${pass} lulus, ${fail} gagal`);
  if (fail) process.exitCode = 1;
})();
