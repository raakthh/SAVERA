/* SAVERA — Assessment core: fungsi MURNI (tanpa DOM, tanpa state global).
   Dipakai di browser (window.SAVERA_ASSESSMENT) dan Node (module.exports) untuk tes.
   Muat SEBELUM savera-assessment-mock.js. Tidak mengubah logika CV/model — hanya mengolah hasilnya. */
(function (root) {
  "use strict";

  /* ---------- enum + label 2 bahasa (en / id) ---------- */
  const SEVERITIES = ["Minor", "Moderate", "Severe"];
  const SEVERITY_RANK = { minor: 1, moderate: 2, severe: 3 };
  const ANGLES = ["front", "front_left", "front_right", "left", "right", "rear", "rear_left", "rear_right", "top", "detail"];
  const LABELS = {
    angle: {
      front: { en: "Front", id: "Depan" }, front_left: { en: "Front left", id: "Depan kiri" }, front_right: { en: "Front right", id: "Depan kanan" },
      left: { en: "Left", id: "Kiri" }, right: { en: "Right", id: "Kanan" }, rear: { en: "Rear", id: "Belakang" },
      rear_left: { en: "Rear left", id: "Belakang kiri" }, rear_right: { en: "Rear right", id: "Belakang kanan" }, top: { en: "Top", id: "Atas" }, detail: { en: "Close-up", id: "Close-up" },
    },
    severity: { Minor: { en: "Minor", id: "Ringan" }, Moderate: { en: "Moderate", id: "Sedang" }, Severe: { en: "Severe", id: "Berat" } },
    source: { ai: { en: "AI", id: "AI" }, manual: { en: "Manual", id: "Manual" }, mixed: { en: "AI + Manual", id: "AI + Manual" } },
    decision: { pending: { en: "Pending", id: "Menunggu" }, approved: { en: "Approved", id: "Disetujui" }, rejected: { en: "Rejected", id: "Ditolak" }, revision: { en: "Needs revision", id: "Perlu revisi" } },
    repair_action: { Repair: { en: "Repair", id: "Perbaiki" }, Replace: { en: "Replace", id: "Ganti" }, Repaint: { en: "Repaint", id: "Cat ulang" } },
  };
  /* label(group, key, lang) → teks; jatuh ke key aslinya bila tidak ada terjemahan */
  const label = (group, key, lang) => { const g = LABELS[group] || {}, e = g[key]; return e ? e[lang] || e.en : key == null ? "" : String(key); };

  const num = (v) => (Number.isFinite(+v) ? +v : 0);
  const sevRank = (s) => SEVERITY_RANK[String(s || "").toLowerCase()] || 0;

  /* ---------- uang ---------- */
  const IDR = typeof Intl !== "undefined" ? new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0, maximumFractionDigits: 0 }) : null;
  /* formatRupiah(4329000) → "Rp 4.329.000" (spasi biasa); null/NaN → "—" */
  function formatRupiah(n) {
    if (n === null || n === undefined || n === "" || !Number.isFinite(+n)) return "—";
    const v = Math.round(+n);
    if (IDR) return IDR.format(v).replace(/ /g, " ");
    return (v < 0 ? "-Rp " : "Rp ") + Math.abs(v).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  }

  /* ---------- biaya ---------- */
  const COST_FIELDS = ["spare_part", "labor", "painting", "additional"];
  /* total satu baris costing = jumlah komponennya (satu-satunya rumus total baris) */
  const lineTotal = (c) => COST_FIELDS.reduce((a, k) => a + num(c && c[k]), 0);

  /* calcSummary(costing, { discount, tax_rate }) → { subtotal, discount, tax_rate, tax, total, by_category }
     - subtotal: hanya baris include !== false; = jumlah by_category
     - discount: nominal rupiah, dibatasi 0..subtotal
     - tax: round((subtotal − discount) × tax_rate); tax_rate diambil dari input, bukan dari fungsi */
  function calcSummary(costing, pricing) {
    const rows = (Array.isArray(costing) ? costing : []).filter((c) => c && c.include !== false), p = pricing || {};
    const by_category = Object.fromEntries(COST_FIELDS.map((k) => [k, Math.round(rows.reduce((a, c) => a + num(c[k]), 0))]));
    const subtotal = COST_FIELDS.reduce((a, k) => a + by_category[k], 0);
    const discount = Math.round(Math.min(Math.max(num(p.discount), 0), subtotal));
    const tax_rate = Math.max(num(p.tax_rate), 0);
    const tax = Math.round((subtotal - discount) * tax_rate);
    return { subtotal, discount, tax_rate, tax, total: subtotal - discount + tax, by_category };
  }

  /* checkRange(baris) → apakah total baris ada di rentang cost_min..cost_max */
  function checkRange(c) {
    const total = lineTotal(c), min = c && c.cost_min != null ? num(c.cost_min) : null, max = c && c.cost_max != null ? num(c.cost_max) : null;
    const below = min != null && total < min, above = max != null && total > max;
    return { total, min, max, below, above, inRange: !below && !above };
  }

  /* stockStatus({ on_hand, required }) → "ok" | "low" | "out" | null (tidak butuh part) */
  function stockStatus(st) {
    if (!st || !num(st.required)) return null;
    const have = num(st.on_hand), need = num(st.required);
    return have <= 0 ? "out" : have < need ? "low" : "ok";
  }

  /* ---------- deteksi ---------- */
  const detectionsOf = (a) => ((a && a.photos) || []).flatMap((p, pi) => (p.detections || []).map((d) => ({ d, photo: p, photoIndex: pi })));
  const partKey = (s) => String(s || "").trim().toLowerCase().replace(/\s+/g, " ");

  /* groupFindings(photos) → satu baris per part (gabungan semua foto), urut severity lalu damage %:
     { key, part, severity, confidence (maks dari deteksi AI; null bila semua manual), damage_pct (maks),
       damage_types[], repair_actions[], source "ai"|"manual"|"mixed", photo_ids[], n_photos, detection_ids[], first { photoIndex, detectionId } } */
  function groupFindings(photos) {
    const map = new Map();
    (photos || []).forEach((p, pi) => (p && p.detections ? p.detections : []).forEach((d) => {
      if (!d) return;
      const k = partKey(d.part); if (!k) return;
      let g = map.get(k);
      if (!g) { g = { key: k, part: d.part, severity: d.severity, confidence: null, damage_pct: null, damage_types: [], repair_actions: [], sources: new Set(), photo_ids: [], detection_ids: [], first: { photoIndex: pi, detectionId: d.id } }; map.set(k, g); }
      if (sevRank(d.severity) > sevRank(g.severity)) g.severity = d.severity;
      if (d.source !== "manual" && d.confidence != null && Number.isFinite(+d.confidence)) g.confidence = g.confidence == null ? +d.confidence : Math.max(g.confidence, +d.confidence);
      if (d.damage_pct != null && Number.isFinite(+d.damage_pct)) g.damage_pct = g.damage_pct == null ? +d.damage_pct : Math.max(g.damage_pct, +d.damage_pct);
      if (d.damage_type && !g.damage_types.includes(d.damage_type)) g.damage_types.push(d.damage_type);
      if (d.repair_action && !g.repair_actions.includes(d.repair_action)) g.repair_actions.push(d.repair_action);
      g.sources.add(d.source === "manual" ? "manual" : "ai");
      if (!g.photo_ids.includes(p.id)) g.photo_ids.push(p.id);
      g.detection_ids.push(d.id);
    }));
    return [...map.values()].map((g) => {
      const { sources, ...rest } = g;
      return { ...rest, source: sources.size > 1 ? "mixed" : [...sources][0], n_photos: g.photo_ids.length };
    }).sort((a, b) => sevRank(b.severity) - sevRank(a.severity) || num(b.damage_pct) - num(a.damage_pct));
  }

  /* validate(assessment) → daftar masalah (string) untuk banner error; [] bila aman */
  function validate(a) {
    const out = [];
    if (!a || typeof a !== "object") return ["assessment kosong"];
    if (!Array.isArray(a.photos)) out.push("photos bukan array");
    (a.photos || []).forEach((p, i) => {
      if (!p || !p.id) out.push(`photos[${i}] tanpa id`);
      (p && p.detections || []).forEach((d, j) => {
        if (!d || !(d.part || (d.cv_label && d.cv_label.part))) out.push(`photos[${i}].detections[${j}] tanpa part`);
        const b = d && d.bbox;
        if (b && [b.x, b.y, b.w, b.h].some((v) => !Number.isFinite(+v) || +v < 0 || +v > 1)) out.push(`bbox ${d.id || j} di luar 0–1`);
      });
    });
    return out;
  }

  /* ================= Tahap 3–4: working model (hasil CV + review workshop) ================= */
  const REPAIR_ACTIONS = ["Repair", "Replace", "Repaint"];
  const EDIT_FIELDS = ["part", "damage_type", "severity", "repair_action", "damage_pct"];

  /* deteksi pertama untuk suatu part = utama; foto lain dengan part sama → same_as (bukti tambahan, tanpa biaya ganda) */
  function linkDuplicates(photos) {
    const first = {};
    (photos || []).forEach((p) => (p.detections || []).forEach((d) => {
      const k = partKey(d.part || (d.cv_label && d.cv_label.part)); if (!k || d.same_as) return;
      if (first[k]) d.same_as = first[k]; else first[k] = d.id;
    }));
    return photos;
  }

  /* serviceFor: aturan yang sama dengan svcFor() di savera-workshop.js */
  const serviceFor = (part, action) => (action === "Replace" ? "Part Replacement" : action === "Repaint" ? "Paint Repair" : action === "Repair" ? (partKey(part) === "windshield" ? "Glass Repair" : "Body Repair") : null);

  /* findPart: urutan pencarian yang sama dengan partFor() di savera-workshop.js (model → brand → part saja) */
  function findPart(spareparts, part, brand, model) {
    const L = (s) => String(s || "").toLowerCase(), list = spareparts || [];
    return list.find((p) => L(p.vehicle_part) === L(part) && p.brand === brand && p.model === model) || list.find((p) => L(p.vehicle_part) === L(part) && p.brand === brand) || list.find((p) => L(p.vehicle_part) === L(part)) || null;
  }

  const TIER_FIELDS = { 1: ["part", "damage", "severity", "brand", "model"], 2: ["part", "damage", "severity", "brand"], 3: ["part", "damage", "severity"] };
  /* priceFinding: memanggil matchPricing() (di-inject; logika tiga tingkat TIDAK diubah) → biaya otomatis per komponen */
  function priceFinding(f, vehicle, match) {
    if (typeof match !== "function") return { priced: false, reason: "engine_missing" };
    if (!f || !f.part || !f.damage_type || !f.severity) return { priced: false, reason: f && f.unmapped && f.unmapped.length ? "unmapped" : "incomplete" };
    const v = vehicle || {}, m = match(f.part, f.damage_type, String(f.severity).toLowerCase(), v.brand, v.model, v.year);
    if (!m || !m.record) return { priced: false, reason: "no_match" };
    const r = m.record;
    return { priced: true, tier: m.tier, matched: TIER_FIELDS[m.tier] || [], ref: r,
      auto: { spare_part: num(r.sparePartCost), labor: num(r.laborCost), painting: num(r.paintingCost), additional: num(r.additionalCost) },
      cost_min: r.costMin != null ? num(r.costMin) : null, cost_max: r.costMax != null ? num(r.costMax) : null,
      dataset_total: r.estimatedTotalCost != null ? num(r.estimatedTotalCost) : null, suggested_action: r.repairAction || r.repair_action || null };
  }

  const changedFields = (orig, cur) => (orig ? EDIT_FIELDS.filter((k) => (orig[k] ?? null) !== (cur[k] ?? null)) : []);
  const emptyReview = () => ({ edits: {}, removed: {}, added: [], boxes: {}, costing: {}, discount: null, notes: "" });

  /* buildWorking(a, review, ctx) — MURNI. ctx = { match, vehicle, spareparts, inventory }
     → { findings[], photos[] (untuk viewer), lines[] (costing), summary, issues } */
  function buildWorking(a, review, ctx) {
    const rv = Object.assign(emptyReview(), review || {}), c = ctx || {}, veh = c.vehicle || (a && a.vehicle) || {};
    const photos = (a && a.photos) || [], findings = [];
    const evidenceOf = (id) => photos.flatMap((p) => (p.detections || []).filter((d) => d.same_as === id).map((d) => ({ detection_id: d.id, photo_id: p.id })));
    const primaries = photos.flatMap((p) => (p.detections || []).filter((d) => !d.same_as).map((d) => ({ d, photo_id: p.id })))
      .concat((rv.added || []).map((d) => ({ d: Object.assign({ source: "manual" }, d), photo_id: d.photo_id })));
    primaries.forEach(({ d, photo_id }, i) => {
      const manual = d.source === "manual", orig = manual ? null : d, cur = Object.assign({}, d, rv.edits[d.id] || {});
      if (cur.repair_action == null) cur.repair_action = null;
      const hasBox = Object.prototype.hasOwnProperty.call(rv.boxes, d.id);
      const bbox = hasBox ? rv.boxes[d.id] : d.bbox || null;
      const bbox_source = !bbox ? null : manual ? "manual" : hasBox ? "workshop" : d.bbox_source || "ai";
      const price = priceFinding(cur, veh, c.match), priceOrig = orig ? priceFinding(orig, veh, c.match) : null;
      if (cur.repair_action == null && price.priced && price.suggested_action) cur.suggested_action = price.suggested_action;
      const cc = rv.costing[d.id] || {}, override = cc.override || null, base = override || (price.priced ? price.auto : null);
      const part = cur.repair_action === "Replace" ? findPart(c.spareparts, cur.part, veh.brand, veh.model) : null;
      const inv = part && (c.inventory || []).find((x) => x.part_id === part.part_id);
      const line = { detection_id: d.id, include: cc.include !== false, priced: price.priced, manual: !!override, tier: price.tier || null, matched: price.matched || [],
        reason: price.priced ? null : price.reason, spare_part: base ? num(base.spare_part) : 0, labor: base ? num(base.labor) : 0, painting: base ? num(base.painting) : 0, additional: base ? num(base.additional) : 0,
        cost_min: price.priced ? price.cost_min : null, cost_max: price.priced ? price.cost_max : null, auto: price.priced ? price.auto : null,
        part_id: part ? part.part_id : null, part_name: part ? part.part_name : null, stock: part ? { on_hand: inv ? num(inv.current_stock) : 0, required: 1 } : null };
      line.has_cost = price.priced || !!override;
      findings.push({ index: i + 1, id: d.id, photo_id, source: manual ? "manual" : "ai", original: orig, current: cur, removed: !!rv.removed[d.id],
        changed: changedFields(orig, cur), bbox, bbox_source, evidence: manual ? [] : evidenceOf(d.id), price, price_original: priceOrig, line,
        service_type: serviceFor(cur.part, cur.repair_action), service_type_original: orig ? serviceFor(orig.part, orig.repair_action) : null });
    });
    const active = findings.filter((f) => !f.removed), lines = active.map((f) => f.line);
    const pricing = { discount: rv.discount != null ? rv.discount : a && a.pricing ? a.pricing.discount : 0, tax_rate: a && a.pricing ? a.pricing.tax_rate : 0 };
    const summary = calcSummary(lines, pricing);
    /* foto untuk viewer: deteksi aktif (hasil edit) + bukti duplikat */
    const byPhoto = {};
    active.forEach((f) => {
      (byPhoto[f.photo_id] = byPhoto[f.photo_id] || []).push({ id: f.id, part: f.current.part || (f.current.cv_label && f.current.cv_label.part), damage_type: f.current.damage_type, severity: f.current.severity,
        damage_pct: f.current.damage_pct ?? null, confidence: f.source === "ai" ? f.current.part_confidence ?? null : null, source: f.source, bbox: f.bbox, bbox_source: f.bbox_source, service_type: f.service_type, repair_action: f.current.repair_action });
      f.evidence.forEach((e) => { const src = photos.find((p) => p.id === e.photo_id), d0 = src && src.detections.find((x) => x.id === e.detection_id);
        (byPhoto[e.photo_id] = byPhoto[e.photo_id] || []).push({ id: e.detection_id, same_as: f.id, part: f.current.part, damage_type: f.current.damage_type, severity: f.current.severity, damage_pct: null,
          confidence: d0 ? d0.part_confidence ?? null : null, source: "ai", bbox: d0 ? d0.bbox || null : null, bbox_source: d0 && d0.bbox ? "ai" : null, service_type: f.service_type, repair_action: f.current.repair_action }); });
    });
    const vPhotos = photos.map((p) => ({ ...p, detections: byPhoto[p.id] || [] }));
    const inc = active.filter((f) => f.line.include);
    const issues = {
      unpriced: inc.filter((f) => !f.line.has_cost).map((f) => f.id),
      no_action: inc.filter((f) => !f.current.repair_action).map((f) => f.id),
      out_of_range: inc.filter((f) => f.line.has_cost && !checkRange(f.line).inRange).map((f) => f.id),
      out_of_stock: inc.filter((f) => f.line.stock && stockStatus(f.line.stock) !== "ok").map((f) => f.id),
      unmapped: active.filter((f) => f.current.unmapped && f.current.unmapped.length && (!f.current.part || !f.current.damage_type || !f.current.severity)).map((f) => f.id),
    };
    return { findings, photos: vPhotos, lines, summary, issues, included: inc.length };
  }

  /* ================= Tahap 5: keputusan ================= */
  const STEPS = ["Submitted", "Under Assessment", "Approved", "In Repair", "Completed"];
  /* nextId(list, key, prefix) — ikut format yang ada: prefix + nomor 4 digit (RO0007 → RO0008) */
  const nextId = (list, key, prefix) => prefix + String((list || []).reduce((m, x) => Math.max(m, parseInt(String(x && x[key]).replace(/\D/g, ""), 10) || 0), 0) + 1).padStart(4, "0");
  /* invoiceNo: rumus yang sama dengan build() di savera-invoice.js → INV-YYYY-#### dari tahun tanggal + angka RO */
  const invoiceNo = (roId, date) => `INV-${String(date || "").slice(0, 4) || "0000"}-${String(parseInt(String(roId).replace(/\D/g, ""), 10) || 0).padStart(4, "0")}`;
  /* stepperModel(status, decision) → [{ key, state: done|current|todo|stopped, flag: null|revision|rejected }] */
  function stepperModel(status, decision) {
    const dec = decision && decision.status, rejected = status === "Cancelled" || dec === "rejected";
    let i = STEPS.indexOf(status);
    if (rejected) i = dec === "approved" ? 2 : 1; /* ditolak saat assessment */
    if (i < 0) i = 0;
    return STEPS.map((key, k) => ({ key, state: rejected ? (k < i ? "done" : k === i ? "stopped" : "todo") : k < i || (k === i && key === "Completed") ? "done" : k === i ? "current" : "todo",
      flag: rejected && k === i ? "rejected" : !rejected && dec === "revision" && key === "Under Assessment" && k === i ? "revision" : null }));
  }
  const DECISION_FROM = ["Submitted", "Under Assessment"];
  const canDecide = (status, action) => ["approve", "revision", "reject"].includes(action) && DECISION_FROM.includes(status);
  const validateReason = (s, min) => String(s || "").trim().length >= (min || 1);

  /* ================= Tahap 6: dokumen ================= */
  /* reserveStatus: dari data yang ada (transaksi OUT untuk RO, stok live). RO lama masih satu part → part lain "not_managed" */
  function reserveStatus(row, ro, tx, inventory) {
    if (!row.part_id) return "not_required";
    if (!ro || row.part_id !== ro.part_id) return "not_managed";
    if ((tx || []).some((x) => x.transaction_type === "OUT" && x.reference_id === ro.repair_order_id && x.part_id === row.part_id)) return "issued";
    const inv = (inventory || []).find((i) => i.part_id === row.part_id), need = num(ro.quantity_required) || 1;
    return inv && num(inv.current_stock) >= need ? "reserve_on_start" : "waiting_part";
  }
  /* docModel(kind "invoice"|"work_order", { a, sr, customer, ro, queue, inventory, tx }) → data dokumen (tanpa HTML).
     Baris = snapshot costing saat Approve yang include; summary dihitung ULANG dari field (bukan disalin). */
  function docModel(kind, x) {
    const a = x && x.a, ro = x && x.ro;
    if (!a || !a.decision || a.decision.status !== "approved" || !Array.isArray(a.costing)) return { ok: false, error: "not_approved" };
    const cu = x.customer || {}, rows = a.costing.filter((c) => c.include !== false).map((c) => ({ ...c, total: lineTotal(c),
      reserve: kind === "work_order" ? reserveStatus(c, ro, x.tx, x.inventory) : undefined,
      stock_now: c.part_id ? (((x.inventory || []).find((i) => i.part_id === c.part_id) || {}).current_stock ?? null) : null }));
    const summary = calcSummary(rows, { discount: a.summary ? a.summary.discount : a.pricing && a.pricing.discount, tax_rate: a.pricing ? a.pricing.tax_rate : 0 });
    const completed = !!ro && (ro.status === "Completed" || (x.sr && x.sr.request_status === "Completed"));
    return { ok: true, kind, number: kind === "invoice" ? a.decision.invoice_no : a.decision.ro_id, ro_id: a.decision.ro_id, invoice_no: a.decision.invoice_no, issued_at: a.decision.at, completed_at: ro && ro.completed_date || null,
      proforma: kind === "invoice" && !completed, payment: ro ? ro.payment_status || "Unpaid" : "Unpaid", paid_at: ro ? ro.paid_date || null : null, ro_status: ro ? ro.status : null,
      customer: cu, vehicle: a.vehicle || {}, insurance: cu.customer_type === "Insurance" ? a.insurance || null : null, show_insurance: cu.customer_type === "Insurance" && !!a.insurance,
      sr_id: x.sr ? x.sr.service_request_id : a.service_request_id, assessment_id: a.assessment_id, complaint: a.complaint, rows, summary,
      notes: a.decision.notes || "", repair_days: ro ? ro.estimated_repair_days ?? null : null, queue_number: x.queue ? x.queue.queue_number : null, empty: rows.length === 0 };
  }

  const api = { reserveStatus, docModel, SEVERITIES, SEVERITY_RANK, ANGLES, LABELS, COST_FIELDS, REPAIR_ACTIONS, STEPS, label, sevRank, formatRupiah, lineTotal, calcSummary, checkRange, stockStatus, detectionsOf, groupFindings, validate,
    linkDuplicates, serviceFor, findPart, priceFinding, changedFields, emptyReview, buildWorking, nextId, invoiceNo, stepperModel, canDecide, validateReason };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.SAVERA_ASSESSMENT = Object.assign(root.SAVERA_ASSESSMENT || {}, api);
})(typeof window !== "undefined" ? window : globalThis);
