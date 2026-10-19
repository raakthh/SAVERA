/* ===== POTONGAN UI LAMA SAVERA (dari app.js lama, 440 KB) =====
 Isi: fmtIDR, matchPricing, state, wizard assessment (Vehicle Info -> Upload Photos -> AI Analysis
 -> Damage Review -> Verify & Cost) dan Assessment Report. ICONS, toast, helper lain TIDAK disertakan.
 Nomor baris asli ada di komentar >>> di tiap bagian. =====*/


/* >>> fmtIDR: baris asli 84-100 */
function fmtDate(d) {
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
function fmtIDR(n) {
  if (n === null || n === undefined || isNaN(n)) return "—";
  return "Rp " + Math.round(n).toLocaleString("id-ID");
}

// Build a synthetic assessment "history" from the dataset — 1:1 with the
// CSV rows. Dates / plate numbers / workflow status are demo scaffolding
// generated for the prototype (the CSV itself is documented as demo/
// synthetic data); damage attributes and AI confidence are exactly as
// provided in the dataset.

/* >>> matchPricing: baris asli 1445-1465 */
function matchPricing(part, damageType, severity, brand, model, year) {
  const partNames = PART_ALIASES[part] || [];
  const dmgNames = DAMAGE_ALIASES[damageType] || [];
  if (!partNames.length || !dmgNames.length) return null;
  const sevName = severity ? severity[0].toUpperCase() + severity.slice(1) : "";
  const base = PRICING_DATA.filter(
    (p) => partNames.includes(p.vehiclePart) && dmgNames.includes(p.damageType) && p.severity === sevName,
  );
  if (!base.length) return null;
  const pickClosestYear = (list) => {
    if (list.length === 1) return list[0];
    const y = Number(year) || 0;
    return list.slice().sort((a, b) => Math.abs(a.year - y) - Math.abs(b.year - y))[0];
  };
  const tier3 = base;
  const tier2 = brand ? base.filter((p) => p.brand === brand) : [];
  const tier1 = brand && model ? tier2.filter((p) => p.model === model) : [];
  if (tier1.length) return { record: pickClosestYear(tier1), tier: 1 };
  if (tier2.length) return { record: pickClosestYear(tier2), tier: 2 };
  return { record: pickClosestYear(tier3), tier: 3 };
}

/* >>> state: baris asli 1468-1491 */
const state = {
  view: "login",
  sidebarCollapsed: false,
  user: null,
  newAssessment: {
    vehicle: {},
    photos: [],
    damages: [],
    verification: {},
    finalized: false,
  },
  ddSelected: 0,
  aiProgress: 0,
  history: HISTORY.slice(),
  historyFilter: {
    q: "",
    status: "all",
    severity: "all",
    sortKey: "date",
    sortDir: "desc",
  },
  reportOf: null,
  modal: null,
};

/* >>> WORKFLOW + wizard (stepper s/d Verify & Cost): baris asli 2152-2733 */
const WORKFLOW_STEPS = [
  { id: "new-assessment", label: "Vehicle Info" },
  { id: "upload-photos", label: "Upload Photos" },
  { id: "ai-processing", label: "AI Analysis" },
  { id: "damage-detection", label: "Damage Review" },
  { id: "verification", label: "Verify & Cost" },
];
function renderStepper(currentId) {
  const idx = WORKFLOW_STEPS.findIndex((s) => s.id === currentId);
  const pct = Math.round(((idx + 1) / WORKFLOW_STEPS.length) * 100);
  return `
  <div style="font-size:11.5px;color:var(--ink-500);margin-bottom:10px;">Step ${idx + 1} of ${WORKFLOW_STEPS.length} · ${pct}% complete</div>
  <div class="stepper">
    ${WORKFLOW_STEPS.map(
      (s, i) => `
      <div class="step ${i < idx ? "done" : ""} ${i === idx ? "active" : ""}">
        <div class="step-circle">${i < idx ? "✓" : i + 1}</div>
        <div class="step-label">${s.label}</div>
      </div>
      ${i < WORKFLOW_STEPS.length - 1 ? `<div class="step-line ${i < idx ? "done" : ""}"></div>` : ""}
    `,
    ).join("")}
  </div>`;
}

/* ---------- New Assessment: vehicle info ---------- */
function renderNewAssessment() {
  const v = state.newAssessment.vehicle;
  const claimId = v.claim || "CLM-" + Math.floor(10000 + Math.random() * 89999);
  return `
  ${renderStepper("new-assessment")}
  <div class="grid g-12-8">
    <div class="card">
      <div class="card-title">Vehicle &amp; policy information</div>
      <div class="card-desc">This information will be attached to the assessment and final report.</div>
      <div class="row-2">
        <div class="field"><label>Policy number</label><input class="input" id="f_policy" value="${v.policy || "POL-2026-8841"}"></div>
        <div class="field"><label>Claim number</label><input class="input" id="f_claim" value="${claimId}"></div>
      </div>
      <div class="row-2">
        <div class="field"><label>Policyholder name</label><input class="input" id="f_owner" placeholder="e.g. Budi Santoso" value="${v.owner || ""}"></div>
        <div class="field"><label>License plate</label><input class="input" id="f_plate" placeholder="e.g. B 1234 XYZ" value="${v.plate || ""}"></div>
      </div>
      <div class="row-3">
        <div class="field"><label>Brand</label>
          <select class="select" id="f_brand">${BRANDS.map((b) => `<option ${v.brand === b ? "selected" : ""}>${b}</option>`).join("")}</select>
        </div>
        <div class="field"><label>Model</label>
          <select class="select" id="f_model">${MODELS.map((m) => `<option ${v.model === m ? "selected" : ""}>${m}</option>`).join("")}</select>
        </div>
        <div class="field"><label>Year</label><input class="input" id="f_year" type="number" min="2000" max="2026" value="${v.year || 2023}"></div>
      </div>
      <div class="row-2">
        <div class="field"><label>Odometer (km)</label><input class="input" id="f_odo" type="number" value="${v.odo || 42500}"></div>
        <div class="field"><label>Inspection location</label><input class="input" id="f_loc" value="${v.loc || "Malang, East Java"}"></div>
      </div>
      <div class="field"><label>Incident notes</label><textarea class="input" id="f_notes" placeholder="Brief description of the incident...">${v.notes || ""}</textarea></div>
      <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:6px;">
        <button class="btn btn-ghost" data-nav="dashboard">Cancel</button>
        <button class="btn btn-primary" id="toUpload">Continue to Upload Photos →</button>
      </div>
    </div>
    <div>
      <div class="card" style="margin-bottom:16px;">
        <div class="card-title">Claim Summary</div>
        <div class="card-desc">Quick overview of this assessment</div>
        <div class="summary-row"><span>Claim ID</span><strong>${claimId}</strong></div>
        <div class="summary-row"><span>Vehicle</span><strong>${v.brand || BRANDS[0]} ${v.model || MODELS[0]}${v.year ? ", " + v.year : ""}</strong></div>
        <div class="summary-row"><span>Inspection location</span><strong>${v.loc || "Malang, East Java"}</strong></div>
      </div>
      <div class="card">
        <div class="card-title">Assessment Progress</div>
        <div class="card-desc">Complete all steps to finish the assessment</div>
        ${WORKFLOW_STEPS.map(
          (s, i) => `
          <div class="progress-step ${i === 0 ? "active" : ""}">
            <div class="progress-step-dot">${i === 0 ? "1" : i + 1}</div>
            <span>${s.label}</span>
          </div>`,
        ).join("")}
        <div class="banner banner-info" style="margin-top:14px;">${ICONS.info}<div>After completing all steps, you'll be able to generate the final assessment report.</div></div>
      </div>
    </div>
  </div>`;
}
function after_new_assessment() {
  document.getElementById("toUpload").onclick = () => {
    const g = (id) => document.getElementById(id).value;
    if (!g("f_owner") || !g("f_plate")) {
      toast("Please fill in policyholder name and plate number");
      return;
    }
    state.newAssessment.vehicle = {
      policy: g("f_policy"),
      claim: g("f_claim"),
      owner: g("f_owner"),
      plate: g("f_plate"),
      brand: g("f_brand"),
      model: g("f_model"),
      year: g("f_year"),
      odo: g("f_odo"),
      loc: g("f_loc"),
      notes: g("f_notes"),
    };
    goto("upload-photos");
  };
}

/* ---------- Upload photos ---------- */
function renderUploadPhotos() {
  const photos = state.newAssessment.photos;
  return `
  ${renderStepper("upload-photos")}
  <div class="card">
    <div class="card-title">Upload vehicle photos</div>
    <div class="card-desc">Add at least 3 photos covering the damaged area and a full vehicle view. JPG/PNG, up to 10 photos.</div>
    <div class="dropzone" id="dz">
      <div class="dz-icon">${ICONS.upload}</div>
      <div style="font-size:13.5px;font-weight:600;color:var(--navy-900);">Drag &amp; drop photos here</div>
      <div style="font-size:12px;color:var(--ink-500);margin:4px 0 14px;">or click to browse from your device</div>
      <button class="btn btn-accent btn-sm" id="browseBtn">Browse files</button>
      <input type="file" id="fileInput" accept="image/*" multiple style="display:none;">
    </div>
    ${
      photos.length
        ? `<div class="photo-grid">${photos
            .map(
              (p, i) => `
        <div class="photo-thumb">
          <img src="${p.src}">
          <div class="tag">${p.name.length > 18 ? p.name.slice(0, 15) + "…" : p.name}</div>
          <button class="rm" data-rm="${i}">${ICONS.x}</button>
        </div>`,
            )
            .join("")}
      </div>`
        : `<div class="empty-state" style="padding:20px 0 0;">No photos uploaded yet.</div>`
    }
    <div style="display:flex;justify-content:space-between;align-items:center;margin-top:22px;">
      <div style="font-size:12px;color:var(--ink-500);">${photos.length} photo${photos.length === 1 ? "" : "s"} uploaded</div>
      <div style="display:flex;gap:10px;">
        <button class="btn btn-ghost" data-nav="new-assessment">← Back</button>
        <button class="btn btn-primary" id="toAi" ${photos.length < 1 ? "disabled" : ""}>Start AI Analysis →</button>
      </div>
    </div>
  </div>`;
}
function after_upload_photos() {
  const dz = document.getElementById("dz");
  const fileInput = document.getElementById("fileInput");
  document.getElementById("browseBtn").onclick = () => fileInput.click();
  dz.addEventListener("click", (e) => {
    if (e.target.id === "dz") fileInput.click();
  });
  ["dragover", "dragenter"].forEach((ev) =>
    dz.addEventListener(ev, (e) => {
      e.preventDefault();
      dz.classList.add("drag");
    }),
  );
  ["dragleave", "drop"].forEach((ev) =>
    dz.addEventListener(ev, (e) => {
      e.preventDefault();
      dz.classList.remove("drag");
    }),
  );
  dz.addEventListener("drop", (e) => handleFiles(e.dataTransfer.files));
  fileInput.addEventListener("change", (e) => handleFiles(e.target.files));
  document.querySelectorAll("[data-rm]").forEach(
    (b) =>
      (b.onclick = () => {
        state.newAssessment.photos.splice(+b.dataset.rm, 1);
        renderContent();
      }),
  );
  const toAi = document.getElementById("toAi");
  if (toAi)
    toAi.onclick = () => {
      state.aiProgress = 0;
      goto("ai-processing");
    };
}
function handleFiles(files) {
  [...files].slice(0, 10 - state.newAssessment.photos.length).forEach((f) => {
    if (!f.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      state.newAssessment.photos.push({ name: f.name, src: e.target.result });
      renderContent();
    };
    reader.readAsDataURL(f);
  });
}

/* ---------- AI processing (animated) ---------- */
const AI_STAGES = [
  "Preprocessing uploaded images",
  "Localizing vehicle & panel regions",
  "Detecting damage regions",
  "Classifying damage type & severity",
  "Cross-referencing detection confidence",
  "Compiling findings for surveyor review",
];
function renderAiProcessing() {
  return `
  ${renderStepper("ai-processing")}
  <div class="card">
    <div class="ai-processing-wrap">
      <div class="ai-ring">
        <svg viewBox="0 0 120 120">
          <circle class="bg" cx="60" cy="60" r="52"></circle>
          <circle class="fg" id="ringFg" cx="60" cy="60" r="52" stroke-dasharray="326.7" stroke-dashoffset="326.7"></circle>
        </svg>
        <div class="pct" id="ringPct">0%</div>
      </div>
      <div class="ai-stage" id="aiStageText">${AI_STAGES[0]}</div>
      <div class="ai-substage">Analyzing ${state.newAssessment.photos.length} photo${state.newAssessment.photos.length === 1 ? "" : "s"} for ${state.newAssessment.vehicle.brand || ""} ${state.newAssessment.vehicle.model || ""}</div>
      <div class="ai-loglist" id="aiLog">
        ${AI_STAGES.map((s, i) => `<div class="ai-logitem" data-log="${i}"><div class="chk"></div><span>${s}</span></div>`).join("")}
      </div>
    </div>
  </div>`;
}
function after_ai_processing() {
  const circumference = 326.7;
  let pct = 0;
  const ring = document.getElementById("ringFg");
  const ringPct = document.getElementById("ringPct");
  const stageText = document.getElementById("aiStageText");
  const timer = setInterval(() => {
    pct += 2 + Math.random() * 4;
    if (pct >= 100) {
      pct = 100;
      clearInterval(timer);
    }
    ring.style.strokeDashoffset = (circumference * (1 - pct / 100)).toFixed(1);
    ringPct.textContent = Math.round(pct) + "%";
    const stageIdx = Math.min(
      AI_STAGES.length - 1,
      Math.floor((pct / 100) * AI_STAGES.length),
    );
    stageText.textContent = AI_STAGES[stageIdx];
    document.querySelectorAll("[data-log]").forEach((el) => {
      if (+el.dataset.log <= stageIdx) el.classList.add("on");
    });
    if (pct >= 100) {
      generateAiDamages();
      setTimeout(() => goto("damage-detection"), 500);
    }
  }, 220);
}
function generateAiDamages() {
  const v = state.newAssessment.vehicle;
  // Prefer rows matching the selected brand/model from the dataset; else sample broadly.
  let pool = RAW_DATA.filter((d) => d.brand === v.brand && d.model === v.model);
  if (pool.length < 2) pool = RAW_DATA.filter((d) => d.brand === v.brand);
  if (pool.length < 2) pool = RAW_DATA;
  const n = Math.min(pool.length, 2 + Math.floor(Math.random() * 3));
  const shuffled = pool
    .slice()
    .sort(() => Math.random() - 0.5)
    .slice(0, n);
  const positions = {
    bumper: { top: 70, left: 28, w: 44, h: 20 },
    fender: { top: 38, left: 8, w: 26, h: 28 },
    door: { top: 34, left: 38, w: 26, h: 36 },
    windshield: { top: 8, left: 32, w: 36, h: 20 },
    headlamp: { top: 34, left: 4, w: 18, h: 14 },
  };
  state.newAssessment.damages = shuffled.map((d, i) => {
    const p = positions[d.part] || { top: 40, left: 40, w: 22, h: 18 };
    return {
      id: i + 1,
      part: d.part,
      damageType: d.damageType,
      severity: d.severity,
      aiConfidence: d.confidence,
      confidence: d.confidence,
      manual: false,
      pos: {
        top: p.top + (Math.random() * 6 - 3),
        left: p.left + (Math.random() * 6 - 3),
        w: p.w,
        h: p.h,
      },
      verified: false,
      comment: "",
    };
  });
  state.ddSelected = 0;
}

/* ---------- Damage detection (editable) ---------- */
function renderDamageDetection() {
  const dmgs = state.newAssessment.damages;
  const photo = state.newAssessment.photos[0];
  return `
  ${renderStepper("damage-detection")}
  <div class="banner banner-info" style="margin-bottom:16px;">
    ${ICONS.spark}
    <div>AI detected <strong>${dmgs.length} damage region${dmgs.length === 1 ? "" : "s"}</strong> on this vehicle. Adjust part, damage type, severity, or confidence below — every field is editable before it goes to surveyor verification.</div>
  </div>
  <div class="dd-layout">
    <div>
      <div class="img-stage">
        ${photo ? `<img src="${photo.src}">` : `<div style="aspect-ratio:4/3;display:flex;align-items:center;justify-content:center;color:#8DA2C0;">${ICONS.car}</div>`}
        ${dmgs
          .map(
            (d, i) => `
          <div class="bbox ${state.ddSelected === i ? "sel" : ""}" data-box="${i}" style="top:${d.pos.top}%;left:${d.pos.left}%;width:${d.pos.w}%;height:${d.pos.h}%;">
            <div class="lbl">${d.part} · ${Math.round(d.confidence * 100)}%</div>
          </div>`,
          )
          .join("")}
      </div>
      <div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap;">
        ${state.newAssessment.photos.map((p, i) => `<img src="${p.src}" style="width:64px;height:48px;object-fit:cover;border-radius:6px;border:1px solid var(--line);cursor:pointer;">`).join("")}
      </div>
    </div>
    <div>
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
        <div style="font-size:13px;font-weight:600;color:var(--navy-900);">Detected damage (${dmgs.length})</div>
        <button class="btn btn-ghost btn-sm" id="addDmg">${ICONS.plus} Add manual entry</button>
      </div>
      <div id="dmgList">${dmgs.map((d, i) => renderDmgItem(d, i)).join("")}</div>
      <div style="display:flex;justify-content:space-between;gap:10px;margin-top:16px;">
        <button class="btn btn-ghost" data-nav="upload-photos">← Back</button>
        <button class="btn btn-primary" id="toVerify" ${dmgs.length < 1 ? "disabled" : ""}>Continue to Verification →</button>
      </div>
    </div>
  </div>`;
}
function renderDmgItem(d, i) {
  return `
  <div class="dmg-item ${state.ddSelected === i ? "sel" : ""}" data-item="${i}">
    <div class="dmg-item-top">
      <div class="dmg-item-title">Region ${i + 1} ${d.manual ? '<span class="badge badge-neutral">Manual</span>' : ""}</div>
      <button class="btn btn-ghost btn-sm" data-del="${i}" title="Remove">${ICONS.trash}</button>
    </div>
    <div class="row-2">
      <div class="field" style="margin-bottom:8px;"><label>Part</label>
        <select class="select" data-field="part" data-idx="${i}">${PARTS.map((p) => `<option ${d.part === p ? "selected" : ""}>${p}</option>`).join("")}</select>
      </div>
      <div class="field" style="margin-bottom:8px;"><label>Damage type</label>
        <select class="select" data-field="damageType" data-idx="${i}">${DAMAGE_TYPES.map((t) => `<option ${d.damageType === t ? "selected" : ""}>${t}</option>`).join("")}</select>
      </div>
    </div>
    <div class="field" style="margin-bottom:8px;"><label>Severity</label>
      <select class="select" data-field="severity" data-idx="${i}">${SEVERITIES.map((s) => `<option ${d.severity === s ? "selected" : ""}>${s}</option>`).join("")}</select>
    </div>
    <div style="font-size:11px;color:var(--ink-500);display:flex;justify-content:space-between;">
      <span>${d.manual ? "Manually added — no AI score" : "AI confidence"}</span>
      <span style="font-family:var(--font-mono);">${d.manual ? "—" : Math.round(d.confidence * 100) + "%"}</span>
    </div>
    ${!d.manual ? `<div class="conf-bar"><div class="conf-bar-fill" style="width:${d.confidence * 100}%;"></div></div>` : ""}
  </div>`;
}
function after_damage_detection() {
  document.querySelectorAll("[data-box]").forEach(
    (b) =>
      (b.onclick = () => {
        state.ddSelected = +b.dataset.box;
        renderContent();
      }),
  );
  document.querySelectorAll("[data-item]").forEach((b) =>
    b.addEventListener("click", (e) => {
      if (e.target.closest("select") || e.target.closest("[data-del]")) return;
      state.ddSelected = +b.dataset.item;
      renderContent();
    }),
  );
  document.querySelectorAll("[data-field]").forEach(
    (sel) =>
      (sel.onchange = () => {
        const d = state.newAssessment.damages[+sel.dataset.idx];
        d[sel.dataset.field] = sel.value;
        toast("Updated " + sel.dataset.field);
      }),
  );
  document.querySelectorAll("[data-del]").forEach(
    (b) =>
      (b.onclick = (e) => {
        e.stopPropagation();
        state.newAssessment.damages.splice(+b.dataset.del, 1);
        state.ddSelected = 0;
        renderContent();
      }),
  );
  const addBtn = document.getElementById("addDmg");
  if (addBtn)
    addBtn.onclick = () => {
      state.newAssessment.damages.push({
        id: Date.now(),
        part: PARTS[0],
        damageType: DAMAGE_TYPES[0],
        severity: "minor",
        aiConfidence: null,
        confidence: 0,
        manual: true,
        pos: {
          top: 45 + Math.random() * 10,
          left: 45 + Math.random() * 10,
          w: 22,
          h: 18,
        },
        verified: false,
        comment: "",
      });
      state.ddSelected = state.newAssessment.damages.length - 1;
      renderContent();
    };
  const toVerify = document.getElementById("toVerify");
  if (toVerify) toVerify.onclick = () => goto("verification");
}

/* ---------- Verification & cost estimation ---------- */
function matchTierLabel(tier) {
  if (tier === 1) return "Matched: part, damage, severity, brand &amp; model";
  if (tier === 2) return "Matched: part, damage, severity &amp; brand";
  if (tier === 3) return "Matched: part, damage &amp; severity";
  return "";
}
function costBreakdownHTML(rec) {
  return `
    <div class="summary-row"><span>Spare Part</span><strong>${fmtIDR(rec.sparePartCost)}</strong></div>
    <div class="summary-row"><span>Labor</span><strong>${fmtIDR(rec.laborCost)}</strong></div>
    <div class="summary-row"><span>Painting</span><strong>${fmtIDR(rec.paintingCost)}</strong></div>
    <div class="summary-row"><span>Additional</span><strong>${fmtIDR(rec.additionalCost)}</strong></div>
    <div class="summary-row" style="border-top:1px solid var(--line);padding-top:9px;margin-top:2px;"><span style="font-weight:700;color:var(--navy-900);">Estimated Total</span><strong style="color:var(--navy-900);">${fmtIDR(rec.estimatedTotalCost)}</strong></div>
    <div class="summary-row"><span>Cost Range</span><strong>${fmtIDR(rec.costMin)} – ${fmtIDR(rec.costMax)}</strong></div>
  `;
}
function renderVerification() {
  const dmgs = state.newAssessment.damages;
  const v = state.newAssessment.vehicle;
  dmgs.forEach((d) => { d.priceMatch = matchPricing(d.part, d.damageType, d.severity, v.brand, v.model, v.year); });
  const matched = dmgs.filter((d) => d.priceMatch);
  const unmatched = dmgs.filter((d) => !d.priceMatch);
  const total = matched.reduce((s, d) => s + d.priceMatch.record.estimatedTotalCost, 0);
  const partsSub = matched.reduce((s, d) => s + d.priceMatch.record.sparePartCost, 0);
  const laborSub = matched.reduce((s, d) => s + d.priceMatch.record.laborCost, 0);
  const paintSub = matched.reduce((s, d) => s + d.priceMatch.record.paintingCost, 0);
  const addSub = matched.reduce((s, d) => s + d.priceMatch.record.additionalCost, 0);
  const allVerified = dmgs.length > 0 && dmgs.every((d) => d.verified);
  return `
  ${renderStepper("verification")}
  <div class="banner banner-info" style="margin-bottom:16px;">
    ${ICONS.info}
    <div><strong>Repair costs are estimated automatically</strong> from the SAVERA repair-cost dataset, matched by part, damage type, severity, and vehicle (${v.brand || "—"} ${v.model || "—"} ${v.year || ""}). Figures are read-only — the estimator can review the breakdown per item below.</div>
  </div>
  ${unmatched.length ? `<div class="banner banner-warn" style="margin-bottom:16px;">${ICONS.warn}<div><strong>${unmatched.length} item${unmatched.length === 1 ? "" : "s"} have no matching pricing record</strong> and show "Pricing data unavailable" — they are excluded from the cost summary below.</div></div>` : ""}
  <div class="grid g-12-8">
    <div class="card">
      <div class="card-title">Damage verification &amp; cost estimation</div>
      <div class="card-desc">${v.brand || ""} ${v.model || ""} ${v.year || ""} · Plate ${v.plate || "—"}</div>
      <div class="table-wrap">
        <table>
          <thead><tr><th></th><th>Part</th><th>Damage</th><th>Severity</th><th>AI Confidence</th><th>Estimated Repair Cost</th><th></th></tr></thead>
          <tbody>
            ${dmgs
              .map((d, i) => {
                const m = d.priceMatch;
                return `
              <tr>
                <td><input type="checkbox" data-verify="${i}" ${d.verified ? "checked" : ""}></td>
                <td style="text-transform:capitalize;">${d.part}</td>
                <td style="text-transform:capitalize;">${d.damageType}</td>
                <td>${badgeSeverity(d.severity)}</td>
                <td style="font-family:var(--font-mono);">${d.manual ? "—" : Math.round(d.confidence * 100) + "%"}</td>
                <td style="font-family:var(--font-mono);font-weight:600;color:${m ? "var(--navy-900)" : "var(--ink-500)"};">${m ? fmtIDR(m.record.estimatedTotalCost) : "Pricing data unavailable"}</td>
                <td>${m ? `<details class="cost-breakdown"><summary>View Breakdown</summary><div style="padding-top:8px;">${costBreakdownHTML(m.record)}<div style="font-size:10.5px;color:var(--ink-500);margin-top:6px;">${matchTierLabel(m.tier)}</div></div></details>` : ""}</td>
              </tr>`;
              })
              .join("")}
          </tbody>
        </table>
      </div>
      <div class="field" style="margin-top:16px;"><label>Estimator comments</label>
        <textarea class="input" id="surveyComment" placeholder="Notes on discrepancies, additional context, or conditions for approval...">${state.newAssessment.verification.comment || ""}</textarea>
      </div>
    </div>
    <div>
      <div class="card" style="margin-bottom:18px;">
        <div class="card-title">Cost summary</div>
        <div class="card-desc">Automatically calculated from matched pricing records</div>
        <div class="summary-row"><span>Parts subtotal</span><strong>${fmtIDR(partsSub)}</strong></div>
        <div class="summary-row"><span>Labor subtotal</span><strong>${fmtIDR(laborSub)}</strong></div>
        <div class="summary-row"><span>Painting subtotal</span><strong>${fmtIDR(paintSub)}</strong></div>
        <div class="summary-row"><span>Additional cost</span><strong>${fmtIDR(addSub)}</strong></div>
        <div class="summary-row" style="border-top:1px solid var(--line);padding-top:10px;margin-top:2px;"><span style="font-weight:700;color:var(--navy-900);font-size:13.5px;">Estimated total</span><strong style="color:var(--navy-900);font-size:14.5px;">${fmtIDR(total)}</strong></div>
        <div style="font-size:11px;color:var(--ink-500);margin-top:8px;">${unmatched.length ? unmatched.length + " item(s) excluded — no pricing match." : "All items priced from the dataset."}</div>
      </div>
      <div class="card">
        <div class="card-title">Repair Decision</div>
        <div class="card-desc">Final repair decision is verified by the estimator.</div>
        <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:14px;">
          ${["Proceed with Repair", "Requires Estimator Review", "Hold for Inspection"]
            .map(
              (opt, i) => `
          <label style="display:flex;align-items:center;gap:8px;font-size:12.8px;padding:9px 10px;border:1px solid var(--line);border-radius:8px;cursor:pointer;">
            <input type="radio" name="decision" value="${opt}" ${state.newAssessment.verification.decision === opt || (!state.newAssessment.verification.decision && i === 0) ? "checked" : ""}> ${opt}
          </label>`,
            )
            .join("")}
        </div>
        <button class="btn btn-accent btn-block" id="finalizeBtn" style="padding:12px;" ${!allVerified ? "disabled" : ""}>${ICONS.check} Finalize Assessment</button>
        ${!allVerified ? `<div class="hint" style="margin-top:8px;">Check off each damage item to confirm verification before finalizing.</div>` : ""}
      </div>
    </div>
  </div>
  <div style="display:flex;justify-content:flex-start;margin-top:16px;">
    <button class="btn btn-ghost" data-nav="damage-detection">← Back to Damage Review</button>
  </div>
  `;
}
function after_verification() {
  document.querySelectorAll("[data-verify]").forEach(
    (cb) =>
      (cb.onchange = () => {
        state.newAssessment.damages[+cb.dataset.verify].verified = cb.checked;
        renderContent();
      }),
  );
  const finalizeBtn = document.getElementById("finalizeBtn");
  if (finalizeBtn)
    finalizeBtn.onclick = () => {
      const decision =
        document.querySelector('input[name="decision"]:checked')?.value ||
        "Proceed with Repair";
      state.newAssessment.verification = {
        comment: document.getElementById("surveyComment").value,
        decision,
        finalizedAt: new Date(),
      };
      state.newAssessment.finalized = true;
      const v = state.newAssessment.vehicle;
      const dmgs = state.newAssessment.damages;
      const matched = dmgs.filter((d) => d.priceMatch);
      const newId = "SVR-2026-" + String(2000 + state.history.length);
      const statusMap = {
        "Proceed with Repair": "Approved",
        "Requires Estimator Review": "In Review",
        "Hold for Inspection": "Pending Verification",
      };
      const record = {
        assessmentId: newId,
        plate: v.plate,
        brand: v.brand,
        model: v.model,
        year: +v.year,
        part: dmgs.map((d) => d.part).join(", "),
        damageType: dmgs.map((d) => d.damageType).join(", "),
        severity: dmgs.reduce(
          (worst, d) =>
            SEVERITIES.indexOf(d.severity) > SEVERITIES.indexOf(worst)
              ? d.severity
              : worst,
          "minor",
        ),
        confidence:
          dmgs
            .filter((d) => !d.manual)
            .reduce((s, d, _, arr) => s + d.confidence / arr.length, 0) || 0.9,
        date: new Date(),
        status: statusMap[decision] || "Approved",
        surveyor: state.user?.name || "Estimator",
        cost: matched.reduce((s, d) => s + d.priceMatch.record.estimatedTotalCost, 0),
        pricingIncomplete: dmgs.length - matched.length,
        damages: JSON.parse(JSON.stringify(dmgs)),
        vehicle: { ...v },
        decision,
        comment: state.newAssessment.verification.comment,
        photos: state.newAssessment.photos,
      };
      state.history.unshift(record);
      state.reportOf = record;
      toast("Assessment finalized");
      goto("report-view");
    };
}


/* >>> Assessment Report (renderReportView): baris asli 3161-3257 */
function renderReportView() {
  const r = state.reportOf || state.history[0];
  if (!r) return `<div class="empty-state">No assessment selected.</div>`;
  const isLive = !!r.damages;
  const damageRows = isLive
    ? r.damages
    : [
        {
          part: r.part,
          damageType: r.damageType,
          severity: r.severity,
          confidence: r.confidence,
          priceMatch: null,
        },
      ];
  const total = isLive ? r.cost : null;
  return `
  <div class="no-print" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
    <button class="btn btn-ghost" data-nav="history">← Back to history</button>
    <div style="display:flex;gap:10px;">
      <button class="btn btn-ghost" id="printBtn">${ICONS.print} Print / Save as PDF</button>
    </div>
  </div>
  <div class="report-doc">
    <div class="report-head">
      <div>
        <div style="display:flex;align-items:center;gap:9px;margin-bottom:6px;"><div class="sb-mark" style="width:28px;height:28px;font-size:12px;">SV</div><div style="font-weight:700;font-size:15px;color:var(--navy-900);">SAVERA</div></div>
        <div style="font-size:11.5px;color:var(--ink-500);">Smart Automotive Vehicle Evaluation &amp; Repair Assessment</div>
      </div>
      <div style="text-align:right;">
        <div style="font-family:var(--font-mono);font-weight:700;font-size:14px;color:var(--navy-900);">${r.assessmentId}</div>
        <div style="font-size:11.5px;color:var(--ink-500);margin-top:2px;">${fmtDate(r.date)}</div>
        <div style="margin-top:6px;">${badgeStatus(r.status)}</div>
      </div>
    </div>

    <div class="report-sec-title">Vehicle &amp; policy</div>
    <div class="report-kv">
      <div><span>Policyholder</span>${r.vehicle?.owner || "—"}</div>
      <div><span>License plate</span>${r.plate}</div>
      <div><span>Vehicle</span>${r.brand} ${r.model}, ${r.year}</div>
      <div><span>Odometer</span>${r.vehicle?.odo ? r.vehicle.odo + " km" : "—"}</div>
      <div><span>Policy no.</span>${r.vehicle?.policy || "—"}</div>
      <div><span>Claim no.</span>${r.vehicle?.claim || "—"}</div>
      <div><span>Inspection location</span>${r.vehicle?.loc || "—"}</div>
      <div><span>Surveyor</span>${r.surveyor}</div>
    </div>

    ${r.vehicle?.notes ? `<div class="report-sec-title">Incident notes</div><div style="font-size:12.8px;color:var(--ink-700);">${r.vehicle.notes}</div>` : ""}

    <div class="report-sec-title">Damage findings &amp; automatic cost estimate</div>
    <div class="table-wrap">
      <table>
        <thead><tr><th>Part</th><th>Damage type</th><th>Severity</th><th>AI conf.</th><th>Spare Part</th><th>Labor</th><th>Painting</th><th>Additional</th><th>Estimated Cost</th></tr></thead>
        <tbody>
          ${damageRows
            .map((d) => {
              const rec = d.priceMatch?.record;
              return `
            <tr>
              <td style="text-transform:capitalize;">${d.part}</td>
              <td style="text-transform:capitalize;">${d.damageType}</td>
              <td>${badgeSeverity(d.severity)}</td>
              <td style="font-family:var(--font-mono);">${d.manual ? "—" : Math.round((d.confidence || 0) * 100) + "%"}</td>
              <td style="font-family:var(--font-mono);">${rec ? fmtIDR(rec.sparePartCost) : "—"}</td>
              <td style="font-family:var(--font-mono);">${rec ? fmtIDR(rec.laborCost) : "—"}</td>
              <td style="font-family:var(--font-mono);">${rec ? fmtIDR(rec.paintingCost) : "—"}</td>
              <td style="font-family:var(--font-mono);">${rec ? fmtIDR(rec.additionalCost) : "—"}</td>
              <td style="font-family:var(--font-mono);font-weight:600;">${rec ? fmtIDR(rec.estimatedTotalCost) : "Pricing data unavailable"}</td>
            </tr>`;
            })
            .join("")}
        </tbody>
      </table>
    </div>
    <div style="display:flex;justify-content:flex-end;margin-top:10px;font-size:14px;font-weight:700;color:var(--navy-900);">
      Estimated total: <span style="font-family:var(--font-mono);margin-left:8px;">${fmtIDR(total)}</span>
    </div>
    ${r.pricingIncomplete ? `<div style="font-size:11px;color:var(--warn);margin-top:4px;text-align:right;">${r.pricingIncomplete} item(s) excluded — no pricing match available.</div>` : ""}

    ${r.decision ? `<div class="report-sec-title">Repair decision</div><div style="font-size:12.8px;"><strong>${r.decision}</strong>${r.comment ? " — " + r.comment : ""}<div style="font-size:11px;color:var(--ink-500);margin-top:4px;">Final repair decision is verified by the estimator.</div></div>` : ""}

    <div class="report-sec-title">Sign-off</div>
    <div class="row-2">
      <div><div style="font-size:11.5px;color:var(--ink-500);margin-bottom:4px;">Surveyor signature</div><div class="sig-box">${r.surveyor}</div></div>
      <div><div style="font-size:11.5px;color:var(--ink-500);margin-bottom:4px;">Policyholder acknowledgement</div><div class="sig-box">Pending signature</div></div>
    </div>
    <div style="margin-top:26px;font-size:10.5px;color:var(--ink-300);border-top:1px solid var(--line);padding-top:12px;">
      This report is AI-assisted decision support. All findings were reviewed and the final claim decision was made by a licensed surveyor. Generated by SAVERA on ${fmtDate(new Date())}.
    </div>
  </div>`;
}
function after_report_view() {
  const p = document.getElementById("printBtn");
  if (p) p.onclick = () => window.print();
}

/* ===== DATA HARGA & KAMUS YANG DIPAKAI matchPricing (dari app.js lama) ===== */

/* >>> PRICING_COLS: baris asli 809 */
const PRICING_COLS = ["brand","model","year","vehiclePart","damageType","severity",
  "damagePct","repairAction","sparePartCost","laborCost","paintingCost","additionalCost",
  "estimatedTotalCost","costMin","costMax"];

/* >>> PRICING_RAW: baris asli 812-1406 (594 baris data; hanya 4 baris pertama) */
const PRICING_RAW = [
["Hyundai","Stargazer",2018,"Front Door","Scratch","Severe",62,"Repair + Repaint",0,460000,1045000,90000,1595000,1375000,1720000],
["Hyundai","Stargazer",2018,"Rear Door","Dent","Severe",75,"Repair + Repaint",0,480000,1145000,55000,1680000,1560000,1980000],
["Honda","Civic",2024,"Front Bumper","Crack","Minor",13,"Repair + Repaint",0,210000,600000,180000,990000,875000,1095000],
["Honda","Civic",2024,"Hood","Dent","Moderate",55,"Repair + Repaint",0,320000,990000,140000,1450000,1285000,1700000],
  /* ...[dipotong]... */
];

/* >>> PRICING_DATA + PART_ALIASES + DAMAGE_ALIASES: baris asli 1407-1432 */
const PRICING_DATA = PRICING_RAW.map((row,i)=>{
  const o = { id:i+1 };
  PRICING_COLS.forEach((c,idx)=>o[c]=row[idx]);
  return o;
});

// SAVERA's damage-detection vocabulary (generic, lowercase) is not the
// same vocabulary used in the pricing dataset (specific, English,
// Title Case). These alias tables bridge the two using only real
// category names that exist in the pricing dataset -- a part or damage
// type with no confident alias is left unmapped on purpose, so it
// correctly falls through to "Pricing data unavailable" rather than
// being matched to something it doesn't actually mean.
const PART_ALIASES = {
  bumper: ["Front Bumper", "Rear Bumper"],
  door: ["Front Door", "Rear Door"],
  fender: ["Fender"],
  headlamp: ["Headlight"],
  windshield: [], // no equivalent front-glass entry in the pricing dataset
};
const DAMAGE_ALIASES = {
  dent: ["Dent"],
  broken: ["Broken"],
  scratch: ["Scratch"],
  shatter: [], // no "shattered"/"broken glass" equivalent in the pricing dataset
};