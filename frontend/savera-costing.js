/* SAVERA — Tahap 4: rincian biaya (referensi S2). Muat SETELAH savera-findings.js.
   Tabel temuan + checkbox ikut estimasi, View Breakdown per temuan, panel Cost Summary.
   Biaya otomatis = matchPricing() (3 tingkat) lewat savera-review.js; override manual disimpan di draft.
   Total baris = lineTotal(field); Summary = calcSummary(lines) — satu sumber kebenaran.
   API: SAVERA_V2.costing = { has, html, wire } */
(function () {
  const V = window.SAVERA_V2, A = window.SAVERA_ASSESSMENT, I = window.SAVERA_I18N;
  if (!V || !A || !I || !V.review) return;
  const RV = V.review, t = I.t, L = () => I.lang(), F = A.formatRupiah;
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const pct = (v) => (v == null || !Number.isFinite(+v) ? "–" : Math.round(+v) + "%");
  const FIELDS = [["spare_part", "ct.spare"], ["labor", "ct.labor"], ["painting", "ct.paint"], ["additional", "ct.add"]];

  I.add({
    en: { "ct.title": "Damage verification & cost estimation", "ct.include": "Include in estimate", "ct.part": "Part", "ct.damage": "Damage", "ct.sev": "Severity", "ct.conf": "AI Confidence", "ct.cost": "Estimated Repair Cost",
      "ct.view": "View Breakdown", "ct.hide": "Hide Breakdown", "ct.spare": "Spare Part", "ct.labor": "Labor", "ct.paint": "Painting", "ct.add": "Additional", "ct.total": "Estimated Total", "ct.range": "Cost Range",
      "ct.tier1": "Matched: part, damage, severity, brand & model", "ct.tier2": "Matched: part, damage, severity & brand", "ct.tier3": "Matched: part, damage & severity",
      "ct.na": "Pricing data unavailable", "ct.na_engine": "Pricing data unavailable — pricing engine not loaded.", "ct.na_unmapped": "Pricing data unavailable — model label has no match in the pricing vocabulary.",
      "ct.na_incomplete": "Pricing data unavailable — complete part, damage type and severity first.", "ct.na_no_match": "Pricing data unavailable — no pricing record for this combination.", "ct.na_fill": "Fill in the costs manually.",
      "ct.manual": "edited manually", "ct.reset": "Reset to automatic estimate", "ct.below": "Below the cost range ({min} – {max}).", "ct.above": "Above the cost range ({min} – {max}).",
      "ct.part_info": "Part & stock", "ct.stock": "stock {n}", "ct.need": "needs {n}", "ct.st_ok": "Available", "ct.st_low": "Insufficient", "ct.st_out": "Out of stock", "ct.no_part": "No spare part needed ({a}).",
      "ct.no_action": "Choose a Repair Action to see part needs.", "ct.part_missing": "Part not found in the spare-part master.",
      "ct.summary": "Cost Summary", "ct.sum_desc": "Calculated from the fields above", "ct.sub_spare": "Parts subtotal", "ct.sub_labor": "Labor subtotal", "ct.sub_paint": "Painting subtotal", "ct.sub_add": "Additional cost",
      "ct.subtotal": "Subtotal", "ct.discount": "Discount", "ct.tax": "VAT {r}%", "ct.grand": "Grand Total", "ct.excluded": "{n} item(s) not included.", "ct.unpriced": "{n} included item(s) have no price yet — fill in manually or exclude.",
      "ct.out_range": "{n} item(s) outside the cost range.", "ct.initial": "Initial estimate", "ct.verified": "Verified estimate", "ct.empty": "No findings to estimate.", "ct.all_priced": "All included items are priced." },
    id: { "ct.title": "Verifikasi kerusakan & estimasi biaya", "ct.include": "Ikut estimasi", "ct.part": "Part", "ct.damage": "Kerusakan", "ct.sev": "Tingkat", "ct.conf": "Keyakinan AI", "ct.cost": "Estimasi biaya",
      "ct.view": "View Breakdown", "ct.hide": "Tutup rincian", "ct.spare": "Spare Part", "ct.labor": "Labor", "ct.paint": "Painting", "ct.add": "Additional", "ct.total": "Estimated Total", "ct.range": "Cost Range",
      "ct.tier1": "Matched: part, damage, severity, brand & model", "ct.tier2": "Matched: part, damage, severity & brand", "ct.tier3": "Matched: part, damage & severity",
      "ct.na": "Pricing data unavailable", "ct.na_engine": "Pricing data unavailable — mesin harga belum dimuat.", "ct.na_unmapped": "Pricing data unavailable — label model tidak punya padanan di kosakata harga.",
      "ct.na_incomplete": "Pricing data unavailable — lengkapi part, jenis, dan tingkat kerusakan dulu.", "ct.na_no_match": "Pricing data unavailable — tidak ada data harga untuk kombinasi ini.", "ct.na_fill": "Isi biaya secara manual.",
      "ct.manual": "diubah manual", "ct.reset": "Reset ke estimasi otomatis", "ct.below": "Di bawah cost range ({min} – {max}).", "ct.above": "Di atas cost range ({min} – {max}).",
      "ct.part_info": "Part & stok", "ct.stock": "stok {n}", "ct.need": "butuh {n}", "ct.st_ok": "Tersedia", "ct.st_low": "Kurang", "ct.st_out": "Habis", "ct.no_part": "Tidak butuh spare part ({a}).",
      "ct.no_action": "Pilih Repair Action untuk melihat kebutuhan part.", "ct.part_missing": "Part tidak ditemukan di master spare part.",
      "ct.summary": "Cost Summary", "ct.sum_desc": "Dihitung dari field di samping", "ct.sub_spare": "Subtotal spare part", "ct.sub_labor": "Subtotal labor", "ct.sub_paint": "Subtotal painting", "ct.sub_add": "Biaya tambahan",
      "ct.subtotal": "Subtotal", "ct.discount": "Diskon", "ct.tax": "PPN {r}%", "ct.grand": "Grand Total", "ct.excluded": "{n} item tidak ikut estimasi.", "ct.unpriced": "{n} item yang ikut estimasi belum ada harga — isi manual atau keluarkan.",
      "ct.out_range": "{n} item di luar cost range.", "ct.initial": "Estimasi awal", "ct.verified": "Estimasi terverifikasi", "ct.empty": "Belum ada temuan untuk diestimasi.", "ct.all_priced": "Semua item yang ikut estimasi sudah berharga." },
  });

  const sevBadge = (s) => (s ? `<span class="badge badge-${esc(String(s).toLowerCase())}">${esc(A.label("severity", s, L()))}</span>` : "–");
  const minConf = (c) => { const xs = [c.part_confidence, c.damage_type_confidence, c.severity_confidence].filter((x) => x != null); return xs.length ? Math.min(...xs) : null; };
  const stBadge = (st) => (st ? `<span class="badge badge-${st === "ok" ? "ok" : st === "low" ? "pending" : "rejected"}">${esc(t("ct.st_" + st))}</span>` : "");
  const rangeMsg = (l) => { if (!l.has_cost || l.cost_min == null) return ""; const r = A.checkRange(l), v = { min: F(l.cost_min), max: F(l.cost_max) }; return r.below ? t("ct.below", v) : r.above ? t("ct.above", v) : ""; };

  function summaryInner(a, w, edit, mode) {
    const s = w.summary, b = s.by_category, inc = w.findings.filter((f) => !f.removed), excl = inc.filter((f) => !f.line.include).length;
    const row = (l, v, cls) => `<div class="summary-row${cls ? " " + cls : ""}"><span>${esc(l)}</span><strong>${v}</strong></div>`;
    const decided = a.decision && a.decision.status === "approved";
    return `<div class="card-title">${esc(t("ct.summary"))}</div><div class="card-desc">${esc(mode === "customer" ? t(decided ? "ct.verified" : "ct.initial") : t("ct.sum_desc"))}</div>
      <div class="ct-sum-rows">${row(t("ct.sub_spare"), F(b.spare_part))}${row(t("ct.sub_labor"), F(b.labor))}${row(t("ct.sub_paint"), F(b.painting))}${row(t("ct.sub_add"), F(b.additional))}
      ${row(t("ct.subtotal"), F(s.subtotal), "ct-strong")}
      ${edit ? `<div class="summary-row"><span><label for="ctDisc">${esc(t("ct.discount"))}</label></span><span class="ct-disc"><span>Rp</span><input id="ctDisc" class="input" type="number" min="0" step="1000" inputmode="numeric" data-ct-discount value="${s.discount}"></span></div>` : row(t("ct.discount"), s.discount ? "− " + F(s.discount) : F(0))}
      ${row(t("ct.tax", { r: +(s.tax_rate * 100).toFixed(2) }), F(s.tax))}
      ${row(t("ct.grand"), F(s.total), "ct-grand")}</div>
      <div class="ct-notes">${excl ? `<div>${esc(t("ct.excluded", { n: excl }))}</div>` : ""}${w.issues.unpriced.length ? `<div class="ct-warn">${esc(t("ct.unpriced", { n: w.issues.unpriced.length }))}</div>` : ""}${w.issues.out_of_range.length ? `<div class="ct-warn">${esc(t("ct.out_range", { n: w.issues.out_of_range.length }))}</div>` : ""}${!w.issues.unpriced.length && inc.length ? `<div>${esc(t("ct.all_priced"))}</div>` : ""}</div>`;
  }

  function breakdown(f, edit) {
    const l = f.line, c = f.current, na = !f.price.priced;
    const field = ([k, lk]) => `<div class="summary-row"><span>${esc(t(lk))}</span>${edit ? `<input class="input ct-in" type="number" min="0" step="1000" inputmode="numeric" data-ct-cost="${esc(f.id)}" data-k="${k}" value="${l.has_cost ? l[k] : ""}" placeholder="0" aria-label="${esc(t(lk))}">` : `<strong>${l.has_cost ? F(l[k]) : "–"}</strong>`}</div>`;
    const naMsg = na ? `<div class="banner banner-warn ct-na"><div>${esc(t("ct.na_" + (f.price.reason || "no_match")))}${edit ? " " + esc(t("ct.na_fill")) : ""}</div></div>` : "";
    const st = l.stock ? A.stockStatus(l.stock) : null;
    const part = !c.repair_action ? esc(t("ct.no_action")) : c.repair_action !== "Replace" ? esc(t("ct.no_part", { a: A.label("repair_action", c.repair_action, L()) }))
      : l.part_id ? `<b>${esc(l.part_name)}</b> <span class="mono">(${esc(l.part_id)})</span><div class="ct-stock">${esc(t("ct.stock", { n: l.stock.on_hand }))} · ${esc(t("ct.need", { n: l.stock.required }))} ${stBadge(st)}</div>` : esc(t("ct.part_missing"));
    const msg = rangeMsg(l);
    return `<div class="ct-bd-grid"><div>${naMsg}${FIELDS.map(field).join("")}
        <div class="summary-row ct-strong"><span>${esc(t("ct.total"))}</span><strong data-ct-total="${esc(f.id)}">${l.has_cost ? F(A.lineTotal(l)) : "–"}</strong></div>
        <div class="summary-row"><span>${esc(t("ct.range"))}</span><strong>${l.cost_min != null ? `${F(l.cost_min)} – ${F(l.cost_max)}` : "–"}</strong></div>
        <div class="banner banner-warn ct-range" data-ct-warn="${esc(f.id)}" ${msg ? "" : "hidden"}><div>${esc(msg)}</div></div>
        <div class="ct-match">${f.price.priced ? esc(t("ct.tier" + f.price.tier)) : esc(t("ct.na"))}${l.manual ? ` · <span class="badge badge-pending">${esc(t("ct.manual"))}</span>` : ""}</div></div>
      <div class="ct-side"><div class="sv-chain-cap">${esc(t("ct.part_info"))}</div><div class="ct-part">${part}</div>
        ${edit && l.manual && f.price.priced ? `<button type="button" class="btn btn-ghost btn-sm" data-ct-reset="${esc(f.id)}">${esc(t("ct.reset"))}</button>` : ""}</div></div>`;
  }

  const has = (sr) => !!RV.assessmentOf(sr);
  function html(sr, mode) {
    const a = RV.assessmentOf(sr); if (!a) return "";
    try {
      const edit = mode === "workshop" && RV.editable(a), w = RV.working(a), ui = RV.ui(a), bd = (ui.bd = ui.bd || {}), v = a.vehicle || {};
      const rows = w.findings.filter((f) => !f.removed);
      const body = rows.length ? rows.map((f) => { const c = f.current, l = f.line, mc = f.source === "ai" ? minConf(c) : null, open = !!bd[f.id];
        const confTitle = f.source === "ai" ? [["fd.area", c.part_confidence], ["fd.type", c.damage_type_confidence], ["fd.sev", c.severity_confidence]].filter((x) => x[1] != null).map(([k, x]) => `${t(k)} ${pct(x * 100)}`).join(" · ") : "";
        return `<tr class="${l.include ? "" : "ct-off"}${ui.sel === f.id ? " ct-sel" : ""}">
          <td data-label="${esc(t("ct.include"))}"><input type="checkbox" data-ct-inc="${esc(f.id)}" ${l.include ? "checked" : ""} ${edit ? "" : "disabled"} aria-label="${esc(t("ct.include"))} ${esc(c.part || "")}"></td>
          <td data-label="${esc(t("ct.part"))}"><b>${esc(c.part || (c.cv_label && c.cv_label.part) || "–")}</b></td>
          <td data-label="${esc(t("ct.damage"))}">${esc(c.damage_type || "–")}</td>
          <td data-label="${esc(t("ct.sev"))}">${sevBadge(c.severity)}</td>
          <td data-label="${esc(t("ct.conf"))}" class="mono" title="${esc(confTitle)}">${f.source === "manual" ? esc(t("pv.manual")) : pct(mc * 100)}</td>
          <td data-label="${esc(t("ct.cost"))}" class="mono ct-amt" data-ct-amt="${esc(f.id)}">${l.has_cost ? F(A.lineTotal(l)) : `<span class="fd-na">${esc(t("ct.na"))}</span>`}</td>
          <td><button type="button" class="ct-toggle" data-ct-bd="${esc(f.id)}" aria-expanded="${open}">${open ? "▾" : "▸"} ${esc(t(open ? "ct.hide" : "ct.view"))}</button></td></tr>
          ${open ? `<tr class="ct-bd"><td colspan="7">${breakdown(f, edit)}</td></tr>` : ""}`; }).join("")
        : `<tr><td colspan="7"><div class="empty-state">${esc(t("ct.empty"))}</div></td></tr>`;
      return `<div class="ct" id="ct-${esc(a.assessment_id)}"><div class="ct-grid">
        <div class="card"><div class="card-title">${esc(t("ct.title"))}</div><div class="card-desc">${esc(v.brand)} ${esc(v.model)} ${esc(v.year)} · ${esc(v.plate_number)}</div>
          <div class="table-wrap ct-wrap"><table class="ct-table"><thead><tr><th><span class="sr-only">${esc(t("ct.include"))}</span></th><th>${esc(t("ct.part"))}</th><th>${esc(t("ct.damage"))}</th><th>${esc(t("ct.sev"))}</th><th>${esc(t("ct.conf"))}</th><th>${esc(t("ct.cost"))}</th><th></th></tr></thead><tbody>${body}</tbody></table></div></div>
        <div class="card ct-sum" data-ct-sum>${summaryInner(a, w, edit, mode)}</div></div></div>`;
    } catch (e) { console.error("[costing]", e); return `<div class="card"><div class="banner banner-warn"><div>${esc(t("pv.render_error"))}</div></div></div>`; }
  }

  function wire(sr, mode) {
    const a = RV.assessmentOf(sr); if (!a) return;
    const root = document.getElementById("ct-" + a.assessment_id); if (!root) return;
    const ui = RV.ui(a), edit = mode === "workshop" && RV.editable(a);
    root.querySelectorAll("[data-ct-bd]").forEach((b) => (b.onclick = () => { ui.bd = ui.bd || {}; ui.bd[b.dataset.ctBd] = !ui.bd[b.dataset.ctBd]; renderContent(); }));
    if (!edit) return;
    const dr = RV.draft(a), cc = (id) => (dr.costing[id] = dr.costing[id] || {});
    /* pembaruan ringan tanpa render ulang (fokus input tetap) */
    const refresh = (id) => {
      const w = RV.working(a), f = w.findings.find((x) => x.id === id);
      if (f) { const tot = root.querySelector(`[data-ct-total="${id}"]`), amt = root.querySelector(`[data-ct-amt="${id}"]`), warn = root.querySelector(`[data-ct-warn="${id}"]`), m = rangeMsg(f.line);
        if (tot) tot.textContent = F(A.lineTotal(f.line)); if (amt) amt.textContent = F(A.lineTotal(f.line)); if (warn) { warn.hidden = !m; warn.firstElementChild.textContent = m; } }
      const sum = root.querySelector("[data-ct-sum]"), focused = !!(document.activeElement && document.activeElement.hasAttribute("data-ct-discount"));
      if (sum) { sum.innerHTML = summaryInner(a, w, true, mode); bindDiscount(focused); }
    };
    function bindDiscount(refocus) {
      const d = root.querySelector("[data-ct-discount]"); if (!d) return;
      if (refocus) { d.focus(); const v = d.value; d.value = ""; d.value = v; }
      d.oninput = () => { const v = Math.max(0, Math.round(+d.value || 0)); dr.discount = v; refresh(null); };
    }
    bindDiscount();
    root.querySelectorAll("[data-ct-inc]").forEach((cb) => (cb.onchange = () => { cc(cb.dataset.ctInc).include = cb.checked; renderContent(); }));
    root.querySelectorAll("[data-ct-reset]").forEach((b) => (b.onclick = () => { delete cc(b.dataset.ctReset).override; renderContent(); }));
    root.querySelectorAll("[data-ct-cost]").forEach((inp) => {
      inp.oninput = () => {
        const id = inp.dataset.ctCost, f = RV.working(a).findings.find((x) => x.id === id); if (!f) return;
        const base = f.line.has_cost ? { spare_part: f.line.spare_part, labor: f.line.labor, painting: f.line.painting, additional: f.line.additional } : { spare_part: 0, labor: 0, painting: 0, additional: 0 };
        base[inp.dataset.k] = Math.max(0, Math.round(+inp.value || 0));
        const auto = f.line.auto, same = auto && FIELDS.every(([k]) => base[k] === auto[k]);
        if (same) delete cc(id).override; else cc(id).override = base;
        refresh(id);
      };
      /* selesai mengetik: render ulang (badge manual, tombol reset, kartu & viewer) lalu kembalikan fokus ke field yang dituju */
      inp.onchange = () => setTimeout(() => {
        const act = document.activeElement, key = act && act.dataset && act.dataset.ctCost ? [act.dataset.ctCost, act.dataset.k, act.selectionStart] : act && act.hasAttribute && act.hasAttribute("data-ct-discount") ? ["disc"] : null;
        renderContent();
        if (!key) return;
        const el = key[0] === "disc" ? document.querySelector("[data-ct-discount]") : document.querySelector(`[data-ct-cost="${key[0]}"][data-k="${key[1]}"]`);
        if (el) { el.focus(); if (el.select) el.select(); }
      }, 0);
    });
  }

  V.costing = { has, html, wire };
})();
