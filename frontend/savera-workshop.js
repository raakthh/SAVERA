/* SAVERA — Workshop Assessment upgrade + persen di semua donut chart.
   Loads AFTER savera-customer.js. Yang diganti HANYA:
     1. halaman Workshop › Assessment (list + detail verifikasi)
     2. tampilan donut/pie chart (persen di irisan, legend, tooltip)
   Inventory, PPIC, Procurement, Analytics, Repair Queue/Orders, dan flow Customer tidak diubah. */

/* ============================================================
   1) DONUT CHART — persen tampil di setiap irisan (semua chart doughnut/pie)
   Plugin global: berlaku otomatis untuk chart lama & baru (Dashboard, Analytics, dst).
   ============================================================ */
(function () {
  if (typeof Chart === "undefined") return;
  const visTotal = (chart, ds) => ds.data.reduce((a, v, i) => a + (chart.getDataVisibility(i) ? +v || 0 : 0), 0);
  const fmtPct = (p) => (p >= 5 ? Math.round(p) : Math.round(p * 10) / 10) + "%";
  const isLight = (c) => {
    const m = /^#?([0-9a-f]{6})$/i.exec(String(c || "").trim());
    if (!m) return false;
    const n = parseInt(m[1], 16), r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    return 0.299 * r + 0.587 * g + 0.114 * b > 160;
  };

  Chart.register({
    id: "saveraDonutPct",
    afterDatasetsDraw(chart) {
      const t = chart.config.type;
      if (t !== "doughnut" && t !== "pie") return;
      const ds = chart.data.datasets[0], meta = chart.getDatasetMeta(0);
      if (!ds || !meta) return;
      const total = visTotal(chart, ds);
      if (!total) return;
      const ctx = chart.ctx;
      ctx.save();
      ctx.font = '600 12px "IBM Plex Sans", sans-serif';
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      meta.data.forEach((arc, i) => {
        if (!chart.getDataVisibility(i)) return;
        const v = +ds.data[i] || 0;
        if (!v) return;
        const p = (v / total) * 100, mid = (arc.startAngle + arc.endAngle) / 2, label = fmtPct(p);
        const inside = p >= 6; /* irisan kecil: label di luar ring supaya tetap terbaca */
        const r = inside ? (arc.innerRadius + arc.outerRadius) / 2 : arc.outerRadius + 13;
        const x = arc.x + Math.cos(mid) * r, y = arc.y + Math.sin(mid) * r;
        if (inside) {
          const light = isLight(arc.options.backgroundColor);
          ctx.fillStyle = light ? "#0B2545" : "#FFFFFF";
        } else ctx.fillStyle = "#0B2545";
        ctx.fillText(label, x, y);
      });
      ctx.restore();
    },
  });

  const ov = Chart.overrides && Chart.overrides.doughnut;
  if (ov) {
    ov.layout = Object.assign({}, ov.layout, { padding: 16 }); /* ruang untuk label di luar ring */
    const pl = (ov.plugins = ov.plugins || {});
    const lg = ((pl.legend = pl.legend || {}).labels = pl.legend.labels || {});
    const baseGen = lg.generateLabels;
    if (baseGen)
      lg.generateLabels = function (chart) {
        const items = baseGen.call(this, chart), ds = chart.data.datasets[0], total = visTotal(chart, ds);
        items.forEach((it) => {
          if (total && chart.getDataVisibility(it.index)) it.text = `${it.text} — ${fmtPct(((+ds.data[it.index] || 0) / total) * 100)}`;
        });
        return items;
      };
    const cb = ((pl.tooltip = pl.tooltip || {}).callbacks = pl.tooltip.callbacks || {});
    cb.label = function (c) {
      const total = visTotal(c.chart, c.dataset), v = +c.raw || 0;
      return ` ${c.label}: ${v.toLocaleString("id-ID")} (${total ? fmtPct((v / total) * 100) : "0%"})`;
    };
  }
})();

/* ============================================================
   2) WORKSHOP ASSESSMENT
   ============================================================ */
(function () {
  const V = window.SAVERA_V2, D = window.SAVERA_DEMO;
  if (!V || !D) return;
  const { W, CUST, VIEWS, ACT } = V;
  const $ = (i) => document.getElementById(i);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const lc = (s) => String(s || "").toLowerCase();
  const today = () => new Date().toISOString().slice(0, 10);
  const SEVS = ["Minor", "Moderate", "Severe"], ACTS = ["Repair", "Replace", "Repaint"];
  const DTS = [...new Set(D.repair_costs.map((r) => r.damage_type))].sort();
  const PENDING = ["Submitted", "Under Assessment", "Approved"];
  const invOf = (id) => W.inv.find((i) => i.part_id === id);
  const nextId = (arr, key, pre) => pre + String(arr.reduce((a, x) => Math.max(a, parseInt(String(x[key]).replace(/\D/g, ""), 10) || 0), 0) + 1).padStart(4, "0");
  const partFor = (sr, part) => D.spareparts.find((p) => lc(p.vehicle_part) === lc(part) && p.brand === sr.brand && p.model === sr.model) || D.spareparts.find((p) => lc(p.vehicle_part) === lc(part) && p.brand === sr.brand) || D.spareparts.find((p) => lc(p.vehicle_part) === lc(part));
  const phoneShow = (p) => { p = String(p || "").replace(/[\s\-().+]/g, ""); return !p ? "–" : p.startsWith("0") ? p : p.startsWith("62") ? "0" + p.slice(2) : "0" + p; };
  const norm = (list, v, def) => list.find((x) => lc(x) === lc(v)) || def;
  const G = (state.gal = state.gal || {});

  /* Hasil deteksi CV asli, dibekukan sekali supaya tetap tampil walau workshop mengedit nilainya. */
  function detOf(s) {
    if (s.detected) return s.detected;
    const cv = V.cvAnalyze(s);
    return (s.detected = { area: s.initial_damage_area, type: cv.type || s.initial_damage_type, severity: norm(SEVS, cv.severity, "Moderate"), pct: cv.pct, action: norm(ACTS, cv.action, "Repair"), conf: cv.conf, cost: s.initial_estimated_cost, service: s.service_type, min: cv.rc.cost_min, max: cv.rc.cost_max });
  }
  /* Biaya otomatis dari repair_costs (rumus yang sama dengan sebelumnya). */
  function calc(s, av) {
    const rc = V.costFor(s.initial_damage_area, av.type, av.sev, s.brand), part = av.action === "Replace" ? partFor(s, s.initial_damage_area) : null;
    return { rc, part, auto: { spare: av.action === "Replace" ? rc.spare_part_cost : 0, labor: rc.labor_cost, paint: av.action === "Repair" ? 0 : rc.painting_cost, add: rc.additional_cost } };
  }
  const sum = (c) => (c.spare || 0) + (c.labor || 0) + (c.paint || 0) + (c.add || 0);
  function initAv(s) {
    const d = detOf(s), av = { type: d.type, sev: d.severity, action: d.action, notes: s.workshop_notes || "", manual: false };
    av.cost = calc(s, av).auto;
    return av;
  }
  const svcFor = (s, action) => (action === "Replace" ? "Part Replacement" : action === "Repaint" ? "Paint Repair" : ["Part Replacement", "Paint Repair"].includes(s.service_type) ? (lc(s.initial_damage_area) === "windshield" ? "Glass Repair" : "Body Repair") : s.service_type);
  const kv = (l, v) => `<div class="sv-kv"><div class="sv-k">${l}</div><div class="sv-v">${v}</div></div>`;
  const bar = (v, c) => `<div style="height:7px;border-radius:5px;background:#e8edf4;margin-top:6px;overflow:hidden;"><div style="height:100%;width:${Math.max(0, Math.min(100, Math.round(v)))}%;background:${c};border-radius:5px;"></div></div>`;
  const pctColor = (p) => (p >= 55 ? "var(--bad)" : p >= 30 ? "#F2A541" : "var(--cyan-500)");

  /* ---------------- LIST ---------------- */
  function listView() {
    const c = (st) => W.sr.filter((x) => (Array.isArray(st) ? st.includes(x.request_status) : x.request_status === st)).length;
    const rank = (st) => (st === "Submitted" ? 0 : st === "Under Assessment" ? 1 : 2);
    return V.grid(200, V.sc("Awaiting assessment", c("Submitted"), "clock") + V.sc("Under assessment", c("Under Assessment"), "shield") + V.sc("Verified", c(["Approved", "In Repair", "Completed"]), "check") + V.sc("Rejected", c("Cancelled"), "warn")) +
      V.lv("wa", { title: "Assessment", desc: "Review kiriman customer, verifikasi hasil deteksi, lalu simpan — status assessment berubah otomatis", fk: "status", fl: "statuses", sk: "ord", sd: "asc",
        cols: [{ k: "id", l: "Request", m: 1 },
          { k: "customer", l: "Customer", f: (r) => `<b style="color:var(--navy-900);">${esc(r.customer)}</b><div style="font-size:11px;color:var(--ink-500);">${esc(r.phone)}</div>` },
          { k: "vehicle", l: "Vehicle" },
          { k: "photos", l: "Photo", f: (r) => { const s = W.sr.find((x) => x.service_request_id === r.id), p = s && s.photos && s.photos[0]; return p ? `<img class="sv-mini" src="${p}" alt="Foto ${esc(r.id)}"><span style="font-size:11px;color:var(--ink-500);margin-left:6px;">${r.photos}</span>` : `${r.photos} foto`; } },
          { k: "dmg", l: "Damage", f: (r) => `${esc(r.area)}<div style="font-size:11px;color:var(--ink-500);">${esc(r.dmg)}</div>` },
          { k: "sev", l: "Severity", f: (r) => V.bsev(r.sev) },
          { k: "pct", l: "Damage %", f: (r) => `${r.pct}%` },
          { k: "svc", l: "Service Type" },
          { k: "cost", l: "Cost", m: 1, f: (r) => fmtIDR(r.cost) },
          { k: "status", l: "Status", f: (r) => V.bs(r.status) }],
        rows: () => W.sr.map((s) => { const cu = CUST[s.customer_id] || {}, d = detOf(s); return { id: s.service_request_id, ord: rank(s.request_status) * 1e9 - (+String(s.request_date).replace(/\D/g, "") || 0), customer: cu.customer_name || s.customer_id, phone: phoneShow(cu.phone), vehicle: `${s.brand} ${s.model} · ${s.plate_number}`, photos: (s.photos || []).length || s.photo_count, area: s.initial_damage_area, dmg: s.initial_damage_type, sev: s.initial_severity, pct: Math.round(s.verified ? s.verified.pct : d.pct), svc: s.service_type, cost: s.initial_estimated_cost, status: s.request_status }; }),
        act: (r) => V.btn("assess", r.id, PENDING.includes(r.status) && !V.roOf(r.id) ? "Assess" : "View", PENDING.includes(r.status) && !V.roOf(r.id) ? "btn-primary" : "btn-ghost") });
  }

  /* ---------------- shared pieces ---------------- */
  function galleryHTML(s) {
    const ph = s.photos || [], i = Math.min(G.wa || 0, Math.max(0, ph.length - 1));
    if (!ph.length) return `<div class="sv-viewer sv-none"><div>${ICONS.upload}<div>Foto tidak tersedia<br><span style="font-size:11px;">(data demo · ${s.photo_count || 0} foto tercatat)</span></div></div></div>`;
    return `<div class="sv-viewer" id="waViewer" style="cursor:zoom-in;" title="Klik untuk memperbesar"><img src="${ph[i]}" alt="Foto customer ${i + 1}"><span class="sv-tag">${ICONS.warn} ${esc(s.initial_damage_area)}</span></div>
      ${ph.length > 1 ? `<div class="sv-thumbs">${ph.map((p, k) => `<button type="button" class="sv-thumb ${k === i ? "on" : ""}" data-wg="${k}" aria-label="Foto ${k + 1}"><img src="${p}" alt=""></button>`).join("")}</div>` : ""}
      <div style="font-size:11.5px;color:var(--ink-500);margin-top:6px;">Foto ${i + 1} dari ${ph.length}</div>`;
  }
  function detailsHTML(s) {
    const cu = CUST[s.customer_id] || {}, d = detOf(s);
    return `<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:4px;flex-wrap:wrap;"><b style="color:var(--navy-900);">Hasil deteksi (Customer / CV)</b><span class="sv-chip">Confidence ${Math.round(d.conf * 100)}%</span></div>
      ${kv("Customer", `<b>${esc(cu.customer_name || s.customer_id)}</b><div style="font-size:11.5px;color:var(--ink-500);">${esc(phoneShow(cu.phone))}</div>`)}
      ${kv("Vehicle", `${esc(s.brand)} ${esc(s.model)} ${esc(s.year)}<div style="font-size:11.5px;color:var(--ink-500);">${esc(s.plate_number)}</div>`)}
      ${kv("Complaint", esc(s.customer_complaint))}
      ${kv("Damage", `${esc(d.area)} — ${esc(d.type)}`)}
      ${kv("Severity", V.bsev(d.severity))}
      ${kv("Damage %", `<b>${Math.round(d.pct)}%</b>${bar(d.pct, pctColor(d.pct))}`)}
      ${kv("Service Type", esc(d.service))}
      ${kv("Cost", `<b style="font-size:17px;color:var(--navy-900);">${fmtIDR(d.cost)}</b><div style="font-size:11.5px;color:var(--ink-500);margin-top:2px;">Kisaran ${fmtIDR(d.min)} – ${fmtIDR(d.max)} · ${esc(d.action)}</div>`)}`;
  }
  const headCard = (s) => `<div class="card"><div class="card-title" style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;"><span>Assessment ${esc(s.service_request_id)}</span>${V.bs(s.request_status)}</div>${V.stepper(s.request_status)}
    ${(() => { const d = detOf(s); return V.chain({ area: d.area, type: d.type, severity: d.severity, pct: d.pct, action: d.action }, "Hasil deteksi foto"); })()}
    <div class="sv-result" style="margin-top:16px;"><div>${galleryHTML(s)}</div><div>${detailsHTML(s)}</div></div></div>`;
  const costTable = (c, editable, act) => `<div class="table-wrap"><table><tbody>${[["spare", "Spare part"], ["labor", "Labor"], ["paint", "Painting"], ["add", "Additional"]].map(([k, l]) => {
    const off = (k === "spare" && act !== "Replace") || (k === "paint" && act === "Repair");
    return `<tr><td>${l}${off ? ` <span style="font-size:11px;color:var(--ink-500);">(tidak dipakai untuk ${esc(act)})</span>` : ""}</td><td style="text-align:right;">${editable ? `<input class="input avc" type="number" min="0" step="1000" data-k="${k}" value="${c[k] || 0}" ${off ? "disabled" : ""} style="max-width:170px;margin-left:auto;text-align:right;font-family:var(--font-mono);">` : `<span style="font-family:var(--font-mono);">${fmtIDR(c[k] || 0)}</span>`}</td></tr>`;
  }).join("")}<tr><td><b>Estimated total</b></td><td style="text-align:right;font-family:var(--font-mono);"><b id="avTotal">${fmtIDR(sum(c))}</b></td></tr></tbody></table></div>`;
  const rangeMsg = (total, rc) => (total < rc.cost_min ? `Total di bawah kisaran referensi (${fmtIDR(rc.cost_min)} – ${fmtIDR(rc.cost_max)}).` : total > rc.cost_max ? `Total di atas kisaran referensi (${fmtIDR(rc.cost_min)} – ${fmtIDR(rc.cost_max)}).` : "");

  /* ---------------- DETAIL ---------------- */
  function detailView(s) {
    const ro = V.roOf(s.service_request_id), editable = !ro && PENDING.includes(s.request_status);
    if (!editable) return headCard(s) + readOnlyCard(s, ro);
    const av = state.av || (state.av = initAv(s)), c = calc(s, av), total = sum(av.cost), it = c.part && invOf(c.part.part_id), ok = !c.part || (it && it.current_stock >= 1), msg = rangeMsg(total, c.rc);
    const sel = (id, list, cur) => `<select class="select" id="${id}">${list.map((x) => `<option ${x === cur ? "selected" : ""}>${esc(x)}</option>`).join("")}</select>`;
    return headCard(s) + `<div class="card"><div class="card-title">Workshop Verification</div><div class="card-desc">Cek hasil deteksi, koreksi bila perlu, lalu simpan. Biaya terisi otomatis dari data referensi dan bisa diubah manual.</div>
      <div class="row-3" style="margin-top:14px;"><div class="field"><label>Damage Type</label>${sel("avT", DTS, av.type)}</div><div class="field"><label>Severity</label>${sel("avS", SEVS, av.sev)}</div><div class="field"><label>Repair / Replace / Repaint</label>${sel("avA", ACTS, av.action)}</div></div>
      ${V.chain({ area: s.initial_damage_area, type: av.type, severity: av.sev, pct: c.rc.damage_percentage, action: av.action }, "Hasil verifikasi workshop")}
      <div style="font-size:12px;color:var(--ink-500);margin:-4px 0 12px;">Damage % terverifikasi: <b style="color:var(--navy-900);">${Math.round(c.rc.damage_percentage)}%</b> · Service type: <b style="color:var(--navy-900);">${esc(svcFor(s, av.action))}</b></div>
      <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:6px;flex-wrap:wrap;"><b style="color:var(--navy-900);">Cost</b><button class="btn btn-ghost btn-sm" id="avReset" ${av.manual ? "" : "disabled"}>Reset ke estimasi otomatis</button></div>
      ${costTable(av.cost, true, av.action)}
      <div style="font-size:12px;color:var(--ink-500);margin:8px 0;">Reference range dari repair_costs: ${fmtIDR(c.rc.cost_min)} – ${fmtIDR(c.rc.cost_max)}${av.manual ? " · <b>biaya diubah manual</b>" : ""}</div>
      <div class="banner banner-warn" id="avWarn" style="margin:8px 0;${msg ? "" : "display:none;"}"><div>${msg}</div></div>
      ${c.part ? `<div class="banner ${ok ? "" : "banner-warn"}" style="margin:10px 0;"><div>Part: <b>${esc(c.part.part_name)}</b> (${esc(c.part.part_id)}) · stock ${it ? it.current_stock : 0} · ${ok ? "tersedia — akan di-reserve saat repair dimulai" : "stok tidak cukup — order diteruskan ke Procurement, repair menunggu part"}</div></div>` : ""}
      ${av.action === "Repaint" && V.paintPanel ? V.paintPanel(s, av) : ""}
      <div class="field"><label>Catatan workshop (opsional)</label><textarea class="input" id="avN" style="min-height:60px;" placeholder="Mis. kerusakan lebih dalam dari foto, perlu cek rangka…">${esc(av.notes)}</textarea></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;"><button class="btn btn-primary" id="avOk">${ICONS.check} Save Assessment</button><button class="btn btn-danger" id="avNo">Reject</button><button class="btn btn-ghost" data-nav="w-assessment">← Back to list</button></div></div>`;
  }
  function readOnlyCard(s, ro) {
    const v = s.verified, d = detOf(s), q = ro && V.qOf(ro.repair_order_id);
    if (s.request_status === "Cancelled" && !ro)
      return `<div class="card"><div class="card-title">Workshop Verification</div><div class="banner banner-warn" style="margin-top:12px;"><div>Assessment ini <b>ditolak</b> oleh workshop.${s.workshop_notes ? " Catatan: " + esc(s.workshop_notes) : ""}</div></div><div style="margin-top:14px;"><button class="btn btn-ghost btn-sm" data-nav="w-assessment">← Back to list</button></div></div>`;
    const fields = v ? [["Damage Type", d.type, v.damage_type], ["Severity", d.severity, v.severity], ["Action", d.action, v.action], ["Cost", fmtIDR(d.cost), fmtIDR(v.total)]] : [];
    const diffs = fields.filter((f) => f[1] !== f[2]);
    const cost = v ? v.cost : null;
    return `<div class="card"><div class="card-title" style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;"><span>Workshop Verification</span>${V.bs(s.request_status)}</div>
      <div class="banner" style="margin-top:12px;"><div>${v ? `Tersimpan oleh <b>${esc(v.by)}</b> · ${esc(v.at)} · status <b>${esc(v.prev_status)}</b> → <b>${esc(v.new_status)}</b>` : "Assessment ini sudah diverifikasi sebelumnya."}${ro ? ` · Repair order <b>${esc(ro.repair_order_id)}</b>${q ? ` · Queue #${q.queue_number}` : ""}` : ""}</div></div>
      <div class="row-3" style="margin:14px 0;">${[["Damage Type", v ? v.damage_type : ro ? ro.damage_type : s.initial_damage_type], ["Severity", v ? v.severity : ro ? ro.severity : s.initial_severity], ["Repair / Replace / Repaint", v ? v.action : ro ? ro.repair_action : "–"], ["Damage %", (v ? Math.round(v.pct) : ro ? Math.round(ro.damage_percentage) : Math.round(d.pct)) + "%"], ["Service Type", s.service_type], ["Total cost", fmtIDR(v ? v.total : ro ? ro.estimated_repair_cost : s.initial_estimated_cost)]].map(([l, x]) => `<div><div style="font-size:11px;color:var(--ink-500);">${l}</div><div style="font-weight:600;color:var(--navy-900);">${esc(x)}</div></div>`).join("")}</div>
      ${cost ? costTable(cost, false, v.action) : ""}
      ${v && v.paint ? `<div style="margin-top:12px;font-size:12.5px;"><b style="color:var(--navy-900);">Paint:</b> ${esc(v.paint.color)} · kode ${esc(v.paint.code)} · ${esc(v.paint.type)} · material ${fmtIDR(v.paint.materials_cost)}</div>` : ""}
      ${v ? `<div style="margin-top:12px;font-size:12.5px;"><b style="color:var(--navy-900);">Perubahan dari hasil deteksi:</b> ${diffs.length ? diffs.map((f) => `<span class="sv-chip" style="margin-left:6px;">${f[0]}: ${esc(f[1])} → <b>${esc(f[2])}</b></span>`).join("") : `<span style="color:var(--ink-500);">tidak ada — hasil deteksi disetujui apa adanya</span>`}</div>` : ""}
      ${s.workshop_notes && !/^Verified:/.test(s.workshop_notes) ? `<div style="margin-top:10px;font-size:12.5px;"><b style="color:var(--navy-900);">Catatan:</b> ${esc(s.workshop_notes)}</div>` : ""}
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:16px;"><button class="btn btn-ghost btn-sm" data-nav="w-assessment">← Back to list</button>${ro ? `<button class="btn btn-primary btn-sm" data-nav="w-queue">Lihat Repair Queue</button>` : ""}</div></div>`;
  }

  VIEWS["w-assessment"] = function () {
    const s = W.sr.find((x) => x.service_request_id === state.aid);
    return s ? detailView(s) : listView();
  };

  /* ---------------- events ---------------- */
  function lightbox(src) {
    const d = document.createElement("div"); d.className = "wa-lightbox"; d.innerHTML = `<img src="${src}" alt="Foto diperbesar">`;
    const close = () => { d.remove(); document.removeEventListener("keydown", esc2); }, esc2 = (e) => e.key === "Escape" && close();
    d.onclick = close; document.addEventListener("keydown", esc2); document.body.appendChild(d);
  }
  window.after_w_assessment = function () {
    const s = W.sr.find((x) => x.service_request_id === state.aid); if (!s) return;
    document.querySelectorAll("[data-wg]").forEach((b) => (b.onclick = () => { G.wa = +b.dataset.wg; renderContent(); }));
    const vw = $("waViewer"); if (vw) vw.onclick = () => lightbox(vw.querySelector("img").src);
    if (!$("avOk")) return;
    const av = state.av, refresh = () => { av.cost = calc(s, av).auto; av.manual = false; renderContent(); };
    $("avT").onchange = () => { av.type = $("avT").value; refresh(); };
    $("avS").onchange = () => { av.sev = $("avS").value; refresh(); };
    $("avA").onchange = () => { av.action = $("avA").value; refresh(); };
    $("avReset").onclick = refresh;
    $("avN").oninput = () => (av.notes = $("avN").value);
    if ($("avColor")) $("avColor").onchange = () => { av.color = $("avColor").value; renderContent(); };
    document.querySelectorAll(".avc").forEach((inp) => (inp.oninput = () => {
      av.cost[inp.dataset.k] = Math.max(0, Math.round(+inp.value || 0)); av.manual = true;
      const t = sum(av.cost), m = rangeMsg(t, calc(s, av).rc);
      $("avTotal").textContent = fmtIDR(t); $("avWarn").style.display = m ? "" : "none"; $("avWarn").firstElementChild.textContent = m; $("avReset").disabled = false;
    }));
    $("avNo").onclick = () => {
      const prev = s.request_status; s.request_status = "Cancelled"; s.workshop_notes = (av.notes || "").trim() || "Rejected by workshop";
      s.verified = null; state.av = null; toast(`${s.service_request_id} rejected · status ${prev} → Cancelled`); renderContent();
    };
    $("avOk").onclick = () => {
      const c = calc(s, av), cost = { ...av.cost }, total = sum(cost);
      if (!(total > 0)) return toast("Total cost harus lebih dari 0.");
      if (Object.values(cost).some((x) => !Number.isFinite(x) || x < 0)) return toast("Nilai cost tidak valid.");
      const d = detOf(s), part = c.part, it = part && invOf(part.part_id), ok = !part || (it && it.current_stock >= 1), prev = s.request_status;
      const roId = nextId(W.ro, "repair_order_id", "RO"), days = Math.max(1, Math.round(c.rc.damage_percentage / 12)), prio = av.sev === "Severe" ? "High" : av.sev === "Moderate" ? "Medium" : "Low";
      W.ro.push({ repair_order_id: roId, service_request_id: s.service_request_id, vehicle_id: s.vehicle_id, brand: s.brand, model: s.model, year: s.year, vehicle_part: s.initial_damage_area, part_id: part ? part.part_id : "NOT_REQUIRED", part_name: part ? part.part_name : "NOT_REQUIRED", damage_type: av.type, severity: av.sev, damage_percentage: c.rc.damage_percentage, repair_action: av.action, quantity_required: part ? 1 : 0, estimated_repair_cost: total, estimated_repair_days: days, priority: prio, status: ok ? "Scheduled" : "Waiting", created_date: today(), scheduled_date: today(), completed_date: "" });
      const ahead = W.q.filter((x) => !["Completed", "Cancelled"].includes(x.queue_status));
      W.q.push({ queue_id: nextId(W.q, "queue_id", "QUE"), repair_order_id: roId, service_request_id: s.service_request_id, vehicle_id: s.vehicle_id, plate_number: s.plate_number, brand: s.brand, model: s.model, vehicle_part: s.initial_damage_area, damage_type: av.type, severity: av.sev, repair_action: av.action, priority: prio, queue_number: W.q.reduce((a, x) => Math.max(a, x.queue_number || 0), 0) + 1, estimated_repair_days: days, estimated_waiting_days: ahead.reduce((a, x) => a + x.estimated_repair_days, 0), scheduled_date: today(), actual_start_date: "", actual_completion_date: "", queue_status: ok ? "Scheduled" : "Waiting", technician_status: "Not started" });
      const notes = (av.notes || "").trim();
      s.verified = { damage_type: av.type, severity: av.sev, action: av.action, cost, total, pct: c.rc.damage_percentage, manual: av.manual, notes, by: (state.user && state.user.name) || "Workshop", at: today(), prev_status: prev, new_status: "Approved", paint: av.action === "Repaint" && V.paintSummary ? V.paintSummary(s, av) : null };
      s.initial_damage_type = av.type; s.initial_severity = av.sev; s.initial_estimated_cost = total; s.service_type = svcFor(s, av.action);
      s.workshop_notes = notes || `Verified: ${av.action} (${av.sev})`; s.request_status = "Approved";
      state.av = null; G.wa = 0;
      toast(`${s.service_request_id} disimpan · status ${prev} → Approved · ${roId}${ok ? "" : " (menunggu part — lihat PPIC/Procurement)"}`);
      renderContent();
    };
  };
  /* Pastikan hook lama (savera-v2.js) tidak menimpa hook baru saat render */
  V.detOf = detOf;
})();
