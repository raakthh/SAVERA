/* SAVERA — Insights layer. Loads AFTER savera-invoice.js.
   1. Customer Dashboard  : Vehicle Damage Insights (kasus body repair yang sedang berjalan) + Customer Bill
   2. Workshop Analytics  : Total Revenue, Monthly Revenue Trend, Revenue by Repair Type, Next Month Revenue Forecast
   3. Paint & Material    : Paint Combination / Material Recommendation (juga muncul di Assessment saat Repaint)
   4. Chart               : label persen terbaca di chart batang & garis (donut sudah ditangani savera-workshop.js)
   Semua angka dihitung dari data yang ada (SAVERA_DEMO_DATA + Repair Order / Assessment). Tidak ada data acak. */

/* ============================================================
   CHART PLUGINS — persen pada bar & line
   ============================================================ */
(function () {
  if (typeof Chart === "undefined") return;
  const pctTxt = (p) => (p >= 5 ? Math.round(p) : Math.round(p * 10) / 10) + "%";
  Chart.register({
    id: "saveraBarPct",
    afterDatasetsDraw(chart) {
      if (chart.config.type !== "bar") return;
      const o = (chart.options.plugins || {}).saveraBarPct;
      if (o === false) return;
      const dss = chart.data.datasets, mode = (o && o.mode) || "share";
      if (mode === "share" && dss.length !== 1) return; /* grafik multi-seri tidak punya "bagian dari total" yang jelas */
      const ds = dss[0], meta = chart.getDatasetMeta(0), horiz = chart.options.indexAxis === "y";
      const total = ds.data.reduce((a, v, i) => a + (chart.getDataVisibility(i) ? Math.max(0, +v || 0) : 0), 0);
      if (mode === "share" && !total) return;
      const ctx = chart.ctx;
      ctx.save(); ctx.font = '600 11.5px "IBM Plex Sans", sans-serif'; ctx.fillStyle = "#0B2545"; ctx.textBaseline = "middle";
      meta.data.forEach((bar, i) => {
        const v = +ds.data[i]; if (!Number.isFinite(v) || v <= 0) return;
        const t = mode === "value" ? Math.round(v * 10) / 10 + ((o && o.suffix) || "%") : pctTxt((v / total) * 100);
        if (horiz) { ctx.textAlign = "left"; ctx.fillText(t, bar.x + 6, bar.y); } else { ctx.textAlign = "center"; ctx.fillText(t, bar.x, bar.y - 9); }
      });
      ctx.restore();
    },
  });
  Chart.register({
    id: "saveraTrend", /* label perubahan % antar titik pada line chart (opt-in: options.plugins.saveraTrend = {}) */
    afterDatasetsDraw(chart) {
      if (chart.config.type !== "line" || !(chart.options.plugins || {}).saveraTrend) return;
      const ctx = chart.ctx; ctx.save(); ctx.font = '600 11px "IBM Plex Sans", sans-serif'; ctx.textAlign = "center";
      chart.data.datasets.forEach((ds, di) => {
        const meta = chart.getDatasetMeta(di); let prev = null;
        ds.data.forEach((v, i) => {
          if (v == null) return;
          if (prev != null && prev > 0) { const p = ((v - prev) / prev) * 100, el = meta.data[i]; ctx.fillStyle = p >= 0 ? "#1b9c63" : "#c23b3b"; ctx.fillText((p >= 0 ? "+" : "") + Math.round(p * 10) / 10 + "%", el.x, el.y - 12); }
          prev = v;
        });
      });
      ctx.restore();
    },
  });
  if (Chart.overrides && Chart.overrides.bar) Chart.overrides.bar.layout = Object.assign({}, Chart.overrides.bar.layout, { padding: { top: 24, right: 20 } });
})();

(function () {
  const V = window.SAVERA_V2, D = window.SAVERA_DEMO;
  if (!V || !D) return;
  const { W, CUST, VIEWS, ACT } = V;
  const $ = (i) => document.getElementById(i);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const lc = (s) => String(s || "").toLowerCase();
  const uniq = (a) => [...new Set(a.filter(Boolean))];
  const me = () => state.user && state.user.cid;
  const PAL = ["#0B2545", "#13A8C4", "#5BC0DE", "#8DA9C4", "#F2A541", "#E4572E"];
  const rp = (n) => (n >= 1e9 ? "Rp " + (n / 1e9).toFixed(1) + " M" : n >= 1e6 ? "Rp " + (n / 1e6).toFixed(1) + " jt" : n >= 1e3 ? "Rp " + Math.round(n / 1e3) + " rb" : "Rp " + n);
  const sc = (l, v, i, d) => V.sc(l, v, i, d);
  const cbox = (id, t, h) => `<div class="card"><div class="card-title">${t}</div><div style="height:${h || 250}px;"><canvas id="${id}"></canvas></div></div>`;
  const cardsOpts = (extra) => Object.assign({ responsive: true, maintainAspectRatio: false }, extra);

  /* ============================================================
     CUSTOMER — Vehicle Damage Insights (kasus body repair yang sedang berjalan)
     ============================================================ */
  const sevBand = (s) => { const t = lc(s); return /sev|high|crit|berat/.test(t) ? "High" : /mod|med|sedang/.test(t) ? "Medium" : "Low"; };
  const SEV_COLOR = { High: "#E4572E", Medium: "#F2A541", Low: "#13A8C4" };
  const caseInfo = (s) => {
    const ro = V.roOf(s.service_request_id), d = V.detOf(s);
    return { s, ro, area: s.initial_damage_area, type: ro ? ro.damage_type : s.initial_damage_type, sev: sevBand(ro ? ro.severity : s.initial_severity), sevRaw: ro ? ro.severity : s.initial_severity,
      pct: ro ? +ro.damage_percentage || 0 : s.verified ? +s.verified.pct || 0 : +d.pct || 0, action: ro ? ro.repair_action : s.verified ? s.verified.action : d.action };
  };
  function myCases() {
    const mine = V.mySR(), act = mine.filter(V.active);
    if (act.length) return { list: act.map(caseInfo), label: "Kasus body repair yang sedang berjalan" };
    const last = mine.filter((s) => s.request_status !== "Cancelled").sort((a, b) => (a.request_date < b.request_date ? 1 : -1))[0];
    return { list: last ? [caseInfo(last)] : [], label: last ? "Tidak ada kasus aktif — menampilkan kasus terakhir" : "" };
  }
  function insightStats(cs) {
    const byArea = {};
    cs.forEach((c) => { (byArea[c.area] = byArea[c.area] || []).push(c.pct); });
    const areas = Object.entries(byArea).map(([a, v]) => ({ area: a, pct: v.reduce((x, y) => x + y, 0) / v.length, n: v.length })).sort((a, b) => b.pct - a.pct || b.n - a.n);
    const cnt = (f) => cs.filter(f).length;
    return { total: areas.length, areas, high: cnt((c) => c.sev === "High"), med: cnt((c) => c.sev === "Medium"), low: cnt((c) => c.sev === "Low"),
      avg: cs.length ? cs.reduce((a, c) => a + c.pct, 0) / cs.length : 0, top: areas[0], rep: cnt((c) => c.action === "Repair"), rpl: cnt((c) => c.action === "Replace"), rpt: cnt((c) => c.action === "Repaint") };
  }
  const mini = (l, v, color, sub) => `<div class="ins-mini" style="border-top-color:${color};"><div class="ins-v">${v}</div><div class="ins-l">${l}</div>${sub ? `<div class="ins-s">${sub}</div>` : ""}</div>`;

  /* Customer Bill: rincian biaya dari Repair Order yang diverifikasi workshop */
  const billRows = (c) => [["Parts", c.parts], ["Labor", c.labor], ["Painting", c.paint], ["Additional Cost", c.add]];
  V.billHTML = function (s, ro) {
    if (!ro || !V.split) return "";
    const { c, total } = V.split(ro, s);
    return `<div class="card"><div class="card-title">Customer Bill</div><div class="card-desc">Tagihan final setelah verifikasi workshop · Repair Order ${esc(ro.repair_order_id)}</div>
      <div class="table-wrap" style="margin-top:10px;"><table><tbody>${billRows(c).map(([l, v]) => `<tr><td>${l}</td><td style="text-align:right;font-family:var(--font-mono);">${fmtIDR(v)}</td></tr>`).join("")}<tr><td><b>Total Amount</b></td><td style="text-align:right;font-family:var(--font-mono);font-size:15px;"><b>${fmtIDR(total)}</b></td></tr></tbody></table></div></div>`;
  };
  function billCard(cs) {
    const rows = cs.map((c) => { if (!c.ro) return { c, b: null }; const x = V.split(c.ro, c.s); return { c, b: x.c, total: x.total }; });
    const sumT = rows.reduce((a, r) => a + (r.b ? r.total : 0), 0), money = (v) => `<td style="text-align:right;font-family:var(--font-mono);">${fmtIDR(v)}</td>`;
    return `<div class="card"><div class="card-title">Customer Bill</div><div class="card-desc">Tagihan muncul setelah workshop memverifikasi assessment</div>
      <div class="table-wrap" style="margin-top:10px;"><table><thead><tr><th>Assessment</th><th>Vehicle</th><th style="text-align:right;">Parts</th><th style="text-align:right;">Labor</th><th style="text-align:right;">Painting</th><th style="text-align:right;">Additional Cost</th><th style="text-align:right;">Total Amount</th></tr></thead><tbody>
      ${rows.length ? rows.map((r) => `<tr><td style="font-family:var(--font-mono);">${esc(r.c.s.service_request_id)}</td><td>${esc(r.c.s.brand)} ${esc(r.c.s.model)} · ${esc(r.c.s.plate_number)}</td>${r.b ? money(r.b.parts) + money(r.b.labor) + money(r.b.paint) + money(r.b.add) + `<td style="text-align:right;font-family:var(--font-mono);"><b>${fmtIDR(r.total)}</b></td>` : `<td colspan="5" style="text-align:right;"><span class="sv-chip">Menunggu verifikasi workshop</span></td>`}</tr>`).join("") : `<tr><td colspan="7"><div class="empty-state">${ICONS.check}<div>Belum ada tagihan.</div></div></td></tr>`}
      ${sumT ? `<tr><td colspan="6" style="text-align:right;"><b>Total tagihan terverifikasi</b></td><td style="text-align:right;font-family:var(--font-mono);font-size:15px;"><b>${fmtIDR(sumT)}</b></td></tr>` : ""}</tbody></table></div></div>`;
  }

  VIEWS["c-dashboard"] = function () {
    const { list, label } = myCases(), st = insightStats(list), vehicles = D.vehicles.filter((v) => v.customer_id === me()).length, act = V.mySR().filter(V.active).length;
    const insights = list.length ? `<div class="card ins-card"><div class="card-title" style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;"><span>Vehicle Damage Insights</span><span class="sv-chip">${esc(label)}</span></div>
      <div class="card-desc">Ringkasan kerusakan body pada kasus perbaikan Anda saat ini</div>
      <div class="ins-grid">${mini("Total Damage Areas", st.total, "#0B2545")}${mini("Damage Percentage", Math.round(st.avg) + "%", "#13A8C4", "rata-rata semua area")}${mini("Most Affected Area", esc(st.top.area), "#E4572E", Math.round(st.top.pct) + "% kerusakan")}
        ${mini("High Severity", st.high, SEV_COLOR.High)}${mini("Medium Severity", st.med, SEV_COLOR.Medium)}${mini("Low Severity", st.low, SEV_COLOR.Low)}
        ${mini("Repair", st.rep, "#0B2545")}${mini("Replace", st.rpl, "#13A8C4")}${mini("Repaint", st.rpt, "#F2A541")}</div></div>
      ${V.grid(340, cbox("cdArea", "Damage by Area (damage %)") + cbox("cdSev", "Damage Severity"))}` : `<div class="card ins-card"><div class="card-title">Vehicle Damage Insights</div><div class="empty-state">${ICONS.search}<div>Belum ada kasus perbaikan. Buat assessment baru untuk melihat insight kerusakan.</div></div><button class="btn btn-primary btn-sm" data-nav="c-request">${ICONS.plus} New Assessment</button></div>`;
    return V.grid(220, sc("Active Assessment", act, "clock", "Sedang diproses workshop") + sc("Vehicle", vehicles, "car", "Terdaftar di akun Anda")) + insights + (list.length ? billCard(list) : "") +
      V.lv("cd", { title: "Active Assessments", desc: "Assessment yang masih berjalan — dari kiriman sampai repair selesai", fk: "status", fl: "statuses", sk: "date", sd: "desc",
        head: `<button class="btn btn-primary btn-sm" data-nav="c-request">${ICONS.plus} New Assessment</button>`,
        cols: [{ k: "id", l: "Assessment", m: 1 }, { k: "vehicle", l: "Vehicle" }, { k: "damage", l: "Damage", f: (r) => `${esc(r.area)}<div style="font-size:11px;color:var(--ink-500);">${esc(r.dmg)}</div>` }, { k: "sev", l: "Severity", f: (r) => V.bsev(r.sev) },
          { k: "bill", l: "Customer Bill", m: 1, f: (r) => (r.bill == null ? `<span class="sv-chip">Menunggu verifikasi</span>` : fmtIDR(r.bill)) }, { k: "queue", l: "Queue" }, { k: "status", l: "Status", f: (r) => V.bs(r.status) }],
        rows: () => V.mySR().filter(V.active).map((s) => { const ro = V.roOf(s.service_request_id), q = ro && V.qOf(ro.repair_order_id); return { id: s.service_request_id, date: s.request_date, vehicle: `${s.brand} ${s.model} · ${s.plate_number}`, area: s.initial_damage_area, dmg: ro ? ro.damage_type : s.initial_damage_type, sev: ro ? ro.severity : s.initial_severity, bill: ro ? ro.estimated_repair_cost : null, queue: q ? "#" + q.queue_number : "–", status: s.request_status }; }),
        act: (r) => V.btn("viewas", r.id, "View", "btn-ghost") });
  };
  window.after_c_dashboard = function () {
    if (typeof Chart === "undefined" || !$("cdArea")) return;
    const { list } = myCases(), st = insightStats(list);
    new Chart($("cdArea"), { type: "bar", data: { labels: st.areas.map((a) => a.area), datasets: [{ label: "Damage %", data: st.areas.map((a) => Math.round(a.pct * 10) / 10), backgroundColor: PAL[1], borderRadius: 6 }] },
      options: cardsOpts({ plugins: { legend: { display: false }, saveraBarPct: { mode: "value", suffix: "%" }, tooltip: { callbacks: { label: (c) => ` ${c.parsed.y}% kerusakan` } } }, scales: { y: { beginAtZero: true, suggestedMax: 100, ticks: { callback: (v) => v + "%" } } } }) });
    const sv = [["High", st.high], ["Medium", st.med], ["Low", st.low]].filter((x) => x[1] > 0);
    new Chart($("cdSev"), { type: "doughnut", data: { labels: sv.map((x) => x[0]), datasets: [{ data: sv.map((x) => x[1]), backgroundColor: sv.map((x) => SEV_COLOR[x[0]]) }] }, options: cardsOpts({ plugins: { legend: { position: "bottom" } } }) });
  };

  /* ============================================================
     PAINT — Paint Combination / Material Recommendation
     ============================================================ */
  const PM = () => D.paint_materials || [];
  const eq = (a, b) => lc(a) === lc(b);
  const COLOR_CSS = { white: "#f4f4f4", black: "#111", silver: "#c0c4c9", grey: "#8a8f98", gray: "#8a8f98", red: "#c0262d", blue: "#2a5db0", green: "#2f7d4f", yellow: "#e8c431", orange: "#e8832a", brown: "#6b4a2f", gold: "#c9a24b", beige: "#d8c7a3" };
  const dot = (name) => { const k = Object.keys(COLOR_CSS).find((w) => lc(name).includes(w)); return k ? `<span class="pm-dot" style="background:${COLOR_CSS[k]};"></span>` : ""; };
  const roleOf = (m) => { const n = lc(m.material_name); return /clear|vernis|lacquer/.test(n) ? "Clear Coat" : /pearl|metallic|mica|flake/.test(n) ? "Pearl/Metallic" : /base/.test(n) ? "Base Color" : /paint|top ?coat|colou?r|solid/.test(n) ? "Main Paint" : "Supporting Material"; };
  function paintReco(brand, model, part, color) {
    let rows = PM().filter((m) => eq(m.brand, brand) && eq(m.model, model) && eq(m.vehicle_part, part)), scope = "exact";
    if (!rows.length) { rows = PM().filter((m) => eq(m.brand, brand) && eq(m.vehicle_part, part)); scope = "brand"; }
    if (!rows.length) { rows = PM().filter((m) => eq(m.vehicle_part, part)); scope = "part"; }
    if (!rows.length) return null;
    const colors = uniq(rows.map((m) => m.vehicle_color)), col = colors.includes(color) ? color : colors[0], sel = rows.filter((m) => m.vehicle_color === col || (!m.vehicle_color && !col));
    const by = (role) => uniq(sel.filter((m) => roleOf(m) === role).map((m) => m.material_name));
    const types = uniq(sel.map((m) => m.paint_type)), type = types.join(" / ") || "–", effectType = /pearl|metallic|mica/i.test(type) ? type : /solid/i.test(type) ? "None (solid color)" : "–";
    const mats = sel.map((m) => ({ role: roleOf(m), name: m.material_name, qty: m.quantity_required, unit: m.unit, cost: +m.total_cost || 0 }));
    const order = ["Base Color", "Main Paint", "Pearl/Metallic", "Clear Coat", "Supporting Material"];
    mats.sort((a, b) => order.indexOf(a.role) - order.indexOf(b.role));
    return { colors, color: col, code: uniq(sel.map((m) => m.paint_code)).join(" / ") || "–", type, base: by("Base Color"), main: by("Main Paint"), effectNames: by("Pearl/Metallic"), effectType, clear: by("Clear Coat"), mats, cost: mats.reduce((a, m) => a + m.cost, 0), scope };
  }
  const list = (a) => (a.length ? a.map(esc).join(", ") : "–");
  function recoHTML(r, brand, model, part, colorSel) {
    if (!r) return `<div class="banner banner-warn"><div>Belum ada data paint_materials untuk <b>${esc(brand)} ${esc(model)} · ${esc(part)}</b>.</div></div>`;
    const f = (l, v) => `<div class="pm-f"><div class="pm-l">${l}</div><div class="pm-v">${v}</div></div>`;
    const combo = [["Base Color", r.base.length ? r.base : [r.color]], ["Main Paint", r.main], ["Pearl/Metallic", r.effectNames.length ? r.effectNames : r.effectType !== "–" ? [r.effectType] : []], ["Clear Coat", r.clear]].filter((x) => x[1].length);
    return `<div class="pm-box"><div class="pm-head"><b>Paint Combination / Material Recommendation</b><span class="sv-chip">Rekomendasi kombinasi material, bukan formula cat eksak</span></div>
      ${r.scope !== "exact" ? `<div class="banner banner-info" style="margin:8px 0;"><div>Data untuk model ini belum ada — memakai referensi ${r.scope === "brand" ? "brand dan bagian" : "bagian"} yang sama.</div></div>` : ""}
      <div class="pm-grid">${f("Vehicle Color", colorSel || `${dot(r.color)}${esc(r.color || "–")}`)}${f("Paint Code", `<span style="font-family:var(--font-mono);">${esc(r.code)}</span>`)}${f("Paint Type", esc(r.type))}${f("Base Color", `${dot(r.color)}${esc(r.color || "–")}${r.base.length ? `<div class="pm-s">${list(r.base)}</div>` : ""}`)}
        ${f("Main Paint", list(r.main))}${f("Pearl / Metallic Effect", esc(r.effectType) + (r.effectNames.length ? `<div class="pm-s">${list(r.effectNames)}</div>` : ""))}${f("Clear Coat", list(r.clear))}${f("Total Material Cost", `<b>${fmtIDR(r.cost)}</b>`)}</div>
      <div class="pm-combo"><span class="pm-l">Color Combination</span>${combo.map(([l, v], i) => `<span class="pm-step"><b>${l}</b><span>${list(v)}</span></span>${i < combo.length - 1 ? '<span class="sv-arrow">+</span>' : ""}`).join("")}</div>
      <div class="table-wrap"><table><thead><tr><th>Required Materials</th><th>Role</th><th style="text-align:right;">Quantity</th><th style="text-align:right;">Cost</th></tr></thead><tbody>${r.mats.map((m) => `<tr><td>${esc(m.name)}</td><td>${esc(m.role)}</td><td style="text-align:right;font-family:var(--font-mono);">${esc(m.qty)} ${esc(m.unit)}</td><td style="text-align:right;font-family:var(--font-mono);">${fmtIDR(m.cost)}</td></tr>`).join("")}<tr><td colspan="3"><b>Total</b></td><td style="text-align:right;font-family:var(--font-mono);"><b>${fmtIDR(r.cost)}</b></td></tr></tbody></table></div></div>`;
  }
  /* Panel di halaman Assessment (muncul saat action = Repaint) */
  V.paintPanel = function (s, av) {
    const r = paintReco(s.brand, s.model, s.initial_damage_area, av.color);
    const sel = r ? `<select class="select" id="avColor" style="max-width:220px;">${r.colors.map((c) => `<option ${c === r.color ? "selected" : ""}>${esc(c)}</option>`).join("")}</select>` : "";
    return `<div style="margin:12px 0;">${recoHTML(r, s.brand, s.model, s.initial_damage_area, sel)}</div>`;
  };
  V.paintSummary = function (s, av) { const r = paintReco(s.brand, s.model, s.initial_damage_area, av.color); return r ? { color: r.color, code: r.code, type: r.type, materials_cost: r.cost } : null; };

  /* Halaman Paint & Material: rekomendasi di atas + tabel master asli di bawah */
  const origPaint = VIEWS["w-paint"];
  const actionOf = (s) => { const ro = V.roOf(s.service_request_id); return ro ? ro.repair_action : s.verified ? s.verified.action : V.detOf(s).action; };
  VIEWS["w-paint"] = function () {
    const pt = state.pt || (state.pt = {}), repaints = W.sr.filter((s) => s.request_status !== "Cancelled" && actionOf(s) === "Repaint");
    const brands = uniq(PM().map((m) => m.brand)).sort(); if (!pt.brand) pt.brand = (brands[0] || "");
    const models = uniq(PM().filter((m) => eq(m.brand, pt.brand)).map((m) => m.model)).sort(); if (!models.includes(pt.model)) pt.model = pt.model && !pt.src ? models[0] : pt.model || models[0] || "";
    const parts = uniq(PM().filter((m) => eq(m.brand, pt.brand) && eq(m.model, pt.model)).map((m) => m.vehicle_part)).sort(); if (!pt.part) pt.part = parts[0] || "";
    const r = paintReco(pt.brand, pt.model, pt.part, pt.color), opt = (a, cur) => uniq([...a, cur]).map((x) => `<option ${x === cur ? "selected" : ""}>${esc(x)}</option>`).join("");
    const colorSel = r ? `<select class="select" id="ptColor" style="max-width:220px;">${r.colors.map((c) => `<option ${c === r.color ? "selected" : ""}>${esc(c)}</option>`).join("")}</select>` : "";
    return `<div class="card"><div class="card-title">Repaint — Paint Combination / Material Recommendation</div><div class="card-desc">Pilih kasus Repaint dari Assessment, atau pilih kendaraan dan bagian secara manual</div>
      <div class="field" style="margin-top:12px;"><label>Dari kasus Repaint (${repaints.length})</label><select class="select" id="ptSrc"><option value="">— pilih kasus —</option>${repaints.map((s) => `<option value="${esc(s.service_request_id)}" ${pt.src === s.service_request_id ? "selected" : ""}>${esc(s.service_request_id)} · ${esc(s.brand)} ${esc(s.model)} · ${esc(s.initial_damage_area)}</option>`).join("")}</select></div>
      <div class="row-3"><div class="field"><label>Brand</label><select class="select" id="ptB">${opt(brands, pt.brand)}</select></div><div class="field"><label>Model</label><select class="select" id="ptM">${opt(models, pt.model)}</select></div><div class="field"><label>Vehicle part</label><select class="select" id="ptP">${opt(parts, pt.part)}</select></div></div>
      ${recoHTML(r, pt.brand, pt.model, pt.part, colorSel)}</div>
      <div class="card-title" style="margin:6px 4px 10px;">Paint &amp; Material Master</div>${origPaint()}`;
  };
  window.after_w_paint = function () {
    const pt = state.pt, set = (id, f) => $(id) && ($(id).onchange = () => { f($(id).value); renderContent(); });
    set("ptSrc", (v) => { const s = W.sr.find((x) => x.service_request_id === v); pt.src = v; if (s) { pt.brand = s.brand; pt.model = s.model; pt.part = s.initial_damage_area; pt.color = ""; } });
    set("ptB", (v) => { pt.brand = v; pt.model = ""; pt.part = ""; pt.color = ""; pt.src = ""; });
    set("ptM", (v) => { pt.model = v; pt.part = ""; pt.color = ""; pt.src = ""; });
    set("ptP", (v) => { pt.part = v; pt.color = ""; pt.src = ""; });
    set("ptColor", (v) => { pt.color = v; });
  };

  /* ============================================================
     WORKSHOP ANALYTICS — revenue, trend, forecast (ditambahkan di atas analytics yang sudah ada)
     ============================================================ */
  const mLabel = (k) => new Date(k + "-01T00:00:00").toLocaleDateString("id-ID", { month: "short", year: "numeric" });
  const nextKey = (k) => { let [y, m] = k.split("-").map(Number); m++; if (m > 12) { m = 1; y++; } return `${y}-${String(m).padStart(2, "0")}`; };
  function revenueModel() {
    const inv = V.invoices ? V.invoices() : [], byM = {}, byType = {};
    inv.forEach((i) => { const k = String(i.date).slice(0, 7); if (!/^\d{4}-\d{2}$/.test(k)) return; byM[k] = (byM[k] || 0) + i.total; byType[i.action] = (byType[i.action] || 0) + i.total; });
    const keys = Object.keys(byM).sort(), months = [];
    if (keys.length) for (let k = keys[0]; k <= keys[keys.length - 1]; k = nextKey(k)) months.push({ k, v: byM[k] || 0 });
    const used = months.slice(-6), n = used.length, total = inv.reduce((a, i) => a + i.total, 0);
    let fc = null, growth = null, method = "";
    if (n >= 2) {
      const xs = used.map((_, i) => i), my = used.reduce((a, m) => a + m.v, 0) / n, mx = (n - 1) / 2, den = xs.reduce((a, x) => a + (x - mx) ** 2, 0), slope = xs.reduce((a, x, i) => a + (x - mx) * (used[i].v - my), 0) / den;
      fc = Math.max(0, Math.round(my + slope * (n - mx))); method = `Tren linear (least squares) dari ${n} bulan terakhir`;
    } else if (n === 1) { fc = used[0].v; method = "Baru ada 1 bulan data — forecast = pendapatan bulan terakhir"; }
    const last = n ? used[n - 1] : null;
    if (fc != null && last && last.v > 0) growth = ((fc - last.v) / last.v) * 100;
    return { inv, months, used, total, byType, fc, growth, method, last, next: last ? nextKey(last.k) : null };
  }
  const origAnalytics = VIEWS["w-analytics"];
  VIEWS["w-analytics"] = function () {
    const m = revenueModel(), ro = W.ro, done = ro.filter((r) => V.isDone && V.isDone(r)).length;
    const g = m.growth, gTxt = g == null ? "–" : (g >= 0 ? "+" : "") + g.toFixed(1) + "%";
    const forecast = `<div class="card fc-card"><div class="card-title" style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;"><span>Next Month Revenue Forecast</span>${m.next ? `<span class="sv-chip">${esc(mLabel(m.next))}</span>` : ""}</div>
      ${m.fc == null ? `<div class="empty-state">${ICONS.search}<div>Belum ada invoice (repair selesai) untuk menghitung forecast.</div></div>` : `<div class="fc-row"><div><div class="fc-big">${fmtIDR(m.fc)}</div><div class="fc-sub">Perkiraan pendapatan ${esc(mLabel(m.next))}</div></div>
        <div><span class="badge badge-${g == null || g >= 0 ? "ok" : "rejected"}" style="font-size:14px;padding:6px 12px;">${g == null ? "–" : g >= 0 ? "▲" : "▼"} ${gTxt}</span><div class="fc-sub">Forecast Growth vs ${esc(mLabel(m.last.k))} (${fmtIDR(m.last.v)})</div></div></div>
        <div class="table-wrap"><table><thead><tr><th>Bulan</th><th style="text-align:right;">Pendapatan aktual</th></tr></thead><tbody>${m.used.map((x) => `<tr><td>${esc(mLabel(x.k))}</td><td style="text-align:right;font-family:var(--font-mono);">${fmtIDR(x.v)}</td></tr>`).join("")}<tr><td><b>${esc(mLabel(m.next))} (forecast)</b></td><td style="text-align:right;font-family:var(--font-mono);"><b>${fmtIDR(m.fc)}</b></td></tr></tbody></table></div>
        <div style="font-size:11.5px;color:var(--ink-500);margin-top:8px;">${esc(m.method)}. Dihitung dari total invoice per bulan (Repair Order Completed), bukan angka acak. Semakin banyak bulan data, semakin stabil perkiraannya.</div>`}</div>`;
    return V.grid(200, sc("Total Revenue", fmtIDR(m.total), "report", `${m.inv.length} invoice`) + sc("Repair Orders", ro.length, "wrench", `${done} selesai`) + sc("Next Month Forecast", m.fc == null ? "–" : fmtIDR(m.fc), "chart", m.next ? mLabel(m.next) : "") + sc("Forecast Growth", gTxt, "spark", "vs bulan terakhir")) +
      forecast + V.grid(360, cbox("anTrend", "Monthly Revenue Trend") + cbox("anType", "Revenue by Repair Type")) +
      `<div class="card-title" style="margin:6px 4px 12px;">Operational Analytics</div>` + origAnalytics();
  };
  window.after_w_analytics = function () {
    if (typeof Chart === "undefined" || !$("anTrend")) return;
    const m = revenueModel(); if (!m.months.length) return;
    const labels = m.months.map((x) => mLabel(x.k)), actual = m.months.map((x) => x.v);
    const tick = { callback: (v) => rp(v) }, tip = (c) => ` ${c.dataset.label}: ${fmtIDR(c.parsed.y)}`;
    const ds = [{ label: "Revenue", data: actual.concat(m.fc != null ? [null] : []), borderColor: PAL[1], backgroundColor: PAL[1], tension: 0.3, pointRadius: 4 }];
    if (m.fc != null) { labels.push(mLabel(m.next) + " (forecast)"); ds.push({ label: "Forecast", data: actual.map((_, i) => (i === actual.length - 1 ? actual[i] : null)).concat([m.fc]), borderColor: PAL[4], backgroundColor: PAL[4], borderDash: [6, 5], tension: 0, pointRadius: 5 }); }
    new Chart($("anTrend"), { type: "line", data: { labels, datasets: ds }, options: cardsOpts({ layout: { padding: { top: 22, right: 16 } }, plugins: { legend: { position: "bottom" }, saveraTrend: {}, tooltip: { callbacks: { label: tip } } }, scales: { y: { beginAtZero: true, ticks: tick } } }) });
    const tk = Object.keys(m.byType);
    new Chart($("anType"), { type: "doughnut", data: { labels: tk, datasets: [{ data: tk.map((k) => m.byType[k]), backgroundColor: PAL }] }, options: cardsOpts({ plugins: { legend: { position: "bottom" } } }) });
  };

  /* ---------------- judul halaman ---------------- */
  Object.assign(PAGE_META, { "c-dashboard": ["Dashboard", "Vehicle damage insights dan tagihan Anda"], "w-analytics": ["Analytics", "Revenue, forecast, dan insight operasional"], "w-paint": ["Paint & Material", "Rekomendasi kombinasi cat dan material repaint"] });
})();
