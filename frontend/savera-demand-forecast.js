/* SAVERA — Tahap 7: sub-page Analytics › Demand Forecast (VIEWS["w-an-demand"]).
   Menampilkan hasil model Python (forecast demand bulanan per part_id + rentang 80%) dari savera-api.js;
   tidak ada model di JS. Aturan bisnis (rekomendasi order, stok cukup sampai) di savera-analytics-core.js.
   Muat SETELAH savera-analytics-ui.js. */
(function () {
  const V = window.SAVERA_V2, U = window.SAVERA_AN_UI, AC = window.SAVERA_ANALYTICS, I = window.SAVERA_I18N;
  if (!V || !U || !AC) return;
  const { VIEWS } = V, { t, esc, fmtNum, monthLabel, dayLabel } = U;

  I && I.add({
    en: {
      "df.part": "Part", "df.group": "{n} parts", "df.fc_title": "Forecast {m}", "df.fc_sub": "80% range {lo} – {hi} units",
      "df.fc_tip": "First month after the actual data. Per-part forecast = total model forecast × this part's share of historical demand (modeling team's method). The 80% range is the total range scaled the same way, so the real spread per part can be wider — see the average miss.",
      "df.stock": "Current stock", "df.stock_sub": "Reorder point {rop} · safety {ss} · as of {d}",
      "df.order": "Recommended order", "df.order_sub": "Forecast over {lt}-day lead time {f} + safety {ss} − stock {s} − open PO {po}",
      "df.order_tip": "Order = ⌈forecast during the supplier lead time + safety stock − current stock − open purchase orders⌉, minimum 0.",
      "df.cover": "Stock lasts until about {m}", "df.cover_beyond": "Stock lasts beyond {m}", "df.cover_now": "Stock is already insufficient", "df.cover_now_short": "Now",
      "df.cover_tip": "Current stock plus open POs (on their expected date), consumed at the forecast daily rate from the stock date.",
      "df.no_fc": "No forecast for this part from the model.", "df.chart": "Monthly demand — {p}",
      "df.chart_tip": "Blue = actual units required by repair orders (excluding cancelled). Orange dashed = model forecast; shaded = 80% range. 'Used' = stock out in inventory transactions.",
      "df.table": "Forecast per month", "df.month": "Month", "df.units": "Forecast (units)", "df.range": "80% range",
      "df.all": "Stock recommendation — all parts", "df.all_tip": "Sorted by risk: out of stock, then at/below reorder point, then lowest stock vs reorder point. Click a row to open that part.",
      "df.c.part": "Part", "df.c.stock": "Stock", "df.c.rop": "ROP", "df.c.po": "Open PO", "df.c.fc": "Forecast {m}", "df.c.order": "Order", "df.c.cover": "Lasts until", "df.c.status": "Status",
      "df.exp.part": "Actual & forecast — this part (CSV)", "df.exp.plan": "Stock recommendation — all parts (CSV)", "df.exp.hist": "Monthly demand history — all parts (CSV)",
      "df.open_po": "Open PO: {list}",
    },
    id: {
      "df.part": "Part", "df.group": "{n} part", "df.fc_title": "Forecast {m}", "df.fc_sub": "Rentang 80% {lo} – {hi} unit",
      "df.fc_tip": "Bulan pertama setelah data aktual. Forecast per part = forecast total model × porsi part ini dalam riwayat demand (cara tim model). Rentang 80% = rentang total yang diskalakan dengan cara yang sama, jadi sebaran nyata per part bisa lebih lebar — lihat rata-rata meleset.",
      "df.stock": "Stok saat ini", "df.stock_sub": "Reorder point {rop} · safety {ss} · per {d}",
      "df.order": "Rekomendasi order", "df.order_sub": "Forecast selama lead time {lt} hari {f} + safety {ss} − stok {s} − PO berjalan {po}",
      "df.order_tip": "Order = ⌈forecast selama lead time supplier + safety stock − stok saat ini − PO berjalan⌉, minimal 0.",
      "df.cover": "Stok cukup sampai kira-kira {m}", "df.cover_beyond": "Stok cukup lebih dari {m}", "df.cover_now": "Stok sudah tidak mencukupi", "df.cover_now_short": "Sekarang",
      "df.cover_tip": "Stok saat ini ditambah PO berjalan (pada tanggal perkiraan tiba), dikurangi forecast harian mulai tanggal stok.",
      "df.no_fc": "Model tidak punya forecast untuk part ini.", "df.chart": "Demand bulanan — {p}",
      "df.chart_tip": "Biru = unit yang dibutuhkan repair order (tanpa yang dibatalkan). Oranye putus-putus = forecast model; area = rentang 80%. 'Terpakai' = stok keluar di transaksi inventory.",
      "df.table": "Forecast per bulan", "df.month": "Bulan", "df.units": "Forecast (unit)", "df.range": "Rentang 80%",
      "df.all": "Rekomendasi stok — semua part", "df.all_tip": "Urut dari paling berisiko: habis, lalu di/bawah reorder point, lalu stok terkecil dibanding reorder point. Klik baris untuk membuka part itu.",
      "df.c.part": "Part", "df.c.stock": "Stok", "df.c.rop": "ROP", "df.c.po": "PO berjalan", "df.c.fc": "Forecast {m}", "df.c.order": "Order", "df.c.cover": "Cukup sampai", "df.c.status": "Status",
      "df.exp.part": "Aktual & forecast — part ini (CSV)", "df.exp.plan": "Rekomendasi stok — semua part (CSV)", "df.exp.hist": "Riwayat demand bulanan — semua part (CSV)",
      "df.open_po": "PO berjalan: {list}",
    },
  });

  const S = () => (state.df = state.df || { part: null, used: false, backtest: false });
  const ST_RANK = { out: 0, reorder: 1, ok: 2 };
  /* habis pada hari pertama setelah tanggal stok = sudah tidak mencukupi sekarang */
  const isNow = (c, p) => c && !c.beyond && c.date <= AC.addDays(p.stock_as_of, 1);
  const coverText = (c, p) => (!c ? "–" : c.beyond ? t("df.cover_beyond", { m: monthLabel(c.until, true) }) : isNow(c, p) ? t("df.cover_now") : t("df.cover", { m: monthLabel(c.period, true) }));
  const coverShort = (c, p) => (!c ? "–" : c.beyond ? "> " + monthLabel(c.until) : isNow(c, p) ? t("df.cover_now_short") : dayLabel(c.date, true));
  const partLabel = (p) => `${p.part_id} · ${p.part_name} · ${p.brand}`;

  function rowsAll(dem) {
    return AC.sortByRisk(dem.parts).map((p) => AC.demandView(dem, p.part_id)).sort((a, b) => ST_RANK[a.plan.status] - ST_RANK[b.plan.status]);
  }

  VIEWS["w-an-demand"] = function () {
    const head = U.tabs("w-an-demand"), r = U.need(["demand"]);
    if (r.status === "loading") return U.page(head + U.loadingHTML(3));
    if (r.status === "error") return U.page(head + U.errorHTML(r.error, r.resource));
    const dem = r.data.demand, s = S();
    if (!dem.parts.length) return U.page(head + `<div class="card">${U.emptyHTML()}</div>`);
    if (!dem.parts.some((p) => p.part_id === s.part)) s.part = AC.sortByRisk(dem.parts)[0].part_id;
    const v = AC.demandView(dem, s.part), p = v.part, plan = v.plan, nx = v.next, err = dem.error && dem.error.part_id;

    /* pilih part: dikelompokkan per jenis part */
    const groups = {};
    dem.parts.forEach((x) => (groups[x.vehicle_part] = groups[x.vehicle_part] || []).push(x));
    const select = `<label class="an-field"><span>${esc(t("df.part"))}</span><select class="select" id="dfPart">${Object.keys(groups).sort().map((g) => `<optgroup label="${esc(g)}">${groups[g].map((x) => `<option value="${esc(x.part_id)}" ${x.part_id === s.part ? "selected" : ""}>${esc(partLabel(x))}</option>`).join("")}</optgroup>`).join("")}</select></label>`;
    const bar = `<div class="card an-bar">${select}<span class="an-grow"></span>${U.exportMenu([["part", t("df.exp.part")], ["plan", t("df.exp.plan")], ["hist", t("df.exp.hist")]])}</div>`;

    const card1 = nx ? U.kpi(t("df.fc_title", { m: monthLabel(nx.period) }), `${fmtNum(nx.forecast)} <small>${esc(t("an.units"))}</small>`,
      `${esc(t("df.fc_sub", { lo: fmtNum(nx.lower_80), hi: fmtNum(nx.upper_80) }))}<br>${U.missChip(err)}`, { icon: "chart", tip: t("df.fc_tip") })
      : U.kpi(t("df.fc_title", { m: "–" }), "–", esc(t("df.no_fc")), { icon: "chart" });
    const pos = (p.open_po || []).map((x) => `${x.po_id} (${x.qty}${x.expected_date ? ", " + dayLabel(x.expected_date) : ""})`).join(", ");
    const card2 = U.kpi(t("df.stock"), `${fmtNum(plan.stock, 0)} <small>${esc(t("an.units"))}</small>`,
      `${U.statusBadge(plan.status)} <span>${esc(t("df.stock_sub", { rop: plan.rop, ss: plan.safety, d: dayLabel(p.stock_as_of, true) }))}</span>${pos ? `<br><span>${esc(t("df.open_po", { list: pos }))}</span>` : ""}`, { icon: "box" });
    const card3 = U.kpi(t("df.order"), plan.order == null ? "–" : `${fmtNum(plan.order, 0)} <small>${esc(t("an.units"))}</small>`,
      plan.order == null ? esc(t("df.no_fc")) : `${esc(t("df.order_sub", { lt: plan.lead_time_days, f: fmtNum(plan.lt_demand), ss: plan.safety, s: plan.stock, po: plan.open_po }))}<br><b class="an-cover ${isNow(v.cover, p) ? "is-bad" : v.cover && !v.cover.beyond ? "is-warn" : ""}">${esc(coverText(v.cover, p))}</b>${U.tip(t("df.cover_tip"))}`,
      { icon: "truck", tip: t("df.order_tip") });

    /* tabel forecast = tampilan tabel dari grafik (aksesibilitas), di kartu grafik yang sama */
    const table = v.fc.length ? `<details class="an-tableview" open><summary>${esc(t("df.table"))}</summary><div class="table-wrap"><table><thead><tr><th>${esc(t("df.month"))}</th><th class="num">${esc(t("df.units"))}</th><th class="num">${esc(t("df.range"))}</th></tr></thead><tbody>
      ${v.fc.map((x) => `<tr><td>${esc(monthLabel(x.period, true))}</td><td class="num"><b>${fmtNum(x.forecast)}</b></td><td class="num">${fmtNum(x.lower_80)} – ${fmtNum(x.upper_80)}</td></tr>`).join("")}</tbody></table></div></details>` : U.emptyHTML(t("df.no_fc"));
    const chart = `<div class="card"><div class="an-card-head"><div class="card-title">${esc(t("df.chart", { p: partLabel(p) }))}${U.tip(t("df.chart_tip"))}</div>
      <div class="an-toggles">${U.toggle("used", t("an.used"), s.used)}${U.toggle("backtest", t("an.backtest"), s.backtest, !v.hasBacktest, t("an.backtest.none"))}</div></div>
      <div class="an-chart" style="height:320px;"><canvas id="dfChart" role="img" aria-label="${esc(t("df.chart", { p: partLabel(p) }))}"></canvas></div>${table}</div>`;



    const all = rowsAll(dem), m0 = dem.forecast_periods && dem.forecast_periods[0];
    const allCard = `<div class="card"><div class="card-title">${esc(t("df.all"))}${U.tip(t("df.all_tip"))}</div><div class="table-wrap"><table class="an-table-click"><thead><tr><th>${esc(t("df.c.part"))}</th><th class="num">${esc(t("df.c.stock"))}</th><th class="num">${esc(t("df.c.rop"))}</th><th class="num">${esc(t("df.c.po"))}</th><th class="num">${esc(t("df.c.fc", { m: m0 ? monthLabel(m0) : "" }))}</th><th class="num">${esc(t("df.c.order"))}</th><th>${esc(t("df.c.cover"))}</th><th>${esc(t("df.c.status"))}</th></tr></thead><tbody>
      ${all.map((x) => `<tr data-df-part="${esc(x.part.part_id)}" tabindex="0" class="${x.part.part_id === s.part ? "is-sel" : ""}"><td><b class="mono">${esc(x.part.part_id)}</b><div class="an-muted">${esc(x.part.part_name)} · ${esc(x.part.brand)}</div></td><td class="num ${x.plan.below_rop ? "an-bad" : ""}">${x.plan.stock}</td><td class="num">${x.plan.rop}</td><td class="num">${x.plan.open_po || "–"}</td><td class="num">${x.next ? fmtNum(x.next.forecast) : "–"}</td><td class="num"><b>${x.plan.order == null ? "–" : x.plan.order}</b></td><td>${esc(coverShort(x.cover, x.part))}</td><td>${U.statusBadge(x.plan.status)}</td></tr>`).join("")}
      </tbody></table></div></div>`;

    return U.page(head + bar + V.grid(240, card1 + card2 + card3) + chart + allCard + U.sourceNote(dem.meta));
  };

  window.after_w_an_demand = function () {
    U.destroyCharts();
    const r = U.need(["demand"]);
    U.wireCommon(null, {
      exp: (id) => {
        if (r.status !== "ready") return;
        const dem = r.data.demand, s = S(), v = AC.demandView(dem, s.part);
        if (id === "part" && v) U.download(`savera_demand_${s.part}.csv`, AC.toCSV(v.tl.keys.map((k, i) => ({ part_id: s.part, period: k, actual: v.tl.actual[i] ?? "", used: v.tl.extra.used[i] ?? "", forecast: i >= v.tl.nActual ? v.tl.forecast[i] ?? "" : "", lower_80: v.tl.lower[i] ?? "", upper_80: v.tl.upper[i] ?? "" }))));
        if (id === "plan") U.download("savera_rekomendasi_stok.csv", AC.toCSV(rowsAll(dem).map((x) => ({ part_id: x.part.part_id, part_name: x.part.part_name, brand: x.part.brand, vehicle_part: x.part.vehicle_part, current_stock: x.plan.stock, reorder_point: x.plan.rop, safety_stock: x.plan.safety, open_po: x.plan.open_po, lead_time_days: x.plan.lead_time_days, forecast_next: x.next ? x.next.forecast : "", lead_time_demand: x.plan.lt_demand == null ? "" : Math.round(x.plan.lt_demand * 100) / 100, recommended_order: x.plan.order ?? "", stock_lasts_until: x.cover ? (x.cover.beyond ? ">" + x.cover.until : x.cover.date) : "", status: x.plan.status }))));
        if (id === "hist") U.download("savera_demand_bulanan_semua_part.csv", AC.toCSV(dem.parts.flatMap((p) => p.actual.map((a) => ({ part_id: p.part_id, part_name: p.part_name, brand: p.brand, vehicle_part: p.vehicle_part, period: a.period, demand: a.demand, used: a.used })))));
      },
      toggle: (id, btn) => {
        const s = S(); s[id] = !s[id]; btn.classList.toggle("on", s[id]); btn.setAttribute("aria-checked", String(s[id]));
        const c = Chart.getChart && Chart.getChart(document.getElementById("dfChart"));
        if (c) { c.data.datasets.forEach((d) => { if (d._key === id) d.hidden = !s[id]; }); c.update(); }
      },
    });
    const sel = document.getElementById("dfPart");
    if (sel) sel.onchange = () => { S().part = sel.value; renderContent(); };
    document.querySelectorAll("[data-df-part]").forEach((tr) => { const go = () => { S().part = tr.dataset.dfPart; renderContent(); document.getElementById("content").scrollTo({ top: 0, behavior: "smooth" }); }; tr.onclick = go; tr.onkeydown = (e) => { if (e.key === "Enter") go(); }; });
    if (r.status !== "ready") return;
    const v = AC.demandView(r.data.demand, S().part); if (!v) return;
    const s = S(), fmt = (x) => fmtNum(x) + " " + t("an.unitShort");
    U.mk("dfChart", { type: "line", data: { labels: v.tl.keys.map((k) => monthLabel(k)), datasets: U.seriesDatasets(v.tl, { extra: [
      { key: "used", label: t("an.used"), color: U.COL.used, dash: [2, 3], hidden: !s.used },
      { key: "backtest", label: t("an.backtest"), color: U.COL.backtest, dash: [1, 3], hidden: !s.backtest },
    ] }) }, options: U.lineOpts(fmt, t("an.per_month")) });
  };
})();
