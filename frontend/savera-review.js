/* SAVERA — Store review bersama (viewer, kartu temuan, biaya, keputusan membaca draft yang SAMA).
   Muat SETELAH savera-v2.js. Draft = salinan assessment.review per sesi; disimpan permanen ke assessment saat keputusan.
   Biaya otomatis memakai matchPricing() global dari app.js (tidak diubah). */
(function () {
  const V = window.SAVERA_V2, A = window.SAVERA_ASSESSMENT, D = window.SAVERA_DEMO;
  if (!V || !A || !A.buildWorking) return;
  const clone = (x) => JSON.parse(JSON.stringify(x ?? null));
  const drafts = () => (state.rv = state.rv || {});

  const assessmentOf = (srOrA) => { if (!srOrA || !A.byId) return null; const a = A.byId(srOrA.assessment_id); return a === srOrA ? a : A.forSR(srOrA); };
  const srOf = (a) => V.W.sr.find((s) => s.assessment_id === a.assessment_id) || null;
  /* SR boleh diedit bila belum diputuskan (Approved/Rejected) dan status masih tahap assessment */
  const editable = (a) => { const s = srOf(a), dec = a.decision && a.decision.status; return !!s && A.canDecide(s.request_status, "approve") && dec !== "approved" && dec !== "rejected"; };
  function draft(a) { const d = drafts(); if (!d[a.assessment_id]) d[a.assessment_id] = Object.assign(A.emptyReview(), clone(a.review) || {}); return d[a.assessment_id]; }
  /* matchPricing() asli + penerjemah kosakata UI → kunci kamus app.js (savera-cv-adapter.js) */
  const aliasDicts = () => ({ part: typeof PART_ALIASES !== "undefined" ? PART_ALIASES : null, damage: typeof DAMAGE_ALIASES !== "undefined" ? DAMAGE_ALIASES : null });
  const engine = () => (typeof matchPricing !== "function" ? null : window.SAVERA_CV && SAVERA_CV.pricingMatcher ? SAVERA_CV.pricingMatcher(matchPricing, aliasDicts()) : matchPricing);
  const ctx = (a) => ({ match: engine(), vehicle: a.vehicle, spareparts: (D && D.spareparts) || [], inventory: V.W.inv || [] });
  /* working: dari draft bila masih bisa diedit, dari review tersimpan bila sudah diputuskan */
  const working = (a) => A.buildWorking(a, editable(a) ? draft(a) : a.review, ctx(a));
  const discard = (a) => { delete drafts()[a.assessment_id]; };
  const commit = (a) => { a.review = clone(draft(a)); discard(a); };

  /* opsi pilihan = kosakata UI dari data (nilai CV_LABEL_MAP + kunci PRICING_KEY + area/jenis kerusakan di SR + vehicle_part sparepart) — tanpa daftar ketikan tangan */
  const vocab = (kind) => {
    const C = window.SAVERA_CV || {}, sr = (V.W && V.W.sr) || [], bad = (x) => !x || x === "–" || x === "-";
    const vals = [...Object.values((C.CV_LABEL_MAP && C.CV_LABEL_MAP[kind]) || {}), ...Object.keys((C.PRICING_KEY && C.PRICING_KEY[kind]) || {}),
      ...sr.map((s) => (kind === "part" ? s.initial_damage_area : s.initial_damage_type)), ...(kind === "part" ? ((D && D.spareparts) || []).map((p) => p.vehicle_part) : [])];
    return [...new Set(vals.filter((x) => !bad(x)).map(String))].sort();
  };
  const options = () => ({ part: vocab("part"), damage_type: vocab("damage_type"), severity: A.SEVERITIES, repair_action: A.REPAIR_ACTIONS });

  /* state tampilan bersama (viewer & kartu): foto aktif, temuan terpilih, mode gambar box */
  const ui = (a) => { const all = (state.pv = state.pv || {}); return all[a.assessment_id] || (all[a.assessment_id] = { photo: 0, tab: "photo", sel: null, draw: null, open: {} }); };
  const nextManualId = (a) => { const d = draft(a), ids = d.added.map((x) => x.id); let n = 1; while (ids.includes("MN" + String(n).padStart(2, "0"))) n++; return "MN" + String(n).padStart(2, "0"); };

  V.review = { assessmentOf, srOf, editable, draft, working, discard, commit, options, ui, engine, nextManualId };
})();
