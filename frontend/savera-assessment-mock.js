/* SAVERA — Mock assessment terstruktur (DEMO / SYNTHETIC).
   Muat SETELAH savera-assessment-core.js + savera-cv-adapter.js + savera-data*.js, SEBELUM savera-v2.js.

   Bentuk data mengikuti model yang sebenarnya (klasifikasi, 3 keluaran terpisah per foto):
   - photos[].model_output = keluaran mentah model (label + confidence), dipetakan lewat savera-cv-adapter.js
   - photos[].detections   = hasil normalisasi adapter (diisi saat dimuat); deteksi part yang sama di foto lain → same_as
   - review                = hasil kerja workshop (edit, hapus, entri manual, box yang digambar, override biaya, diskon)
   - costing / summary     = SNAPSHOT saat Approve (selama belum diputuskan dihitung langsung dari buildWorking + matchPricing)
   Tidak ada angka biaya di sini: biaya otomatis selalu dari matchPricing() (PRICING_DATA di app.js). */
(function (root) {
  "use strict";
  const RAW = [
    {
      assessment_id: "AS0001",
      service_request_id: null, /* diisi saat ditautkan ke SAVERA_DEMO */
      created_at: "2026-10-19T09:30:00+07:00",
      cv_model_version: "ensemble-convnext-dinov2-vit (demo)",
      vehicle: { brand: "Mitsubishi", model: "Pajero Sport", year: 2021, plate_number: "B 1721 SVR", color: "White Pearl", vehicle_type: "SUV", transmission: "Automatic", fuel_type: "Diesel" },
      customer: { customer_name: "Rahmat Hidayat", phone: "081298765432", email: "rahmat.hidayat@demo.savera.id", address: "Jl. Kemang Raya No. 21, Jakarta Selatan", city: "Jakarta", customer_type: "Insurance" },
      insurance: { insurer: "PT Asuransi Demo Sejahtera", policy_no: "POL-2026-0417", claim_no: "CLM-2026-1093" },
      complaint: "Bumper depan retak, bumper belakang lepas dan lampu belakang kanan pecah setelah tabrakan",
      photos: [
        { id: "PH01", angle: "front", url: "assets/demo/as0001-front.jpg", width: 1280, height: 715, captured_at: "2026-10-19T09:12:00+07:00",
          model_output: { id: "DT01", part: { label: "front_bumper", confidence: 0.91 }, damage_type: { label: "crack", confidence: 0.84 }, severity: { label: "moderate", confidence: 0.79 } } },
        { id: "PH02", angle: "rear", url: "assets/demo/as0001-rear.jpg", width: 1280, height: 720, captured_at: "2026-10-19T09:14:00+07:00",
          model_output: { id: "DT02", part: { label: "rear_bumper", confidence: 0.95 }, damage_type: { label: "broken", confidence: 0.9 }, severity: { label: "severe", confidence: 0.93 } } },
        { id: "PH03", angle: "right", url: "assets/demo/as0001-right.jpg", width: 800, height: 1000, captured_at: "2026-10-19T09:15:00+07:00",
          model_output: { id: "DT04", part: { label: "rear_bumper", confidence: 0.88 }, damage_type: { label: "dent", confidence: 0.71 }, severity: { label: "moderate", confidence: 0.66 } } },
      ],
      /* pekerjaan workshop yang sudah tersimpan (demo): 1 entri manual dengan box + 1 box penanda lokasi untuk temuan AI */
      review: {
        edits: {}, removed: {}, costing: {}, discount: null, notes: "",
        added: [{ id: "MN01", photo_id: "PH03", source: "manual", part: "Tail Lamp", damage_type: "Crack", severity: "Moderate", repair_action: "Replace", damage_pct: null,
          bbox: { x: 0.44, y: 0.045, w: 0.18, h: 0.5 }, added_by: "Workshop Admin" }],
        boxes: { DT02: { x: 0.487, y: 0.658, w: 0.198, h: 0.32 } },
      },
      pricing: { discount: 0, tax_rate: 0.11 },
      costing: null, summary: null,
      decision: { status: "pending", by: null, at: null, notes: "" },
      documents: [],
    },
  ];

  /* finalize: salinan + normalisasi keluaran model lewat adapter + tautan duplikat */
  function finalize(core, cv, list, aliases) {
    return (list || RAW).map((src) => {
      const a = JSON.parse(JSON.stringify(src));
      a.photos.forEach((p) => (p.detections = cv.normalizeModelOutput(p.model_output, p, aliases)));
      core.linkDuplicates(a.photos);
      return a;
    });
  }

  if (typeof module !== "undefined" && module.exports) { module.exports = { RAW, finalize }; return; }

  const core = root.SAVERA_ASSESSMENT, cv = root.SAVERA_CV;
  if (!core || !cv) { console.error("[assessment-mock] savera-assessment-core.js / savera-cv-adapter.js belum dimuat"); return; }
  const aliases = { part: typeof PART_ALIASES !== "undefined" ? PART_ALIASES : null, damage: typeof DAMAGE_ALIASES !== "undefined" ? DAMAGE_ALIASES : null };
  const list = finalize(core, cv, RAW, aliases);
  core.mock = list;
  core.byId = (id) => list.find((a) => a.assessment_id === id) || null;
  core.forSR = (sr) => (sr && sr.assessment_id ? core.byId(sr.assessment_id) : null);

  /* ---------- tautkan ke SAVERA_DEMO supaya muncul di Workshop & Customer ---------- */
  const D = root.SAVERA_DEMO;
  if (!D || !Array.isArray(D.service_requests)) return;
  const match = typeof matchPricing === "function" ? cv.pricingMatcher(matchPricing, aliases) : null; /* + penerjemah kosakata (adapter) */
  list.forEach((a) => {
    if (D.service_requests.some((s) => s.assessment_id === a.assessment_id)) return;
    D.customers = D.customers || []; D.vehicles = D.vehicles || [];
    let cust = D.customers.find((c) => String(c.email).toLowerCase() === a.customer.email);
    if (!cust) { cust = { customer_id: core.nextId(D.customers, "customer_id", "C"), ...a.customer, registration_date: a.created_at.slice(0, 10), status: "Active" }; D.customers.push(cust); }
    let veh = D.vehicles.find((v) => String(v.plate_number).replace(/\s/g, "") === a.vehicle.plate_number.replace(/\s/g, ""));
    if (!veh) { veh = { vehicle_id: core.nextId(D.vehicles, "vehicle_id", "VH"), customer_id: cust.customer_id, ...a.vehicle }; D.vehicles.push(veh); }
    const w = core.buildWorking(a, a.review, { match, vehicle: a.vehicle, spareparts: D.spareparts, inventory: D.inventory });
    const main = w.findings.filter((f) => !f.removed).sort((x, y) => core.sevRank(y.current.severity) - core.sevRank(x.current.severity))[0] || null;
    a.service_request_id = a.service_request_id || core.nextId(D.service_requests, "service_request_id", "SR");
    const c = main ? main.current : {};
    D.service_requests.push({
      service_request_id: a.service_request_id, request_date: a.created_at.slice(0, 10), customer_id: cust.customer_id, vehicle_id: veh.vehicle_id,
      brand: veh.brand, model: veh.model, year: veh.year, plate_number: veh.plate_number, customer_complaint: a.complaint,
      service_type: (main && main.service_type) || "Body Repair", photo_count: a.photos.length, photos: a.photos.map((p) => p.url),
      initial_damage_area: c.part || "–", initial_damage_type: c.damage_type || "–", initial_severity: c.severity || "Moderate",
      initial_estimated_cost: w.summary.total, request_status: "Under Assessment", workshop_notes: "",
      assessment: { area: c.part, type: c.damage_type, severity: c.severity, pct: null, action: c.repair_action, conf: c.part_confidence ?? null, service: main && main.service_type, cost: w.summary.total },
      assessment_id: a.assessment_id,
    });
  });
})(typeof window !== "undefined" ? window : globalThis);
