/* SAVERA — Adapter keluaran model CV → struktur UI. SATU-SATUNYA tempat yang perlu diisi/diubah
   saat tim model mengirim daftar kelas & contoh JSON. Tidak mengubah logika model; hanya memetakan.

   Model saat ini (info tim model): klasifikasi gambar (ConvNeXt / DINOv2 / ViT, ensemble) dengan 3 keluaran
   TERPISAH per foto: part, damage_type, severity — masing-masing label + confidence. TIDAK ada bounding box
   dan TIDAK ada damage %. Box hanya dari workshop (digambar manual) sampai ada model deteksi (mis. YOLO).

   Bentuk input yang diasumsikan untuk normalizeModelOutput() — SESUAIKAN bila JSON asli berbeda:
     { part: { label, confidence }, damage_type: { label, confidence }, severity: { label, confidence },
       boxes?: [ { format: "xywhn"|"xyxy", ... } ] }                                           */
(function (root) {
  "use strict";

  /* Label model → kosakata UI (Title Case, sama dengan data SR/sparepart: "Rear Bumper", "Headlamp", "Tail Lamp").
     Label yang TIDAK ada di sini = "Unmapped" → tidak ditebak, harga "Pricing data unavailable".
     TODO tim model: lengkapi dengan daftar kelas asli. Entri di bawah baru label dari mock. */
  const CV_LABEL_MAP = {
    part: {
      front_bumper: "Front Bumper",
      rear_bumper: "Rear Bumper",
      tail_lamp: "Tail Lamp",
      headlamp: "Headlamp",
    },
    damage_type: {
      dent: "Dent",
      scratch: "Scratch",
      crack: "Crack",
      broken: "Broken",
    },
    severity: { minor: "Minor", moderate: "Moderate", severe: "Severe" },
  };

  /* Kosakata UI → kunci kamus matchPricing() di app.js (PART_ALIASES / DAMAGE_ALIASES, huruf kecil & generik).
     app.js sengaja membiarkan sebagian tanpa padanan (mis. "crack", tail lamp) → "Pricing data unavailable", tidak ditebak.
     Catatan: kunci "bumper" di app.js mencakup Front + Rear Bumper sekaligus (logika app.js, tidak diubah). */
  const PRICING_KEY = {
    part: { "Front Bumper": "bumper", "Rear Bumper": "bumper", "Front Door": "door", "Rear Door": "door", "Fender": "fender", "Rear Fender": "fender", "Headlamp": "headlamp", "Windshield": "windshield" },
    damage_type: { Dent: "dent", Broken: "broken", Scratch: "scratch", Shatter: "shatter" },
  };
  const has = (o, k) => !!o && k != null && Object.prototype.hasOwnProperty.call(o, k);
  /* pricingKey("part", "Rear Bumper", PART_ALIASES) → "bumper" | null. Nilai yang sudah berupa kunci kamus dipakai apa adanya. */
  function pricingKey(kind, value, aliases) {
    if (value == null) return null;
    if (has(aliases, value)) return value;
    const k = (PRICING_KEY[kind] || {})[value];
    return k != null && (!aliases || has(aliases, k)) ? k : null;
  }
  /* pricingMatcher(matchPricing, { part, damage }) → fungsi bertanda tangan sama dengan matchPricing; menerjemahkan kosakata saja */
  function pricingMatcher(match, aliases) {
    if (typeof match !== "function") return null;
    const a = aliases || {};
    return (part, damageType, severity, brand, model, year) => {
      const p = pricingKey("part", part, a.part), d = pricingKey("damage_type", damageType, a.damage);
      return p && d ? match(p, d, severity, brand, model, year) : null;
    };
  }

  /* Konfigurasi UI terkait data model (bukan logika model) */
  const CONFIG = {
    min_box: 0.02,       /* box gambar manual minimal 2% lebar & tinggi foto */
    min_reason: 10,      /* alasan Reject / Request revision minimal 10 karakter */
  };

  const norm = (s) => String(s ?? "").trim().toLowerCase().replace(/[\s-]+/g, "_");

  /* mapLabel("part", "rear_bumper") → { label, value|null, mapped, known }
     known = label punya padanan di CV_LABEL_MAP. Ada/tidaknya harga ditentukan terpisah (pricingKey → matchPricing). */
  function mapLabel(kind, raw) {
    const table = CV_LABEL_MAP[kind] || {}, value = table[norm(raw)] ?? null;
    return { label: raw ?? null, value, mapped: value != null, known: value != null };
  }

  /* Konversi box model → format UI { x, y, w, h } relatif 0–1 dari pojok kiri atas. null bila tidak valid. */
  function toUiBox(b, imgW, imgH) {
    if (!b) return null;
    let x, y, w, h;
    if (b.format === "xywhn") { w = +b.w; h = +b.h; x = +b.cx - w / 2; y = +b.cy - h / 2; }          /* YOLO: titik tengah */
    else if (b.format === "xyxy") { const W = +imgW, H = +imgH; if (!(W > 0 && H > 0)) return null; x = b.x1 / W; y = b.y1 / H; w = (b.x2 - b.x1) / W; h = (b.y2 - b.y1) / H; } /* piksel */
    else if (b.format === "ui") ({ x, y, w, h } = b);
    else return null;
    const r = { x, y, w, h };
    return Object.values(r).every((v) => Number.isFinite(v)) && w > 0 && h > 0 && x >= 0 && y >= 0 && x + w <= 1.0001 && y + h <= 1.0001 ? r : null;
  }

  /* normalizeModelOutput(out, photo, aliases) → satu deteksi AI per foto (model klasifikasi) */
  function normalizeModelOutput(out, photo, aliases) {
    if (!out || !out.part) return [];
    const p = mapLabel("part", out.part.label), d = mapLabel("damage_type", out.damage_type && out.damage_type.label), s = mapLabel("severity", out.severity && out.severity.label);
    const conf = (x) => (x && Number.isFinite(+x.confidence) ? +x.confidence : null);
    const box = Array.isArray(out.boxes) && out.boxes.length ? toUiBox(out.boxes[0], photo && photo.width, photo && photo.height) : null;
    return [{
      id: out.id || `DT-${photo && photo.id}`,
      source: "ai",
      cv_label: { part: p.label, damage_type: d.label, severity: s.label },
      part: p.value, damage_type: d.value, severity: s.value,
      unmapped: [!p.known && "part", !d.known && "damage_type", !s.known && "severity"].filter(Boolean),
      part_confidence: conf(out.part), damage_type_confidence: conf(out.damage_type), severity_confidence: conf(out.severity),
      damage_pct: null,            /* model tidak mengeluarkan damage % */
      bbox: box, bbox_source: box ? "ai" : null,
      repair_action: null,         /* model tidak mengeluarkan action; saran dari data harga bila ada, keputusan di workshop */
    }];
  }

  const api = { CV_LABEL_MAP, PRICING_KEY, CONFIG, mapLabel, pricingKey, pricingMatcher, toUiBox, normalizeModelOutput };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.SAVERA_CV = api;
})(typeof window !== "undefined" ? window : globalThis);
