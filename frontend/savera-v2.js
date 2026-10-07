/* SAVERA v2 — Customer / Workshop roles. Loads AFTER app.js and overrides its shell,
   login, routing & pages. Reuses existing helpers (pageSlice, pagerHTML, wirePager, badges,
   statCard, fmtIDR, toast, ICONS, Chart.js, modal CSS). Data: SAVERA_DEMO_DATA.json (savera-data.js). */
(function () {
  const D = window.SAVERA_DEMO, $ = (i) => document.getElementById(i);
  const N = (n) => (+n || 0).toLocaleString("id-ID"), today = () => new Date().toISOString().slice(0, 10);
  const cnt = (a, f) => a.reduce((m, x) => ((m[f(x)] = (m[f(x)] || 0) + 1), m), {});
  const W = { sr: D.service_requests.map((x) => ({ ...x })), ro: D.repair_orders.map((x) => ({ ...x })), q: D.repair_queue.map((x) => ({ ...x })),
    po: D.purchase_orders.map((x) => ({ ...x })), tx: D.inventory_transactions.map((x) => ({ ...x })), inv: D.inventory.map((x) => ({ ...x })) };
  const SUP = Object.fromEntries(D.suppliers.map((s) => [s.supplier_id, s])), PART = Object.fromEntries(D.spareparts.map((p) => [p.part_id, p]));
  const CUST = Object.fromEntries(D.customers.map((c) => [c.customer_id, c]));
  const invOf = (id) => W.inv.find((i) => i.part_id === id);
  const stStatus = (i) => (i.current_stock <= i.safety_stock ? "Critical" : i.current_stock <= i.reorder_point ? "Low" : "Healthy");
  const OPEN_PO = ["Draft", "Ordered", "Partially Received"];
  const pend = (pid) => W.po.filter((p) => p.part_id === pid && OPEN_PO.includes(p.status)).reduce((a, p) => a + p.quantity, 0);
  const bs = (s) => { const m = { Completed: "ok", Received: "ok", Approved: "ok", "In Progress": "review", "In Repair": "review", Ordered: "review", "Under Assessment": "review", Waiting: "pending", "Partially Received": "pending", Cancelled: "rejected" }; return `<span class="badge badge-${m[s] || "neutral"}">${s}</span>`; };
  const bsev = (s) => badgeSeverity(String(s).toLowerCase());
  const PAL = ["#0B2545", "#13A8C4", "#5BC0DE", "#8DA9C4", "#F2A541", "#E4572E"];

  /* ---------- stock ledger ---------- */
  function addTx(pid, type, qty, refType, refId, cost, notes) {
    let i = invOf(pid);
    if (type === "OUT" && (!i || i.current_stock < qty)) return false;
    if (!i) { const p = PART[pid] || {}; i = { inventory_id: "INV-" + pid, part_id: pid, part_name: p.part_name || pid, brand: p.brand, model: p.model, vehicle_part: p.vehicle_part, current_stock: 0, reorder_point: 0, safety_stock: 0, unit: p.unit || "pcs", location: "Main Warehouse" }; W.inv.push(i); }
    i.current_stock += type === "IN" ? qty : -qty; i.last_updated = today();
    W.tx.push({ transaction_id: "TRX" + String(W.tx.length + 1).padStart(4, "0"), transaction_date: today(), part_id: pid, part_name: i.part_name, transaction_type: type, quantity: qty, unit: i.unit, reference_type: refType, reference_id: refId, unit_cost: cost, total_cost: cost * qty, notes });
    return true;
  }
  /* ---------- CV analysis + cost (derived from dataset, deterministic) ---------- */
  const lc = (s) => String(s || "").toLowerCase();
  function costFor(part, dt, sev, brand) {
    let best = null, bsc = -1;
    D.repair_costs.forEach((r) => { const sc = (lc(r.vehicle_part) === lc(part) ? 3 : 0) + (lc(r.damage_type) === lc(dt) ? 2 : 0) + (lc(r.severity) === lc(sev) ? 1 : 0) + (r.brand === brand ? 1 : 0); if (sc > bsc) { bsc = sc; best = r; } });
    return best;
  }
  function cvAnalyze(sr) {
    /* Customer-submitted request: the assessment stored at submit time is the single source of truth (same numbers for Customer & Workshop). */
    if (sr.assessment) { const a = sr.assessment; return { part: a.area, type: a.type, severity: a.severity, pct: a.pct, action: a.action, conf: a.conf, rc: costFor(a.area, a.type, a.severity, sr.brand) }; }
    const rc = costFor(sr.initial_damage_area, sr.initial_damage_type, sr.initial_severity, sr.brand);
    const m = RAW_DATA.filter((r) => lc(sr.initial_damage_area).includes(lc(r.part)) || lc(r.part).includes(lc(sr.initial_damage_area).split(" ").pop()));
    const pool = m.length ? m : RAW_DATA;
    return { part: sr.initial_damage_area, type: sr.initial_damage_type, severity: rc.severity, pct: rc.damage_percentage, action: rc.repair_action, conf: pool.reduce((a, d) => a + d.confidence, 0) / pool.length, rc };
  }
  const partFor = (sr, part) => D.spareparts.find((p) => lc(p.vehicle_part) === lc(part) && p.brand === sr.brand && p.model === sr.model) || D.spareparts.find((p) => lc(p.vehicle_part) === lc(part) && p.brand === sr.brand) || D.spareparts.find((p) => lc(p.vehicle_part) === lc(part));

  /* ---------- generic list view: search / filter / sort / pagination ---------- */
  const LV = {}, ACT = {}, CH = [];
  function lv(key, c) {
    LV[key] = c; state.lf = state.lf || {};
    const f = state.lf[key] || (state.lf[key] = { q: "", fl: "all", sortKey: c.sk || c.cols[0].k, sortDir: c.sd || "asc", page: 1, perPage: 10 });
    const all = c.rows(), q = f.q.toLowerCase();
    let rows = all.filter((r) => (!q || JSON.stringify(r).toLowerCase().includes(q)) && (f.fl === "all" || r[c.fk] === f.fl));
    rows.sort((a, b) => { let x = a[f.sortKey], y = b[f.sortKey]; if (typeof x === "string") { x = x.toLowerCase(); y = String(y).toLowerCase(); } return (x < y ? -1 : x > y ? 1 : 0) * (f.sortDir === "asc" ? 1 : -1); });
    const { pageRows, total } = pageSlice(rows, f), ar = (k) => (f.sortKey === k ? (f.sortDir === "asc" ? "↑" : "↓") : "");
    const opts = c.fk ? [...new Set(all.map((r) => r[c.fk]))].sort() : [];
    return `<div class="card" data-lv="${key}"><div class="card-title" style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:10px;"><span>${c.title}</span><div style="display:flex;gap:8px;">${c.head || ""}</div></div>
    ${c.desc ? `<div class="card-desc">${c.desc}</div>` : ""}
    <div style="display:flex;gap:10px;flex-wrap:wrap;margin:14px 0;"><div style="position:relative;flex:1;min-width:220px;"><span style="position:absolute;left:11px;top:11px;color:var(--ink-500);">${ICONS.search}</span><input class="input lv-q" placeholder="Search..." style="padding-left:36px;" value="${f.q.replace(/"/g, "&quot;")}"></div>
    ${c.fk ? `<select class="select lv-fl" style="width:190px;"><option value="all">All ${c.fl || c.fk}</option>${opts.map((o) => `<option ${f.fl === o ? "selected" : ""}>${o}</option>`).join("")}</select>` : ""}</div>
    <div class="table-wrap"><table><thead><tr>${c.cols.map((k) => `<th class="sortable" data-k="${k.k}">${k.l} <span class="arrow">${ar(k.k)}</span></th>`).join("")}${c.act ? "<th>Action</th>" : ""}</tr></thead><tbody>
    ${pageRows.length ? pageRows.map((r) => `<tr>${c.cols.map((k) => `<td${k.m ? ' style="font-family:var(--font-mono);"' : ""}>${k.f ? k.f(r) : r[k.k] ?? "–"}</td>`).join("")}${c.act ? `<td style="white-space:nowrap;">${c.act(r)}</td>` : ""}</tr>`).join("") : `<tr><td colspan="${c.cols.length + 1}"><div class="empty-state">${ICONS.search}<div>No data matches your filters.</div></div></td></tr>`}</tbody></table></div>${pagerHTML(key, f, total)}</div>`;
  }
  const btn = (act, id, label, cls) => `<button class="btn ${cls || "btn-ghost"} btn-sm" data-act="${act}" data-id="${id}">${label}</button>`;
  function wire() {
    document.querySelectorAll("[data-lv]").forEach((el) => {
      const k = el.dataset.lv, f = state.lf[k], q = el.querySelector(".lv-q"), fl = el.querySelector(".lv-fl");
      q.oninput = () => { f.q = q.value; f.page = 1; state.refocus = k; renderContent(); };
      if (fl) fl.onchange = () => { f.fl = fl.value; f.page = 1; renderContent(); };
      el.querySelectorAll("th.sortable").forEach((th) => (th.onclick = () => { const c = th.dataset.k; if (f.sortKey === c) f.sortDir = f.sortDir === "asc" ? "desc" : "asc"; else { f.sortKey = c; f.sortDir = "asc"; } renderContent(); }));
      wirePager(el.querySelector(".pager"), f);
      if (state.refocus === k) { q.focus(); q.setSelectionRange(q.value.length, q.value.length); state.refocus = null; }
    });
    document.querySelectorAll("[data-act]").forEach((b) => (b.onclick = () => ACT[b.dataset.act](b.dataset.id, b)));
  }
  const grid = (n, h) => `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(${n}px,1fr));gap:16px;margin-bottom:18px;">${h}</div>`;
  const sc = (l, v, i, d) => statCard(l, v, ICONS[i], "#E6F7FB", "#0E9EB8", d || "", "");
  const chart = (id, type, labels, data, name, multi) => CH.push({ id, type, labels, data, name, multi });
  const cbox = (id, t) => `<div class="card"><div class="card-title">${t}</div><div style="height:230px;"><canvas id="${id}"></canvas></div></div>`;
  function drawCharts() {
    CH.splice(0).forEach((c) => { const el = $(c.id); if (!el) return; const ds = c.multi ? c.data : [{ label: c.name, data: c.data }];
      new Chart(el, { type: c.type, data: { labels: c.labels, datasets: ds.map((d, i) => ({ ...d, backgroundColor: c.type === "line" ? PAL[i + 1] : c.type === "bar" && ds.length > 1 ? PAL[i] : PAL.slice(0, 6), borderColor: PAL[i + 1], tension: 0.3 })) },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: c.type === "doughnut" || ds.length > 1, position: "bottom" } } } }); });
  }

  /* ---------- state helpers ---------- */
  const roOf = (id) => W.ro.find((r) => r.service_request_id === id), qOf = (roid) => W.q.find((q) => q.repair_order_id === roid);
  const me = () => state.user.cid;
  const mySR = () => W.sr.filter((s) => s.customer_id === me());
  const active = (s) => !["Completed", "Cancelled"].includes(s.request_status);

  /* ================= CUSTOMER PAGES ================= */
  const stepper = (st) => { const S = ["Submitted", "Under Assessment", "Approved", "In Repair", "Completed"], i = S.indexOf(st); return `<div style="display:flex;gap:4px;margin:10px 0 2px;">${S.map((s, k) => `<div style="flex:1;"><div style="height:6px;border-radius:4px;background:${st === "Cancelled" ? "#e2e8f0" : k <= i ? "var(--cyan-500)" : "#e2e8f0"};"></div><div style="font-size:10.5px;color:var(--ink-500);margin-top:4px;">${s}</div></div>`).join("")}</div>`; };
  function c_dashboard() {
    const s = mySR(), a = s.filter(active);
    return grid(200, sc("My Vehicles", D.vehicles.filter((v) => v.customer_id === me()).length, "car") + sc("Active Requests", a.length, "clock") + sc("In Repair", s.filter((x) => x.request_status === "In Repair").length, "wrench") + sc("Completed", s.filter((x) => x.request_status === "Completed").length, "check")) +
      `<div class="card"><div class="card-title">Active Repairs</div>${a.length ? a.map((x) => { const r = roOf(x.service_request_id), q = r && qOf(r.repair_order_id); return `<div style="padding:12px 0;border-bottom:1px solid #eef2f7;"><div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;"><b style="color:var(--navy-900);">${x.brand} ${x.model} · ${x.plate_number}</b>${bs(x.request_status)}</div><div style="font-size:12px;color:var(--ink-500);">${x.service_request_id} · ${x.customer_complaint}${q ? ` · Queue #${q.queue_number}` : ""}</div>${stepper(x.request_status)}</div>`; }).join("") : `<div class="empty-state">${ICONS.check}<div>No active requests.</div></div>`}<div style="margin-top:14px;"><button class="btn btn-primary btn-sm" data-nav="c-request">${ICONS.plus} New Service Request</button></div></div>`;
  }
  function c_vehicles() {
    return lv("cv", { title: "My Vehicles", desc: "Registered vehicles linked to your account", fk: "brand", fl: "brands", sk: "brand",
      cols: [{ k: "plate", l: "Plate", m: 1 }, { k: "brand", l: "Brand" }, { k: "model", l: "Model" }, { k: "year", l: "Year" }, { k: "type", l: "Type" }, { k: "trans", l: "Transmission" }, { k: "fuel", l: "Fuel" }, { k: "reqs", l: "Requests" }],
      rows: () => D.vehicles.filter((v) => v.customer_id === me()).map((v) => ({ id: v.vehicle_id, plate: v.plate_number, brand: v.brand, model: v.model, year: v.year, type: v.vehicle_type, trans: v.transmission, fuel: v.fuel_type, reqs: W.sr.filter((s) => s.vehicle_id === v.vehicle_id).length })),
      act: (r) => btn("newreq", r.id, "New request", "btn-primary") });
  }
  ACT.newreq = (id) => { state.rq = { vid: id }; state.view = "c-request"; renderShell(); };
  function c_request() {
    const rq = state.rq || (state.rq = {}), vs = D.vehicles.filter((v) => v.customer_id === me()), v = vs.find((x) => x.vehicle_id === rq.vid), types = [...new Set(D.service_requests.map((s) => s.service_type))];
    const areas = [...new Set(D.repair_costs.map((r) => r.vehicle_part))].sort(), dts = [...new Set(D.repair_costs.map((r) => r.damage_type))].sort();
    if (rq.done) return `<div class="card" style="text-align:center;padding:40px;">${ICONS.check}<h3 style="color:var(--navy-900);">Request ${rq.done} submitted</h3><p style="color:var(--ink-500);">The workshop will assess it shortly.</p><button class="btn btn-primary" data-nav="c-status">Track Repair Status</button></div>`;
    const cv = rq.cv;
    return `<div class="card"><div class="card-title">Service Request</div><div class="card-desc">Vehicle → Request → Upload Photo → Computer Vision Analysis → Submit</div>
    <div class="row-2" style="margin-top:14px;"><div class="field"><label>1. Vehicle</label><select class="select" id="rqV"><option value="">Select vehicle…</option>${vs.map((x) => `<option value="${x.vehicle_id}" ${x.vehicle_id === rq.vid ? "selected" : ""}>${x.brand} ${x.model} · ${x.plate_number}</option>`).join("")}</select></div>
    <div class="field"><label>Service type</label><select class="select" id="rqT">${types.map((t) => `<option ${rq.type === t ? "selected" : ""}>${t}</option>`).join("")}</select></div></div>
    <div class="row-2"><div class="field"><label>Damaged area</label><select class="select" id="rqA">${areas.map((t) => `<option ${rq.area === t ? "selected" : ""}>${t}</option>`).join("")}</select></div>
    <div class="field"><label>Damage type</label><select class="select" id="rqD">${dts.map((t) => `<option ${rq.dt === t ? "selected" : ""}>${t}</option>`).join("")}</select></div></div>
    <div class="field"><label>Complaint</label><textarea class="input" id="rqC" placeholder="Describe the damage…">${rq.note || ""}</textarea></div>
    <div class="field"><label>2. Upload photos (${(rq.photos || []).length} selected)</label><input type="file" id="rqF" accept="image/*" multiple class="input"></div>
    <div style="display:flex;gap:10px;flex-wrap:wrap;"><button class="btn btn-accent" id="rqRun">${ICONS.spark} 3. Run Computer Vision Analysis</button></div>
    ${cv ? `<div class="banner" style="margin:16px 0;"><div><b>CV result:</b> ${cv.type} on ${cv.part} · ${bsev(cv.severity)} · ${cv.pct}% damage · confidence ${(cv.conf * 100).toFixed(0)}% · suggested action <b>${cv.action}</b><br>Estimated cost <b>${fmtIDR(cv.rc.estimated_total_cost)}</b> (range ${fmtIDR(cv.rc.cost_min)} – ${fmtIDR(cv.rc.cost_max)})</div></div><button class="btn btn-primary" id="rqSubmit">${ICONS.check} 4. Submit Request</button>` : ""}</div>`;
  }
  function after_c_request() {
    const rq = state.rq, g = (i) => $(i) && $(i).value, save = () => Object.assign(rq, { vid: g("rqV"), type: g("rqT"), area: g("rqA"), dt: g("rqD"), note: g("rqC") });
    if (!$("rqV")) return;
    $("rqF").onchange = (e) => { save(); rq.photos = [...e.target.files]; renderContent(); };
    const mk = () => { save(); const v = D.vehicles.find((x) => x.vehicle_id === rq.vid); return v && { v, s: { brand: v.brand, model: v.model, initial_damage_area: rq.area, initial_damage_type: rq.dt, initial_severity: "Moderate" } }; };
    $("rqRun").onclick = () => { const m = mk(); if (!m) return toast("Select a vehicle first."); if (!(rq.photos || []).length) return toast("Upload at least one photo."); rq.cv = cvAnalyze(m.s); renderContent(); };
    if ($("rqSubmit")) $("rqSubmit").onclick = () => { const m = mk(), c = rq.cv, id = "SR" + String(W.sr.length + 1).padStart(4, "0");
      W.sr.push({ service_request_id: id, request_date: today(), customer_id: me(), vehicle_id: m.v.vehicle_id, brand: m.v.brand, model: m.v.model, year: m.v.year, plate_number: m.v.plate_number, customer_complaint: rq.note || `${rq.dt} on ${rq.area}`, service_type: rq.type, photo_count: rq.photos.length, initial_damage_area: rq.area, initial_damage_type: rq.dt, initial_severity: c.severity, initial_estimated_cost: c.rc.estimated_total_cost, request_status: "Submitted", workshop_notes: "" });
      state.rq = { done: id }; renderContent(); };
  }
  function c_status() {
    return lv("cs", { title: "Repair Status", desc: "Live progress of your active requests (Request → Repair Order → Queue)", fk: "status", fl: "statuses", sk: "date", sd: "desc",
      cols: [{ k: "id", l: "Request", m: 1 }, { k: "vehicle", l: "Vehicle" }, { k: "part", l: "Part / Damage" }, { k: "status", l: "Status", f: (r) => bs(r.status) }, { k: "queue", l: "Queue #" }, { k: "days", l: "Repair days" }, { k: "wait", l: "Waiting days" }, { k: "sched", l: "Scheduled" }],
      rows: () => mySR().filter(active).map((s) => { const r = roOf(s.service_request_id), q = r && qOf(r.repair_order_id); return { id: s.service_request_id, date: s.request_date, vehicle: `${s.brand} ${s.model} · ${s.plate_number}`, part: `${s.initial_damage_area} – ${s.initial_damage_type}`, status: s.request_status, queue: q ? q.queue_number : "–", days: r ? r.estimated_repair_days : "–", wait: q ? q.estimated_waiting_days : "–", sched: q ? q.scheduled_date : "–" }; }) });
  }
  function c_history() {
    return lv("ch", { title: "Service History", desc: "Completed and cancelled services", fk: "status", fl: "statuses", sk: "date", sd: "desc",
      cols: [{ k: "id", l: "Request", m: 1 }, { k: "date", l: "Date" }, { k: "vehicle", l: "Vehicle" }, { k: "svc", l: "Service" }, { k: "action", l: "Action" }, { k: "cost", l: "Cost", m: 1, f: (r) => (r.cost ? fmtIDR(r.cost) : "–") }, { k: "status", l: "Status", f: (r) => bs(r.status) }],
      rows: () => mySR().filter((s) => !active(s)).map((s) => { const r = roOf(s.service_request_id); return { id: s.service_request_id, date: s.request_date, vehicle: `${s.brand} ${s.model} · ${s.plate_number}`, svc: s.service_type, action: r ? r.repair_action : "–", cost: r ? r.estimated_repair_cost : 0, status: s.request_status }; }) });
  }
  function c_profile() {
    const c = CUST[me()] || {};
    return `<div class="card"><div class="card-title">Profile</div><div class="row-2" style="margin-top:14px;">${[["Name", c.customer_name], ["Customer ID", c.customer_id], ["Email", c.email], ["Phone", "+" + c.phone], ["City", c.city], ["Address", c.address], ["Type", c.customer_type], ["Registered", c.registration_date]].map(([l, v]) => `<div class="field"><label>${l}</label><input class="input" value="${v || ""}" readonly></div>`).join("")}</div><button class="btn btn-danger btn-sm" data-nav="logout">${ICONS.logout} Logout</button></div>`;
  }

  /* ================= WORKSHOP PAGES ================= */
  function w_dashboard() {
    const q = W.q.filter((x) => !["Completed", "Cancelled"].includes(x.queue_status)), crit = W.inv.filter((i) => stStatus(i) !== "Healthy").length;
    chart("dSR", "doughnut", ...Object.entries(cnt(W.sr, (s) => s.request_status)).reduce((a, [k, v]) => (a[0].push(k), a[1].push(v), a), [[], []]), "Requests");
    chart("dQ", "bar", ["High", "Medium", "Low"], ["High", "Medium", "Low"].map((p) => q.filter((x) => x.priority === p).length), "Active queue");
    return grid(200, sc("Service Requests", W.sr.length, "report", `${W.sr.filter((s) => s.request_status === "Submitted").length} awaiting assessment`) + sc("Active Queue", q.length, "clock") + sc("Repair Orders", W.ro.length, "wrench") + sc("Low / Critical Stock", crit, "box") + sc("Open POs", W.po.filter((p) => OPEN_PO.includes(p.status)).length, "truck")) +
      grid(320, cbox("dSR", "Service requests by status") + cbox("dQ", "Active queue by priority"));
  }
  function w_requests() {
    return lv("wr", { title: "Service Requests", desc: "Incoming requests from customers", fk: "status", fl: "statuses", sk: "date", sd: "desc",
      cols: [{ k: "id", l: "Request", m: 1 }, { k: "date", l: "Date" }, { k: "customer", l: "Customer" }, { k: "vehicle", l: "Vehicle" }, { k: "area", l: "Area" }, { k: "dmg", l: "Damage" }, { k: "sev", l: "Severity", f: (r) => bsev(r.sev) }, { k: "photos", l: "Photos" }, { k: "status", l: "Status", f: (r) => bs(r.status) }],
      rows: () => W.sr.map((s) => ({ id: s.service_request_id, date: s.request_date, customer: (CUST[s.customer_id] || {}).customer_name || s.customer_id, vehicle: `${s.brand} ${s.model} · ${s.plate_number}`, area: s.initial_damage_area, dmg: s.initial_damage_type, sev: s.initial_severity, photos: s.photo_count, status: s.request_status })),
      act: (r) => btn("assess", r.id, "Assess", ["Submitted", "Under Assessment", "Approved"].includes(r.status) && !roOf(r.id) ? "btn-primary" : "btn-ghost") });
  }
  ACT.assess = (id) => { const s = W.sr.find((x) => x.service_request_id === id); if (s.request_status === "Submitted") s.request_status = "Under Assessment"; state.aid = id; state.av = null; state.view = "w-assessment"; renderShell(); };
  function w_assessment() {
    const s = W.sr.find((x) => x.service_request_id === state.aid);
    if (!s) return lv("wa", { title: "Assessment", desc: "Select a request to assess (Submitted / Under Assessment / Approved without repair order)", fk: "status", fl: "statuses",
      cols: [{ k: "id", l: "Request", m: 1 }, { k: "vehicle", l: "Vehicle" }, { k: "area", l: "Area" }, { k: "status", l: "Status", f: (r) => bs(r.status) }],
      rows: () => W.sr.filter((x) => ["Submitted", "Under Assessment", "Approved"].includes(x.request_status) && !roOf(x.service_request_id)).map((x) => ({ id: x.service_request_id, vehicle: `${x.brand} ${x.model} · ${x.plate_number}`, area: x.initial_damage_area, status: x.request_status })), act: (r) => btn("assess", r.id, "Open", "btn-primary") });
    const ro = roOf(s.service_request_id), cv = cvAnalyze(s), av = state.av || (state.av = { action: cv.action, sev: cv.severity }), rc = costFor(s.initial_damage_area, s.initial_damage_type, av.sev, s.brand);
    const part = av.action === "Replace" ? partFor(s, s.initial_damage_area) : null, it = part && invOf(part.part_id), cost = { spare: av.action === "Replace" ? rc.spare_part_cost : 0, labor: rc.labor_cost, paint: av.action === "Repair" ? 0 : rc.painting_cost, add: rc.additional_cost };
    const total = cost.spare + cost.labor + cost.paint + cost.add, ok = !part || (it && it.current_stock >= 1);
    return `<div class="card"><div class="card-title" style="display:flex;justify-content:space-between;"><span>Assessment ${s.service_request_id}</span>${bs(s.request_status)}</div>
    <div class="row-3" style="margin:14px 0;">${[["Vehicle", `${s.brand} ${s.model} ${s.year}`], ["Plate", s.plate_number], ["Customer", (CUST[s.customer_id] || {}).customer_name], ["Complaint", s.customer_complaint], ["Service type", s.service_type], ["Uploaded photos", s.photo_count + " photos"]].map(([l, v]) => `<div><div style="font-size:11px;color:var(--ink-500);">${l}</div><div style="font-weight:600;color:var(--navy-900);">${v}</div></div>`).join("")}</div>
    <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:16px;">${s.photos && s.photos.length ? s.photos.map((p, i) => `<img class="sv-wsphoto" src="${p}" alt="Foto customer ${i + 1}">`).join("") : Array.from({ length: s.photo_count }, (_, i) => `<div style="width:64px;height:48px;border-radius:8px;background:linear-gradient(135deg,#0B2545,#13A8C4);opacity:.85;color:#fff;font-size:10px;display:flex;align-items:center;justify-content:center;">IMG ${i + 1}</div>`).join("")}</div>
    <div class="banner"><div><b>Computer Vision detection:</b> ${cv.type} on ${cv.part} · ${bsev(cv.severity)} · ${cv.pct}% damage · confidence ${(cv.conf * 100).toFixed(0)}%</div></div></div>
    <div class="card"><div class="card-title">Workshop Verification & Cost Estimation</div>
    ${ro ? `<div class="banner" style="margin-top:12px;"><div>Repair order <b>${ro.repair_order_id}</b> already exists (${ro.repair_action}, ${fmtIDR(ro.estimated_repair_cost)}).</div></div>` : `
    <div class="row-2" style="margin-top:14px;"><div class="field"><label>Verified severity</label><select class="select" id="avS">${["Minor", "Moderate", "Severe"].map((x) => `<option ${av.sev === x ? "selected" : ""}>${x}</option>`).join("")}</select></div>
    <div class="field"><label>Action</label><select class="select" id="avA">${["Repair", "Replace", "Repaint"].map((x) => `<option ${av.action === x ? "selected" : ""}>${x}</option>`).join("")}</select></div></div>
    <div class="table-wrap"><table><tbody>${[["Spare part", cost.spare], ["Labor", cost.labor], ["Painting", cost.paint], ["Additional", cost.add]].map(([l, v]) => `<tr><td>${l}</td><td style="text-align:right;font-family:var(--font-mono);">${fmtIDR(v)}</td></tr>`).join("")}<tr><td><b>Estimated total</b></td><td style="text-align:right;font-family:var(--font-mono);"><b>${fmtIDR(total)}</b></td></tr></tbody></table></div>
    <div style="font-size:12px;color:var(--ink-500);margin:8px 0;">Reference range from repair_costs: ${fmtIDR(rc.cost_min)} – ${fmtIDR(rc.cost_max)}</div>
    ${part ? `<div class="banner ${ok ? "" : "banner-warn"}" style="margin:10px 0;"><div>Part: <b>${part.part_name}</b> (${part.part_id}) · stock ${it ? it.current_stock : 0} · ${ok ? "available — will be reserved on repair start" : "insufficient stock — order goes to Procurement, repair waits for part"}</div></div>` : ""}
    <div style="display:flex;gap:8px;"><button class="btn btn-primary" id="avOk">${ICONS.check} Verify & Create Repair Order</button><button class="btn btn-danger" id="avNo">Reject</button></div>`}
    <div style="margin-top:14px;"><button class="btn btn-ghost btn-sm" data-nav="w-requests">← Back to requests</button></div></div>`;
  }
  function after_w_assessment() {
    const s = W.sr.find((x) => x.service_request_id === state.aid); if (!s || !$("avOk")) return;
    $("avS").onchange = () => { state.av.sev = $("avS").value; renderContent(); };
    $("avA").onchange = () => { state.av.action = $("avA").value; renderContent(); };
    $("avNo").onclick = () => { s.request_status = "Cancelled"; state.aid = null; toast("Request rejected."); renderContent(); };
    $("avOk").onclick = () => {
      const av = state.av, cv = cvAnalyze(s), rc = costFor(s.initial_damage_area, s.initial_damage_type, av.sev, s.brand), part = av.action === "Replace" ? partFor(s, s.initial_damage_area) : null;
      const total = (av.action === "Replace" ? rc.spare_part_cost : 0) + rc.labor_cost + (av.action === "Repair" ? 0 : rc.painting_cost) + rc.additional_cost, it = part && invOf(part.part_id), ok = !part || (it && it.current_stock >= 1);
      const roId = "RO" + String(W.ro.length + 1).padStart(4, "0"), days = Math.max(1, Math.round(rc.damage_percentage / 12)), prio = av.sev === "Severe" ? "High" : av.sev === "Moderate" ? "Medium" : "Low";
      W.ro.push({ repair_order_id: roId, service_request_id: s.service_request_id, vehicle_id: s.vehicle_id, brand: s.brand, model: s.model, year: s.year, vehicle_part: s.initial_damage_area, part_id: part ? part.part_id : "NOT_REQUIRED", part_name: part ? part.part_name : "NOT_REQUIRED", damage_type: s.initial_damage_type, severity: av.sev, damage_percentage: cv.pct, repair_action: av.action, quantity_required: part ? 1 : 0, estimated_repair_cost: total, estimated_repair_days: days, priority: prio, status: ok ? "Scheduled" : "Waiting", created_date: today(), scheduled_date: today(), completed_date: "" });
      const ahead = W.q.filter((x) => !["Completed", "Cancelled"].includes(x.queue_status));
      W.q.push({ queue_id: "QUE" + String(W.q.length + 1).padStart(4, "0"), repair_order_id: roId, service_request_id: s.service_request_id, vehicle_id: s.vehicle_id, plate_number: s.plate_number, brand: s.brand, model: s.model, vehicle_part: s.initial_damage_area, damage_type: s.initial_damage_type, severity: av.sev, repair_action: av.action, priority: prio, queue_number: Math.max(...W.q.map((x) => x.queue_number)) + 1, estimated_repair_days: days, estimated_waiting_days: ahead.reduce((a, x) => a + x.estimated_repair_days, 0), scheduled_date: today(), actual_start_date: "", actual_completion_date: "", queue_status: ok ? "Scheduled" : "Waiting", technician_status: "Not started" });
      s.request_status = "Approved"; s.workshop_notes = `Verified: ${av.action} (${av.sev})`; state.aid = null; toast(`${roId} created${ok ? "" : " — waiting for part, see PPIC/Procurement"}`); state.view = "w-queue"; renderShell();
    };
  }
  function w_queue() {
    return lv("wq", { title: "Repair Queue", desc: "Ordered by queue number · Start / Complete update the repair order and stock", fk: "status", fl: "statuses", sk: "no", sd: "desc",
      cols: [{ k: "no", l: "Queue #" }, { k: "vehicle", l: "Vehicle" }, { k: "part", l: "Part" }, { k: "sev", l: "Severity", f: (r) => bsev(r.sev) }, { k: "prio", l: "Priority", f: (r) => badgePriority(r.prio) }, { k: "wait", l: "Waiting days" }, { k: "days", l: "Repair days" }, { k: "status", l: "Status", f: (r) => bs(r.status) }],
      rows: () => W.q.map((q) => ({ id: q.queue_id, no: q.queue_number, vehicle: `${q.brand} ${q.model} · ${q.plate_number}`, part: `${q.vehicle_part} (${q.repair_action})`, sev: q.severity, prio: q.priority, wait: q.estimated_waiting_days, days: q.estimated_repair_days, status: q.queue_status })),
      act: (r) => (r.status === "Completed" || r.status === "Cancelled" ? "" : r.status === "In Progress" ? btn("qdone", r.id, "Complete", "btn-primary") : btn("qstart", r.id, "Start")) });
  }
  const upd = (q, st) => { q.queue_status = st; const r = W.ro.find((x) => x.repair_order_id === q.repair_order_id), s = W.sr.find((x) => x.service_request_id === q.service_request_id); if (r) r.status = st; return [r, s]; };
  ACT.qstart = (id) => { const q = W.q.find((x) => x.queue_id === id), r = W.ro.find((x) => x.repair_order_id === q.repair_order_id);
    if (r && r.part_id !== "NOT_REQUIRED" && !addTx(r.part_id, "OUT", r.quantity_required, "Repair Order", r.repair_order_id, (PART[r.part_id] || {}).standard_price || 0, "Part issued to repair")) { q.queue_status = "Waiting"; r.status = "Waiting"; return toast("Insufficient stock — receive a Purchase Order first."), renderContent(); }
    const [, s] = upd(q, "In Progress"); q.actual_start_date = today(); if (s) s.request_status = "In Repair"; toast("Repair started" + (r && r.part_id !== "NOT_REQUIRED" ? " · stock issued" : "")); renderContent(); };
  ACT.qdone = (id) => { const q = W.q.find((x) => x.queue_id === id), [r, s] = upd(q, "Completed"); q.actual_completion_date = today(); if (r) r.completed_date = today(); if (s) s.request_status = "Completed"; toast("Repair completed"); renderContent(); };
  function w_orders() {
    return lv("wo", { title: "Repair Orders", desc: "Created from verified assessments", fk: "status", fl: "statuses", sk: "id", sd: "desc",
      cols: [{ k: "id", l: "Order", m: 1 }, { k: "sr", l: "Request", m: 1 }, { k: "vehicle", l: "Vehicle" }, { k: "part", l: "Part" }, { k: "action", l: "Action" }, { k: "sev", l: "Severity", f: (r) => bsev(r.sev) }, { k: "pct", l: "Damage %" }, { k: "cost", l: "Est. cost", m: 1, f: (r) => fmtIDR(r.cost) }, { k: "prio", l: "Priority", f: (r) => badgePriority(r.prio) }, { k: "status", l: "Status", f: (r) => bs(r.status) }],
      rows: () => W.ro.map((r) => ({ id: r.repair_order_id, sr: r.service_request_id, vehicle: `${r.brand} ${r.model}`, part: r.vehicle_part + (r.part_id !== "NOT_REQUIRED" ? ` · ${r.part_id}` : ""), action: r.repair_action, sev: r.severity, pct: r.damage_percentage + "%", cost: r.estimated_repair_cost, prio: r.priority, status: r.status })) });
  }
  function w_inventory() {
    const rows = () => W.inv.map((i) => ({ id: i.part_id, part: i.part_name, veh: `${i.brand} ${i.model}`, stock: i.current_stock, rop: i.reorder_point, ss: i.safety_stock, loc: i.location, status: stStatus(i), upd: i.last_updated }));
    return lv("wi", { title: "Inventory", desc: "Current stock, reorder point and safety stock", fk: "status", fl: "stock status", sk: "part", head: `<button class="btn btn-primary btn-sm" data-act="sin" data-id="">${ICONS.plus} Stock In</button><button class="btn btn-danger btn-sm" data-act="sout" data-id="">${ICONS.minus} Stock Out</button>`,
      cols: [{ k: "part", l: "Part", f: (r) => `<b style="color:var(--navy-900);">${r.part}</b><div style="font-size:11px;color:var(--ink-500);">${r.id} · ${r.veh}</div>` }, { k: "stock", l: "Current", m: 1 }, { k: "rop", l: "Reorder pt", m: 1 }, { k: "ss", l: "Safety", m: 1 }, { k: "loc", l: "Location" }, { k: "status", l: "Status", f: (r) => badgeStockStatus(r.status) }], rows,
      act: (r) => btn("sin", r.id, "+ In") + " " + btn("sout", r.id, "− Out") }) +
      lv("wt", { title: "Transaction History", fk: "type", fl: "types", sk: "date", sd: "desc",
        cols: [{ k: "id", l: "ID", m: 1 }, { k: "date", l: "Date" }, { k: "part", l: "Part" }, { k: "type", l: "Type", f: (r) => badgeTxType(r.type) }, { k: "qty", l: "Qty", m: 1 }, { k: "ref", l: "Reference" }, { k: "cost", l: "Total", m: 1, f: (r) => fmtIDR(r.cost) }],
        rows: () => W.tx.map((t) => ({ id: t.transaction_id, date: t.transaction_date, part: t.part_name, type: t.transaction_type, qty: t.quantity, ref: `${t.reference_type} ${t.reference_id}`, cost: t.total_cost })) });
  }
  ACT.sin = (id) => { state.modal = { type: "wm", dir: "IN", pid: id }; renderContent(); };
  ACT.sout = (id) => { state.modal = { type: "wm", dir: "OUT", pid: id }; renderContent(); };
  function modalHTML() {
    const m = state.modal; if (!m || m.type !== "wm") return "";
    return `<div class="modal-backdrop" id="modalBackdrop"><div class="modal-box"><div class="modal-head"><div class="modal-title">Stock ${m.dir === "IN" ? "In" : "Out"}</div><button class="modal-x" id="modalClose">${ICONS.x}</button></div><div class="modal-body">
    <div class="field"><label>Part</label><select class="select" id="mP">${W.inv.map((i) => `<option value="${i.part_id}" ${i.part_id === m.pid ? "selected" : ""}>${i.part_name} · ${i.brand} ${i.model} (stock ${i.current_stock})</option>`).join("")}</select></div>
    <div class="field"><label>Quantity</label><input class="input" type="number" min="1" value="1" id="mQ"></div><div class="field"><label>Notes</label><input class="input" id="mN"></div></div>
    <div class="modal-foot"><button class="btn btn-ghost" id="modalCancel">Cancel</button><button class="btn btn-primary" id="mOk">Save</button></div></div></div>`;
  }
  function wireModal() {
    const m = state.modal; if (!m || m.type !== "wm") return;
    const cl = () => { state.modal = null; renderContent(); };
    $("modalBackdrop").onclick = (e) => e.target.id === "modalBackdrop" && cl(); $("modalClose").onclick = cl; $("modalCancel").onclick = cl;
    $("mOk").onclick = () => { const pid = $("mP").value, q = parseInt($("mQ").value, 10); if (!(q > 0)) return toast("Quantity must be > 0");
      if (!addTx(pid, m.dir, q, "Manual", "ADJ", (PART[pid] || {}).standard_price || 0, $("mN").value || "Manual entry")) return toast("Insufficient stock for this Stock Out.");
      state.modal = null; toast("Stock " + (m.dir === "IN" ? "in" : "out") + " saved"); renderContent(); };
  }
  const ppicRows = () => W.inv.map((i) => { const rec = D.ppic_recommendations.find((r) => r.part_id === i.part_id) || {}, fc = rec.forecast_demand || 0, p = pend(i.part_id), need = Math.max(0, fc + i.safety_stock - i.current_stock - p), st = need > 0 ? "Recommended To Order" : "Stock Sufficient";
    return { id: i.part_id, part: i.part_name, veh: `${i.brand} ${i.model}`, stock: i.current_stock, fc, pend: p, rec: need, prio: need > 0 ? (i.current_stock <= i.safety_stock ? "High" : "Medium") : "Low", status: st }; });
  function w_ppic() {
    const r = ppicRows(); chart("pF", "bar", r.slice(0, 12).map((x) => x.id), [{ label: "Current stock", data: r.slice(0, 12).map((x) => x.stock) }, { label: "Forecast demand", data: r.slice(0, 12).map((x) => x.fc) }], "", 1);
    return grid(200, sc("Parts tracked", r.length, "box") + sc("Recommended to order", r.filter((x) => x.rec > 0).length, "warn") + sc("Pending PO qty", r.reduce((a, x) => a + x.pend, 0), "truck")) +
      lv("wp", { title: "PPIC — Planning & Recommendation", desc: "Recommended = forecast demand + safety stock − current stock − pending PO (live from inventory & procurement)", fk: "status", fl: "recommendations", sk: "rec", sd: "desc",
        cols: [{ k: "part", l: "Part", f: (x) => `<b style="color:var(--navy-900);">${x.part}</b><div style="font-size:11px;color:var(--ink-500);">${x.id} · ${x.veh}</div>` }, { k: "stock", l: "Stock", m: 1 }, { k: "fc", l: "Forecast", m: 1 }, { k: "pend", l: "Pending PO", m: 1 }, { k: "rec", l: "Recommended", m: 1 }, { k: "prio", l: "Priority", f: (x) => badgePriority(x.prio) }, { k: "status", l: "Status", f: (x) => `<span class="badge badge-${x.rec ? "pending" : "ok"}">${x.status}</span>` }],
        rows: ppicRows, act: (x) => (x.rec ? btn("mkpo", x.id, "Create PO", "btn-primary") : "") }) + cbox("pF", "Current stock vs forecast demand (first 12 parts)");
  }
  ACT.mkpo = (pid) => { const r = ppicRows().find((x) => x.id === pid), h = W.po.find((p) => p.part_id === pid), sup = (h && SUP[h.supplier_id]) || D.suppliers.filter((s) => s.status === "Active").sort((a, b) => a.lead_time_days - b.lead_time_days)[0], p = PART[pid] || {}, uc = (h && h.unit_cost) || p.standard_price || 0;
    W.po.push({ po_id: "PO" + String(W.po.length + 1).padStart(4, "0"), po_date: today(), supplier_id: sup.supplier_id, part_id: pid, part_name: p.part_name, brand: p.brand, model: p.model, vehicle_part: p.vehicle_part, quantity: r.rec, unit: p.unit || "pcs", unit_cost: uc, total_cost: uc * r.rec, expected_date: new Date(Date.now() + sup.lead_time_days * 864e5).toISOString().slice(0, 10), status: "Draft", received_date: "", reference_repair_order: "PPIC_RECOMMENDATION", notes: "Created from PPIC" });
    toast("Draft PO created — see Procurement"); renderContent(); };
  function w_procurement() {
    return grid(200, sc("Total POs", W.po.length, "truck") + sc("Open", W.po.filter((p) => OPEN_PO.includes(p.status)).length, "clock") + sc("Received", W.po.filter((p) => p.status === "Received").length, "check") + sc("Open PO value", fmtIDR(W.po.filter((p) => OPEN_PO.includes(p.status)).reduce((a, p) => a + p.total_cost, 0)), "report")) +
      lv("wpo", { title: "Purchase Orders", desc: "Draft → Ordered → Receive Purchase (creates Stock IN)", fk: "status", fl: "statuses", sk: "date", sd: "desc",
        cols: [{ k: "id", l: "PO", m: 1 }, { k: "date", l: "Date" }, { k: "sup", l: "Supplier" }, { k: "part", l: "Part" }, { k: "qty", l: "Qty", m: 1 }, { k: "cost", l: "Total cost", m: 1, f: (r) => fmtIDR(r.cost) }, { k: "exp", l: "Expected" }, { k: "status", l: "Status", f: (r) => bs(r.status) }],
        rows: () => W.po.map((p) => ({ id: p.po_id, date: p.po_date, sup: (SUP[p.supplier_id] || {}).supplier_name || p.supplier_id, part: p.part_name, qty: p.quantity, cost: p.total_cost, exp: p.expected_date, status: p.status })),
        act: (r) => (r.status === "Draft" ? btn("poord", r.id, "Place order", "btn-primary") + " " + btn("pocan", r.id, "Cancel") : ["Ordered", "Partially Received"].includes(r.status) ? btn("porec", r.id, "Receive Purchase", "btn-primary") : "") });
  }
  const poOf = (id) => W.po.find((p) => p.po_id === id);
  ACT.poord = (id) => { poOf(id).status = "Ordered"; toast("PO ordered"); renderContent(); };
  ACT.pocan = (id) => { poOf(id).status = "Cancelled"; renderContent(); };
  ACT.porec = (id) => { const p = poOf(id); addTx(p.part_id, "IN", p.quantity, "Purchase Order", p.po_id, p.unit_cost, "Stock replenishment"); p.status = "Received"; p.received_date = today();
    W.q.filter((q) => q.queue_status === "Waiting").forEach((q) => { const r = W.ro.find((x) => x.repair_order_id === q.repair_order_id); if (r && r.part_id === p.part_id && invOf(p.part_id).current_stock >= r.quantity_required) { q.queue_status = "Scheduled"; r.status = "Scheduled"; } });
    toast(`${p.po_id} received → Stock IN +${p.quantity}`); renderContent(); };
  function w_paint() {
    return lv("wm", { title: "Paint & Material", desc: "Paint code and material requirement per vehicle part", fk: "material", fl: "materials",
      cols: [{ k: "vehicle", l: "Vehicle" }, { k: "part", l: "Part" }, { k: "color", l: "Color" }, { k: "code", l: "Paint code", m: 1 }, { k: "ptype", l: "Paint type" }, { k: "material", l: "Material" }, { k: "qty", l: "Qty", f: (r) => `${r.qty} ${r.unit}` }, { k: "cost", l: "Total cost", m: 1, f: (r) => fmtIDR(r.cost) }],
      rows: () => D.paint_materials.map((m) => ({ vehicle: `${m.brand} ${m.model}`, part: m.vehicle_part, color: m.vehicle_color, code: m.paint_code, ptype: m.paint_type, material: m.material_name, qty: m.quantity_required, unit: m.unit, cost: m.total_cost })) });
  }
  function w_analytics() {
    const by = (a, f) => { const c = cnt(a, f); return [Object.keys(c), Object.values(c)]; }, cost = {}; W.ro.forEach((r) => (cost[r.repair_action] = (cost[r.repair_action] || 0) + r.estimated_repair_cost));
    const per = [...new Set(D.demand_history.map((d) => d.period))].sort(), pr = ppicRows().slice(0, 10);
    chart("a1", "doughnut", ...by(W.sr, (s) => s.request_status), "Requests"); chart("a2", "bar", ...by(W.ro, (r) => r.status), "Repair orders");
    chart("a3", "bar", ...by(W.ro, (r) => r.damage_type), "Damage"); chart("a4", "doughnut", ...by(W.ro, (r) => r.severity), "Severity");
    chart("a5", "bar", Object.keys(cost), Object.values(cost), "Repair cost (IDR)");
    chart("a6", "bar", W.inv.slice(0, 10).map((i) => i.part_id), [{ label: "Stock", data: W.inv.slice(0, 10).map((i) => i.current_stock) }, { label: "Reorder point", data: W.inv.slice(0, 10).map((i) => i.reorder_point) }], "", 1);
    chart("a7", "line", per, [{ label: "Quantity demanded", data: per.map((p) => D.demand_history.filter((d) => d.period === p).reduce((a, d) => a + d.quantity_demanded, 0)) }, { label: "Quantity used", data: per.map((p) => D.demand_history.filter((d) => d.period === p).reduce((a, d) => a + d.quantity_used, 0)) }], "", 1);
    chart("a8", "bar", pr.map((x) => x.id), [{ label: "Forecast", data: pr.map((x) => x.fc) }, { label: "Recommended order", data: pr.map((x) => x.rec) }], "", 1);
    return grid(340, cbox("a1", "Service requests") + cbox("a2", "Repair status") + cbox("a3", "Damage type") + cbox("a4", "Severity") + cbox("a5", "Repair cost by action") + cbox("a6", "Inventory vs reorder point") + cbox("a7", "Demand history") + cbox("a8", "PPIC forecast vs recommended"));
  }
  function w_settings() {
    return `<div class="card"><div class="card-title">Workshop Settings</div><div class="row-2" style="margin-top:14px;"><div class="field"><label>Workshop user</label><input class="input" value="${state.user.name}" readonly></div><div class="field"><label>Data source</label><input class="input" value="SAVERA_DEMO_DATA.json (${D.data_type || "demo"})" readonly></div></div>
    <div style="display:flex;gap:8px;"><button class="btn btn-ghost" data-act="reset" data-id="">Reset demo data</button><button class="btn btn-danger" data-nav="logout">${ICONS.logout} Logout</button></div></div>`;
  }
  ACT.reset = () => location.reload();

  /* ================= shell / login / routing overrides ================= */
  const VIEWS = { "c-dashboard": c_dashboard, "c-vehicles": c_vehicles, "c-request": c_request, "c-status": c_status, "c-history": c_history, "c-profile": c_profile, "w-dashboard": w_dashboard, "w-requests": w_requests, "w-assessment": w_assessment, "w-queue": w_queue, "w-orders": w_orders, "w-inventory": w_inventory, "w-ppic": w_ppic, "w-procurement": w_procurement, "w-paint": w_paint, "w-analytics": w_analytics, "w-settings": w_settings };
  window.after_c_request = after_c_request; window.after_w_assessment = after_w_assessment;
  const NAV = { customer: [["c-dashboard", "Dashboard", "dashboard"], ["c-vehicles", "My Vehicles", "car"], ["c-request", "Service Request", "plus"], ["c-status", "Repair Status", "wrench"], ["c-history", "Service History", "history"], ["c-profile", "Profile", "settings"]],
    workshop: [["w-dashboard", "Dashboard", "dashboard"], ["w-requests", "Service Requests", "report"], ["w-assessment", "Assessment", "shield"], ["w-queue", "Repair Queue", "clock"], ["w-orders", "Repair Orders", "wrench"], ["w-inventory", "Inventory", "box"], ["w-ppic", "PPIC", "chart"], ["w-procurement", "Procurement", "truck"], ["w-paint", "Paint & Material", "droplet"], ["w-analytics", "Analytics", "chart"], ["w-settings", "Settings", "settings"]] };
  const TITLES = { "c-dashboard": ["Dashboard", "Your vehicles and active repairs"], "c-vehicles": ["My Vehicles", "Vehicles registered to your account"], "c-request": ["Service Request", "Create a request with photo analysis"], "c-status": ["Repair Status", "Track your repairs in real time"], "c-history": ["Service History", "Past services"], "c-profile": ["Profile", "Your account"], "w-dashboard": ["Workshop Dashboard", "Operations overview"], "w-requests": ["Service Requests", "Incoming customer requests"], "w-assessment": ["Assessment", "Verify damage, choose action, estimate cost"], "w-queue": ["Repair Queue", "Scheduling and progress"], "w-orders": ["Repair Orders", "Verified work orders"], "w-inventory": ["Inventory", "Stock, transactions and thresholds"], "w-ppic": ["PPIC", "Production planning & inventory control"], "w-procurement": ["Procurement", "Purchase orders and receiving"], "w-paint": ["Paint & Material", "Paint and consumables"], "w-analytics": ["Analytics", "Operational insight"], "w-settings": ["Settings", "Workshop configuration"] };
  Object.assign(PAGE_META, TITLES);
  const _shell = renderShell, _rc = renderContent, _att = attachLoginEvents;
  renderShell = function () {
    if (state.view === "login" || !state.role) return _shell();
    const nav = NAV[state.role], collapsed = state.sidebarCollapsed, m = PAGE_META[state.view] || ["", ""];
    $("app-shell").innerHTML = `<div class="sidebar ${collapsed ? "collapsed" : ""}" id="sidebar"><div class="sb-brand"><img src="assets/logo.png" alt="SAVERA Logo" style="width:34px;height:34px;border-radius:50%;object-fit:cover;background:#fff;padding:2px;flex-shrink:0;"><div class="sb-brand-text"><div class="sb-brand-title">SAVERA</div><div class="sb-brand-sub">${state.role === "customer" ? "Customer Portal" : "Workshop Console"}</div></div></div>
    <div class="sb-nav"><div class="sb-section-label">${state.role === "customer" ? "My Account" : "Operations"}</div>${nav.map(([id, l, ic]) => `<button class="sb-item ${state.view === id ? "active" : ""}" data-nav="${id}">${ICONS[ic]}<span class="sb-item-label">${l}</span></button>`).join("")}</div>
    <div class="sb-foot"><button class="sb-item" data-nav="logout" style="margin-bottom:8px;">${ICONS.logout}<span class="sb-item-label">Logout</span></button><button class="sb-collapse-btn" id="collapseBtn">${ICONS.collapse}<span class="lbl">Collapse</span></button></div></div>
    <div class="main-col"><div class="topbar"><div><div class="tb-title">${m[0]}</div><div class="tb-sub">${m[1]}</div></div><div class="tb-right"><button class="tb-icon-btn" title="Notifications">${ICONS.bell}<span class="tb-dot"></span></button><div class="tb-user" data-nav="${state.role === "customer" ? "c-profile" : "w-settings"}"><div class="tb-avatar">${initials(state.user.name)}</div><div><div class="tb-user-name">${state.user.name}</div><div class="tb-user-role">${state.user.role}</div></div></div></div></div><div class="content" id="content"></div></div>`;
    $("collapseBtn").onclick = () => { state.sidebarCollapsed = !state.sidebarCollapsed; renderShell(); };
    renderContent();
  };
  renderContent = function () {
    if (!VIEWS[state.view]) return _rc();
    $("content").innerHTML = VIEWS[state.view]() + modalHTML();
    wire(); wireModal(); drawCharts(); const a = window["after_" + state.view.replace(/-/g, "_")]; if (a) a();
  };
  handleNav = function (id) { if (id === "logout") { state.user = null; state.role = null; state.view = "login"; return renderShell(); } if (id === "c-request" && state.view !== "c-request") state.rq = {}; if (id !== "w-assessment") state.aid = null; if (id === "w-assessment") state.av = null; state.view = id; renderShell(); };
  attachLoginEvents = function () {
    _att();
    const email = $("loginEmail"), fld = email.closest(".field"), custs = [...new Set(D.service_requests.map((s) => s.customer_id))].filter((c) => CUST[c]);
    fld.insertAdjacentHTML("beforebegin", `<div class="field"><label>Sign in as</label><select class="select" id="roleSel"><option value="customer">Customer</option><option value="workshop">Workshop</option></select></div><div class="field" id="custF"><label>Customer account</label><select class="select" id="custSel">${custs.map((c) => `<option value="${c}">${CUST[c].customer_name} (${c})</option>`).join("")}</select></div>`);
    const sync = () => { const w = $("roleSel").value === "workshop"; $("custF").style.display = w ? "none" : ""; email.value = w ? "admin@savera-workshop.co.id" : (CUST[$("custSel").value] || {}).email || ""; };
    $("roleSel").onchange = sync; $("custSel").onchange = sync; sync();
    const go = () => { const w = $("roleSel").value === "workshop", cid = $("custSel").value; state.role = w ? "workshop" : "customer"; state.user = w ? { name: "Workshop Admin", role: "Workshop Manager", email: email.value } : { name: CUST[cid].customer_name, role: "Customer", cid, email: CUST[cid].email }; state.view = w ? "w-dashboard" : "c-dashboard"; state.rq = {}; renderShell(); };
    const c = (id) => { const el = $(id), n = el.cloneNode(true); el.replaceWith(n); return n; };
    c("loginBtn").onclick = go; c("demoBtn").onclick = go; c("loginPass").addEventListener("keydown", (e) => e.key === "Enter" && go());
  };
  /* Shared handles for savera-customer.js (customer flow). Objects are mutated in place; workshop code is unchanged. */
  window.SAVERA_V2 = { D, W, CUST, NAV, VIEWS, ACT, lv, btn, bs, bsev, costFor, cvAnalyze, roOf, qOf, mySR, active, stepper, sc, grid };
  state.view = "login"; state.role = null; renderShell();
})();
