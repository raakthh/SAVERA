/* SAVERA — Tahap 3: kartu temuan per region. Muat SETELAH savera-photo-viewer.js.
   Mode "customer" (read-only) dan "workshop" (editable selama assessment belum diputuskan).
   Blok "Hasil deteksi (CV)" = nilai asli model (tidak pernah berubah); blok "Workshop Verification" = hasil review.
   Semua perubahan masuk draft bersama (savera-review.js). API: SAVERA_V2.findings = { has, metaHTML, html, wire } */
(function () {
  const V = window.SAVERA_V2, A = window.SAVERA_ASSESSMENT, I = window.SAVERA_I18N;
  if (!V || !A || !I || !V.review) return;
  const RV = V.review, t = I.t, L = () => I.lang(), F = A.formatRupiah, CUSTS = () => (window.SAVERA_DEMO && SAVERA_DEMO.customers) || [];
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const pct = (v) => (v == null || !Number.isFinite(+v) ? "–" : Math.round(+v) + "%");

  I.add({
    en: { "fd.title": "Findings per region", "fd.desc_ws": "Check each AI finding, correct it if needed, mark its location on the photo, or add a manual entry.", "fd.desc_cu": "Damage found on your vehicle and the workshop's verification.",
      "fd.region": "Region {n}", "fd.add": "Add manual entry", "fd.del": "Remove", "fd.undo": "Undo", "fd.removed": "Removed by workshop", "fd.changed": "Changed by workshop", "fd.photo": "Photo",
      "fd.also": "+{n} photo", "fd.detected": "Detection result (CV)", "fd.verify": "Workshop Verification", "fd.manual_cv": "Added manually by the workshop — no CV result.",
      "fd.area": "Damage Area", "fd.type": "Damage Type", "fd.sev": "Severity", "fd.pct": "Damage %", "fd.svc": "Service Type", "fd.act": "Repair Action", "fd.initial": "Initial Estimate", "fd.current": "Verified Estimate",
      "fd.unavailable": "Pricing data unavailable", "fd.unmapped": "Unmapped", "fd.choose": "— choose —", "fd.suggest": "dataset suggests {a}", "fd.range": "range {min} – {max}", "fd.waiting": "Waiting for workshop verification.", "fd.rejected": "The workshop rejected this assessment — see the reason above.",
      "fd.box_draw": "Draw box on photo", "fd.box_redraw": "Redraw box", "fd.box_clear": "Remove box", "fd.box_none": "No location marked — the AI result covers the whole photo.", "fd.box_ws": "Location marked by workshop.", "fd.box_man": "Location drawn manually.",
      "fd.pct_hint": "optional, 0–100", "fd.empty": "No findings yet.", "fd.engine": "Pricing engine (matchPricing / PRICING_DATA) is not loaded — estimates are unavailable; costs can be entered manually.",
      "fd.issue_unmapped": "{n} finding(s) have model labels without a pricing match — choose the part/damage manually.", "fd.issue_action": "{n} finding(s) still need a Repair Action.", "fd.manual_removed": "Manual entry removed",
      "fd.customer": "Customer", "fd.vehicle": "Vehicle", "fd.complaint": "Complaint", "fd.insurance": "Insurance", "fd.policy": "Policy no.", "fd.claim": "Claim no.", "fd.conf": "AI {p}" },
    id: { "fd.title": "Temuan per region", "fd.desc_ws": "Periksa tiap temuan AI, koreksi bila perlu, tandai lokasinya di foto, atau tambah entri manual.", "fd.desc_cu": "Kerusakan yang ditemukan pada kendaraan Anda dan hasil verifikasi workshop.",
      "fd.region": "Region {n}", "fd.add": "Tambah entri manual", "fd.del": "Hapus", "fd.undo": "Batalkan hapus", "fd.removed": "Dihapus workshop", "fd.changed": "Diubah workshop", "fd.photo": "Foto",
      "fd.also": "+{n} foto", "fd.detected": "Hasil deteksi (CV)", "fd.verify": "Workshop Verification", "fd.manual_cv": "Ditambah manual oleh workshop — tidak ada hasil CV.",
      "fd.area": "Damage Area", "fd.type": "Damage Type", "fd.sev": "Severity", "fd.pct": "Damage %", "fd.svc": "Service Type", "fd.act": "Repair Action", "fd.initial": "Initial Estimate", "fd.current": "Estimasi terverifikasi",
      "fd.unavailable": "Pricing data unavailable", "fd.unmapped": "Unmapped", "fd.choose": "— pilih —", "fd.suggest": "saran dataset: {a}", "fd.range": "kisaran {min} – {max}", "fd.waiting": "Menunggu verifikasi workshop.", "fd.rejected": "Workshop menolak assessment ini — lihat alasan di atas.",
      "fd.box_draw": "Gambar box di foto", "fd.box_redraw": "Gambar ulang box", "fd.box_clear": "Hapus box", "fd.box_none": "Belum ada lokasi — hasil AI berlaku untuk seluruh foto.", "fd.box_ws": "Lokasi ditandai workshop.", "fd.box_man": "Lokasi digambar manual.",
      "fd.pct_hint": "opsional, 0–100", "fd.empty": "Belum ada temuan.", "fd.engine": "Mesin harga (matchPricing / PRICING_DATA) belum dimuat — estimasi tidak tersedia; biaya bisa diisi manual.",
      "fd.issue_unmapped": "{n} temuan berlabel model tanpa padanan harga — pilih part/jenis secara manual.", "fd.issue_action": "{n} temuan belum punya Repair Action.", "fd.manual_removed": "Entri manual dihapus",
      "fd.customer": "Customer", "fd.vehicle": "Kendaraan", "fd.complaint": "Keluhan", "fd.insurance": "Asuransi", "fd.policy": "No. polis", "fd.claim": "No. klaim", "fd.conf": "AI {p}" },
  });

  const sevBadge = (s) => (s ? `<span class="badge badge-${esc(String(s).toLowerCase())}">${esc(A.label("severity", s, L()))}</span>` : "–");
  const actTxt = (x) => (x ? esc(A.label("repair_action", x, L())) : "–");
  const chip = (l, v, changed) => `<div class="sv-step fd-chip${changed ? " fd-changed" : ""}"><div class="sv-sl">${esc(l)}</div><div class="sv-sv">${v}</div></div>`;
  const photoName = (a, id) => { const p = (a.photos || []).find((x) => x.id === id); return p ? A.label("angle", p.angle, L()) : id || "–"; };
  const estimate = (price, line) => line && line.has_cost ? `<b>${F(A.lineTotal(line))}</b>${line.cost_min != null ? `<div class="fd-sub">${esc(t("fd.range", { min: F(line.cost_min), max: F(line.cost_max) }))}</div>` : ""}`
    : price && price.priced ? `<b>${F(A.lineTotal(price.auto))}</b><div class="fd-sub">${esc(t("fd.range", { min: F(price.cost_min), max: F(price.cost_max) }))}</div>` : `<span class="fd-na">${esc(t("fd.unavailable"))}</span>`;

  /* 7 chip: Damage Area, Damage Type, Severity, Damage %, Service Type, Repair Action, Estimate */
  function chips(v, svc, estHTML, estLabel, changed) {
    const ch = (k) => changed && changed.includes(k);
    const area = v.part ? esc(v.part) : v.cv_label && v.cv_label.part ? `${esc(v.cv_label.part)} <span class="badge badge-neutral">${esc(t("fd.unmapped"))}</span>` : "–";
    const type = v.damage_type ? esc(v.damage_type) : v.cv_label && v.cv_label.damage_type ? `${esc(v.cv_label.damage_type)} <span class="badge badge-neutral">${esc(t("fd.unmapped"))}</span>` : "–";
    const act = v.repair_action ? actTxt(v.repair_action) : v.suggested_action ? `– <div class="fd-sub">${esc(t("fd.suggest", { a: A.label("repair_action", v.suggested_action, L()) }))}</div>` : "–";
    return `<div class="fd-chips">${chip(t("fd.area"), area, ch("part"))}${chip(t("fd.type"), type, ch("damage_type"))}${chip(t("fd.sev"), sevBadge(v.severity), ch("severity"))}${chip(t("fd.pct"), pct(v.damage_pct), ch("damage_pct"))}${chip(t("fd.svc"), esc(svc || "–"), ch("repair_action"))}${chip(t("fd.act"), act, ch("repair_action"))}${chip(estLabel, estHTML, false)}</div>`;
  }
  const confTxt = (o) => [o.part_confidence, o.damage_type_confidence, o.severity_confidence].map((c, i) => (c == null ? null : `${[t("fd.area"), t("fd.type"), t("fd.sev")][i]} ${pct(c * 100)}`)).filter(Boolean).join(" · ");

  function selectHTML(id, field, list, cur, disabled) {
    return `<select class="select" data-fd-edit="${esc(id)}" data-field="${field}" ${disabled ? "disabled" : ""}><option value="">${esc(t("fd.choose"))}</option>${[...new Set([...(list || []), ...(cur ? [cur] : [])])].map((x) => `<option value="${esc(x)}" ${x === cur ? "selected" : ""}>${esc(field === "severity" ? A.label("severity", x, L()) : field === "repair_action" ? A.label("repair_action", x, L()) : x)}</option>`).join("")}</select>`;
  }
  function thumb(a, f) {
    const p = (a.photos || []).find((x) => x.id === f.photo_id); if (!p) return "";
    const b = f.bbox;
    return `<div class="fd-thumb"><img src="${esc(p.url)}" alt="${esc(photoName(a, p.id))}" loading="lazy">${b ? `<span class="fd-thumb-box" style="left:${b.x * 100}%;top:${b.y * 100}%;width:${b.w * 100}%;height:${b.h * 100}%;"></span>` : ""}</div>`;
  }

  function card(a, f, mode, edit, ui, opts) {
    const c = f.current, open = mode === "customer" || ui.open[f.id] || ui.sel === f.id, conf = f.source === "ai" && c.part_confidence != null ? t("fd.conf", { p: pct(c.part_confidence * 100) }) : t("pv.manual");
    const decided = a.decision && a.decision.status === "approved", rejected = a.decision && a.decision.status === "rejected";
    const head = `<button type="button" class="fd-head" data-fd-toggle="${esc(f.id)}" aria-expanded="${open}">
        <span class="fd-region">${esc(t("fd.region", { n: f.index }))}</span><b class="fd-part">${esc(c.part || (c.cv_label && c.cv_label.part) || t("pv.unset"))}</b>
        <span class="badge ${f.source === "ai" ? "badge-review" : "badge-neutral"}">${esc(conf)}</span>
        <span class="fd-meta">${esc(t("fd.photo"))}: ${esc(photoName(a, f.photo_id))}${f.evidence.length ? " " + esc(t("fd.also", { n: f.evidence.length })) : ""}</span>
        ${f.removed ? `<span class="badge badge-rejected">${esc(t("fd.removed"))}</span>` : f.changed.length ? `<span class="badge badge-pending">${esc(t("fd.changed"))}</span>` : ""}
        <span class="fd-right">${sevBadge(c.severity)}<span class="fd-amt">${f.line.has_cost ? F(A.lineTotal(f.line)) : `<span class="fd-na">${esc(t("fd.unavailable"))}</span>`}</span><span class="fd-caret" aria-hidden="true">▾</span></span></button>`;
    const tools = edit ? `<div class="fd-tools">${f.removed ? `<button type="button" class="btn btn-ghost btn-sm" data-fd-undo="${esc(f.id)}">${esc(t("fd.undo"))}</button>` : `<button type="button" class="btn btn-ghost btn-sm fd-del" data-fd-del="${esc(f.id)}" title="${esc(t("fd.del"))}" aria-label="${esc(t("fd.del"))} ${esc(c.part || "")}">${ICONS.trash || "🗑"}</button>`}</div>` : "";
    if (!open) return `<div class="fd-card${f.removed ? " removed" : ""}${ui.sel === f.id ? " sel" : ""}" data-fd="${esc(f.id)}"><div class="fd-top">${head}${tools}</div></div>`;

    const detected = f.source === "manual" ? `<div class="fd-note">${esc(t("fd.manual_cv"))}</div>`
      : chips(f.original, f.service_type_original, estimate(f.price_original, null), t("fd.initial")) + (confTxt(f.original) ? `<div class="fd-sub fd-conf">${esc(confTxt(f.original))}</div>` : "");
    let verify;
    if (edit && !f.removed) {
      const man = f.source === "manual", boxNote = f.bbox_source === "workshop" ? t("fd.box_ws") : f.bbox_source === "manual" ? t("fd.box_man") : t("fd.box_none");
      verify = `<div class="fd-form">
          <div class="field"><label>${esc(t("fd.area"))}</label>${selectHTML(f.id, "part", opts.part, c.part)}</div>
          <div class="field"><label>${esc(t("fd.type"))}</label>${selectHTML(f.id, "damage_type", opts.damage_type, c.damage_type)}</div>
          <div class="field"><label>${esc(t("fd.sev"))}</label>${selectHTML(f.id, "severity", opts.severity, c.severity)}</div>
          <div class="field"><label>${esc(t("fd.act"))}</label>${selectHTML(f.id, "repair_action", opts.repair_action, c.repair_action)}</div>
          ${man ? `<div class="field"><label>${esc(t("fd.photo"))}</label><select class="select" data-fd-photo="${esc(f.id)}">${a.photos.map((p) => `<option value="${esc(p.id)}" ${p.id === f.photo_id ? "selected" : ""}>${esc(photoName(a, p.id))}</option>`).join("")}</select></div>
            <div class="field"><label>${esc(t("fd.pct"))} <span class="fd-sub">(${esc(t("fd.pct_hint"))})</span></label><input class="input" type="number" min="0" max="100" step="1" inputmode="numeric" data-fd-pct="${esc(f.id)}" value="${c.damage_pct ?? ""}"></div>` : ""}
        </div>
        <div class="fd-box"><span>${esc(boxNote)}</span><span class="fd-box-btns"><button type="button" class="btn btn-ghost btn-sm" data-fd-draw="${esc(f.id)}">${esc(t(f.bbox ? "fd.box_redraw" : "fd.box_draw"))}</button>${f.bbox && f.bbox_source !== "ai" ? `<button type="button" class="btn btn-ghost btn-sm" data-fd-clear="${esc(f.id)}">${esc(t("fd.box_clear"))}</button>` : ""}</span></div>
        ${chips(c, f.service_type, estimate(f.price, f.line), t("fd.current"), f.changed)}`;
    } else if (f.removed) verify = `<div class="fd-note">${esc(t("fd.removed"))}</div>`;
    else if (mode === "customer" && rejected) verify = `<div class="fd-note">${esc(t("fd.rejected"))}</div>`;
    else if (mode === "customer" && !decided) verify = `<div class="fd-note">${esc(t("fd.waiting"))}</div>`;
    else verify = chips(c, f.service_type, estimate(f.price, f.line), t("fd.current"), f.changed);

    return `<div class="fd-card open${f.removed ? " removed" : ""}${ui.sel === f.id ? " sel" : ""}" data-fd="${esc(f.id)}"><div class="fd-top">${head}${tools}</div>
      <div class="fd-body">${mode === "customer" ? thumb(a, f) : ""}<div class="fd-secs">
        <div class="fd-sec"><div class="sv-chain-cap">${esc(t("fd.detected"))}</div>${detected}</div>
        <div class="fd-sec"><div class="sv-chain-cap">${esc(t("fd.verify"))}</div>${verify}</div></div></div></div>`;
  }

  function metaHTML(sr) {
    const a = RV.assessmentOf(sr); if (!a) return "";
    const cu = CUSTS().find((c) => c.customer_id === sr.customer_id) || {}, v = a.vehicle || {};
    const kv = (l, x) => `<div class="sv-kv"><div class="sv-k">${esc(l)}</div><div class="sv-v">${x}</div></div>`;
    return `<div class="pv-meta fd-meta-grid">${kv(t("fd.customer"), `<b>${esc(cu.customer_name || sr.customer_id)}</b><div class="fd-sub">${esc(cu.phone || "")}${cu.customer_type ? " · " + esc(cu.customer_type) : ""}</div>`)}
      ${kv(t("fd.vehicle"), `${esc(v.brand)} ${esc(v.model)} ${esc(v.year)}<div class="fd-sub">${esc(v.plate_number)}${v.color ? " · " + esc(v.color) : ""}</div>`)}
      ${kv(t("fd.complaint"), esc(a.complaint || sr.customer_complaint || "–"))}
      ${cu.customer_type === "Insurance" && a.insurance ? kv(t("fd.insurance"), `${esc(a.insurance.insurer)}<div class="fd-sub">${esc(t("fd.policy"))} ${esc(a.insurance.policy_no)} · ${esc(t("fd.claim"))} ${esc(a.insurance.claim_no)}</div>`) : ""}</div>`;
  }

  const has = (sr) => !!RV.assessmentOf(sr);
  function html(sr, mode) {
    const a = RV.assessmentOf(sr); if (!a) return "";
    try {
      const edit = mode === "workshop" && RV.editable(a), w = RV.working(a), ui = RV.ui(a), opts = RV.options();
      const list = mode === "customer" ? w.findings.filter((f) => !f.removed) : w.findings;
      const banners = [!RV.engine() ? `<div class="banner banner-warn"><div>${esc(t("fd.engine"))}</div></div>` : "",
        edit && w.issues.unmapped.length ? `<div class="banner banner-warn"><div>${esc(t("fd.issue_unmapped", { n: w.issues.unmapped.length }))}</div></div>` : "",
        edit && w.issues.no_action.length ? `<div class="banner banner-info"><div>${esc(t("fd.issue_action", { n: w.issues.no_action.length }))}</div></div>` : ""].join("");
      return `<div class="card fd" id="fd-${esc(a.assessment_id)}"><div class="card-title fd-title"><span>${esc(t("fd.title"))} <span class="pv-count">${list.filter((f) => !f.removed).length}</span></span>${edit ? `<button type="button" class="btn btn-primary btn-sm" data-fd-add>${ICONS.plus || "+"} ${esc(t("fd.add"))}</button>` : ""}</div>
        <div class="card-desc">${esc(t(mode === "customer" ? "fd.desc_cu" : "fd.desc_ws"))}</div>${banners}
        <div class="fd-list">${list.length ? list.map((f) => card(a, f, mode, edit, ui, opts)).join("") : `<div class="empty-state">${esc(t("fd.empty"))}</div>`}</div></div>`;
    } catch (e) { console.error("[findings]", e); return `<div class="card"><div class="banner banner-warn"><div>${esc(t("pv.render_error"))}</div></div></div>`; }
  }

  function wire(sr, mode) {
    const a = RV.assessmentOf(sr); if (!a) return;
    const root = document.getElementById("fd-" + a.assessment_id); if (!root) return;
    const ui = RV.ui(a), edit = mode === "workshop" && RV.editable(a), dr = edit ? RV.draft(a) : null;
    const W = () => RV.working(a), fOf = (id) => W().findings.find((f) => f.id === id), manOf = (id) => dr && dr.added.find((x) => x.id === id);
    root.querySelectorAll("[data-fd-toggle]").forEach((b) => (b.onclick = () => { const id = b.dataset.fdToggle; if (mode === "customer") return; ui.open[id] = !(ui.open[id] || ui.sel === id); ui.sel = ui.open[id] ? id : ui.sel === id ? null : ui.sel; const f = fOf(id); if (ui.open[id] && f) { const i = a.photos.findIndex((p) => p.id === f.photo_id); if (i >= 0) ui.photo = i; } renderContent(); }));
    if (!edit) return;
    const setField = (id, field, value) => {
      const man = manOf(id);
      if (man) { man[field] = value; return; }
      const f = fOf(id), e = (dr.edits[id] = dr.edits[id] || {});
      if (f && f.original && (f.original[field] ?? null) === value) delete e[field]; else e[field] = value;
      if (!Object.keys(e).length) delete dr.edits[id];
    };
    root.querySelectorAll("[data-fd-edit]").forEach((s) => (s.onchange = () => { setField(s.dataset.fdEdit, s.dataset.field, s.value || null); renderContent(); }));
    root.querySelectorAll("[data-fd-photo]").forEach((s) => (s.onchange = () => { const m = manOf(s.dataset.fdPhoto); if (m) { m.photo_id = s.value; m.bbox = null; } renderContent(); }));
    root.querySelectorAll("[data-fd-pct]").forEach((inp) => (inp.onchange = () => { const v = inp.value === "" ? null : Math.max(0, Math.min(100, Math.round(+inp.value))); setField(inp.dataset.fdPct, "damage_pct", Number.isFinite(v) ? v : null); renderContent(); }));
    root.querySelectorAll("[data-fd-del]").forEach((b) => (b.onclick = () => { const id = b.dataset.fdDel, m = manOf(id);
      if (m) { dr.added = dr.added.filter((x) => x.id !== id); delete dr.costing[id]; delete dr.edits[id]; toast(t("fd.manual_removed")); } else dr.removed[id] = true;
      if (ui.sel === id) ui.sel = null; renderContent(); }));
    root.querySelectorAll("[data-fd-undo]").forEach((b) => (b.onclick = () => { delete dr.removed[b.dataset.fdUndo]; renderContent(); }));
    root.querySelectorAll("[data-fd-draw]").forEach((b) => (b.onclick = () => { const f = fOf(b.dataset.fdDraw); if (f && V.photoViewer) V.photoViewer.startDraw(a, f.id, f.photo_id, f.current.part || t("fd.region", { n: f.index })); }));
    root.querySelectorAll("[data-fd-clear]").forEach((b) => (b.onclick = () => { const id = b.dataset.fdClear, m = manOf(id); if (m) m.bbox = null; else delete dr.boxes[id]; renderContent(); }));
    const add = root.querySelector("[data-fd-add]");
    if (add) add.onclick = () => {
      const w = W(), photo = w.photos[Math.min(ui.photo || 0, w.photos.length - 1)], id = RV.nextManualId(a);
      if (!photo) return;
      dr.added.push({ id, photo_id: photo.id, source: "manual", part: null, damage_type: null, severity: null, repair_action: null, damage_pct: null, bbox: null, added_by: (state.user && state.user.name) || "Workshop" });
      ui.open[id] = true; ui.sel = id;
      if (V.photoViewer) V.photoViewer.startDraw(a, id, photo.id, t("fd.region", { n: w.findings.length + 1 })); else renderContent();
    };
  }

  V.findings = { has, metaHTML, html, wire };
})();
