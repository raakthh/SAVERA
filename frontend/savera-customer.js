/* SAVERA — Customer flow: Register → Login → Profile → Add Vehicle → New Assessment
   Loads AFTER savera-v2.js. Only customer auth + customer views are replaced; every Workshop
   view, action and data structure is left as is. New records are written into the same
   SAVERA_DEMO_DATA arrays (customers / vehicles / service_requests) so the Workshop sees them.

   NOTE — photo analysis: there is no vision model in this front-end prototype. analyzePhotos()
   is a deterministic, dataset-driven simulation (complaint keywords + photo fingerprint →
   repair_costs / RAW_DATA rows). Replace only that function to plug in a real CV endpoint. */
(function () {
  const V = window.SAVERA_V2, D = window.SAVERA_DEMO;
  if (!V || !D) return;
  const { W, CUST, NAV, VIEWS, ACT } = V;
  const $ = (i) => document.getElementById(i);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const today = () => new Date().toISOString().slice(0, 10);
  const lc = (s) => String(s || "").toLowerCase();
  const pad = (n, l) => String(n).padStart(l, "0");
  const me = () => state.user.cid;
  const myVehicles = () => D.vehicles.filter((v) => v.customer_id === me());
  const hash = (str) => { let h1 = 0xdeadbeef, h2 = 0x41c6ce57; for (let i = 0; i < str.length; i++) { const c = str.charCodeAt(i); h1 = Math.imul(h1 ^ c, 2654435761); h2 = Math.imul(h2 ^ c, 1597334677); } h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909); h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909); return 4294967296 * (2097151 & h2) + (h1 >>> 0); };

  /* ---------- persistence (localStorage, always guarded) ---------- */
  const KEY = "savera.customer.v1", store = { users: [], vehicles: [], requests: [], ro: [], q: [] };
  let warned = false, syncing = false, lastWritten = null, timer = 0;
  try { const raw = localStorage.getItem(KEY); if (raw) { Object.assign(store, JSON.parse(raw)); lastWritten = raw; } } catch (e) {}
  const own = () => new Set(W.sr.filter((x) => x._src === "customer-flow").map((x) => x.service_request_id));
  const byId = (a, k) => a.slice().sort((x, y) => (x[k] < y[k] ? -1 : x[k] > y[k] ? 1 : 0));
  function persist() {
    if (syncing) return; const ids = own();
    store.requests = byId(W.sr.filter((s) => ids.has(s.service_request_id)), "service_request_id");
    store.ro = byId(W.ro.filter((r) => ids.has(r.service_request_id)), "repair_order_id");
    store.q = byId(W.q.filter((q) => ids.has(q.service_request_id)), "queue_id");
    let json; try { json = JSON.stringify(store); if (json === lastWritten) return; localStorage.setItem(KEY, json); lastWritten = json; }
    catch (e) { if (!warned) { warned = true; toast("Penyimpanan browser penuh — data hanya bertahan selama sesi ini."); } }
  }
  const persistSoon = () => { clearTimeout(timer); timer = setTimeout(persist, 250); };
  window.addEventListener("pagehide", persist);
  /* merge by id; existing objects are updated IN PLACE so every view keeps pointing at the same shared record */
  function mergeInto(arr, list, key) { let added = 0; list.forEach((x) => { const cur = arr.find((y) => y[key] === x[key]); if (cur) Object.assign(cur, x); else { arr.push({ ...x }); added++; } }); return added; }
  function hydrate() {
    store.users.forEach((u) => { if (!CUST[u.customer_id]) { const c = { customer_id: u.customer_id, customer_name: u.name, phone: u.phone, email: u.email, address: u.address, city: "", customer_type: "Individual", registration_date: u.registered, status: "Active" }; D.customers.push(c); CUST[c.customer_id] = c; } });
    mergeInto(D.vehicles, store.vehicles, "vehicle_id");
    const n = mergeInto(W.sr, store.requests, "service_request_id");
    mergeInto(W.ro, store.ro || [], "repair_order_id"); mergeInto(W.q, store.q || [], "queue_id");
    return n;
  }
  hydrate();
  /* live sync between tabs: a request submitted by a Customer in one tab shows up in an open Workshop tab */
  const LIVE = ["w-dashboard", "w-requests", "w-queue", "w-orders", "c-dashboard", "c-status", "c-assessments", "c-history", "c-detail"];
  window.addEventListener("storage", (e) => {
    if (e.key !== KEY || !e.newValue) return;
    try { const inc = JSON.parse(e.newValue); ["users", "vehicles", "requests", "ro", "q"].forEach((k) => (store[k] = inc[k] || [])); } catch (x) { return; }
    lastWritten = e.newValue; syncing = true;
    try { const n = hydrate(); if (state.role === "workshop" && n) toast(`${n} service request baru dari customer`); if (state.role && LIVE.includes(state.view)) renderContent(); } finally { syncing = false; }
  });
  /* ---------- validation ---------- */
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  function normPhone(p) { let d = String(p || "").replace(/[\s\-().]/g, ""); if (d.startsWith("+62")) d = "0" + d.slice(3); else if (d.startsWith("62")) d = "0" + d.slice(2); return d; }
  const phoneOk = (d) => /^08\d{8,12}$/.test(d);
  const phoneShow = (p) => { p = String(p || ""); return !p ? "" : p.startsWith("0") ? p : p.startsWith("62") ? "0" + p.slice(2) : "0" + p; };
  const emailTaken = (e, exceptId) => D.customers.some((c) => lc(c.email) === lc(e) && c.customer_id !== exceptId) || store.users.some((u) => lc(u.email) === lc(e) && u.customer_id !== exceptId);
  const showErrs = (errs, root) => { (root || document).querySelectorAll("[data-err]").forEach((el) => (el.textContent = errs[el.dataset.err] || "")); return Object.keys(errs).length === 0; };
  const errLine = (k) => `<div class="hint" data-err="${k}" style="color:var(--bad);min-height:0;"></div>`;

  /* ================= AUTH: Login / Register ================= */
  state.authMode = "login";
  const logo = `<div style="text-align:center;margin-bottom:18px;"><img src="assets/logo.png" alt="SAVERA Logo" style="height:84px;max-width:100%;object-fit:contain;margin:0 auto;display:block;"></div>`;
  function loginHTML() {
    const demo = D.service_requests.map((s) => s.customer_id).filter((c, i, a) => CUST[c] && a.indexOf(c) === i);
    return `${logo}<h1 style="font-size:20px;margin:0 0 4px;color:var(--navy-900);text-align:center;font-weight:700;">Welcome Back</h1>
    <p style="font-size:12.5px;color:var(--ink-500);margin:0 0 20px;text-align:center;">Sign in to your account</p>
    ${state.authNote ? `<div class="banner banner-info" style="margin-bottom:14px;"><div>${esc(state.authNote)}</div></div>` : ""}
    <div class="field"><label>Sign in as</label><select class="select" id="roleSel"><option value="customer">Customer</option><option value="workshop">Workshop</option></select></div>
    <div class="field"><label>Email</label><input class="input" id="loginEmail" type="email" autocomplete="username" placeholder="nama@email.com" value="${esc(state.prefill || "")}"></div>
    <div class="field"><label>Password</label><input class="input" id="loginPass" type="password" autocomplete="current-password" placeholder="••••••••"></div>
    <button class="btn btn-primary btn-block" id="loginBtn" style="padding:12px;font-weight:600;">Sign in</button>
    <div id="loginErr" style="color:var(--bad);font-size:12px;margin-top:10px;display:none;"></div>
    <div id="regRow" style="margin-top:14px;text-align:center;font-size:12.5px;color:var(--ink-700);">Belum punya akun? <a href="#" id="toReg" style="color:var(--cyan-500);font-weight:600;text-decoration:none;">Register</a></div>
    <div style="margin-top:18px;padding-top:16px;border-top:1px solid var(--line);">
      <div class="field" id="custF" style="margin-bottom:10px;"><label>Demo customer</label><select class="select" id="custSel">${demo.map((c) => `<option value="${c}">${esc(CUST[c].customer_name)} (${c})</option>`).join("")}</select></div>
      <button class="btn btn-ghost btn-sm" id="demoBtn" style="width:100%;">${ICONS.shield} Quick demo access</button></div>`;
  }
  function registerHTML() {
    return `${logo}<h1 style="font-size:20px;margin:0 0 4px;color:var(--navy-900);text-align:center;font-weight:700;">Create Account</h1>
    <p style="font-size:12.5px;color:var(--ink-500);margin:0 0 20px;text-align:center;">Daftar sebagai customer SAVERA</p>
    <div class="field"><label>Nama</label><input class="input" id="rgName" autocomplete="name" placeholder="Nama lengkap">${errLine("name")}</div>
    <div class="row-2"><div class="field"><label>No HP</label><input class="input" id="rgPhone" type="tel" autocomplete="tel" placeholder="0812 3456 7890">${errLine("phone")}</div>
    <div class="field"><label>Email</label><input class="input" id="rgEmail" type="email" autocomplete="email" placeholder="nama@email.com">${errLine("email")}</div></div>
    <div class="field"><label>Alamat</label><textarea class="input" id="rgAddr" autocomplete="street-address" placeholder="Jalan, nomor, kota" style="min-height:64px;"></textarea>${errLine("addr")}</div>
    <div class="field"><label>Password</label><input class="input" id="rgPass" type="password" autocomplete="new-password" placeholder="Minimal 6 karakter">${errLine("pass")}
    <label style="display:flex;align-items:center;gap:6px;font-weight:400;margin:8px 0 0;cursor:pointer;"><input type="checkbox" id="rgShow" style="accent-color:var(--navy-900);"> Tampilkan password</label></div>
    <button class="btn btn-primary btn-block" id="rgBtn" style="padding:12px;font-weight:600;">Register</button>
    <div style="margin-top:14px;text-align:center;font-size:12.5px;color:var(--ink-700);">Sudah punya akun? <a href="#" id="toLogin" style="color:var(--cyan-500);font-weight:600;text-decoration:none;">Login</a></div>`;
  }
  function paintAuth() {
    const side = document.querySelector(".login-form-side"); if (!side) return;
    const reg = state.authMode === "register";
    side.innerHTML = reg ? registerHTML() : loginHTML();
    reg ? wireRegister() : wireLogin();
  }
  function wireRegister() {
    $("toLogin").onclick = (e) => { e.preventDefault(); state.authMode = "login"; state.authNote = ""; paintAuth(); };
    $("rgShow").onchange = () => ($("rgPass").type = $("rgShow").checked ? "text" : "password");
    const go = () => {
      const name = $("rgName").value.trim().replace(/\s+/g, " "), phone = normPhone($("rgPhone").value), email = $("rgEmail").value.trim(), addr = $("rgAddr").value.trim(), pass = $("rgPass").value, errs = {};
      if (name.length < 3) errs.name = "Nama minimal 3 karakter.";
      if (!phoneOk(phone)) errs.phone = "No HP tidak valid (contoh 081234567890).";
      if (!EMAIL_RE.test(email)) errs.email = "Format email tidak valid."; else if (emailTaken(email)) errs.email = "Email sudah terdaftar.";
      if (addr.length < 8) errs.addr = "Alamat minimal 8 karakter.";
      if (pass.length < 6) errs.pass = "Password minimal 6 karakter.";
      if (!showErrs(errs)) return;
      let n = 9001; while (CUST["C" + n]) n++;
      store.users.push({ customer_id: "C" + n, name, phone, email, address: addr, pass: hash(pass), registered: today() });
      hydrate(); persist();
      state.authMode = "login"; state.prefill = email; state.authNote = "Registrasi berhasil. Silakan login dengan email dan password Anda."; paintAuth(); $("loginPass").focus();
    };
    $("rgBtn").onclick = go;
    ["rgName", "rgPhone", "rgEmail", "rgPass"].forEach((id) => $(id).addEventListener("keydown", (e) => e.key === "Enter" && go()));
    $("rgName").focus();
  }
  function wireLogin() {
    const role = $("roleSel"), email = $("loginEmail"), err = (m) => { const e = $("loginErr"); e.style.display = m ? "block" : "none"; e.textContent = m || ""; };
    const enter = (cid) => { const c = CUST[cid]; state.role = "customer"; state.user = { name: c.customer_name, role: "Customer", cid, email: c.email }; state.view = "c-profile"; state.rq = {}; state.authNote = ""; state.prefill = ""; renderShell(); };
    const sync = () => { const w = role.value === "workshop"; $("custF").style.display = w ? "none" : ""; $("regRow").style.display = w ? "none" : ""; email.value = w ? "admin@savera-workshop.co.id" : state.prefill || ""; email.placeholder = w ? "admin@savera-workshop.co.id" : "nama@email.com"; };
    role.onchange = () => { state.prefill = ""; sync(); err(""); }; sync();
    $("toReg").onclick = (e) => { e.preventDefault(); state.authMode = "register"; state.authNote = ""; paintAuth(); };
    const login = () => {
      err("");
      if (role.value === "workshop") { if (!email.value.trim()) return err("Masukkan email workshop."); state.role = "workshop"; state.user = { name: "Workshop Admin", role: "Workshop Manager", email: email.value.trim() }; state.view = "w-dashboard"; return renderShell(); }
      const em = email.value.trim(), pw = $("loginPass").value;
      if (!em || !pw) return err("Email dan password wajib diisi.");
      const u = store.users.find((x) => lc(x.email) === lc(em));
      if (!u || u.pass !== hash(pw)) return err("Email atau password salah.");
      enter(u.customer_id);
    };
    $("loginBtn").onclick = login;
    ["loginEmail", "loginPass"].forEach((id) => $(id).addEventListener("keydown", (e) => e.key === "Enter" && login()));
    $("demoBtn").onclick = () => { if (role.value === "workshop") { state.role = "workshop"; state.user = { name: "Workshop Admin", role: "Workshop Manager", email: "admin@savera-workshop.co.id" }; state.view = "w-dashboard"; return renderShell(); } enter($("custSel").value); };
  }
  const _att = attachLoginEvents;
  attachLoginEvents = function () { _att(); paintAuth(); };

  /* ================= PROFILE ================= */
  const flowSteps = () => {
    const c = CUST[me()] || {}, done = [true, true, !!(c.customer_name && c.phone && c.address), myVehicles().length > 0, V.mySR().length > 0];
    return [["Register", "/"], ["Login", "/"], ["Profile", "c-profile"], ["Add Vehicle", "c-addvehicle"], ["New Assessment", "c-request"]].map(([l, v], i) => ({ l, v, d: done[i] }));
  };
  function flowHTML() {
    const st = flowSteps(), next = st.find((s) => !s.d);
    return `<div style="display:flex;gap:6px;margin:4px 0 6px;">${st.map((s) => `<div style="flex:1;"><div style="height:6px;border-radius:4px;background:${s.d ? "var(--cyan-500)" : "#e2e8f0"};"></div><div style="font-size:11px;margin-top:5px;color:${s.d ? "var(--navy-900)" : "var(--ink-500)"};font-weight:${s.d ? 600 : 400};">${s.l}</div></div>`).join("")}</div>
    ${next && next.v !== "/" && next.v !== "c-profile" ? `<div style="margin-top:12px;"><button class="btn btn-primary btn-sm" data-nav="${next.v}">Lanjut: ${next.l}</button></div>` : ""}`;
  }
  VIEWS["c-profile"] = function () {
    const c = CUST[me()] || {};
    return `<div class="card"><div class="card-title">Progress Akun</div>${flowHTML()}</div>
    <div class="card"><div class="card-title">Profile</div><div class="card-desc">Data diri yang dipakai workshop untuk menghubungi Anda</div>
    <div class="row-2" style="margin-top:14px;"><div class="field"><label>Nama</label><input class="input" id="pfName" value="${esc(c.customer_name)}">${errLine("name")}</div>
    <div class="field"><label>No HP</label><input class="input" id="pfPhone" type="tel" value="${esc(phoneShow(c.phone))}">${errLine("phone")}</div></div>
    <div class="row-2"><div class="field"><label>Email</label><input class="input" value="${esc(c.email)}" readonly></div><div class="field"><label>Customer ID</label><input class="input" value="${esc(c.customer_id)}" readonly></div></div>
    <div class="field"><label>Alamat</label><textarea class="input" id="pfAddr" style="min-height:64px;">${esc(c.address)}</textarea>${errLine("addr")}</div>
    <div class="row-2"><div class="field"><label>Tipe</label><input class="input" value="${esc(c.customer_type)}" readonly></div><div class="field"><label>Terdaftar sejak</label><input class="input" value="${esc(c.registration_date)}" readonly></div></div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;"><button class="btn btn-primary" id="pfSave">${ICONS.check} Save Profile</button><button class="btn btn-danger" data-nav="logout">${ICONS.logout} Logout</button></div></div>`;
  };
  window.after_c_profile = function () {
    $("pfSave").onclick = () => {
      const name = $("pfName").value.trim().replace(/\s+/g, " "), phone = normPhone($("pfPhone").value), addr = $("pfAddr").value.trim(), errs = {};
      if (name.length < 3) errs.name = "Nama minimal 3 karakter.";
      if (!phoneOk(phone)) errs.phone = "No HP tidak valid (contoh 081234567890).";
      if (addr.length < 8) errs.addr = "Alamat minimal 8 karakter.";
      if (!showErrs(errs)) return;
      const c = CUST[me()], u = store.users.find((x) => x.customer_id === me());
      Object.assign(c, { customer_name: name, phone, address: addr }); if (u) Object.assign(u, { name, phone, address: addr });
      state.user.name = name; persist(); toast("Profile disimpan"); renderShell();
    };
  };

  /* ================= ADD VEHICLE ================= */
  const uniq = (a) => [...new Set(a.filter(Boolean))].sort();
  const BRANDS_ALL = () => uniq([...D.vehicles.map((v) => v.brand), ...D.spareparts.map((p) => p.brand), ...RAW_DATA.map((r) => r.brand)]);
  const modelsOf = (b) => uniq([...D.vehicles, ...D.spareparts, ...RAW_DATA].filter((x) => !b || lc(x.brand) === lc(b)).map((x) => x.model));
  const VTYPES = uniq(D.vehicles.map((v) => v.vehicle_type).concat(["Sedan", "SUV", "MPV", "Hatchback", "Pickup"])).filter((t) => t !== "Electric");
  const TRANS = ["Manual", "Automatic", "CVT"], FUELS = ["Gasoline", "Diesel", "Hybrid", "Electric"];
  const opt = (a, sel) => a.map((x) => `<option ${x === sel ? "selected" : ""}>${esc(x)}</option>`).join("");
  VIEWS["c-addvehicle"] = function () {
    const done = state.vdone;
    if (done) return `<div class="card" style="text-align:center;padding:36px;"><div style="color:var(--ok);width:44px;margin:0 auto 8px;">${ICONS.check}</div><h3 style="color:var(--navy-900);margin:0 0 6px;">${esc(done.brand)} ${esc(done.model)} · ${esc(done.plate_number)} berhasil ditambahkan</h3>
      <p style="color:var(--ink-500);margin:0 0 18px;">Langkah berikutnya: buat assessment kerusakan untuk kendaraan ini.</p>
      <div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap;"><button class="btn btn-primary" data-act="vNext" data-id="${done.vehicle_id}">Lanjut ke New Assessment</button><button class="btn btn-ghost" data-act="vMore" data-id="">Tambah kendaraan lain</button><button class="btn btn-ghost" data-nav="c-vehicles">My Vehicles</button></div></div>`;
    return `<div class="card"><div class="card-title">Add Vehicle</div><div class="card-desc">Kendaraan akan tertaut ke akun Anda dan bisa dipilih saat membuat assessment</div>
    <div class="row-3" style="margin-top:14px;"><div class="field"><label>Jenis</label><select class="select" id="avType">${opt(VTYPES)}</select></div>
    <div class="field"><label>Brand</label><input class="input" id="avBrand" list="dlBrand" placeholder="mis. Toyota" autocomplete="off"><datalist id="dlBrand">${BRANDS_ALL().map((b) => `<option value="${esc(b)}">`).join("")}</datalist>${errLine("brand")}</div>
    <div class="field"><label>Model</label><input class="input" id="avModel" list="dlModel" placeholder="mis. Avanza" autocomplete="off"><datalist id="dlModel">${modelsOf("").map((b) => `<option value="${esc(b)}">`).join("")}</datalist>${errLine("model")}</div></div>
    <div class="row-3"><div class="field"><label>Tahun</label><input class="input" id="avYear" type="number" min="1990" max="${new Date().getFullYear() + 1}" placeholder="${new Date().getFullYear() - 3}">${errLine("year")}</div>
    <div class="field"><label>Plat</label><input class="input" id="avPlate" placeholder="L 1234 ABC" autocomplete="off" style="text-transform:uppercase;">${errLine("plate")}</div>
    <div class="field"><label>Transmisi</label><select class="select" id="avTrans">${opt(TRANS, "Automatic")}</select></div></div>
    <div class="row-3"><div class="field"><label>Fuel</label><select class="select" id="avFuel">${opt(FUELS)}</select></div></div>
    <div style="display:flex;gap:8px;"><button class="btn btn-primary" id="avSave">${ICONS.plus} Save Vehicle</button><button class="btn btn-ghost" data-nav="c-vehicles">Batal</button></div></div>`;
  };
  ACT.vMore = () => { state.vdone = null; renderContent(); };
  ACT.vNext = (id) => { state.rq = { vid: id }; state.view = "c-request"; renderShell(); };
  window.after_c_addvehicle = function () {
    if (!$("avSave")) return;
    $("avBrand").oninput = () => { $("dlModel").innerHTML = modelsOf($("avBrand").value.trim()).map((b) => `<option value="${esc(b)}">`).join(""); };
    $("avSave").onclick = () => {
      const brand = $("avBrand").value.trim(), model = $("avModel").value.trim(), year = parseInt($("avYear").value, 10), raw = $("avPlate").value.toUpperCase().trim(), m = raw.match(/^([A-Z]{1,2})\s*(\d{1,4})\s*([A-Z]{0,3})$/), errs = {};
      if (!brand) errs.brand = "Brand wajib diisi.";
      if (!model) errs.model = "Model wajib diisi.";
      if (!(year >= 1990 && year <= new Date().getFullYear() + 1)) errs.year = `Tahun 1990–${new Date().getFullYear() + 1}.`;
      const plate = m ? `${m[1]} ${m[2]}${m[3] ? " " + m[3] : ""}` : "";
      if (!m) errs.plate = "Format plat tidak valid (contoh B 1234 XYZ)."; else if (D.vehicles.some((v) => v.plate_number.replace(/\s/g, "") === plate.replace(/\s/g, ""))) errs.plate = "Plat sudah terdaftar.";
      if (!showErrs(errs)) return;
      const canon = (list, v) => (list.find((x) => lc(x) === lc(v)) || v);
      const max = D.vehicles.reduce((a, v) => Math.max(a, parseInt(String(v.vehicle_id).replace(/\D/g, ""), 10) || 0), 0);
      const veh = { vehicle_id: "VH" + pad(max + 1, 4), customer_id: me(), plate_number: plate, brand: canon(BRANDS_ALL(), brand), model: canon(modelsOf(""), model), year, vehicle_type: $("avType").value, transmission: $("avTrans").value, fuel_type: $("avFuel").value };
      D.vehicles.push(veh); store.vehicles.push(veh); persist(); state.vdone = veh; toast("Kendaraan ditambahkan"); renderContent();
    };
  };
  VIEWS["c-vehicles"] = function () {
    const has = myVehicles().length > 0;
    return (has ? "" : `<div class="banner banner-info" style="margin-bottom:16px;"><div>Belum ada kendaraan di akun Anda. <button class="btn btn-primary btn-sm" data-nav="c-addvehicle" style="margin-left:8px;">${ICONS.plus} Add Vehicle</button></div></div>`) +
      V.lv("cv", { title: "My Vehicles", desc: "Registered vehicles linked to your account", fk: "brand", fl: "brands", sk: "brand",
        head: `<button class="btn btn-primary btn-sm" data-nav="c-addvehicle">${ICONS.plus} Add Vehicle</button>`,
        cols: [{ k: "plate", l: "Plat", m: 1 }, { k: "brand", l: "Brand" }, { k: "model", l: "Model" }, { k: "year", l: "Tahun" }, { k: "type", l: "Jenis" }, { k: "trans", l: "Transmisi" }, { k: "fuel", l: "Fuel" }, { k: "reqs", l: "Assessments" }],
        rows: () => myVehicles().map((v) => ({ id: v.vehicle_id, plate: v.plate_number, brand: v.brand, model: v.model, year: v.year, type: v.vehicle_type, trans: v.transmission, fuel: v.fuel_type, reqs: W.sr.filter((s) => s.vehicle_id === v.vehicle_id).length })),
        act: (r) => V.btn("newreq", r.id, "New assessment", "btn-primary") });
  };

  /* ================= PHOTO ANALYSIS (simulated, dataset-driven) ================= */
  const KW_PART = [[/spion|side ?mirror|mirror/, "Side Mirror"], [/kaca depan|kaca mobil|windshield|windscreen|\bkaca\b/, "Windshield"], [/lampu belakang|lampu rem|stop ?lamp|tail ?(lamp|light)/, "Tail Lamp"], [/lampu depan|lampu utama|head ?(lamp|light)|\blampu\b/, "Headlamp"],
    [/bumper belakang|rear bumper/, "Rear Bumper"], [/bumper depan|front bumper|\bbumper\b/, "Front Bumper"], [/kap mesin|\bkap\b|hood|bonnet/, "Hood"], [/bagasi|trunk/, "Trunk"], [/atap|roof/, "Roof"], [/grille|\bgril\b|grill/, "Grille"],
    [/spakbor belakang|fender belakang|rear fender/, "Rear Fender"], [/spakbor|fender|sayap/, "Front Fender"], [/pintu belakang|rear door/, "Rear Door"], [/pintu|door/, "Front Door"], [/quarter|body samping|panel samping/, "Quarter Panel"]];
  const KW_DMG = [[/tabrak|nabrak|benturan|kecelakaan|collision/, "Collision Damage"], [/pecah|patah|hancur|lepas|broken/, "Broken"], [/retak|rengat|crack/, "Crack"], [/penyok|ringsek|cekung|dent/, "Dent"], [/baret|gores|lecet|tergores|scratch/, "Scratch"], [/\bcat\b|pudar|mengelupas|kusam|belang|paint/, "Paint Damage"]];
  const KW_SEV = [[/parah|berat|hancur|besar|severe/, "Severe"], [/ringan|kecil|tipis|halus|minor/, "Minor"]];
  const first = (t, kw) => { const h = kw.find(([re]) => re.test(t)); return h ? h[1] : null; };
  const mode = (a) => { const c = {}; a.forEach((x) => (c[x] = (c[x] || 0) + 1)); return Object.entries(c).sort((x, y) => y[1] - x[1] || (x[0] < y[0] ? -1 : 1))[0][0]; };
  /* Defaults when the complaint names no part / damage type: most frequent value in the dataset (deterministic, no randomness). */
  const DEF = { area: mode(D.service_requests.map((s) => s.initial_damage_area)), type: mode(D.repair_costs.map((r) => r.damage_type)), sev: "Moderate" };
  function serviceFor(area, action, dtype) {
    if (action === "Replace") return "Part Replacement";
    if (action === "Repaint" || dtype === "Paint Damage") return "Paint Repair";
    const t = {}; D.service_requests.filter((s) => lc(s.initial_damage_area) === lc(area)).forEach((s) => (t[s.service_type] = (t[s.service_type] || 0) + 1));
    const top = Object.entries(t).sort((a, b) => b[1] - a[1])[0];
    return top ? top[0] : lc(area) === "windshield" ? "Glass Repair" : "Body Repair";
  }
  /* Same formula the Workshop uses on its Assessment page (savera-v2.js), so both sides show identical cost. */
  const workshopCost = (rc, action) => (action === "Replace" ? rc.spare_part_cost : 0) + rc.labor_cost + (action === "Repair" ? 0 : rc.painting_cost) + rc.additional_cost;
  function analyzePhotos({ vehicle, complaint }) {
    const t = lc(complaint), hp = first(t, KW_PART), hd = first(t, KW_DMG), hs = first(t, KW_SEV), area = hp || DEF.area, type = hd || DEF.type;
    let sev = hs || DEF.sev, cv;
    for (let k = 0; k < 4; k++) { cv = V.cvAnalyze({ brand: vehicle.brand, initial_damage_area: area, initial_damage_type: type, initial_severity: sev }); if (cv.severity === sev) break; sev = cv.severity; } /* settle on the row the Workshop will also pick */
    const rc = cv.rc;
    return { area, type, severity: cv.severity, pct: cv.pct, service: serviceFor(area, cv.action, type), conf: cv.conf, cost: workshopCost(rc, cv.action), min: rc.cost_min, max: rc.cost_max, action: cv.action, ref: rc.repair_cost_id, guessed: { area: !hp, type: !hd } };
  }
  /* ---- image intake: validate, downscale (keeps storage small), fingerprint ---- */
  const MAXP = 6;
  function readPhoto(file) {
    return new Promise((res, rej) => {
      if (!/^image\//.test(file.type)) return rej(new Error(`${file.name}: bukan file gambar.`));
      if (file.size > 12 * 1048576) return rej(new Error(`${file.name}: lebih dari 12 MB.`));
      const url = URL.createObjectURL(file), img = new Image();
      img.onload = () => { const k = Math.min(1, 800 / Math.max(img.width, img.height)), c = document.createElement("canvas"); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k); c.getContext("2d").drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url); res({ name: file.name, data: c.toDataURL("image/jpeg", 0.72) }); };
      img.onerror = () => { URL.revokeObjectURL(url); rej(new Error(`${file.name}: gambar tidak bisa dibaca.`)); };
      img.src = url;
    });
  }

  /* ================= RESULT PANEL (photo always shown) ================= */
  const G = (state.gal = state.gal || {});
  const bar = (v, c) => `<div style="height:7px;border-radius:5px;background:#e8edf4;margin-top:6px;overflow:hidden;"><div style="height:100%;width:${Math.round(v)}%;background:${c};border-radius:5px;"></div></div>`;
  const kv = (l, v) => `<div class="sv-kv"><div class="sv-k">${l}</div><div class="sv-v">${v}</div></div>`;
  /* Rantai hasil assessment: Damage Area → Damage Type → Severity → Damage % → Repair Action (dipakai Customer & Workshop) */
  const chainHTML = (r, cap) => { const st = [["Damage Area", esc(r.area)], ["Damage Type", esc(r.type)], ["Severity", V.bsev(r.severity)], ["Damage %", Math.round(r.pct) + "%"], ["Repair Action", esc(r.action || "–")]];
    return `<div class="sv-chain-wrap">${cap ? `<div class="sv-chain-cap">${esc(cap)}</div>` : ""}<div class="sv-chain">${st.map(([l, v], i) => `<div class="sv-step"><div class="sv-sl">${l}</div><div class="sv-sv">${v}</div></div>${i < 4 ? '<span class="sv-arrow" aria-hidden="true">→</span>' : ""}`).join("")}</div></div>`; };
  V.chain = chainHTML;
  function resultHTML(key, photos, r, sim) {
    const i = Math.min(G[key] || 0, Math.max(0, photos.length - 1)), main = photos.length
      ? `<div class="sv-viewer"><img src="${photos[i]}" alt="Foto kendaraan ${i + 1}"><span class="sv-tag">${ICONS.warn} ${esc(r.area)}</span></div>
         ${photos.length > 1 ? `<div class="sv-thumbs">${photos.map((p, k) => `<button type="button" class="sv-thumb ${k === i ? "on" : ""}" data-gal="${key}" data-i="${k}" aria-label="Foto ${k + 1}"><img src="${p}" alt=""></button>`).join("")}</div>` : ""}`
      : `<div class="sv-viewer sv-none"><div>${ICONS.upload}<div>Foto tidak tersedia<br><span style="font-size:11px;">(data demo tanpa foto)</span></div></div></div>`;
    return `${chainHTML(r, "Hasil assessment")}<div class="sv-result"><div>${main}</div><div>
      <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:4px;flex-wrap:wrap;"><b style="color:var(--navy-900);">Hasil Assessment</b>${sim ? `<span class="sv-chip" title="Belum memakai model vision sungguhan; hasil diturunkan dari dataset SAVERA">Simulasi CV · berbasis dataset</span>` : ""}</div>
      ${kv("Damage Area", esc(r.area))}${kv("Damage Type", esc(r.type))}${kv("Severity", V.bsev(r.severity))}
      ${kv("Damage %", `<b>${Math.round(r.pct)}%</b>${bar(r.pct, r.pct >= 55 ? "var(--bad)" : r.pct >= 30 ? "#F2A541" : "var(--cyan-500)")}`)}
      ${kv("Service Type", esc(r.service))}${kv("Confidence", `<b>${Math.round(r.conf * 100)}%</b>${bar(r.conf * 100, "var(--navy-900)")}`)}
      ${kv("Initial Estimate", `<span style="font-size:12.5px;color:var(--ink-500);">${fmtIDR(r.cost)} · perkiraan awal. Tagihan final (Customer Bill) muncul setelah workshop memverifikasi.</span>`)}
    ${hintHTML(r)}</div></div>`;
  }
  const hintHTML = (r) => (r.guessed && (r.guessed.area || r.guessed.type) ? `<div class="banner banner-warn" style="margin-top:12px;"><div>${r.guessed.area ? "Bagian" : ""}${r.guessed.area && r.guessed.type ? " dan jenis" : r.guessed.type ? "Jenis" : ""} kerusakan tidak terbaca dari keluhan, jadi memakai nilai referensi dataset. Sebutkan bagian &amp; jenis kerusakan agar hasil lebih tepat.</div></div>` : "");
  function wireGallery() { document.querySelectorAll("[data-gal]").forEach((b) => (b.onclick = () => { G[b.dataset.gal] = +b.dataset.i; renderContent(); })); }
  const assessmentOf = (s) => { if (s.assessment) return s.assessment; const cv = V.cvAnalyze(s); return { area: s.initial_damage_area, type: s.initial_damage_type, severity: s.initial_severity, pct: cv.pct, service: s.service_type, conf: cv.conf, cost: s.initial_estimated_cost, min: cv.rc.cost_min, max: cv.rc.cost_max, action: cv.action }; };

  /* ================= NEW ASSESSMENT ================= */
  const nextSR = () => "SR" + pad(W.sr.reduce((a, s) => Math.max(a, parseInt(String(s.service_request_id).replace(/\D/g, ""), 10) || 0), 0) + 1, 4);
  function runAnalysis() {
    const rq = state.rq, v = D.vehicles.find((x) => x.vehicle_id === rq.vid);
    rq.result = null; rq.lastNote = rq.note || ""; const tok = (rq.tok = (rq.tok || 0) + 1);
    if (!v || !(rq.photos || []).length) { rq.busy = false; return renderContent(); }
    rq.busy = true; renderContent();
    setTimeout(() => { if (state.rq !== rq || rq.tok !== tok) return; rq.result = analyzePhotos({ vehicle: v, complaint: rq.note || "", photos: rq.photos }); rq.busy = false; renderContent(); }, 900);
  }
  VIEWS["c-request"] = function () {
    const rq = state.rq || (state.rq = {}), vs = myVehicles();
    if (rq.done) { const s = W.sr.find((x) => x.service_request_id === rq.done);
      return `<div class="card"><div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;"><div style="color:var(--ok);width:34px;">${ICONS.check}</div><div style="flex:1;min-width:200px;"><div style="font-weight:700;color:var(--navy-900);">Assessment ${rq.done} terkirim — sudah tampil di Workshop › Service Requests</div><div style="font-size:12.5px;color:var(--ink-500);">${esc(s.brand)} ${esc(s.model)} · ${esc(s.plate_number)} — ${esc(s.customer_complaint)}</div></div>${V.bs(s.request_status)}</div></div>
      <div class="card">${resultHTML("done", s.photos || [], assessmentOf(s), !!s.assessment)}</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;"><button class="btn btn-primary" data-nav="c-status">Track Repair Status</button><button class="btn btn-ghost" data-act="viewas" data-id="${rq.done}">Lihat detail</button><button class="btn btn-ghost" data-act="naNew" data-id="">Assessment baru</button></div>`; }
    if (!vs.length) return `<div class="card" style="text-align:center;padding:36px;"><h3 style="color:var(--navy-900);margin:0 0 6px;">Belum ada kendaraan</h3><p style="color:var(--ink-500);margin:0 0 16px;">Tambahkan kendaraan dulu sebelum membuat assessment.</p><button class="btn btn-primary" data-nav="c-addvehicle">${ICONS.plus} Add Vehicle</button></div>`;
    const ph = rq.photos || [];
    return `<div class="card"><div class="card-title">New Assessment</div><div class="card-desc">Pilih kendaraan → tulis keluhan → upload foto. Hasil analisis muncul otomatis setelah foto diupload.</div>
    <div class="field" style="margin-top:14px;"><label>1. Pilih kendaraan</label><select class="select" id="naV"><option value="">Pilih kendaraan…</option>${vs.map((x) => `<option value="${x.vehicle_id}" ${x.vehicle_id === rq.vid ? "selected" : ""}>${esc(x.brand)} ${esc(x.model)} ${x.year} · ${esc(x.plate_number)}</option>`).join("")}</select></div>
    <div class="field"><label>2. Keluhan</label><textarea class="input" id="naC" placeholder="Contoh: bumper depan penyok setelah tertabrak, cat baret di sisi kiri">${esc(rq.note || "")}</textarea><div class="hint">Sebutkan bagian dan jenis kerusakan agar analisis lebih akurat.</div></div>
    <div class="field"><label>3. Upload foto (${ph.length}/${MAXP})</label>
      <label class="sv-drop" for="naF">${ICONS.upload}<div><b>Klik untuk memilih foto</b> atau tarik ke sini</div><div style="font-size:11.5px;color:var(--ink-500);">JPG / PNG, maksimal ${MAXP} foto</div></label><input type="file" id="naF" accept="image/*" multiple hidden>
      ${ph.length ? `<div class="sv-thumbs" style="margin-top:10px;">${ph.map((p, k) => `<div class="sv-thumb" style="position:relative;"><img src="${p.data}" alt="${esc(p.name)}"><button type="button" class="sv-rm" data-rm="${k}" aria-label="Hapus foto ${k + 1}">×</button></div>`).join("")}</div>` : ""}</div>
    ${rq.busy ? `<div class="banner banner-info" style="margin:6px 0 14px;"><span class="sv-spin"></span><div>Menganalisis ${ph.length} foto…</div></div>` : ""}
    ${!rq.busy && ph.length && !rq.vid ? `<div class="banner banner-warn" style="margin:6px 0 14px;"><div>Pilih kendaraan untuk menampilkan hasil analisis.</div></div>` : ""}
    ${rq.result ? `<div style="margin:6px 0 16px;">${resultHTML("rq", ph.map((p) => p.data), rq.result, true)}</div>` : ""}
    <button class="btn btn-primary" id="naSubmit" ${rq.result && !rq.busy ? "" : "disabled"}>${ICONS.check} Submit Assessment</button></div>`;
  };
  ACT.naNew = () => { state.rq = {}; renderContent(); };
  window.after_c_request = function () {
    const rq = state.rq; if (!$("naV")) return;
    const drop = document.querySelector(".sv-drop");
    $("naV").onchange = () => { rq.vid = $("naV").value; runAnalysis(); };
    $("naC").oninput = () => (rq.note = $("naC").value);
    $("naC").onchange = () => { rq.note = $("naC").value; if (rq.note !== rq.lastNote && (rq.photos || []).length && rq.vid) setTimeout(() => state.rq === rq && runAnalysis(), 0); };
    const add = async (files) => {
      const list = [...files]; if (!list.length) return;
      rq.note = $("naC").value; rq.vid = $("naV").value;
      const room = MAXP - (rq.photos || []).length; if (room <= 0) return toast(`Maksimal ${MAXP} foto.`);
      const ok = []; for (const f of list.slice(0, room)) { try { ok.push(await readPhoto(f)); } catch (e) { toast(e.message); } }
      if (list.length > room) toast(`Hanya ${room} foto pertama yang diambil.`);
      if (!ok.length) return;
      rq.photos = (rq.photos || []).concat(ok); G.rq = 0;
      if (!rq.vid) toast("Pilih kendaraan untuk melihat hasil analisis.");
      runAnalysis();
    };
    $("naF").onchange = (e) => add(e.target.files);
    ["dragover", "dragenter"].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add("over"); }));
    ["dragleave", "drop"].forEach((ev) => drop.addEventListener(ev, () => drop.classList.remove("over")));
    drop.addEventListener("drop", (e) => { e.preventDefault(); add(e.dataTransfer.files); });
    document.querySelectorAll("[data-rm]").forEach((b) => (b.onclick = () => { rq.note = $("naC").value; rq.photos.splice(+b.dataset.rm, 1); G.rq = 0; runAnalysis(); }));
    wireGallery();
    $("naSubmit").onclick = () => {
      rq.note = $("naC").value.trim(); const v = D.vehicles.find((x) => x.vehicle_id === rq.vid);
      if (!v) return toast("Pilih kendaraan terlebih dahulu.");
      if (rq.note.length < 5) return toast("Tulis keluhan minimal 5 karakter.");
      if (!rq.photos || !rq.photos.length || !rq.result) return toast("Upload foto kendaraan terlebih dahulu.");
      const r = rq.result, id = nextSR();
      W.sr.push({ service_request_id: id, request_date: today(), customer_id: me(), vehicle_id: v.vehicle_id, brand: v.brand, model: v.model, year: v.year, plate_number: v.plate_number, customer_complaint: rq.note, service_type: r.service, photo_count: rq.photos.length, initial_damage_area: r.area, initial_damage_type: r.type, initial_severity: r.severity, initial_estimated_cost: r.cost, request_status: "Submitted", workshop_notes: "", photos: rq.photos.map((p) => p.data), assessment: r, _src: "customer-flow" });
      persist(); state.rq = { done: id }; G.done = 0; toast(`Assessment ${id} terkirim`); renderContent();
    };
  };

  /* ================= WORKSHOP: Service Requests (same records as Customer) ================= */
  VIEWS["w-requests"] = function () {
    const rec = (id) => W.sr.find((x) => x.service_request_id === id);
    return V.lv("wr", { title: "Service Requests", desc: "Incoming requests from customers — same record the customer submitted (photo, damage, severity, cost, status)", fk: "status", fl: "statuses", sk: "date", sd: "desc",
      cols: [{ k: "id", l: "Request", m: 1 }, { k: "date", l: "Date" }, { k: "customer", l: "Customer", f: (r) => `<b style="color:var(--navy-900);">${esc(r.customer)}</b>${r.phone ? `<div style="font-size:11px;color:var(--ink-500);">${esc(r.phone)}</div>` : ""}` }, { k: "vehicle", l: "Vehicle" },
        { k: "photos", l: "Photo", f: (r) => { const s = rec(r.id), p = s && s.photos && s.photos[0]; return p ? `<img class="sv-mini" src="${p}" alt="Foto ${esc(r.id)}"><span style="font-size:11px;color:var(--ink-500);margin-left:6px;">${r.photos}</span>` : r.photos; } },
        { k: "area", l: "Area" }, { k: "dmg", l: "Damage" }, { k: "pct", l: "Damage %", f: (r) => (r.pct == null ? "–" : r.pct + "%") }, { k: "sev", l: "Severity", f: (r) => V.bsev(r.sev) }, { k: "cost", l: "Est. Cost", m: 1, f: (r) => fmtIDR(r.cost) }, { k: "status", l: "Status", f: (r) => V.bs(r.status) }],
      rows: () => W.sr.map((s) => { const c = CUST[s.customer_id] || {}, a = s.assessment; return { id: s.service_request_id, date: s.request_date, customer: c.customer_name || s.customer_id, phone: s._src ? phoneShow(c.phone) : "", vehicle: `${s.brand} ${s.model} · ${s.plate_number}`, area: s.initial_damage_area, dmg: s.initial_damage_type, pct: a ? a.pct : null, sev: s.initial_severity, cost: s.initial_estimated_cost, photos: (s.photos || []).length || s.photo_count, status: s.request_status }; }),
      act: (r) => V.btn("assess", r.id, "Assess", ["Submitted", "Under Assessment", "Approved"].includes(r.status) && !V.roOf(r.id) ? "btn-primary" : "btn-ghost") });
  };

  /* ================= MY ASSESSMENTS + DETAIL ================= */
  VIEWS["c-assessments"] = function () {
    return V.lv("ca", { title: "My Assessments", desc: "Semua assessment Anda, lengkap dengan foto dan hasil analisis", fk: "status", fl: "statuses", sk: "date", sd: "desc",
      head: `<button class="btn btn-primary btn-sm" data-nav="c-request">${ICONS.plus} New Assessment</button>`,
      cols: [{ k: "id", l: "Request", m: 1 }, { k: "date", l: "Tanggal" }, { k: "vehicle", l: "Kendaraan" }, { k: "area", l: "Damage Area" }, { k: "dmg", l: "Damage Type" }, { k: "sev", l: "Severity", f: (r) => V.bsev(r.sev) }, { k: "cost", l: "Est. Cost", m: 1, f: (r) => fmtIDR(r.cost) }, { k: "photos", l: "Foto" }, { k: "status", l: "Status", f: (r) => V.bs(r.status) }],
      rows: () => V.mySR().map((s) => ({ id: s.service_request_id, date: s.request_date, vehicle: `${s.brand} ${s.model} · ${s.plate_number}`, area: s.initial_damage_area, dmg: s.initial_damage_type, sev: s.initial_severity, cost: s.initial_estimated_cost, photos: (s.photos || []).length, status: V.statusLabel ? V.statusLabel(s) : s.request_status })),
      act: (r) => V.btn("viewas", r.id, "View", "btn-primary") });
  };
  ACT.viewas = (id) => { state.did = id; G.det = 0; state.view = "c-detail"; renderShell(); };
  VIEWS["c-detail"] = function () {
    const s = V.mySR().find((x) => x.service_request_id === state.did);
    if (!s) return `<div class="card"><div class="empty-state">${ICONS.search}<div>Assessment tidak ditemukan.</div></div><button class="btn btn-ghost btn-sm" data-nav="c-assessments">← Kembali</button></div>`;
    return `<div class="card"><div class="card-title" style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;"><span>Assessment ${esc(s.service_request_id)}</span>${V.bs(s.request_status)}</div>
    <div class="row-3" style="margin:12px 0;">${[["Kendaraan", `${s.brand} ${s.model} ${s.year}`], ["Plat", s.plate_number], ["Tanggal", s.request_date], ["Keluhan", s.customer_complaint], ["Service Type", s.service_type], ["Catatan workshop", s.workshop_notes || "–"]].map(([l, v]) => `<div><div style="font-size:11px;color:var(--ink-500);">${l}</div><div style="font-weight:600;color:var(--navy-900);">${esc(v)}</div></div>`).join("")}</div>${V.stepper(s.request_status, s)}</div>
    ${V.findings && V.findings.has(s) ? (V.decision ? V.decision.customerBanner(s) : "") + V.findings.html(s, "customer") + (V.costing ? V.costing.html(s, "customer") : "") /* Tahap 3–5 (read-only) */ : `<div class="card">${resultHTML("det", s.photos || [], assessmentOf(s), !!s.assessment)}</div>
    ${(() => { const ro = V.roOf(s.service_request_id), q = ro && V.qOf(ro.repair_order_id); return ro ? `<div class="card"><div class="card-title">Verifikasi Workshop</div><div class="row-3" style="margin-top:12px;">${[["Repair Order", ro.repair_order_id], ["Tindakan", ro.repair_action], ["Severity terverifikasi", ro.severity], ["Total Amount", fmtIDR(ro.estimated_repair_cost)], ["Estimasi durasi", ro.estimated_repair_days + " hari"], ["Antrian", q ? "#" + q.queue_number : "–"]].map(([l, v]) => `<div><div style="font-size:11px;color:var(--ink-500);">${l}</div><div style="font-weight:600;color:var(--navy-900);">${esc(v)}</div></div>`).join("")}</div></div>${V.billHTML ? V.billHTML(s, ro) : ""}` : ""; })()}`}
    <button class="btn btn-ghost btn-sm" data-nav="c-assessments">← Kembali ke My Assessments</button>`;
  };
  window.after_c_detail = function () { wireGallery(); const s = V.mySR().find((x) => x.service_request_id === state.did); if (s && V.findings && V.findings.has(s)) { V.findings.wire(s, "customer"); if (V.costing) V.costing.wire(s, "customer"); } };

  /* ================= nav / titles / routing ================= */
  NAV.customer.splice(0, NAV.customer.length, ["c-dashboard", "Dashboard", "dashboard"], ["c-profile", "Profile", "settings"], ["c-addvehicle", "Add Vehicle", "plus"], ["c-vehicles", "My Vehicles", "car"], ["c-request", "New Assessment", "upload"], ["c-assessments", "My Assessments", "report"], ["c-status", "Repair Status", "wrench"], ["c-history", "Service History", "history"]);
  Object.assign(PAGE_META, { "c-profile": ["Profile", "Data diri dan progres akun Anda"], "c-addvehicle": ["Add Vehicle", "Daftarkan kendaraan Anda"], "c-vehicles": ["My Vehicles", "Vehicles registered to your account"], "c-request": ["New Assessment", "Pilih kendaraan, tulis keluhan, upload foto"], "c-assessments": ["My Assessments", "Riwayat assessment dan hasil analisis"], "c-detail": ["Assessment Detail", "Foto dan hasil analisis kerusakan"] });
  const _rc2 = renderContent;
  renderContent = function () { _rc2(); if (!syncing && state.role) persistSoon(); };
  const _hn = handleNav;
  handleNav = function (id) { if (id === "logout") { persist(); state.authMode = "login"; state.authNote = ""; state.prefill = ""; } if (id === "c-addvehicle") state.vdone = null; _hn(id); };

  V.analyzePhotos = analyzePhotos; /* exposed for verification */

  /* initial paint: v2 rendered the stock login before this file loaded */
  state.view = "login"; state.role = null; renderShell();
})();
