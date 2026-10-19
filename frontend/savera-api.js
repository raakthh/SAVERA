/* SAVERA — lapisan data tunggal untuk Analytics & forecast (dataset v5 + hasil model Python).
   Muat SETELAH data/savera-dataset.js + data/savera-model-results.js, SEBELUM halaman yang memakainya.

   Mode:
     "mock" (default) → membaca window.SAVERA_DATASET (agregat data aktual) + window.SAVERA_MODEL_RESULTS (hasil model),
                        keduanya dibuat oleh tools/build_data.py. Jalan juga lewat file:// (tanpa fetch).
     "http"           → GET {baseUrl}/api/v1/analytics/{resource} — backend mengembalikan JSON berbentuk SAMA (kontrak di PROJECT_NOTES.md).
   Atur sebelum file ini dimuat:  window.SAVERA_API_CONFIG = { mode: "http", baseUrl: "http://localhost:8000" }

   Resource: "revenue" | "demand" | "segments" | "ops".
   UI tidak menghitung ulang model: forecast, rentang 80%, segmen, dan angka "rata-rata meleset" datang apa adanya dari sini. */
(function (root) {
  "use strict";
  const RESOURCES = ["revenue", "demand", "segments", "ops"];

  /* kunci wajib per resource (validasi kontrak ringan → state error yang jelas, bukan layar kosong) */
  const REQUIRED = {
    revenue: ["unit", "weekly.actual", "weekly.forecast", "monthly.actual", "monthly.forecast"],
    demand: ["periods", "parts", "forecast_by_part"],
    segments: ["profiles", "customers"],
    ops: ["by_action", "by_severity", "by_damage"],
  };
  const getPath = (o, p) => p.split(".").reduce((x, k) => (x == null ? undefined : x[k]), o);
  function validate(name, data) {
    if (!RESOURCES.includes(name)) return [`resource tidak dikenal: ${name}`];
    if (!data || typeof data !== "object") return ["data kosong"];
    return (REQUIRED[name] || []).filter((p) => getPath(data, p) == null).map((p) => `kolom "${p}" tidak ada`);
  }

  /* gabung aktual (dataset) + hasil model per resource; objek bersarang digabung satu tingkat */
  function merge(name, ds, md) {
    const a = (ds && ds[name]) || null, b = (md && md[name]) || null;
    if (!a && !b) return null;
    const out = Object.assign({}, a || {});
    Object.keys(b || {}).forEach((k) => {
      const x = out[k], y = b[k];
      out[k] = x && y && typeof x === "object" && typeof y === "object" && !Array.isArray(x) && !Array.isArray(y) ? Object.assign({}, x, y) : y;
    });
    out.meta = Object.assign({}, (ds && ds.meta) || {}, (md && md.meta) || {});
    return out;
  }

  function create(env) {
    const cfg = Object.assign({ mode: "mock", baseUrl: "", timeoutMs: 15000 }, (env && env.config) || {});
    const cache = {};
    const listeners = new Set();

    function fetchHttp(name) {
      const url = `${String(cfg.baseUrl).replace(/\/$/, "")}/api/v1/analytics/${encodeURIComponent(name)}`;
      const ctl = typeof AbortController !== "undefined" ? new AbortController() : null;
      const timer = ctl ? setTimeout(() => ctl.abort(), cfg.timeoutMs) : null;
      return fetch(url, { headers: { Accept: "application/json" }, signal: ctl ? ctl.signal : undefined })
        .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status} — ${url}`); return r.json(); }, (e) => { throw new Error(`${url} tidak bisa dihubungi (${(e && e.message) || e})`); })
        .finally(() => timer && clearTimeout(timer));
    }
    function fetchMock(name) {
      return new Promise((resolve, reject) => {
        const ds = env.dataset(), md = env.models();
        if (!ds && !md) return reject(new Error("data/savera-dataset.js & data/savera-model-results.js belum dimuat (jalankan tools/build_data.py)"));
        const data = merge(name, ds, md);
        if (!data) return reject(new Error(`resource "${name}" tidak ada di file data`));
        setTimeout(() => resolve(data), 0); /* tetap asinkron, sama seperti mode http */
      });
    }

    /* load(name) → Promise<data>; hasil disimpan di cache. reload: true untuk memaksa ambil ulang. */
    function load(name, opts) {
      const c = cache[name];
      if (c && !(opts && opts.reload) && (c.status === "ready" || c.status === "loading")) return c.promise;
      const entry = (cache[name] = { status: "loading", data: c ? c.data : null, error: null, promise: null });
      entry.promise = (cfg.mode === "http" ? fetchHttp(name) : fetchMock(name))
        .then((data) => {
          const problems = validate(name, data);
          if (problems.length) throw new Error("Format data tidak sesuai kontrak: " + problems.join(", "));
          Object.assign(entry, { status: "ready", data, error: null });
          return data;
        })
        .catch((err) => { Object.assign(entry, { status: "error", error: (err && err.message) || String(err) }); throw err; })
        .finally(() => listeners.forEach((fn) => { try { fn(name, entry.status); } catch (e) { /* listener UI */ } }));
      entry.promise.catch(() => {});
      return entry.promise;
    }
    /* peek(name) → { status: "idle"|"loading"|"ready"|"error", data, error } tanpa memicu load */
    const peek = (name) => { const c = cache[name]; return c ? { status: c.status, data: c.data, error: c.error } : { status: "idle", data: null, error: null }; };
    /* use(name) → peek + mulai load bila belum; dipakai fungsi render sinkron */
    const use = (name) => { const p = peek(name); if (p.status === "idle") load(name); return peek(name); };
    const onChange = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };

    return { config: cfg, resources: RESOURCES, load, peek, use, onChange, validate, merge,
      clear: () => Object.keys(cache).forEach((k) => delete cache[k]) };
  }

  const api = { create, validate, merge, RESOURCES };
  if (typeof module !== "undefined" && module.exports) { module.exports = api; return; }
  root.SAVERA_API = create({ config: root.SAVERA_API_CONFIG, dataset: () => root.SAVERA_DATASET || null, models: () => root.SAVERA_MODEL_RESULTS || null });
  root.SAVERA_API.create = create;
})(typeof window !== "undefined" ? window : globalThis);
