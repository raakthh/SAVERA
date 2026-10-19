/* SAVERA — i18n kecil (EN / ID) + tombol ganti bahasa di topbar.
   Muat SETELAH savera-v2.js. Komponen baru memanggil SAVERA_I18N.t("kunci", { var }) dan
   mendaftarkan kamusnya lewat SAVERA_I18N.add({ en: {...}, id: {...} }).
   Halaman lama belum memakai t(); dipindahkan bertahap. Pilihan bahasa disimpan per browser (opsional). */
(function () {
  const KEY = "savera.lang", LANGS = ["id", "en"], DEFAULT = "id";
  const DICT = { en: {}, id: {} };
  let lang = DEFAULT;
  try { const v = localStorage.getItem(KEY); if (LANGS.includes(v)) lang = v; } catch (e) {}

  const fill = (s, vars) => String(s).replace(/\{(\w+)\}/g, (m, k) => (vars && vars[k] != null ? vars[k] : m));
  function t(key, vars) { const s = DICT[lang][key] ?? DICT.en[key] ?? key; return fill(s, vars); }
  function add(d) { LANGS.forEach((l) => Object.assign(DICT[l], (d && d[l]) || {})); }
  function set(l) { if (!LANGS.includes(l) || l === lang) return; lang = l; try { localStorage.setItem(KEY, l); } catch (e) {} if (document.documentElement) document.documentElement.lang = l; if (typeof renderShell === "function") renderShell(); }
  if (document.documentElement) document.documentElement.lang = lang;

  add({ en: { "lang.label": "Language" }, id: { "lang.label": "Bahasa" } });
  window.SAVERA_I18N = { t, add, set, lang: () => lang, langs: LANGS };

  /* tombol EN / ID di topbar (halaman setelah login) */
  if (typeof renderShell !== "function") return;
  const _shell = renderShell;
  renderShell = function () {
    _shell.apply(this, arguments);
    const right = document.querySelector(".topbar .tb-right");
    if (!right || right.querySelector(".lang-toggle")) return;
    right.insertAdjacentHTML("afterbegin", `<div class="lang-toggle" role="group" aria-label="${t("lang.label")}">${LANGS.map((l) => `<button type="button" data-lang="${l}" class="${l === lang ? "on" : ""}" aria-pressed="${l === lang}">${l.toUpperCase()}</button>`).join("")}</div>`);
    right.querySelectorAll("[data-lang]").forEach((b) => (b.onclick = () => set(b.dataset.lang)));
  };
})();
