/* SAVERA — Tahap 8: Analytics (Ringkasan) + sub-page Revenue Forecast & Customer Segmentation.
   Angka historis & hasil model dari savera-api.js (dataset v5 + hasil model Python, tanpa hitung ulang model di JS).
   "Menunggu ACC workshop" & "Status pekerjaan" = data operasional live (state aplikasi), karena dataset v5 hanya berisi
   pekerjaan yang sudah selesai/dibatalkan. Muat PALING AKHIR (setelah savera-demand-forecast.js). */
(function () {
  const V = window.SAVERA_V2, U = window.SAVERA_AN_UI, AC = window.SAVERA_ANALYTICS, I = window.SAVERA_I18N, A = window.SAVERA_ASSESSMENT;
  if (!V || !U || !AC) return;
  const { VIEWS, W } = V, { t, esc, fmtNum, fmtPct, fmtRp, fmtRpShort, jt, monthLabel, dayLabel, keyLabel } = U;

  I && I.add({
    en: {
      "sm.kpi.rev": "Revenue this month", "sm.kpi.rev_sub": "up to {d} · {n} invoices · {p} of the {m} forecast ({f})", "sm.kpi.rev_sub2": "up to {d} · {n} invoices",
      "sm.kpi.wait": "Awaiting workshop approval", "sm.kpi.wait_sub": "Submitted {a} · under assessment {b}",
      "sm.kpi.rop": "Parts at/below reorder point", "sm.kpi.rop_sub": "of {n} parts · {o} out of stock",
      "sm.trend": "Revenue trend", "sm.trend_tip": "Actual invoice revenue with a moving average; the dashed line is the Python model forecast with its 80% range.", "sm.open_rev": "Open Revenue Forecast",
      "sm.dpp": "Demand per part", "sm.dpp_tip": "Last 12 months of actual demand plus the model's 3-month forecast.", "sm.open_dem": "Open Demand Forecast",
      "sm.status": "Work status", "sm.status_tip": "Service requests by stage, in the same order as the stepper. Live operational data.", "sm.cancelled": "Rejected / cancelled",
      "sm.action": "Revenue & estimated cost by repair type", "sm.action_tip": "Revenue = invoice total (incl. VAT) per repair action; estimated cost = repair order estimate. Dataset v5, excluding cancelled orders.",
      "sm.rev_inv": "Revenue (invoice)", "sm.est": "Estimated cost (repair order)",
      "sm.sev": "Damage severity", "sm.dmg": "Damage type", "sm.n_orders": "{n} repair orders",
      "sm.inv": "Inventory vs reorder point", "sm.inv_tip": "The {n} riskiest parts (lowest stock compared with reorder point). Red bars = stock at/below reorder point.", "sm.stock_ok": "Stock", "sm.stock_low": "Stock ≤ reorder point", "sm.rop": "Reorder point",
      "sev.Minor": "Minor", "sev.Moderate": "Moderate", "sev.Severe": "Severe",
      "rv.next": "Forecast {k}", "rv.next_sub": "80% range {lo} – {hi}", "rv.total": "Total forecast {a} – {b}", "rv.total_sub": "{n} {u} ahead", "rv.growth": "vs last actual {u}", "rv.growth_sub": "{k}: {v}",
      "rv.chart": "Actual & forecast revenue", "rv.table": "Forecast per {u}", "rv.period": "Period", "rv.fc": "Forecast", "rv.range": "80% range",
      "rv.exp": "Actual + forecast — {g} (CSV)", "rv.unit_note": "Values in Rupiah; the model works in Rp million.",
      "sg.count": "{n} customers · {p}", "sg.R": "Last visit", "sg.F": "Invoices", "sg.M": "Spend", "sg.median": "Median values per customer: days since the last invoice, number of invoices, total spend.", "sg.days": "{n} days ago",
      "sg.kind.model": "K-Means model", "sg.kind.rule": "Rule-based", "sg.list": "Customers",
      "sg.all": "All segments", "sg.search": "Search ID, name or city", "sg.c.id": "ID", "sg.c.name": "Name", "sg.c.city": "City", "sg.c.type": "Type", "sg.c.seg": "Segment", "sg.c.R": "Last visit (days)", "sg.c.F": "Invoices", "sg.c.M": "Total spend",
      "sg.exp": "Customer list — current filter (CSV)", "sg.exp_prof": "Segment profiles (CSV)", "sg.none": "No customers match this filter.",
      "sg.tip": "Individual customers are grouped by RFM (recency, frequency, monetary) with K-Means by the modeling team; Fleet, Insurance and customers without invoices get rule-based segments.",
    },
    id: {
      "sm.kpi.rev": "Pendapatan bulan ini", "sm.kpi.rev_sub": "s.d. {d} · {n} invoice · {p} dari forecast {m} ({f})", "sm.kpi.rev_sub2": "s.d. {d} · {n} invoice",
      "sm.kpi.wait": "Menunggu ACC workshop", "sm.kpi.wait_sub": "Diajukan {a} · sedang dinilai {b}",
      "sm.kpi.rop": "Part di/bawah reorder point", "sm.kpi.rop_sub": "dari {n} part · {o} habis",
      "sm.trend": "Tren pendapatan", "sm.trend_tip": "Pendapatan aktual dari invoice dengan rata-rata bergerak; garis putus-putus = forecast model Python beserta rentang 80%.", "sm.open_rev": "Buka Revenue Forecast",
      "sm.dpp": "Demand per part", "sm.dpp_tip": "Demand aktual 12 bulan terakhir ditambah forecast model 3 bulan.", "sm.open_dem": "Buka Demand Forecast",
      "sm.status": "Status pekerjaan", "sm.status_tip": "Service request per tahap, urutan sama dengan stepper. Data operasional live.", "sm.cancelled": "Ditolak / dibatalkan",
      "sm.action": "Pendapatan & estimasi biaya per jenis perbaikan", "sm.action_tip": "Pendapatan = total invoice (incl. PPN) per repair action; estimasi biaya = estimasi repair order. Dataset v5, tanpa order yang dibatalkan.",
      "sm.rev_inv": "Pendapatan (invoice)", "sm.est": "Estimasi biaya (repair order)",
      "sm.sev": "Tingkat kerusakan", "sm.dmg": "Jenis kerusakan", "sm.n_orders": "{n} repair order",
      "sm.inv": "Inventory vs reorder point", "sm.inv_tip": "{n} part paling berisiko (stok terkecil dibanding reorder point). Batang merah = stok di/bawah reorder point.", "sm.stock_ok": "Stok", "sm.stock_low": "Stok ≤ reorder point", "sm.rop": "Reorder point",
      "sev.Minor": "Ringan", "sev.Moderate": "Sedang", "sev.Severe": "Berat",
      "rv.next": "Forecast {k}", "rv.next_sub": "Rentang 80% {lo} – {hi}", "rv.total": "Total forecast {a} – {b}", "rv.total_sub": "{n} {u} ke depan", "rv.growth": "vs {u} aktual terakhir", "rv.growth_sub": "{k}: {v}",
      "rv.chart": "Pendapatan aktual & forecast", "rv.table": "Forecast per {u}", "rv.period": "Periode", "rv.fc": "Forecast", "rv.range": "Rentang 80%",
      "rv.exp": "Aktual + forecast — {g} (CSV)", "rv.unit_note": "Nilai dalam Rupiah; model bekerja dalam Rp juta.",
      "sg.count": "{n} pelanggan · {p}", "sg.R": "Terakhir datang", "sg.F": "Invoice", "sg.M": "Belanja", "sg.median": "Nilai median per pelanggan: hari sejak invoice terakhir, jumlah invoice, total belanja.", "sg.days": "{n} hari lalu",
      "sg.kind.model": "Model K-Means", "sg.kind.rule": "Aturan", "sg.list": "Daftar pelanggan",
      "sg.all": "Semua segmen", "sg.search": "Cari ID, nama, atau kota", "sg.c.id": "ID", "sg.c.name": "Nama", "sg.c.city": "Kota", "sg.c.type": "Tipe", "sg.c.seg": "Segmen", "sg.c.R": "Terakhir datang (hari)", "sg.c.F": "Invoice", "sg.c.M": "Total belanja",
      "sg.exp": "Daftar pelanggan — filter saat ini (CSV)", "sg.exp_prof": "Profil segmen (CSV)", "sg.none": "Tidak ada pelanggan yang cocok dengan filter ini.",
      "sg.tip": "Pelanggan Individual dikelompokkan berdasarkan RFM (recency, frequency, monetary) dengan K-Means oleh tim model; Fleet, Asuransi, dan pelanggan tanpa invoice diberi segmen berbasis aturan.",
    },
  });

  const S = () => (state.an = state.an || { gran: "monthly", part: null });
  const gUnit = (g) => t(g === "weekly" ? "an.unit.week" : "an.unit.month"), gUnit1 = (g) => t(g === "weekly" ? "an.unit1.week" : "an.unit1.month");
  const kLabel = (k, g, long) => (g === "weekly" ? t("an.week_of", { d: dayLabel(k, long) }) : monthLabel(k, long));
  const rpJt = (v) => fmtRpShort(jt(v));
  const linkBtn = (nav, label, extra) => `<button type="button" class="btn btn-ghost an-link" data-nav="${esc(nav)}" ${extra || ""}>${esc(label)} →</button>`;
  const gSeg = (cur) => U.seg("gran", [["monthly", t("an.monthly")], ["weekly", t("an.weekly")]], cur);
  const cbox = (id, title, tipText, h, extra) => `<div class="card"><div class="an-card-head"><div class="card-title">${esc(title)}${tipText ? U.tip(tipText) : ""}</div>${extra || ""}</div><div class="an-chart" style="height:${h || 260}px;"><canvas id="${id}" role="img" aria-label="${esc(title)}"></canvas></div></div>`;

  /* ---------- status pekerjaan (live) ---------- */
  const STEPS = ["Submitted", "Under Assessment", "Approved", "In Repair", "Completed"];
  function statusCounts() {
    const c = Object.fromEntries(STEPS.map((s) => [s, 0])); let cancelled = 0;
    (W.sr || []).forEach((s) => { if (s.request_status === "Cancelled") cancelled++; else if (c[s.request_status] != null) c[s.request_status]++; });
    return { c, cancelled, waiting: (W.sr || []).filter((s) => (A && A.canDecide ? A.canDecide(s.request_status, "approve") : ["Submitted", "Under Assessment"].includes(s.request_status))).length };
  }

  /* ================= Ringkasan ================= */
  VIEWS["w-analytics"] = function () {
    const head = U.tabs("w-analytics"), r = U.need(["revenue", "demand", "ops"]);
    if (r.status === "loading") return U.page(head + U.loadingHTML(4));
    if (r.status === "error") return U.page(head + U.errorHTML(r.error, r.resource));
    const { revenue: rev, demand: dem, ops } = r.data, s = S(), st = statusCounts();
    const mtd = AC.monthToDate(rev), low = dem.parts.filter((p) => p.current_stock <= p.reorder_point), out = dem.parts.filter((p) => p.current_stock <= 0);
    if (!dem.parts.some((p) => p.part_id === s.part)) s.part = AC.sortByRisk(dem.parts)[0].part_id;
    const kpis = V.grid(220,
      U.kpi(t("sm.kpi.rev"), mtd ? fmtRpShort(mtd.value_rp) : "–", mtd ? esc(mtd.forecast_rp ? t("sm.kpi.rev_sub", { d: dayLabel(mtd.as_of, true), n: mtd.n, p: fmtPct(mtd.share, 0), m: monthLabel(mtd.period), f: fmtRpShort(mtd.forecast_rp) }) : t("sm.kpi.rev_sub2", { d: dayLabel(mtd.as_of, true), n: mtd.n })) : "", { icon: "report", nav: "w-an-revenue" }) +
      U.kpi(t("sm.kpi.wait"), fmtNum(st.waiting, 0), esc(t("sm.kpi.wait_sub", { a: st.c.Submitted, b: st.c["Under Assessment"] })) + ` <span class="sv-chip">${esc(t("an.ops_note"))}</span>`, { icon: "shield", nav: "w-assessment" }) +
      U.kpi(t("sm.kpi.rop"), fmtNum(low.length, 0), esc(t("sm.kpi.rop_sub", { n: dem.parts.length, o: out.length })), { icon: "box", nav: "w-an-demand" }));
    const trend = cbox("smTrend", t("sm.trend"), t("sm.trend_tip"), 280, `<div class="an-toggles">${gSeg(s.gran)}${linkBtn("w-an-revenue", t("sm.open_rev"))}</div>`);
    const groups = {}; dem.parts.forEach((x) => (groups[x.vehicle_part] = groups[x.vehicle_part] || []).push(x));
    const sel = `<select class="select an-select-sm" id="smPart" aria-label="${esc(t("df.part"))}">${Object.keys(groups).sort().map((g) => `<optgroup label="${esc(g)}">${groups[g].map((x) => `<option value="${esc(x.part_id)}" ${x.part_id === s.part ? "selected" : ""}>${esc(x.part_id + " · " + x.part_name + " · " + x.brand)}</option>`).join("")}</optgroup>`).join("")}</select>`;
    const dpp = cbox("smDemand", t("sm.dpp"), t("sm.dpp_tip"), 240, `<div class="an-toggles">${sel}${linkBtn("w-an-demand", t("sm.open_dem"), 'data-sm-open-demand="1"')}</div>`);
    const status = cbox("smStatus", t("sm.status"), t("sm.status_tip"), 240, `<span class="sv-chip">${esc(t("an.ops_note"))}</span>`);
    const nInv = Math.min(12, dem.parts.length);
    const legend = `<div class="an-legend"><span><i style="background:${U.COL.actual}"></i>${esc(t("sm.stock_ok"))}</span><span><i style="background:${U.COL.bad}"></i>${esc(t("sm.stock_low"))}</span><span><i style="background:${U.COL.used}"></i>${esc(t("sm.rop"))}</span></div>`;
    return U.page(head + kpis + trend + `<div class="an-two">${dpp}${status}</div>` +
      `<div class="an-three">${cbox("smAction", t("sm.action"), t("sm.action_tip"), 240)}${cbox("smSev", t("sm.sev"), null, 240)}${cbox("smDmg", t("sm.dmg"), null, 240)}</div>` +
      cbox("smInv", t("sm.inv"), t("sm.inv_tip", { n: nInv }), Math.max(240, nInv * 30), legend) + U.sourceNote(rev.meta, ops.range));
  };

  function revenueChart(id, rev, gran, opts) {
    const rv = AC.revenueView(rev, gran); if (!rv) return null;
    const tl = rv.tl, dense = gran === "weekly";
    const ma = { key: "ma", label: t("an.ma", { n: rv.maWindow || "", u: gUnit(gran) }), color: U.COL.ma, width: 1.5 };
    const bt = { key: "backtest", label: t("an.backtest"), color: U.COL.backtest, dash: [1, 3], hidden: !(opts && opts.backtest) };
    return U.mk(id, { type: "line", data: { labels: tl.keys.map((k) => keyLabel(k, gran)), datasets: U.seriesDatasets(tl, { dense, extra: [ma, bt] }) }, options: U.lineOpts((v) => rpJt(v)) });
  }

  window.after_w_analytics = function () {
    U.destroyCharts();
    U.wireCommon(null, { seg: (k, v) => { if (k === "gran") { S().gran = v; renderContent(); } } });
    const r = U.need(["revenue", "demand", "ops"]); if (r.status !== "ready") return;
    const { revenue: rev, demand: dem, ops } = r.data, s = S();
    const sel = document.getElementById("smPart"); if (sel) sel.onchange = () => { s.part = sel.value; renderContent(); };
    const od = document.querySelector("[data-sm-open-demand]"); if (od) od.addEventListener("click", () => { state.df = Object.assign(state.df || {}, { part: s.part }); }, true);
    revenueChart("smTrend", rev, s.gran);
    /* demand per part: 12 bulan terakhir + forecast */
    const v = AC.demandView(dem, s.part);
    if (v) {
      const cut = Math.max(0, v.tl.nActual - 12), sl = (a) => a.slice(cut), tl = { ...v.tl, keys: sl(v.tl.keys), actual: sl(v.tl.actual), forecast: sl(v.tl.forecast), lower: sl(v.tl.lower), upper: sl(v.tl.upper), nActual: v.tl.nActual - cut, extra: {} };
      U.mk("smDemand", { type: "line", data: { labels: tl.keys.map((k) => monthLabel(k)), datasets: U.seriesDatasets(tl) }, options: U.lineOpts((x) => fmtNum(x) + " " + t("an.unitShort")) });
    }
    /* status pekerjaan (urutan stepper) */
    const st = statusCounts(), labels = STEPS.map((k) => t("st." + k)).concat([t("sm.cancelled")]), vals = STEPS.map((k) => st.c[k]).concat([st.cancelled]);
    U.mk("smStatus", { type: "bar", data: { labels, datasets: [{ label: t("sm.status"), data: vals, backgroundColor: vals.map((_, i) => (i === vals.length - 1 ? U.COL.used : U.COL.actual)), borderRadius: 4, maxBarThickness: 26 }] },
      options: { indexAxis: "y", responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, saveraBarPct: { mode: "value", suffix: "" } }, scales: { x: { beginAtZero: true, ticks: { precision: 0 }, grid: { color: U.COL.grid } }, y: { grid: { display: false } } } } });
    /* pendapatan & estimasi biaya per jenis perbaikan (satu sumbu Rupiah) */
    const ac = ops.by_action.slice().sort((a, b) => b.revenue_rp - a.revenue_rp);
    U.mk("smAction", { type: "bar", data: { labels: ac.map((x) => x.repair_action), datasets: [
      { label: t("sm.rev_inv"), data: ac.map((x) => x.revenue_rp), backgroundColor: U.COL.actual, borderRadius: 4, maxBarThickness: 34 },
      { label: t("sm.est"), data: ac.map((x) => x.est_cost_rp), backgroundColor: U.COL.ma, borderRadius: 4, maxBarThickness: 34 }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: "bottom", labels: { usePointStyle: true, boxWidth: 8 } }, tooltip: { callbacks: { label: (c) => ` ${c.dataset.label}: ${fmtRpShort(c.parsed.y)}`, afterBody: (it) => [t("sm.n_orders", { n: fmtNum(ac[it[0].dataIndex].n_orders, 0) })] } } },
        scales: { y: { beginAtZero: true, ticks: { callback: (x) => fmtRpShort(x) }, grid: { color: U.COL.grid } }, x: { grid: { display: false } } } } });
    /* severity 3 tingkat (urut ringan → berat, satu hue makin gelap) */
    const SEV = ["Minor", "Moderate", "Severe"], sv = SEV.map((k) => ((ops.by_severity.find((x) => x.severity === k) || {}).n || 0));
    U.mk("smSev", { type: "bar", data: { labels: SEV.map((k) => t("sev." + k)), datasets: [{ label: t("sm.sev"), data: sv, backgroundColor: ["#9ADBE8", U.COL.actual, U.COL.ma], borderRadius: 4, maxBarThickness: 44 }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { precision: 0 }, grid: { color: U.COL.grid } }, x: { grid: { display: false } } } } });
    const dm = ops.by_damage;
    U.mk("smDmg", { type: "bar", data: { labels: dm.map((x) => x.damage_type), datasets: [{ label: t("sm.dmg"), data: dm.map((x) => x.n), backgroundColor: U.COL.actual, borderRadius: 4, maxBarThickness: 22 }] },
      options: { indexAxis: "y", responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { beginAtZero: true, ticks: { precision: 0 }, grid: { color: U.COL.grid } }, y: { grid: { display: false } } } } });
    /* inventory vs ROP: paling berisiko di atas, merah bila stok ≤ ROP */
    const inv = AC.sortByRisk(dem.parts).slice(0, 12);
    U.mk("smInv", { type: "bar", data: { labels: inv.map((p) => `${p.part_id} · ${p.part_name} (${p.brand})`), datasets: [
      { label: t("sm.stock_ok"), data: inv.map((p) => p.current_stock), backgroundColor: inv.map((p) => (p.current_stock <= p.reorder_point ? U.COL.bad : U.COL.actual)), borderRadius: 4, maxBarThickness: 14 },
      { label: t("sm.rop"), data: inv.map((p) => p.reorder_point), backgroundColor: U.COL.used, borderRadius: 4, maxBarThickness: 14 }] },
      options: { indexAxis: "y", responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => ` ${c.datasetIndex === 0 && inv[c.dataIndex].current_stock <= inv[c.dataIndex].reorder_point ? t("sm.stock_low") : c.dataset.label}: ${c.parsed.x}` } } },
        scales: { x: { beginAtZero: true, ticks: { precision: 0 }, grid: { color: U.COL.grid } }, y: { grid: { display: false }, ticks: { autoSkip: false, font: { size: 11 } } } } } });
  };

  /* ================= Revenue Forecast ================= */
  VIEWS["w-an-revenue"] = function () {
    const head = U.tabs("w-an-revenue"), r = U.need(["revenue"]);
    if (r.status === "loading") return U.page(head + U.loadingHTML(3));
    if (r.status === "error") return U.page(head + U.errorHTML(r.error, r.resource));
    const rev = r.data.revenue, s = S(), g = s.gran, rv = AC.revenueView(rev, g);
    if (!rv || !rv.forecast.length) return U.page(head + `<div class="card">${U.emptyHTML()}</div>`);
    const u = gUnit(g), first = rv.forecast[0], lastF = rv.forecast[rv.forecast.length - 1];
    const bar = `<div class="card an-bar">${gSeg(g)}<span class="an-muted">${esc(t("rv.unit_note"))}</span><span class="an-grow"></span>${U.exportMenu([["rev", t("rv.exp", { g: g === "weekly" ? t("an.weekly") : t("an.monthly") })]])}</div>`;
    const cards = V.grid(220,
      U.kpi(t("rv.next", { k: kLabel(first.key, g) }), rpJt(first.forecast), `${esc(t("rv.next_sub", { lo: rpJt(first.lower_80), hi: rpJt(first.upper_80) }))}<br>${U.missChip(rv.error)}`, { icon: "chart" }) +
      U.kpi(t("rv.total", { a: kLabel(first.key, g), b: kLabel(lastF.key, g) }), rpJt(rv.horizonTotal), esc(t("rv.total_sub", { n: rv.forecast.length, u })), { icon: "report" }) +
      U.kpi(t("rv.growth", { u: gUnit1(g) }), rv.growth == null ? "–" : `<span class="${rv.growth >= 0 ? "up" : "down"}">${rv.growth >= 0 ? "▲ +" : "▼ "}${fmtPct(rv.growth)}</span>`, rv.last ? esc(t("rv.growth_sub", { k: kLabel(rv.last.key, g), v: rpJt(rv.last.value) })) : "", { icon: "spark" }));
    const chart = cbox("rvChart", t("rv.chart"), t("sm.trend_tip"), 340, `<div class="an-toggles">${U.toggle("backtest", t("an.backtest"), s.rvBacktest, !rv.hasBacktest, t("an.backtest.none"))}</div>`);
    const table = `<div class="card"><div class="card-title">${esc(t("rv.table", { u: gUnit1(g) }))}</div><div class="table-wrap"><table><thead><tr><th>${esc(t("rv.period"))}</th><th class="num">${esc(t("rv.fc"))}</th><th class="num">${esc(t("rv.range"))}</th></tr></thead><tbody>
      ${rv.forecast.map((x) => `<tr><td>${esc(kLabel(x.key, g, true))}</td><td class="num"><b>${rpJt(x.forecast)}</b></td><td class="num">${rpJt(x.lower_80)} – ${rpJt(x.upper_80)}</td></tr>`).join("")}</tbody></table></div></div>`;
    return U.page(head + bar + cards + chart + table + U.sourceNote(rev.meta));
  };
  window.after_w_an_revenue = function () {
    U.destroyCharts();
    const r = U.need(["revenue"]), s = S();
    U.wireCommon(null, {
      seg: (k, v) => { if (k === "gran") { s.gran = v; renderContent(); } },
      toggle: (id, btn) => { s.rvBacktest = !s.rvBacktest; btn.classList.toggle("on", s.rvBacktest); btn.setAttribute("aria-checked", String(s.rvBacktest)); const c = Chart.getChart && Chart.getChart(document.getElementById("rvChart")); if (c) { c.data.datasets.forEach((d) => { if (d._key === "backtest") d.hidden = !s.rvBacktest; }); c.update(); } },
      exp: () => { if (r.status !== "ready") return; const rv = AC.revenueView(r.data.revenue, s.gran), tl = rv.tl; U.download(`savera_pendapatan_${s.gran}.csv`, AC.toCSV(tl.keys.map((k, i) => ({ periode: k, aktual_rp_juta: tl.actual[i] ?? "", rata_rata_bergerak: tl.extra.ma[i] ?? "", forecast_rp_juta: i >= tl.nActual ? tl.forecast[i] ?? "" : "", lower_80: tl.lower[i] ?? "", upper_80: tl.upper[i] ?? "" })))); },
    });
    if (r.status === "ready") revenueChart("rvChart", r.data.revenue, s.gran, { backtest: s.rvBacktest });
  };

  /* ================= Customer Segmentation ================= */
  const SEG_COL = ["#13A8C4", "#0B2545", "#F2A541", "#5B6B85", "#8DA9C4", "#A6B2C4", "#C9D3E0"];
  const segColor = (prof) => { const ids = prof.map((p) => p.segment_id); return (id) => SEG_COL[Math.max(0, ids.indexOf(id)) % SEG_COL.length]; };
  const SG = () => (state.sg = state.sg || { q: "", segment: "", page: 1, perPage: 10 });

  VIEWS["w-an-segment"] = function () {
    const head = U.tabs("w-an-segment"), r = U.need(["segments"]);
    if (r.status === "loading") return U.page(head + U.loadingHTML(3));
    if (r.status === "error") return U.page(head + U.errorHTML(r.error, r.resource));
    const seg = r.data.segments, prof = AC.segmentSummary(seg), col = segColor(prof), f = SG();
    if (!prof.length) return U.page(head + `<div class="card">${U.emptyHTML()}</div>`);
    const bar = `<div class="card an-bar"><div class="card-title" style="margin:0;">${esc(t("an.tab.segment"))}${U.tip(t("sg.tip"))}</div><span class="an-muted">${esc(t("sg.median"))}</span><span class="an-grow"></span>${U.exportMenu([["list", t("sg.exp")], ["prof", t("sg.exp_prof")]])}</div>`;
    const cards = `<div class="an-seg-grid">${prof.map((p) => `<button type="button" class="card an-segcard ${String(p.segment_id) === String(f.segment) ? "is-sel" : ""}" data-sg-pick="${p.segment_id}" aria-pressed="${String(p.segment_id) === String(f.segment)}">
      <div class="an-segcard-head"><i class="an-dot" style="background:${col(p.segment_id)}"></i><b>${esc(p.segment_name)}</b><span class="sv-chip">${esc(t(p.kind === "rule" ? "sg.kind.rule" : "sg.kind.model"))}</span></div>
      <div class="an-segcard-n">${fmtNum(p.count, 0)} <small>${esc(fmtPct(p.share_all))}</small></div><div class="an-meter"><span style="width:${Math.max(2, p.share_all * 100)}%;background:${col(p.segment_id)}"></span></div>
      <dl class="an-rfm"><div><dt>${esc(t("sg.R"))}</dt><dd>${p.R_median == null ? "–" : esc(t("sg.days", { n: fmtNum(p.R_median, 0) }))}</dd></div><div><dt>${esc(t("sg.F"))}</dt><dd>${p.F_median == null ? "–" : fmtNum(p.F_median)}</dd></div><div><dt>${esc(t("sg.M"))}</dt><dd>${p.M_median == null ? "–" : rpJt(p.M_median)}</dd></div></dl>
      <p class="an-muted an-clamp" title="${esc(p.description)}">${esc(p.description)}</p></button>`).join("")}</div>`;
    const list = AC.filterCustomers(seg, f).slice().sort((a, b) => (b.M ?? -1) - (a.M ?? -1)), pg = pageSlice(list, f), name = Object.fromEntries(prof.map((p) => [p.segment_id, p.segment_name]));
    const filters = `<div class="an-bar an-bar-plain"><select class="select an-select-sm" id="sgSeg" aria-label="${esc(t("sg.c.seg"))}"><option value="">${esc(t("sg.all"))}</option>${prof.map((p) => `<option value="${p.segment_id}" ${String(p.segment_id) === String(f.segment) ? "selected" : ""}>${esc(p.segment_name)} (${p.count})</option>`).join("")}</select>
      <input class="input an-search" id="sgQ" type="search" placeholder="${esc(t("sg.search"))}" aria-label="${esc(t("sg.search"))}" value="${esc(f.q)}"></div>`;
    const table = `<div class="card"><div class="card-title">${esc(t("sg.list"))}</div>${filters}${list.length ? `<div class="table-wrap"><table><thead><tr><th>${esc(t("sg.c.id"))}</th><th>${esc(t("sg.c.name"))}</th><th>${esc(t("sg.c.city"))}</th><th>${esc(t("sg.c.type"))}</th><th>${esc(t("sg.c.seg"))}</th><th class="num">${esc(t("sg.c.R"))}</th><th class="num">${esc(t("sg.c.F"))}</th><th class="num">${esc(t("sg.c.M"))}</th></tr></thead><tbody>
      ${pg.pageRows.map((c) => `<tr><td class="mono">${esc(c.customer_id)}</td><td>${esc(c.name || "–")}</td><td>${esc(c.city || "–")}</td><td>${esc(c.customer_type)}</td><td><span class="an-segtag"><i class="an-dot" style="background:${col(c.segment_id)}"></i>${esc(name[c.segment_id] || c.segment_id)}</span></td><td class="num">${c.R == null ? "–" : fmtNum(c.R, 0)}</td><td class="num">${c.F == null ? "–" : c.F}</td><td class="num">${c.M == null ? "–" : rpJt(c.M)}</td></tr>`).join("")}
      </tbody></table></div><div id="sgPager">${pagerHTML("sg", f, pg.total)}</div>` : U.emptyHTML(t("sg.none"))}</div>`;
    return U.page(head + bar + cards + table + U.sourceNote(seg.meta));
  };
  window.after_w_an_segment = function () {
    U.destroyCharts();
    const r = U.need(["segments"]), f = SG();
    U.wireCommon(null, { exp: (id) => {
      if (r.status !== "ready") return; const seg = r.data.segments, name = Object.fromEntries(seg.profiles.map((p) => [p.segment_id, p.segment_name]));
      if (id === "list") U.download("savera_segmen_pelanggan.csv", AC.toCSV(AC.filterCustomers(seg, f).map((c) => ({ ...c, segment_name: name[c.segment_id] || "" }))));
      if (id === "prof") U.download("savera_profil_segmen.csv", AC.toCSV(seg.profiles));
    } });
    document.querySelectorAll("[data-sg-pick]").forEach((b) => (b.onclick = () => { f.segment = String(f.segment) === b.dataset.sgPick ? "" : b.dataset.sgPick; f.page = 1; renderContent(); }));
    const ss = document.getElementById("sgSeg"); if (ss) ss.onchange = () => { f.segment = ss.value; f.page = 1; renderContent(); };
    const q = document.getElementById("sgQ");
    if (q) { let tm; q.oninput = () => { clearTimeout(tm); tm = setTimeout(() => { f.q = q.value; f.page = 1; renderContent(); const n = document.getElementById("sgQ"); if (n) { n.focus(); n.setSelectionRange(n.value.length, n.value.length); } }, 250); }; }
    wirePager(document.getElementById("sgPager"), f);
  };
})();
