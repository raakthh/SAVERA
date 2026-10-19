/* SAVERA — Viewer multi-foto (Workshop › Assessment detail).
   Muat SETELAH savera-workshop.js, savera-i18n.js, savera-review.js. Menampilkan working model (hasil CV + review workshop).
   Model klasifikasi tidak memberi box → temuan AI tanpa box tampil sebagai TAG di foto. Box hanya dari workshop
   (penanda lokasi temuan AI, atau entri manual) dan digambar lewat mode gambar (dimulai dari kartu temuan).
   API: SAVERA_V2.photoViewer = { has(sr), html(sr), wire(sr), startDraw(a, detId, photoId) } */
(function () {
  const V = window.SAVERA_V2, A = window.SAVERA_ASSESSMENT, I = window.SAVERA_I18N, CV = window.SAVERA_CV;
  if (!V || !A || !I || !V.review) return;
  const RV = V.review, t = I.t, L = () => I.lang();
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const pct = (v) => (v == null || !Number.isFinite(+v) ? "–" : Math.round(+v) + "%");
  const loaded = new Set(); /* url yang sudah pernah termuat → tanpa spinner saat render ulang */

  I.add({
    en: { "pv.title": "Damage photos", "pv.summary": "{p} photos · {f} findings", "pv.tab_photo": "This photo", "pv.tab_all": "All findings", "pv.manual": "Manual", "pv.ai": "AI",
      "pv.seen_in": "Seen in {n} photos", "pv.seen_in_1": "Seen in 1 photo", "pv.photo_of": "Photo {i} of {n}", "pv.loading": "Loading photo…", "pv.img_error": "Photo failed to load",
      "pv.no_photos": "No photos for this assessment yet.", "pv.no_det": "No damage detected in this photo.", "pv.no_findings": "No findings yet.", "pv.data_error": "Some assessment data is invalid:",
      "pv.render_error": "The photo viewer could not be displayed.", "pv.damage_type": "Damage type", "pv.severity": "Severity", "pv.damage_pct": "Damage %", "pv.conf_part": "Part confidence",
      "pv.conf_damage": "Damage-type confidence", "pv.conf_sev": "Severity confidence", "pv.manual_note": "Added manually — no AI score", "pv.action": "Action", "pv.service": "Service",
      "pv.same_as": "Also shows finding {id} — not costed twice", "pv.source": "Source", "pv.n_dets": "{n} detected", "pv.zoom": "Click to enlarge", "pv.max": "highest", "pv.go": "Show on photo",
      "pv.legend_ai": "AI box", "pv.legend_ws": "Marked by workshop", "pv.legend_manual": "Manual entry", "pv.legend_tag": "AI finding without location (whole photo)",
      "pv.draw_hint": "Drag a box on the photo to mark {part}. Esc to cancel.", "pv.draw_cancel": "Cancel", "pv.draw_small": "Box too small — drag a larger area.", "pv.marked": "marked by workshop", "pv.unset": "not set" },
    id: { "pv.title": "Foto kerusakan", "pv.summary": "{p} foto · {f} temuan", "pv.tab_photo": "Foto ini", "pv.tab_all": "Semua temuan", "pv.manual": "Manual", "pv.ai": "AI",
      "pv.seen_in": "Terlihat di {n} foto", "pv.seen_in_1": "Terlihat di 1 foto", "pv.photo_of": "Foto {i} dari {n}", "pv.loading": "Memuat foto…", "pv.img_error": "Foto gagal dimuat",
      "pv.no_photos": "Belum ada foto untuk assessment ini.", "pv.no_det": "Tidak ada kerusakan terdeteksi di foto ini.", "pv.no_findings": "Belum ada temuan.", "pv.data_error": "Sebagian data assessment tidak valid:",
      "pv.render_error": "Viewer foto tidak dapat ditampilkan.", "pv.damage_type": "Jenis kerusakan", "pv.severity": "Tingkat", "pv.damage_pct": "Kerusakan %", "pv.conf_part": "Keyakinan part",
      "pv.conf_damage": "Keyakinan jenis", "pv.conf_sev": "Keyakinan tingkat", "pv.manual_note": "Ditambah manual — tanpa skor AI", "pv.action": "Tindakan", "pv.service": "Layanan",
      "pv.same_as": "Juga memperlihatkan temuan {id} — tidak dihitung dua kali", "pv.source": "Sumber", "pv.n_dets": "{n} kerusakan", "pv.zoom": "Klik untuk memperbesar", "pv.max": "tertinggi", "pv.go": "Lihat di foto",
      "pv.legend_ai": "Box AI", "pv.legend_ws": "Ditandai workshop", "pv.legend_manual": "Entri manual", "pv.legend_tag": "Temuan AI tanpa lokasi (seluruh foto)",
      "pv.draw_hint": "Tarik kotak di foto untuk menandai {part}. Esc untuk batal.", "pv.draw_cancel": "Batal", "pv.draw_small": "Kotak terlalu kecil — tarik area yang lebih besar.", "pv.marked": "ditandai workshop", "pv.unset": "belum diisi" },
  });

  const isManual = (d) => d.source === "manual";
  const conf = (d) => (isManual(d) ? t("pv.manual") : pct(d.confidence * 100));
  const name = (d) => d.part || t("pv.unset");
  const sevBadge = (s) => (s ? `<span class="badge badge-${esc(String(s).toLowerCase())}">${esc(A.label("severity", s, L()))}</span>` : "–");
  const srcChip = (src) => `<span class="badge ${src === "ai" ? "badge-review" : "badge-neutral"}">${esc(A.label("source", src, L()))}</span>`;
  const angle = (p) => A.label("angle", p.angle, L());
  const confBar = (v) => `<div class="conf-bar"><div class="conf-bar-fill" style="width:${Math.max(0, Math.min(100, Math.round(v * 100)))}%;"></div></div>`;

  /* ---------- foto utama ---------- */
  function stageHTML(a, p, s) {
    const w = +p.width, h = +p.height, ar = w > 0 && h > 0 ? w / h : null, dets = p.detections || [];
    const box = (d) => { const b = d.bbox; if (!b) return "";
      const cls = d.bbox_source === "manual" ? " manual" : d.bbox_source === "workshop" ? " workshop" : "";
      return `<button type="button" class="bbox${cls}${s.sel === (d.same_as || d.id) ? " sel" : ""}${b.y < 0.08 ? " lbl-in" : ""}" data-pv-det="${esc(d.same_as || d.id)}" style="left:${b.x * 100}%;top:${b.y * 100}%;width:${b.w * 100}%;height:${b.h * 100}%;" title="${d.bbox_source === "workshop" ? esc(t("pv.marked")) : ""}" aria-label="${esc(name(d))} · ${esc(conf(d))}"><span class="lbl">${esc(name(d))} · ${esc(conf(d))}</span></button>`; };
    const tags = dets.filter((d) => !d.bbox);
    const drawing = s.draw && s.draw.photo_id === p.id;
    return `<div class="pv-frame"><div class="img-stage pv-stage${loaded.has(p.url) ? "" : " is-loading"}${drawing ? " pv-drawing" : ""}" style="${ar ? `aspect-ratio:${w}/${h};width:min(100%, calc(var(--pv-max-h) * ${ar.toFixed(4)}));` : ""}">
      <img src="${esc(p.url)}" alt="${esc(angle(p))}" title="${esc(t("pv.zoom"))}" draggable="false">
      ${dets.map(box).join("")}
      ${tags.length ? `<div class="pv-tags">${tags.map((d) => `<button type="button" class="pv-tag${s.sel === (d.same_as || d.id) ? " sel" : ""}" data-pv-det="${esc(d.same_as || d.id)}">${esc(name(d))} · ${esc(conf(d))}${d.severity ? " · " + esc(A.label("severity", d.severity, L())) : ""}</button>`).join("")}</div>` : ""}
      ${drawing ? `<div class="pv-draw-rect" hidden></div>` : ""}
      <div class="pv-overlay pv-loading"><span class="sv-spin"></span>${esc(t("pv.loading"))}</div>
      <div class="pv-overlay pv-error">${ICONS.warn || ""}<div>${esc(t("pv.img_error"))}</div><div class="pv-url">${esc(p.url)}</div></div>
    </div></div>
    ${drawing ? `<div class="banner banner-info pv-draw-bar" role="status"><div>${esc(t("pv.draw_hint", { part: s.draw.label || "" }))}</div><button type="button" class="btn btn-ghost btn-sm" data-pv-cancel>${esc(t("pv.draw_cancel"))}</button></div>` : ""}
    <div class="pv-legend"><span class="lg-ai">${esc(t("pv.legend_ai"))}</span><span class="lg-ws">${esc(t("pv.legend_ws"))}</span><span class="lg-man">${esc(t("pv.legend_manual"))}</span><span class="lg-tag">${esc(t("pv.legend_tag"))}</span></div>`;
  }
  function thumbsHTML(photos, s) {
    return `<div class="pv-thumbs">${photos.map((p, i) => { const n = (p.detections || []).length;
      return `<button type="button" class="pv-th${i === s.photo ? " on" : ""}" data-pv-photo="${i}" aria-pressed="${i === s.photo}" aria-label="${esc(angle(p))} · ${esc(t("pv.n_dets", { n }))}">
        <span class="pv-th-img"><img src="${esc(p.url)}" alt="" loading="lazy"></span>
        <span class="pv-th-lbl">${esc(angle(p))}</span><span class="pv-th-n">${esc(t("pv.n_dets", { n }))}</span></button>`; }).join("")}</div>`;
  }

  /* ---------- daftar kanan ---------- */
  const row = (l, v) => `<div class="pv-row"><span>${esc(l)}</span><span>${v}</span></div>`;
  const confRow = (l, v) => `<div class="pv-conf"><span>${esc(l)}</span><span class="mono">${pct(v * 100)}</span></div>${confBar(v)}`;
  function detItem(d, f, s) {
    const id = d.same_as || d.id, c = f && f.current;
    return `<div class="dmg-item pv-item${s.sel === id ? " sel" : ""}" data-pv-det="${esc(id)}" tabindex="0" role="button" aria-pressed="${s.sel === id}">
      <div class="dmg-item-top"><div class="dmg-item-title">${esc(name(d))}</div>${srcChip(isManual(d) ? "manual" : "ai")}</div>
      ${row(t("pv.damage_type"), esc(d.damage_type || "–"))}${row(t("pv.severity"), sevBadge(d.severity))}${row(t("pv.damage_pct"), `<b>${pct(d.damage_pct)}</b>`)}
      ${row(t("pv.action"), esc(d.repair_action ? A.label("repair_action", d.repair_action, L()) : "–"))}${row(t("pv.service"), esc(d.service_type || "–"))}
      ${isManual(d) ? `<div class="pv-conf"><span>${esc(t("pv.manual_note"))}</span><span class="mono">—</span></div>`
        : c && !d.same_as ? (c.part_confidence != null ? confRow(t("pv.conf_part"), c.part_confidence) : "") + (c.damage_type_confidence != null ? confRow(t("pv.conf_damage"), c.damage_type_confidence) : "") + (c.severity_confidence != null ? confRow(t("pv.conf_sev"), c.severity_confidence) : "")
        : d.confidence != null ? confRow(t("pv.conf_part"), d.confidence) : ""}
      ${d.same_as ? `<div class="pv-note">${esc(t("pv.same_as", { id: d.same_as }))}</div>` : ""}</div>`;
  }
  function groupItem(g) {
    const seen = g.n_photos === 1 ? t("pv.seen_in_1") : t("pv.seen_in", { n: g.n_photos });
    return `<div class="dmg-item pv-item" data-pv-go="${g.first.photoIndex}" data-pv-gdet="${esc(g.first.detectionId)}" tabindex="0" role="button" title="${esc(t("pv.go"))}">
      <div class="dmg-item-top"><div class="dmg-item-title">${esc(g.part)}</div><span class="badge badge-neutral pv-seen">${esc(seen)}</span></div>
      ${row(t("pv.damage_type"), esc(g.damage_types.join(", ") || "–"))}${row(t("pv.severity") + " (" + t("pv.max") + ")", sevBadge(g.severity))}${row(t("pv.damage_pct") + " (" + t("pv.max") + ")", `<b>${pct(g.damage_pct)}</b>`)}
      ${row(t("pv.action"), esc(g.repair_actions.map((x) => A.label("repair_action", x, L())).join(", ") || "–"))}${row(t("pv.source"), srcChip(g.source))}
      <div class="pv-conf"><span>${g.confidence == null ? esc(t("pv.manual_note")) : esc(t("pv.conf_part")) + " (" + esc(t("pv.max")) + ")"}</span><span class="mono">${g.confidence == null ? esc(t("pv.manual")) : pct(g.confidence * 100)}</span></div>
      ${g.confidence == null ? "" : confBar(g.confidence)}</div>`;
  }

  /* ---------- isi viewer ---------- */
  function inner(a) {
    const s = RV.ui(a), w = RV.working(a), photos = w.photos, probs = A.validate(a);
    const warn = probs.length ? `<div class="banner banner-warn" style="margin-bottom:12px;"><div>${esc(t("pv.data_error"))} ${probs.map(esc).join("; ")}</div></div>` : "";
    if (!photos.length) return warn + `<div class="empty-state">${ICONS.upload || ""}<div>${esc(t("pv.no_photos"))}</div></div>`;
    if (s.photo >= photos.length) s.photo = 0;
    const p = photos[s.photo], groups = A.groupFindings(photos), dets = p.detections || [], fById = Object.fromEntries(w.findings.map((f) => [f.id, f]));
    const tab = (k, l, n) => `<button type="button" class="tab-btn${s.tab === k ? " active" : ""}" data-pv-tab="${k}" role="tab" aria-selected="${s.tab === k}">${esc(l)} <span class="pv-count">${n}</span></button>`;
    const list = s.tab === "all"
      ? (groups.length ? groups.map(groupItem).join("") : `<div class="empty-state">${esc(t("pv.no_findings"))}</div>`)
      : `<div class="pv-photo-head">${esc(t("pv.photo_of", { i: s.photo + 1, n: photos.length }))} · <b>${esc(angle(p))}</b></div>` + (dets.length ? dets.map((d) => detItem(d, fById[d.id], s)).join("") : `<div class="empty-state">${ICONS.check || ""}<div>${esc(t("pv.no_det"))}</div></div>`);
    return warn + `<div class="pv-head"><b>${esc(t("pv.title"))}</b><span class="sv-chip">${esc(t("pv.summary", { p: photos.length, f: groups.length }))}</span></div>
      <div class="dd-layout pv-layout"><div>${stageHTML(a, p, s)}${thumbsHTML(photos, s)}</div>
      <div><div class="tab-bar" role="tablist">${tab("photo", t("pv.tab_photo"), dets.length)}${tab("all", t("pv.tab_all"), groups.length)}</div><div class="pv-list">${list}</div></div></div>`;
  }

  const has = (sr) => !!RV.assessmentOf(sr);
  function html(sr) {
    const a = RV.assessmentOf(sr); if (!a) return "";
    let body; try { body = inner(a); } catch (e) { console.error("[photo-viewer]", e); body = `<div class="banner banner-warn"><div>${esc(t("pv.render_error"))}</div></div>`; }
    return `<div class="pv" id="pv-${esc(a.assessment_id)}">${body}</div>`;
  }

  /* mulai mode gambar box untuk satu temuan (dipanggil dari kartu temuan) */
  function startDraw(a, detId, photoId, label) {
    const s = RV.ui(a), w = RV.working(a), i = w.photos.findIndex((p) => p.id === photoId);
    if (i < 0) return;
    s.photo = i; s.tab = "photo"; s.sel = detId; s.draw = { det: detId, photo_id: photoId, label: label || "" };
    renderContent();
    const el = document.getElementById("pv-" + a.assessment_id); if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  /* ---------- event ---------- */
  function lightbox(src, alt) {
    const d = document.createElement("div"); d.className = "wa-lightbox"; d.innerHTML = `<img src="${esc(src)}" alt="${esc(alt)}">`;
    const close = () => { d.remove(); document.removeEventListener("keydown", k); }, k = (e) => e.key === "Escape" && close();
    d.onclick = close; document.addEventListener("keydown", k); document.body.appendChild(d);
  }
  let escHandler = null;
  function bindDraw(a, root, stage) {
    const s = RV.ui(a), rect = stage.querySelector(".pv-draw-rect"), min = (CV && CV.CONFIG.min_box) || 0.02;
    let st = null;
    const rel = (e) => { const r = stage.getBoundingClientRect(); return { x: Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), y: Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)) }; };
    const boxOf = (p0, p1) => ({ x: Math.min(p0.x, p1.x), y: Math.min(p0.y, p1.y), w: Math.abs(p1.x - p0.x), h: Math.abs(p1.y - p0.y) });
    const show = (b) => { rect.hidden = false; Object.assign(rect.style, { left: b.x * 100 + "%", top: b.y * 100 + "%", width: b.w * 100 + "%", height: b.h * 100 + "%" }); };
    stage.onpointerdown = (e) => { if (e.button > 0) return; e.preventDefault(); st = rel(e); stage.setPointerCapture(e.pointerId); show({ ...st, w: 0, h: 0 }); };
    stage.onpointermove = (e) => { if (st) show(boxOf(st, rel(e))); };
    stage.onpointerup = (e) => {
      if (!st) return; const b = boxOf(st, rel(e)); st = null;
      if (b.w < min || b.h < min) { rect.hidden = true; return toast(t("pv.draw_small")); }
      const r4 = (v) => Math.round(v * 10000) / 10000, box = { x: r4(b.x), y: r4(b.y), w: r4(b.w), h: r4(b.h) };
      const dr = RV.draft(a), man = dr.added.find((x) => x.id === s.draw.det);
      if (man) man.bbox = box; else dr.boxes[s.draw.det] = box;
      s.draw = null; renderContent();
    };
  }
  function wire(sr) {
    const a = RV.assessmentOf(sr); if (!a) return;
    const root = document.getElementById("pv-" + a.assessment_id); if (!root) return;
    const s = RV.ui(a);
    const act = (el) => {
      if (el.dataset.pvPhoto != null) { s.photo = +el.dataset.pvPhoto; s.draw = null; }
      else if (el.dataset.pvTab) s.tab = el.dataset.pvTab;
      else if (el.dataset.pvGo != null) { s.photo = +el.dataset.pvGo; s.tab = "photo"; s.sel = el.dataset.pvGdet; s.open[el.dataset.pvGdet] = true; }
      else if (el.dataset.pvDet) { s.sel = s.sel === el.dataset.pvDet ? null : el.dataset.pvDet; if (s.sel) s.open[s.sel] = true; }
      else if (el.hasAttribute("data-pv-cancel")) s.draw = null;
      else return;
      renderContent();
    };
    const pick = (e) => e.target.closest("[data-pv-photo],[data-pv-tab],[data-pv-go],[data-pv-det],[data-pv-cancel]");
    root.onclick = (e) => { if (s.draw && e.target.closest(".pv-stage")) return; const el = pick(e); if (el && root.contains(el)) { e.preventDefault(); act(el); } };
    root.onkeydown = (e) => { if (e.key !== "Enter" && e.key !== " ") return; const el = pick(e); if (el && el.getAttribute("role") === "button") { e.preventDefault(); act(el); } };
    if (escHandler) document.removeEventListener("keydown", escHandler);
    escHandler = (e) => { if (e.key === "Escape" && s.draw) { s.draw = null; renderContent(); } };
    document.addEventListener("keydown", escHandler);
    const stage = root.querySelector(".pv-stage"), img = stage && stage.querySelector("img");
    if (img) {
      const ok = () => { loaded.add(img.getAttribute("src")); stage.classList.remove("is-loading", "is-error"); }, bad = () => { stage.classList.remove("is-loading"); stage.classList.add("is-error"); };
      img.addEventListener("load", ok); img.addEventListener("error", bad);
      if (img.complete) (img.naturalWidth ? ok : bad)();
      if (s.draw) bindDraw(a, root, stage);
      else img.onclick = () => !stage.classList.contains("is-error") && lightbox(img.src, img.alt);
    }
    root.querySelectorAll(".pv-th-img img").forEach((im) => { const fail = () => im.closest(".pv-th-img").classList.add("is-error"); im.addEventListener("error", fail); if (im.complete && !im.naturalWidth) fail(); });
  }

  V.photoViewer = { has, html, wire, startDraw };
})();
