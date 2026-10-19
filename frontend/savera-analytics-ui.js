/* SAVERA — komponen bersama Analytics (tab sub-page, state loading/kosong/error, menu Export, tooltip info,
   format angka/rupiah/periode 2 bahasa, pembuat dataset grafik). Muat SETELAH savera-api.js + savera-analytics-core.js
   + savera-i18n.js, SEBELUM savera-demand-forecast.js dan savera-analytics.js. */
(function () {
  const V = window.SAVERA_V2, API = window.SAVERA_API, AC = window.SAVERA_ANALYTICS, I = window.SAVERA_I18N;
  if (!V || !API || !AC) { console.error("[analytics-ui] savera-v2 / savera-api / savera-analytics-core belum dimuat"); return; }
  const t = I ? I.t : (k) => k, lang = () => (I ? I.lang() : "id");

  I && I.add({
    en: {
      "an.tab.summary": "Overview", "an.tab.revenue": "Revenue Forecast", "an.tab.demand": "Demand Forecast", "an.tab.segment": "Customer Segmentation", "an.tabs": "Analytics pages",
      "an.loading": "Loading data…", "an.error": "Data could not be loaded", "an.retry": "Try again", "an.empty": "No data yet.",
      "an.export": "Export", "an.export.csv": "CSV", "an.info": "Explanation",
      "an.band80": "80% range", "an.actual": "Actual", "an.forecast": "Forecast", "an.ma": "Moving average ({n} {u})", "an.backtest": "Backtest prediction", "an.used": "Used (stock out)",
      "an.unit.week": "weeks", "an.unit.month": "months", "an.unit1.week": "week", "an.unit1.month": "month", "an.weekly": "Weekly", "an.monthly": "Monthly", "an.week_of": "Week of {d}",
      "an.miss": "Average miss ±{p}", "an.miss.tip": "Average absolute error of this model in a {scope} walk-forward test (WAPE, from the modeling team's report). Most periods land within this distance of the actual.",
      "an.source": "Source: dataset v5 (synthetic demo) + Python model results · built {d}",
      "an.ops_note": "Live operational data", "an.backtest.none": "The modeling team has not exported backtest predictions yet (backtest_*.csv in modeling/).",
      "an.range": "data period {a} – {b}", "an.units": "units", "an.unitShort": "u", "an.per_month": "units / month",
    },
    id: {
      "an.tab.summary": "Ringkasan", "an.tab.revenue": "Revenue Forecast", "an.tab.demand": "Demand Forecast", "an.tab.segment": "Customer Segmentation", "an.tabs": "Halaman Analytics",
      "an.loading": "Memuat data…", "an.error": "Data gagal dimuat", "an.retry": "Coba lagi", "an.empty": "Belum ada data.",
      "an.export": "Export", "an.export.csv": "CSV", "an.info": "Penjelasan",
      "an.band80": "Rentang 80%", "an.actual": "Aktual", "an.forecast": "Forecast", "an.ma": "Rata-rata bergerak ({n} {u})", "an.backtest": "Prediksi backtest", "an.used": "Terpakai (stok keluar)",
      "an.unit.week": "minggu", "an.unit.month": "bulan", "an.unit1.week": "minggu", "an.unit1.month": "bulan", "an.weekly": "Mingguan", "an.monthly": "Bulanan", "an.week_of": "Minggu {d}",
      "an.miss": "Rata-rata meleset ±{p}", "an.miss.tip": "Rata-rata selisih absolut model ini pada uji walk-forward {scope} (WAPE, dari laporan tim model). Sebagian besar periode berada dalam jarak ini dari nilai aktual.",
      "an.source": "Sumber: dataset v5 (demo sintetis) + hasil model Python · dibuat {d}",
      "an.ops_note": "Data operasional live", "an.backtest.none": "Tim model belum mengekspor prediksi backtest (backtest_*.csv di folder modeling/).",
      "an.range": "periode data {a} – {b}", "an.units": "unit", "an.unitShort": "unit", "an.per_month": "unit / bulan",
    },
  });

  /* ---------- format ---------- */
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const loc = () => (lang() === "en" ? "en-GB" : "id-ID");
  const fmtNum = (n, d) => (n == null || !Number.isFinite(+n) ? "–" : (+n).toLocaleString(loc(), { maximumFractionDigits: d == null ? 1 : d, minimumFractionDigits: 0 }));
  const fmtPct = (p, d) => (p == null || !Number.isFinite(+p) ? "–" : fmtNum(p * 100, d == null ? 1 : d) + "%");
  const fmtRp = (n) => (n == null || !Number.isFinite(+n) ? "—" : "Rp " + Math.round(+n).toLocaleString("id-ID"));
  const fmtRpShort = (n) => {
    if (n == null || !Number.isFinite(+n)) return "—";
    const en = lang() === "en", a = Math.abs(+n);
    if (a >= 1e9) return "Rp " + fmtNum(n / 1e9, 2) + (en ? "B" : " M");
    if (a >= 1e6) return "Rp " + fmtNum(n / 1e6, 1) + (en ? "M" : " jt");
    return fmtRp(n);
  };
  const jt = (v) => (v == null ? null : +v * 1e6); /* hasil model pendapatan dalam Rp juta */
  const monthLabel = (p, long) => { const d = new Date(String(p).slice(0, 7) + "-01T00:00:00"); return isNaN(d) ? String(p) : d.toLocaleDateString(loc(), { month: long ? "long" : "short", year: "numeric" }); };
  const dayLabel = (s, withYear) => { const d = new Date(String(s).slice(0, 10) + "T00:00:00"); return isNaN(d) ? String(s) : d.toLocaleDateString(loc(), withYear ? { day: "numeric", month: "short", year: "numeric" } : { day: "numeric", month: "short" }); };
  const keyLabel = (k, gran) => (gran === "weekly" ? dayLabel(k) : monthLabel(k));

  /* ---------- data: kebutuhan beberapa resource sekaligus ---------- */
  function need(names) {
    const st = names.map((n) => [n, API.use(n)]);
    const err = st.find(([, s]) => s.status === "error");
    if (err) return { status: "error", error: err[1].error, resource: err[0] };
    if (st.some(([, s]) => s.status !== "ready")) return { status: "loading" };
    return { status: "ready", data: Object.fromEntries(st.map(([n, s]) => [n, s.data])) };
  }
  const loadingHTML = (rows) => `<div class="an-state" role="status" aria-live="polite"><span class="an-sr">${esc(t("an.loading"))}</span>${Array.from({ length: rows || 3 }, (_, i) => `<div class="an-skel" style="height:${i === 0 ? 96 : 220}px"></div>`).join("")}</div>`;
  const errorHTML = (msg, res) => `<div class="card"><div class="empty-state" role="alert">${ICONS.warn || ""}<div><b>${esc(t("an.error"))}</b><div class="an-muted" style="margin:6px 0 12px;">${esc(msg || "")}</div>
    <button type="button" class="btn btn-ghost" data-an-retry="${esc(res || "")}">${esc(t("an.retry"))}</button></div></div></div>`;
  const emptyHTML = (msg) => `<div class="empty-state">${ICONS.search || ""}<div>${esc(msg || t("an.empty"))}</div></div>`;

  /* ---------- komponen kecil ---------- */
  const TABS = [["w-analytics", "an.tab.summary"], ["w-an-revenue", "an.tab.revenue"], ["w-an-demand", "an.tab.demand"], ["w-an-segment", "an.tab.segment"]];
  const tabs = (active) => `<nav class="tab-bar an-tabs" aria-label="${esc(t("an.tabs"))}">${TABS.map(([id, k]) => `<button type="button" class="tab-btn ${id === active ? "active" : ""}" data-nav="${id}" ${id === active ? 'aria-current="page"' : ""}>${esc(t(k))}</button>`).join("")}</nav>`;
  const tip = (text, label) => `<span class="an-tip" tabindex="0" role="note" aria-label="${esc(label || t("an.info"))}: ${esc(text)}" data-tip="${esc(text)}">${ICONS.info || "i"}</span>`;
  const missChip = (err) => (err && err.wape_pct != null ? `<span class="an-miss">${esc(t("an.miss", { p: fmtNum(err.wape_pct, 1) + "%" }))}${tip(t("an.miss.tip", { scope: err.scope || "" }))}</span>` : "");
  /* menu Export: items = [[id, label]] → tombol data-an-export="id" */
  const exportMenu = (items) => `<details class="an-menu"><summary class="btn btn-ghost">${ICONS.upload || ""}<span>${esc(t("an.export"))}</span>${ICONS.chevDown || ""}</summary>
    <div class="an-menu-list" role="menu">${items.map(([id, l]) => `<button type="button" role="menuitem" data-an-export="${esc(id)}">${esc(l)}</button>`).join("")}</div></details>`;
  const seg = (name, opts, cur) => `<div class="an-seg" role="group">${opts.map(([v, l]) => `<button type="button" data-an-seg="${esc(name)}" data-v="${esc(v)}" class="${v === cur ? "on" : ""}" aria-pressed="${v === cur}">${esc(l)}</button>`).join("")}</div>`;
  const toggle = (id, label, on, disabled, why) => `<label class="an-toggle ${disabled ? "is-off" : ""}" ${disabled && why ? `title="${esc(why)}"` : ""}><button type="button" class="toggle ${on && !disabled ? "on" : ""}" data-an-toggle="${esc(id)}" role="switch" aria-checked="${!!(on && !disabled)}" ${disabled ? "disabled" : ""}></button><span>${esc(label)}</span>${disabled && why ? tip(why) : ""}</label>`;
  const kpi = (label, value, sub, opts) => `<div class="stat-card an-kpi ${opts && opts.nav ? "is-link" : ""}" ${opts && opts.nav ? `data-nav="${esc(opts.nav)}" role="link" tabindex="0"` : ""}>
    <div class="stat-top"><div class="stat-label">${esc(label)}${opts && opts.tip ? tip(opts.tip) : ""}</div><div class="stat-icon" style="background:#E6F7FB;color:#0E9EB8;">${ICONS[(opts && opts.icon) || "chart"] || ""}</div></div>
    <div class="stat-value">${value}</div><div class="an-kpi-sub">${sub || ""}</div></div>`;
  const page = (html) => `<div class="an-page">${html}</div>`;
  const sourceNote = (meta, range) => `<div class="an-source">${esc(t("an.source", { d: meta && meta.generated_at ? dayLabel(meta.generated_at, true) : "–" }))}${range && range.from ? " · " + esc(t("an.range", { a: dayLabel(range.from, true), b: dayLabel(range.to, true) })) : ""}</div>`;
  const statusBadge = (st) => { const m = { ok: ["ok", "an.st.ok"], reorder: ["pending", "an.st.reorder"], out: ["rejected", "an.st.out"] }[st] || ["pending", st]; return `<span class="badge badge-${m[0]}">${esc(t(m[1]))}</span>`; };

  /* ---------- grafik ---------- */
  const COL = { actual: "#13A8C4", forecast: "#F2A541", band: "rgba(242,165,65,.18)", ma: "#0B2545", used: "#8DA9C4", backtest: "#5B6B85", bad: "#c23b3b", grid: "rgba(107,122,147,.14)" };
  let charts = [];
  const destroyCharts = () => { charts.forEach((c) => { try { c.destroy(); } catch (e) { /* abaikan */ } }); charts = []; };
  function mk(id, cfg) {
    const el = document.getElementById(id);
    if (!el || typeof Chart === "undefined") return null;
    const c = new Chart(el, cfg); charts.push(c); return c;
  }
  /* dataset garis aktual/forecast/rentang dari AC.timeline(); fmt = format angka tooltip */
  function seriesDatasets(tl, o) {
    const ds = [];
    if (tl.lower.some((v) => v != null)) {
      ds.push({ label: "_lo", data: tl.lower, borderColor: "transparent", backgroundColor: COL.band, pointRadius: 0, pointHitRadius: 0, fill: false, order: 9 });
      ds.push({ label: t("an.band80"), data: tl.upper, borderColor: "transparent", backgroundColor: COL.band, pointRadius: 0, pointHitRadius: 0, fill: "-1", order: 9 });
    }
    ds.push({ label: t("an.actual"), data: tl.actual, borderColor: COL.actual, backgroundColor: COL.actual, borderWidth: 2, tension: 0.25, pointRadius: o && o.dense ? 0 : 2.5, pointHoverRadius: 5, order: 1 });
    ds.push({ label: t("an.forecast"), data: tl.forecast, borderColor: COL.forecast, backgroundColor: COL.forecast, borderWidth: 2, borderDash: [6, 5], tension: 0.2, pointRadius: tl.forecast.map((v, i) => (v != null && i >= tl.nActual ? 4 : 0)), pointHoverRadius: 6, order: 0 });
    (o && o.extra ? o.extra : []).forEach((x) => { if (tl.extra[x.key] && tl.extra[x.key].some((v) => v != null)) ds.push({ label: x.label, data: tl.extra[x.key], borderColor: x.color, backgroundColor: x.color, borderWidth: x.width || 1.5, borderDash: x.dash, pointRadius: 0, pointHoverRadius: 4, tension: 0.25, hidden: !!x.hidden, order: 2, _key: x.key }); });
    return ds;
  }
  const lineOpts = (fmt, yTitle) => ({
    responsive: true, maintainAspectRatio: false, interaction: { mode: "index", intersect: false }, animation: { duration: 250 },
    plugins: { saveraTrend: { enabled: false }, legend: { position: "bottom", labels: { usePointStyle: true, boxWidth: 8, filter: (it) => it.text !== "_lo" } },
      tooltip: { filter: (it) => it.dataset.label !== "_lo" && it.parsed.y != null, callbacks: { label: (c) => ` ${c.dataset.label}: ${fmt(c.parsed.y)}` } } },
    scales: { y: { beginAtZero: true, grid: { color: COL.grid }, ticks: { callback: (v) => fmt(v) }, title: yTitle ? { display: true, text: yTitle } : undefined },
      x: { grid: { display: false }, ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 10 } } },
  });

  function download(name, text) {
    try { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob(["﻿" + text], { type: "text/csv;charset=utf-8" })); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); }
    catch (e) { console.error("[analytics] export gagal", e); }
  }

  /* ---------- wiring bersama (dipanggil di after_<view>) ---------- */
  function wireCommon(root, h) {
    root = root || document.getElementById("content");
    if (!root) return;
    root.querySelectorAll("[data-an-retry]").forEach((b) => (b.onclick = () => { const r = b.dataset.anRetry; if (r) API.load(r, { reload: true }); renderContent(); }));
    root.querySelectorAll("[data-an-export]").forEach((b) => (b.onclick = () => { b.closest("details") && b.closest("details").removeAttribute("open"); h && h.exp && h.exp(b.dataset.anExport); }));
    root.querySelectorAll("[data-an-seg]").forEach((b) => (b.onclick = () => h && h.seg && h.seg(b.dataset.anSeg, b.dataset.v)));
    root.querySelectorAll("[data-an-toggle]").forEach((b) => (b.onclick = () => h && h.toggle && h.toggle(b.dataset.anToggle, b)));
    root.querySelectorAll(".an-kpi.is-link").forEach((el) => (el.onkeydown = (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleNav(el.dataset.nav); } }));
  }
  /* tutup menu Export saat klik di luar */
  document.addEventListener("click", (e) => document.querySelectorAll("details.an-menu[open]").forEach((d) => { if (!d.contains(e.target)) d.removeAttribute("open"); }));

  /* ---------- routing: render ulang saat data selesai dimuat; sidebar "Analytics" tetap aktif di sub-page ---------- */
  const VIEWS_AN = new Set(TABS.map(([id]) => id));
  API.onChange(() => { if (VIEWS_AN.has(state.view) && typeof renderContent === "function") renderContent(); });
  const _shell = renderShell;
  renderShell = function () {
    _shell.apply(this, arguments);
    if (VIEWS_AN.has(state.view)) { const b = document.querySelector('.sidebar [data-nav="w-analytics"]'); if (b) b.classList.add("active"); }
  };
  /* judul halaman 2 bahasa (dibaca renderShell lewat PAGE_META) */
  const titles = { "w-analytics": ["an.tab.summary", "an.sub.summary"], "w-an-revenue": ["an.tab.revenue", "an.sub.revenue"], "w-an-demand": ["an.tab.demand", "an.sub.demand"], "w-an-segment": ["an.tab.segment", "an.sub.segment"] };
  I && I.add({
    en: { "an.title": "Analytics", "an.sub.summary": "Revenue, demand and operations at a glance", "an.sub.revenue": "Revenue forecast from the Python model", "an.sub.demand": "Spare-part demand forecast & reorder recommendation", "an.sub.segment": "Customer segments from the Python model",
      "an.st.ok": "OK", "an.st.reorder": "Reorder", "an.st.out": "Out of stock" },
    id: { "an.title": "Analytics", "an.sub.summary": "Ringkasan pendapatan, demand, dan operasional", "an.sub.revenue": "Forecast pendapatan dari model Python", "an.sub.demand": "Forecast kebutuhan sparepart & rekomendasi order", "an.sub.segment": "Segmen pelanggan dari model Python",
      "an.st.ok": "Aman", "an.st.reorder": "Perlu reorder", "an.st.out": "Habis" },
  });
  Object.keys(titles).forEach((v) => Object.defineProperty(PAGE_META, v, { configurable: true, enumerable: true, get: () => [v === "w-analytics" ? t("an.title") : t(titles[v][0]), t(titles[v][1])], set: () => {} }));

  window.SAVERA_AN_UI = { page, t, esc, lang, fmtNum, fmtPct, fmtRp, fmtRpShort, jt, monthLabel, dayLabel, keyLabel, need, loadingHTML, errorHTML, emptyHTML, tabs, tip, missChip, exportMenu, seg, toggle, kpi,
    sourceNote, statusBadge, COL, mk, destroyCharts, seriesDatasets, lineOpts, download, wireCommon };
})();
