/* Jalankan: node tests/assessment-core.test.js  (tanpa dependensi) */
"use strict";
const assert = require("node:assert/strict");
const path = require("node:path");
const R = (f) => require(path.join(__dirname, "..", f));
const core = R("savera-assessment-core.js"), cv = R("savera-cv-adapter.js"), { RAW, finalize } = R("savera-assessment-mock.js");
const PX = require(path.join(__dirname, "fixtures", "pricing-fixture.js"));
const aliases = { part: PX.PART_ALIASES, damage: PX.DAMAGE_ALIASES };

let pass = 0, fail = 0;
const test = (name, fn) => { try { fn(); pass++; console.log("  ✓ " + name); } catch (e) { fail++; console.error("  ✗ " + name + "\n    " + e.message); } };
const clone = (x) => JSON.parse(JSON.stringify(x));
const fresh = () => finalize(core, cv, RAW, aliases)[0];
const ctx = (a, extra) => Object.assign({ match: PX.matchPricing, vehicle: a.vehicle, spareparts: [], inventory: [] }, extra || {});

console.log("formatRupiah");
test("format id-ID tanpa desimal", () => assert.equal(core.formatRupiah(4329000), "Rp 4.329.000"));
test("pembulatan", () => assert.equal(core.formatRupiah(1234.6), "Rp 1.235"));
test("null / NaN / string kosong → —", () => { assert.equal(core.formatRupiah(null), "—"); assert.equal(core.formatRupiah(NaN), "—"); assert.equal(core.formatRupiah(""), "—"); });

console.log("calcSummary");
const rows = [{ include: true, spare_part: 100000, labor: 50000, painting: 0, additional: 10000 }, { include: false, spare_part: 999999, labor: 0, painting: 0, additional: 0 }, { spare_part: 0, labor: 40000, painting: 5000, additional: 0 }];
test("subtotal hanya baris include", () => assert.equal(core.calcSummary(rows, { tax_rate: 0 }).subtotal, 205000));
test("by_category & subtotal = jumlah kategori", () => { const s = core.calcSummary(rows, { tax_rate: 0 }); assert.deepEqual(s.by_category, { spare_part: 100000, labor: 90000, painting: 5000, additional: 10000 }); assert.equal(s.subtotal, Object.values(s.by_category).reduce((a, b) => a + b, 0)); });
test("pajak dari (subtotal − diskon)", () => { const s = core.calcSummary(rows, { discount: 5000, tax_rate: 0.11 }); assert.equal(s.tax, 22000); assert.equal(s.total, 222000); });
test("diskon dibatasi 0..subtotal", () => { assert.equal(core.calcSummary(rows, { discount: 9e9, tax_rate: 0.11 }).total, 0); assert.equal(core.calcSummary(rows, { discount: -5, tax_rate: 0 }).discount, 0); });
test("input tidak diubah (murni)", () => { const c = clone(rows); core.calcSummary(rows, { tax_rate: 0.11 }); assert.deepEqual(rows, c); });

console.log("adapter model");
test("label terpetakan ke kosakata Title Case", () => assert.equal(cv.mapLabel("part", "rear_bumper", PX.PART_ALIASES).value, "Rear Bumper"));
test("label tanpa padanan TIDAK ditebak", () => { const m = cv.mapLabel("part", "side_skirt", PX.PART_ALIASES); assert.equal(m.value, null); assert.equal(m.mapped, false); });
test("label terpetakan walau tanpa kunci harga (harga ditentukan terpisah)", () => { cv.CV_LABEL_MAP.part.zz_test = "Not A Key"; const m = cv.mapLabel("part", "zz_test"); delete cv.CV_LABEL_MAP.part.zz_test; assert.equal(m.value, "Not A Key"); assert.equal(m.known, true); assert.equal(cv.pricingKey("part", "Not A Key", PX.PART_ALIASES), null); });
test("pricingKey: kosakata UI → kunci kamus app.js; kunci yang sudah ada dipakai apa adanya", () => { const A = { bumper: [], headlamp: [] }; assert.equal(cv.pricingKey("part", "Rear Bumper", A), "bumper"); assert.equal(cv.pricingKey("part", "Tail Lamp", A), null); assert.equal(cv.pricingKey("part", "bumper", A), "bumper"); assert.equal(cv.pricingKey("damage_type", "Crack", { dent: [] }), null); });
test("toUiBox YOLO xywhn (tengah) → pojok kiri atas", () => assert.deepEqual(cv.toUiBox({ format: "xywhn", cx: 0.5, cy: 0.5, w: 0.2, h: 0.4 }), { x: 0.4, y: 0.3, w: 0.2, h: 0.4 }));
test("toUiBox xyxy piksel", () => assert.deepEqual(cv.toUiBox({ format: "xyxy", x1: 100, y1: 50, x2: 300, y2: 250 }, 1000, 500), { x: 0.1, y: 0.1, w: 0.2, h: 0.4 }));
test("toUiBox tidak valid → null", () => { assert.equal(cv.toUiBox({ format: "xyxy", x1: 0, y1: 0, x2: 10, y2: 10 }), null); assert.equal(cv.toUiBox({ format: "xywhn", cx: 0.95, cy: 0.5, w: 0.3, h: 0.2 }), null); });
test("normalize: 3 confidence terpisah, tanpa box & damage %", () => { const d = cv.normalizeModelOutput(RAW[0].photos[0].model_output, RAW[0].photos[0], aliases)[0]; assert.equal(d.part, "Front Bumper"); assert.equal(d.part_confidence, 0.91); assert.equal(d.severity_confidence, 0.79); assert.equal(d.bbox, null); assert.equal(d.damage_pct, null); });

console.log("mock AS0001");
const a = fresh(), W0 = core.buildWorking(a, a.review, ctx(a));
test("3 foto, 3 temuan (2 AI + 1 manual)", () => { assert.equal(a.photos.length, 3); assert.equal(W0.findings.length, 3); assert.equal(W0.findings.filter((f) => f.source === "manual").length, 1); });
test("Rear Bumper di foto ke-3 jadi bukti (same_as), bukan temuan ganda", () => { const rb = W0.findings.find((f) => f.current.part === "Rear Bumper"); assert.equal(rb.evidence.length, 1); assert.equal(rb.evidence[0].photo_id, "PH03"); });
test("viewer: Rear Bumper terlihat di 2 foto", () => assert.equal(core.groupFindings(W0.photos).find((g) => g.key === "rear bumper").n_photos, 2));
test("box: AI tanpa box, DT02 box workshop, manual box manual", () => { const by = Object.fromEntries(W0.findings.map((f) => [f.id, f])); assert.equal(by.DT01.bbox, null); assert.equal(by.DT02.bbox_source, "workshop"); assert.equal(by.MN01.bbox_source, "manual"); });
test("validate mock bersih", () => assert.deepEqual(core.validate(a), []));

console.log("pricing (matchPricing 3 tingkat)");
const by = Object.fromEntries(W0.findings.map((f) => [f.id, f]));
test("tier 1: part, damage, severity, brand & model", () => assert.equal(by.DT01.price.tier, 1));
test("tier 2: brand sama, model beda (alias 'Bumper Belakang')", () => { assert.equal(by.DT02.price.tier, 2); assert.equal(by.DT02.line.spare_part, 2850000); });
test("tier 3: hanya part, damage, severity", () => assert.equal(by.MN01.price.tier, 3));
test("initial estimate tiap temuan dalam cost_min–cost_max", () => W0.lines.forEach((l) => assert.ok(core.checkRange(l).inRange, l.detection_id)));
test("summary = calcSummary(lines), PPN 11%", () => { assert.deepEqual(W0.summary, core.calcSummary(W0.lines, a.pricing)); assert.equal(W0.summary.subtotal, 1175000 + 4050000 + 1850000); assert.equal(W0.summary.tax, Math.round(W0.summary.subtotal * 0.11)); });
test("tanpa engine harga → unpriced, total 0, ditandai", () => { const w = core.buildWorking(a, a.review, ctx(a, { match: null })); assert.equal(w.summary.subtotal, 0); assert.equal(w.issues.unpriced.length, 3); assert.equal(w.findings[0].price.reason, "engine_missing"); });
test("label unmapped → Pricing unavailable (reason unmapped)", () => { const b = clone(RAW); b[0].photos[0].model_output.part.label = "side_skirt"; const x = finalize(core, cv, b, aliases)[0], w = core.buildWorking(x, x.review, ctx(x)); const f = w.findings.find((f) => f.id === "DT01"); assert.equal(f.price.reason, "unmapped"); assert.equal(f.line.has_cost, false); assert.ok(w.issues.unmapped.includes("DT01")); });

console.log("review workshop");
test("edit severity → harga referensi baru, Hasil deteksi tetap", () => { const r = clone(a.review); r.edits.DT02 = { severity: "Moderate" }; const w = core.buildWorking(a, r, ctx(a)), f = w.findings.find((x) => x.id === "DT02"); assert.equal(f.original.severity, "Severe"); assert.equal(f.price.tier, 1); assert.equal(core.lineTotal(f.line), 3880000); assert.deepEqual(f.changed, ["severity"]); });
test("uncheck → tidak ikut subtotal", () => { const r = clone(a.review); r.costing.MN01 = { include: false }; const w = core.buildWorking(a, r, ctx(a)); assert.equal(w.summary.subtotal, 1175000 + 4050000); });
test("hapus temuan AI → hilang dari biaya & viewer, tetap tercatat", () => { const r = clone(a.review); r.removed.DT01 = true; const w = core.buildWorking(a, r, ctx(a)); assert.equal(w.lines.length, 2); assert.equal(w.findings.find((f) => f.id === "DT01").removed, true); assert.equal(w.photos[0].detections.length, 0); });
test("override biaya manual → dipakai; reset (hapus override) → kembali otomatis", () => { const r = clone(a.review); r.costing.DT01 = { override: { spare_part: 0, labor: 2000000, painting: 650000, additional: 75000 } }; let w = core.buildWorking(a, r, ctx(a)); let f = w.findings[0]; assert.equal(f.line.manual, true); assert.ok(!core.checkRange(f.line).inRange); assert.ok(w.issues.out_of_range.includes("DT01")); delete r.costing.DT01.override; w = core.buildWorking(a, r, ctx(a)); assert.equal(core.lineTotal(w.findings[0].line), 1175000); });
test("entri manual tanpa data harga → isi manual ikut total", () => { const r = clone(a.review); r.added.push({ id: "MN02", photo_id: "PH01", part: "Hood", damage_type: "Scratch", severity: "Minor", repair_action: "Repaint", bbox: { x: 0.1, y: 0.1, w: 0.2, h: 0.2 } }); let w = core.buildWorking(a, r, ctx(a)); assert.ok(w.issues.unpriced.includes("MN02")); r.costing.MN02 = { override: { spare_part: 0, labor: 100000, painting: 300000, additional: 0 } }; w = core.buildWorking(a, r, ctx(a)); assert.equal(w.issues.unpriced.length, 0); assert.equal(w.summary.subtotal, 1175000 + 4050000 + 1850000 + 400000); });
test("diskon dari review", () => { const r = clone(a.review); r.discount = 75000; const w = core.buildWorking(a, r, ctx(a)); assert.equal(w.summary.discount, 75000); assert.equal(w.summary.tax, Math.round((w.summary.subtotal - 75000) * 0.11)); });
test("action belum dipilih → issue no_action", () => assert.deepEqual(W0.issues.no_action.sort(), ["DT01", "DT02"]));
test("part & stok untuk action Replace", () => { const r = clone(a.review); r.edits.DT02 = { repair_action: "Replace" }; const w = core.buildWorking(a, r, ctx(a, { spareparts: [{ part_id: "PT0201", part_name: "Rear Bumper Assy", vehicle_part: "Rear Bumper", brand: "Mitsubishi", model: "Pajero Sport" }], inventory: [{ part_id: "PT0201", current_stock: 0 }] })); const l = w.findings.find((f) => f.id === "DT02").line; assert.equal(l.part_id, "PT0201"); assert.equal(core.stockStatus(l.stock), "out"); assert.ok(w.issues.out_of_stock.includes("DT02")); });
test("buildWorking tidak mengubah assessment", () => { const b = clone(a); core.buildWorking(a, a.review, ctx(a)); assert.deepEqual(a, b); });

console.log("keputusan");
test("nextId ikut format", () => { assert.equal(core.nextId([{ id: "RO0007" }, { id: "RO0003" }], "id", "RO"), "RO0008"); assert.equal(core.nextId([], "id", "QUE"), "QUE0001"); });
test("invoiceNo = rumus savera-invoice.js", () => assert.equal(core.invoiceNo("RO0042", "2026-10-19"), "INV-2026-0042"));
test("stepper Under Assessment", () => assert.deepEqual(core.stepperModel("Under Assessment").map((s) => s.state), ["done", "current", "todo", "todo", "todo"]));
test("stepper Completed semua done", () => assert.ok(core.stepperModel("Completed").every((s) => s.state === "done")));
test("stepper ditolak → stopped + rejected di Under Assessment", () => { const m = core.stepperModel("Cancelled", { status: "rejected" }); assert.equal(m[1].state, "stopped"); assert.equal(m[1].flag, "rejected"); });
test("stepper revisi", () => assert.equal(core.stepperModel("Under Assessment", { status: "revision" })[1].flag, "revision"));
test("transisi tidak sah ditolak", () => { assert.ok(core.canDecide("Under Assessment", "approve")); assert.ok(!core.canDecide("Completed", "approve")); assert.ok(!core.canDecide("Approved", "reject")); });
test("alasan wajib minimal", () => { assert.ok(!core.validateReason("  pendek ", cv.CONFIG.min_reason)); assert.ok(core.validateReason("foto kurang jelas, mohon ulang", cv.CONFIG.min_reason)); });

console.log("dokumen");
const approved = () => { const x = fresh(), r = clone(x.review); r.edits.DT01 = { repair_action: "Repair" }; r.edits.DT02 = { repair_action: "Replace" }; r.costing.MN01 = { include: false }; r.discount = 50000;
  const w = core.buildWorking(x, r, ctx(x, { spareparts: [{ part_id: "PT0201", part_name: "Rear Bumper Assy", vehicle_part: "Rear Bumper", brand: "Mitsubishi", model: "Pajero Sport" }] }));
  x.review = r; x.costing = w.findings.filter((f) => !f.removed).map((f) => ({ ...f.line, part: f.current.part, damage_type: f.current.damage_type, severity: f.current.severity, repair_action: f.current.repair_action })); x.summary = w.summary;
  x.decision = { status: "approved", at: "2026-10-19", notes: "ok", ro_id: "RO0009", invoice_no: "INV-2026-0009" }; return { x, w }; };
test("belum approved → error", () => assert.equal(core.docModel("invoice", { a: fresh() }).ok, false));
test("invoice: hanya baris include, total = calcSummary snapshot", () => { const { x, w } = approved(); const m = core.docModel("invoice", { a: x, customer: { customer_type: "Individual" }, ro: { repair_order_id: "RO0009", status: "Scheduled" } }); assert.equal(m.rows.length, 2); assert.deepEqual(m.summary, w.summary); assert.equal(m.summary.discount, 50000); assert.equal(m.number, "INV-2026-0009"); assert.equal(m.proforma, true); });
test("invoice final setelah Completed, nomor sama", () => { const { x } = approved(); const m = core.docModel("invoice", { a: x, ro: { repair_order_id: "RO0009", status: "Completed", completed_date: "2026-10-25" } }); assert.equal(m.proforma, false); assert.equal(m.number, "INV-2026-0009"); });
test("Policy/Claim hanya untuk customer_type Insurance", () => { const { x } = approved(); assert.equal(core.docModel("invoice", { a: x, customer: { customer_type: "Insurance" } }).show_insurance, true); assert.equal(core.docModel("invoice", { a: x, customer: { customer_type: "Individual" } }).show_insurance, false); });
test("work order: status reserve", () => { const { x } = approved(); const ro = { repair_order_id: "RO0009", part_id: "PT0201", quantity_required: 1 };
  const rs = (inv, tx) => core.docModel("work_order", { a: x, ro, inventory: inv, tx }).rows.find((r) => r.part_id === "PT0201").reserve;
  assert.equal(rs([{ part_id: "PT0201", current_stock: 3 }], []), "reserve_on_start"); assert.equal(rs([{ part_id: "PT0201", current_stock: 0 }], []), "waiting_part");
  assert.equal(rs([], [{ transaction_type: "OUT", reference_id: "RO0009", part_id: "PT0201" }]), "issued"); assert.equal(core.docModel("work_order", { a: x, ro }).rows.find((r) => !r.part_id).reserve, "not_required"); });

/* ---------- app.js ASLI (PRICING_DATA / PART_ALIASES / DAMAGE_ALIASES / matchPricing) — dilewati bila app.js tidak ada ---------- */
(() => {
  const fs = require("node:fs"), vm = require("node:vm"), file = path.join(__dirname, "..", "app.js");
  if (!fs.existsSync(file)) { console.log("app.js asli: dilewati (file tidak ada)"); return; }
  const src = fs.readFileSync(file, "utf8"), i = src.indexOf("const PRICING_COLS"), j = src.indexOf("// In-session state", i);
  if (i < 0 || j < 0) { test("app.js: blok harga ditemukan", () => assert.fail("penanda PRICING_COLS / In-session state tidak ditemukan")); return; }
  const sb = {}; vm.runInNewContext(src.slice(i, j) + "\nthis.out = { PRICING_DATA, PART_ALIASES, DAMAGE_ALIASES, matchPricing };", sb);
  const R0 = sb.out, al = { part: R0.PART_ALIASES, damage: R0.DAMAGE_ALIASES }, m = cv.pricingMatcher(R0.matchPricing, al);
  console.log("app.js asli (matchPricing tidak diubah)");
  const x = finalize(core, cv, RAW, al)[0], w = core.buildWorking(x, x.review, { match: m, vehicle: x.vehicle, spareparts: [], inventory: [] }), f = Object.fromEntries(w.findings.map((g) => [g.id, g]));
  test("Rear Bumper / Broken / Severe → berharga dari PRICING_DATA asli", () => { assert.equal(f.DT02.price.priced, true); assert.ok([1, 2, 3].includes(f.DT02.price.tier)); assert.equal(f.DT02.line.spare_part, +f.DT02.price.ref.sparePartCost); });
  test("Crack & Tail Lamp tidak punya kunci di app.js → no_match (tidak ditebak)", () => { assert.equal(f.DT01.price.reason, "no_match"); assert.equal(f.MN01.price.reason, "no_match"); });
  test("summary = calcSummary(lines) dengan data asli", () => assert.deepEqual(w.summary, core.calcSummary(w.lines, x.pricing)));
  test("hasil wrapper = matchPricing langsung dengan kunci app.js", () => assert.deepEqual(m("Rear Bumper", "Broken", "severe", "Mitsubishi", "Pajero Sport", 2021), R0.matchPricing("bumper", "broken", "severe", "Mitsubishi", "Pajero Sport", 2021)));
})();

module.exports = { test, core, cv, PX, fresh, ctx, clone, done: () => { console.log(`\n${pass} lulus, ${fail} gagal`); if (fail) process.exitCode = 1; } };
if (require.main === module) module.exports.done();
