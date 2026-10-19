/* SAVERA — Invoice + Dashboard (Customer & Workshop).
   Loads AFTER savera-workshop.js. Yang ditambah / diganti HANYA:
     1. Invoice (menu Invoices di Workshop & Customer, tombol Print Invoice)
     2. Dashboard Customer dan Dashboard Workshop
   Semua angka diambil dari data yang sudah ada (repair order, queue, assessment, inventory, PO).
   Tidak ada data acak. Inventory, PPIC, Procurement, Analytics, Assessment tidak diubah. */
(function () {
  const V = window.SAVERA_V2, D = window.SAVERA_DEMO;
  if (!V || !D) return;
  const { W, CUST, NAV, VIEWS, ACT } = V;
  const $ = (i) => document.getElementById(i);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const today = () => new Date().toISOString().slice(0, 10);
  const PAL = ["#0B2545", "#13A8C4", "#5BC0DE", "#8DA9C4", "#F2A541", "#E4572E"];
  const me = () => state.user && state.user.cid;
  const fmtDate = (d) => { const t = d ? new Date(d + "T00:00:00") : null; return t && !isNaN(t) ? t.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) : "–"; };
  const payBadge = (p) => `<span class="badge badge-${p === "Paid" ? "ok" : "pending"}">${esc(p)}</span>`;

  /* ============================================================
     INVOICE — dibangun dari Repair Order yang sudah selesai
     ============================================================ */
  const isDone = (ro) => {
    const s = W.sr.find((x) => x.service_request_id === ro.service_request_id);
    return ro.status === "Completed" || (s && s.request_status === "Completed");
  };
  const sumC = (c) => c.parts + c.labor + c.paint + c.add;
  /* Rincian biaya: pakai hasil verifikasi workshop bila ada; jika tidak, dari tabel repair_costs
     dengan rumus yang sama seperti halaman Assessment. Total selalu = estimated_repair_cost pada Repair Order. */
  function split(ro, s) {
    const total = ro.estimated_repair_cost || 0, vc = s.verified && s.verified.cost;
    let c = vc ? { parts: vc.spare || 0, labor: vc.labor || 0, paint: vc.paint || 0, add: vc.add || 0 } : null, note = false;
    if (!c || sumC(c) !== total) {
      const rc = V.costFor(ro.vehicle_part, ro.damage_type, ro.severity, ro.brand);
      c = { parts: ro.repair_action === "Replace" ? rc.spare_part_cost : 0, labor: rc.labor_cost, paint: ro.repair_action === "Repair" ? 0 : rc.painting_cost, add: rc.additional_cost };
      note = true;
    }
    if (sumC(c) !== total) {
      const base = c.parts + c.labor + c.paint; note = true;
      if (total >= base) c.add = total - base;
      else { const k = base ? total / base : 0; c.parts = Math.round(c.parts * k); c.paint = Math.round(c.paint * k); c.add = 0; c.labor = total - c.parts - c.paint; }
    }
    return { c, total, note };
  }
  function build(ro) {
    const s = W.sr.find((x) => x.service_request_id === ro.service_request_id) || {}, veh = D.vehicles.find((v) => v.vehicle_id === ro.vehicle_id) || {}, q = W.q.find((x) => x.repair_order_id === ro.repair_order_id) || {};
    const cid = s.customer_id || veh.customer_id, cu = CUST[cid] || {}, date = ro.completed_date || q.actual_completion_date || ro.scheduled_date || ro.created_date || "";
    let { c, total, note } = split(ro, s);
    /* RO dari assessment terstruktur (Tahap 5–6): rincian & total = dokumen invoice (incl. diskon & PPN) */
    const dm = ro.assessment_id && V.documents ? V.documents.model(s, "invoice") : null;
    if (dm && dm.ok) { const b = dm.summary.by_category; c = { parts: b.spare_part, labor: b.labor, paint: b.painting, add: b.additional }; total = dm.summary.total; note = false; }
    return { ro_id: ro.repair_order_id, sr_id: ro.service_request_id, cid, no: ro.invoice_no || `INV-${String(date).slice(0, 4) || "0000"}-${String(parseInt(String(ro.repair_order_id).replace(/\D/g, ""), 10) || 0).padStart(4, "0")}`,
      customer: cu.customer_name || cid || "–", vehicle: `${ro.brand} ${ro.model}${ro.year ? " " + ro.year : ""}`, plate: s.plate_number || q.plate_number || veh.plate_number || "–",
      damage: `${ro.vehicle_part} – ${ro.damage_type}`, severity: ro.severity, action: ro.repair_action, cost: c, total, note, date, pay: ro.payment_status || "Unpaid", paid: ro.paid_date || "" };
  }
  const allInv = () => W.ro.filter(isDone).map(build);
  const invOf = (roId) => { const ro = W.ro.find((r) => r.repair_order_id === roId); return ro && isDone(ro) ? build(ro) : null; };

  function invoiceCard(i, workshop) {
    const f = (l, v) => `<div><div style="font-size:11px;color:var(--ink-500);">${l}</div><div style="font-weight:600;color:var(--navy-900);">${esc(v)}</div></div>`;
    const rows = [["Parts Cost", i.cost.parts], ["Labor Cost", i.cost.labor], ["Painting Cost", i.cost.paint], ["Additional Cost", i.cost.add]];
    return `<div class="card inv-card"><div class="card-title" style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;"><span>Invoice ${esc(i.no)}</span>${payBadge(i.pay)}</div>
      <div class="row-3" style="margin:14px 0;">${f("Invoice Number", i.no)}${f("Date", fmtDate(i.date))}${f("Customer", i.customer)}${f("Vehicle", i.vehicle)}${f("Plate", i.plate)}${f("Repair Action", i.action)}</div>
      <div class="row-2" style="margin-bottom:14px;">${f("Damage", `${i.damage} (${i.severity})`)}<div><div style="font-size:11px;color:var(--ink-500);">Payment Status</div><div style="margin-top:2px;">${payBadge(i.pay)}${i.paid ? ` <span style="font-size:11.5px;color:var(--ink-500);">dibayar ${fmtDate(i.paid)}</span>` : ""}</div></div></div>
      <div class="table-wrap"><table><tbody>${rows.map(([l, v]) => `<tr><td>${l}</td><td style="text-align:right;font-family:var(--font-mono);">${fmtIDR(v)}</td></tr>`).join("")}<tr><td><b>Total Cost</b></td><td style="text-align:right;font-family:var(--font-mono);font-size:15px;"><b>${fmtIDR(i.total)}</b></td></tr></tbody></table></div>
      ${i.note ? `<div style="font-size:11.5px;color:var(--ink-500);margin-top:8px;">Rincian biaya mengikuti data referensi repair_costs; total sama dengan estimasi pada Repair Order ${esc(i.ro_id)}.</div>` : ""}
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:16px;"><button class="btn btn-primary" data-act="invprint" data-id="${esc(i.ro_id)}">${ICONS.report} Print Invoice</button>
        ${workshop && i.pay !== "Paid" ? `<button class="btn btn-accent" data-act="invpaid" data-id="${esc(i.ro_id)}">${ICONS.check} Mark as Paid</button>` : ""}
        <button class="btn btn-ghost" data-nav="${workshop ? "w-invoices" : "c-invoices"}">← Back to invoices</button></div></div>`;
  }

  /* ---- print: dokumen mandiri di iframe tersembunyi (tidak ikut sidebar/topbar) ---- */
  function printDoc(i) {
    const r = (l, v) => `<tr><td class="k">${l}</td><td>${esc(v)}</td></tr>`, c = (l, v) => `<tr><td>${l}</td><td class="n">${fmtIDR(v)}</td></tr>`;
    return `<!DOCTYPE html><html lang="id"><head><meta charset="utf-8"><title>${esc(i.no)}</title><style>
      *{box-sizing:border-box}body{font-family:"IBM Plex Sans",Arial,sans-serif;color:#0f1b2d;margin:0;padding:34px 40px;font-size:13px}
      .top{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #0b1f3a;padding-bottom:14px;margin-bottom:20px}
      .brand{display:flex;align-items:center;gap:12px}.brand img{height:46px}.brand b{font-size:22px;color:#0b1f3a;letter-spacing:.5px}.brand span{display:block;font-size:11px;color:#6b7a93}
      h1{margin:0;font-size:24px;color:#0b1f3a;text-align:right}.no{font-family:"IBM Plex Mono",monospace;font-size:13px;text-align:right;margin-top:4px}
      table{width:100%;border-collapse:collapse}.info td{padding:6px 0;border-bottom:1px solid #eef2f7;vertical-align:top}.info td.k{width:34%;color:#6b7a93}
      .cost{margin-top:22px}.cost th{background:#0b1f3a;color:#fff;text-align:left;padding:9px 12px;font-size:12px}.cost th:last-child{text-align:right}
      .cost td{padding:9px 12px;border-bottom:1px solid #e2e7ef}.n{text-align:right;font-family:"IBM Plex Mono",monospace}
      .cost tr.tot td{font-weight:700;font-size:15px;border-top:2px solid #0b1f3a;background:#f5f7fa}
      .pay{display:inline-block;padding:3px 12px;border-radius:999px;font-weight:600;font-size:12px;background:${i.pay === "Paid" ? "#e4f7ee;color:#1b9c63" : "#fcf0da;color:#b8790a"}}
      .foot{margin-top:34px;font-size:11px;color:#6b7a93;border-top:1px solid #e2e7ef;padding-top:10px}
      @page{size:A4;margin:12mm}</style></head><body>
      <div class="top"><div class="brand"><img src="assets/logo.png" alt="" onerror="this.style.display='none'"><div><b>SAVERA</b><span>Smart Automotive Vehicle Evaluation and Repair Assessment</span></div></div><div><h1>INVOICE</h1><div class="no">${esc(i.no)}</div></div></div>
      <table class="info">${r("Invoice Number", i.no)}${r("Date", fmtDate(i.date))}${r("Customer", i.customer)}${r("Vehicle", i.vehicle)}${r("Plate", i.plate)}${r("Damage", `${i.damage} (${i.severity})`)}${r("Repair Action", i.action)}${r("Repair Order", i.ro_id)}
        <tr><td class="k">Payment Status</td><td><span class="pay">${esc(i.pay)}</span>${i.paid ? " &nbsp;" + esc(fmtDate(i.paid)) : ""}</td></tr></table>
      <table class="cost"><thead><tr><th>Description</th><th>Amount</th></tr></thead><tbody>${c("Parts Cost", i.cost.parts)}${c("Labor Cost", i.cost.labor)}${c("Painting Cost", i.cost.paint)}${c("Additional Cost", i.cost.add)}<tr class="tot"><td>Total Cost</td><td class="n">${fmtIDR(i.total)}</td></tr></tbody></table>
      <div class="foot">Dokumen ini dibuat otomatis oleh SAVERA dari data Repair Order ${esc(i.ro_id)}. Terima kasih atas kepercayaan Anda.</div></body></html>`;
  }
  function printInvoice(i) {
    const fr = document.createElement("iframe");
    fr.setAttribute("aria-hidden", "true"); fr.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;";
    fr.onload = () => { setTimeout(() => { try { fr.contentWindow.focus(); fr.contentWindow.print(); } catch (e) { toast("Print gagal dibuka oleh browser."); } setTimeout(() => fr.remove(), 60000); }, 350); };
    fr.srcdoc = printDoc(i); document.body.appendChild(fr);
  }
  ACT.invprint = (id) => { const i = invOf(id); if (i) printInvoice(i); };
  ACT.invpaid = (id) => { const ro = W.ro.find((r) => r.repair_order_id === id); if (!ro || !isDone(ro)) return; ro.payment_status = "Paid"; ro.paid_date = today(); toast(`${build(ro).no} ditandai Paid`); renderContent(); };
  ACT.viewinv = (id) => { state.inv = id; state.view = state.role === "workshop" ? "w-invoice" : "c-invoice"; renderShell(); };

  const listCols = (workshop) => [{ k: "no", l: "Invoice", m: 1 }, { k: "date", l: "Date" }, ...(workshop ? [{ k: "customer", l: "Customer" }] : []), { k: "vehicle", l: "Vehicle" }, { k: "plate", l: "Plate", m: 1 }, { k: "damage", l: "Damage" }, { k: "action", l: "Repair Action" }, { k: "total", l: "Total Cost", m: 1, f: (r) => fmtIDR(r.total) }, { k: "pay", l: "Payment", f: (r) => payBadge(r.pay) }];
  const listRows = (list) => () => list().map((i) => ({ id: i.ro_id, no: i.no, date: i.date, customer: i.customer, vehicle: i.vehicle, plate: i.plate, damage: i.damage, action: i.action, total: i.total, pay: i.pay }));
  VIEWS["w-invoices"] = function () {
    const a = allInv(), unpaid = a.filter((i) => i.pay !== "Paid");
    return V.grid(200, V.sc("Invoices", a.length, "report") + V.sc("Paid", a.length - unpaid.length, "check") + V.sc("Unpaid", unpaid.length, "clock") + V.sc("Outstanding", fmtIDR(unpaid.reduce((x, i) => x + i.total, 0)), "warn")) +
      V.lv("wiv", { title: "Invoices", desc: "Dibuat otomatis untuk setiap repair yang sudah selesai (Repair Order → Completed)", fk: "pay", fl: "payment status", sk: "date", sd: "desc", cols: listCols(true), rows: listRows(allInv), act: (r) => V.btn("viewinv", r.id, "View", "btn-primary") });
  };
  VIEWS["c-invoices"] = function () {
    const mine = () => allInv().filter((i) => i.cid === me());
    return V.lv("civ", { title: "My Invoices", desc: "Invoice tersedia setelah repair kendaraan Anda selesai", fk: "pay", fl: "payment status", sk: "date", sd: "desc", cols: listCols(false), rows: listRows(mine), act: (r) => V.btn("viewinv", r.id, "View", "btn-primary") });
  };
  const detail = (workshop) => function () {
    const i = invOf(state.inv);
    if (!i || (!workshop && i.cid !== me())) return `<div class="card"><div class="empty-state">${ICONS.search}<div>Invoice tidak ditemukan.</div></div><button class="btn btn-ghost btn-sm" data-nav="${workshop ? "w-invoices" : "c-invoices"}">← Kembali</button></div>`;
    return invoiceCard(i, workshop);
  };
  VIEWS["w-invoice"] = detail(true); VIEWS["c-invoice"] = detail(false);

  /* Repair selesai → beri tahu bahwa invoice sudah tersedia */
  const _qdone = ACT.qdone;
  if (_qdone) ACT.qdone = function (id, b) {
    _qdone(id, b);
    const q = W.q.find((x) => x.queue_id === id), ro = q && W.ro.find((r) => r.repair_order_id === q.repair_order_id);
    if (ro && isDone(ro)) toast(`Invoice ${build(ro).no} tersedia di menu Invoices`);
  };

  V.split = split; V.isDone = isDone; /* dipakai savera-insights.js (Customer Bill, Analytics) */

  /* ============================================================
     DASHBOARD — WORKSHOP
     ============================================================ */
  const OPEN_PO = ["Draft", "Ordered", "Partially Received"];
  const lowStock = () => W.inv.filter((i) => i.current_stock <= i.reorder_point).length;
  const recommended = () => W.inv.filter((i) => {
    const rec = (D.ppic_recommendations || []).find((r) => r.part_id === i.part_id) || {}, pend = W.po.filter((p) => p.part_id === i.part_id && OPEN_PO.includes(p.status)).reduce((a, p) => a + p.quantity, 0);
    return Math.max(0, (rec.forecast_demand || 0) + i.safety_stock - i.current_stock - pend) > 0;
  }).length;
  const cbox = (id, t) => `<div class="card"><div class="card-title">${t}</div><div style="height:230px;"><canvas id="${id}"></canvas></div></div>`;
  VIEWS["w-dashboard"] = function () {
    const n = (st) => W.sr.filter((s) => st.includes(s.request_status)).length;
    return V.grid(190, V.sc("Requests", W.sr.length, "report", "Semua service request") + V.sc("Pending Assessment", n(["Submitted", "Under Assessment"]), "clock", `${n(["Submitted"])} belum dibuka`) + V.sc("In Repair", n(["In Repair"]), "wrench") +
      V.sc("Completed", n(["Completed"]), "check") + V.sc("Low Stock", lowStock(), "box", "Di bawah / sama dengan reorder point") + V.sc("Recommended Order", recommended(), "truck", "Rekomendasi PPIC")) +
      V.grid(320, cbox("dSR", "Service requests by status") + cbox("dQ", "Active queue by priority"));
  };
  window.after_w_dashboard = function () {
    if (typeof Chart === "undefined" || !$("dSR")) return;
    const by = {}; W.sr.forEach((s) => (by[s.request_status] = (by[s.request_status] || 0) + 1));
    new Chart($("dSR"), { type: "doughnut", data: { labels: Object.keys(by), datasets: [{ data: Object.values(by), backgroundColor: PAL }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: "bottom" } } } });
    const q = W.q.filter((x) => !["Completed", "Cancelled"].includes(x.queue_status)), pr = ["High", "Medium", "Low"];
    new Chart($("dQ"), { type: "bar", data: { labels: pr, datasets: [{ label: "Active queue", data: pr.map((p) => q.filter((x) => x.priority === p).length), backgroundColor: PAL }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } } });
  };

  /* ---------------- navigasi & judul halaman ---------------- */
  const at = NAV.workshop.findIndex((x) => x[0] === "w-orders");
  NAV.workshop.splice(at + 1, 0, ["w-invoices", "Invoices", "report"]);
  NAV.customer.push(["c-invoices", "Invoices", "report"]);
  Object.assign(PAGE_META, { "w-invoices": ["Invoices", "Invoice repair yang sudah selesai"], "w-invoice": ["Invoice", "Detail dan cetak invoice"], "c-invoices": ["My Invoices", "Invoice dari repair yang sudah selesai"], "c-invoice": ["Invoice", "Detail dan cetak invoice"],
    "w-dashboard": ["Workshop Dashboard", "Ringkasan operasional"] });
  V.invoices = allInv;
})();
