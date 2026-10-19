#!/usr/bin/env python3
"""SAVERA - build lapisan data untuk frontend (mode "mock" savera-api.js).

Jalankan dari folder frontend:   python3 tools/build_data.py
Masukan : data/*.csv (dataset v5)  +  modeling/* (hasil model Python: forecast & segmentasi)
Keluaran: data/savera-dataset.js        -> window.SAVERA_DATASET        (agregat data aktual)
          data/savera-model-results.js  -> window.SAVERA_MODEL_RESULTS  (hasil model, apa adanya)

Skrip ini TIDAK melatih atau menghitung ulang model. Yang dilakukan:
  - merangkum data aktual (jumlah per minggu/bulan, per part, per jenis) dengan aturan yang sama
    seperti laporan_modeling.md (minggu mulai Senin; repair order bukan Cancelled dan quantity_required > 0),
  - menyalin hasil model (forecast, rentang 80%, segmentasi, WAPE walk-forward untuk teks "rata-rata meleset"),
  - rentang 80% per part_id = rentang TOTAL x porsi part_id (cara yang sama dengan forecast per part_id
    dari tim model: total x porsi). Ditandai "band_source" agar UI bisa menjelaskannya.
Bentuk JSON keluaran = kontrak API (lihat PROJECT_NOTES.md); backend nanti cukup mengembalikan bentuk yang sama.
Hanya pustaka standar Python.
"""
import csv, json, os, sys, datetime as dt
from collections import defaultdict

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
DATA = os.path.join(ROOT, "data")
MODEL = os.path.join(ROOT, "modeling")


def rd(folder, name, required=True):
    p = os.path.join(folder, name)
    if not os.path.exists(p):
        if required:
            sys.exit(f"[build_data] file wajib tidak ada: {p}")
        return None
    with open(p, newline="", encoding="utf-8-sig") as f:
        return list(csv.DictReader(f))


def num(v, default=0.0):
    try:
        return float(v)
    except (TypeError, ValueError):
        return default


def r2(v, n=4):
    return None if v is None else round(v, n)


def d(s):
    return dt.date.fromisoformat(str(s)[:10])


def monday(x):
    return x - dt.timedelta(days=x.weekday())


def ym(x):
    return f"{x.year}-{x.month:02d}"


def months_between(a, b):
    out, (y, m) = [], map(int, a.split("-"))
    while f"{y}-{m:02d}" <= b:
        out.append(f"{y}-{m:02d}")
        m += 1
        if m > 12:
            m, y = 1, y + 1
    return out


def moving_avg(vals, k):
    out = []
    for i in range(len(vals)):
        w = vals[max(0, i - k + 1): i + 1]
        out.append(r2(sum(w) / len(w)) if len(w) == k else None)
    return out


def first_existing(*names):
    for n in names:
        if os.path.exists(os.path.join(MODEL, n)):
            return n
    return None


# ------------------------------------------------------------------ dataset v5
customers = rd(DATA, "customer_master.csv")
invoices = rd(DATA, "invoices.csv")
ros = rd(DATA, "repair_orders.csv")
inventory = rd(DATA, "inventory.csv")
pos = rd(DATA, "purchase_orders.csv")
txs = rd(DATA, "inventory_transactions.csv")
srs = rd(DATA, "service_requests.csv")

# ------------------------------------------------------------------ hasil model
f_rev_w = rd(MODEL, "forecast_pendapatan_mingguan.csv")
f_rev_m = rd(MODEL, "forecast_pendapatan_bulanan.csv")
f_dem_vp = rd(MODEL, "forecast_demand_bulanan.csv")
f_dem_pid_name = first_existing("forecast_demand_bulanan_per_part_id.csv", "forecast_demand_bulanan_per_part_id_INFORMASI.csv")
f_dem_pid = rd(MODEL, f_dem_pid_name) if f_dem_pid_name else None
seg_cust = rd(MODEL, "segmentasi_pelanggan.csv")
seg_prof = rd(MODEL, "profil_segmen.csv")
metrics = rd(MODEL, "metrik_utama.csv")
# opsional: prediksi backtest dari tim model (belum ada di folder hasil saat ini)
bt_rev_m = rd(MODEL, "backtest_pendapatan_bulanan.csv", required=False)
bt_rev_w = rd(MODEL, "backtest_pendapatan_mingguan.csv", required=False)
bt_dem_pid = rd(MODEL, "backtest_demand_bulanan_per_part_id.csv", required=False)


def metric(level, cakupan_prefix="walk-forward"):
    for m in metrics:
        if m["level"].startswith(level) and m["cakupan"].startswith(cakupan_prefix):
            return {"wape_pct": r2(num(m["WAPE"]), 2), "mape_pct": r2(num(m["MAPE"]), 2), "bias_pct": r2(num(m["Bias_pct"]), 2), "scope": m["cakupan"], "n": int(num(m["n"]))}
    return None


# ================================================================== revenue (Rp juta, sama dengan model)
JT = 1e6
inv_rows = [(d(i["invoice_date"]), num(i["total_amount"])) for i in invoices if i.get("invoice_date")]
first_inv, last_inv = min(x for x, _ in inv_rows), max(x for x, _ in inv_rows)
first_fc_week = d(min(r["week_start"] for r in f_rev_w))
first_fc_month = min(r["periode"] for r in f_rev_m)

wk = defaultdict(float)
for x, v in inv_rows:
    wk[monday(x)] += v
start_w = monday(first_inv) + (dt.timedelta(days=7) if first_inv.weekday() != 0 else dt.timedelta(0))  # minggu penuh pertama
weeks = []
w = start_w
while w < first_fc_week and w + dt.timedelta(days=6) <= last_inv:
    weeks.append(w)
    w += dt.timedelta(days=7)
rev_w_vals = [wk.get(w, 0.0) / JT for w in weeks]

mo = defaultdict(float)
for x, v in inv_rows:
    mo[ym(x)] += v
first_full_month = ym(first_inv) if first_inv.day == 1 else months_between(ym(first_inv), "9999-12")[1]
# bulan penuh terakhir = bulan sebelum forecast bulanan pertama (dan harus sudah lewat di data)
y0, m0 = map(int, first_fc_month.split("-"))
prev = f"{y0 - 1}-12" if m0 == 1 else f"{y0}-{m0 - 1:02d}"
months = months_between(first_full_month, prev)
rev_m_vals = [mo.get(p, 0.0) / JT for p in months]

mtd_period = ym(last_inv)
mtd_rows = [(x, v) for x, v in inv_rows if ym(x) == mtd_period]
revenue = {
    "unit": "Rp juta",
    "model": f_rev_w[0]["model"] if f_rev_w else None,
    "weekly": {
        "actual": [{"week_start": w.isoformat(), "value": r2(v)} for w, v in zip(weeks, rev_w_vals)],
        "moving_avg": {"window": 4, "values": moving_avg(rev_w_vals, 4)},
        "forecast": [{"week_start": r["week_start"], "forecast": r2(num(r["forecast"])), "lower_80": r2(num(r["lower_80"])), "upper_80": r2(num(r["upper_80"]))} for r in f_rev_w],
        "backtest": [{"week_start": r["week_start"], "actual": r2(num(r["aktual"])), "predicted": r2(num(r["prediksi"]))} for r in (bt_rev_w or [])],
        "error": metric("pendapatan_mingguan"),
    },
    "monthly": {
        "actual": [{"period": p, "value": r2(v)} for p, v in zip(months, rev_m_vals)],
        "moving_avg": {"window": 3, "values": moving_avg(rev_m_vals, 3)},
        "forecast": [{"period": r["periode"], "forecast": r2(num(r["forecast"])), "lower_80": r2(num(r["lower_80"])), "upper_80": r2(num(r["upper_80"]))} for r in f_rev_m],
        "backtest": [{"period": r["periode"], "actual": r2(num(r["aktual"])), "predicted": r2(num(r["prediksi"]))} for r in (bt_rev_m or [])],
        "error": metric("pendapatan_bulanan"),
    },
    "month_to_date": {"period": mtd_period, "as_of": last_inv.isoformat(), "value_rp": round(sum(v for _, v in mtd_rows)), "n_invoices": len(mtd_rows),
                       "complete": (last_inv + dt.timedelta(days=1)).month != last_inv.month},
    "notes": "Aktual = jumlah total_amount invoice per minggu (Senin) / bulan kalender; hanya periode penuh sebelum forecast pertama.",
}

# ================================================================== demand per part_id
inv_by_id = {r["part_id"]: r for r in inventory}
OPEN_PO = {"Open", "Draft", "Ordered", "Partially Received"}
open_po = defaultdict(list)
for p in pos:
    if p["status"] in OPEN_PO:
        q = int(num(p["quantity_ordered"])) - int(num(p.get("received_quantity"), 0))
        if q > 0:
            open_po[p["part_id"]].append({"po_id": p["po_id"], "qty": q, "expected_date": p.get("expected_date") or None, "status": p["status"]})

dem = defaultdict(lambda: defaultdict(float))
for r in ros:
    if r["status"] == "Cancelled" or num(r["quantity_required"]) <= 0 or not r.get("scheduled_date"):
        continue
    dem[r["part_id"]][ym(d(r["scheduled_date"]))] += num(r["quantity_required"])
used = defaultdict(lambda: defaultdict(float))
for t in txs:
    if t["transaction_type"] == "STOCK_OUT":
        used[t["part_id"]][ym(d(t["transaction_date"]))] += abs(num(t["quantity"]))

all_periods = sorted({p for m in dem.values() for p in m})
first_dem = min(r["scheduled_date"] for r in ros if r.get("scheduled_date"))
dem_start = all_periods[0] if first_dem[8:10] == "01" else all_periods[1]          # buang bulan pertama yang tidak penuh (sama dengan model)
fc_periods = sorted({r["periode"] for r in f_dem_vp})
y0, m0 = map(int, fc_periods[0].split("-"))
dem_end = f"{y0 - 1}-12" if m0 == 1 else f"{y0}-{m0 - 1:02d}"
dem_periods = months_between(dem_start, dem_end)

total_fc = {r["periode"]: r for r in f_dem_vp if r["vehicle_part"] == "TOTAL"}
fc_pid = defaultdict(list)
if f_dem_pid:
    for r in f_dem_pid:
        t = total_fc.get(r["periode"])
        share = num(r["porsi"])
        fc_pid[r["part_id"]].append({"period": r["periode"], "forecast": r2(num(r["forecast_unit"])), "share": r2(share, 6),
                                     "lower_80": r2(num(t["lower_80"]) * share) if t else None, "upper_80": r2(num(t["upper_80"]) * share) if t else None})

bt_pid = defaultdict(list)
for r in (bt_dem_pid or []):
    bt_pid[r["part_id"]].append({"period": r["periode"], "actual": r2(num(r["aktual"])), "predicted": r2(num(r["prediksi"]))})

parts = []
for pid in sorted(inv_by_id):
    i = inv_by_id[pid]
    parts.append({
        "part_id": pid, "part_name": i["part_name"], "brand": i["brand"], "model": i["model"], "vehicle_part": i["vehicle_part"],
        "current_stock": int(num(i["current_stock"])), "reorder_point": int(num(i["reorder_point"])), "safety_stock": int(num(i["safety_stock"])),
        "max_stock": int(num(i["max_stock"])), "lead_time_days": int(num(i["lead_time_days"])), "unit_cost": int(num(i["unit_cost"])), "stock_as_of": i["last_updated"],
        "open_po": open_po.get(pid, []), "open_po_qty": sum(x["qty"] for x in open_po.get(pid, [])),
        "actual": [{"period": p, "demand": int(dem[pid].get(p, 0)), "used": int(used[pid].get(p, 0))} for p in dem_periods],
        "forecast": fc_pid.get(pid, []),
        "backtest": bt_pid.get(pid, []),
    })

vp_fc = defaultdict(list)
for r in f_dem_vp:
    vp_fc[r["vehicle_part"]].append({"period": r["periode"], "forecast": r2(num(r["forecast"])), "lower_80": r2(num(r["lower_80"])), "upper_80": r2(num(r["upper_80"]))})

demand = {
    "unit": "unit / bulan",
    "model": f_dem_vp[0]["model"] if f_dem_vp else None,
    "periods": dem_periods, "forecast_periods": fc_periods,
    "parts": parts,
    "vehicle_part_forecast": vp_fc,
    "error": {"part_id": metric("demand_bulanan_per_part_id"), "vehicle_part": metric("demand_bulanan_per_vehicle_part"), "total": metric("demand_bulanan_total")},
    "band_source": "total_x_share" if f_dem_pid else None,
    "has_part_forecast": bool(f_dem_pid),
    "notes": "Aktual = jumlah quantity_required repair order (bukan Cancelled, > 0) per bulan scheduled_date; Terpakai = STOCK_OUT inventory_transactions.",
}

# ================================================================== operasional (agregat dataset v5)
ro_by_id = {r["repair_order_id"]: r for r in ros}
by_action = defaultdict(lambda: {"revenue_rp": 0.0, "est_cost_rp": 0.0, "n_orders": 0, "n_invoices": 0})
for r in ros:
    if r["status"] == "Cancelled":
        continue
    a = by_action[r["repair_action"]]
    a["est_cost_rp"] += num(r["estimated_repair_cost"]); a["n_orders"] += 1
for i in invoices:
    r = ro_by_id.get(i["repair_order_id"])
    if not r:
        continue
    a = by_action[r["repair_action"]]
    a["revenue_rp"] += num(i["total_amount"]); a["n_invoices"] += 1
sev, dmg = defaultdict(int), defaultdict(int)
for r in ros:
    if r["status"] != "Cancelled":
        sev[r["severity"]] += 1; dmg[r["damage_type"]] += 1
ops = {
    "range": {"from": min(r["request_date"] for r in srs), "to": max(r["request_date"] for r in srs)},
    "by_action": [{"repair_action": k, **{kk: round(vv) for kk, vv in v.items()}} for k, v in sorted(by_action.items())],
    "by_severity": [{"severity": k, "n": v} for k, v in sev.items()],
    "by_damage": [{"damage_type": k, "n": v} for k, v in sorted(dmg.items(), key=lambda x: -x[1])],
}

# ================================================================== segmentasi
cust_by_id = {c["customer_id"]: c for c in customers}
profiles = []
for p in seg_prof:
    profiles.append({"segment_id": int(num(p["segment_id"])), "segment_name": p["segment_name"], "count": int(num(p["jumlah"])),
                     "share_pct": r2(num(p["persen"], None), 2) if p.get("persen") else None,
                     "R_median": r2(num(p["R_median"], None), 2) if p.get("R_median") else None,
                     "F_median": r2(num(p["F_median"], None), 2) if p.get("F_median") else None,
                     "M_median": r2(num(p["M_median"], None), 4) if p.get("M_median") else None,
                     "description": p.get("arti_bisnis") or "", "kind": "rule" if "aturan" in (p.get("jenis") or "") else "model", "kind_label": p.get("jenis") or ""})
seg_customers = []
for s in seg_cust:
    c = cust_by_id.get(s["customer_id"], {})
    seg_customers.append({"customer_id": s["customer_id"], "name": c.get("customer_name"), "city": c.get("city"), "customer_type": s["customer_type"],
                          "segment_id": int(num(s["segment_id"])), "R": r2(num(s["R"], None), 1) if s.get("R") else None,
                          "F": int(num(s["F"])) if s.get("F") else None, "M": r2(num(s["M"], None), 4) if s.get("M") else None})
segments = {"model": "K-Means (Individual) + aturan (Fleet / Asuransi / tanpa transaksi)", "unit_M": "Rp juta", "unit_R": "hari sejak invoice terakhir",
            "profiles": profiles, "customers": seg_customers}

# ================================================================== tulis
generated = dt.datetime.now().replace(microsecond=0).isoformat()
meta = {"generated_at": generated, "data_label": "DEMO / SYNTHETIC DATA", "dataset": "v5", "builder": "tools/build_data.py"}


def write(name, var, payload):
    p = os.path.join(DATA, name)
    with open(p, "w", encoding="utf-8") as f:
        f.write(f"/* DIBUAT OTOMATIS oleh tools/build_data.py ({generated}) — jangan diedit manual. DEMO / SYNTHETIC DATA. */\n")
        f.write(f"window.{var} = ")
        json.dump(payload, f, ensure_ascii=False, separators=(",", ":"))
        f.write(";\n")
    print(f"  {name}: {os.path.getsize(p) / 1024:.0f} KB")


print("[build_data] menulis:")
# data aktual (dataset v5) dan hasil model dipisah; savera-api.js menggabungkannya per resource
pick = lambda o, ks: {k: o[k] for k in ks}
ds_revenue = {"unit": revenue["unit"], "weekly": pick(revenue["weekly"], ("actual", "moving_avg")), "monthly": pick(revenue["monthly"], ("actual", "moving_avg")),
              "month_to_date": revenue["month_to_date"], "notes": revenue["notes"]}
md_revenue = {"model": revenue["model"], "weekly": pick(revenue["weekly"], ("forecast", "backtest", "error")), "monthly": pick(revenue["monthly"], ("forecast", "backtest", "error"))}
ds_demand = {"unit": demand["unit"], "periods": demand["periods"], "notes": demand["notes"],
             "parts": [{k: v for k, v in p.items() if k not in ("forecast", "backtest")} for p in parts]}
md_demand = {"model": demand["model"], "forecast_periods": demand["forecast_periods"], "forecast_by_part": {p["part_id"]: p["forecast"] for p in parts if p["forecast"]},
             "backtest_by_part": {p["part_id"]: p["backtest"] for p in parts if p["backtest"]}, "vehicle_part_forecast": demand["vehicle_part_forecast"],
             "error": demand["error"], "band_source": demand["band_source"], "has_part_forecast": demand["has_part_forecast"]}
write("savera-dataset.js", "SAVERA_DATASET", {"meta": meta, "ops": ops, "revenue": ds_revenue, "demand": ds_demand})
write("savera-model-results.js", "SAVERA_MODEL_RESULTS", {"meta": {**meta, "source": "modeling/"}, "revenue": md_revenue, "demand": md_demand, "segments": segments})
print(f"  periode pendapatan: {len(weeks)} minggu ({weeks[0]}..{weeks[-1]}), {len(months)} bulan ({months[0]}..{months[-1]})")
print(f"  periode demand: {dem_periods[0]}..{dem_periods[-1]} · {len(parts)} part · forecast per part_id: {'ya' if f_dem_pid else 'TIDAK ADA'}")
