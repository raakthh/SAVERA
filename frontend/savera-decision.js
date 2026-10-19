/* SAVERA — Tahap 5: alur keputusan. Muat SETELAH savera-costing.js.
   - Stepper Submitted → Under Assessment → Approved → In Repair → Completed (menimpa V.stepper; savera-v2.js tidak diubah)
   - Workshop: Approve (modal konfirmasi) / Request revision (alasan wajib) / Reject (alasan wajib, tampil ke customer)
   - Approve: status Approved + terbitkan ID work order (= Repair Order, format RO####) dan nomor invoice (INV-YYYY-####).
   API: SAVERA_V2.decision = { html(sr), wire(sr), customerBanner(sr), statusLabel(sr) } */
(function () {
  const V = window.SAVERA_V2, A = window.SAVERA_ASSESSMENT, I = window.SAVERA_I18N, CV = window.SAVERA_CV;
  if (!V || !A || !I || !V.review) return;
  const RV = V.review, t = I.t, L = () => I.lang(), F = A.formatRupiah, MIN = (CV && CV.CONFIG.min_reason) || 10;
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const today = () => new Date().toISOString().slice(0, 10);
  const fmtDate = (d) => { const x = d ? new Date(String(d).slice(0, 10) + "T00:00:00") : null; return x && !isNaN(x) ? x.toLocaleDateString(L() === "id" ? "id-ID" : "en-GB", { day: "numeric", month: "long", year: "numeric" }) : "–"; };

  I.add({
    en: { "st.Submitted": "Submitted", "st.Under Assessment": "Under Assessment", "st.Approved": "Approved", "st.In Repair": "In Repair", "st.Completed": "Completed", "st.rejected": "Rejected", "st.revision": "Revision requested",
      "dc.title": "Decision", "dc.desc": "Approve the estimate, ask for a revision, or reject this assessment.", "dc.notes": "Workshop notes (optional)", "dc.notes_ph": "e.g. damage deeper than in the photo, frame check needed…",
      "dc.approve": "Approve", "dc.revision": "Request revision", "dc.reject": "Reject", "dc.block_none": "Include at least one item in the estimate.", "dc.block_unpriced": "{n} included item(s) have no price — fill in manually or exclude.",
      "dc.block_action": "{n} included item(s) have no Repair Action.", "dc.block_zero": "The total must be greater than 0.", "dc.warn_range": "{n} item(s) outside the cost range.", "dc.warn_stock": "{n} part(s) not in stock — the repair will wait for parts.",
      "dc.m_approve": "Approve assessment?", "dc.m_items": "{n} item(s) included", "dc.m_after": "Status becomes Approved; a work order and an invoice number are issued.", "dc.confirm": "Approve", "dc.cancel": "Cancel",
      "dc.m_revision": "Request revision", "dc.m_reject": "Reject assessment", "dc.reason": "Reason (shown to the customer)", "dc.reason_min": "At least {n} characters.", "dc.send_rev": "Send revision request", "dc.send_rej": "Reject",
      "dc.done_approved": "Approved by {by} on {at}.", "dc.done_rejected": "Rejected by {by} on {at}.", "dc.done_revision": "Revision requested by {by} on {at}.", "dc.reason_lbl": "Reason", "dc.notes_lbl": "Notes",
      "dc.docs": "Documents", "dc.wo": "Work order", "dc.inv": "Invoice", "dc.docs_later": "Documents are generated in the next step.", "dc.toast_ok": "{sr} approved · {ro} · {inv}", "dc.toast_rev": "Revision requested for {sr}", "dc.toast_rej": "{sr} rejected",
      "dc.cu_rev": "The workshop asked for a revision", "dc.cu_rej": "Rejected by the workshop", "dc.cu_ok": "Approved by the workshop", "dc.cu_ok_desc": "Invoice {inv} · work order {ro}", "dc.not_allowed": "This action is not allowed for status {s}." },
    id: { "st.Submitted": "Diajukan", "st.Under Assessment": "Dinilai", "st.Approved": "Disetujui", "st.In Repair": "Diperbaiki", "st.Completed": "Selesai", "st.rejected": "Ditolak", "st.revision": "Revisi diminta",
      "dc.title": "Keputusan", "dc.desc": "Setujui estimasi, minta revisi, atau tolak assessment ini.", "dc.notes": "Catatan workshop (opsional)", "dc.notes_ph": "Mis. kerusakan lebih dalam dari foto, perlu cek rangka…",
      "dc.approve": "Approve", "dc.revision": "Request revision", "dc.reject": "Reject", "dc.block_none": "Sertakan minimal satu item dalam estimasi.", "dc.block_unpriced": "{n} item yang ikut estimasi belum ada harga — isi manual atau keluarkan.",
      "dc.block_action": "{n} item yang ikut estimasi belum punya Repair Action.", "dc.block_zero": "Total harus lebih dari 0.", "dc.warn_range": "{n} item di luar cost range.", "dc.warn_stock": "{n} part tidak tersedia — repair menunggu part.",
      "dc.m_approve": "Setujui assessment?", "dc.m_items": "{n} item ikut estimasi", "dc.m_after": "Status menjadi Approved; work order dan nomor invoice diterbitkan.", "dc.confirm": "Approve", "dc.cancel": "Batal",
      "dc.m_revision": "Minta revisi", "dc.m_reject": "Tolak assessment", "dc.reason": "Alasan (tampil ke customer)", "dc.reason_min": "Minimal {n} karakter.", "dc.send_rev": "Kirim permintaan revisi", "dc.send_rej": "Tolak",
      "dc.done_approved": "Disetujui oleh {by} pada {at}.", "dc.done_rejected": "Ditolak oleh {by} pada {at}.", "dc.done_revision": "Revisi diminta oleh {by} pada {at}.", "dc.reason_lbl": "Alasan", "dc.notes_lbl": "Catatan",
      "dc.docs": "Dokumen", "dc.wo": "Work order", "dc.inv": "Invoice", "dc.docs_later": "Dokumen dibuat di tahap berikutnya.", "dc.toast_ok": "{sr} disetujui · {ro} · {inv}", "dc.toast_rev": "Revisi diminta untuk {sr}", "dc.toast_rej": "{sr} ditolak",
      "dc.cu_rev": "Workshop meminta revisi", "dc.cu_rej": "Ditolak oleh workshop", "dc.cu_ok": "Disetujui oleh workshop", "dc.cu_ok_desc": "Invoice {inv} · work order {ro}", "dc.not_allowed": "Aksi ini tidak diizinkan untuk status {s}." },
  });

  /* ---------------- stepper ---------------- */
  V.stepper = function (status, sr) {
    const a = sr && RV.assessmentOf(sr), m = A.stepperModel(status, a ? a.decision : status === "Cancelled" ? { status: "rejected" } : null);
    return `<ol class="st" aria-label="Status">${m.map((x, i) => {
      const lbl = x.flag ? t("st." + x.flag) : t("st." + x.key), icon = x.state === "done" ? "✓" : x.flag === "rejected" ? "✕" : x.flag === "revision" ? "!" : i + 1;
      return `<li class="st-step st-${x.state}${x.flag ? " st-" + x.flag : ""}" ${x.state === "current" || x.state === "stopped" ? 'aria-current="step"' : ""}><span class="st-dot">${icon}</span><span class="st-lbl">${esc(lbl)}</span></li>`; }).join("")}</ol>`;
  };
  V.statusLabel = (sr) => { const a = RV.assessmentOf(sr); return a && a.decision && a.decision.status === "revision" && sr.request_status === "Under Assessment" ? "Revision Requested" : sr.request_status; };

  /* ---------------- validasi approve ---------------- */
  function check(w) {
    const blocks = [], warns = [], is = w.issues;
    if (!w.included) blocks.push(t("dc.block_none"));
    if (is.unpriced.length) blocks.push(t("dc.block_unpriced", { n: is.unpriced.length }));
    if (is.no_action.length) blocks.push(t("dc.block_action", { n: is.no_action.length }));
    if (w.included && !(w.summary.total > 0)) blocks.push(t("dc.block_zero"));
    if (is.out_of_range.length) warns.push(t("dc.warn_range", { n: is.out_of_range.length }));
    if (is.out_of_stock.length) warns.push(t("dc.warn_stock", { n: is.out_of_stock.length }));
    return { blocks, warns };
  }

  /* ---------------- tampilan workshop ---------------- */
  function docsHTML(a) {
    const d = a.decision || {}; if (d.status !== "approved") return "";
    const link = V.documents && V.documents.linkHTML;
    return `<div class="dc-docs"><div class="sv-chain-cap">${esc(t("dc.docs"))}</div><div class="dc-doc-row">
      ${link ? link(a, "work_order") + link(a, "invoice") : `<span class="sv-chip">${esc(t("dc.wo"))} <b class="mono">${esc(d.ro_id)}</b></span><span class="sv-chip">${esc(t("dc.inv"))} <b class="mono">${esc(d.invoice_no)}</b></span><div class="fd-sub">${esc(t("dc.docs_later"))}</div>`}</div></div>`;
  }
  function doneHTML(a) {
    const d = a.decision || {}, key = { approved: "dc.done_approved", rejected: "dc.done_rejected", revision: "dc.done_revision" }[d.status];
    if (!key) return "";
    const cls = d.status === "approved" ? "dc-ok" : d.status === "rejected" ? "banner-warn dc-bad" : "banner-warn";
    return `<div class="banner ${cls}"><div><b>${esc(t(key, { by: d.by || "–", at: fmtDate(d.at) }))}</b>${d.notes ? `<div>${esc(t(d.status === "approved" ? "dc.notes_lbl" : "dc.reason_lbl"))}: ${esc(d.notes)}</div>` : ""}</div></div>`;
  }
  function html(sr) {
    const a = RV.assessmentOf(sr); if (!a) return "";
    const edit = RV.editable(a);
    if (!edit) return `<div class="card dc" id="dc-${esc(a.assessment_id)}"><div class="card-title">${esc(t("dc.title"))}</div>${doneHTML(a)}${docsHTML(a)}
      <div style="margin-top:14px;"><button class="btn btn-ghost btn-sm" data-nav="w-assessment">← Back to list</button></div></div>`;
    const w = RV.working(a), c = check(w), dr = RV.draft(a);
    return `<div class="card dc" id="dc-${esc(a.assessment_id)}"><div class="card-title">${esc(t("dc.title"))}</div><div class="card-desc">${esc(t("dc.desc"))}</div>
      ${a.decision && a.decision.status === "revision" ? doneHTML(a) : ""}
      ${c.blocks.length ? `<div class="banner banner-warn"><div>${c.blocks.map(esc).join("<br>")}</div></div>` : ""}${c.warns.length ? `<div class="banner banner-info"><div>${c.warns.map(esc).join("<br>")}</div></div>` : ""}
      <div class="field"><label for="dcNotes">${esc(t("dc.notes"))}</label><textarea class="input" id="dcNotes" style="min-height:60px;" placeholder="${esc(t("dc.notes_ph"))}">${esc(dr.notes || "")}</textarea></div>
      <div class="dc-btns"><button type="button" class="btn btn-primary" data-dc="approve" ${c.blocks.length ? "disabled" : ""}>${ICONS.check || ""} ${esc(t("dc.approve"))}</button>
        <button type="button" class="btn btn-ghost" data-dc="revision">${esc(t("dc.revision"))}</button><button type="button" class="btn btn-danger" data-dc="reject">${esc(t("dc.reject"))}</button>
        <button type="button" class="btn btn-ghost" data-nav="w-assessment">← Back to list</button></div></div>`;
  }

  /* ---------------- modal (memakai .modal-* yang sudah ada) ---------------- */
  function modal(title, body, okLabel, okCls, onOk) {
    const el = document.createElement("div"); el.className = "modal-backdrop"; el.setAttribute("role", "dialog"); el.setAttribute("aria-modal", "true"); el.setAttribute("aria-label", title);
    el.innerHTML = `<div class="modal-box dc-modal"><div class="modal-head"><div class="modal-title">${esc(title)}</div><button class="modal-x" data-x aria-label="${esc(t("dc.cancel"))}">${ICONS.x || "×"}</button></div><div class="modal-body">${body}</div>
      <div class="modal-foot"><button class="btn btn-ghost" data-x>${esc(t("dc.cancel"))}</button><button class="btn ${okCls}" data-ok>${esc(okLabel)}</button></div></div>`;
    const close = () => { el.remove(); document.removeEventListener("keydown", key); }, key = (e) => e.key === "Escape" && close();
    el.addEventListener("click", (e) => { if (e.target === el || e.target.closest("[data-x]")) close(); });
    el.querySelector("[data-ok]").onclick = () => { if (onOk(el) !== false) close(); };
    document.addEventListener("keydown", key); document.body.appendChild(el);
    (el.querySelector("textarea") || el.querySelector("[data-ok]")).focus();
    return el;
  }
  function approveModal(a, sr) {
    const w = RV.working(a), s = w.summary, c = check(w);
    if (c.blocks.length) return toast(c.blocks[0]);
    const row = (l, v, cls) => `<div class="summary-row${cls ? " " + cls : ""}"><span>${esc(l)}</span><strong>${v}</strong></div>`;
    const items = w.findings.filter((f) => !f.removed && f.line.include);
    const body = `<p class="dc-lead"><b>${esc(t("dc.m_items", { n: items.length }))}</b></p>
      <ul class="dc-items">${items.map((f) => `<li><span>${esc(f.current.part)} · ${esc(f.current.damage_type)} · ${esc(A.label("repair_action", f.current.repair_action, L()))}</span><span class="mono">${F(A.lineTotal(f.line))}</span></li>`).join("")}</ul>
      ${row(t("ct.subtotal"), F(s.subtotal))}${row(t("ct.discount"), s.discount ? "− " + F(s.discount) : F(0))}${row(t("ct.tax", { r: +(s.tax_rate * 100).toFixed(2) }), F(s.tax))}${row(t("ct.grand"), F(s.total), "ct-grand")}
      ${c.warns.length ? `<div class="banner banner-warn" style="margin-top:10px;"><div>${c.warns.map(esc).join("<br>")}</div></div>` : ""}<p class="fd-sub" style="margin-top:10px;">${esc(t("dc.m_after"))}</p>`;
    modal(t("dc.m_approve"), body, t("dc.confirm"), "btn-primary", () => approve(a, sr));
  }
  function reasonModal(a, sr, kind) {
    const body = `<div class="field"><label for="dcReason">${esc(t("dc.reason"))}</label><textarea class="input" id="dcReason" style="min-height:90px;" aria-describedby="dcReasonErr"></textarea>
      <div class="hint" id="dcReasonErr" style="color:var(--bad);" aria-live="polite"></div><div class="fd-sub">${esc(t("dc.reason_min", { n: MIN }))}</div></div>`;
    modal(t(kind === "reject" ? "dc.m_reject" : "dc.m_revision"), body, t(kind === "reject" ? "dc.send_rej" : "dc.send_rev"), kind === "reject" ? "btn-danger" : "btn-primary", (el) => {
      const r = el.querySelector("#dcReason").value.trim();
      if (!A.validateReason(r, MIN)) { el.querySelector("#dcReasonErr").textContent = t("dc.reason_min", { n: MIN }); el.querySelector("#dcReason").focus(); return false; }
      (kind === "reject" ? reject : revise)(a, sr, r);
    });
  }

  /* ---------------- aksi ---------------- */
  const who = () => (state.user && state.user.name) || "Workshop";
  function approve(a, sr) {
    if (!A.canDecide(sr.request_status, "approve")) return toast(t("dc.not_allowed", { s: sr.request_status }));
    const w = RV.working(a), dr = RV.draft(a), s = w.summary, at = today(), prev = sr.request_status;
    const inc = w.findings.filter((f) => !f.removed && f.line.include).sort((x, y) => A.sevRank(y.current.severity) - A.sevRank(x.current.severity) || A.lineTotal(y.line) - A.lineTotal(x.line));
    const main = inc[0], c = main.current, part = main.line.part_id ? { part_id: main.line.part_id, part_name: main.line.part_name } : null;
    const pcts = inc.map((f) => f.current.damage_pct).filter((x) => x != null), pctMax = pcts.length ? Math.max(...pcts) : null;
    const stockOk = !main.line.stock || A.stockStatus(main.line.stock) === "ok";
    /* RO = subtotal sebelum diskon & PPN (invoice lama tetap cocok); Grand Total tersimpan di assessment */
    const roId = V.createRepairOrder(sr, { vehicle_part: c.part, damage_type: c.damage_type, severity: c.severity, action: c.repair_action, part, total: s.subtotal, pct: pctMax, ok: stockOk });
    const ro = V.W.ro.find((r) => r.repair_order_id === roId), invNo = A.invoiceNo(roId, at);
    ro.invoice_no = invNo; ro.assessment_id = a.assessment_id; ro.payment_status = ro.payment_status || "Unpaid";
    a.review = JSON.parse(JSON.stringify(dr)); RV.discard(a);
    a.costing = w.findings.filter((f) => !f.removed).map((f) => ({ ...f.line, part: f.current.part, damage_type: f.current.damage_type, severity: f.current.severity, repair_action: f.current.repair_action, service_type: f.service_type, source: f.source }));
    a.summary = { ...s };
    a.decision = { status: "approved", by: who(), at, notes: (dr.notes || "").trim(), ro_id: roId, invoice_no: invNo };
    a.documents = [{ id: roId, type: "work_order", status: "pending_generation", created_at: at }, { id: invNo, type: "invoice", status: "pending_generation", created_at: at }];
    const b = s.by_category;
    sr.verified = { damage_type: c.damage_type, severity: c.severity, action: c.repair_action, cost: { spare: b.spare_part, labor: b.labor, paint: b.painting, add: b.additional }, total: s.subtotal, pct: pctMax, manual: inc.some((f) => f.line.manual), notes: a.decision.notes, by: who(), at, prev_status: prev, new_status: "Approved", paint: null };
    Object.assign(sr, { initial_damage_area: c.part, initial_damage_type: c.damage_type, initial_severity: c.severity, initial_estimated_cost: s.total, service_type: main.service_type || sr.service_type, request_status: "Approved", workshop_notes: a.decision.notes || `Verified: ${inc.length} item` });
    toast(t("dc.toast_ok", { sr: sr.service_request_id, ro: roId, inv: invNo })); renderContent();
  }
  function revise(a, sr, reason) {
    if (!A.canDecide(sr.request_status, "revision")) return toast(t("dc.not_allowed", { s: sr.request_status }));
    a.review = JSON.parse(JSON.stringify(RV.draft(a))); /* simpan kerja workshop; draft tetap bisa diedit */
    a.decision = { status: "revision", by: who(), at: today(), notes: reason };
    if (sr.request_status === "Submitted") sr.request_status = "Under Assessment";
    sr.workshop_notes = reason; toast(t("dc.toast_rev", { sr: sr.service_request_id })); renderContent();
  }
  function reject(a, sr, reason) {
    if (!A.canDecide(sr.request_status, "reject")) return toast(t("dc.not_allowed", { s: sr.request_status }));
    a.review = JSON.parse(JSON.stringify(RV.draft(a))); RV.discard(a);
    a.decision = { status: "rejected", by: who(), at: today(), notes: reason };
    sr.request_status = "Cancelled"; sr.workshop_notes = reason; sr.verified = null;
    toast(t("dc.toast_rej", { sr: sr.service_request_id })); renderContent();
  }

  function wire(sr) {
    const a = RV.assessmentOf(sr); if (!a) return;
    const root = document.getElementById("dc-" + a.assessment_id); if (!root || !RV.editable(a)) return;
    const n = root.querySelector("#dcNotes"); if (n) n.oninput = () => (RV.draft(a).notes = n.value);
    root.querySelectorAll("[data-dc]").forEach((b) => (b.onclick = () => { const k = b.dataset.dc; if (k === "approve") approveModal(a, sr); else reasonModal(a, sr, k); }));
  }

  /* ---------------- customer ---------------- */
  function customerBanner(sr) {
    const a = RV.assessmentOf(sr), d = a && a.decision; if (!d || d.status === "pending") return "";
    if (d.status === "revision" && sr.request_status !== "Under Assessment") return "";
    const k = { revision: ["banner-warn", "dc.cu_rev"], rejected: ["banner-warn dc-bad", "dc.cu_rej"], approved: ["dc-ok", "dc.cu_ok"] }[d.status]; if (!k) return "";
    const extra = d.status === "approved" ? `<div>${esc(t("dc.cu_ok_desc", { inv: d.invoice_no, ro: d.ro_id }))}</div>${V.documents && V.documents.customerLinkHTML ? V.documents.customerLinkHTML(a) : ""}` : d.notes ? `<div>${esc(t("dc.reason_lbl"))}: ${esc(d.notes)}</div>` : "";
    return `<div class="banner ${k[0]} dc-cu" role="status"><div><b>${esc(t(k[1]))}</b> · ${esc(fmtDate(d.at))}${extra}</div></div>`;
  }

  V.decision = { html, wire, customerBanner, check };
})();
