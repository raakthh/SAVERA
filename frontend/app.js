/* =====================================================================
   SAVERA — Smart Automotive Vehicle Evaluation and Repair Assessment
   Interactive prototype. All damage taxonomy (part / damage type /
   severity / brand / model / year / AI confidence) below is sourced
   directly from the SAVERA_sample.csv dataset provided. No repair-cost
   figures are invented anywhere in this file — cost fields are left
   for manual surveyor entry until a repair-cost dataset is supplied.
===================================================================== */

const RAW_DATA = [
  ["fender", "dent", "severe", "Daihatsu", "Creta", 2020, 0.96],
  ["fender", "dent", "severe", "Toyota", "Creta", 2024, 0.96],
  ["windshield", "broken", "severe", "Hyundai", "Civic", 2024, 0.86],
  ["bumper", "dent", "moderate", "Daihatsu", "Xenia", 2022, 0.86],
  ["door", "shatter", "severe", "Honda", "Ertiga", 2023, 0.94],
  ["windshield", "scratch", "moderate", "Daihatsu", "Civic", 2024, 0.95],
  ["fender", "shatter", "moderate", "Suzuki", "Avanza", 2023, 0.92],
  ["windshield", "dent", "moderate", "Mitsubishi", "Creta", 2023, 0.91],
  ["bumper", "broken", "severe", "Toyota", "Civic", 2022, 0.96],
  ["headlamp", "scratch", "severe", "Mitsubishi", "Xpander", 2021, 0.98],
  ["bumper", "scratch", "severe", "Toyota", "Civic", 2021, 0.95],
  ["bumper", "dent", "severe", "Toyota", "Avanza", 2024, 0.95],
  ["bumper", "shatter", "severe", "Toyota", "Creta", 2024, 0.86],
  ["door", "dent", "minor", "Honda", "Avanza", 2024, 0.95],
  ["bumper", "broken", "moderate", "Toyota", "Avanza", 2021, 0.98],
  ["door", "broken", "severe", "Daihatsu", "Avanza", 2022, 0.94],
  ["door", "shatter", "moderate", "Toyota", "Civic", 2021, 0.92],
  ["fender", "broken", "severe", "Toyota", "Xpander", 2021, 0.88],
  ["fender", "dent", "moderate", "Hyundai", "Ertiga", 2022, 0.88],
  ["headlamp", "scratch", "severe", "Hyundai", "Civic", 2025, 0.88],
  ["bumper", "dent", "severe", "Hyundai", "Ertiga", 2024, 0.86],
  ["fender", "shatter", "minor", "Suzuki", "Creta", 2021, 0.86],
  ["windshield", "shatter", "moderate", "Suzuki", "Avanza", 2022, 0.93],
  ["bumper", "broken", "severe", "Daihatsu", "Ertiga", 2025, 0.96],
  ["bumper", "dent", "minor", "Hyundai", "Ertiga", 2023, 0.85],
].map((r, i) => ({
  id: i + 1,
  part: r[0],
  damageType: r[1],
  severity: r[2],
  brand: r[3],
  model: r[4],
  year: r[5],
  confidence: r[6],
}));

const PARTS = [...new Set(RAW_DATA.map((d) => d.part))];
const DAMAGE_TYPES = [...new Set(RAW_DATA.map((d) => d.damageType))];
const SEVERITIES = ["minor", "moderate", "severe"];
const BRANDS = [...new Set(RAW_DATA.map((d) => d.brand))];
const MODELS = [...new Set(RAW_DATA.map((d) => d.model))];

const PLATE_SUFFIX = [
  "XA",
  "BQ",
  "ZK",
  "LM",
  "RT",
  "VC",
  "PN",
  "HD",
  "QW",
  "JS",
  "MK",
  "TY",
];
const SURVEYORS = [
  "Nadia Pramesti",
  "Yoga Aditama",
  "Fira Salsabila",
  "Reza Kurniawan",
];
const STATUSES = ["Approved", "Pending Verification", "In Review", "Rejected"];

function seededPlate(i) {
  const num = 1000 + ((i * 137) % 9000);
  return "B " + num + " " + PLATE_SUFFIX[i % PLATE_SUFFIX.length];
}
function dateOffset(i) {
  const d = new Date(2026, 8, 13);
  d.setDate(d.getDate() - (i * 5 + (i % 3) * 2));
  return d;
}
function fmtDate(d) {
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
function fmtIDR(n) {
  if (n === null || n === undefined || isNaN(n)) return "—";
  return "Rp " + Math.round(n).toLocaleString("id-ID");
}

// Build a synthetic assessment "history" from the dataset — 1:1 with the
// CSV rows. Dates / plate numbers / workflow status are demo scaffolding
// generated for the prototype (the CSV itself is documented as demo/
// synthetic data); damage attributes and AI confidence are exactly as
// provided in the dataset.
const HISTORY = RAW_DATA.map((d, i) => ({
  assessmentId: "SVR-2026-" + String(1000 + i),
  plate: seededPlate(i),
  brand: d.brand,
  model: d.model,
  year: d.year,
  part: d.part,
  damageType: d.damageType,
  severity: d.severity,
  confidence: d.confidence,
  date: dateOffset(i),
  status: STATUSES[i % STATUSES.length],
  surveyor: SURVEYORS[i % SURVEYORS.length],
  cost: null, // no repair-cost dataset supplied yet — never fabricated
}));

/* =====================================================================
   PPIC (Production Planning & Inventory Control) module data.
   Sourced directly from SAVERA_PPIC_sample.csv — every numeric field
   below (stock, reorder point, demand, supplier, lead time, unit cost,
   total cost, repair days, material) is a real value from that CSV.
   Nothing here is invented; derived figures (e.g. reorder quantity,
   stock status buckets) are computed live from these real fields and
   are clearly labelled as derived where shown in the UI.
===================================================================== */
const PPIC_COLS = ["part","damageType","severity","brand","model","year","confidence",
  "repairAction","qtyRequired","currentStock","reorderPoint","demandQty","supplierId",
  "supplierName","leadTimeDays","purchaseQty","unitCost","totalCost","repairDays",
  "priority","repairStatus","materialType","materialQty"];
const PPIC_RAW = [
["Bumper Depan","crack","moderate","Hyundai","Creta",2018,0.74,"Repair",1,8,8,14,"SUPP-003","UD. Motor Sejahtera",13,13,450000,450000,2,"Normal","Completed","Body Filler (Kg)",0.37],
["Kaca Depan","broken","minor","Toyota","Avanza",2015,0.73,"Replace",1,15,8,5,"SUPP-004","Distributor Oto Nusantara",9,0,1200000,1200000,6,"Normal","Completed","None",0.0],
["Kaca Depan","scratch","critical","Honda","Brio",2018,0.83,"Replace",1,12,5,11,"SUPP-002","CV. Sparepart Makmur",12,0,1200000,1200000,4,"Normal","Parts Available","None",0.0],
["Kap Mesin","scratch","critical","Daihatsu","Sigra",2020,0.78,"Replace",1,13,2,11,"SUPP-004","Distributor Oto Nusantara",12,0,500000,500000,6,"Normal","Parts Available","None",0.0],
["Bumper Depan","dent","critical","Honda","CR-V",2016,0.8,"Replace",1,15,2,5,"SUPP-005","Bintang Auto Sentosa",10,0,800000,800000,5,"High","Quality Check","None",0.0],
["Fender Kanan Depan","dent","critical","Daihatsu","Xenia",2023,0.74,"Replace",1,3,6,15,"SUPP-001","PT. Auto Gemilang Jaya",12,9,650000,650000,6,"High","Parts Available","None",0.0],
["Kaca Depan","crack","severe","Mitsubishi","Xpander",2024,0.76,"Replace",1,2,5,9,"SUPP-003","UD. Motor Sejahtera",10,17,1200000,1200000,3,"High","Completed","None",0.0],
["Headlamp Kanan","scratch","severe","Toyota","Avanza",2016,0.95,"Replace",1,12,4,21,"SUPP-004","Distributor Oto Nusantara",14,0,1500000,1500000,7,"Low","Waiting for Parts","None",0.0],
["Fender Kanan Depan","broken","severe","Toyota","Creta",2017,0.81,"Replace",1,7,7,22,"SUPP-003","UD. Motor Sejahtera",4,7,650000,650000,6,"Urgent","Waiting for Parts","None",0.0],
["Headlamp Kanan","dent","moderate","Honda","CR-V",2023,0.91,"Replace",1,5,7,10,"SUPP-001","PT. Auto Gemilang Jaya",1,15,1500000,1500000,3,"Normal","In Repair","None",0.0],
["Pintu Depan Kanan","crack","moderate","Honda","Civic",2025,0.79,"Replace",1,4,3,17,"SUPP-004","Distributor Oto Nusantara",10,0,1900000,1900000,4,"Low","Waiting for Parts","None",0.0],
["Kap Mesin","dent","severe","Toyota","Innova Zenix",2021,0.78,"Replace",1,12,6,22,"SUPP-002","CV. Sparepart Makmur",8,0,500000,500000,7,"Low","Quality Check","None",0.0],
["Bumper Belakang","broken","critical","Honda","CR-V",2025,0.83,"Replace",1,8,5,9,"SUPP-001","PT. Auto Gemilang Jaya",13,0,800000,800000,6,"Urgent","Completed","None",0.0],
["Bumper Belakang","shattered","severe","Daihatsu","Terios",2026,0.87,"Replace",1,5,2,15,"SUPP-003","UD. Motor Sejahtera",10,0,800000,800000,5,"Normal","Quality Check","None",0.0],
["Fender Kanan Depan","scratch","moderate","Suzuki","XL7",2023,0.84,"Repaint",1,8,5,10,"SUPP-002","CV. Sparepart Makmur",7,0,350000,350000,3,"Normal","Completed","Automotive Paint (Liter)",0.74],
["Bumper Belakang","scratch","critical","Toyota","Avanza",2024,0.72,"Replace",1,9,7,10,"SUPP-001","PT. Auto Gemilang Jaya",14,0,800000,800000,6,"Normal","Completed","None",0.0],
["Kaca Depan","crack","minor","Mitsubishi","Pajero Sport",2025,0.91,"Repaint",1,1,6,24,"SUPP-004","Distributor Oto Nusantara",14,14,350000,350000,2,"Normal","Parts Available","Primer (Liter)",1.3],
["Kap Mesin","crack","minor","Hyundai","Civic",2019,0.83,"Repaint",1,8,7,25,"SUPP-002","CV. Sparepart Makmur",11,0,350000,350000,2,"Normal","Quality Check","Primer (Liter)",1.15],
["Headlamp Kanan","crack","moderate","Mitsubishi","Xpander",2023,0.96,"Repair",1,11,7,5,"SUPP-001","PT. Auto Gemilang Jaya",5,0,450000,450000,4,"Low","Parts Available","Body Filler (Kg)",0.65],
["Kap Mesin","shattered","moderate","Hyundai","Civic",2017,0.81,"Replace",1,11,6,17,"SUPP-003","UD. Motor Sejahtera",14,0,500000,500000,4,"Normal","Quality Check","None",0.0],
["Kaca Depan","crack","critical","Honda","Brio",2015,0.73,"Replace",1,9,7,11,"SUPP-001","PT. Auto Gemilang Jaya",8,0,1200000,1200000,3,"Low","Parts Available","None",0.0],
["Bumper Belakang","dent","moderate","Daihatsu","Ayla",2024,0.97,"Replace",1,11,2,13,"SUPP-001","PT. Auto Gemilang Jaya",5,0,800000,800000,7,"Low","In Repair","None",0.0],
["Kap Mesin","dent","moderate","Toyota","Creta",2017,0.89,"Replace",1,12,8,21,"SUPP-003","UD. Motor Sejahtera",2,0,500000,500000,4,"Normal","Completed","None",0.0],
["Fender Kanan Depan","shattered","critical","Suzuki","Ertiga",2018,0.97,"Replace",1,10,6,8,"SUPP-001","PT. Auto Gemilang Jaya",11,0,650000,650000,6,"Urgent","In Repair","None",0.0],
["Headlamp Kanan","crack","critical","Hyundai","Creta",2025,0.89,"Replace",1,13,2,5,"SUPP-001","PT. Auto Gemilang Jaya",1,0,1500000,1500000,5,"Urgent","Waiting for Parts","None",0.0],
["Bumper Depan","scratch","moderate","Mitsubishi","Pajero Sport",2016,0.8,"Repaint",1,3,3,18,"SUPP-002","CV. Sparepart Makmur",7,19,350000,350000,3,"Normal","Completed","Primer (Liter)",1.45],
["Kaca Depan","scratch","minor","Suzuki","Ertiga",2016,0.91,"Repaint",1,13,6,24,"SUPP-002","CV. Sparepart Makmur",7,0,350000,350000,4,"Normal","In Repair","Automotive Paint (Liter)",1.33],
["Bumper Depan","dent","severe","Toyota","Innova Zenix",2016,0.85,"Replace",1,1,7,12,"SUPP-002","CV. Sparepart Makmur",8,19,800000,800000,4,"High","Waiting for Parts","None",0.0],
["Bumper Belakang","shattered","moderate","Daihatsu","Creta",2026,0.97,"Replace",1,11,6,21,"SUPP-003","UD. Motor Sejahtera",1,0,800000,800000,6,"Normal","Waiting for Parts","None",0.0],
["Bumper Belakang","broken","critical","Suzuki","XL7",2018,0.73,"Replace",1,14,2,22,"SUPP-002","CV. Sparepart Makmur",11,0,800000,800000,7,"Urgent","Waiting for Parts","None",0.0],
["Fender Kanan Depan","broken","critical","Hyundai","Civic",2022,0.95,"Replace",1,10,3,5,"SUPP-005","Bintang Auto Sentosa",4,0,650000,650000,3,"High","Completed","None",0.0],
["Bumper Depan","broken","severe","Toyota","Avanza",2016,0.77,"Replace",1,6,6,7,"SUPP-002","CV. Sparepart Makmur",6,9,800000,800000,7,"Low","Parts Available","None",0.0],
["Bumper Belakang","broken","moderate","Honda","Civic",2019,0.83,"Replace",1,4,6,9,"SUPP-002","CV. Sparepart Makmur",2,5,800000,800000,4,"Low","Parts Available","None",0.0],
["Kap Mesin","shattered","minor","Toyota","Creta",2015,0.89,"Replace",1,10,2,6,"SUPP-003","UD. Motor Sejahtera",1,0,500000,500000,4,"High","Completed","None",0.0],
["Bumper Depan","scratch","moderate","Suzuki","Ertiga",2021,0.84,"Repaint",1,3,7,3,"SUPP-004","Distributor Oto Nusantara",8,16,350000,350000,4,"Normal","Completed","Primer (Liter)",0.61],
["Bumper Depan","scratch","critical","Honda","Civic",2015,0.99,"Replace",1,1,7,22,"SUPP-005","Bintang Auto Sentosa",5,19,800000,800000,3,"Low","Quality Check","None",0.0],
["Fender Kanan Depan","broken","critical","Daihatsu","Creta",2017,0.76,"Replace",1,12,5,22,"SUPP-001","PT. Auto Gemilang Jaya",8,0,650000,650000,6,"Low","Waiting for Parts","None",0.0],
["Kaca Depan","shattered","minor","Honda","Brio",2026,0.79,"Replace",1,10,6,5,"SUPP-001","PT. Auto Gemilang Jaya",3,0,1200000,1200000,5,"Normal","Completed","None",0.0],
["Kaca Depan","shattered","moderate","Toyota","Creta",2015,0.98,"Replace",1,10,5,20,"SUPP-005","Bintang Auto Sentosa",5,0,1200000,1200000,6,"Normal","Quality Check","None",0.0],
["Bumper Depan","shattered","minor","Toyota","Innova Zenix",2025,0.95,"Replace",1,3,8,23,"SUPP-001","PT. Auto Gemilang Jaya",14,11,800000,800000,6,"Normal","Parts Available","None",0.0],
["Kaca Depan","scratch","minor","Mitsubishi","Xpander",2024,0.72,"Repaint",1,13,4,15,"SUPP-004","Distributor Oto Nusantara",7,0,350000,350000,4,"Normal","In Repair","Automotive Paint (Liter)",0.81],
["Fender Kanan Depan","scratch","severe","Hyundai","Civic",2018,0.78,"Replace",1,11,3,22,"SUPP-004","Distributor Oto Nusantara",2,0,650000,650000,3,"High","Waiting for Parts","None",0.0],
["Pintu Depan Kanan","crack","minor","Honda","CR-V",2015,0.83,"Repaint",1,13,2,24,"SUPP-003","UD. Motor Sejahtera",13,0,350000,350000,2,"Urgent","Completed","Primer (Liter)",0.56],
["Bumper Depan","shattered","moderate","Suzuki","Ertiga",2023,0.78,"Replace",1,10,7,4,"SUPP-004","Distributor Oto Nusantara",6,0,800000,800000,6,"High","Waiting for Parts","None",0.0],
["Bumper Belakang","crack","severe","Daihatsu","Sigra",2017,0.83,"Replace",1,9,6,10,"SUPP-003","UD. Motor Sejahtera",2,0,800000,800000,7,"Normal","Parts Available","None",0.0],
["Kaca Depan","shattered","minor","Suzuki","XL7",2025,0.94,"Replace",1,15,3,4,"SUPP-003","UD. Motor Sejahtera",14,0,1200000,1200000,7,"Normal","In Repair","None",0.0],
["Bumper Belakang","crack","minor","Daihatsu","Sigra",2016,0.92,"Repaint",1,7,8,14,"SUPP-005","Bintang Auto Sentosa",13,5,350000,350000,4,"Normal","Parts Available","Primer (Liter)",1.33],
["Fender Kanan Depan","shattered","moderate","Honda","CR-V",2026,0.8,"Replace",1,8,7,25,"SUPP-003","UD. Motor Sejahtera",6,0,650000,650000,5,"Low","Parts Available","None",0.0],
["Kaca Depan","broken","severe","Hyundai","Civic",2015,0.73,"Replace",1,12,2,5,"SUPP-001","PT. Auto Gemilang Jaya",2,0,1200000,1200000,7,"Normal","Quality Check","None",0.0],
["Bumper Depan","dent","severe","Mitsubishi","Pajero Sport",2017,0.88,"Replace",1,14,4,6,"SUPP-003","UD. Motor Sejahtera",5,0,800000,800000,5,"High","Completed","None",0.0],
["Kaca Depan","shattered","moderate","Toyota","Creta",2015,0.78,"Replace",1,2,2,5,"SUPP-002","CV. Sparepart Makmur",13,6,1200000,1200000,3,"Normal","Quality Check","None",0.0],
["Bumper Belakang","shattered","moderate","Daihatsu","Creta",2026,0.91,"Replace",1,15,6,15,"SUPP-004","Distributor Oto Nusantara",5,0,800000,800000,4,"High","Waiting for Parts","None",0.0],
["Fender Kanan Depan","scratch","moderate","Suzuki","XL7",2023,0.86,"Repaint",1,11,5,4,"SUPP-003","UD. Motor Sejahtera",11,0,350000,350000,4,"Normal","Waiting for Parts","Primer (Liter)",0.99],
["Pintu Depan Kanan","crack","minor","Honda","CR-V",2015,0.82,"Repaint",1,7,5,20,"SUPP-001","PT. Auto Gemilang Jaya",1,0,350000,350000,2,"High","In Repair","Clear Coat (Liter)",1.45],
["Headlamp Kanan","scratch","severe","Toyota","Avanza",2016,0.7,"Replace",1,9,4,4,"SUPP-001","PT. Auto Gemilang Jaya",8,0,1500000,1500000,6,"Low","Quality Check","None",0.0],
["Kaca Depan","crack","critical","Honda","Brio",2015,0.72,"Replace",1,7,6,18,"SUPP-003","UD. Motor Sejahtera",2,0,1200000,1200000,6,"High","Waiting for Parts","None",0.0],
["Kaca Depan","shattered","moderate","Toyota","Creta",2015,0.96,"Replace",1,13,2,15,"SUPP-001","PT. Auto Gemilang Jaya",14,0,1200000,1200000,5,"Normal","Completed","None",0.0],
["Headlamp Kanan","crack","moderate","Mitsubishi","Xpander",2023,0.96,"Replace",1,13,4,4,"SUPP-004","Distributor Oto Nusantara",1,0,1500000,1500000,5,"Low","Completed","None",0.0],
["Kap Mesin","dent","moderate","Toyota","Creta",2017,0.86,"Replace",1,11,2,14,"SUPP-001","PT. Auto Gemilang Jaya",4,0,500000,500000,6,"Normal","Completed","None",0.0],
["Pintu Depan Kanan","crack","moderate","Honda","Civic",2025,0.94,"Repair",1,12,8,10,"SUPP-003","UD. Motor Sejahtera",4,0,450000,450000,4,"Low","Waiting for Parts","Body Filler (Kg)",0.67],
["Pintu Depan Kanan","crack","moderate","Honda","Civic",2025,0.87,"Repair",1,11,4,24,"SUPP-002","CV. Sparepart Makmur",4,0,450000,450000,2,"Low","Completed","Body Filler (Kg)",0.29],
["Fender Kanan Depan","shattered","critical","Suzuki","Ertiga",2018,0.74,"Replace",1,4,8,25,"SUPP-001","PT. Auto Gemilang Jaya",3,20,650000,650000,6,"High","Completed","None",0.0],
["Bumper Depan","scratch","critical","Honda","Civic",2015,0.74,"Replace",1,14,7,19,"SUPP-005","Bintang Auto Sentosa",6,0,800000,800000,5,"Low","Waiting for Parts","None",0.0],
["Bumper Depan","shattered","minor","Toyota","Innova Zenix",2025,0.79,"Replace",1,15,5,21,"SUPP-003","UD. Motor Sejahtera",13,0,800000,800000,5,"Normal","In Repair","None",0.0],
["Fender Kanan Depan","shattered","critical","Suzuki","Ertiga",2018,0.96,"Replace",1,2,4,15,"SUPP-004","Distributor Oto Nusantara",1,6,650000,650000,5,"High","Waiting for Parts","None",0.0],
["Kaca Depan","scratch","critical","Honda","Brio",2018,0.93,"Replace",1,2,6,20,"SUPP-005","Bintang Auto Sentosa",7,19,1200000,1200000,7,"Normal","Waiting for Parts","None",0.0],
["Bumper Belakang","dent","moderate","Daihatsu","Ayla",2024,0.95,"Replace",1,6,4,20,"SUPP-004","Distributor Oto Nusantara",9,0,800000,800000,4,"Urgent","Quality Check","None",0.0],
["Kaca Depan","broken","minor","Toyota","Avanza",2015,0.96,"Replace",1,3,8,11,"SUPP-001","PT. Auto Gemilang Jaya",9,10,1200000,1200000,3,"Normal","Quality Check","None",0.0],
["Fender Kanan Depan","shattered","critical","Suzuki","Ertiga",2018,0.76,"Replace",1,14,6,17,"SUPP-005","Bintang Auto Sentosa",3,0,650000,650000,5,"Normal","In Repair","None",0.0],
["Bumper Depan","shattered","moderate","Suzuki","Ertiga",2023,0.77,"Replace",1,12,5,25,"SUPP-003","UD. Motor Sejahtera",11,0,800000,800000,7,"Low","In Repair","None",0.0],
["Bumper Belakang","broken","critical","Suzuki","XL7",2018,0.73,"Replace",1,2,4,4,"SUPP-005","Bintang Auto Sentosa",11,17,800000,800000,5,"Normal","Completed","None",0.0],
["Kaca Depan","shattered","minor","Honda","Brio",2026,0.93,"Replace",1,4,4,3,"SUPP-005","Bintang Auto Sentosa",11,9,1200000,1200000,5,"Normal","Quality Check","None",0.0],
["Kaca Depan","broken","minor","Toyota","Avanza",2015,0.96,"Replace",1,4,6,23,"SUPP-001","PT. Auto Gemilang Jaya",5,17,1200000,1200000,5,"High","Completed","None",0.0],
["Kaca Depan","crack","critical","Honda","Brio",2015,0.82,"Replace",1,2,7,22,"SUPP-004","Distributor Oto Nusantara",9,16,1200000,1200000,3,"Normal","Parts Available","None",0.0],
["Bumper Belakang","broken","moderate","Honda","Civic",2019,0.88,"Replace",1,6,4,25,"SUPP-004","Distributor Oto Nusantara",4,0,800000,800000,4,"Urgent","Parts Available","None",0.0],
["Kap Mesin","dent","severe","Toyota","Innova Zenix",2021,0.74,"Replace",1,2,4,4,"SUPP-005","Bintang Auto Sentosa",13,6,500000,500000,5,"High","Completed","None",0.0],
["Bumper Belakang","dent","moderate","Daihatsu","Ayla",2024,0.97,"Repair",1,12,3,6,"SUPP-002","CV. Sparepart Makmur",14,0,450000,450000,3,"Low","In Repair","Body Filler (Kg)",0.63],
["Bumper Depan","shattered","moderate","Suzuki","Ertiga",2023,0.95,"Replace",1,7,5,20,"SUPP-003","UD. Motor Sejahtera",13,0,800000,800000,6,"Normal","Parts Available","None",0.0],
["Headlamp Kanan","crack","critical","Hyundai","Creta",2025,0.98,"Replace",1,9,8,16,"SUPP-002","CV. Sparepart Makmur",6,0,1500000,1500000,7,"Urgent","Quality Check","None",0.0],
["Kaca Depan","broken","severe","Hyundai","Civic",2015,0.94,"Replace",1,9,8,13,"SUPP-005","Bintang Auto Sentosa",9,0,1200000,1200000,6,"Urgent","Parts Available","None",0.0],
["Kaca Depan","scratch","minor","Suzuki","Ertiga",2016,0.96,"Repaint",1,4,8,9,"SUPP-001","PT. Auto Gemilang Jaya",11,20,350000,350000,3,"High","Completed","Primer (Liter)",1.43],
["Fender Kanan Depan","scratch","severe","Hyundai","Civic",2018,0.71,"Replace",1,3,4,3,"SUPP-002","CV. Sparepart Makmur",5,19,650000,650000,7,"Low","Quality Check","None",0.0],
["Bumper Depan","dent","severe","Toyota","Innova Zenix",2016,0.91,"Replace",1,2,3,15,"SUPP-003","UD. Motor Sejahtera",1,18,800000,800000,3,"Normal","In Repair","None",0.0],
["Bumper Belakang","scratch","critical","Toyota","Avanza",2024,0.8,"Replace",1,7,5,3,"SUPP-003","UD. Motor Sejahtera",4,0,800000,800000,3,"Normal","Waiting for Parts","None",0.0],
["Fender Kanan Depan","scratch","moderate","Suzuki","XL7",2023,0.97,"Repaint",1,10,8,5,"SUPP-002","CV. Sparepart Makmur",1,0,350000,350000,3,"Low","Quality Check","Clear Coat (Liter)",1.2],
["Bumper Belakang","crack","minor","Daihatsu","Sigra",2016,0.93,"Repaint",1,14,6,1,"SUPP-001","PT. Auto Gemilang Jaya",1,0,350000,350000,3,"Normal","Completed","Automotive Paint (Liter)",1.33],
["Bumper Depan","shattered","moderate","Suzuki","Ertiga",2023,0.95,"Replace",1,13,2,25,"SUPP-003","UD. Motor Sejahtera",4,0,800000,800000,5,"Low","Parts Available","None",0.0],
["Kaca Depan","scratch","critical","Honda","Brio",2018,0.94,"Replace",1,13,7,20,"SUPP-004","Distributor Oto Nusantara",2,0,1200000,1200000,3,"High","Quality Check","None",0.0],
["Fender Kanan Depan","broken","critical","Daihatsu","Creta",2017,0.78,"Replace",1,0,7,17,"SUPP-005","Bintang Auto Sentosa",4,9,650000,650000,5,"Normal","Completed","None",0.0],
["Kaca Depan","crack","severe","Mitsubishi","Xpander",2024,0.93,"Replace",1,11,3,19,"SUPP-004","Distributor Oto Nusantara",3,0,1200000,1200000,3,"Normal","In Repair","None",0.0],
["Kaca Depan","crack","critical","Honda","Brio",2015,0.73,"Replace",1,2,6,18,"SUPP-005","Bintang Auto Sentosa",13,5,1200000,1200000,6,"High","Waiting for Parts","None",0.0],
["Fender Kanan Depan","broken","severe","Toyota","Creta",2017,0.95,"Replace",1,12,4,9,"SUPP-001","PT. Auto Gemilang Jaya",6,0,650000,650000,3,"Normal","Waiting for Parts","None",0.0],
["Kaca Depan","shattered","moderate","Toyota","Creta",2015,0.95,"Replace",1,10,3,2,"SUPP-003","UD. Motor Sejahtera",9,0,1200000,1200000,5,"High","Parts Available","None",0.0],
["Kap Mesin","crack","minor","Hyundai","Civic",2019,0.76,"Repaint",1,14,7,16,"SUPP-002","CV. Sparepart Makmur",13,0,350000,350000,2,"Urgent","Waiting for Parts","Automotive Paint (Liter)",1.22],
["Kap Mesin","scratch","critical","Daihatsu","Sigra",2020,0.94,"Replace",1,9,3,2,"SUPP-002","CV. Sparepart Makmur",1,0,500000,500000,5,"Urgent","Completed","None",0.0],
["Headlamp Kanan","crack","critical","Hyundai","Creta",2025,0.83,"Replace",1,12,8,18,"SUPP-004","Distributor Oto Nusantara",5,0,1500000,1500000,3,"High","Parts Available","None",0.0],
["Bumper Belakang","shattered","severe","Daihatsu","Terios",2026,0.79,"Replace",1,9,4,25,"SUPP-001","PT. Auto Gemilang Jaya",14,0,800000,800000,5,"Normal","In Repair","None",0.0],
["Bumper Depan","dent","severe","Mitsubishi","Pajero Sport",2017,0.93,"Replace",1,13,5,24,"SUPP-004","Distributor Oto Nusantara",7,0,800000,800000,5,"Urgent","Quality Check","None",0.0],
["Fender Kanan Depan","broken","severe","Toyota","Creta",2017,0.77,"Replace",1,15,4,17,"SUPP-003","UD. Motor Sejahtera",13,0,650000,650000,3,"High","Waiting for Parts","None",0.0],
["Bumper Depan","scratch","moderate","Mitsubishi","Pajero Sport",2016,0.71,"Repaint",1,13,6,6,"SUPP-005","Bintang Auto Sentosa",5,0,350000,350000,3,"Normal","In Repair","Automotive Paint (Liter)",0.58],
["Kaca Depan","broken","minor","Toyota","Avanza",2015,0.76,"Replace",1,14,6,23,"SUPP-004","Distributor Oto Nusantara",3,0,1200000,1200000,6,"Normal","Waiting for Parts","None",0.0],
["Kap Mesin","shattered","moderate","Hyundai","Civic",2017,0.8,"Replace",1,11,6,14,"SUPP-003","UD. Motor Sejahtera",11,0,500000,500000,3,"Low","Quality Check","None",0.0],
["Bumper Depan","dent","severe","Toyota","Innova Zenix",2016,0.95,"Replace",1,11,6,24,"SUPP-002","CV. Sparepart Makmur",1,0,800000,800000,4,"High","Quality Check","None",0.0],
["Bumper Belakang","crack","minor","Daihatsu","Sigra",2016,0.98,"Repaint",1,1,3,3,"SUPP-002","CV. Sparepart Makmur",13,16,350000,350000,3,"Low","Parts Available","Clear Coat (Liter)",1.45],
["Kaca Depan","crack","severe","Mitsubishi","Xpander",2024,0.78,"Replace",1,14,4,12,"SUPP-004","Distributor Oto Nusantara",13,0,1200000,1200000,3,"Normal","Completed","None",0.0],
["Bumper Depan","shattered","moderate","Suzuki","Ertiga",2023,0.89,"Replace",1,11,5,11,"SUPP-003","UD. Motor Sejahtera",4,0,800000,800000,3,"Low","Parts Available","None",0.0],
["Headlamp Kanan","scratch","severe","Toyota","Avanza",2016,0.82,"Replace",1,15,6,13,"SUPP-005","Bintang Auto Sentosa",2,0,1500000,1500000,5,"High","Quality Check","None",0.0],
["Bumper Belakang","crack","minor","Daihatsu","Sigra",2016,0.98,"Repaint",1,6,6,10,"SUPP-004","Distributor Oto Nusantara",4,8,350000,350000,2,"High","Quality Check","Automotive Paint (Liter)",0.95],
["Bumper Depan","scratch","moderate","Suzuki","Ertiga",2021,0.86,"Repaint",1,2,8,22,"SUPP-003","UD. Motor Sejahtera",11,16,350000,350000,4,"Normal","In Repair","Automotive Paint (Liter)",1.05],
["Bumper Belakang","shattered","severe","Daihatsu","Terios",2026,0.97,"Replace",1,5,7,23,"SUPP-002","CV. Sparepart Makmur",13,16,800000,800000,7,"Normal","Parts Available","None",0.0],
["Kaca Depan","crack","minor","Mitsubishi","Pajero Sport",2025,0.73,"Repaint",1,4,3,16,"SUPP-001","PT. Auto Gemilang Jaya",6,0,350000,350000,4,"High","Completed","Primer (Liter)",0.87],
["Bumper Depan","scratch","critical","Honda","Civic",2015,0.98,"Replace",1,4,6,3,"SUPP-001","PT. Auto Gemilang Jaya",5,17,800000,800000,6,"Normal","Quality Check","None",0.0],
["Bumper Depan","dent","severe","Mitsubishi","Pajero Sport",2017,0.75,"Replace",1,2,3,11,"SUPP-001","PT. Auto Gemilang Jaya",8,19,800000,800000,7,"Normal","Completed","None",0.0],
["Bumper Depan","shattered","minor","Toyota","Innova Zenix",2025,0.98,"Replace",1,5,8,5,"SUPP-004","Distributor Oto Nusantara",9,6,800000,800000,3,"Normal","In Repair","None",0.0],
["Kap Mesin","scratch","critical","Daihatsu","Sigra",2020,0.78,"Replace",1,5,3,11,"SUPP-002","CV. Sparepart Makmur",6,0,500000,500000,7,"High","Waiting for Parts","None",0.0],
["Kaca Depan","broken","minor","Toyota","Avanza",2015,0.73,"Replace",1,8,3,21,"SUPP-005","Bintang Auto Sentosa",5,0,1200000,1200000,4,"Normal","Completed","None",0.0],
["Fender Kanan Depan","dent","critical","Daihatsu","Xenia",2023,0.83,"Replace",1,2,6,21,"SUPP-002","CV. Sparepart Makmur",10,9,650000,650000,4,"Normal","Completed","None",0.0],
["Fender Kanan Depan","scratch","severe","Hyundai","Civic",2018,0.91,"Replace",1,10,8,19,"SUPP-001","PT. Auto Gemilang Jaya",14,0,650000,650000,3,"Low","Completed","None",0.0],
["Kap Mesin","scratch","critical","Daihatsu","Sigra",2020,0.79,"Replace",1,8,7,7,"SUPP-005","Bintang Auto Sentosa",7,0,500000,500000,7,"Normal","Quality Check","None",0.0],
["Bumper Belakang","shattered","moderate","Daihatsu","Creta",2026,0.88,"Replace",1,9,7,10,"SUPP-004","Distributor Oto Nusantara",4,0,800000,800000,6,"Normal","Waiting for Parts","None",0.0],
["Kap Mesin","crack","minor","Hyundai","Civic",2019,0.85,"Repaint",1,1,3,15,"SUPP-004","Distributor Oto Nusantara",8,19,350000,350000,2,"Normal","In Repair","Clear Coat (Liter)",1.11],
["Bumper Depan","scratch","moderate","Mitsubishi","Pajero Sport",2016,0.81,"Repaint",1,11,5,5,"SUPP-003","UD. Motor Sejahtera",9,0,350000,350000,4,"Normal","In Repair","Automotive Paint (Liter)",0.82],
["Bumper Depan","shattered","moderate","Suzuki","Ertiga",2023,0.87,"Replace",1,14,3,5,"SUPP-001","PT. Auto Gemilang Jaya",1,0,800000,800000,5,"Urgent","Completed","None",0.0],
["Kap Mesin","shattered","minor","Toyota","Creta",2015,0.77,"Replace",1,13,3,6,"SUPP-003","UD. Motor Sejahtera",10,0,500000,500000,5,"Low","Parts Available","None",0.0],
["Headlamp Kanan","dent","moderate","Honda","CR-V",2023,0.91,"Replace",1,14,5,10,"SUPP-004","Distributor Oto Nusantara",1,0,1500000,1500000,3,"Urgent","Completed","None",0.0],
["Bumper Depan","scratch","critical","Honda","Civic",2015,0.7,"Replace",1,14,3,7,"SUPP-005","Bintang Auto Sentosa",6,0,800000,800000,3,"Low","Quality Check","None",0.0],
["Bumper Belakang","shattered","severe","Daihatsu","Terios",2026,0.97,"Replace",1,15,4,18,"SUPP-001","PT. Auto Gemilang Jaya",14,0,800000,800000,3,"Normal","In Repair","None",0.0],
["Fender Kanan Depan","broken","critical","Hyundai","Civic",2022,0.86,"Replace",1,11,8,13,"SUPP-003","UD. Motor Sejahtera",1,0,650000,650000,6,"Low","Completed","None",0.0],
["Fender Kanan Depan","shattered","moderate","Honda","CR-V",2026,0.91,"Replace",1,6,4,18,"SUPP-003","UD. Motor Sejahtera",2,0,650000,650000,6,"Normal","Completed","None",0.0],
["Fender Kanan Depan","scratch","moderate","Suzuki","XL7",2023,0.92,"Repaint",1,8,8,20,"SUPP-005","Bintang Auto Sentosa",2,9,350000,350000,2,"Urgent","Completed","Clear Coat (Liter)",0.87],
["Headlamp Kanan","scratch","severe","Toyota","Avanza",2016,0.89,"Replace",1,11,8,5,"SUPP-002","CV. Sparepart Makmur",10,0,1500000,1500000,7,"Normal","Waiting for Parts","None",0.0],
["Bumper Belakang","shattered","severe","Daihatsu","Terios",2026,0.81,"Replace",1,1,2,5,"SUPP-003","UD. Motor Sejahtera",13,20,800000,800000,7,"Normal","Completed","None",0.0],
["Kap Mesin","dent","moderate","Toyota","Creta",2017,0.72,"Repair",1,10,6,11,"SUPP-002","CV. Sparepart Makmur",7,0,450000,450000,4,"Normal","Completed","Body Filler (Kg)",0.56],
["Bumper Depan","shattered","minor","Toyota","Innova Zenix",2025,0.89,"Replace",1,15,7,19,"SUPP-003","UD. Motor Sejahtera",8,0,800000,800000,3,"Normal","Waiting for Parts","None",0.0],
["Kaca Depan","crack","critical","Honda","Brio",2015,0.8,"Replace",1,13,6,10,"SUPP-001","PT. Auto Gemilang Jaya",10,0,1200000,1200000,6,"Normal","Completed","None",0.0],
["Bumper Belakang","scratch","critical","Toyota","Avanza",2024,0.79,"Replace",1,7,7,2,"SUPP-005","Bintang Auto Sentosa",8,10,800000,800000,7,"Normal","Completed","None",0.0],
["Bumper Belakang","crack","severe","Daihatsu","Sigra",2017,0.95,"Replace",1,12,3,22,"SUPP-002","CV. Sparepart Makmur",1,0,800000,800000,7,"Urgent","Waiting for Parts","None",0.0],
["Kap Mesin","crack","minor","Hyundai","Civic",2019,0.91,"Repaint",1,6,2,15,"SUPP-003","UD. Motor Sejahtera",7,0,350000,350000,2,"Normal","Completed","Clear Coat (Liter)",1.19],
["Bumper Belakang","crack","minor","Daihatsu","Sigra",2016,0.79,"Repaint",1,15,8,24,"SUPP-001","PT. Auto Gemilang Jaya",12,0,350000,350000,2,"Normal","Quality Check","Primer (Liter)",0.71],
["Fender Kanan Depan","shattered","critical","Suzuki","Ertiga",2018,0.79,"Replace",1,12,4,6,"SUPP-004","Distributor Oto Nusantara",9,0,650000,650000,5,"Normal","In Repair","None",0.0],
["Bumper Depan","scratch","moderate","Mitsubishi","Pajero Sport",2016,0.82,"Repaint",1,15,3,8,"SUPP-003","UD. Motor Sejahtera",9,0,350000,350000,3,"Urgent","In Repair","Automotive Paint (Liter)",1.44],
["Headlamp Kanan","crack","critical","Hyundai","Creta",2025,0.82,"Replace",1,6,7,23,"SUPP-004","Distributor Oto Nusantara",6,20,1500000,1500000,5,"Normal","In Repair","None",0.0],
["Bumper Belakang","crack","severe","Daihatsu","Sigra",2017,0.79,"Replace",1,9,2,19,"SUPP-005","Bintang Auto Sentosa",7,0,800000,800000,6,"High","Parts Available","None",0.0],
["Kaca Depan","scratch","minor","Mitsubishi","Xpander",2024,0.74,"Repaint",1,9,2,10,"SUPP-001","PT. Auto Gemilang Jaya",6,0,350000,350000,3,"Normal","Parts Available","Primer (Liter)",0.76],
["Bumper Belakang","shattered","moderate","Daihatsu","Creta",2026,0.82,"Replace",1,8,6,23,"SUPP-003","UD. Motor Sejahtera",3,0,800000,800000,3,"Normal","Completed","None",0.0],
["Fender Kanan Depan","scratch","moderate","Suzuki","XL7",2023,0.97,"Repaint",1,7,3,2,"SUPP-005","Bintang Auto Sentosa",4,0,350000,350000,4,"Normal","Quality Check","Automotive Paint (Liter)",0.55],
["Bumper Belakang","crack","severe","Daihatsu","Sigra",2017,0.9,"Replace",1,3,7,25,"SUPP-002","CV. Sparepart Makmur",1,10,800000,800000,6,"Normal","Quality Check","None",0.0],
["Bumper Depan","crack","moderate","Hyundai","Creta",2018,0.96,"Replace",1,6,8,10,"SUPP-003","UD. Motor Sejahtera",5,6,800000,800000,3,"Normal","Parts Available","None",0.0],
["Headlamp Kanan","crack","critical","Hyundai","Creta",2025,0.88,"Replace",1,1,3,14,"SUPP-002","CV. Sparepart Makmur",1,17,1500000,1500000,6,"Low","In Repair","None",0.0],
["Kaca Depan","crack","severe","Mitsubishi","Xpander",2024,0.79,"Replace",1,1,2,10,"SUPP-005","Bintang Auto Sentosa",10,8,1200000,1200000,5,"Normal","Completed","None",0.0],
["Fender Kanan Depan","broken","severe","Toyota","Creta",2017,0.86,"Replace",1,15,3,17,"SUPP-004","Distributor Oto Nusantara",5,0,650000,650000,4,"High","In Repair","None",0.0],
["Fender Kanan Depan","shattered","critical","Suzuki","Ertiga",2018,0.7,"Replace",1,5,7,15,"SUPP-003","UD. Motor Sejahtera",12,10,650000,650000,3,"High","In Repair","None",0.0],
["Bumper Depan","crack","moderate","Hyundai","Creta",2018,0.78,"Repair",1,5,6,21,"SUPP-004","Distributor Oto Nusantara",14,18,450000,450000,4,"Normal","Parts Available","Body Filler (Kg)",0.25],
["Bumper Depan","shattered","moderate","Suzuki","Ertiga",2023,0.82,"Replace",1,4,5,11,"SUPP-002","CV. Sparepart Makmur",1,13,800000,800000,6,"Normal","In Repair","None",0.0],
["Headlamp Kanan","scratch","severe","Toyota","Avanza",2016,0.87,"Replace",1,10,4,19,"SUPP-005","Bintang Auto Sentosa",1,0,1500000,1500000,5,"Normal","Parts Available","None",0.0],
["Fender Kanan Depan","shattered","critical","Suzuki","Ertiga",2018,0.89,"Replace",1,1,7,4,"SUPP-004","Distributor Oto Nusantara",5,10,650000,650000,6,"Normal","In Repair","None",0.0],
["Pintu Depan Kanan","crack","moderate","Honda","Civic",2025,0.83,"Repair",1,9,4,20,"SUPP-002","CV. Sparepart Makmur",4,0,450000,450000,3,"Normal","Completed","Body Filler (Kg)",0.49],
["Kaca Depan","crack","minor","Mitsubishi","Pajero Sport",2025,0.83,"Repaint",1,11,5,23,"SUPP-005","Bintang Auto Sentosa",8,0,350000,350000,4,"High","Completed","Primer (Liter)",1.33],
["Headlamp Kanan","scratch","severe","Toyota","Avanza",2016,0.76,"Replace",1,2,6,15,"SUPP-005","Bintang Auto Sentosa",12,16,1500000,1500000,3,"Urgent","Waiting for Parts","None",0.0],
["Bumper Depan","scratch","moderate","Suzuki","Ertiga",2021,0.84,"Repaint",1,1,8,18,"SUPP-005","Bintang Auto Sentosa",4,9,350000,350000,2,"Normal","Parts Available","Clear Coat (Liter)",1.35],
["Bumper Depan","scratch","moderate","Suzuki","Ertiga",2021,0.96,"Repaint",1,15,2,17,"SUPP-004","Distributor Oto Nusantara",13,0,350000,350000,2,"Normal","Completed","Clear Coat (Liter)",0.63],
["Bumper Belakang","broken","moderate","Honda","Civic",2019,0.93,"Replace",1,1,6,15,"SUPP-003","UD. Motor Sejahtera",12,5,800000,800000,6,"Normal","Waiting for Parts","None",0.0],
["Bumper Depan","dent","critical","Honda","CR-V",2016,0.75,"Replace",1,6,6,3,"SUPP-001","PT. Auto Gemilang Jaya",7,16,800000,800000,3,"Normal","Waiting for Parts","None",0.0],
["Fender Kanan Depan","scratch","severe","Hyundai","Civic",2018,0.72,"Replace",1,2,5,2,"SUPP-003","UD. Motor Sejahtera",7,10,650000,650000,4,"High","Quality Check","None",0.0],
["Kaca Depan","shattered","moderate","Toyota","Creta",2015,0.85,"Replace",1,11,5,15,"SUPP-004","Distributor Oto Nusantara",7,0,1200000,1200000,3,"Normal","Completed","None",0.0],
["Kaca Depan","scratch","minor","Mitsubishi","Xpander",2024,0.88,"Repaint",1,4,7,12,"SUPP-001","PT. Auto Gemilang Jaya",3,17,350000,350000,4,"Normal","Waiting for Parts","Automotive Paint (Liter)",1.23],
["Bumper Depan","dent","severe","Toyota","Innova Zenix",2016,0.8,"Replace",1,0,4,15,"SUPP-005","Bintang Auto Sentosa",7,17,800000,800000,4,"Normal","In Repair","None",0.0],
["Kaca Depan","crack","severe","Mitsubishi","Xpander",2024,0.94,"Replace",1,4,4,7,"SUPP-001","PT. Auto Gemilang Jaya",1,18,1200000,1200000,7,"High","Waiting for Parts","None",0.0],
["Fender Kanan Depan","broken","severe","Toyota","Creta",2017,0.92,"Replace",1,7,3,3,"SUPP-001","PT. Auto Gemilang Jaya",10,0,650000,650000,3,"Normal","Waiting for Parts","None",0.0],
["Headlamp Kanan","scratch","severe","Toyota","Avanza",2016,0.9,"Replace",1,7,7,2,"SUPP-004","Distributor Oto Nusantara",8,12,1500000,1500000,7,"Normal","Waiting for Parts","None",0.0],
["Kap Mesin","dent","severe","Toyota","Innova Zenix",2021,0.77,"Replace",1,4,6,10,"SUPP-002","CV. Sparepart Makmur",14,15,500000,500000,7,"Normal","In Repair","None",0.0],
["Kap Mesin","shattered","minor","Toyota","Creta",2015,0.76,"Replace",1,7,4,5,"SUPP-005","Bintang Auto Sentosa",4,0,500000,500000,6,"Normal","Waiting for Parts","None",0.0],
["Bumper Belakang","broken","moderate","Honda","Civic",2019,0.71,"Replace",1,5,7,22,"SUPP-004","Distributor Oto Nusantara",9,20,800000,800000,3,"Urgent","Quality Check","None",0.0],
["Fender Kanan Depan","shattered","moderate","Honda","CR-V",2026,0.77,"Replace",1,10,7,14,"SUPP-004","Distributor Oto Nusantara",3,0,650000,650000,5,"Normal","Completed","None",0.0],
["Kap Mesin","dent","moderate","Toyota","Creta",2017,0.84,"Replace",1,7,8,8,"SUPP-003","UD. Motor Sejahtera",14,9,500000,500000,6,"Urgent","Completed","None",0.0],
["Fender Kanan Depan","shattered","critical","Suzuki","Ertiga",2018,0.95,"Replace",1,13,5,18,"SUPP-005","Bintang Auto Sentosa",3,0,650000,650000,6,"Normal","Parts Available","None",0.0],
["Fender Kanan Depan","broken","critical","Daihatsu","Creta",2017,0.72,"Replace",1,10,7,3,"SUPP-004","Distributor Oto Nusantara",14,0,650000,650000,5,"Low","Parts Available","None",0.0],
["Bumper Depan","scratch","moderate","Suzuki","Ertiga",2021,0.82,"Repaint",1,1,4,13,"SUPP-005","Bintang Auto Sentosa",10,6,350000,350000,2,"Normal","Completed","Automotive Paint (Liter)",1.3],
["Bumper Depan","shattered","moderate","Suzuki","Ertiga",2023,0.88,"Replace",1,6,5,7,"SUPP-003","UD. Motor Sejahtera",5,0,800000,800000,3,"Normal","Parts Available","None",0.0],
["Bumper Depan","shattered","minor","Toyota","Innova Zenix",2025,0.76,"Replace",1,3,7,25,"SUPP-004","Distributor Oto Nusantara",4,11,800000,800000,6,"Urgent","Completed","None",0.0],
["Bumper Belakang","dent","moderate","Daihatsu","Ayla",2024,0.9,"Replace",1,9,5,15,"SUPP-005","Bintang Auto Sentosa",11,0,800000,800000,5,"Normal","In Repair","None",0.0],
["Kaca Depan","scratch","minor","Suzuki","Ertiga",2016,0.84,"Repaint",1,15,5,4,"SUPP-004","Distributor Oto Nusantara",13,0,350000,350000,3,"Normal","Completed","Automotive Paint (Liter)",0.87],
["Bumper Depan","scratch","moderate","Suzuki","Ertiga",2021,0.77,"Repaint",1,7,7,5,"SUPP-001","PT. Auto Gemilang Jaya",5,18,350000,350000,3,"Normal","Completed","Automotive Paint (Liter)",0.7],
["Bumper Depan","crack","moderate","Hyundai","Creta",2018,0.89,"Repair",1,15,6,21,"SUPP-003","UD. Motor Sejahtera",5,0,450000,450000,5,"Normal","Quality Check","Body Filler (Kg)",0.78],
["Bumper Depan","scratch","moderate","Suzuki","Ertiga",2021,0.7,"Repaint",1,14,3,24,"SUPP-003","UD. Motor Sejahtera",3,0,350000,350000,2,"Low","Completed","Primer (Liter)",1.05],
["Fender Kanan Depan","broken","critical","Daihatsu","Creta",2017,0.92,"Replace",1,1,6,2,"SUPP-001","PT. Auto Gemilang Jaya",14,6,650000,650000,3,"Normal","Parts Available","None",0.0],
["Bumper Belakang","crack","minor","Daihatsu","Sigra",2016,0.92,"Repaint",1,2,7,5,"SUPP-001","PT. Auto Gemilang Jaya",4,19,350000,350000,3,"Normal","Completed","Automotive Paint (Liter)",1.12],
["Bumper Belakang","shattered","severe","Daihatsu","Terios",2026,0.73,"Replace",1,15,7,16,"SUPP-001","PT. Auto Gemilang Jaya",1,0,800000,800000,7,"Normal","Waiting for Parts","None",0.0],
["Kaca Depan","scratch","critical","Honda","Brio",2018,0.82,"Replace",1,0,6,24,"SUPP-003","UD. Motor Sejahtera",9,14,1200000,1200000,3,"Normal","Quality Check","None",0.0],
["Bumper Depan","crack","moderate","Hyundai","Creta",2018,0.75,"Repair",1,3,2,17,"SUPP-002","CV. Sparepart Makmur",4,0,450000,450000,3,"Normal","In Repair","Body Filler (Kg)",0.57],
["Bumper Depan","dent","critical","Honda","CR-V",2016,0.98,"Replace",1,8,8,13,"SUPP-001","PT. Auto Gemilang Jaya",6,17,800000,800000,6,"Normal","Parts Available","None",0.0],
["Bumper Depan","scratch","moderate","Mitsubishi","Pajero Sport",2016,0.85,"Repaint",1,9,7,3,"SUPP-001","PT. Auto Gemilang Jaya",2,0,350000,350000,3,"Normal","Waiting for Parts","Clear Coat (Liter)",0.88],
["Bumper Belakang","shattered","severe","Daihatsu","Terios",2026,0.71,"Replace",1,5,2,16,"SUPP-004","Distributor Oto Nusantara",11,0,800000,800000,5,"Normal","Waiting for Parts","None",0.0],
["Kaca Depan","shattered","moderate","Toyota","Creta",2015,0.77,"Replace",1,1,3,7,"SUPP-005","Bintang Auto Sentosa",8,13,1200000,1200000,3,"Urgent","In Repair","None",0.0],
["Kaca Depan","scratch","minor","Suzuki","Ertiga",2016,0.95,"Repaint",1,1,3,11,"SUPP-001","PT. Auto Gemilang Jaya",4,9,350000,350000,4,"Normal","Completed","Clear Coat (Liter)",1.43],
["Fender Kanan Depan","broken","severe","Toyota","Creta",2017,0.83,"Replace",1,7,6,13,"SUPP-005","Bintang Auto Sentosa",6,0,650000,650000,6,"High","Parts Available","None",0.0],
["Fender Kanan Depan","scratch","moderate","Suzuki","XL7",2023,0.93,"Repaint",1,2,6,24,"SUPP-003","UD. Motor Sejahtera",1,8,350000,350000,3,"Normal","Completed","Automotive Paint (Liter)",1.34],
["Fender Kanan Depan","scratch","moderate","Suzuki","XL7",2023,0.89,"Repaint",1,12,8,11,"SUPP-001","PT. Auto Gemilang Jaya",11,0,350000,350000,3,"Normal","Quality Check","Clear Coat (Liter)",0.99],
["Bumper Depan","scratch","moderate","Mitsubishi","Pajero Sport",2016,0.99,"Repaint",1,13,3,22,"SUPP-005","Bintang Auto Sentosa",11,0,350000,350000,3,"Normal","Parts Available","Automotive Paint (Liter)",1.27],
["Fender Kanan Depan","scratch","severe","Hyundai","Civic",2018,0.87,"Replace",1,2,2,9,"SUPP-002","CV. Sparepart Makmur",7,9,650000,650000,6,"Normal","Waiting for Parts","None",0.0],
["Bumper Belakang","broken","critical","Honda","CR-V",2025,0.98,"Replace",1,2,2,10,"SUPP-004","Distributor Oto Nusantara",6,13,800000,800000,3,"Low","Parts Available","None",0.0],
["Bumper Depan","broken","severe","Toyota","Avanza",2016,0.96,"Replace",1,13,5,18,"SUPP-005","Bintang Auto Sentosa",9,0,800000,800000,6,"Low","Waiting for Parts","None",0.0],
["Kaca Depan","shattered","moderate","Toyota","Creta",2015,0.88,"Replace",1,11,6,3,"SUPP-005","Bintang Auto Sentosa",10,0,1200000,1200000,5,"High","Waiting for Parts","None",0.0],
["Kaca Depan","broken","severe","Hyundai","Civic",2015,0.91,"Replace",1,9,5,13,"SUPP-001","PT. Auto Gemilang Jaya",12,0,1200000,1200000,7,"Urgent","Parts Available","None",0.0],
["Bumper Depan","broken","severe","Toyota","Avanza",2016,0.85,"Replace",1,5,7,13,"SUPP-002","CV. Sparepart Makmur",3,13,800000,800000,5,"Normal","Parts Available","None",0.0],
["Kap Mesin","scratch","critical","Daihatsu","Sigra",2020,0.94,"Replace",1,2,3,14,"SUPP-003","UD. Motor Sejahtera",7,14,500000,500000,6,"High","In Repair","None",0.0],
["Bumper Belakang","broken","critical","Suzuki","XL7",2018,0.86,"Replace",1,8,3,24,"SUPP-004","Distributor Oto Nusantara",10,0,800000,800000,7,"Low","Waiting for Parts","None",0.0],
["Fender Kanan Depan","broken","critical","Daihatsu","Creta",2017,0.96,"Replace",1,4,4,1,"SUPP-004","Distributor Oto Nusantara",6,17,650000,650000,5,"Normal","Quality Check","None",0.0],
["Kap Mesin","dent","moderate","Toyota","Creta",2017,0.92,"Repair",1,9,4,20,"SUPP-002","CV. Sparepart Makmur",8,0,450000,450000,4,"Normal","In Repair","Body Filler (Kg)",0.31],
["Kaca Depan","shattered","moderate","Toyota","Creta",2015,0.84,"Replace",1,9,7,23,"SUPP-004","Distributor Oto Nusantara",10,0,1200000,1200000,4,"Normal","In Repair","None",0.0],
["Bumper Belakang","crack","severe","Daihatsu","Sigra",2017,0.78,"Replace",1,12,4,4,"SUPP-005","Bintang Auto Sentosa",4,0,800000,800000,7,"Urgent","Parts Available","None",0.0],
["Fender Kanan Depan","scratch","moderate","Suzuki","XL7",2023,0.77,"Repaint",1,0,7,15,"SUPP-002","CV. Sparepart Makmur",8,14,350000,350000,4,"High","Quality Check","Automotive Paint (Liter)",1.32],
["Pintu Depan Kanan","crack","minor","Honda","CR-V",2015,0.88,"Repaint",1,15,3,21,"SUPP-003","UD. Motor Sejahtera",4,0,350000,350000,3,"Normal","Quality Check","Primer (Liter)",0.65],
["Bumper Belakang","shattered","moderate","Daihatsu","Creta",2026,0.92,"Replace",1,2,5,20,"SUPP-004","Distributor Oto Nusantara",10,17,800000,800000,7,"Normal","Quality Check","None",0.0],
["Bumper Depan","scratch","critical","Honda","Civic",2015,0.85,"Replace",1,1,8,12,"SUPP-005","Bintang Auto Sentosa",10,7,800000,800000,3,"High","In Repair","None",0.0],
["Bumper Belakang","broken","critical","Honda","CR-V",2025,0.88,"Replace",1,5,7,20,"SUPP-001","PT. Auto Gemilang Jaya",10,17,800000,800000,5,"Urgent","Quality Check","None",0.0],
["Bumper Depan","broken","severe","Toyota","Avanza",2016,0.78,"Replace",1,3,2,4,"SUPP-003","UD. Motor Sejahtera",4,0,800000,800000,7,"High","Completed","None",0.0],
["Kaca Depan","crack","severe","Mitsubishi","Xpander",2024,0.72,"Replace",1,7,5,12,"SUPP-004","Distributor Oto Nusantara",8,0,1200000,1200000,7,"Normal","Parts Available","None",0.0],
["Bumper Belakang","dent","moderate","Daihatsu","Ayla",2024,0.78,"Replace",1,0,5,4,"SUPP-003","UD. Motor Sejahtera",7,7,800000,800000,3,"High","Parts Available","None",0.0],
["Bumper Depan","dent","severe","Toyota","Innova Zenix",2016,0.78,"Replace",1,11,4,11,"SUPP-004","Distributor Oto Nusantara",13,0,800000,800000,4,"Normal","In Repair","None",0.0],
["Kaca Depan","broken","minor","Toyota","Avanza",2015,0.79,"Replace",1,15,2,15,"SUPP-004","Distributor Oto Nusantara",6,0,1200000,1200000,3,"Normal","Waiting for Parts","None",0.0],
["Fender Kanan Depan","scratch","severe","Hyundai","Civic",2018,0.86,"Replace",1,0,8,11,"SUPP-001","PT. Auto Gemilang Jaya",11,10,650000,650000,4,"Normal","Completed","None",0.0],
["Bumper Belakang","crack","severe","Daihatsu","Sigra",2017,0.74,"Replace",1,5,4,18,"SUPP-004","Distributor Oto Nusantara",8,0,800000,800000,4,"High","Parts Available","None",0.0],
["Fender Kanan Depan","dent","critical","Daihatsu","Xenia",2023,0.77,"Replace",1,5,7,22,"SUPP-004","Distributor Oto Nusantara",7,5,650000,650000,7,"High","Quality Check","None",0.0],
["Bumper Depan","dent","severe","Toyota","Innova Zenix",2016,0.9,"Replace",1,13,5,1,"SUPP-002","CV. Sparepart Makmur",4,0,800000,800000,5,"High","Waiting for Parts","None",0.0],
["Bumper Depan","dent","severe","Toyota","Innova Zenix",2016,0.9,"Replace",1,3,8,18,"SUPP-002","CV. Sparepart Makmur",6,15,800000,800000,4,"Normal","In Repair","None",0.0],
["Bumper Depan","shattered","moderate","Suzuki","Ertiga",2023,0.72,"Replace",1,15,6,21,"SUPP-003","UD. Motor Sejahtera",10,0,800000,800000,6,"Normal","Completed","None",0.0],
["Bumper Depan","shattered","moderate","Suzuki","Ertiga",2023,0.82,"Replace",1,3,4,12,"SUPP-004","Distributor Oto Nusantara",10,10,800000,800000,5,"Urgent","Completed","None",0.0],
["Kap Mesin","shattered","moderate","Hyundai","Civic",2017,0.86,"Replace",1,2,7,5,"SUPP-003","UD. Motor Sejahtera",2,12,500000,500000,5,"Low","In Repair","None",0.0],
["Bumper Belakang","broken","critical","Suzuki","XL7",2018,0.82,"Replace",1,4,6,13,"SUPP-004","Distributor Oto Nusantara",10,9,800000,800000,7,"Normal","Parts Available","None",0.0],
["Pintu Depan Kanan","crack","moderate","Honda","Civic",2025,0.76,"Replace",1,5,6,6,"SUPP-004","Distributor Oto Nusantara",5,9,1900000,1900000,4,"Normal","Quality Check","None",0.0],
["Bumper Depan","dent","severe","Toyota","Innova Zenix",2016,0.82,"Replace",1,1,8,12,"SUPP-001","PT. Auto Gemilang Jaya",8,9,800000,800000,4,"High","Completed","None",0.0],
["Headlamp Kanan","crack","critical","Hyundai","Creta",2025,0.96,"Replace",1,15,5,22,"SUPP-004","Distributor Oto Nusantara",7,0,1500000,1500000,6,"Normal","Waiting for Parts","None",0.0],
["Kaca Depan","shattered","moderate","Toyota","Creta",2015,0.87,"Replace",1,0,8,25,"SUPP-002","CV. Sparepart Makmur",5,6,1200000,1200000,5,"Normal","In Repair","None",0.0],
["Bumper Belakang","broken","moderate","Honda","Civic",2019,0.9,"Replace",1,5,8,15,"SUPP-005","Bintang Auto Sentosa",12,20,800000,800000,7,"Normal","Completed","None",0.0],
["Bumper Depan","crack","moderate","Hyundai","Creta",2018,0.95,"Repair",1,8,8,18,"SUPP-003","UD. Motor Sejahtera",9,6,450000,450000,5,"Urgent","Waiting for Parts","Body Filler (Kg)",0.53],
["Kaca Depan","scratch","minor","Suzuki","Ertiga",2016,0.92,"Repaint",1,7,4,2,"SUPP-004","Distributor Oto Nusantara",5,0,350000,350000,3,"Urgent","Parts Available","Automotive Paint (Liter)",0.94],
["Bumper Belakang","broken","critical","Honda","CR-V",2025,0.81,"Replace",1,6,8,24,"SUPP-005","Bintang Auto Sentosa",12,16,800000,800000,7,"Normal","Parts Available","None",0.0],
["Kaca Depan","scratch","minor","Mitsubishi","Xpander",2024,0.7,"Repaint",1,4,8,7,"SUPP-002","CV. Sparepart Makmur",13,6,350000,350000,4,"Normal","Parts Available","Clear Coat (Liter)",1.03],
["Kaca Depan","scratch","critical","Honda","Brio",2018,0.8,"Replace",1,10,7,10,"SUPP-003","UD. Motor Sejahtera",10,0,1200000,1200000,5,"Urgent","Completed","None",0.0],
["Kaca Depan","shattered","moderate","Toyota","Creta",2015,0.92,"Replace",1,3,3,25,"SUPP-004","Distributor Oto Nusantara",1,13,1200000,1200000,4,"High","Parts Available","None",0.0],
["Fender Kanan Depan","dent","critical","Daihatsu","Xenia",2023,0.95,"Replace",1,7,3,23,"SUPP-003","UD. Motor Sejahtera",14,0,650000,650000,4,"High","Quality Check","None",0.0],
["Headlamp Kanan","scratch","severe","Toyota","Avanza",2016,0.98,"Replace",1,15,3,19,"SUPP-003","UD. Motor Sejahtera",11,0,1500000,1500000,6,"Normal","Waiting for Parts","None",0.0],
["Kaca Depan","scratch","minor","Suzuki","Ertiga",2016,0.82,"Repaint",1,2,5,17,"SUPP-003","UD. Motor Sejahtera",12,16,350000,350000,3,"Low","Waiting for Parts","Clear Coat (Liter)",0.83],
["Fender Kanan Depan","broken","severe","Toyota","Creta",2017,0.92,"Replace",1,14,7,22,"SUPP-003","UD. Motor Sejahtera",14,0,650000,650000,3,"High","Quality Check","None",0.0],
["Fender Kanan Depan","broken","critical","Daihatsu","Creta",2017,0.86,"Replace",1,6,5,7,"SUPP-004","Distributor Oto Nusantara",5,0,650000,650000,5,"High","In Repair","None",0.0],
["Bumper Belakang","broken","moderate","Honda","Civic",2019,0.87,"Replace",1,4,6,16,"SUPP-003","UD. Motor Sejahtera",11,6,800000,800000,3,"Low","Quality Check","None",0.0],
["Fender Kanan Depan","scratch","severe","Hyundai","Civic",2018,0.76,"Replace",1,0,2,6,"SUPP-004","Distributor Oto Nusantara",8,5,650000,650000,6,"Normal","Parts Available","None",0.0],
["Bumper Depan","shattered","moderate","Suzuki","Ertiga",2023,0.76,"Replace",1,9,3,9,"SUPP-001","PT. Auto Gemilang Jaya",11,0,800000,800000,5,"Normal","In Repair","None",0.0],
["Fender Kanan Depan","shattered","critical","Suzuki","Ertiga",2018,0.83,"Replace",1,5,2,13,"SUPP-003","UD. Motor Sejahtera",12,0,650000,650000,4,"Normal","Waiting for Parts","None",0.0],
["Fender Kanan Depan","scratch","moderate","Suzuki","XL7",2023,0.71,"Repaint",1,3,2,7,"SUPP-004","Distributor Oto Nusantara",2,0,350000,350000,2,"Normal","Waiting for Parts","Primer (Liter)",0.73],
["Bumper Depan","broken","severe","Toyota","Avanza",2016,0.8,"Replace",1,0,7,11,"SUPP-001","PT. Auto Gemilang Jaya",14,18,800000,800000,4,"Normal","Parts Available","None",0.0],
["Bumper Depan","broken","severe","Toyota","Avanza",2016,0.9,"Replace",1,12,2,24,"SUPP-001","PT. Auto Gemilang Jaya",2,0,800000,800000,5,"Normal","In Repair","None",0.0],
["Fender Kanan Depan","shattered","critical","Suzuki","Ertiga",2018,0.82,"Replace",1,4,5,25,"SUPP-002","CV. Sparepart Makmur",11,9,650000,650000,3,"Normal","Waiting for Parts","None",0.0],
["Kaca Depan","scratch","minor","Mitsubishi","Xpander",2024,0.75,"Repaint",1,5,5,12,"SUPP-002","CV. Sparepart Makmur",11,9,350000,350000,3,"High","Waiting for Parts","Primer (Liter)",1.19],
["Kaca Depan","broken","severe","Hyundai","Civic",2015,0.84,"Replace",1,3,3,25,"SUPP-001","PT. Auto Gemilang Jaya",10,17,1200000,1200000,5,"Urgent","In Repair","None",0.0],
["Kaca Depan","broken","severe","Hyundai","Civic",2015,0.74,"Replace",1,4,3,9,"SUPP-001","PT. Auto Gemilang Jaya",4,0,1200000,1200000,7,"Normal","Completed","None",0.0],
["Kap Mesin","dent","severe","Toyota","Innova Zenix",2021,0.88,"Replace",1,9,8,23,"SUPP-001","PT. Auto Gemilang Jaya",14,0,500000,500000,5,"Normal","Completed","None",0.0],
["Kaca Depan","shattered","moderate","Toyota","Creta",2015,0.71,"Replace",1,6,7,13,"SUPP-003","UD. Motor Sejahtera",11,6,1200000,1200000,4,"Normal","Waiting for Parts","None",0.0],
["Kaca Depan","broken","minor","Toyota","Avanza",2015,0.81,"Replace",1,7,5,21,"SUPP-005","Bintang Auto Sentosa",2,0,1200000,1200000,7,"High","Waiting for Parts","None",0.0],
["Kaca Depan","scratch","critical","Honda","Brio",2018,0.86,"Replace",1,11,4,5,"SUPP-004","Distributor Oto Nusantara",14,0,1200000,1200000,7,"Normal","Completed","None",0.0],
["Kaca Depan","broken","severe","Hyundai","Civic",2015,0.71,"Replace",1,5,8,16,"SUPP-001","PT. Auto Gemilang Jaya",1,7,1200000,1200000,3,"Normal","Waiting for Parts","None",0.0],
["Fender Kanan Depan","broken","critical","Daihatsu","Creta",2017,0.89,"Replace",1,1,8,13,"SUPP-005","Bintang Auto Sentosa",5,18,650000,650000,6,"High","Waiting for Parts","None",0.0],
["Kaca Depan","broken","severe","Hyundai","Civic",2015,0.74,"Replace",1,4,4,3,"SUPP-003","UD. Motor Sejahtera",2,11,1200000,1200000,4,"Normal","Quality Check","None",0.0],
["Kaca Depan","crack","minor","Mitsubishi","Pajero Sport",2025,0.83,"Repaint",1,2,4,23,"SUPP-004","Distributor Oto Nusantara",12,12,350000,350000,2,"Normal","Quality Check","Automotive Paint (Liter)",0.59],
["Kaca Depan","broken","severe","Hyundai","Civic",2015,0.71,"Replace",1,1,4,22,"SUPP-002","CV. Sparepart Makmur",2,5,1200000,1200000,4,"High","Parts Available","None",0.0],
["Kaca Depan","broken","minor","Toyota","Avanza",2015,0.81,"Replace",1,15,4,17,"SUPP-005","Bintang Auto Sentosa",13,0,1200000,1200000,5,"Low","Parts Available","None",0.0],
["Kaca Depan","broken","minor","Toyota","Avanza",2015,0.76,"Replace",1,8,7,4,"SUPP-001","PT. Auto Gemilang Jaya",6,0,1200000,1200000,6,"Normal","Waiting for Parts","None",0.0],
["Bumper Depan","dent","severe","Toyota","Innova Zenix",2016,0.79,"Replace",1,8,7,19,"SUPP-001","PT. Auto Gemilang Jaya",8,0,800000,800000,6,"Normal","Waiting for Parts","None",0.0],
["Kap Mesin","dent","moderate","Toyota","Creta",2017,0.92,"Replace",1,5,4,6,"SUPP-003","UD. Motor Sejahtera",13,0,500000,500000,3,"High","Waiting for Parts","None",0.0],
["Fender Kanan Depan","broken","critical","Daihatsu","Creta",2017,0.81,"Replace",1,7,7,17,"SUPP-001","PT. Auto Gemilang Jaya",1,5,650000,650000,4,"Low","In Repair","None",0.0],
["Bumper Depan","broken","severe","Toyota","Avanza",2016,0.92,"Replace",1,12,3,6,"SUPP-001","PT. Auto Gemilang Jaya",9,0,800000,800000,6,"Normal","Parts Available","None",0.0],
["Bumper Belakang","broken","moderate","Honda","Civic",2019,0.94,"Replace",1,13,7,11,"SUPP-003","UD. Motor Sejahtera",14,0,800000,800000,3,"Normal","Waiting for Parts","None",0.0],
["Bumper Depan","crack","moderate","Hyundai","Creta",2018,0.77,"Repair",1,5,3,17,"SUPP-001","PT. Auto Gemilang Jaya",7,0,450000,450000,2,"High","In Repair","Body Filler (Kg)",0.73],
["Headlamp Kanan","crack","moderate","Mitsubishi","Xpander",2023,0.72,"Replace",1,2,6,15,"SUPP-001","PT. Auto Gemilang Jaya",6,11,1500000,1500000,5,"Normal","In Repair","None",0.0],
["Kaca Depan","broken","minor","Toyota","Avanza",2015,0.71,"Replace",1,7,5,12,"SUPP-005","Bintang Auto Sentosa",8,0,1200000,1200000,4,"High","Completed","None",0.0],
["Bumper Depan","shattered","moderate","Suzuki","Ertiga",2023,0.86,"Replace",1,7,3,1,"SUPP-004","Distributor Oto Nusantara",1,0,800000,800000,4,"Normal","Waiting for Parts","None",0.0],
["Bumper Depan","scratch","moderate","Mitsubishi","Pajero Sport",2016,0.99,"Repaint",1,10,2,25,"SUPP-004","Distributor Oto Nusantara",14,0,350000,350000,4,"Normal","Parts Available","Primer (Liter)",0.81],
["Bumper Depan","broken","severe","Toyota","Avanza",2016,0.8,"Replace",1,13,5,2,"SUPP-002","CV. Sparepart Makmur",12,0,800000,800000,5,"Low","Parts Available","None",0.0],
["Fender Kanan Depan","dent","critical","Daihatsu","Xenia",2023,0.89,"Replace",1,13,7,12,"SUPP-004","Distributor Oto Nusantara",12,0,650000,650000,3,"Normal","Completed","None",0.0],
["Bumper Depan","broken","severe","Toyota","Avanza",2016,0.93,"Replace",1,4,7,13,"SUPP-001","PT. Auto Gemilang Jaya",10,6,800000,800000,6,"Normal","Parts Available","None",0.0],
["Kap Mesin","scratch","critical","Daihatsu","Sigra",2020,0.89,"Replace",1,7,4,9,"SUPP-003","UD. Motor Sejahtera",13,0,500000,500000,6,"High","In Repair","None",0.0],
["Pintu Depan Kanan","crack","moderate","Honda","Civic",2025,0.92,"Replace",1,14,4,8,"SUPP-001","PT. Auto Gemilang Jaya",4,0,1900000,1900000,4,"High","Completed","None",0.0],
["Kaca Depan","crack","minor","Mitsubishi","Pajero Sport",2025,0.98,"Repaint",1,3,3,4,"SUPP-002","CV. Sparepart Makmur",8,19,350000,350000,3,"Normal","Parts Available","Clear Coat (Liter)",0.62],
["Kaca Depan","shattered","minor","Honda","Brio",2026,0.76,"Replace",1,14,4,15,"SUPP-003","UD. Motor Sejahtera",14,0,1200000,1200000,3,"Low","In Repair","None",0.0],
["Fender Kanan Depan","shattered","critical","Suzuki","Ertiga",2018,0.71,"Replace",1,1,3,11,"SUPP-002","CV. Sparepart Makmur",2,12,650000,650000,5,"Normal","Waiting for Parts","None",0.0],
["Bumper Depan","dent","critical","Honda","CR-V",2016,0.74,"Replace",1,9,4,6,"SUPP-001","PT. Auto Gemilang Jaya",7,0,800000,800000,6,"Normal","Completed","None",0.0],
["Kap Mesin","shattered","minor","Toyota","Creta",2015,0.74,"Replace",1,7,2,15,"SUPP-001","PT. Auto Gemilang Jaya",13,0,500000,500000,4,"Low","Waiting for Parts","None",0.0],
["Fender Kanan Depan","dent","critical","Daihatsu","Xenia",2023,0.89,"Replace",1,7,3,7,"SUPP-004","Distributor Oto Nusantara",6,0,650000,650000,3,"Normal","In Repair","None",0.0],
["Bumper Belakang","dent","moderate","Daihatsu","Ayla",2024,0.86,"Repair",1,0,2,7,"SUPP-004","Distributor Oto Nusantara",13,9,450000,450000,2,"High","In Repair","Body Filler (Kg)",0.74],
["Pintu Depan Kanan","crack","moderate","Honda","Civic",2025,0.76,"Repair",1,1,5,2,"SUPP-002","CV. Sparepart Makmur",10,18,450000,450000,5,"Normal","Quality Check","Body Filler (Kg)",0.5],
["Fender Kanan Depan","shattered","moderate","Honda","CR-V",2026,0.9,"Replace",1,5,4,7,"SUPP-002","CV. Sparepart Makmur",5,0,650000,650000,5,"Normal","Parts Available","None",0.0],
["Bumper Belakang","scratch","critical","Toyota","Avanza",2024,0.92,"Replace",1,1,6,20,"SUPP-005","Bintang Auto Sentosa",4,14,800000,800000,6,"Normal","Completed","None",0.0],
["Bumper Belakang","broken","moderate","Honda","Civic",2019,0.75,"Replace",1,15,2,3,"SUPP-003","UD. Motor Sejahtera",7,0,800000,800000,4,"Normal","Completed","None",0.0],
["Fender Kanan Depan","broken","severe","Toyota","Creta",2017,0.88,"Replace",1,7,7,18,"SUPP-001","PT. Auto Gemilang Jaya",7,16,650000,650000,6,"Normal","Quality Check","None",0.0],
["Fender Kanan Depan","dent","critical","Daihatsu","Xenia",2023,0.92,"Replace",1,11,6,17,"SUPP-003","UD. Motor Sejahtera",7,0,650000,650000,5,"Low","In Repair","None",0.0],
["Bumper Belakang","scratch","critical","Toyota","Avanza",2024,0.73,"Replace",1,7,2,25,"SUPP-003","UD. Motor Sejahtera",1,0,800000,800000,6,"Normal","Completed","None",0.0],
["Bumper Belakang","shattered","moderate","Daihatsu","Creta",2026,0.94,"Replace",1,7,3,4,"SUPP-002","CV. Sparepart Makmur",11,0,800000,800000,4,"Normal","Waiting for Parts","None",0.0],
["Kaca Depan","scratch","critical","Honda","Brio",2018,0.98,"Replace",1,7,6,13,"SUPP-003","UD. Motor Sejahtera",14,0,1200000,1200000,4,"Low","Completed","None",0.0],
["Kap Mesin","shattered","moderate","Hyundai","Civic",2017,0.73,"Replace",1,10,8,24,"SUPP-003","UD. Motor Sejahtera",10,0,500000,500000,3,"High","In Repair","None",0.0],
["Bumper Depan","scratch","critical","Honda","Civic",2015,0.71,"Replace",1,4,6,7,"SUPP-004","Distributor Oto Nusantara",9,14,800000,800000,4,"Normal","Waiting for Parts","None",0.0],
["Headlamp Kanan","crack","moderate","Mitsubishi","Xpander",2023,0.79,"Repair",1,7,6,8,"SUPP-001","PT. Auto Gemilang Jaya",9,0,450000,450000,5,"Urgent","Parts Available","Body Filler (Kg)",0.2],
["Bumper Depan","scratch","moderate","Mitsubishi","Pajero Sport",2016,0.9,"Repaint",1,4,4,23,"SUPP-002","CV. Sparepart Makmur",13,15,350000,350000,2,"High","Parts Available","Automotive Paint (Liter)",0.65],
["Kaca Depan","scratch","critical","Honda","Brio",2018,0.98,"Replace",1,3,8,17,"SUPP-003","UD. Motor Sejahtera",2,16,1200000,1200000,6,"Normal","In Repair","None",0.0],
["Headlamp Kanan","crack","moderate","Mitsubishi","Xpander",2023,0.82,"Replace",1,10,3,6,"SUPP-004","Distributor Oto Nusantara",13,0,1500000,1500000,6,"Normal","Parts Available","None",0.0],
["Kap Mesin","shattered","moderate","Hyundai","Civic",2017,0.91,"Replace",1,11,3,22,"SUPP-005","Bintang Auto Sentosa",14,0,500000,500000,4,"Normal","In Repair","None",0.0],
["Bumper Depan","broken","severe","Toyota","Avanza",2016,0.72,"Replace",1,4,3,24,"SUPP-001","PT. Auto Gemilang Jaya",12,0,800000,800000,7,"Normal","Completed","None",0.0],
["Kaca Depan","crack","severe","Mitsubishi","Xpander",2024,0.9,"Replace",1,1,3,20,"SUPP-003","UD. Motor Sejahtera",13,12,1200000,1200000,7,"Low","Quality Check","None",0.0],
["Kaca Depan","scratch","minor","Mitsubishi","Xpander",2024,0.88,"Repaint",1,4,4,24,"SUPP-001","PT. Auto Gemilang Jaya",4,16,350000,350000,3,"Urgent","In Repair","Automotive Paint (Liter)",1.14],
["Bumper Belakang","broken","moderate","Honda","Civic",2019,0.73,"Replace",1,14,2,9,"SUPP-002","CV. Sparepart Makmur",4,0,800000,800000,3,"Normal","Waiting for Parts","None",0.0],
["Bumper Depan","shattered","minor","Toyota","Innova Zenix",2025,0.92,"Replace",1,0,2,13,"SUPP-004","Distributor Oto Nusantara",12,18,800000,800000,4,"High","Quality Check","None",0.0],
["Kaca Depan","shattered","moderate","Toyota","Creta",2015,0.95,"Replace",1,12,4,18,"SUPP-004","Distributor Oto Nusantara",2,0,1200000,1200000,6,"High","Completed","None",0.0],
["Kap Mesin","crack","minor","Hyundai","Civic",2019,0.87,"Repaint",1,7,3,15,"SUPP-001","PT. Auto Gemilang Jaya",13,0,350000,350000,2,"Normal","Waiting for Parts","Clear Coat (Liter)",0.52],
["Bumper Depan","shattered","minor","Toyota","Innova Zenix",2025,0.74,"Replace",1,2,4,6,"SUPP-004","Distributor Oto Nusantara",3,7,800000,800000,7,"Urgent","Waiting for Parts","None",0.0],
["Bumper Depan","crack","moderate","Hyundai","Creta",2018,0.99,"Replace",1,15,7,1,"SUPP-004","Distributor Oto Nusantara",11,0,800000,800000,4,"Normal","Quality Check","None",0.0],
["Pintu Depan Kanan","crack","moderate","Honda","Civic",2025,0.93,"Repair",1,1,2,11,"SUPP-002","CV. Sparepart Makmur",4,18,450000,450000,4,"Normal","Waiting for Parts","Body Filler (Kg)",0.6],
["Bumper Depan","dent","severe","Toyota","Innova Zenix",2016,0.8,"Replace",1,1,5,19,"SUPP-005","Bintang Auto Sentosa",14,20,800000,800000,4,"Low","Waiting for Parts","None",0.0],
["Headlamp Kanan","crack","critical","Hyundai","Creta",2025,0.82,"Replace",1,13,2,10,"SUPP-005","Bintang Auto Sentosa",8,0,1500000,1500000,4,"Low","Parts Available","None",0.0],
["Bumper Depan","dent","severe","Mitsubishi","Pajero Sport",2017,0.81,"Replace",1,5,7,10,"SUPP-001","PT. Auto Gemilang Jaya",8,8,800000,800000,5,"High","Quality Check","None",0.0],
["Kap Mesin","dent","moderate","Toyota","Creta",2017,0.85,"Replace",1,8,2,21,"SUPP-005","Bintang Auto Sentosa",7,0,500000,500000,4,"Normal","Quality Check","None",0.0],
["Fender Kanan Depan","broken","critical","Hyundai","Civic",2022,0.8,"Replace",1,11,3,15,"SUPP-001","PT. Auto Gemilang Jaya",5,0,650000,650000,6,"Normal","Parts Available","None",0.0],
["Bumper Belakang","broken","critical","Suzuki","XL7",2018,0.95,"Replace",1,8,6,2,"SUPP-002","CV. Sparepart Makmur",13,0,800000,800000,3,"Low","In Repair","None",0.0],
["Fender Kanan Depan","scratch","severe","Hyundai","Civic",2018,0.94,"Replace",1,13,8,19,"SUPP-002","CV. Sparepart Makmur",9,0,650000,650000,3,"High","Completed","None",0.0],
["Bumper Depan","scratch","moderate","Suzuki","Ertiga",2021,0.73,"Repaint",1,13,6,22,"SUPP-004","Distributor Oto Nusantara",10,0,350000,350000,2,"Normal","Waiting for Parts","Clear Coat (Liter)",0.8],
["Kaca Depan","crack","severe","Mitsubishi","Xpander",2024,0.98,"Replace",1,4,2,25,"SUPP-004","Distributor Oto Nusantara",3,0,1200000,1200000,4,"Urgent","Parts Available","None",0.0],
["Bumper Belakang","scratch","critical","Toyota","Avanza",2024,0.88,"Replace",1,4,2,14,"SUPP-001","PT. Auto Gemilang Jaya",11,0,800000,800000,6,"Normal","Parts Available","None",0.0],
["Bumper Depan","scratch","moderate","Mitsubishi","Pajero Sport",2016,0.94,"Repaint",1,8,4,24,"SUPP-001","PT. Auto Gemilang Jaya",2,0,350000,350000,3,"Normal","In Repair","Primer (Liter)",0.9],
["Fender Kanan Depan","shattered","moderate","Honda","CR-V",2026,0.91,"Replace",1,14,8,1,"SUPP-005","Bintang Auto Sentosa",10,0,650000,650000,7,"High","Waiting for Parts","None",0.0],
["Kaca Depan","broken","severe","Hyundai","Civic",2015,0.83,"Replace",1,13,3,5,"SUPP-005","Bintang Auto Sentosa",10,0,1200000,1200000,7,"High","Waiting for Parts","None",0.0],
["Kaca Depan","broken","minor","Toyota","Avanza",2015,0.91,"Replace",1,3,6,25,"SUPP-001","PT. Auto Gemilang Jaya",13,14,1200000,1200000,7,"High","Quality Check","None",0.0],
["Bumper Depan","crack","moderate","Hyundai","Creta",2018,0.98,"Replace",1,12,7,16,"SUPP-005","Bintang Auto Sentosa",10,0,800000,800000,6,"Low","In Repair","None",0.0],
["Fender Kanan Depan","shattered","moderate","Honda","CR-V",2026,0.78,"Replace",1,12,3,20,"SUPP-005","Bintang Auto Sentosa",11,0,650000,650000,6,"Low","In Repair","None",0.0],
["Kap Mesin","dent","severe","Toyota","Innova Zenix",2021,0.93,"Replace",1,7,2,24,"SUPP-004","Distributor Oto Nusantara",5,0,500000,500000,5,"Low","In Repair","None",0.0],
["Bumper Depan","dent","critical","Honda","CR-V",2016,0.86,"Replace",1,9,4,16,"SUPP-001","PT. Auto Gemilang Jaya",14,0,800000,800000,4,"Low","Quality Check","None",0.0],
["Fender Kanan Depan","broken","critical","Daihatsu","Creta",2017,0.84,"Replace",1,10,4,24,"SUPP-004","Distributor Oto Nusantara",10,0,650000,650000,3,"Low","Parts Available","None",0.0],
["Bumper Depan","broken","severe","Toyota","Avanza",2016,0.83,"Replace",1,13,7,16,"SUPP-005","Bintang Auto Sentosa",14,0,800000,800000,5,"High","Completed","None",0.0],
["Fender Kanan Depan","broken","severe","Toyota","Creta",2017,0.91,"Replace",1,5,2,10,"SUPP-005","Bintang Auto Sentosa",7,0,650000,650000,4,"High","Completed","None",0.0],
["Kaca Depan","scratch","minor","Mitsubishi","Xpander",2024,0.78,"Repaint",1,0,3,7,"SUPP-002","CV. Sparepart Makmur",14,6,350000,350000,2,"Urgent","Parts Available","Automotive Paint (Liter)",0.96],
["Bumper Depan","scratch","moderate","Suzuki","Ertiga",2021,0.95,"Repaint",1,8,4,15,"SUPP-005","Bintang Auto Sentosa",7,0,350000,350000,4,"Normal","Quality Check","Automotive Paint (Liter)",1.18],
["Headlamp Kanan","crack","moderate","Mitsubishi","Xpander",2023,0.94,"Replace",1,5,8,16,"SUPP-005","Bintang Auto Sentosa",9,16,1500000,1500000,5,"Low","In Repair","None",0.0],
["Fender Kanan Depan","shattered","moderate","Honda","CR-V",2026,0.73,"Replace",1,2,4,1,"SUPP-004","Distributor Oto Nusantara",1,10,650000,650000,7,"High","Parts Available","None",0.0],
["Bumper Belakang","scratch","critical","Toyota","Avanza",2024,0.96,"Replace",1,7,7,8,"SUPP-002","CV. Sparepart Makmur",5,18,800000,800000,7,"Low","Waiting for Parts","None",0.0],
["Kaca Depan","scratch","critical","Honda","Brio",2018,0.77,"Replace",1,15,3,21,"SUPP-002","CV. Sparepart Makmur",10,0,1200000,1200000,3,"Normal","Completed","None",0.0],
["Kap Mesin","shattered","moderate","Hyundai","Civic",2017,0.83,"Replace",1,9,7,23,"SUPP-003","UD. Motor Sejahtera",7,0,500000,500000,6,"High","Quality Check","None",0.0],
["Fender Kanan Depan","shattered","critical","Suzuki","Ertiga",2018,0.88,"Replace",1,8,3,15,"SUPP-003","UD. Motor Sejahtera",11,0,650000,650000,7,"High","Quality Check","None",0.0],
["Bumper Belakang","broken","moderate","Honda","Civic",2019,0.81,"Replace",1,3,2,17,"SUPP-003","UD. Motor Sejahtera",9,0,800000,800000,7,"Normal","In Repair","None",0.0],
["Fender Kanan Depan","shattered","critical","Suzuki","Ertiga",2018,0.71,"Replace",1,3,5,3,"SUPP-003","UD. Motor Sejahtera",5,15,650000,650000,5,"Normal","In Repair","None",0.0],
["Pintu Depan Kanan","crack","moderate","Honda","Civic",2025,0.95,"Repair",1,4,6,25,"SUPP-002","CV. Sparepart Makmur",1,17,450000,450000,4,"High","Quality Check","Body Filler (Kg)",0.61],
["Kaca Depan","broken","severe","Hyundai","Civic",2015,0.75,"Replace",1,9,4,14,"SUPP-004","Distributor Oto Nusantara",7,0,1200000,1200000,3,"Normal","Completed","None",0.0],
["Headlamp Kanan","scratch","severe","Toyota","Avanza",2016,0.76,"Replace",1,6,4,24,"SUPP-002","CV. Sparepart Makmur",11,0,1500000,1500000,7,"Normal","Quality Check","None",0.0],
["Bumper Depan","scratch","critical","Honda","Civic",2015,0.93,"Replace",1,11,6,10,"SUPP-002","CV. Sparepart Makmur",14,0,800000,800000,7,"Low","Waiting for Parts","None",0.0],
["Kaca Depan","shattered","minor","Honda","Brio",2026,0.8,"Replace",1,15,3,24,"SUPP-003","UD. Motor Sejahtera",12,0,1200000,1200000,7,"High","Parts Available","None",0.0],
["Bumper Depan","shattered","minor","Toyota","Innova Zenix",2025,0.96,"Replace",1,10,7,3,"SUPP-002","CV. Sparepart Makmur",6,0,800000,800000,4,"High","In Repair","None",0.0],
["Kap Mesin","shattered","moderate","Hyundai","Civic",2017,0.9,"Replace",1,13,8,11,"SUPP-003","UD. Motor Sejahtera",5,0,500000,500000,7,"Normal","Waiting for Parts","None",0.0],
["Bumper Depan","scratch","moderate","Suzuki","Ertiga",2021,0.78,"Repaint",1,15,2,21,"SUPP-005","Bintang Auto Sentosa",10,0,350000,350000,4,"Low","Waiting for Parts","Automotive Paint (Liter)",0.97],
["Fender Kanan Depan","shattered","moderate","Honda","CR-V",2026,0.7,"Replace",1,12,6,10,"SUPP-004","Distributor Oto Nusantara",1,0,650000,650000,4,"Low","Parts Available","None",0.0],
["Headlamp Kanan","crack","critical","Hyundai","Creta",2025,0.97,"Replace",1,10,5,19,"SUPP-004","Distributor Oto Nusantara",3,0,1500000,1500000,5,"High","Parts Available","None",0.0],
["Bumper Depan","scratch","moderate","Suzuki","Ertiga",2021,0.72,"Repaint",1,2,5,11,"SUPP-002","CV. Sparepart Makmur",6,6,350000,350000,2,"High","Parts Available","Clear Coat (Liter)",0.77],
["Headlamp Kanan","crack","critical","Hyundai","Creta",2025,0.91,"Replace",1,5,5,25,"SUPP-001","PT. Auto Gemilang Jaya",3,18,1500000,1500000,6,"Normal","Quality Check","None",0.0],
["Bumper Belakang","shattered","moderate","Daihatsu","Creta",2026,0.84,"Replace",1,12,2,2,"SUPP-005","Bintang Auto Sentosa",4,0,800000,800000,5,"Urgent","In Repair","None",0.0],
["Kap Mesin","crack","minor","Hyundai","Civic",2019,0.92,"Repaint",1,6,2,22,"SUPP-001","PT. Auto Gemilang Jaya",11,0,350000,350000,4,"High","In Repair","Automotive Paint (Liter)",0.73],
["Kaca Depan","shattered","minor","Suzuki","XL7",2025,0.9,"Replace",1,4,2,13,"SUPP-005","Bintang Auto Sentosa",10,0,1200000,1200000,5,"Low","Waiting for Parts","None",0.0],
["Kap Mesin","crack","minor","Hyundai","Civic",2019,0.89,"Repaint",1,9,4,15,"SUPP-005","Bintang Auto Sentosa",10,0,350000,350000,4,"Normal","Parts Available","Clear Coat (Liter)",0.93],
["Kaca Depan","broken","minor","Toyota","Avanza",2015,0.84,"Replace",1,10,5,12,"SUPP-002","CV. Sparepart Makmur",3,0,1200000,1200000,6,"Low","Parts Available","None",0.0],
["Bumper Depan","scratch","moderate","Suzuki","Ertiga",2021,0.93,"Repaint",1,4,3,24,"SUPP-001","PT. Auto Gemilang Jaya",10,0,350000,350000,4,"High","Waiting for Parts","Automotive Paint (Liter)",0.62],
["Bumper Belakang","scratch","critical","Toyota","Avanza",2024,0.73,"Replace",1,12,7,9,"SUPP-005","Bintang Auto Sentosa",10,0,800000,800000,3,"Normal","Waiting for Parts","None",0.0],
["Kaca Depan","scratch","minor","Mitsubishi","Xpander",2024,0.76,"Repaint",1,3,7,1,"SUPP-001","PT. Auto Gemilang Jaya",12,8,350000,350000,3,"Normal","Quality Check","Clear Coat (Liter)",0.88],
["Bumper Depan","scratch","critical","Honda","Civic",2015,0.9,"Replace",1,4,3,23,"SUPP-001","PT. Auto Gemilang Jaya",5,0,800000,800000,6,"Normal","Completed","None",0.0],
["Bumper Belakang","broken","moderate","Honda","Civic",2019,0.79,"Replace",1,8,6,20,"SUPP-002","CV. Sparepart Makmur",7,0,800000,800000,3,"Normal","Completed","None",0.0],
["Kap Mesin","scratch","critical","Daihatsu","Sigra",2020,0.87,"Replace",1,3,4,4,"SUPP-001","PT. Auto Gemilang Jaya",8,11,500000,500000,7,"Low","In Repair","None",0.0],
["Bumper Belakang","broken","moderate","Honda","Civic",2019,0.84,"Replace",1,6,4,23,"SUPP-004","Distributor Oto Nusantara",5,0,800000,800000,4,"Low","Quality Check","None",0.0],
["Bumper Belakang","shattered","severe","Daihatsu","Terios",2026,0.85,"Replace",1,6,7,16,"SUPP-003","UD. Motor Sejahtera",4,5,800000,800000,3,"Normal","Waiting for Parts","None",0.0],
["Kaca Depan","crack","critical","Honda","Brio",2015,0.82,"Replace",1,15,3,3,"SUPP-005","Bintang Auto Sentosa",2,0,1200000,1200000,3,"Urgent","Parts Available","None",0.0],
["Fender Kanan Depan","shattered","moderate","Honda","CR-V",2026,0.92,"Replace",1,14,4,9,"SUPP-004","Distributor Oto Nusantara",1,0,650000,650000,3,"High","Waiting for Parts","None",0.0],
["Kap Mesin","shattered","moderate","Hyundai","Civic",2017,0.8,"Replace",1,9,4,22,"SUPP-003","UD. Motor Sejahtera",7,0,500000,500000,3,"Low","Waiting for Parts","None",0.0],
["Headlamp Kanan","scratch","severe","Toyota","Avanza",2016,0.9,"Replace",1,0,8,5,"SUPP-002","CV. Sparepart Makmur",6,16,1500000,1500000,6,"Urgent","In Repair","None",0.0],
["Kaca Depan","crack","severe","Mitsubishi","Xpander",2024,0.78,"Replace",1,2,4,11,"SUPP-002","CV. Sparepart Makmur",2,17,1200000,1200000,6,"Urgent","In Repair","None",0.0],
["Kaca Depan","scratch","critical","Honda","Brio",2018,0.77,"Replace",1,12,7,16,"SUPP-004","Distributor Oto Nusantara",11,0,1200000,1200000,4,"Low","Waiting for Parts","None",0.0],
["Kaca Depan","crack","minor","Mitsubishi","Pajero Sport",2025,0.73,"Repaint",1,5,2,14,"SUPP-005","Bintang Auto Sentosa",8,0,350000,350000,4,"Normal","In Repair","Primer (Liter)",0.94],
["Bumper Belakang","broken","moderate","Honda","Civic",2019,0.76,"Replace",1,0,8,22,"SUPP-002","CV. Sparepart Makmur",8,20,800000,800000,3,"High","Quality Check","None",0.0],
["Fender Kanan Depan","shattered","moderate","Honda","CR-V",2026,0.73,"Replace",1,1,2,9,"SUPP-003","UD. Motor Sejahtera",1,12,650000,650000,5,"Normal","Completed","None",0.0],
["Kap Mesin","dent","severe","Toyota","Innova Zenix",2021,0.86,"Replace",1,3,5,22,"SUPP-002","CV. Sparepart Makmur",8,16,500000,500000,6,"Low","Completed","None",0.0],
["Bumper Belakang","dent","moderate","Daihatsu","Ayla",2024,0.92,"Repair",1,0,7,6,"SUPP-005","Bintang Auto Sentosa",14,20,450000,450000,5,"Low","Quality Check","Body Filler (Kg)",0.72],
["Bumper Belakang","dent","moderate","Daihatsu","Ayla",2024,0.75,"Replace",1,7,4,9,"SUPP-001","PT. Auto Gemilang Jaya",9,0,800000,800000,4,"Normal","Quality Check","None",0.0],
["Kaca Depan","shattered","minor","Suzuki","XL7",2025,0.76,"Replace",1,12,8,8,"SUPP-001","PT. Auto Gemilang Jaya",8,0,1200000,1200000,6,"High","Quality Check","None",0.0],
["Bumper Belakang","broken","critical","Suzuki","XL7",2018,0.84,"Replace",1,2,8,16,"SUPP-004","Distributor Oto Nusantara",6,8,800000,800000,6,"High","Waiting for Parts","None",0.0],
["Kaca Depan","shattered","minor","Honda","Brio",2026,0.91,"Replace",1,3,5,14,"SUPP-001","PT. Auto Gemilang Jaya",9,5,1200000,1200000,3,"High","Completed","None",0.0],
["Kaca Depan","shattered","minor","Honda","Brio",2026,0.98,"Replace",1,9,6,18,"SUPP-002","CV. Sparepart Makmur",11,0,1200000,1200000,6,"Urgent","In Repair","None",0.0],
["Bumper Belakang","crack","severe","Daihatsu","Sigra",2017,0.85,"Replace",1,1,8,8,"SUPP-004","Distributor Oto Nusantara",6,20,800000,800000,5,"High","Waiting for Parts","None",0.0],
["Headlamp Kanan","scratch","severe","Toyota","Avanza",2016,0.78,"Replace",1,3,8,22,"SUPP-002","CV. Sparepart Makmur",1,15,1500000,1500000,5,"High","In Repair","None",0.0],
["Kaca Depan","scratch","minor","Suzuki","Ertiga",2016,0.73,"Repaint",1,11,7,4,"SUPP-001","PT. Auto Gemilang Jaya",3,0,350000,350000,3,"High","Quality Check","Automotive Paint (Liter)",1.32],
["Kaca Depan","scratch","minor","Suzuki","Ertiga",2016,0.76,"Repaint",1,3,4,20,"SUPP-002","CV. Sparepart Makmur",4,8,350000,350000,3,"High","In Repair","Automotive Paint (Liter)",0.96],
["Kap Mesin","shattered","minor","Toyota","Creta",2015,0.77,"Replace",1,3,8,14,"SUPP-001","PT. Auto Gemilang Jaya",11,8,500000,500000,6,"Normal","Completed","None",0.0],
["Kaca Depan","crack","critical","Honda","Brio",2015,0.75,"Replace",1,4,5,1,"SUPP-005","Bintang Auto Sentosa",12,6,1200000,1200000,7,"Urgent","Completed","None",0.0],
["Bumper Belakang","broken","critical","Suzuki","XL7",2018,0.7,"Replace",1,15,6,25,"SUPP-002","CV. Sparepart Makmur",12,0,800000,800000,7,"Low","Parts Available","None",0.0],
["Bumper Belakang","broken","moderate","Honda","Civic",2019,0.85,"Replace",1,3,5,22,"SUPP-005","Bintang Auto Sentosa",10,15,800000,800000,7,"High","Quality Check","None",0.0],
["Bumper Depan","dent","severe","Toyota","Innova Zenix",2016,0.78,"Replace",1,7,4,13,"SUPP-003","UD. Motor Sejahtera",5,0,800000,800000,6,"High","Parts Available","None",0.0],
["Bumper Belakang","crack","minor","Daihatsu","Sigra",2016,0.98,"Repaint",1,13,6,23,"SUPP-005","Bintang Auto Sentosa",5,0,350000,350000,4,"High","Completed","Primer (Liter)",1.36],
["Bumper Belakang","broken","moderate","Honda","Civic",2019,0.86,"Replace",1,6,3,7,"SUPP-005","Bintang Auto Sentosa",12,0,800000,800000,5,"Normal","Parts Available","None",0.0],
["Bumper Depan","dent","critical","Honda","CR-V",2016,0.9,"Replace",1,5,6,18,"SUPP-003","UD. Motor Sejahtera",12,8,800000,800000,5,"Normal","Completed","None",0.0],
["Fender Kanan Depan","shattered","moderate","Honda","CR-V",2026,0.74,"Replace",1,13,7,24,"SUPP-005","Bintang Auto Sentosa",5,0,650000,650000,6,"High","Completed","None",0.0],
["Headlamp Kanan","crack","moderate","Mitsubishi","Xpander",2023,0.95,"Repair",1,0,5,5,"SUPP-001","PT. Auto Gemilang Jaya",11,6,450000,450000,3,"High","In Repair","Body Filler (Kg)",0.36],
["Kap Mesin","scratch","critical","Daihatsu","Sigra",2020,0.84,"Replace",1,8,3,2,"SUPP-003","UD. Motor Sejahtera",4,0,500000,500000,7,"Low","Quality Check","None",0.0],
["Bumper Depan","scratch","moderate","Suzuki","Ertiga",2021,0.95,"Repaint",1,3,6,22,"SUPP-005","Bintang Auto Sentosa",14,12,350000,350000,4,"Normal","In Repair","Primer (Liter)",1.06],
["Kaca Depan","broken","severe","Hyundai","Civic",2015,0.87,"Replace",1,1,5,13,"SUPP-004","Distributor Oto Nusantara",13,15,1200000,1200000,7,"Low","In Repair","None",0.0],
["Kaca Depan","crack","minor","Mitsubishi","Pajero Sport",2025,0.84,"Repaint",1,6,6,25,"SUPP-004","Distributor Oto Nusantara",14,12,350000,350000,4,"Normal","Completed","Primer (Liter)",1.21],
["Bumper Depan","shattered","moderate","Suzuki","Ertiga",2023,0.83,"Replace",1,6,8,24,"SUPP-002","CV. Sparepart Makmur",5,19,800000,800000,4,"Urgent","Waiting for Parts","None",0.0],
["Bumper Depan","dent","severe","Toyota","Innova Zenix",2016,0.75,"Replace",1,5,3,24,"SUPP-005","Bintang Auto Sentosa",2,0,800000,800000,6,"Low","In Repair","None",0.0],
["Bumper Belakang","broken","critical","Suzuki","XL7",2018,0.71,"Replace",1,8,3,6,"SUPP-005","Bintang Auto Sentosa",14,0,800000,800000,5,"Low","Quality Check","None",0.0],
["Bumper Belakang","shattered","moderate","Daihatsu","Creta",2026,0.97,"Replace",1,4,2,5,"SUPP-003","UD. Motor Sejahtera",10,0,800000,800000,3,"High","Completed","None",0.0],
["Kaca Depan","shattered","minor","Suzuki","XL7",2025,0.84,"Replace",1,9,5,19,"SUPP-005","Bintang Auto Sentosa",6,0,1200000,1200000,3,"High","In Repair","None",0.0],
["Fender Kanan Depan","dent","critical","Daihatsu","Xenia",2023,0.94,"Replace",1,7,3,17,"SUPP-001","PT. Auto Gemilang Jaya",13,0,650000,650000,7,"Low","Completed","None",0.0],
["Bumper Depan","scratch","moderate","Suzuki","Ertiga",2021,0.82,"Repaint",1,12,2,12,"SUPP-002","CV. Sparepart Makmur",4,0,350000,350000,4,"Normal","Completed","Clear Coat (Liter)",0.83],
["Kaca Depan","scratch","minor","Mitsubishi","Xpander",2024,0.72,"Repaint",1,15,6,25,"SUPP-001","PT. Auto Gemilang Jaya",2,0,350000,350000,4,"Urgent","Completed","Clear Coat (Liter)",0.95],
["Fender Kanan Depan","broken","critical","Daihatsu","Creta",2017,0.88,"Replace",1,7,2,22,"SUPP-003","UD. Motor Sejahtera",7,0,650000,650000,3,"Normal","Completed","None",0.0],
["Fender Kanan Depan","shattered","critical","Suzuki","Ertiga",2018,0.72,"Replace",1,9,2,17,"SUPP-003","UD. Motor Sejahtera",9,0,650000,650000,7,"Normal","Waiting for Parts","None",0.0],
["Bumper Belakang","shattered","moderate","Daihatsu","Creta",2026,0.74,"Replace",1,9,7,7,"SUPP-003","UD. Motor Sejahtera",9,0,800000,800000,3,"Urgent","Parts Available","None",0.0],
["Kaca Depan","broken","severe","Hyundai","Civic",2015,0.86,"Replace",1,0,7,3,"SUPP-002","CV. Sparepart Makmur",11,11,1200000,1200000,6,"High","Parts Available","None",0.0],
["Kaca Depan","shattered","minor","Suzuki","XL7",2025,0.79,"Replace",1,13,7,3,"SUPP-002","CV. Sparepart Makmur",1,0,1200000,1200000,6,"High","Waiting for Parts","None",0.0],
["Fender Kanan Depan","broken","critical","Hyundai","Civic",2022,0.99,"Replace",1,2,2,2,"SUPP-002","CV. Sparepart Makmur",13,13,650000,650000,7,"Low","Parts Available","None",0.0],
["Bumper Depan","scratch","moderate","Suzuki","Ertiga",2021,0.73,"Repaint",1,8,5,13,"SUPP-004","Distributor Oto Nusantara",11,0,350000,350000,3,"Normal","Waiting for Parts","Clear Coat (Liter)",0.82],
["Bumper Belakang","broken","moderate","Honda","Civic",2019,0.92,"Replace",1,0,7,24,"SUPP-005","Bintang Auto Sentosa",2,6,800000,800000,3,"Normal","Completed","None",0.0],
["Kaca Depan","crack","critical","Honda","Brio",2015,0.88,"Replace",1,3,4,22,"SUPP-003","UD. Motor Sejahtera",10,7,1200000,1200000,5,"High","Quality Check","None",0.0],
["Bumper Depan","broken","severe","Toyota","Avanza",2016,0.93,"Replace",1,12,5,22,"SUPP-001","PT. Auto Gemilang Jaya",8,0,800000,800000,4,"Normal","Parts Available","None",0.0],
["Kap Mesin","dent","moderate","Toyota","Creta",2017,0.77,"Replace",1,9,7,5,"SUPP-003","UD. Motor Sejahtera",11,0,500000,500000,5,"Urgent","Waiting for Parts","None",0.0],
["Bumper Belakang","broken","moderate","Honda","Civic",2019,0.85,"Replace",1,4,2,2,"SUPP-001","PT. Auto Gemilang Jaya",10,0,800000,800000,7,"Normal","Completed","None",0.0],
["Kaca Depan","scratch","critical","Honda","Brio",2018,0.83,"Replace",1,2,4,7,"SUPP-003","UD. Motor Sejahtera",4,18,1200000,1200000,7,"Low","Parts Available","None",0.0],
["Kap Mesin","crack","minor","Hyundai","Civic",2019,0.83,"Repaint",1,7,6,9,"SUPP-002","CV. Sparepart Makmur",2,0,350000,350000,2,"High","Completed","Primer (Liter)",1.3],
["Headlamp Kanan","crack","critical","Hyundai","Creta",2025,0.95,"Replace",1,14,7,18,"SUPP-001","PT. Auto Gemilang Jaya",5,0,1500000,1500000,3,"Normal","Parts Available","None",0.0],
["Fender Kanan Depan","scratch","severe","Hyundai","Civic",2018,0.99,"Replace",1,15,4,12,"SUPP-002","CV. Sparepart Makmur",11,0,650000,650000,4,"Low","Completed","None",0.0],
["Fender Kanan Depan","broken","critical","Hyundai","Civic",2022,0.79,"Replace",1,2,3,11,"SUPP-004","Distributor Oto Nusantara",8,15,650000,650000,7,"Normal","Completed","None",0.0],
["Kaca Depan","scratch","critical","Honda","Brio",2018,0.88,"Replace",1,4,6,19,"SUPP-003","UD. Motor Sejahtera",13,15,1200000,1200000,6,"Low","In Repair","None",0.0],
["Bumper Depan","shattered","minor","Toyota","Innova Zenix",2025,0.88,"Replace",1,7,8,8,"SUPP-004","Distributor Oto Nusantara",5,16,800000,800000,4,"Normal","In Repair","None",0.0],
["Kaca Depan","shattered","minor","Suzuki","XL7",2025,0.91,"Replace",1,15,5,15,"SUPP-003","UD. Motor Sejahtera",13,0,1200000,1200000,5,"Normal","Waiting for Parts","None",0.0],
["Fender Kanan Depan","shattered","critical","Suzuki","Ertiga",2018,0.97,"Replace",1,5,7,20,"SUPP-001","PT. Auto Gemilang Jaya",14,13,650000,650000,4,"High","Parts Available","None",0.0],
["Bumper Depan","dent","severe","Mitsubishi","Pajero Sport",2017,0.76,"Replace",1,8,7,21,"SUPP-001","PT. Auto Gemilang Jaya",12,0,800000,800000,3,"High","Completed","None",0.0],
["Bumper Depan","broken","severe","Toyota","Avanza",2016,0.76,"Replace",1,0,8,19,"SUPP-005","Bintang Auto Sentosa",7,11,800000,800000,3,"Normal","Completed","None",0.0],
["Bumper Belakang","crack","minor","Daihatsu","Sigra",2016,0.89,"Repaint",1,15,7,25,"SUPP-002","CV. Sparepart Makmur",6,0,350000,350000,3,"Normal","In Repair","Automotive Paint (Liter)",1.39],
["Bumper Belakang","dent","moderate","Daihatsu","Ayla",2024,0.75,"Repair",1,14,6,17,"SUPP-001","PT. Auto Gemilang Jaya",7,0,450000,450000,4,"Normal","Completed","Body Filler (Kg)",0.5],
["Kap Mesin","dent","moderate","Toyota","Creta",2017,0.75,"Repair",1,4,5,6,"SUPP-002","CV. Sparepart Makmur",10,9,450000,450000,5,"Low","Quality Check","Body Filler (Kg)",0.76],
["Kaca Depan","broken","minor","Toyota","Avanza",2015,0.72,"Replace",1,7,2,9,"SUPP-003","UD. Motor Sejahtera",4,0,1200000,1200000,3,"Normal","Completed","None",0.0],
["Kaca Depan","scratch","minor","Suzuki","Ertiga",2016,0.7,"Repaint",1,11,5,16,"SUPP-004","Distributor Oto Nusantara",1,0,350000,350000,2,"High","Completed","Primer (Liter)",0.82],
["Fender Kanan Depan","scratch","severe","Hyundai","Civic",2018,0.83,"Replace",1,8,8,24,"SUPP-003","UD. Motor Sejahtera",10,10,650000,650000,6,"Normal","In Repair","None",0.0],
["Kaca Depan","broken","minor","Toyota","Avanza",2015,0.87,"Replace",1,2,6,9,"SUPP-004","Distributor Oto Nusantara",4,17,1200000,1200000,5,"High","In Repair","None",0.0],
["Bumper Depan","scratch","moderate","Mitsubishi","Pajero Sport",2016,0.78,"Repaint",1,15,8,16,"SUPP-005","Bintang Auto Sentosa",1,0,350000,350000,4,"Normal","Completed","Automotive Paint (Liter)",0.94],
["Kaca Depan","crack","minor","Mitsubishi","Pajero Sport",2025,0.77,"Repaint",1,8,3,5,"SUPP-002","CV. Sparepart Makmur",3,0,350000,350000,3,"Low","Parts Available","Primer (Liter)",1.22],
["Bumper Depan","shattered","minor","Toyota","Innova Zenix",2025,0.91,"Replace",1,13,8,11,"SUPP-001","PT. Auto Gemilang Jaya",8,0,800000,800000,6,"Normal","Completed","None",0.0],
["Bumper Belakang","broken","moderate","Honda","Civic",2019,0.9,"Replace",1,5,7,14,"SUPP-001","PT. Auto Gemilang Jaya",4,6,800000,800000,4,"Normal","Parts Available","None",0.0],
["Fender Kanan Depan","broken","severe","Toyota","Creta",2017,0.83,"Replace",1,4,7,17,"SUPP-001","PT. Auto Gemilang Jaya",10,9,650000,650000,3,"Low","Parts Available","None",0.0],
["Pintu Depan Kanan","crack","minor","Honda","CR-V",2015,0.9,"Repaint",1,12,6,19,"SUPP-001","PT. Auto Gemilang Jaya",12,0,350000,350000,4,"Urgent","Parts Available","Primer (Liter)",1.32],
["Fender Kanan Depan","shattered","moderate","Honda","CR-V",2026,0.97,"Replace",1,14,6,16,"SUPP-004","Distributor Oto Nusantara",3,0,650000,650000,4,"High","Completed","None",0.0],
["Kaca Depan","shattered","moderate","Toyota","Creta",2015,0.93,"Replace",1,4,8,19,"SUPP-002","CV. Sparepart Makmur",10,13,1200000,1200000,4,"High","In Repair","None",0.0],
["Bumper Belakang","shattered","moderate","Daihatsu","Creta",2026,0.88,"Replace",1,14,6,19,"SUPP-001","PT. Auto Gemilang Jaya",4,0,800000,800000,6,"Normal","Waiting for Parts","None",0.0],
["Fender Kanan Depan","scratch","severe","Hyundai","Civic",2018,0.89,"Replace",1,0,3,17,"SUPP-005","Bintang Auto Sentosa",11,18,650000,650000,4,"Normal","Parts Available","None",0.0],
["Bumper Depan","scratch","moderate","Mitsubishi","Pajero Sport",2016,0.97,"Repaint",1,15,6,20,"SUPP-001","PT. Auto Gemilang Jaya",13,0,350000,350000,4,"Low","Parts Available","Primer (Liter)",1.25],
["Bumper Depan","scratch","moderate","Suzuki","Ertiga",2021,0.82,"Repaint",1,0,8,22,"SUPP-004","Distributor Oto Nusantara",9,18,350000,350000,3,"Normal","Quality Check","Automotive Paint (Liter)",1.2],
["Bumper Depan","dent","severe","Mitsubishi","Pajero Sport",2017,0.86,"Replace",1,12,4,19,"SUPP-005","Bintang Auto Sentosa",2,0,800000,800000,6,"Low","Quality Check","None",0.0],
["Headlamp Kanan","crack","critical","Hyundai","Creta",2025,0.89,"Replace",1,7,8,3,"SUPP-003","UD. Motor Sejahtera",10,18,1500000,1500000,5,"Low","Waiting for Parts","None",0.0],
["Fender Kanan Depan","shattered","critical","Suzuki","Ertiga",2018,0.96,"Replace",1,3,6,1,"SUPP-004","Distributor Oto Nusantara",11,11,650000,650000,5,"Normal","Waiting for Parts","None",0.0],
["Bumper Belakang","broken","critical","Honda","CR-V",2025,0.94,"Replace",1,4,5,21,"SUPP-005","Bintang Auto Sentosa",5,13,800000,800000,7,"Normal","In Repair","None",0.0],
["Kaca Depan","crack","severe","Mitsubishi","Xpander",2024,0.72,"Replace",1,8,7,13,"SUPP-002","CV. Sparepart Makmur",7,0,1200000,1200000,7,"High","Quality Check","None",0.0],
["Bumper Depan","scratch","critical","Honda","Civic",2015,0.75,"Replace",1,5,4,18,"SUPP-005","Bintang Auto Sentosa",8,0,800000,800000,5,"Urgent","Completed","None",0.0],
["Bumper Belakang","crack","severe","Daihatsu","Sigra",2017,0.79,"Replace",1,11,8,23,"SUPP-004","Distributor Oto Nusantara",12,0,800000,800000,4,"High","Waiting for Parts","None",0.0],
["Kap Mesin","shattered","moderate","Hyundai","Civic",2017,0.92,"Replace",1,7,5,23,"SUPP-002","CV. Sparepart Makmur",2,0,500000,500000,4,"Normal","In Repair","None",0.0],
["Bumper Depan","crack","moderate","Hyundai","Creta",2018,0.87,"Repair",1,5,5,21,"SUPP-001","PT. Auto Gemilang Jaya",13,7,450000,450000,3,"Normal","Waiting for Parts","Body Filler (Kg)",0.48],
["Headlamp Kanan","scratch","severe","Toyota","Avanza",2016,0.78,"Replace",1,2,4,8,"SUPP-003","UD. Motor Sejahtera",2,6,1500000,1500000,6,"Urgent","Quality Check","None",0.0],
["Kaca Depan","shattered","minor","Suzuki","XL7",2025,0.74,"Replace",1,9,7,20,"SUPP-001","PT. Auto Gemilang Jaya",13,0,1200000,1200000,4,"Normal","Quality Check","None",0.0],
["Bumper Belakang","scratch","critical","Toyota","Avanza",2024,0.9,"Replace",1,0,3,22,"SUPP-005","Bintang Auto Sentosa",5,11,800000,800000,3,"High","Completed","None",0.0],
["Bumper Belakang","shattered","severe","Daihatsu","Terios",2026,0.9,"Replace",1,7,6,6,"SUPP-001","PT. Auto Gemilang Jaya",6,0,800000,800000,4,"Normal","Parts Available","None",0.0],
["Kap Mesin","dent","severe","Toyota","Innova Zenix",2021,0.97,"Replace",1,2,4,25,"SUPP-004","Distributor Oto Nusantara",6,17,500000,500000,6,"Normal","Completed","None",0.0],
["Kap Mesin","dent","moderate","Toyota","Creta",2017,0.85,"Repair",1,2,2,18,"SUPP-003","UD. Motor Sejahtera",12,16,450000,450000,4,"Normal","Completed","Body Filler (Kg)",0.78],
["Fender Kanan Depan","scratch","moderate","Suzuki","XL7",2023,0.84,"Repaint",1,6,5,13,"SUPP-005","Bintang Auto Sentosa",1,0,350000,350000,3,"Low","Waiting for Parts","Automotive Paint (Liter)",0.91],
["Bumper Depan","dent","severe","Toyota","Innova Zenix",2016,0.72,"Replace",1,9,4,4,"SUPP-005","Bintang Auto Sentosa",5,0,800000,800000,7,"High","Completed","None",0.0],
["Kap Mesin","shattered","minor","Toyota","Creta",2015,0.71,"Replace",1,8,7,15,"SUPP-004","Distributor Oto Nusantara",10,0,500000,500000,6,"High","In Repair","None",0.0],
["Kaca Depan","broken","minor","Toyota","Avanza",2015,0.83,"Replace",1,14,7,15,"SUPP-005","Bintang Auto Sentosa",14,0,1200000,1200000,3,"Normal","In Repair","None",0.0],
["Bumper Depan","broken","severe","Toyota","Avanza",2016,0.79,"Replace",1,2,5,21,"SUPP-002","CV. Sparepart Makmur",11,12,800000,800000,5,"Normal","In Repair","None",0.0],
["Kap Mesin","dent","moderate","Toyota","Creta",2017,0.77,"Repair",1,8,3,10,"SUPP-001","PT. Auto Gemilang Jaya",7,0,450000,450000,4,"Urgent","Quality Check","Body Filler (Kg)",0.25],
["Bumper Belakang","dent","moderate","Daihatsu","Ayla",2024,0.73,"Replace",1,11,3,19,"SUPP-003","UD. Motor Sejahtera",3,0,800000,800000,4,"Normal","Parts Available","None",0.0],
["Headlamp Kanan","crack","critical","Hyundai","Creta",2025,0.98,"Replace",1,7,7,8,"SUPP-003","UD. Motor Sejahtera",4,12,1500000,1500000,4,"High","Completed","None",0.0],
["Bumper Belakang","dent","moderate","Daihatsu","Ayla",2024,0.94,"Replace",1,4,8,4,"SUPP-001","PT. Auto Gemilang Jaya",2,20,800000,800000,7,"Low","Completed","None",0.0],
["Bumper Belakang","dent","moderate","Daihatsu","Ayla",2024,0.87,"Repair",1,15,4,20,"SUPP-003","UD. Motor Sejahtera",8,0,450000,450000,4,"Urgent","Completed","Body Filler (Kg)",0.49],
["Kaca Depan","broken","severe","Hyundai","Civic",2015,0.98,"Replace",1,8,5,8,"SUPP-005","Bintang Auto Sentosa",3,0,1200000,1200000,3,"Normal","Quality Check","None",0.0],
["Fender Kanan Depan","scratch","severe","Hyundai","Civic",2018,0.99,"Replace",1,15,6,2,"SUPP-005","Bintang Auto Sentosa",6,0,650000,650000,6,"High","Parts Available","None",0.0],
["Fender Kanan Depan","dent","critical","Daihatsu","Xenia",2023,0.89,"Replace",1,14,2,23,"SUPP-005","Bintang Auto Sentosa",8,0,650000,650000,5,"Normal","Waiting for Parts","None",0.0],
["Fender Kanan Depan","scratch","moderate","Suzuki","XL7",2023,0.78,"Repaint",1,6,5,19,"SUPP-001","PT. Auto Gemilang Jaya",6,0,350000,350000,3,"Low","In Repair","Primer (Liter)",1.36],
["Pintu Depan Kanan","crack","minor","Honda","CR-V",2015,0.71,"Repaint",1,7,4,16,"SUPP-005","Bintang Auto Sentosa",6,0,350000,350000,3,"Normal","In Repair","Automotive Paint (Liter)",1.0],
["Fender Kanan Depan","broken","critical","Daihatsu","Creta",2017,0.92,"Replace",1,11,8,13,"SUPP-003","UD. Motor Sejahtera",8,0,650000,650000,4,"Normal","Completed","None",0.0],
["Bumper Belakang","broken","moderate","Honda","Civic",2019,0.84,"Replace",1,7,8,4,"SUPP-003","UD. Motor Sejahtera",13,12,800000,800000,7,"Normal","Quality Check","None",0.0],
["Headlamp Kanan","scratch","severe","Toyota","Avanza",2016,0.89,"Replace",1,6,3,24,"SUPP-002","CV. Sparepart Makmur",8,0,1500000,1500000,3,"Low","Quality Check","None",0.0],
["Bumper Depan","shattered","moderate","Suzuki","Ertiga",2023,0.97,"Replace",1,4,8,21,"SUPP-005","Bintang Auto Sentosa",9,15,800000,800000,6,"Normal","Completed","None",0.0],
["Bumper Depan","shattered","moderate","Suzuki","Ertiga",2023,0.75,"Replace",1,1,5,4,"SUPP-002","CV. Sparepart Makmur",1,11,800000,800000,5,"Normal","Waiting for Parts","None",0.0],
["Bumper Depan","dent","critical","Honda","CR-V",2016,0.87,"Replace",1,14,7,11,"SUPP-003","UD. Motor Sejahtera",6,0,800000,800000,5,"Normal","In Repair","None",0.0],
["Kaca Depan","shattered","moderate","Toyota","Creta",2015,0.88,"Replace",1,11,2,14,"SUPP-001","PT. Auto Gemilang Jaya",6,0,1200000,1200000,7,"Low","Completed","None",0.0],
["Kap Mesin","scratch","critical","Daihatsu","Sigra",2020,0.84,"Replace",1,5,8,10,"SUPP-003","UD. Motor Sejahtera",6,20,500000,500000,6,"High","Quality Check","None",0.0],
["Fender Kanan Depan","dent","critical","Daihatsu","Xenia",2023,0.73,"Replace",1,9,5,21,"SUPP-002","CV. Sparepart Makmur",14,0,650000,650000,4,"Normal","In Repair","None",0.0],
["Bumper Belakang","crack","severe","Daihatsu","Sigra",2017,0.8,"Replace",1,13,7,20,"SUPP-005","Bintang Auto Sentosa",7,0,800000,800000,3,"Low","In Repair","None",0.0],
["Bumper Depan","broken","severe","Toyota","Avanza",2016,0.8,"Replace",1,7,4,11,"SUPP-003","UD. Motor Sejahtera",12,0,800000,800000,5,"Normal","Quality Check","None",0.0],
["Bumper Belakang","broken","critical","Suzuki","XL7",2018,0.89,"Replace",1,8,5,25,"SUPP-003","UD. Motor Sejahtera",12,0,800000,800000,7,"Normal","Quality Check","None",0.0],
["Bumper Belakang","crack","minor","Daihatsu","Sigra",2016,0.95,"Repaint",1,13,3,6,"SUPP-001","PT. Auto Gemilang Jaya",3,0,350000,350000,4,"Urgent","Waiting for Parts","Automotive Paint (Liter)",1.16],
["Bumper Depan","scratch","moderate","Suzuki","Ertiga",2021,0.8,"Repaint",1,6,3,13,"SUPP-001","PT. Auto Gemilang Jaya",2,0,350000,350000,2,"Low","Quality Check","Clear Coat (Liter)",1.05],
["Bumper Depan","shattered","minor","Toyota","Innova Zenix",2025,0.9,"Replace",1,2,2,9,"SUPP-005","Bintang Auto Sentosa",3,7,800000,800000,6,"Normal","Parts Available","None",0.0],
["Bumper Belakang","scratch","critical","Toyota","Avanza",2024,0.78,"Replace",1,9,5,21,"SUPP-002","CV. Sparepart Makmur",3,0,800000,800000,7,"High","Waiting for Parts","None",0.0],
["Bumper Belakang","broken","critical","Honda","CR-V",2025,0.97,"Replace",1,1,7,12,"SUPP-003","UD. Motor Sejahtera",14,20,800000,800000,6,"Urgent","Completed","None",0.0],
["Bumper Depan","dent","severe","Mitsubishi","Pajero Sport",2017,0.94,"Replace",1,8,6,15,"SUPP-002","CV. Sparepart Makmur",12,0,800000,800000,7,"Low","Completed","None",0.0],
["Fender Kanan Depan","scratch","severe","Hyundai","Civic",2018,0.86,"Replace",1,14,7,24,"SUPP-005","Bintang Auto Sentosa",7,0,650000,650000,7,"Normal","Completed","None",0.0],
["Bumper Belakang","broken","critical","Suzuki","XL7",2018,0.83,"Replace",1,9,4,16,"SUPP-005","Bintang Auto Sentosa",4,0,800000,800000,3,"Normal","In Repair","None",0.0],
["Headlamp Kanan","crack","moderate","Mitsubishi","Xpander",2023,0.79,"Replace",1,8,3,10,"SUPP-001","PT. Auto Gemilang Jaya",1,0,1500000,1500000,7,"High","Parts Available","None",0.0],
["Kaca Depan","crack","minor","Mitsubishi","Pajero Sport",2025,0.79,"Repaint",1,11,4,16,"SUPP-005","Bintang Auto Sentosa",1,0,350000,350000,4,"Normal","Waiting for Parts","Clear Coat (Liter)",1.45],
["Headlamp Kanan","crack","moderate","Mitsubishi","Xpander",2023,0.98,"Replace",1,9,6,8,"SUPP-001","PT. Auto Gemilang Jaya",9,0,1500000,1500000,5,"Low","Completed","None",0.0],
["Bumper Depan","dent","severe","Toyota","Innova Zenix",2016,0.82,"Replace",1,13,5,8,"SUPP-002","CV. Sparepart Makmur",12,0,800000,800000,6,"High","Parts Available","None",0.0],
["Bumper Depan","scratch","moderate","Mitsubishi","Pajero Sport",2016,0.85,"Repaint",1,8,2,14,"SUPP-002","CV. Sparepart Makmur",9,0,350000,350000,4,"Normal","Completed","Primer (Liter)",1.18],
["Fender Kanan Depan","broken","critical","Daihatsu","Creta",2017,0.99,"Replace",1,8,5,7,"SUPP-001","PT. Auto Gemilang Jaya",3,0,650000,650000,4,"Normal","Quality Check","None",0.0],
["Bumper Depan","scratch","moderate","Mitsubishi","Pajero Sport",2016,0.89,"Repaint",1,14,4,23,"SUPP-005","Bintang Auto Sentosa",8,0,350000,350000,2,"Low","Completed","Clear Coat (Liter)",0.52],
["Kap Mesin","dent","moderate","Toyota","Creta",2017,0.86,"Repair",1,5,2,10,"SUPP-003","UD. Motor Sejahtera",3,0,450000,450000,5,"Normal","Parts Available","Body Filler (Kg)",0.64],
["Fender Kanan Depan","broken","severe","Toyota","Creta",2017,0.82,"Replace",1,0,5,7,"SUPP-003","UD. Motor Sejahtera",7,14,650000,650000,6,"Urgent","Quality Check","None",0.0],
["Kap Mesin","dent","severe","Toyota","Innova Zenix",2021,0.75,"Replace",1,1,4,3,"SUPP-002","CV. Sparepart Makmur",1,13,500000,500000,6,"Low","Quality Check","None",0.0],
["Bumper Depan","crack","moderate","Hyundai","Creta",2018,0.8,"Repair",1,6,8,9,"SUPP-004","Distributor Oto Nusantara",14,5,450000,450000,2,"High","Quality Check","Body Filler (Kg)",0.78],
["Bumper Depan","crack","moderate","Hyundai","Creta",2018,0.92,"Replace",1,7,7,2,"SUPP-002","CV. Sparepart Makmur",8,8,800000,800000,7,"Normal","Parts Available","None",0.0],
["Bumper Belakang","crack","minor","Daihatsu","Sigra",2016,0.88,"Repaint",1,15,5,22,"SUPP-003","UD. Motor Sejahtera",6,0,350000,350000,2,"High","Completed","Primer (Liter)",1.23],
["Kap Mesin","shattered","minor","Toyota","Creta",2015,0.92,"Replace",1,3,4,16,"SUPP-003","UD. Motor Sejahtera",4,16,500000,500000,3,"High","Parts Available","None",0.0],
["Bumper Depan","broken","severe","Toyota","Avanza",2016,0.76,"Replace",1,3,3,21,"SUPP-004","Distributor Oto Nusantara",6,5,800000,800000,4,"High","Completed","None",0.0],
["Fender Kanan Depan","shattered","moderate","Honda","CR-V",2026,0.86,"Replace",1,3,5,8,"SUPP-001","PT. Auto Gemilang Jaya",1,20,650000,650000,7,"Low","Waiting for Parts","None",0.0],
["Headlamp Kanan","crack","critical","Hyundai","Creta",2025,0.97,"Replace",1,7,3,16,"SUPP-001","PT. Auto Gemilang Jaya",11,0,1500000,1500000,7,"Normal","Waiting for Parts","None",0.0],
["Bumper Depan","shattered","minor","Toyota","Innova Zenix",2025,0.83,"Replace",1,1,4,21,"SUPP-002","CV. Sparepart Makmur",12,8,800000,800000,4,"Normal","In Repair","None",0.0],
["Bumper Belakang","crack","severe","Daihatsu","Sigra",2017,0.9,"Replace",1,11,8,15,"SUPP-002","CV. Sparepart Makmur",1,0,800000,800000,6,"Normal","Parts Available","None",0.0],
["Bumper Depan","crack","moderate","Hyundai","Creta",2018,0.74,"Replace",1,1,5,23,"SUPP-004","Distributor Oto Nusantara",9,14,800000,800000,7,"Normal","Parts Available","None",0.0],
["Bumper Belakang","scratch","critical","Toyota","Avanza",2024,0.98,"Replace",1,5,6,12,"SUPP-003","UD. Motor Sejahtera",12,19,800000,800000,5,"High","Completed","None",0.0],
["Kaca Depan","shattered","moderate","Toyota","Creta",2015,0.88,"Replace",1,5,2,17,"SUPP-002","CV. Sparepart Makmur",8,0,1200000,1200000,5,"High","Completed","None",0.0],
["Bumper Depan","dent","critical","Honda","CR-V",2016,0.77,"Replace",1,11,5,1,"SUPP-005","Bintang Auto Sentosa",7,0,800000,800000,4,"High","Completed","None",0.0],
["Bumper Belakang","dent","moderate","Daihatsu","Ayla",2024,0.75,"Replace",1,7,4,24,"SUPP-001","PT. Auto Gemilang Jaya",11,0,800000,800000,7,"High","Parts Available","None",0.0],
["Bumper Belakang","shattered","moderate","Daihatsu","Creta",2026,0.86,"Replace",1,15,8,18,"SUPP-002","CV. Sparepart Makmur",10,0,800000,800000,5,"Normal","In Repair","None",0.0],
["Kaca Depan","scratch","critical","Honda","Brio",2018,0.86,"Replace",1,3,2,17,"SUPP-001","PT. Auto Gemilang Jaya",1,0,1200000,1200000,4,"Low","Waiting for Parts","None",0.0],
["Kap Mesin","dent","severe","Toyota","Innova Zenix",2021,0.73,"Replace",1,6,2,16,"SUPP-002","CV. Sparepart Makmur",2,0,500000,500000,3,"Normal","Quality Check","None",0.0],
["Bumper Depan","scratch","moderate","Mitsubishi","Pajero Sport",2016,0.99,"Repaint",1,15,6,20,"SUPP-005","Bintang Auto Sentosa",5,0,350000,350000,2,"High","Waiting for Parts","Clear Coat (Liter)",0.72],
["Bumper Belakang","scratch","critical","Toyota","Avanza",2024,0.96,"Replace",1,6,7,16,"SUPP-001","PT. Auto Gemilang Jaya",8,6,800000,800000,5,"Normal","Quality Check","None",0.0],
["Fender Kanan Depan","broken","critical","Daihatsu","Creta",2017,0.83,"Replace",1,11,8,23,"SUPP-001","PT. Auto Gemilang Jaya",14,0,650000,650000,7,"Normal","Waiting for Parts","None",0.0],
["Bumper Belakang","dent","moderate","Daihatsu","Ayla",2024,0.73,"Repair",1,9,2,7,"SUPP-005","Bintang Auto Sentosa",2,0,450000,450000,2,"Normal","Parts Available","Body Filler (Kg)",0.64],
["Bumper Belakang","shattered","moderate","Daihatsu","Creta",2026,0.94,"Replace",1,6,6,22,"SUPP-002","CV. Sparepart Makmur",10,10,800000,800000,7,"High","Quality Check","None",0.0],
["Bumper Belakang","shattered","severe","Daihatsu","Terios",2026,0.84,"Replace",1,3,8,21,"SUPP-005","Bintang Auto Sentosa",6,19,800000,800000,6,"High","Parts Available","None",0.0],
["Bumper Depan","dent","severe","Toyota","Innova Zenix",2016,0.91,"Replace",1,5,6,13,"SUPP-005","Bintang Auto Sentosa",6,10,800000,800000,7,"Urgent","Quality Check","None",0.0],
["Bumper Depan","dent","critical","Honda","CR-V",2016,0.85,"Replace",1,11,4,18,"SUPP-003","UD. Motor Sejahtera",14,0,800000,800000,5,"Normal","Quality Check","None",0.0],
["Bumper Belakang","crack","minor","Daihatsu","Sigra",2016,0.78,"Repaint",1,10,6,8,"SUPP-005","Bintang Auto Sentosa",9,0,350000,350000,2,"Urgent","In Repair","Clear Coat (Liter)",1.27],
["Kaca Depan","broken","severe","Hyundai","Civic",2015,0.94,"Replace",1,11,5,15,"SUPP-004","Distributor Oto Nusantara",1,0,1200000,1200000,3,"Urgent","Completed","None",0.0],
["Bumper Belakang","broken","critical","Suzuki","XL7",2018,0.98,"Replace",1,0,6,5,"SUPP-003","UD. Motor Sejahtera",1,14,800000,800000,4,"Normal","In Repair","None",0.0],
["Kaca Depan","shattered","minor","Suzuki","XL7",2025,0.77,"Replace",1,0,8,23,"SUPP-003","UD. Motor Sejahtera",9,9,1200000,1200000,3,"Low","In Repair","None",0.0],
["Bumper Depan","dent","critical","Honda","CR-V",2016,0.86,"Replace",1,4,3,9,"SUPP-003","UD. Motor Sejahtera",10,0,800000,800000,4,"Normal","In Repair","None",0.0],
["Kap Mesin","dent","severe","Toyota","Innova Zenix",2021,0.81,"Replace",1,2,6,13,"SUPP-005","Bintang Auto Sentosa",4,7,500000,500000,5,"High","Parts Available","None",0.0],
["Bumper Belakang","scratch","critical","Toyota","Avanza",2024,0.97,"Replace",1,15,8,23,"SUPP-005","Bintang Auto Sentosa",14,0,800000,800000,3,"Normal","In Repair","None",0.0],
["Bumper Depan","scratch","moderate","Mitsubishi","Pajero Sport",2016,0.85,"Repaint",1,1,7,19,"SUPP-004","Distributor Oto Nusantara",2,6,350000,350000,3,"Normal","Waiting for Parts","Clear Coat (Liter)",1.38],
["Bumper Depan","scratch","moderate","Mitsubishi","Pajero Sport",2016,0.96,"Repaint",1,7,7,21,"SUPP-005","Bintang Auto Sentosa",1,17,350000,350000,2,"Normal","Completed","Clear Coat (Liter)",1.02]
];
const PPIC_DATA = PPIC_RAW.map((row,i)=>{
  const o = { id:i+1 };
  PPIC_COLS.forEach((c,idx)=>o[c]=row[idx]);
  return o;
});

const PPIC_PARTS = [...new Set(PPIC_DATA.map(d=>d.part))];
const PPIC_DAMAGE_TYPES = [...new Set(PPIC_DATA.map(d=>d.damageType))];
const PPIC_SEVERITIES = ["minor","moderate","severe","critical"];
const PPIC_BRANDS = [...new Set(PPIC_DATA.map(d=>d.brand))];
const REPAIR_ACTIONS = [...new Set(PPIC_DATA.map(d=>d.repairAction))];
const PRIORITIES = ["Urgent","High","Normal","Low"];
const REPAIR_STATUSES = [...new Set(PPIC_DATA.map(d=>d.repairStatus))];
const MATERIAL_TYPES = [...new Set(PPIC_DATA.map(d=>d.materialType))].filter(m=>m!=="None");
const SUPPLIERS = [...new Map(PPIC_DATA.map(d=>[d.supplierId,{id:d.supplierId,name:d.supplierName}])).values()];

/* =====================================================================
   SAVERA_DEMO_DATA.json — embedded verbatim (not fetched, so the
   prototype keeps working from a plain file:// index.html) as the
   primary data source for Inventory, Transaction History, Repair
   Planning and Procurement: parts, inventory_transactions,
   repair_orders, purchase_orders, suppliers, paint_materials,
   material_usage and vehicle_demand_history all come from here.
===================================================================== */
const SAVERA_DB = {"data_type":"DEMO / SYNTHETIC DATA","assessment":[{"image_path":"/content/dataset_damage/image/synthetic_0000.jpeg","part":"Bumper Depan","damage_type":"crack","severity":"moderate","brand":"Hyundai","model":"Creta","year":2018,"confidence":0.74,"data_source":"DEMO/SYNTHETIC DATA","repair_action":"Repair","quantity_required":1,"current_stock":8,"reorder_point":8,"demand_quantity":14,"supplier_id":"SUPP-003","supplier_name":"UD. Motor Sejahtera","lead_time_days":13,"purchase_quantity":13,"unit_cost":450000,"total_cost":450000,"repair_days":2,"priority":"Normal","repair_status":"Completed","material_type":"Body Filler (Kg)","material_quantity":0.37,"dataset_note":"DEMO/SYNTHETIC DATA"},{"image_path":"/content/dataset_damage/image/synthetic_0001.jpeg","part":"Kaca Depan","damage_type":"broken","severity":"minor","brand":"Toyota","model":"Avanza","year":2015,"confidence":0.73,"data_source":"DEMO/SYNTHETIC DATA","repair_action":"Replace","quantity_required":1,"current_stock":15,"reorder_point":8,"demand_quantity":5,"supplier_id":"SUPP-004","supplier_name":"Distributor Oto Nusantara","lead_time_days":9,"purchase_quantity":0,"unit_cost":1200000,"total_cost":1200000,"repair_days":6,"priority":"Normal","repair_status":"Completed","material_type":null,"material_quantity":0.0,"dataset_note":"DEMO/SYNTHETIC DATA"},{"image_path":"/content/dataset_damage/image/synthetic_0002.jpeg","part":"Kaca Depan","damage_type":"scratch","severity":"critical","brand":"Honda","model":"Brio","year":2018,"confidence":0.83,"data_source":"DEMO/SYNTHETIC DATA","repair_action":"Replace","quantity_required":1,"current_stock":12,"reorder_point":5,"demand_quantity":11,"supplier_id":"SUPP-002","supplier_name":"CV. Sparepart Makmur","lead_time_days":12,"purchase_quantity":0,"unit_cost":1200000,"total_cost":1200000,"repair_days":4,"priority":"Normal","repair_status":"Parts Available","material_type":null,"material_quantity":0.0,"dataset_note":"DEMO/SYNTHETIC DATA"},{"image_path":"/content/dataset_damage/image/synthetic_0003.jpeg","part":"Kap Mesin","damage_type":"scratch","severity":"critical","brand":"Daihatsu","model":"Sigra","year":2020,"confidence":0.78,"data_source":"DEMO/SYNTHETIC DATA","repair_action":"Replace","quantity_required":1,"current_stock":13,"reorder_point":2,"demand_quantity":11,"supplier_id":"SUPP-004","supplier_name":"Distributor Oto Nusantara","lead_time_days":12,"purchase_quantity":0,"unit_cost":500000,"total_cost":500000,"repair_days":6,"priority":"Normal","repair_status":"Parts Available","material_type":null,"material_quantity":0.0,"dataset_note":"DEMO/SYNTHETIC DATA"},{"image_path":"/content/dataset_damage/image/synthetic_0004.jpeg","part":"Bumper Depan","damage_type":"dent","severity":"critical","brand":"Honda","model":"CR-V","year":2016,"confidence":0.8,"data_source":"DEMO/SYNTHETIC DATA","repair_action":"Replace","quantity_required":1,"current_stock":15,"reorder_point":2,"demand_quantity":5,"supplier_id":"SUPP-005","supplier_name":"Bintang Auto Sentosa","lead_time_days":10,"purchase_quantity":0,"unit_cost":800000,"total_cost":800000,"repair_days":5,"priority":"High","repair_status":"Quality Check","material_type":null,"material_quantity":0.0,"dataset_note":"DEMO/SYNTHETIC DATA"},{"image_path":"/content/dataset_damage/image/synthetic_0005.jpeg","part":"Fender Kanan Depan","damage_type":"dent","severity":"critical","brand":"Daihatsu","model":"Xenia","year":2023,"confidence":0.74,"data_source":"DEMO/SYNTHETIC DATA","repair_action":"Replace","quantity_required":1,"current_stock":3,"reorder_point":6,"demand_quantity":15,"supplier_id":"SUPP-001","supplier_name":"PT. Auto Gemilang Jaya","lead_time_days":12,"purchase_quantity":9,"unit_cost":650000,"total_cost":650000,"repair_days":6,"priority":"High","repair_status":"Parts Available","material_type":null,"material_quantity":0.0,"dataset_note":"DEMO/SYNTHETIC DATA"},{"image_path":"/content/dataset_damage/image/synthetic_0006.jpeg","part":"Kaca Depan","damage_type":"crack","severity":"severe","brand":"Mitsubishi","model":"Xpander","year":2024,"confidence":0.76,"data_source":"DEMO/SYNTHETIC DATA","repair_action":"Replace","quantity_required":1,"current_stock":2,"reorder_point":5,"demand_quantity":9,"supplier_id":"SUPP-003","supplier_name":"UD. Motor Sejahtera","lead_time_days":10,"purchase_quantity":17,"unit_cost":1200000,"total_cost":1200000,"repair_days":3,"priority":"High","repair_status":"Completed","material_type":null,"material_quantity":0.0,"dataset_note":"DEMO/SYNTHETIC DATA"},{"image_path":"/content/dataset_damage/image/synthetic_0007.jpeg","part":"Headlamp Kanan","damage_type":"scratch","severity":"severe","brand":"Toyota","model":"Avanza","year":2016,"confidence":0.95,"data_source":"DEMO/SYNTHETIC DATA","repair_action":"Replace","quantity_required":1,"current_stock":12,"reorder_point":4,"demand_quantity":21,"supplier_id":"SUPP-004","supplier_name":"Distributor Oto Nusantara","lead_time_days":14,"purchase_quantity":0,"unit_cost":1500000,"total_cost":1500000,"repair_days":7,"priority":"Low","repair_status":"Waiting for Parts","material_type":null,"material_quantity":0.0,"dataset_note":"DEMO/SYNTHETIC DATA"},{"image_path":"/content/dataset_damage/image/synthetic_0008.jpeg","part":"Fender Kanan Depan","damage_type":"broken","severity":"severe","brand":"Toyota","model":"Creta","year":2017,"confidence":0.81,"data_source":"DEMO/SYNTHETIC DATA","repair_action":"Replace","quantity_required":1,"current_stock":7,"reorder_point":7,"demand_quantity":22,"supplier_id":"SUPP-003","supplier_name":"UD. Motor Sejahtera","lead_time_days":4,"purchase_quantity":7,"unit_cost":650000,"total_cost":650000,"repair_days":6,"priority":"Urgent","repair_status":"Waiting for Parts","material_type":null,"material_quantity":0.0,"dataset_note":"DEMO/SYNTHETIC DATA"},{"image_path":"/content/dataset_damage/image/synthetic_0009.jpeg","part":"Headlamp Kanan","damage_type":"dent","severity":"moderate","brand":"Honda","model":"CR-V","year":2023,"confidence":0.91,"data_source":"DEMO/SYNTHETIC DATA","repair_action":"Replace","quantity_required":1,"current_stock":5,"reorder_point":7,"demand_quantity":10,"supplier_id":"SUPP-001","supplier_name":"PT. Auto Gemilang Jaya","lead_time_days":1,"purchase_quantity":15,"unit_cost":1500000,"total_cost":1500000,"repair_days":3,"priority":"Normal","repair_status":"In Repair","material_type":null,"material_quantity":0.0,"dataset_note":"DEMO/SYNTHETIC DATA"},{"image_path":"/content/dataset_damage/image/synthetic_0010.jpeg","part":"Pintu Depan Kanan","damage_type":"crack","severity":"moderate","brand":"Honda","model":"Civic","year":2025,"confidence":0.79,"data_source":"DEMO/SYNTHETIC DATA","repair_action":"Replace","quantity_required":1,"current_stock":4,"reorder_point":3,"demand_quantity":17,"supplier_id":"SUPP-004","supplier_name":"Distributor Oto Nusantara","lead_time_days":10,"purchase_quantity":0,"unit_cost":1900000,"total_cost":1900000,"repair_days":4,"priority":"Low","repair_status":"Waiting for Parts","material_type":null,"material_quantity":0.0,"dataset_note":"DEMO/SYNTHETIC DATA"},{"image_path":"/content/dataset_damage/image/synthetic_0011.jpeg","part":"Kap Mesin","damage_type":"dent","severity":"severe","brand":"Toyota","model":"Innova Zenix","year":2021,"confidence":0.78,"data_source":"DEMO/SYNTHETIC DATA","repair_action":"Replace","quantity_required":1,"current_stock":12,"reorder_point":6,"demand_quantity":22,"supplier_id":"SUPP-002","supplier_name":"CV. Sparepart Makmur","lead_time_days":8,"purchase_quantity":0,"unit_cost":500000,"total_cost":500000,"repair_days":7,"priority":"Low","repair_status":"Quality Check","material_type":null,"material_quantity":0.0,"dataset_note":"DEMO/SYNTHETIC DATA"},{"image_path":"/content/dataset_damage/image/synthetic_0012.jpeg","part":"Bumper Belakang","damage_type":"broken","severity":"critical","brand":"Honda","model":"CR-V","year":2025,"confidence":0.83,"data_source":"DEMO/SYNTHETIC DATA","repair_action":"Replace","quantity_required":1,"current_stock":8,"reorder_point":5,"demand_quantity":9,"supplier_id":"SUPP-001","supplier_name":"PT. Auto Gemilang Jaya","lead_time_days":13,"purchase_quantity":0,"unit_cost":800000,"total_cost":800000,"repair_days":6,"priority":"Urgent","repair_status":"Completed","material_type":null,"material_quantity":0.0,"dataset_note":"DEMO/SYNTHETIC DATA"},{"image_path":"/content/dataset_damage/image/synthetic_0013.jpeg","part":"Bumper Belakang","damage_type":"shattered","severity":"severe","brand":"Daihatsu","model":"Terios","year":2026,"confidence":0.87,"data_source":"DEMO/SYNTHETIC DATA","repair_action":"Replace","quantity_required":1,"current_stock":5,"reorder_point":2,"demand_quantity":15,"supplier_id":"SUPP-003","supplier_name":"UD. Motor Sejahtera","lead_time_days":10,"purchase_quantity":0,"unit_cost":800000,"total_cost":800000,"repair_days":5,"priority":"Normal","repair_status":"Quality Check","material_type":null,"material_quantity":0.0,"dataset_note":"DEMO/SYNTHETIC DATA"},{"image_path":"/content/dataset_damage/image/synthetic_0014.jpeg","part":"Fender Kanan Depan","damage_type":"scratch","severity":"moderate","brand":"Suzuki","model":"XL7","year":2023,"confidence":0.84,"data_source":"DEMO/SYNTHETIC DATA","repair_action":"Repaint","quantity_required":1,"current_stock":8,"reorder_point":5,"demand_quantity":10,"supplier_id":"SUPP-002","supplier_name":"CV. Sparepart Makmur","lead_time_days":7,"purchase_quantity":0,"unit_cost":350000,"total_cost":350000,"repair_days":3,"priority":"Normal","repair_status":"Completed","material_type":"Automotive Paint (Liter)","material_quantity":0.74,"dataset_note":"DEMO/SYNTHETIC DATA"},{"image_path":"/content/dataset_damage/image/synthetic_0015.jpeg","part":"Bumper Belakang","damage_type":"scratch","severity":"critical","brand":"Toyota","model":"Avanza","year":2024,"confidence":0.72,"data_source":"DEMO/SYNTHETIC DATA","repair_action":"Replace","quantity_required":1,"current_stock":9,"reorder_point":7,"demand_quantity":10,"supplier_id":"SUPP-001","supplier_name":"PT. Auto Gemilang Jaya","lead_time_days":14,"purchase_quantity":0,"unit_cost":800000,"total_cost":800000,"repair_days":6,"priority":"Normal","repair_status":"Completed","material_type":null,"material_quantity":0.0,"dataset_note":"DEMO/SYNTHETIC DATA"},{"image_path":"/content/dataset_damage/image/synthetic_0016.jpeg","part":"Kaca Depan","damage_type":"crack","severity":"minor","brand":"Mitsubishi","model":"Pajero Sport","year":2025,"confidence":0.91,"data_source":"DEMO/SYNTHETIC DATA","repair_action":"Repaint","quantity_required":1,"current_stock":1,"reorder_point":6,"demand_quantity":24,"supplier_id":"SUPP-004","supplier_name":"Distributor Oto Nusantara","lead_time_days":14,"purchase_quantity":14,"unit_cost":350000,"total_cost":350000,"repair_days":2,"priority":"Normal","repair_status":"Parts Available","material_type":"Primer (Liter)","material_quantity":1.3,"dataset_note":"DEMO/SYNTHETIC DATA"},{"image_path":"/content/dataset_damage/image/synthetic_0017.jpeg","part":"Kap Mesin","damage_type":"crack","severity":"minor","brand":"Hyundai","model":"Civic","year":2019,"confidence":0.83,"data_source":"DEMO/SYNTHETIC DATA","repair_action":"Repaint","quantity_required":1,"current_stock":8,"reorder_point":7,"demand_quantity":25,"supplier_id":"SUPP-002","supplier_name":"CV. Sparepart Makmur","lead_time_days":11,"purchase_quantity":0,"unit_cost":350000,"total_cost":350000,"repair_days":2,"priority":"Normal","repair_status":"Quality Check","material_type":"Primer (Liter)","material_quantity":1.15,"dataset_note":"DEMO/SYNTHETIC DATA"},{"image_path":"/content/dataset_damage/image/synthetic_0018.jpeg","part":"Headlamp Kanan","damage_type":"crack","severity":"moderate","brand":"Mitsubishi","model":"Xpander","year":2023,"confidence":0.96,"data_source":"DEMO/SYNTHETIC DATA","repair_action":"Repair","quantity_required":1,"current_stock":11,"reorder_point":7,"demand_quantity":5,"supplier_id":"SUPP-001","supplier_name":"PT. Auto Gemilang Jaya","lead_time_days":5,"purchase_quantity":0,"unit_cost":450000,"total_cost":450000,"repair_days":4,"priority":"Low","repair_status":"Parts Available","material_type":"Body Filler (Kg)","material_quantity":0.65,"dataset_note":"DEMO/SYNTHETIC DATA"},{"image_path":"/content/dataset_damage/image/synthetic_0019.jpeg","part":"Kap Mesin","damage_type":"shattered","severity":"moderate","brand":"Hyundai","model":"Civic","year":2017,"confidence":0.81,"data_source":"DEMO/SYNTHETIC DATA","repair_action":"Replace","quantity_required":1,"current_stock":11,"reorder_point":6,"demand_quantity":17,"supplier_id":"SUPP-003","supplier_name":"UD. Motor Sejahtera","lead_time_days":14,"purchase_quantity":0,"unit_cost":500000,"total_cost":500000,"repair_days":4,"priority":"Normal","repair_status":"Quality Check","material_type":null,"material_quantity":0.0,"dataset_note":"DEMO/SYNTHETIC DATA"},{"image_path":"/content/dataset_damage/image/synthetic_0020.jpeg","part":"Kaca Depan","damage_type":"crack","severity":"critical","brand":"Honda","model":"Brio","year":2015,"confidence":0.73,"data_source":"DEMO/SYNTHETIC DATA","repair_action":"Replace","quantity_required":1,"current_stock":9,"reorder_point":7,"demand_quantity":11,"supplier_id":"SUPP-001","supplier_name":"PT. Auto Gemilang Jaya","lead_time_days":8,"purchase_quantity":0,"unit_cost":1200000,"total_cost":1200000,"repair_days":3,"priority":"Low","repair_status":"Parts Available","material_type":null,"material_quantity":0.0,"dataset_note":"DEMO/SYNTHETIC DATA"},{"image_path":"/content/dataset_damage/image/synthetic_0021.jpeg","part":"Bumper Belakang","damage_type":"dent","severity":"moderate","brand":"Daihatsu","model":"Ayla","year":2024,"confidence":0.97,"data_source":"DEMO/SYNTHETIC DATA","repair_action":"Replace","quantity_required":1,"current_stock":11,"reorder_point":2,"demand_quantity":13,"supplier_id":"SUPP-001","supplier_name":"PT. Auto Gemilang Jaya","lead_time_days":5,"purchase_quantity":0,"unit_cost":800000,"total_cost":800000,"repair_days":7,"priority":"Low","repair_status":"In Repair","material_type":null,"material_quantity":0.0,"dataset_note":"DEMO/SYNTHETIC DATA"},{"image_path":"/content/dataset_damage/image/synthetic_0022.jpeg","part":"Kap Mesin","damage_type":"dent","severity":"moderate","brand":"Toyota","model":"Creta","year":2017,"confidence":0.89,"data_source":"DEMO/SYNTHETIC DATA","repair_action":"Replace","quantity_required":1,"current_stock":12,"reorder_point":8,"demand_quantity":21,"supplier_id":"SUPP-003","supplier_name":"UD. Motor Sejahtera","lead_time_days":2,"purchase_quantity":0,"unit_cost":500000,"total_cost":500000,"repair_days":4,"priority":"Normal","repair_status":"Completed","material_type":null,"material_quantity":0.0,"dataset_note":"DEMO/SYNTHETIC DATA"},{"image_path":"/content/dataset_damage/image/synthetic_0023.jpeg","part":"Fender Kanan Depan","damage_type":"shattered","severity":"critical","brand":"Suzuki","model":"Ertiga","year":2018,"confidence":0.97,"data_source":"DEMO/SYNTHETIC DATA","repair_action":"Replace","quantity_required":1,"current_stock":10,"reorder_point":6,"demand_quantity":8,"supplier_id":"SUPP-001","supplier_name":"PT. Auto Gemilang Jaya","lead_time_days":11,"purchase_quantity":0,"unit_cost":650000,"total_cost":650000,"repair_days":6,"priority":"Urgent","repair_status":"In Repair","material_type":null,"material_quantity":0.0,"dataset_note":"DEMO/SYNTHETIC DATA"},{"image_path":"/content/dataset_damage/image/synthetic_0024.jpeg","part":"Headlamp Kanan","damage_type":"crack","severity":"critical","brand":"Hyundai","model":"Creta","year":2025,"confidence":0.89,"data_source":"DEMO/SYNTHETIC DATA","repair_action":"Replace","quantity_required":1,"current_stock":13,"reorder_point":2,"demand_quantity":5,"supplier_id":"SUPP-001","supplier_name":"PT. Auto Gemilang Jaya","lead_time_days":1,"purchase_quantity":0,"unit_cost":1500000,"total_cost":1500000,"repair_days":5,"priority":"Urgent","repair_status":"Waiting for Parts","material_type":null,"material_quantity":0.0,"dataset_note":"DEMO/SYNTHETIC DATA"},{"image_path":"/content/dataset_damage/image/synthetic_0025.jpeg","part":"Bumper Depan","damage_type":"scratch","severity":"moderate","brand":"Mitsubishi","model":"Pajero Sport","year":2016,"confidence":0.8,"data_source":"DEMO/SYNTHETIC DATA","repair_action":"Repaint","quantity_required":1,"current_stock":3,"reorder_point":3,"demand_quantity":18,"supplier_id":"SUPP-002","supplier_name":"CV. Sparepart Makmur","lead_time_days":7,"purchase_quantity":19,"unit_cost":350000,"total_cost":350000,"repair_days":3,"priority":"Normal","repair_status":"Completed","material_type":"Primer (Liter)","material_quantity":1.45,"dataset_note":"DEMO/SYNTHETIC DATA"},{"image_path":"/content/dataset_damage/image/synthetic_0026.jpeg","part":"Kaca Depan","damage_type":"scratch","severity":"minor","brand":"Suzuki","model":"Ertiga","year":2016,"confidence":0.91,"data_source":"DEMO/SYNTHETIC DATA","repair_action":"Repaint","quantity_required":1,"current_stock":13,"reorder_point":6,"demand_quantity":24,"supplier_id":"SUPP-002","supplier_name":"CV. Sparepart Makmur","lead_time_days":7,"purchase_quantity":0,"unit_cost":350000,"total_cost":350000,"repair_days":4,"priority":"Normal","repair_status":"In Repair","material_type":"Automotive Paint (Liter)","material_quantity":1.33,"dataset_note":"DEMO/SYNTHETIC DATA"},{"image_path":"/content/dataset_damage/image/synthetic_0027.jpeg","part":"Bumper Depan","damage_type":"dent","severity":"severe","brand":"Toyota","model":"Innova Zenix","year":2016,"confidence":0.85,"data_source":"DEMO/SYNTHETIC DATA","repair_action":"Replace","quantity_required":1,"current_stock":1,"reorder_point":7,"demand_quantity":12,"supplier_id":"SUPP-002","supplier_name":"CV. Sparepart Makmur","lead_time_days":8,"purchase_quantity":19,"unit_cost":800000,"total_cost":800000,"repair_days":4,"priority":"High","repair_status":"Waiting for Parts","material_type":null,"material_quantity":0.0,"dataset_note":"DEMO/SYNTHETIC DATA"},{"image_path":"/content/dataset_damage/image/synthetic_0028.jpeg","part":"Bumper Belakang","damage_type":"shattered","severity":"moderate","brand":"Daihatsu","model":"Creta","year":2026,"confidence":0.97,"data_source":"DEMO/SYNTHETIC DATA","repair_action":"Replace","quantity_required":1,"current_stock":11,"reorder_point":6,"demand_quantity":21,"supplier_id":"SUPP-003","supplier_name":"UD. Motor Sejahtera","lead_time_days":1,"purchase_quantity":0,"unit_cost":800000,"total_cost":800000,"repair_days":6,"priority":"Normal","repair_status":"Waiting for Parts","material_type":null,"material_quantity":0.0,"dataset_note":"DEMO/SYNTHETIC DATA"},{"image_path":"/content/dataset_damage/image/synthetic_0029.jpeg","part":"Bumper Belakang","damage_type":"broken","severity":"critical","brand":"Suzuki","model":"XL7","year":2018,"confidence":0.73,"data_source":"DEMO/SYNTHETIC DATA","repair_action":"Replace","quantity_required":1,"current_stock":14,"reorder_point":2,"demand_quantity":22,"supplier_id":"SUPP-002","supplier_name":"CV. Sparepart Makmur","lead_time_days":11,"purchase_quantity":0,"unit_cost":800000,"total_cost":800000,"repair_days":7,"priority":"Urgent","repair_status":"Waiting for Parts","material_type":null,"material_quantity":0.0,"dataset_note":"DEMO/SYNTHETIC DATA"},{"image_path":"/content/dataset_damage/image/synthetic_0030.jpeg","part":"Fender Kanan Depan","damage_type":"broken","severity":"critical","brand":"Hyundai","model":"Civic","year":2022,"confidence":0.95,"data_source":"DEMO/SYNTHETIC DATA","repair_action":"Replace","quantity_required":1,"current_stock":10,"reorder_point":3,"demand_quantity":5,"supplier_id":"SUPP-005","supplier_name":"Bintang Auto Sentosa","lead_time_days":4,"purchase_quantity":0,"unit_cost":650000,"total_cost":650000,"repair_days":3,"priority":"High","repair_status":"Completed","material_type":null,"material_quantity":0.0,"dataset_note":"DEMO/SYNTHETIC DATA"},{"image_path":"/content/dataset_damage/image/synthetic_0031.jpeg","part":"Bumper Depan","damage_type":"broken","severity":"severe","brand":"Toyota","model":"Avanza","year":2016,"confidence":0.77,"data_source":"DEMO/SYNTHETIC DATA","repair_action":"Replace","quantity_required":1,"current_stock":6,"reorder_point":6,"demand_quantity":7,"supplier_id":"SUPP-002","supplier_name":"CV. Sparepart Makmur","lead_time_days":6,"purchase_quantity":9,"unit_cost":800000,"total_cost":800000,"repair_days":7,"priority":"Low","repair_status":"Parts Available","material_type":null,"material_quantity":0.0,"dataset_note":"DEMO/SYNTHETIC DATA"},{"image_path":"/content/dataset_damage/image/synthetic_0032.jpeg","part":"Bumper Belakang","damage_type":"broken","severity":"moderate","brand":"Honda","model":"Civic","year":2019,"confidence":0.83,"data_source":"DEMO/SYNTHETIC DATA","repair_action":"Replace","quantity_required":1,"current_stock":4,"reorder_point":6,"demand_quantity":9,"supplier_id":"SUPP-002","supplier_name":"CV. Sparepart Makmur","lead_time_days":2,"purchase_quantity":5,"unit_cost":800000,"total_cost":800000,"repair_days":4,"priority":"Low","repair_status":"Parts Available","material_type":null,"material_quantity":0.0,"dataset_note":"DEMO/SYNTHETIC DATA"},{"image_path":"/content/dataset_damage/image/synthetic_0033.jpeg","part":"Kap Mesin","damage_type":"shattered","severity":"minor","brand":"Toyota","model":"Creta","year":2015,"confidence":0.89,"data_source":"DEMO/SYNTHETIC DATA","repair_action":"Replace","quantity_required":1,"current_stock":10,"reorder_point":2,"demand_quantity":6,"supplier_id":"SUPP-003","supplier_name":"UD. Motor Sejahtera","lead_time_days":1,"purchase_quantity":0,"unit_cost":500000,"total_cost":500000,"repair_days":4,"priority":"High","repair_status":"Completed","material_type":null,"material_quantity":0.0,"dataset_note":"DEMO/SYNTHETIC DATA"},{"image_path":"/content/dataset_damage/image/synthetic_0034.jpeg","part":"Bumper Depan","damage_type":"scratch","severity":"moderate","brand":"Suzuki","model":"Ertiga","year":2021,"confidence":0.84,"data_source":"DEMO/SYNTHETIC DATA","repair_action":"Repaint","quantity_required":1,"current_stock":3,"reorder_point":7,"demand_quantity":3,"supplier_id":"SUPP-004","supplier_name":"Distributor Oto Nusantara","lead_time_days":8,"purchase_quantity":16,"unit_cost":350000,"total_cost":350000,"repair_days":4,"priority":"Normal","repair_status":"Completed","material_type":"Primer (Liter)","material_quantity":0.61,"dataset_note":"DEMO/SYNTHETIC DATA"},{"image_path":"/content/dataset_damage/image/synthetic_0035.jpeg","part":"Bumper Depan","damage_type":"scratch","severity":"critical","brand":"Honda","model":"Civic","year":2015,"confidence":0.99,"data_source":"DEMO/SYNTHETIC DATA","repair_action":"Replace","quantity_required":1,"current_stock":1,"reorder_point":7,"demand_quantity":22,"supplier_id":"SUPP-005","supplier_name":"Bintang Auto Sentosa","lead_time_days":5,"purchase_quantity":19,"unit_cost":800000,"total_cost":800000,"repair_days":3,"priority":"Low","repair_status":"Quality Check","material_type":null,"material_quantity":0.0,"dataset_note":"DEMO/SYNTHETIC DATA"},{"image_path":"/content/dataset_damage/image/synthetic_0036.jpeg","part":"Fender Kanan Depan","damage_type":"broken","severity":"critical","brand":"Daihatsu","model":"Creta","year":2017,"confidence":0.76,"data_source":"DEMO/SYNTHETIC DATA","repair_action":"Replace","quantity_required":1,"current_stock":12,"reorder_point":5,"demand_quantity":22,"supplier_id":"SUPP-001","supplier_name":"PT. Auto Gemilang Jaya","lead_time_days":8,"purchase_quantity":0,"unit_cost":650000,"total_cost":650000,"repair_days":6,"priority":"Low","repair_status":"Waiting for Parts","material_type":null,"material_quantity":0.0,"dataset_note":"DEMO/SYNTHETIC DATA"},{"image_path":"/content/dataset_damage/image/synthetic_0037.jpeg","part":"Kaca Depan","damage_type":"shattered","severity":"minor","brand":"Honda","model":"Brio","year":2026,"confidence":0.79,"data_source":"DEMO/SYNTHETIC DATA","repair_action":"Replace","quantity_required":1,"current_stock":10,"reorder_point":6,"demand_quantity":5,"supplier_id":"SUPP-001","supplier_name":"PT. Auto Gemilang Jaya","lead_time_days":3,"purchase_quantity":0,"unit_cost":1200000,"total_cost":1200000,"repair_days":5,"priority":"Normal","repair_status":"Completed","material_type":null,"material_quantity":0.0,"dataset_note":"DEMO/SYNTHETIC DATA"},{"image_path":"/content/dataset_damage/image/synthetic_0038.jpeg","part":"Kaca Depan","damage_type":"shattered","severity":"moderate","brand":"Toyota","model":"Creta","year":2015,"confidence":0.98,"data_source":"DEMO/SYNTHETIC DATA","repair_action":"Replace","quantity_required":1,"current_stock":10,"reorder_point":5,"demand_quantity":20,"supplier_id":"SUPP-005","supplier_name":"Bintang Auto Sentosa","lead_time_days":5,"purchase_quantity":0,"unit_cost":1200000,"total_cost":1200000,"repair_days":6,"priority":"Normal","repair_status":"Quality Check","material_type":null,"material_quantity":0.0,"dataset_note":"DEMO/SYNTHETIC DATA"},{"image_path":"/content/dataset_damage/image/synthetic_0039.jpeg","part":"Bumper Depan","damage_type":"shattered","severity":"minor","brand":"Toyota","model":"Innova Zenix","year":2025,"confidence":0.95,"data_source":"DEMO/SYNTHETIC DATA","repair_action":"Replace","quantity_required":1,"current_stock":3,"reorder_point":8,"demand_quantity":23,"supplier_id":"SUPP-001","supplier_name":"PT. Auto Gemilang Jaya","lead_time_days":14,"purchase_quantity":11,"unit_cost":800000,"total_cost":800000,"repair_days":6,"priority":"Normal","repair_status":"Parts Available","material_type":null,"material_quantity":0.0,"dataset_note":"DEMO/SYNTHETIC DATA"}],"parts":[{"part_id":"PRT-0001","part_name":"Bumper Depan Toyota Avanza","category":"Body & Panel","vehicle_brand":"Toyota","vehicle_model":"Avanza","unit":"Pcs","unit_cost":764000,"supplier_id":"SUPP-009","lead_time_days":9,"minimum_stock":5,"reorder_point":8},{"part_id":"PRT-0004","part_name":"Kap Mesin (Hood) Toyota Avanza","category":"Body & Panel","vehicle_brand":"Toyota","vehicle_model":"Avanza","unit":"Pcs","unit_cost":1635000,"supplier_id":"SUPP-014","lead_time_days":9,"minimum_stock":9,"reorder_point":15},{"part_id":"PRT-0005","part_name":"Pintu Depan Kanan Toyota Avanza","category":"Body & Panel","vehicle_brand":"Toyota","vehicle_model":"Avanza","unit":"Pcs","unit_cost":2248000,"supplier_id":"SUPP-006","lead_time_days":15,"minimum_stock":7,"reorder_point":11},{"part_id":"PRT-0006","part_name":"Pintu Depan Kiri Toyota Avanza","category":"Body & Panel","vehicle_brand":"Toyota","vehicle_model":"Avanza","unit":"Pcs","unit_cost":2283000,"supplier_id":"SUPP-011","lead_time_days":5,"minimum_stock":3,"reorder_point":8},{"part_id":"PRT-0008","part_name":"Pintu Belakang Kiri Toyota Avanza","category":"Body & Panel","vehicle_brand":"Toyota","vehicle_model":"Avanza","unit":"Pcs","unit_cost":1852000,"supplier_id":"SUPP-013","lead_time_days":4,"minimum_stock":10,"reorder_point":14},{"part_id":"PRT-0009","part_name":"Pintu Bagasi Toyota Avanza","category":"Body & Panel","vehicle_brand":"Toyota","vehicle_model":"Avanza","unit":"Pcs","unit_cost":2362000,"supplier_id":"SUPP-012","lead_time_days":20,"minimum_stock":5,"reorder_point":12},{"part_id":"PRT-0010","part_name":"Grille Depan Toyota Avanza","category":"Body & Panel","vehicle_brand":"Toyota","vehicle_model":"Avanza","unit":"Pcs","unit_cost":649000,"supplier_id":"SUPP-010","lead_time_days":4,"minimum_stock":5,"reorder_point":13},{"part_id":"PRT-0011","part_name":"Kaca Depan (Windshield) Toyota Avanza","category":"Kaca","vehicle_brand":"Toyota","vehicle_model":"Avanza","unit":"Pcs","unit_cost":1207000,"supplier_id":"SUPP-012","lead_time_days":7,"minimum_stock":7,"reorder_point":11},{"part_id":"PRT-0012","part_name":"Kaca Belakang Toyota Avanza","category":"Kaca","vehicle_brand":"Toyota","vehicle_model":"Avanza","unit":"Pcs","unit_cost":1003000,"supplier_id":"SUPP-003","lead_time_days":21,"minimum_stock":12,"reorder_point":15},{"part_id":"PRT-0013","part_name":"Kaca Pintu Depan Kanan Toyota Avanza","category":"Kaca","vehicle_brand":"Toyota","vehicle_model":"Avanza","unit":"Pcs","unit_cost":400000,"supplier_id":"SUPP-015","lead_time_days":14,"minimum_stock":6,"reorder_point":13},{"part_id":"PRT-0014","part_name":"Kaca Pintu Depan Kiri Toyota Avanza","category":"Kaca","vehicle_brand":"Toyota","vehicle_model":"Avanza","unit":"Pcs","unit_cost":398000,"supplier_id":"SUPP-011","lead_time_days":3,"minimum_stock":5,"reorder_point":13},{"part_id":"PRT-0015","part_name":"Headlamp Kiri Toyota Avanza","category":"Lampu","vehicle_brand":"Toyota","vehicle_model":"Avanza","unit":"Pcs","unit_cost":1505000,"supplier_id":"SUPP-007","lead_time_days":20,"minimum_stock":7,"reorder_point":10},{"part_id":"PRT-0016","part_name":"Stoplamp Kanan Toyota Avanza","category":"Lampu","vehicle_brand":"Toyota","vehicle_model":"Avanza","unit":"Pcs","unit_cost":823000,"supplier_id":"SUPP-015","lead_time_days":6,"minimum_stock":6,"reorder_point":9},{"part_id":"PRT-0017","part_name":"Stoplamp Kiri Toyota Avanza","category":"Lampu","vehicle_brand":"Toyota","vehicle_model":"Avanza","unit":"Pcs","unit_cost":850000,"supplier_id":"SUPP-009","lead_time_days":20,"minimum_stock":8,"reorder_point":14},{"part_id":"PRT-0018","part_name":"Foglamp Set Toyota Avanza","category":"Lampu","vehicle_brand":"Toyota","vehicle_model":"Avanza","unit":"Set","unit_cost":745000,"supplier_id":"SUPP-005","lead_time_days":18,"minimum_stock":9,"reorder_point":11},{"part_id":"PRT-0019","part_name":"Spion Kanan Assy Toyota Avanza","category":"Spion & Aksesori","vehicle_brand":"Toyota","vehicle_model":"Avanza","unit":"Pcs","unit_cost":1010000,"supplier_id":"SUPP-005","lead_time_days":7,"minimum_stock":12,"reorder_point":17},{"part_id":"PRT-0021","part_name":"Radiator Assy Toyota Avanza","category":"Pendingin Mesin","vehicle_brand":"Toyota","vehicle_model":"Avanza","unit":"Pcs","unit_cost":1459000,"supplier_id":"SUPP-001","lead_time_days":5,"minimum_stock":12,"reorder_point":18},{"part_id":"PRT-0022","part_name":"Kondensor AC Toyota Avanza","category":"Pendingin Mesin","vehicle_brand":"Toyota","vehicle_model":"Avanza","unit":"Pcs","unit_cost":1214000,"supplier_id":"SUPP-011","lead_time_days":5,"minimum_stock":6,"reorder_point":11},{"part_id":"PRT-0023","part_name":"Shockbreaker Depan Set Toyota Avanza","category":"Suspensi","vehicle_brand":"Toyota","vehicle_model":"Avanza","unit":"Set","unit_cost":1141000,"supplier_id":"SUPP-009","lead_time_days":18,"minimum_stock":4,"reorder_point":10},{"part_id":"PRT-0024","part_name":"Shockbreaker Belakang Set Toyota Avanza","category":"Suspensi","vehicle_brand":"Toyota","vehicle_model":"Avanza","unit":"Set","unit_cost":1012000,"supplier_id":"SUPP-010","lead_time_days":18,"minimum_stock":11,"reorder_point":14},{"part_id":"PRT-0026","part_name":"Bumper Reinforcement Toyota Avanza","category":"Struktur","vehicle_brand":"Toyota","vehicle_model":"Avanza","unit":"Pcs","unit_cost":572000,"supplier_id":"SUPP-012","lead_time_days":11,"minimum_stock":5,"reorder_point":7},{"part_id":"PRT-0027","part_name":"Bumper Depan Toyota Innova Zenix","category":"Body & Panel","vehicle_brand":"Toyota","vehicle_model":"Innova Zenix","unit":"Pcs","unit_cost":1872000,"supplier_id":"SUPP-003","lead_time_days":4,"minimum_stock":9,"reorder_point":17},{"part_id":"PRT-0028","part_name":"Bumper Belakang Toyota Innova Zenix","category":"Body & Panel","vehicle_brand":"Toyota","vehicle_model":"Innova Zenix","unit":"Pcs","unit_cost":1940000,"supplier_id":"SUPP-005","lead_time_days":6,"minimum_stock":12,"reorder_point":17},{"part_id":"PRT-0030","part_name":"Fender Kiri Depan Toyota Innova Zenix","category":"Body & Panel","vehicle_brand":"Toyota","vehicle_model":"Innova Zenix","unit":"Pcs","unit_cost":1332000,"supplier_id":"SUPP-007","lead_time_days":11,"minimum_stock":8,"reorder_point":15},{"part_id":"PRT-0033","part_name":"Pintu Depan Kiri Toyota Innova Zenix","category":"Body & Panel","vehicle_brand":"Toyota","vehicle_model":"Innova Zenix","unit":"Pcs","unit_cost":4242000,"supplier_id":"SUPP-002","lead_time_days":9,"minimum_stock":3,"reorder_point":5},{"part_id":"PRT-0034","part_name":"Pintu Belakang Kanan Toyota Innova Zenix","category":"Body & Panel","vehicle_brand":"Toyota","vehicle_model":"Innova Zenix","unit":"Pcs","unit_cost":4030000,"supplier_id":"SUPP-008","lead_time_days":10,"minimum_stock":12,"reorder_point":17},{"part_id":"PRT-0036","part_name":"Pintu Bagasi Toyota Innova Zenix","category":"Body & Panel","vehicle_brand":"Toyota","vehicle_model":"Innova Zenix","unit":"Pcs","unit_cost":5380000,"supplier_id":"SUPP-007","lead_time_days":5,"minimum_stock":3,"reorder_point":10},{"part_id":"PRT-0037","part_name":"Grille Depan Toyota Innova Zenix","category":"Body & Panel","vehicle_brand":"Toyota","vehicle_model":"Innova Zenix","unit":"Pcs","unit_cost":1366000,"supplier_id":"SUPP-015","lead_time_days":3,"minimum_stock":12,"reorder_point":19},{"part_id":"PRT-0038","part_name":"Kaca Depan (Windshield) Toyota Innova Zenix","category":"Kaca","vehicle_brand":"Toyota","vehicle_model":"Innova Zenix","unit":"Pcs","unit_cost":2560000,"supplier_id":"SUPP-013","lead_time_days":12,"minimum_stock":3,"reorder_point":6},{"part_id":"PRT-0039","part_name":"Kaca Belakang Toyota Innova Zenix","category":"Kaca","vehicle_brand":"Toyota","vehicle_model":"Innova Zenix","unit":"Pcs","unit_cost":2326000,"supplier_id":"SUPP-005","lead_time_days":15,"minimum_stock":4,"reorder_point":8},{"part_id":"PRT-0040","part_name":"Kaca Pintu Depan Kanan Toyota Innova Zenix","category":"Kaca","vehicle_brand":"Toyota","vehicle_model":"Innova Zenix","unit":"Pcs","unit_cost":990000,"supplier_id":"SUPP-003","lead_time_days":16,"minimum_stock":10,"reorder_point":12},{"part_id":"PRT-0041","part_name":"Kaca Pintu Depan Kiri Toyota Innova Zenix","category":"Kaca","vehicle_brand":"Toyota","vehicle_model":"Innova Zenix","unit":"Pcs","unit_cost":1012000,"supplier_id":"SUPP-001","lead_time_days":4,"minimum_stock":5,"reorder_point":8},{"part_id":"PRT-0042","part_name":"Headlamp Kanan Toyota Innova Zenix","category":"Lampu","vehicle_brand":"Toyota","vehicle_model":"Innova Zenix","unit":"Pcs","unit_cost":3453000,"supplier_id":"SUPP-013","lead_time_days":3,"minimum_stock":4,"reorder_point":9},{"part_id":"PRT-0043","part_name":"Stoplamp Kanan Toyota Innova Zenix","category":"Lampu","vehicle_brand":"Toyota","vehicle_model":"Innova Zenix","unit":"Pcs","unit_cost":1998000,"supplier_id":"SUPP-015","lead_time_days":11,"minimum_stock":8,"reorder_point":15},{"part_id":"PRT-0047","part_name":"Spion Kiri Assy Toyota Innova Zenix","category":"Spion & Aksesori","vehicle_brand":"Toyota","vehicle_model":"Innova Zenix","unit":"Pcs","unit_cost":2082000,"supplier_id":"SUPP-006","lead_time_days":4,"minimum_stock":11,"reorder_point":13},{"part_id":"PRT-0048","part_name":"Radiator Assy Toyota Innova Zenix","category":"Pendingin Mesin","vehicle_brand":"Toyota","vehicle_model":"Innova Zenix","unit":"Pcs","unit_cost":2852000,"supplier_id":"SUPP-004","lead_time_days":20,"minimum_stock":5,"reorder_point":11},{"part_id":"PRT-0049","part_name":"Kondensor AC Toyota Innova Zenix","category":"Pendingin Mesin","vehicle_brand":"Toyota","vehicle_model":"Innova Zenix","unit":"Pcs","unit_cost":2599000,"supplier_id":"SUPP-014","lead_time_days":20,"minimum_stock":11,"reorder_point":17},{"part_id":"PRT-0050","part_name":"Shockbreaker Depan Set Toyota Innova Zenix","category":"Suspensi","vehicle_brand":"Toyota","vehicle_model":"Innova Zenix","unit":"Set","unit_cost":2646000,"supplier_id":"SUPP-011","lead_time_days":9,"minimum_stock":6,"reorder_point":11},{"part_id":"PRT-0051","part_name":"Shockbreaker Belakang Set Toyota Innova Zenix","category":"Suspensi","vehicle_brand":"Toyota","vehicle_model":"Innova Zenix","unit":"Set","unit_cost":2137000,"supplier_id":"SUPP-015","lead_time_days":12,"minimum_stock":3,"reorder_point":5},{"part_id":"PRT-0052","part_name":"Radiator Support Toyota Innova Zenix","category":"Struktur","vehicle_brand":"Toyota","vehicle_model":"Innova Zenix","unit":"Pcs","unit_cost":1897000,"supplier_id":"SUPP-004","lead_time_days":4,"minimum_stock":10,"reorder_point":13}],"inventory_transactions":[{"transaction_id":"TRX-000180","transaction_date":"2026-01-24","part_id":"PRT-0023","transaction_type":"OUT","quantity":1,"unit_cost":1141000,"reference_id":"RO-00359"},{"transaction_id":"TRX-000276","transaction_date":"2026-03-04","part_id":"PRT-0028","transaction_type":"OUT","quantity":1,"unit_cost":1940000,"reference_id":"RO-00549"},{"transaction_id":"TRX-000005","transaction_date":"2026-03-09","part_id":"PRT-0125","transaction_type":"OUT","quantity":1,"unit_cost":1520000,"reference_id":"RO-00007"},{"transaction_id":"TRX-000160","transaction_date":"2026-04-02","part_id":"PRT-0049","transaction_type":"OUT","quantity":1,"unit_cost":2599000,"reference_id":"RO-00325"},{"transaction_id":"TRX-000242","transaction_date":"2026-04-05","part_id":"PRT-0022","transaction_type":"OUT","quantity":1,"unit_cost":1214000,"reference_id":"RO-00481"},{"transaction_id":"TRX-000004","transaction_date":"2026-04-14","part_id":"PRT-0413","transaction_type":"OUT","quantity":1,"unit_cost":1487000,"reference_id":"RO-00006"},{"transaction_id":"TRX-000062","transaction_date":"2026-04-18","part_id":"PRT-0021","transaction_type":"OUT","quantity":1,"unit_cost":1459000,"reference_id":"RO-00122"},{"transaction_id":"TRX-000083","transaction_date":"2026-04-24","part_id":"PRT-0051","transaction_type":"OUT","quantity":1,"unit_cost":2137000,"reference_id":"RO-00172"},{"transaction_id":"TRX-000001","transaction_date":"2026-04-26","part_id":"PRT-0461","transaction_type":"OUT","quantity":1,"unit_cost":1309000,"reference_id":"RO-00001"},{"transaction_id":"TRX-000055","transaction_date":"2026-04-27","part_id":"PRT-0041","transaction_type":"OUT","quantity":2,"unit_cost":1012000,"reference_id":"RO-00107"},{"transaction_id":"TRX-000010","transaction_date":"2026-05-08","part_id":"PRT-0051","transaction_type":"OUT","quantity":1,"unit_cost":2137000,"reference_id":"RO-00020"},{"transaction_id":"TRX-000257","transaction_date":"2026-05-27","part_id":"PRT-0033","transaction_type":"OUT","quantity":1,"unit_cost":4242000,"reference_id":"RO-00516"},{"transaction_id":"TRX-000260","transaction_date":"2026-06-03","part_id":"PRT-0005","transaction_type":"OUT","quantity":1,"unit_cost":2248000,"reference_id":"RO-00521"},{"transaction_id":"TRX-000148","transaction_date":"2026-06-07","part_id":"PRT-0030","transaction_type":"OUT","quantity":1,"unit_cost":1332000,"reference_id":"RO-00301"},{"transaction_id":"TRX-000002","transaction_date":"2026-06-08","part_id":"PRT-0400","transaction_type":"OUT","quantity":1,"unit_cost":919000,"reference_id":"RO-00003"},{"transaction_id":"TRX-000253","transaction_date":"2026-06-15","part_id":"PRT-0022","transaction_type":"OUT","quantity":1,"unit_cost":1214000,"reference_id":"RO-00498"},{"transaction_id":"TRX-000136","transaction_date":"2026-07-01","part_id":"PRT-0015","transaction_type":"OUT","quantity":1,"unit_cost":1505000,"reference_id":"RO-00278"},{"transaction_id":"TRX-000155","transaction_date":"2026-07-27","part_id":"PRT-0038","transaction_type":"OUT","quantity":1,"unit_cost":2560000,"reference_id":"RO-00318"},{"transaction_id":"TRX-000207","transaction_date":"2026-08-04","part_id":"PRT-0021","transaction_type":"OUT","quantity":1,"unit_cost":1459000,"reference_id":"RO-00414"},{"transaction_id":"TRX-000003","transaction_date":"2026-08-14","part_id":"PRT-0319","transaction_type":"OUT","quantity":1,"unit_cost":975000,"reference_id":"RO-00004"},{"transaction_id":"TRX-000126","transaction_date":"2026-09-04","part_id":"PRT-0041","transaction_type":"OUT","quantity":1,"unit_cost":1012000,"reference_id":"RO-00249"},{"transaction_id":"TRX-000164","transaction_date":"2026-09-07","part_id":"PRT-0018","transaction_type":"OUT","quantity":1,"unit_cost":745000,"reference_id":"RO-00331"},{"transaction_id":"TRX-000365","transaction_date":"2026-01-22","part_id":"PRT-0334","transaction_type":"IN","quantity":5,"unit_cost":2478000,"reference_id":"PO-00043"},{"transaction_id":"TRX-000566","transaction_date":"2026-03-03","part_id":"PRT-0188","transaction_type":"IN","quantity":5,"unit_cost":506000,"reference_id":"PO-00134"},{"transaction_id":"TRX-000568","transaction_date":"2026-03-08","part_id":"PRT-0265","transaction_type":"IN","quantity":45,"unit_cost":950000,"reference_id":"PO-00135"},{"transaction_id":"TRX-000505","transaction_date":"2026-03-09","part_id":"PRT-0414","transaction_type":"IN","quantity":24,"unit_cost":1732000,"reference_id":"PO-00107"},{"transaction_id":"TRX-000538","transaction_date":"2026-03-20","part_id":"PRT-0181","transaction_type":"IN","quantity":47,"unit_cost":613000,"reference_id":"PO-00118"},{"transaction_id":"TRX-000516","transaction_date":"2026-03-30","part_id":"PRT-0213","transaction_type":"IN","quantity":5,"unit_cost":2884000,"reference_id":"PO-00111"},{"transaction_id":"TRX-000395","transaction_date":"2026-03-31","part_id":"PRT-0442","transaction_type":"IN","quantity":44,"unit_cost":1311000,"reference_id":"PO-00059"},{"transaction_id":"TRX-000432","transaction_date":"2026-04-05","part_id":"PRT-0005","transaction_type":"IN","quantity":18,"unit_cost":2248000,"reference_id":"PO-00076"},{"transaction_id":"TRX-000543","transaction_date":"2026-04-18","part_id":"PRT-0381","transaction_type":"IN","quantity":10,"unit_cost":457000,"reference_id":"PO-00123"},{"transaction_id":"TRX-000546","transaction_date":"2026-04-21","part_id":"PRT-0130","transaction_type":"IN","quantity":35,"unit_cost":1359000,"reference_id":"PO-00125"},{"transaction_id":"TRX-000589","transaction_date":"2026-04-22","part_id":"PRT-0195","transaction_type":"IN","quantity":24,"unit_cost":4961000,"reference_id":"PO-00147"},{"transaction_id":"TRX-000466","transaction_date":"2026-04-23","part_id":"PRT-0081","transaction_type":"IN","quantity":16,"unit_cost":1852000,"reference_id":"PO-00089"},{"transaction_id":"TRX-000413","transaction_date":"2026-05-04","part_id":"PRT-0092","transaction_type":"IN","quantity":48,"unit_cost":2740000,"reference_id":"PO-00067"},{"transaction_id":"TRX-000319","transaction_date":"2026-05-28","part_id":"PRT-0304","transaction_type":"IN","quantity":10,"unit_cost":1467000,"reference_id":"PO-00020"},{"transaction_id":"TRX-000359","transaction_date":"2026-06-04","part_id":"PRT-0074","transaction_type":"IN","quantity":25,"unit_cost":949000,"reference_id":"PO-00038"},{"transaction_id":"TRX-000575","transaction_date":"2026-06-06","part_id":"PRT-0537","transaction_type":"IN","quantity":38,"unit_cost":836000,"reference_id":"PO-00140"},{"transaction_id":"TRX-000325","transaction_date":"2026-06-13","part_id":"PRT-0470","transaction_type":"IN","quantity":22,"unit_cost":2435000,"reference_id":"PO-00022"},{"transaction_id":"TRX-000423","transaction_date":"2026-06-22","part_id":"PRT-0003","transaction_type":"IN","quantity":17,"unit_cost":548000,"reference_id":"PO-00072"},{"transaction_id":"TRX-000344","transaction_date":"2026-07-17","part_id":"PRT-0063","transaction_type":"IN","quantity":38,"unit_cost":682000,"reference_id":"PO-00031"},{"transaction_id":"TRX-000455","transaction_date":"2026-08-07","part_id":"PRT-0493","transaction_type":"IN","quantity":6,"unit_cost":2120000,"reference_id":"PO-00086"},{"transaction_id":"TRX-000571","transaction_date":"2026-08-14","part_id":"PRT-0254","transaction_type":"IN","quantity":30,"unit_cost":2486000,"reference_id":"PO-00137"},{"transaction_id":"TRX-000284","transaction_date":"2026-08-16","part_id":"PRT-0026","transaction_type":"IN","quantity":21,"unit_cost":572000,"reference_id":"PO-00004"},{"transaction_id":"TRX-000309","transaction_date":"2026-09-01","part_id":"PRT-0489","transaction_type":"IN","quantity":48,"unit_cost":1664000,"reference_id":"PO-00016"},{"transaction_id":"TRX-000578","transaction_date":"2026-09-07","part_id":"PRT-0520","transaction_type":"IN","quantity":36,"unit_cost":1838000,"reference_id":"PO-00142"},{"transaction_id":"TRX-000367","transaction_date":"2026-09-15","part_id":"PRT-0260","transaction_type":"IN","quantity":12,"unit_cost":1464000,"reference_id":"PO-00045"},{"transaction_id":"TRX-000279","transaction_date":"2026-01-01","part_id":"PRT-0482","transaction_type":"OUT","quantity":4,"unit_cost":2005000,"reference_id":"RO-EXTRA-5816"},{"transaction_id":"TRX-000285","transaction_date":"2026-01-01","part_id":"PRT-0197","transaction_type":"RETURN","quantity":2,"unit_cost":4711000,"reference_id":"RET-0001"},{"transaction_id":"TRX-000976","transaction_date":"2026-01-01","part_id":"PRT-0005","transaction_type":"IN","quantity":15,"unit_cost":2248000,"reference_id":"PO-00342"},{"transaction_id":"TRX-000640","transaction_date":"2026-01-01","part_id":"PRT-0537","transaction_type":"OUT","quantity":1,"unit_cost":836000,"reference_id":"RO-EXTRA-9277"},{"transaction_id":"TRX-000491","transaction_date":"2026-01-01","part_id":"PRT-0471","transaction_type":"IN","quantity":22,"unit_cost":963000,"reference_id":"PO-00100"},{"transaction_id":"TRX-000348","transaction_date":"2026-01-01","part_id":"PRT-0071","transaction_type":"IN","quantity":21,"unit_cost":802000,"reference_id":"PO-00032"},{"transaction_id":"TRX-000435","transaction_date":"2026-01-02","part_id":"PRT-0463","transaction_type":"IN","quantity":40,"unit_cost":3494000,"reference_id":"PO-00077"},{"transaction_id":"TRX-000865","transaction_date":"2026-01-02","part_id":"PRT-0341","transaction_type":"OUT","quantity":2,"unit_cost":836000,"reference_id":"RO-EXTRA-5520"},{"transaction_id":"TRX-001128","transaction_date":"2026-01-02","part_id":"PRT-0308","transaction_type":"IN","quantity":29,"unit_cost":983000,"reference_id":"PO-00410"},{"transaction_id":"TRX-000937","transaction_date":"2026-01-02","part_id":"PRT-0456","transaction_type":"IN","quantity":24,"unit_cost":907000,"reference_id":"PO-00325"},{"transaction_id":"TRX-001184","transaction_date":"2026-01-03","part_id":"PRT-0162","transaction_type":"IN","quantity":23,"unit_cost":611000,"reference_id":"PO-00433"},{"transaction_id":"TRX-000843","transaction_date":"2026-01-03","part_id":"PRT-0455","transaction_type":"OUT","quantity":1,"unit_cost":1307000,"reference_id":"RO-EXTRA-8976"},{"transaction_id":"TRX-000840","transaction_date":"2026-01-03","part_id":"PRT-0136","transaction_type":"IN","quantity":37,"unit_cost":685000,"reference_id":"PO-00278"},{"transaction_id":"TRX-000690","transaction_date":"2026-01-03","part_id":"PRT-0217","transaction_type":"OUT","quantity":3,"unit_cost":1906000,"reference_id":"RO-EXTRA-9094"},{"transaction_id":"TRX-000069","transaction_date":"2026-01-05","part_id":"PRT-0337","transaction_type":"OUT","quantity":1,"unit_cost":416000,"reference_id":"RO-00137"},{"transaction_id":"TRX-000172","transaction_date":"2026-01-05","part_id":"PRT-0436","transaction_type":"OUT","quantity":1,"unit_cost":2234000,"reference_id":"RO-00348"},{"transaction_id":"TRX-000593","transaction_date":"2026-01-05","part_id":"PRT-0454","transaction_type":"OUT","quantity":3,"unit_cost":1224000,"reference_id":"RO-EXTRA-7250"},{"transaction_id":"TRX-000321","transaction_date":"2026-01-05","part_id":"PRT-0167","transaction_type":"ADJUSTMENT","quantity":3,"unit_cost":1430000,"reference_id":"ADJ-0001"},{"transaction_id":"TRX-000977","transaction_date":"2026-01-05","part_id":"PRT-0008","transaction_type":"ADJUSTMENT","quantity":1,"unit_cost":1852000,"reference_id":"ADJ-0029"},{"transaction_id":"TRX-000868","transaction_date":"2026-01-06","part_id":"PRT-0074","transaction_type":"ADJUSTMENT","quantity":3,"unit_cost":949000,"reference_id":"ADJ-0021"},{"transaction_id":"TRX-000118","transaction_date":"2026-01-06","part_id":"PRT-0086","transaction_type":"OUT","quantity":1,"unit_cost":4185000,"reference_id":"RO-00235"},{"transaction_id":"TRX-000850","transaction_date":"2026-01-06","part_id":"PRT-0155","transaction_type":"IN","quantity":44,"unit_cost":749000,"reference_id":"PO-00282"},{"transaction_id":"TRX-000600","transaction_date":"2026-01-06","part_id":"PRT-0402","transaction_type":"IN","quantity":49,"unit_cost":764000,"reference_id":"PO-00153"},{"transaction_id":"TRX-000018","transaction_date":"2026-01-06","part_id":"PRT-0349","transaction_type":"OUT","quantity":1,"unit_cost":930000,"reference_id":"RO-00033"},{"transaction_id":"TRX-001181","transaction_date":"2026-01-06","part_id":"PRT-0386","transaction_type":"RETURN","quantity":2,"unit_cost":1513000,"reference_id":"RET-0096"},{"transaction_id":"TRX-000820","transaction_date":"2026-01-07","part_id":"PRT-0220","transaction_type":"RETURN","quantity":2,"unit_cost":1312000,"reference_id":"RET-0055"},{"transaction_id":"TRX-000025","transaction_date":"2026-01-07","part_id":"PRT-0153","transaction_type":"OUT","quantity":1,"unit_cost":613000,"reference_id":"RO-00048"},{"transaction_id":"TRX-000523","transaction_date":"2026-01-07","part_id":"PRT-0374","transaction_type":"RETURN","quantity":2,"unit_cost":1047000,"reference_id":"RET-0025"},{"transaction_id":"TRX-000449","transaction_date":"2026-01-07","part_id":"PRT-0297","transaction_type":"OUT","quantity":1,"unit_cost":590000,"reference_id":"RO-EXTRA-1740"},{"transaction_id":"TRX-000810","transaction_date":"2026-01-07","part_id":"PRT-0173","transaction_type":"OUT","quantity":2,"unit_cost":860000,"reference_id":"RO-EXTRA-7618"},{"transaction_id":"TRX-001025","transaction_date":"2026-01-07","part_id":"PRT-0050","transaction_type":"RETURN","quantity":1,"unit_cost":2646000,"reference_id":"RET-0078"},{"transaction_id":"TRX-000792","transaction_date":"2026-01-08","part_id":"PRT-0205","transaction_type":"OUT","quantity":3,"unit_cost":3662000,"reference_id":"RO-EXTRA-8663"},{"transaction_id":"TRX-000733","transaction_date":"2026-01-08","part_id":"PRT-0379","transaction_type":"OUT","quantity":1,"unit_cost":643000,"reference_id":"RO-EXTRA-7216"}],"repair_orders":[{"repair_order_id":"RO-00019","order_date":"2026-06-14","vehicle_brand":"Toyota","vehicle_model":"Avanza","vehicle_year":2021,"part_id":"PRT-0026","damage_type":"scratch","severity":"Low","repair_action":"Repair","quantity_required":1,"estimated_repair_days":1,"priority":"Low","status":"In Repair"},{"repair_order_id":"RO-00020","order_date":"2026-05-03","vehicle_brand":"Toyota","vehicle_model":"Innova Zenix","vehicle_year":2017,"part_id":"PRT-0051","damage_type":"shattered","severity":"High","repair_action":"Replace","quantity_required":1,"estimated_repair_days":5,"priority":"Urgent","status":"Waiting for Parts"},{"repair_order_id":"RO-00031","order_date":"2026-03-07","vehicle_brand":"Toyota","vehicle_model":"Innova Zenix","vehicle_year":2024,"part_id":"PRT-0042","damage_type":"crack","severity":"Medium","repair_action":"Repair","quantity_required":1,"estimated_repair_days":5,"priority":"Urgent","status":"Waiting for Parts"},{"repair_order_id":"RO-00044","order_date":"2026-02-26","vehicle_brand":"Toyota","vehicle_model":"Innova Zenix","vehicle_year":2022,"part_id":"PRT-0041","damage_type":"dent","severity":"Low","repair_action":"Repair","quantity_required":1,"estimated_repair_days":2,"priority":"Urgent","status":"Parts Available"},{"repair_order_id":"RO-00055","order_date":"2026-04-01","vehicle_brand":"Toyota","vehicle_model":"Avanza","vehicle_year":2025,"part_id":"PRT-0026","damage_type":"scratch","severity":"Low","repair_action":"Repair","quantity_required":1,"estimated_repair_days":1,"priority":"High","status":"Completed"},{"repair_order_id":"RO-00096","order_date":"2026-03-15","vehicle_brand":"Toyota","vehicle_model":"Innova Zenix","vehicle_year":2018,"part_id":"PRT-0042","damage_type":"dent","severity":"Low","repair_action":"Repair","quantity_required":1,"estimated_repair_days":1,"priority":"Urgent","status":"Completed"},{"repair_order_id":"RO-00107","order_date":"2026-04-26","vehicle_brand":"Toyota","vehicle_model":"Innova Zenix","vehicle_year":2018,"part_id":"PRT-0041","damage_type":"crack","severity":"Medium","repair_action":"Replace","quantity_required":2,"estimated_repair_days":5,"priority":"High","status":"Waiting for Parts"},{"repair_order_id":"RO-00108","order_date":"2026-04-23","vehicle_brand":"Toyota","vehicle_model":"Innova Zenix","vehicle_year":2022,"part_id":"PRT-0037","damage_type":"scratch","severity":"Medium","repair_action":"Repair","quantity_required":1,"estimated_repair_days":4,"priority":"Normal","status":"Ready for Repair"},{"repair_order_id":"RO-00112","order_date":"2026-05-15","vehicle_brand":"Toyota","vehicle_model":"Avanza","vehicle_year":2025,"part_id":"PRT-0022","damage_type":"dent","severity":"Medium","repair_action":"Repair","quantity_required":1,"estimated_repair_days":3,"priority":"High","status":"Ready for Repair"},{"repair_order_id":"RO-00119","order_date":"2026-08-07","vehicle_brand":"Toyota","vehicle_model":"Innova Zenix","vehicle_year":2021,"part_id":"PRT-0034","damage_type":"crack","severity":"High","repair_action":"Repair","quantity_required":1,"estimated_repair_days":2,"priority":"High","status":"Parts Available"},{"repair_order_id":"RO-00122","order_date":"2026-04-16","vehicle_brand":"Toyota","vehicle_model":"Avanza","vehicle_year":2024,"part_id":"PRT-0021","damage_type":"broken","severity":"High","repair_action":"Replace","quantity_required":1,"estimated_repair_days":8,"priority":"Urgent","status":"In Repair"},{"repair_order_id":"RO-00147","order_date":"2026-04-28","vehicle_brand":"Toyota","vehicle_model":"Avanza","vehicle_year":2022,"part_id":"PRT-0012","damage_type":"scratch","severity":"Low","repair_action":"Repaint","quantity_required":1,"estimated_repair_days":2,"priority":"Normal","status":"Completed"},{"repair_order_id":"RO-00149","order_date":"2026-04-18","vehicle_brand":"Toyota","vehicle_model":"Avanza","vehicle_year":2015,"part_id":"PRT-0009","damage_type":"dent","severity":"Low","repair_action":"Repaint","quantity_required":1,"estimated_repair_days":4,"priority":"Low","status":"Parts Available"},{"repair_order_id":"RO-00151","order_date":"2026-08-12","vehicle_brand":"Toyota","vehicle_model":"Avanza","vehicle_year":2024,"part_id":"PRT-0024","damage_type":"crack","severity":"High","repair_action":"Repair","quantity_required":1,"estimated_repair_days":5,"priority":"Normal","status":"In Repair"},{"repair_order_id":"RO-00155","order_date":"2026-03-16","vehicle_brand":"Toyota","vehicle_model":"Innova Zenix","vehicle_year":2015,"part_id":"PRT-0051","damage_type":"crack","severity":"High","repair_action":"Repair","quantity_required":1,"estimated_repair_days":2,"priority":"Urgent","status":"Ready for Repair"},{"repair_order_id":"RO-00172","order_date":"2026-04-19","vehicle_brand":"Toyota","vehicle_model":"Innova Zenix","vehicle_year":2024,"part_id":"PRT-0051","damage_type":"broken","severity":"High","repair_action":"Replace","quantity_required":1,"estimated_repair_days":5,"priority":"Urgent","status":"Quality Check"},{"repair_order_id":"RO-00233","order_date":"2026-03-30","vehicle_brand":"Toyota","vehicle_model":"Avanza","vehicle_year":2020,"part_id":"PRT-0018","damage_type":"scratch","severity":"Low","repair_action":"Repaint","quantity_required":1,"estimated_repair_days":1,"priority":"Urgent","status":"Completed"},{"repair_order_id":"RO-00237","order_date":"2026-05-09","vehicle_brand":"Toyota","vehicle_model":"Avanza","vehicle_year":2021,"part_id":"PRT-0012","damage_type":"scratch","severity":"Low","repair_action":"Repaint","quantity_required":1,"estimated_repair_days":3,"priority":"Low","status":"In Repair"},{"repair_order_id":"RO-00249","order_date":"2026-08-31","vehicle_brand":"Toyota","vehicle_model":"Innova Zenix","vehicle_year":2020,"part_id":"PRT-0041","damage_type":"broken","severity":"Critical","repair_action":"Replace","quantity_required":1,"estimated_repair_days":5,"priority":"Urgent","status":"Ready for Repair"},{"repair_order_id":"RO-00258","order_date":"2026-08-29","vehicle_brand":"Toyota","vehicle_model":"Avanza","vehicle_year":2024,"part_id":"PRT-0010","damage_type":"crack","severity":"High","repair_action":"Repair","quantity_required":1,"estimated_repair_days":2,"priority":"High","status":"Waiting for Parts"},{"repair_order_id":"RO-00278","order_date":"2026-06-29","vehicle_brand":"Toyota","vehicle_model":"Avanza","vehicle_year":2019,"part_id":"PRT-0015","damage_type":"broken","severity":"High","repair_action":"Replace","quantity_required":1,"estimated_repair_days":5,"priority":"Low","status":"Parts Available"},{"repair_order_id":"RO-00283","order_date":"2026-05-27","vehicle_brand":"Toyota","vehicle_model":"Innova Zenix","vehicle_year":2015,"part_id":"PRT-0038","damage_type":"dent","severity":"Low","repair_action":"Repair","quantity_required":1,"estimated_repair_days":3,"priority":"Normal","status":"Ready for Repair"},{"repair_order_id":"RO-00301","order_date":"2026-06-03","vehicle_brand":"Toyota","vehicle_model":"Innova Zenix","vehicle_year":2026,"part_id":"PRT-0030","damage_type":"crack","severity":"Medium","repair_action":"Replace","quantity_required":1,"estimated_repair_days":4,"priority":"Normal","status":"Waiting for Parts"},{"repair_order_id":"RO-00318","order_date":"2026-07-24","vehicle_brand":"Toyota","vehicle_model":"Innova Zenix","vehicle_year":2015,"part_id":"PRT-0038","damage_type":"broken","severity":"Critical","repair_action":"Replace","quantity_required":1,"estimated_repair_days":9,"priority":"High","status":"In Repair"},{"repair_order_id":"RO-00325","order_date":"2026-03-30","vehicle_brand":"Toyota","vehicle_model":"Innova Zenix","vehicle_year":2021,"part_id":"PRT-0049","damage_type":"crack","severity":"Medium","repair_action":"Replace","quantity_required":1,"estimated_repair_days":5,"priority":"Normal","status":"Waiting for Parts"},{"repair_order_id":"RO-00331","order_date":"2026-09-02","vehicle_brand":"Toyota","vehicle_model":"Avanza","vehicle_year":2026,"part_id":"PRT-0018","damage_type":"shattered","severity":"Critical","repair_action":"Replace","quantity_required":1,"estimated_repair_days":3,"priority":"High","status":"In Repair"},{"repair_order_id":"RO-00359","order_date":"2026-01-21","vehicle_brand":"Toyota","vehicle_model":"Avanza","vehicle_year":2024,"part_id":"PRT-0023","damage_type":"shattered","severity":"High","repair_action":"Replace","quantity_required":1,"estimated_repair_days":7,"priority":"Low","status":"In Repair"},{"repair_order_id":"RO-00405","order_date":"2026-01-06","vehicle_brand":"Toyota","vehicle_model":"Innova Zenix","vehicle_year":2026,"part_id":"PRT-0038","damage_type":"scratch","severity":"Low","repair_action":"Repair","quantity_required":1,"estimated_repair_days":1,"priority":"High","status":"Completed"},{"repair_order_id":"RO-00408","order_date":"2026-03-29","vehicle_brand":"Toyota","vehicle_model":"Innova Zenix","vehicle_year":2020,"part_id":"PRT-0030","damage_type":"dent","severity":"Low","repair_action":"Repair","quantity_required":1,"estimated_repair_days":4,"priority":"Normal","status":"Completed"},{"repair_order_id":"RO-00414","order_date":"2026-07-31","vehicle_brand":"Toyota","vehicle_model":"Avanza","vehicle_year":2021,"part_id":"PRT-0021","damage_type":"shattered","severity":"High","repair_action":"Replace","quantity_required":1,"estimated_repair_days":10,"priority":"Normal","status":"In Repair"},{"repair_order_id":"RO-00428","order_date":"2026-08-15","vehicle_brand":"Toyota","vehicle_model":"Innova Zenix","vehicle_year":2020,"part_id":"PRT-0027","damage_type":"scratch","severity":"Low","repair_action":"Repaint","quantity_required":1,"estimated_repair_days":3,"priority":"High","status":"In Repair"},{"repair_order_id":"RO-00430","order_date":"2026-07-06","vehicle_brand":"Toyota","vehicle_model":"Innova Zenix","vehicle_year":2022,"part_id":"PRT-0042","damage_type":"dent","severity":"Low","repair_action":"Repair","quantity_required":1,"estimated_repair_days":1,"priority":"High","status":"Waiting for Parts"},{"repair_order_id":"RO-00461","order_date":"2026-01-14","vehicle_brand":"Toyota","vehicle_model":"Avanza","vehicle_year":2019,"part_id":"PRT-0026","damage_type":"scratch","severity":"Medium","repair_action":"Repaint","quantity_required":1,"estimated_repair_days":1,"priority":"Low","status":"Ready for Repair"},{"repair_order_id":"RO-00481","order_date":"2026-04-01","vehicle_brand":"Toyota","vehicle_model":"Avanza","vehicle_year":2021,"part_id":"PRT-0022","damage_type":"shattered","severity":"Critical","repair_action":"Replace","quantity_required":1,"estimated_repair_days":9,"priority":"Urgent","status":"Quality Check"},{"repair_order_id":"RO-00498","order_date":"2026-06-12","vehicle_brand":"Toyota","vehicle_model":"Avanza","vehicle_year":2016,"part_id":"PRT-0022","damage_type":"broken","severity":"Critical","repair_action":"Replace","quantity_required":1,"estimated_repair_days":9,"priority":"Low","status":"Parts Available"},{"repair_order_id":"RO-00516","order_date":"2026-05-26","vehicle_brand":"Toyota","vehicle_model":"Innova Zenix","vehicle_year":2021,"part_id":"PRT-0033","damage_type":"shattered","severity":"High","repair_action":"Replace","quantity_required":1,"estimated_repair_days":6,"priority":"High","status":"Parts Available"},{"repair_order_id":"RO-00521","order_date":"2026-05-31","vehicle_brand":"Toyota","vehicle_model":"Avanza","vehicle_year":2024,"part_id":"PRT-0005","damage_type":"crack","severity":"Medium","repair_action":"Replace","quantity_required":1,"estimated_repair_days":5,"priority":"High","status":"Parts Available"},{"repair_order_id":"RO-00549","order_date":"2026-03-03","vehicle_brand":"Toyota","vehicle_model":"Innova Zenix","vehicle_year":2020,"part_id":"PRT-0028","damage_type":"broken","severity":"High","repair_action":"Replace","quantity_required":1,"estimated_repair_days":9,"priority":"Urgent","status":"Waiting for Parts"},{"repair_order_id":"RO-00001","order_date":"2026-04-22","vehicle_brand":"Mitsubishi","vehicle_model":"Pajero Sport","vehicle_year":2022,"part_id":"PRT-0461","damage_type":"broken","severity":"High","repair_action":"Replace","quantity_required":1,"estimated_repair_days":4,"priority":"Low","status":"Waiting for Parts"},{"repair_order_id":"RO-00002","order_date":"2026-04-30","vehicle_brand":"Suzuki","vehicle_model":"Ertiga","vehicle_year":2026,"part_id":"PRT-0491","damage_type":"dent","severity":"Medium","repair_action":"Repair","quantity_required":1,"estimated_repair_days":2,"priority":"Normal","status":"Parts Available"},{"repair_order_id":"RO-00003","order_date":"2026-06-07","vehicle_brand":"Daihatsu","vehicle_model":"Ayla","vehicle_year":2023,"part_id":"PRT-0400","damage_type":"shattered","severity":"Critical","repair_action":"Replace","quantity_required":1,"estimated_repair_days":8,"priority":"Low","status":"Ready for Repair"},{"repair_order_id":"RO-00004","order_date":"2026-08-10","vehicle_brand":"Daihatsu","vehicle_model":"Sigra","vehicle_year":2025,"part_id":"PRT-0319","damage_type":"broken","severity":"High","repair_action":"Replace","quantity_required":1,"estimated_repair_days":8,"priority":"Normal","status":"Parts Available"},{"repair_order_id":"RO-00005","order_date":"2026-06-24","vehicle_brand":"Mitsubishi","vehicle_model":"Xpander","vehicle_year":2017,"part_id":"PRT-0458","damage_type":"crack","severity":"High","repair_action":"Repair","quantity_required":1,"estimated_repair_days":4,"priority":"High","status":"Parts Available"},{"repair_order_id":"RO-00006","order_date":"2026-04-12","vehicle_brand":"Daihatsu","vehicle_model":"Gran Max","vehicle_year":2016,"part_id":"PRT-0413","damage_type":"broken","severity":"Critical","repair_action":"Replace","quantity_required":1,"estimated_repair_days":3,"priority":"Urgent","status":"Quality Check"},{"repair_order_id":"RO-00007","order_date":"2026-03-05","vehicle_brand":"Toyota","vehicle_model":"Calya","vehicle_year":2017,"part_id":"PRT-0125","damage_type":"broken","severity":"High","repair_action":"Replace","quantity_required":1,"estimated_repair_days":7,"priority":"Normal","status":"Quality Check"}],"purchase_orders":[{"po_id":"PO-00004","po_date":"2026-02-21","supplier_id":"SUPP-010","part_id":"PRT-0277","quantity_ordered":2,"unit_cost":1455000,"total_cost":2910000,"expected_delivery_date":"2026-03-13","actual_delivery_date":null,"status":"Cancelled"},{"po_id":"PO-00016","po_date":"2026-08-04","supplier_id":"SUPP-006","part_id":"PRT-0053","quantity_ordered":30,"unit_cost":1289000,"total_cost":38670000,"expected_delivery_date":"2026-08-29","actual_delivery_date":"2026-08-30","status":"Received"},{"po_id":"PO-00020","po_date":"2026-05-29","supplier_id":"SUPP-007","part_id":"PRT-0144","quantity_ordered":30,"unit_cost":1377000,"total_cost":41310000,"expected_delivery_date":"2026-06-15","actual_delivery_date":null,"status":"Cancelled"},{"po_id":"PO-00022","po_date":"2026-04-26","supplier_id":"SUPP-002","part_id":"PRT-0400","quantity_ordered":25,"unit_cost":919000,"total_cost":22975000,"expected_delivery_date":"2026-04-29","actual_delivery_date":null,"status":"Ordered"},{"po_id":"PO-00031","po_date":"2026-02-04","supplier_id":"SUPP-001","part_id":"PRT-0396","quantity_ordered":12,"unit_cost":682000,"total_cost":8184000,"expected_delivery_date":"2026-02-25","actual_delivery_date":"2026-03-02","status":"Received"},{"po_id":"PO-00038","po_date":"2026-07-06","supplier_id":"SUPP-004","part_id":"PRT-0121","quantity_ordered":2,"unit_cost":1088000,"total_cost":2176000,"expected_delivery_date":"2026-08-07","actual_delivery_date":"2026-08-08","status":"Received"},{"po_id":"PO-00043","po_date":"2026-06-08","supplier_id":"SUPP-010","part_id":"PRT-0318","quantity_ordered":50,"unit_cost":685000,"total_cost":34250000,"expected_delivery_date":"2026-06-28","actual_delivery_date":null,"status":"Ordered"},{"po_id":"PO-00045","po_date":"2026-03-16","supplier_id":"SUPP-014","part_id":"PRT-0292","quantity_ordered":20,"unit_cost":1235000,"total_cost":24700000,"expected_delivery_date":"2026-04-10","actual_delivery_date":"2026-04-14","status":"Received"},{"po_id":"PO-00059","po_date":"2026-03-17","supplier_id":"SUPP-012","part_id":"PRT-0233","quantity_ordered":50,"unit_cost":3583000,"total_cost":179150000,"expected_delivery_date":"2026-03-20","actual_delivery_date":null,"status":"Pending"},{"po_id":"PO-00067","po_date":"2026-02-11","supplier_id":"SUPP-001","part_id":"PRT-0365","quantity_ordered":15,"unit_cost":423000,"total_cost":6345000,"expected_delivery_date":"2026-03-02","actual_delivery_date":null,"status":"Cancelled"},{"po_id":"PO-00072","po_date":"2026-07-25","supplier_id":"SUPP-008","part_id":"PRT-0180","quantity_ordered":20,"unit_cost":583000,"total_cost":11660000,"expected_delivery_date":"2026-08-18","actual_delivery_date":"2026-08-20","status":"Received"},{"po_id":"PO-00076","po_date":"2026-02-17","supplier_id":"SUPP-008","part_id":"PRT-0075","quantity_ordered":12,"unit_cost":1408000,"total_cost":16896000,"expected_delivery_date":"2026-03-13","actual_delivery_date":null,"status":"Pending"},{"po_id":"PO-00086","po_date":"2026-08-29","supplier_id":"SUPP-010","part_id":"PRT-0141","quantity_ordered":10,"unit_cost":1619000,"total_cost":16190000,"expected_delivery_date":"2026-09-16","actual_delivery_date":"2026-09-18","status":"Received"},{"po_id":"PO-00089","po_date":"2026-04-02","supplier_id":"SUPP-007","part_id":"PRT-0118","quantity_ordered":2,"unit_cost":2233000,"total_cost":4466000,"expected_delivery_date":"2026-04-17","actual_delivery_date":null,"status":"Ordered"},{"po_id":"PO-00107","po_date":"2026-06-05","supplier_id":"SUPP-003","part_id":"PRT-0550","quantity_ordered":30,"unit_cost":343000,"total_cost":10290000,"expected_delivery_date":"2026-06-27","actual_delivery_date":"2026-06-26","status":"Partially Received"},{"po_id":"PO-00111","po_date":"2026-03-18","supplier_id":"SUPP-003","part_id":"PRT-0320","quantity_ordered":2,"unit_cost":872000,"total_cost":1744000,"expected_delivery_date":"2026-04-14","actual_delivery_date":"2026-04-17","status":"Received"},{"po_id":"PO-00118","po_date":"2026-06-04","supplier_id":"SUPP-010","part_id":"PRT-0291","quantity_ordered":15,"unit_cost":1301000,"total_cost":19515000,"expected_delivery_date":"2026-06-23","actual_delivery_date":"2026-06-28","status":"Received"},{"po_id":"PO-00123","po_date":"2026-04-21","supplier_id":"SUPP-010","part_id":"PRT-0133","quantity_ordered":5,"unit_cost":900000,"total_cost":4500000,"expected_delivery_date":"2026-05-06","actual_delivery_date":null,"status":"Ordered"},{"po_id":"PO-00125","po_date":"2026-06-20","supplier_id":"SUPP-005","part_id":"PRT-0490","quantity_ordered":25,"unit_cost":2015000,"total_cost":50375000,"expected_delivery_date":"2026-06-26","actual_delivery_date":null,"status":"Ordered"},{"po_id":"PO-00134","po_date":"2026-08-06","supplier_id":"SUPP-014","part_id":"PRT-0295","quantity_ordered":25,"unit_cost":777000,"total_cost":19425000,"expected_delivery_date":"2026-08-30","actual_delivery_date":"2026-09-01","status":"Received"},{"po_id":"PO-00135","po_date":"2026-02-09","supplier_id":"SUPP-011","part_id":"PRT-0333","quantity_ordered":30,"unit_cost":1887000,"total_cost":56610000,"expected_delivery_date":"2026-02-25","actual_delivery_date":"2026-02-24","status":"Received"},{"po_id":"PO-00137","po_date":"2026-04-23","supplier_id":"SUPP-008","part_id":"PRT-0083","quantity_ordered":20,"unit_cost":1198000,"total_cost":23960000,"expected_delivery_date":"2026-05-19","actual_delivery_date":"2026-05-24","status":"Received"},{"po_id":"PO-00140","po_date":"2026-03-14","supplier_id":"SUPP-010","part_id":"PRT-0470","quantity_ordered":15,"unit_cost":2435000,"total_cost":36525000,"expected_delivery_date":"2026-03-31","actual_delivery_date":"2026-04-02","status":"Received"},{"po_id":"PO-00142","po_date":"2026-05-31","supplier_id":"SUPP-002","part_id":"PRT-0202","quantity_ordered":5,"unit_cost":1010000,"total_cost":5050000,"expected_delivery_date":"2026-06-04","actual_delivery_date":"2026-06-09","status":"Received"},{"po_id":"PO-00147","po_date":"2026-01-05","supplier_id":"SUPP-013","part_id":"PRT-0406","quantity_ordered":12,"unit_cost":620000,"total_cost":7440000,"expected_delivery_date":"2026-01-17","actual_delivery_date":"2026-01-20","status":"Received"}],"material_usage":[{"usage_id":"USE-000001","repair_order_id":"RO-00001","usage_date":"2026-04-25","material_id":"MAT-0168","color_code":"SYS-MET459","quantity_used":1.22,"unit":"Liter","unit_cost":217000},{"usage_id":"USE-000002","repair_order_id":"RO-00001","usage_date":"2026-04-24","material_id":"MAT-0093","color_code":null,"quantity_used":2.41,"unit":"Liter","unit_cost":28000},{"usage_id":"USE-000003","repair_order_id":"RO-00001","usage_date":"2026-04-25","material_id":"MAT-0065","color_code":null,"quantity_used":2.0,"unit":"Gallon (5L)","unit_cost":738000},{"usage_id":"USE-000004","repair_order_id":"RO-00002","usage_date":"2026-05-02","material_id":"MAT-0137","color_code":"SYS-PEA194","quantity_used":1.5,"unit":"Can (1L)","unit_cost":611000},{"usage_id":"USE-000005","repair_order_id":"RO-00002","usage_date":"2026-05-02","material_id":"MAT-0085","color_code":null,"quantity_used":0.81,"unit":"Liter","unit_cost":37000},{"usage_id":"USE-000006","repair_order_id":"RO-00003","usage_date":"2026-06-08","material_id":"MAT-0168","color_code":"SYS-MET380","quantity_used":2.15,"unit":"Liter","unit_cost":217000},{"usage_id":"USE-000007","repair_order_id":"RO-00003","usage_date":"2026-06-08","material_id":"MAT-0004","color_code":null,"quantity_used":1.5,"unit":"Drum (20L)","unit_cost":988000},{"usage_id":"USE-000008","repair_order_id":"RO-00003","usage_date":"2026-06-10","material_id":"MAT-0065","color_code":null,"quantity_used":0.5,"unit":"Gallon (5L)","unit_cost":738000},{"usage_id":"USE-000009","repair_order_id":"RO-00003","usage_date":"2026-06-10","material_id":"MAT-0024","color_code":null,"quantity_used":0.64,"unit":"Can (3Kg)","unit_cost":142000},{"usage_id":"USE-000010","repair_order_id":"RO-00004","usage_date":"2026-08-12","material_id":"MAT-0053","color_code":"SYS-MAT347","quantity_used":0.5,"unit":"Can (4L)","unit_cost":2142000},{"usage_id":"USE-000011","repair_order_id":"RO-00004","usage_date":"2026-08-16","material_id":"MAT-0099","color_code":null,"quantity_used":1.59,"unit":"Liter","unit_cost":54000},{"usage_id":"USE-000012","repair_order_id":"RO-00004","usage_date":"2026-08-15","material_id":"MAT-0084","color_code":null,"quantity_used":0.45,"unit":"Liter","unit_cost":460000},{"usage_id":"USE-000013","repair_order_id":"RO-00004","usage_date":"2026-08-11","material_id":"MAT-0157","color_code":null,"quantity_used":1.0,"unit":"Can (1L)","unit_cost":86000},{"usage_id":"USE-000014","repair_order_id":"RO-00005","usage_date":"2026-06-25","material_id":"MAT-0062","color_code":"W32","quantity_used":1.5,"unit":"Can (4L)","unit_cost":1831000},{"usage_id":"USE-000015","repair_order_id":"RO-00005","usage_date":"2026-06-25","material_id":"MAT-0093","color_code":null,"quantity_used":1.15,"unit":"Liter","unit_cost":28000},{"usage_id":"USE-000016","repair_order_id":"RO-00005","usage_date":"2026-06-28","material_id":"MAT-0129","color_code":null,"quantity_used":1.65,"unit":"Liter","unit_cost":448000},{"usage_id":"USE-000017","repair_order_id":"RO-00005","usage_date":"2026-06-27","material_id":"MAT-0074","color_code":null,"quantity_used":0.5,"unit":"Can (1L)","unit_cost":181000},{"usage_id":"USE-000018","repair_order_id":"RO-00005","usage_date":"2026-06-27","material_id":"MAT-0037","color_code":null,"quantity_used":0.52,"unit":"Kg","unit_cost":87000},{"usage_id":"USE-000019","repair_order_id":"RO-00006","usage_date":"2026-04-14","material_id":"MAT-0075","color_code":"R67","quantity_used":1.73,"unit":"Liter","unit_cost":176000},{"usage_id":"USE-000020","repair_order_id":"RO-00006","usage_date":"2026-04-15","material_id":"MAT-0046","color_code":null,"quantity_used":2.0,"unit":"Gallon (5L)","unit_cost":159000},{"usage_id":"USE-000021","repair_order_id":"RO-00006","usage_date":"2026-04-14","material_id":"MAT-0084","color_code":null,"quantity_used":0.5,"unit":"Liter","unit_cost":460000},{"usage_id":"USE-000022","repair_order_id":"RO-00007","usage_date":"2026-03-07","material_id":"MAT-0025","color_code":"202","quantity_used":1.5,"unit":"Can (4L)","unit_cost":1340000},{"usage_id":"USE-000023","repair_order_id":"RO-00007","usage_date":"2026-03-11","material_id":"MAT-0030","color_code":null,"quantity_used":1.1,"unit":"Liter","unit_cost":32000},{"usage_id":"USE-000024","repair_order_id":"RO-00007","usage_date":"2026-03-12","material_id":"MAT-0167","color_code":null,"quantity_used":0.5,"unit":"Set (with Hardener)","unit_cost":426000},{"usage_id":"USE-000025","repair_order_id":"RO-00007","usage_date":"2026-03-09","material_id":"MAT-0074","color_code":null,"quantity_used":2.0,"unit":"Can (1L)","unit_cost":181000},{"usage_id":"USE-000068","repair_order_id":"RO-00019","usage_date":"2026-06-15","material_id":"MAT-0088","color_code":"8X2","quantity_used":1.0,"unit":"Can (4L)","unit_cost":2955000},{"usage_id":"USE-000069","repair_order_id":"RO-00019","usage_date":"2026-06-15","material_id":"MAT-0136","color_code":null,"quantity_used":2.0,"unit":"Gallon (5L)","unit_cost":177000},{"usage_id":"USE-000070","repair_order_id":"RO-00019","usage_date":"2026-06-15","material_id":"MAT-0141","color_code":null,"quantity_used":0.41,"unit":"Kg","unit_cost":67000},{"usage_id":"USE-000071","repair_order_id":"RO-00020","usage_date":"2026-05-05","material_id":"MAT-0075","color_code":"3R3","quantity_used":0.31,"unit":"Liter","unit_cost":176000},{"usage_id":"USE-000072","repair_order_id":"RO-00020","usage_date":"2026-05-04","material_id":"MAT-0099","color_code":null,"quantity_used":0.93,"unit":"Liter","unit_cost":54000},{"usage_id":"USE-000073","repair_order_id":"RO-00020","usage_date":"2026-05-07","material_id":"MAT-0157","color_code":null,"quantity_used":2.0,"unit":"Can (1L)","unit_cost":86000},{"usage_id":"USE-000109","repair_order_id":"RO-00031","usage_date":"2026-03-09","material_id":"MAT-0088","color_code":"8X2","quantity_used":2.0,"unit":"Can (4L)","unit_cost":2955000},{"usage_id":"USE-000110","repair_order_id":"RO-00031","usage_date":"2026-03-08","material_id":"MAT-0160","color_code":null,"quantity_used":1.0,"unit":"Gallon (5L)","unit_cost":261000},{"usage_id":"USE-000111","repair_order_id":"RO-00031","usage_date":"2026-03-10","material_id":"MAT-0070","color_code":null,"quantity_used":0.73,"unit":"Liter","unit_cost":293000},{"usage_id":"USE-000153","repair_order_id":"RO-00044","usage_date":"2026-02-27","material_id":"MAT-0092","color_code":"1G3","quantity_used":1.5,"unit":"Can (4L)","unit_cost":2614000},{"usage_id":"USE-000154","repair_order_id":"RO-00044","usage_date":"2026-02-27","material_id":"MAT-0029","color_code":null,"quantity_used":0.5,"unit":"Gallon (5L)","unit_cost":268000},{"usage_id":"USE-000155","repair_order_id":"RO-00044","usage_date":"2026-02-27","material_id":"MAT-0027","color_code":null,"quantity_used":2.0,"unit":"Gallon (5L)","unit_cost":1707000},{"usage_id":"USE-000156","repair_order_id":"RO-00044","usage_date":"2026-02-27","material_id":"MAT-0069","color_code":null,"quantity_used":2.05,"unit":"Liter","unit_cost":103000},{"usage_id":"USE-000157","repair_order_id":"RO-00044","usage_date":"2026-02-28","material_id":"MAT-0111","color_code":null,"quantity_used":0.23,"unit":"Kg","unit_cost":63000},{"usage_id":"USE-000196","repair_order_id":"RO-00055","usage_date":"2026-04-02","material_id":"MAT-0130","color_code":"070","quantity_used":2.0,"unit":"Can (4L)","unit_cost":1932000}],"paint_materials":[{"material_id":"MAT-0002","material_name":"Blink Thinner - Gallon (5L)","material_category":"Thinner","color_family":"Clear","unit":"Gallon (5L)","unit_cost":237000,"minimum_stock":34,"reorder_point":51,"supplier_id":"SUPP-002"},{"material_id":"MAT-0003","material_name":"DuPont Hardener - Bottle (0.5L)","material_category":"Hardener","color_family":"Clear","unit":"Bottle (0.5L)","unit_cost":956000,"minimum_stock":36,"reorder_point":52,"supplier_id":"SUPP-012"},{"material_id":"MAT-0004","material_name":"MaxAuto Thinner - Drum (20L)","material_category":"Thinner","color_family":"Clear","unit":"Drum (20L)","unit_cost":988000,"minimum_stock":37,"reorder_point":57,"supplier_id":"SUPP-011"},{"material_id":"MAT-0012","material_name":"Blink Thinner - Drum (20L)","material_category":"Thinner","color_family":"Clear","unit":"Drum (20L)","unit_cost":619000,"minimum_stock":38,"reorder_point":59,"supplier_id":"SUPP-008"},{"material_id":"MAT-0017","material_name":"Belkote Thinner - Gallon (5L)","material_category":"Thinner","color_family":"Clear","unit":"Gallon (5L)","unit_cost":155000,"minimum_stock":24,"reorder_point":39,"supplier_id":"SUPP-013"},{"material_id":"MAT-0061","material_name":"Blink Thinner - Liter","material_category":"Thinner","color_family":"Clear","unit":"Liter","unit_cost":26000,"minimum_stock":25,"reorder_point":45,"supplier_id":"SUPP-010"},{"material_id":"MAT-0088","material_name":"Kansai Automotive Paint - Blue (Can (4L))","material_category":"Automotive Paint","color_family":"Blue","unit":"Can (4L)","unit_cost":2955000,"minimum_stock":28,"reorder_point":44,"supplier_id":"SUPP-009"},{"material_id":"MAT-0091","material_name":"Blink Filler / Dempul - Gray (Kg)","material_category":"Filler / Dempul","color_family":"Gray","unit":"Kg","unit_cost":69000,"minimum_stock":23,"reorder_point":33,"supplier_id":"SUPP-006"},{"material_id":"MAT-0092","material_name":"Nippon Paint Automotive Paint - Gray (Can (4L))","material_category":"Automotive Paint","color_family":"Gray","unit":"Can (4L)","unit_cost":2614000,"minimum_stock":25,"reorder_point":37,"supplier_id":"SUPP-003"},{"material_id":"MAT-0101","material_name":"Kansai Compound & Polish - White (Bottle)","material_category":"Compound & Polish","color_family":"White","unit":"Bottle","unit_cost":183000,"minimum_stock":32,"reorder_point":51,"supplier_id":"SUPP-001"},{"material_id":"MAT-0127","material_name":"Sikkens Thinner - Liter","material_category":"Thinner","color_family":"Clear","unit":"Liter","unit_cost":28000,"minimum_stock":26,"reorder_point":50,"supplier_id":"SUPP-011"},{"material_id":"MAT-0131","material_name":"AutoGlow Masking & Prep - Roll","material_category":"Masking & Prep","color_family":null,"unit":"Roll","unit_cost":37000,"minimum_stock":12,"reorder_point":22,"supplier_id":"SUPP-014"},{"material_id":"MAT-0142","material_name":"DuPont Thinner - Drum (20L)","material_category":"Thinner","color_family":"Clear","unit":"Drum (20L)","unit_cost":561000,"minimum_stock":24,"reorder_point":35,"supplier_id":"SUPP-006"},{"material_id":"MAT-0143","material_name":"Sikkens Masking & Prep - Sheet","material_category":"Masking & Prep","color_family":null,"unit":"Sheet","unit_cost":18000,"minimum_stock":11,"reorder_point":31,"supplier_id":"SUPP-002"},{"material_id":"MAT-0147","material_name":"Belkote Filler / Dempul - Greenish (Can (3Kg))","material_category":"Filler / Dempul","color_family":"Greenish","unit":"Can (3Kg)","unit_cost":227000,"minimum_stock":33,"reorder_point":55,"supplier_id":"SUPP-011"},{"material_id":"MAT-0158","material_name":"Alfa Filler / Dempul - Greenish (Kg)","material_category":"Filler / Dempul","color_family":"Greenish","unit":"Kg","unit_cost":68000,"minimum_stock":30,"reorder_point":55,"supplier_id":"SUPP-010"},{"material_id":"MAT-0161","material_name":"Danz Automotive Paint - Red (Can (4L))","material_category":"Automotive Paint","color_family":"Red","unit":"Can (4L)","unit_cost":589000,"minimum_stock":31,"reorder_point":44,"supplier_id":"SUPP-012"},{"material_id":"MAT-0178","material_name":"Danz Masking & Prep - Roll","material_category":"Masking & Prep","color_family":null,"unit":"Roll","unit_cost":35000,"minimum_stock":9,"reorder_point":33,"supplier_id":"SUPP-001"},{"material_id":"MAT-0184","material_name":"DuPont Clear Coat - Liter","material_category":"Clear Coat","color_family":"Clear","unit":"Liter","unit_cost":480000,"minimum_stock":25,"reorder_point":42,"supplier_id":"SUPP-006"},{"material_id":"MAT-0185","material_name":"Sikkens Automotive Paint - Silver (Liter)","material_category":"Automotive Paint","color_family":"Silver","unit":"Liter","unit_cost":697000,"minimum_stock":37,"reorder_point":49,"supplier_id":"SUPP-011"},{"material_id":"MAT-0001","material_name":"DuPont Hardener - Bottle (0.5L)","material_category":"Hardener","color_family":"Clear","unit":"Bottle (0.5L)","unit_cost":933000,"minimum_stock":33,"reorder_point":53,"supplier_id":"SUPP-093"},{"material_id":"MAT-0005","material_name":"Spies Hecker Hardener - Yellowish (Liter)","material_category":"Hardener","color_family":"Yellowish","unit":"Liter","unit_cost":268000,"minimum_stock":17,"reorder_point":39,"supplier_id":"SUPP-031"},{"material_id":"MAT-0006","material_name":"Kansai Primer / Epoxy - Gray (Can (1L))","material_category":"Primer / Epoxy","color_family":"Gray","unit":"Can (1L)","unit_cost":153000,"minimum_stock":38,"reorder_point":51,"supplier_id":"SUPP-045"},{"material_id":"MAT-0007","material_name":"Spies Hecker Filler / Dempul - Yellow (Kg)","material_category":"Filler / Dempul","color_family":"Yellow","unit":"Kg","unit_cost":49000,"minimum_stock":8,"reorder_point":22,"supplier_id":"SUPP-063"},{"material_id":"MAT-0008","material_name":"3M Compound & Polish - White (Bottle)","material_category":"Compound & Polish","color_family":"White","unit":"Bottle","unit_cost":221000,"minimum_stock":16,"reorder_point":26,"supplier_id":"SUPP-100"}],"suppliers":[{"supplier_id":"SUPP-001","supplier_name":"Distributor Sinar Abadi","city":"Bogor","average_lead_time_days":21,"minimum_order_quantity":25,"reliability_score":60},{"supplier_id":"SUPP-002","supplier_name":"UD. Sparepart Utama","city":"Surakarta","average_lead_time_days":1,"minimum_order_quantity":2,"reliability_score":97},{"supplier_id":"SUPP-003","supplier_name":"CV. Indo Abadi","city":"Palembang","average_lead_time_days":24,"minimum_order_quantity":50,"reliability_score":88},{"supplier_id":"SUPP-004","supplier_name":"Distributor Indo Sentosa","city":"Yogyakarta","average_lead_time_days":30,"minimum_order_quantity":10,"reliability_score":86},{"supplier_id":"SUPP-005","supplier_name":"CV. Bintang Nusantara","city":"Yogyakarta","average_lead_time_days":4,"minimum_order_quantity":20,"reliability_score":80},{"supplier_id":"SUPP-006","supplier_name":"CV. Part Jaya","city":"Batam","average_lead_time_days":27,"minimum_order_quantity":25,"reliability_score":100},{"supplier_id":"SUPP-007","supplier_name":"Distributor Dinamika Jaya","city":"Denpasar","average_lead_time_days":17,"minimum_order_quantity":2,"reliability_score":56},{"supplier_id":"SUPP-008","supplier_name":"CV. Oto Maju","city":"Bekasi","average_lead_time_days":26,"minimum_order_quantity":10,"reliability_score":66},{"supplier_id":"SUPP-009","supplier_name":"CV. Sparepart Nusantara","city":"Malang","average_lead_time_days":8,"minimum_order_quantity":50,"reliability_score":67},{"supplier_id":"SUPP-010","supplier_name":"Toko Motor Perkasa","city":"Palembang","average_lead_time_days":17,"minimum_order_quantity":50,"reliability_score":98},{"supplier_id":"SUPP-011","supplier_name":"Distributor Dinamika Bersama","city":"Depok","average_lead_time_days":18,"minimum_order_quantity":15,"reliability_score":95},{"supplier_id":"SUPP-012","supplier_name":"PT. Dinamika Sentosa","city":"Depok","average_lead_time_days":3,"minimum_order_quantity":100,"reliability_score":72},{"supplier_id":"SUPP-013","supplier_name":"Toko Indo Utama","city":"Surabaya","average_lead_time_days":10,"minimum_order_quantity":10,"reliability_score":100},{"supplier_id":"SUPP-014","supplier_name":"CV. Motor Jaya","city":"Sidoarjo","average_lead_time_days":24,"minimum_order_quantity":5,"reliability_score":97},{"supplier_id":"SUPP-015","supplier_name":"Toko Indo Abadi","city":"Medan","average_lead_time_days":4,"minimum_order_quantity":100,"reliability_score":87}],"vehicle_demand_history":[{"record_id":"REC-00157","month":"2024-01","part_id":"PRT-0026","vehicle_brand":"Toyota","vehicle_model":"Avanza","demand_quantity":57,"repair_order_count":41},{"record_id":"REC-00158","month":"2024-02","part_id":"PRT-0026","vehicle_brand":"Toyota","vehicle_model":"Avanza","demand_quantity":44,"repair_order_count":29},{"record_id":"REC-00159","month":"2024-03","part_id":"PRT-0026","vehicle_brand":"Toyota","vehicle_model":"Avanza","demand_quantity":61,"repair_order_count":48},{"record_id":"REC-00160","month":"2024-04","part_id":"PRT-0026","vehicle_brand":"Toyota","vehicle_model":"Avanza","demand_quantity":61,"repair_order_count":32},{"record_id":"REC-00161","month":"2024-05","part_id":"PRT-0026","vehicle_brand":"Toyota","vehicle_model":"Avanza","demand_quantity":64,"repair_order_count":38},{"record_id":"REC-00162","month":"2024-06","part_id":"PRT-0026","vehicle_brand":"Toyota","vehicle_model":"Avanza","demand_quantity":83,"repair_order_count":52},{"record_id":"REC-00163","month":"2024-07","part_id":"PRT-0026","vehicle_brand":"Toyota","vehicle_model":"Avanza","demand_quantity":78,"repair_order_count":31},{"record_id":"REC-00164","month":"2024-08","part_id":"PRT-0026","vehicle_brand":"Toyota","vehicle_model":"Avanza","demand_quantity":75,"repair_order_count":34},{"record_id":"REC-00165","month":"2024-09","part_id":"PRT-0026","vehicle_brand":"Toyota","vehicle_model":"Avanza","demand_quantity":72,"repair_order_count":44},{"record_id":"REC-00166","month":"2024-10","part_id":"PRT-0026","vehicle_brand":"Toyota","vehicle_model":"Avanza","demand_quantity":74,"repair_order_count":37},{"record_id":"REC-00167","month":"2024-11","part_id":"PRT-0026","vehicle_brand":"Toyota","vehicle_model":"Avanza","demand_quantity":63,"repair_order_count":31},{"record_id":"REC-00168","month":"2024-12","part_id":"PRT-0026","vehicle_brand":"Toyota","vehicle_model":"Avanza","demand_quantity":82,"repair_order_count":34},{"record_id":"REC-00169","month":"2025-01","part_id":"PRT-0026","vehicle_brand":"Toyota","vehicle_model":"Avanza","demand_quantity":75,"repair_order_count":34},{"record_id":"REC-00170","month":"2025-02","part_id":"PRT-0026","vehicle_brand":"Toyota","vehicle_model":"Avanza","demand_quantity":80,"repair_order_count":56},{"record_id":"REC-00171","month":"2025-03","part_id":"PRT-0026","vehicle_brand":"Toyota","vehicle_model":"Avanza","demand_quantity":79,"repair_order_count":69},{"record_id":"REC-00172","month":"2025-04","part_id":"PRT-0026","vehicle_brand":"Toyota","vehicle_model":"Avanza","demand_quantity":67,"repair_order_count":61},{"record_id":"REC-00173","month":"2025-05","part_id":"PRT-0026","vehicle_brand":"Toyota","vehicle_model":"Avanza","demand_quantity":84,"repair_order_count":41},{"record_id":"REC-00174","month":"2025-06","part_id":"PRT-0026","vehicle_brand":"Toyota","vehicle_model":"Avanza","demand_quantity":74,"repair_order_count":62},{"record_id":"REC-00175","month":"2025-07","part_id":"PRT-0026","vehicle_brand":"Toyota","vehicle_model":"Avanza","demand_quantity":76,"repair_order_count":62},{"record_id":"REC-00176","month":"2025-08","part_id":"PRT-0026","vehicle_brand":"Toyota","vehicle_model":"Avanza","demand_quantity":85,"repair_order_count":43},{"record_id":"REC-00177","month":"2025-09","part_id":"PRT-0026","vehicle_brand":"Toyota","vehicle_model":"Avanza","demand_quantity":88,"repair_order_count":46},{"record_id":"REC-00178","month":"2025-10","part_id":"PRT-0026","vehicle_brand":"Toyota","vehicle_model":"Avanza","demand_quantity":89,"repair_order_count":41},{"record_id":"REC-00179","month":"2025-11","part_id":"PRT-0026","vehicle_brand":"Toyota","vehicle_model":"Avanza","demand_quantity":92,"repair_order_count":42},{"record_id":"REC-00180","month":"2025-12","part_id":"PRT-0026","vehicle_brand":"Toyota","vehicle_model":"Avanza","demand_quantity":106,"repair_order_count":43},{"record_id":"REC-00181","month":"2026-01","part_id":"PRT-0026","vehicle_brand":"Toyota","vehicle_model":"Avanza","demand_quantity":86,"repair_order_count":47},{"record_id":"REC-00182","month":"2026-02","part_id":"PRT-0026","vehicle_brand":"Toyota","vehicle_model":"Avanza","demand_quantity":106,"repair_order_count":57},{"record_id":"REC-00365","month":"2024-01","part_id":"PRT-0017","vehicle_brand":"Toyota","vehicle_model":"Avanza","demand_quantity":44,"repair_order_count":20},{"record_id":"REC-00366","month":"2024-02","part_id":"PRT-0017","vehicle_brand":"Toyota","vehicle_model":"Avanza","demand_quantity":26,"repair_order_count":19},{"record_id":"REC-00367","month":"2024-03","part_id":"PRT-0017","vehicle_brand":"Toyota","vehicle_model":"Avanza","demand_quantity":34,"repair_order_count":31},{"record_id":"REC-00368","month":"2024-04","part_id":"PRT-0017","vehicle_brand":"Toyota","vehicle_model":"Avanza","demand_quantity":31,"repair_order_count":28},{"record_id":"REC-00369","month":"2024-05","part_id":"PRT-0017","vehicle_brand":"Toyota","vehicle_model":"Avanza","demand_quantity":42,"repair_order_count":26},{"record_id":"REC-00370","month":"2024-06","part_id":"PRT-0017","vehicle_brand":"Toyota","vehicle_model":"Avanza","demand_quantity":48,"repair_order_count":30},{"record_id":"REC-00371","month":"2024-07","part_id":"PRT-0017","vehicle_brand":"Toyota","vehicle_model":"Avanza","demand_quantity":42,"repair_order_count":29},{"record_id":"REC-00372","month":"2024-08","part_id":"PRT-0017","vehicle_brand":"Toyota","vehicle_model":"Avanza","demand_quantity":44,"repair_order_count":24},{"record_id":"REC-00373","month":"2024-09","part_id":"PRT-0017","vehicle_brand":"Toyota","vehicle_model":"Avanza","demand_quantity":54,"repair_order_count":28},{"record_id":"REC-00374","month":"2024-10","part_id":"PRT-0017","vehicle_brand":"Toyota","vehicle_model":"Avanza","demand_quantity":50,"repair_order_count":22},{"record_id":"REC-00375","month":"2024-11","part_id":"PRT-0017","vehicle_brand":"Toyota","vehicle_model":"Avanza","demand_quantity":46,"repair_order_count":43},{"record_id":"REC-00376","month":"2024-12","part_id":"PRT-0017","vehicle_brand":"Toyota","vehicle_model":"Avanza","demand_quantity":37,"repair_order_count":15},{"record_id":"REC-00377","month":"2025-01","part_id":"PRT-0017","vehicle_brand":"Toyota","vehicle_model":"Avanza","demand_quantity":53,"repair_order_count":30},{"record_id":"REC-00378","month":"2025-02","part_id":"PRT-0017","vehicle_brand":"Toyota","vehicle_model":"Avanza","demand_quantity":43,"repair_order_count":17},{"record_id":"REC-00379","month":"2025-03","part_id":"PRT-0017","vehicle_brand":"Toyota","vehicle_model":"Avanza","demand_quantity":38,"repair_order_count":31},{"record_id":"REC-00380","month":"2025-04","part_id":"PRT-0017","vehicle_brand":"Toyota","vehicle_model":"Avanza","demand_quantity":47,"repair_order_count":25},{"record_id":"REC-00381","month":"2025-05","part_id":"PRT-0017","vehicle_brand":"Toyota","vehicle_model":"Avanza","demand_quantity":41,"repair_order_count":24},{"record_id":"REC-00382","month":"2025-06","part_id":"PRT-0017","vehicle_brand":"Toyota","vehicle_model":"Avanza","demand_quantity":51,"repair_order_count":25},{"record_id":"REC-00383","month":"2025-07","part_id":"PRT-0017","vehicle_brand":"Toyota","vehicle_model":"Avanza","demand_quantity":67,"repair_order_count":47},{"record_id":"REC-00384","month":"2025-08","part_id":"PRT-0017","vehicle_brand":"Toyota","vehicle_model":"Avanza","demand_quantity":53,"repair_order_count":41},{"record_id":"REC-00385","month":"2025-09","part_id":"PRT-0017","vehicle_brand":"Toyota","vehicle_model":"Avanza","demand_quantity":67,"repair_order_count":52},{"record_id":"REC-00386","month":"2025-10","part_id":"PRT-0017","vehicle_brand":"Toyota","vehicle_model":"Avanza","demand_quantity":55,"repair_order_count":52},{"record_id":"REC-00387","month":"2025-11","part_id":"PRT-0017","vehicle_brand":"Toyota","vehicle_model":"Avanza","demand_quantity":53,"repair_order_count":40},{"record_id":"REC-00388","month":"2025-12","part_id":"PRT-0017","vehicle_brand":"Toyota","vehicle_model":"Avanza","demand_quantity":65,"repair_order_count":56},{"record_id":"REC-00389","month":"2026-01","part_id":"PRT-0017","vehicle_brand":"Toyota","vehicle_model":"Avanza","demand_quantity":205,"repair_order_count":105},{"record_id":"REC-00390","month":"2026-02","part_id":"PRT-0017","vehicle_brand":"Toyota","vehicle_model":"Avanza","demand_quantity":55,"repair_order_count":32},{"record_id":"REC-00495","month":"2024-01","part_id":"PRT-0024","vehicle_brand":"Toyota","vehicle_model":"Avanza","demand_quantity":17,"repair_order_count":9},{"record_id":"REC-00496","month":"2024-02","part_id":"PRT-0024","vehicle_brand":"Toyota","vehicle_model":"Avanza","demand_quantity":11,"repair_order_count":6},{"record_id":"REC-00497","month":"2024-03","part_id":"PRT-0024","vehicle_brand":"Toyota","vehicle_model":"Avanza","demand_quantity":10,"repair_order_count":5},{"record_id":"REC-00498","month":"2024-04","part_id":"PRT-0024","vehicle_brand":"Toyota","vehicle_model":"Avanza","demand_quantity":2,"repair_order_count":1},{"record_id":"REC-00499","month":"2024-05","part_id":"PRT-0024","vehicle_brand":"Toyota","vehicle_model":"Avanza","demand_quantity":3,"repair_order_count":1},{"record_id":"REC-00500","month":"2024-06","part_id":"PRT-0024","vehicle_brand":"Toyota","vehicle_model":"Avanza","demand_quantity":39,"repair_order_count":31},{"record_id":"REC-00501","month":"2024-07","part_id":"PRT-0024","vehicle_brand":"Toyota","vehicle_model":"Avanza","demand_quantity":22,"repair_order_count":12},{"record_id":"REC-00502","month":"2024-08","part_id":"PRT-0024","vehicle_brand":"Toyota","vehicle_model":"Avanza","demand_quantity":32,"repair_order_count":25},{"record_id":"REC-00503","month":"2024-09","part_id":"PRT-0024","vehicle_brand":"Toyota","vehicle_model":"Avanza","demand_quantity":42,"repair_order_count":21},{"record_id":"REC-00504","month":"2024-10","part_id":"PRT-0024","vehicle_brand":"Toyota","vehicle_model":"Avanza","demand_quantity":45,"repair_order_count":19},{"record_id":"REC-00505","month":"2024-11","part_id":"PRT-0024","vehicle_brand":"Toyota","vehicle_model":"Avanza","demand_quantity":40,"repair_order_count":17},{"record_id":"REC-00506","month":"2024-12","part_id":"PRT-0024","vehicle_brand":"Toyota","vehicle_model":"Avanza","demand_quantity":35,"repair_order_count":15},{"record_id":"REC-00507","month":"2025-01","part_id":"PRT-0024","vehicle_brand":"Toyota","vehicle_model":"Avanza","demand_quantity":26,"repair_order_count":18},{"record_id":"REC-00508","month":"2025-02","part_id":"PRT-0024","vehicle_brand":"Toyota","vehicle_model":"Avanza","demand_quantity":18,"repair_order_count":7},{"record_id":"REC-00509","month":"2025-03","part_id":"PRT-0024","vehicle_brand":"Toyota","vehicle_model":"Avanza","demand_quantity":31,"repair_order_count":29},{"record_id":"REC-00510","month":"2025-04","part_id":"PRT-0024","vehicle_brand":"Toyota","vehicle_model":"Avanza","demand_quantity":12,"repair_order_count":8},{"record_id":"REC-00511","month":"2025-05","part_id":"PRT-0024","vehicle_brand":"Toyota","vehicle_model":"Avanza","demand_quantity":11,"repair_order_count":6},{"record_id":"REC-00512","month":"2025-06","part_id":"PRT-0024","vehicle_brand":"Toyota","vehicle_model":"Avanza","demand_quantity":49,"repair_order_count":26},{"record_id":"REC-00513","month":"2025-07","part_id":"PRT-0024","vehicle_brand":"Toyota","vehicle_model":"Avanza","demand_quantity":29,"repair_order_count":19},{"record_id":"REC-00514","month":"2025-08","part_id":"PRT-0024","vehicle_brand":"Toyota","vehicle_model":"Avanza","demand_quantity":39,"repair_order_count":18},{"record_id":"REC-00515","month":"2025-09","part_id":"PRT-0024","vehicle_brand":"Toyota","vehicle_model":"Avanza","demand_quantity":46,"repair_order_count":24},{"record_id":"REC-00516","month":"2025-10","part_id":"PRT-0024","vehicle_brand":"Toyota","vehicle_model":"Avanza","demand_quantity":51,"repair_order_count":39},{"record_id":"REC-00517","month":"2025-11","part_id":"PRT-0024","vehicle_brand":"Toyota","vehicle_model":"Avanza","demand_quantity":50,"repair_order_count":39},{"record_id":"REC-00518","month":"2025-12","part_id":"PRT-0024","vehicle_brand":"Toyota","vehicle_model":"Avanza","demand_quantity":44,"repair_order_count":23},{"record_id":"REC-00519","month":"2026-01","part_id":"PRT-0024","vehicle_brand":"Toyota","vehicle_model":"Avanza","demand_quantity":33,"repair_order_count":13},{"record_id":"REC-00520","month":"2026-02","part_id":"PRT-0024","vehicle_brand":"Toyota","vehicle_model":"Avanza","demand_quantity":27,"repair_order_count":14},{"record_id":"REC-00651","month":"2024-01","part_id":"PRT-0040","vehicle_brand":"Toyota","vehicle_model":"Innova Zenix","demand_quantity":68,"repair_order_count":33},{"record_id":"REC-00652","month":"2024-02","part_id":"PRT-0040","vehicle_brand":"Toyota","vehicle_model":"Innova Zenix","demand_quantity":71,"repair_order_count":45}],"repair_costs":[{"accident_id;part_sequence;brand;model;year;vehicle_part;damage_type;severity;damage_percentage;repair_action;spare_part_cost;labor_cost;painting_cost;additional_cost;estimated_total_cost;cost_min;cost_max;notes":"ACC-0001;1;Hyundai;Stargazer;2018;Front Door;Scratch;Severe;62;Repair + Repaint;0;460000;1045000;90000;1595000;1375000;1720000;Estimasi berdasarkan harga pasar bengkel umum"},{"accident_id;part_sequence;brand;model;year;vehicle_part;damage_type;severity;damage_percentage;repair_action;spare_part_cost;labor_cost;painting_cost;additional_cost;estimated_total_cost;cost_min;cost_max;notes":"ACC-0001;2;Hyundai;Stargazer;2018;Rear Door;Dent;Severe;75;Repair + Repaint;0;480000;1145000;55000;1680000;1560000;1980000;Biaya dapat bervariasi tergantung lokasi bengkel"},{"accident_id;part_sequence;brand;model;year;vehicle_part;damage_type;severity;damage_percentage;repair_action;spare_part_cost;labor_cost;painting_cost;additional_cost;estimated_total_cost;cost_min;cost_max;notes":"ACC-0002;1;Honda;Civic;2024;Front Bumper;Crack;Minor;13;Repair + Repaint;0;210000;600000;180000;990000;875000;1095000;Estimasi berdasarkan harga bengkel resmi"},{"accident_id;part_sequence;brand;model;year;vehicle_part;damage_type;severity;damage_percentage;repair_action;spare_part_cost;labor_cost;painting_cost;additional_cost;estimated_total_cost;cost_min;cost_max;notes":"ACC-0002;2;Honda;Civic;2024;Hood;Dent;Moderate;55;Repair + Repaint;0;320000;990000;140000;1450000;1285000;1700000;Asumsi menggunakan sparepart aftermarket"},{"accident_id;part_sequence;brand;model;year;vehicle_part;damage_type;severity;damage_percentage;repair_action;spare_part_cost;labor_cost;painting_cost;additional_cost;estimated_total_cost;cost_min;cost_max;notes":"ACC-0003;1;Toyota;Agya;2024;Front Bumper;Paint Damage;Moderate;34;Repaint;0;260000;640000;200000;1100000;950000;1185000;Asumsi menggunakan sparepart original"},{"accident_id;part_sequence;brand;model;year;vehicle_part;damage_type;severity;damage_percentage;repair_action;spare_part_cost;labor_cost;painting_cost;additional_cost;estimated_total_cost;cost_min;cost_max;notes":"ACC-0004;1;Toyota;Yaris;2023;Front Door;Missing Part;Severe;67;Replace + Repaint;3030000;535000;945000;220000;4730000;4185000;5135000;Asumsi menggunakan sparepart original"},{"accident_id;part_sequence;brand;model;year;vehicle_part;damage_type;severity;damage_percentage;repair_action;spare_part_cost;labor_cost;painting_cost;additional_cost;estimated_total_cost;cost_min;cost_max;notes":"ACC-0004;2;Toyota;Yaris;2023;Rear Door;Deformation;Moderate;57;Repair + Repaint;0;370000;1095000;115000;1580000;1425000;1755000;Asumsi menggunakan sparepart aftermarket"},{"accident_id;part_sequence;brand;model;year;vehicle_part;damage_type;severity;damage_percentage;repair_action;spare_part_cost;labor_cost;painting_cost;additional_cost;estimated_total_cost;cost_min;cost_max;notes":"ACC-0004;3;Toyota;Yaris;2023;Fender;Dent;Moderate;42;Repair + Repaint;0;240000;595000;290000;1125000;1025000;1340000;Asumsi menggunakan sparepart aftermarket"},{"accident_id;part_sequence;brand;model;year;vehicle_part;damage_type;severity;damage_percentage;repair_action;spare_part_cost;labor_cost;painting_cost;additional_cost;estimated_total_cost;cost_min;cost_max;notes":"ACC-0004;4;Toyota;Yaris;2023;Quarter Panel;Dent;Severe;78;Repair + Repaint;0;525000;1435000;70000;2030000;1755000;2185000;Biaya dapat bervariasi tergantung lokasi bengkel"},{"accident_id;part_sequence;brand;model;year;vehicle_part;damage_type;severity;damage_percentage;repair_action;spare_part_cost;labor_cost;painting_cost;additional_cost;estimated_total_cost;cost_min;cost_max;notes":"ACC-0004;5;Toyota;Yaris;2023;Side Mirror;Crack;Moderate;48;Replace + Repaint;550000;205000;360000;140000;1255000;1095000;1430000;Estimasi berdasarkan harga bengkel resmi"},{"accident_id;part_sequence;brand;model;year;vehicle_part;damage_type;severity;damage_percentage;repair_action;spare_part_cost;labor_cost;painting_cost;additional_cost;estimated_total_cost;cost_min;cost_max;notes":"ACC-0005;1;Mitsubishi;Pajero Sport;2022;Front Door;Broken;Severe;78;Replace + Repaint;4365000;650000;1180000;100000;6295000;5355000;7405000;Biaya dapat bervariasi tergantung lokasi bengkel"},{"accident_id;part_sequence;brand;model;year;vehicle_part;damage_type;severity;damage_percentage;repair_action;spare_part_cost;labor_cost;painting_cost;additional_cost;estimated_total_cost;cost_min;cost_max;notes":"ACC-0006;1;Hyundai;Santa Fe;2021;Front Door;Deformation;Severe;96;Replace + Repaint;4920000;595000;1155000;80000;6750000;6205000;7770000;Biaya dapat bervariasi tergantung lokasi bengkel"},{"accident_id;part_sequence;brand;model;year;vehicle_part;damage_type;severity;damage_percentage;repair_action;spare_part_cost;labor_cost;painting_cost;additional_cost;estimated_total_cost;cost_min;cost_max;notes":"ACC-0006;2;Hyundai;Santa Fe;2021;Rear Door;Crack;Moderate;54;Repair + Repaint;0;375000;935000;130000;1440000;1310000;1660000;Biaya dapat bervariasi tergantung lokasi bengkel"},{"accident_id;part_sequence;brand;model;year;vehicle_part;damage_type;severity;damage_percentage;repair_action;spare_part_cost;labor_cost;painting_cost;additional_cost;estimated_total_cost;cost_min;cost_max;notes":"ACC-0006;3;Hyundai;Santa Fe;2021;Fender;Broken;Severe;84;Replace + Repaint;1650000;360000;845000;240000;3095000;2770000;3620000;Estimasi berdasarkan harga bengkel resmi"},{"accident_id;part_sequence;brand;model;year;vehicle_part;damage_type;severity;damage_percentage;repair_action;spare_part_cost;labor_cost;painting_cost;additional_cost;estimated_total_cost;cost_min;cost_max;notes":"ACC-0007;1;Suzuki;Ertiga;2019;Front Bumper;Broken;Moderate;43;Replace + Repaint;950000;330000;685000;60000;2025000;1825000;2250000;Asumsi menggunakan sparepart original"},{"accident_id;part_sequence;brand;model;year;vehicle_part;damage_type;severity;damage_percentage;repair_action;spare_part_cost;labor_cost;painting_cost;additional_cost;estimated_total_cost;cost_min;cost_max;notes":"ACC-0007;2;Suzuki;Ertiga;2019;Hood;Paint Damage;Moderate;39;Repaint;0;355000;895000;155000;1405000;1280000;1545000;Biaya dapat bervariasi tergantung lokasi bengkel"},{"accident_id;part_sequence;brand;model;year;vehicle_part;damage_type;severity;damage_percentage;repair_action;spare_part_cost;labor_cost;painting_cost;additional_cost;estimated_total_cost;cost_min;cost_max;notes":"ACC-0008;1;Nissan;Livina;2019;Front Door;Dent;Minor;19;Repair;0;315000;0;280000;595000;545000;685000;Estimasi berdasarkan harga pasar bengkel umum"},{"accident_id;part_sequence;brand;model;year;vehicle_part;damage_type;severity;damage_percentage;repair_action;spare_part_cost;labor_cost;painting_cost;additional_cost;estimated_total_cost;cost_min;cost_max;notes":"ACC-0009;1;Hyundai;Santa Fe;2020;Front Door;Missing Part;Severe;71;Replace + Repaint;4260000;630000;1080000;250000;6220000;5735000;6915000;Biaya dapat bervariasi tergantung lokasi bengkel"},{"accident_id;part_sequence;brand;model;year;vehicle_part;damage_type;severity;damage_percentage;repair_action;spare_part_cost;labor_cost;painting_cost;additional_cost;estimated_total_cost;cost_min;cost_max;notes":"ACC-0009;2;Hyundai;Santa Fe;2020;Rear Door;Scratch;Minor;24;Repaint;0;330000;810000;255000;1395000;1280000;1495000;Asumsi menggunakan sparepart aftermarket"},{"accident_id;part_sequence;brand;model;year;vehicle_part;damage_type;severity;damage_percentage;repair_action;spare_part_cost;labor_cost;painting_cost;additional_cost;estimated_total_cost;cost_min;cost_max;notes":"ACC-0009;3;Hyundai;Santa Fe;2020;Fender;Broken;Moderate;31;Replace + Repaint;1625000;280000;550000;135000;2590000;2395000;2880000;Asumsi menggunakan sparepart aftermarket"},{"accident_id;part_sequence;brand;model;year;vehicle_part;damage_type;severity;damage_percentage;repair_action;spare_part_cost;labor_cost;painting_cost;additional_cost;estimated_total_cost;cost_min;cost_max;notes":"ACC-0009;4;Hyundai;Santa Fe;2020;Quarter Panel;Missing Part;Moderate;56;Replace + Repaint;5810000;605000;1300000;290000;8005000;6965000;9085000;Estimasi berdasarkan harga pasar bengkel umum"},{"accident_id;part_sequence;brand;model;year;vehicle_part;damage_type;severity;damage_percentage;repair_action;spare_part_cost;labor_cost;painting_cost;additional_cost;estimated_total_cost;cost_min;cost_max;notes":"ACC-0010;1;Honda;HR-V;2019;Front Bumper;Paint Damage;Minor;10;Repaint;0;205000;635000;175000;1015000;865000;1125000;Asumsi menggunakan sparepart aftermarket"},{"accident_id;part_sequence;brand;model;year;vehicle_part;damage_type;severity;damage_percentage;repair_action;spare_part_cost;labor_cost;painting_cost;additional_cost;estimated_total_cost;cost_min;cost_max;notes":"ACC-0010;2;Honda;HR-V;2019;Hood;Paint Damage;Severe;99;Repair + Repaint;0;420000;1175000;170000;1765000;1640000;1945000;Asumsi menggunakan sparepart original"},{"accident_id;part_sequence;brand;model;year;vehicle_part;damage_type;severity;damage_percentage;repair_action;spare_part_cost;labor_cost;painting_cost;additional_cost;estimated_total_cost;cost_min;cost_max;notes":"ACC-0011;1;Honda;HR-V;2021;Front Door;Scratch;Severe;76;Repair + Repaint;0;435000;1155000;140000;1730000;1560000;1995000;Estimasi berdasarkan harga bengkel resmi"},{"accident_id;part_sequence;brand;model;year;vehicle_part;damage_type;severity;damage_percentage;repair_action;spare_part_cost;labor_cost;painting_cost;additional_cost;estimated_total_cost;cost_min;cost_max;notes":"ACC-0011;2;Honda;HR-V;2021;Rear Door;Scratch;Moderate;41;Repair + Repaint;0;350000;985000;130000;1465000;1265000;1575000;Estimasi berdasarkan harga pasar bengkel umum"},{"accident_id;part_sequence;brand;model;year;vehicle_part;damage_type;severity;damage_percentage;repair_action;spare_part_cost;labor_cost;painting_cost;additional_cost;estimated_total_cost;cost_min;cost_max;notes":"ACC-0011;3;Honda;HR-V;2021;Fender;Paint Damage;Severe;96;Repair + Repaint;0;325000;745000;180000;1250000;1085000;1440000;Estimasi berdasarkan harga bengkel resmi"},{"accident_id;part_sequence;brand;model;year;vehicle_part;damage_type;severity;damage_percentage;repair_action;spare_part_cost;labor_cost;painting_cost;additional_cost;estimated_total_cost;cost_min;cost_max;notes":"ACC-0012;1;Suzuki;APV;2018;Front Bumper;Crack;Severe;92;Replace + Repaint;895000;510000;885000;135000;2425000;2085000;2885000;Estimasi berdasarkan harga bengkel resmi"},{"accident_id;part_sequence;brand;model;year;vehicle_part;damage_type;severity;damage_percentage;repair_action;spare_part_cost;labor_cost;painting_cost;additional_cost;estimated_total_cost;cost_min;cost_max;notes":"ACC-0013;1;Suzuki;APV;2025;Front Bumper;Crack;Moderate;44;Repair + Repaint;0;275000;820000;190000;1285000;1145000;1415000;Termasuk estimasi waktu pengerjaan standar"},{"accident_id;part_sequence;brand;model;year;vehicle_part;damage_type;severity;damage_percentage;repair_action;spare_part_cost;labor_cost;painting_cost;additional_cost;estimated_total_cost;cost_min;cost_max;notes":"ACC-0013;2;Suzuki;APV;2025;Hood;Scratch;Minor;26;Repaint;0;310000;970000;210000;1490000;1305000;1660000;Termasuk estimasi waktu pengerjaan standar"},{"accident_id;part_sequence;brand;model;year;vehicle_part;damage_type;severity;damage_percentage;repair_action;spare_part_cost;labor_cost;painting_cost;additional_cost;estimated_total_cost;cost_min;cost_max;notes":"ACC-0013;3;Suzuki;APV;2025;Headlight;Crack;Severe;64;Replace;1685000;330000;0;245000;2260000;2035000;2445000;Asumsi menggunakan sparepart original"},{"accident_id;part_sequence;brand;model;year;vehicle_part;damage_type;severity;damage_percentage;repair_action;spare_part_cost;labor_cost;painting_cost;additional_cost;estimated_total_cost;cost_min;cost_max;notes":"ACC-0013;4;Suzuki;APV;2025;Grille;Deformation;Minor;15;Repair;0;175000;0;200000;375000;320000;405000;Estimasi berdasarkan harga pasar bengkel umum"},{"accident_id;part_sequence;brand;model;year;vehicle_part;damage_type;severity;damage_percentage;repair_action;spare_part_cost;labor_cost;painting_cost;additional_cost;estimated_total_cost;cost_min;cost_max;notes":"ACC-0014;1;Honda;Mobilio;2021;Front Door;Broken;Minor;30;Replace;2350000;470000;0;225000;3045000;2745000;3345000;Biaya dapat bervariasi tergantung lokasi bengkel"},{"accident_id;part_sequence;brand;model;year;vehicle_part;damage_type;severity;damage_percentage;repair_action;spare_part_cost;labor_cost;painting_cost;additional_cost;estimated_total_cost;cost_min;cost_max;notes":"ACC-0014;2;Honda;Mobilio;2021;Rear Door;Scratch;Severe;64;Repair + Repaint;0;410000;990000;235000;1635000;1475000;1930000;Termasuk estimasi waktu pengerjaan standar"},{"accident_id;part_sequence;brand;model;year;vehicle_part;damage_type;severity;damage_percentage;repair_action;spare_part_cost;labor_cost;painting_cost;additional_cost;estimated_total_cost;cost_min;cost_max;notes":"ACC-0014;3;Honda;Mobilio;2021;Fender;Paint Damage;Severe;61;Repair + Repaint;0;270000;645000;140000;1055000;920000;1160000;Estimasi berdasarkan harga pasar bengkel umum"},{"accident_id;part_sequence;brand;model;year;vehicle_part;damage_type;severity;damage_percentage;repair_action;spare_part_cost;labor_cost;painting_cost;additional_cost;estimated_total_cost;cost_min;cost_max;notes":"ACC-0015;1;Nissan;Grand Livina;2020;Rear Bumper;Broken;Moderate;39;Replace;955000;360000;0;250000;1565000;1395000;1790000;Asumsi menggunakan sparepart original"},{"accident_id;part_sequence;brand;model;year;vehicle_part;damage_type;severity;damage_percentage;repair_action;spare_part_cost;labor_cost;painting_cost;additional_cost;estimated_total_cost;cost_min;cost_max;notes":"ACC-0015;2;Nissan;Grand Livina;2020;Trunk;Crack;Moderate;44;Replace + Repaint;1710000;455000;825000;55000;3045000;2745000;3330000;Termasuk estimasi waktu pengerjaan standar"},{"accident_id;part_sequence;brand;model;year;vehicle_part;damage_type;severity;damage_percentage;repair_action;spare_part_cost;labor_cost;painting_cost;additional_cost;estimated_total_cost;cost_min;cost_max;notes":"ACC-0015;3;Nissan;Grand Livina;2020;Taillight;Scratch;Severe;70;Replace;910000;325000;0;145000;1380000;1175000;1645000;Estimasi berdasarkan harga bengkel resmi"},{"accident_id;part_sequence;brand;model;year;vehicle_part;damage_type;severity;damage_percentage;repair_action;spare_part_cost;labor_cost;painting_cost;additional_cost;estimated_total_cost;cost_min;cost_max;notes":"ACC-0015;4;Nissan;Grand Livina;2020;Rear Glass;Missing Part;Moderate;37;Replace;1710000;335000;0;265000;2310000;2020000;2585000;Estimasi berdasarkan harga pasar bengkel umum"},{"accident_id;part_sequence;brand;model;year;vehicle_part;damage_type;severity;damage_percentage;repair_action;spare_part_cost;labor_cost;painting_cost;additional_cost;estimated_total_cost;cost_min;cost_max;notes":"ACC-0015;5;Nissan;Grand Livina;2020;Quarter Panel;Paint Damage;Severe;95;Repair + Repaint;0;555000;1290000;190000;2035000;1880000;2360000;Estimasi berdasarkan harga pasar bengkel umum"},{"accident_id;part_sequence;brand;model;year;vehicle_part;damage_type;severity;damage_percentage;repair_action;spare_part_cost;labor_cost;painting_cost;additional_cost;estimated_total_cost;cost_min;cost_max;notes":"ACC-0016;1;Hyundai;Santa Fe;2018;Front Bumper;Missing Part;Minor;10;Replace + Repaint;1705000;330000;565000;180000;2780000;2560000;3240000;Estimasi berdasarkan harga pasar bengkel umum"},{"accident_id;part_sequence;brand;model;year;vehicle_part;damage_type;severity;damage_percentage;repair_action;spare_part_cost;labor_cost;painting_cost;additional_cost;estimated_total_cost;cost_min;cost_max;notes":"ACC-0016;2;Hyundai;Santa Fe;2018;Hood;Deformation;Severe;76;Replace + Repaint;3485000;510000;1100000;250000;5345000;4890000;6320000;Asumsi menggunakan sparepart original"},{"accident_id;part_sequence;brand;model;year;vehicle_part;damage_type;severity;damage_percentage;repair_action;spare_part_cost;labor_cost;painting_cost;additional_cost;estimated_total_cost;cost_min;cost_max;notes":"ACC-0016;3;Hyundai;Santa Fe;2018;Headlight;Crack;Severe;97;Replace;2775000;385000;0;250000;3410000;3075000;3960000;Estimasi berdasarkan harga bengkel resmi"},{"accident_id;part_sequence;brand;model;year;vehicle_part;damage_type;severity;damage_percentage;repair_action;spare_part_cost;labor_cost;painting_cost;additional_cost;estimated_total_cost;cost_min;cost_max;notes":"ACC-0017;1;Suzuki;XL7;2018;Front Door;Deformation;Severe;81;Replace + Repaint;2830000;610000;1010000;195000;4645000;3960000;5250000;Estimasi berdasarkan harga bengkel resmi"},{"accident_id;part_sequence;brand;model;year;vehicle_part;damage_type;severity;damage_percentage;repair_action;spare_part_cost;labor_cost;painting_cost;additional_cost;estimated_total_cost;cost_min;cost_max;notes":"ACC-0017;2;Suzuki;XL7;2018;Rear Door;Crack;Moderate;43;Repair + Repaint;0;380000;940000;60000;1380000;1175000;1625000;Termasuk estimasi waktu pengerjaan standar"},{"accident_id;part_sequence;brand;model;year;vehicle_part;damage_type;severity;damage_percentage;repair_action;spare_part_cost;labor_cost;painting_cost;additional_cost;estimated_total_cost;cost_min;cost_max;notes":"ACC-0017;3;Suzuki;XL7;2018;Fender;Crack;Moderate;45;Repair + Repaint;0;235000;660000;240000;1135000;985000;1305000;Estimasi berdasarkan harga pasar bengkel umum"},{"accident_id;part_sequence;brand;model;year;vehicle_part;damage_type;severity;damage_percentage;repair_action;spare_part_cost;labor_cost;painting_cost;additional_cost;estimated_total_cost;cost_min;cost_max;notes":"ACC-0017;4;Suzuki;XL7;2018;Quarter Panel;Scratch;Minor;19;Repaint;0;355000;945000;185000;1485000;1340000;1730000;Biaya dapat bervariasi tergantung lokasi bengkel"},{"accident_id;part_sequence;brand;model;year;vehicle_part;damage_type;severity;damage_percentage;repair_action;spare_part_cost;labor_cost;painting_cost;additional_cost;estimated_total_cost;cost_min;cost_max;notes":"ACC-0018;1;Suzuki;Ignis;2019;Front Door;Dent;Moderate;45;Repair + Repaint;0;385000;1000000;120000;1505000;1330000;1625000;Biaya dapat bervariasi tergantung lokasi bengkel"},{"accident_id;part_sequence;brand;model;year;vehicle_part;damage_type;severity;damage_percentage;repair_action;spare_part_cost;labor_cost;painting_cost;additional_cost;estimated_total_cost;cost_min;cost_max;notes":"ACC-0018;2;Suzuki;Ignis;2019;Rear Door;Deformation;Minor;14;Repair;0;360000;0;260000;620000;560000;695000;Biaya dapat bervariasi tergantung lokasi bengkel"},{"accident_id;part_sequence;brand;model;year;vehicle_part;damage_type;severity;damage_percentage;repair_action;spare_part_cost;labor_cost;painting_cost;additional_cost;estimated_total_cost;cost_min;cost_max;notes":"ACC-0018;3;Suzuki;Ignis;2019;Fender;Missing Part;Minor;25;Replace + Repaint;760000;275000;590000;230000;1855000;1675000;2050000;Termasuk estimasi waktu pengerjaan standar"},{"accident_id;part_sequence;brand;model;year;vehicle_part;damage_type;severity;damage_percentage;repair_action;spare_part_cost;labor_cost;painting_cost;additional_cost;estimated_total_cost;cost_min;cost_max;notes":"ACC-0018;4;Suzuki;Ignis;2019;Quarter Panel;Missing Part;Severe;96;Replace + Repaint;2930000;765000;1450000;155000;5300000;4610000;5915000;Termasuk estimasi waktu pengerjaan standar"},{"accident_id;part_sequence;brand;model;year;vehicle_part;damage_type;severity;damage_percentage;repair_action;spare_part_cost;labor_cost;painting_cost;additional_cost;estimated_total_cost;cost_min;cost_max;notes":"ACC-0018;5;Suzuki;Ignis;2019;Side Mirror;Scratch;Severe;69;Repair + Repaint;0;175000;340000;60000;575000;490000;680000;Asumsi menggunakan sparepart aftermarket"},{"accident_id;part_sequence;brand;model;year;vehicle_part;damage_type;severity;damage_percentage;repair_action;spare_part_cost;labor_cost;painting_cost;additional_cost;estimated_total_cost;cost_min;cost_max;notes":"ACC-0019;1;Toyota;Agya;2020;Rear Bumper;Crack;Moderate;59;Replace + Repaint;670000;395000;825000;95000;1985000;1755000;2225000;Estimasi berdasarkan harga pasar bengkel umum"},{"accident_id;part_sequence;brand;model;year;vehicle_part;damage_type;severity;damage_percentage;repair_action;spare_part_cost;labor_cost;painting_cost;additional_cost;estimated_total_cost;cost_min;cost_max;notes":"ACC-0019;2;Toyota;Agya;2020;Trunk;Scratch;Severe;88;Repair + Repaint;0;430000;970000;145000;1545000;1390000;1755000;Asumsi menggunakan sparepart aftermarket"},{"accident_id;part_sequence;brand;model;year;vehicle_part;damage_type;severity;damage_percentage;repair_action;spare_part_cost;labor_cost;painting_cost;additional_cost;estimated_total_cost;cost_min;cost_max;notes":"ACC-0019;3;Toyota;Agya;2020;Taillight;Crack;Severe;61;Replace;725000;265000;0;70000;1060000;955000;1140000;Asumsi menggunakan sparepart aftermarket"},{"accident_id;part_sequence;brand;model;year;vehicle_part;damage_type;severity;damage_percentage;repair_action;spare_part_cost;labor_cost;painting_cost;additional_cost;estimated_total_cost;cost_min;cost_max;notes":"ACC-0020;1;Nissan;Grand Livina;2022;Front Bumper;Deformation;Severe;70;Replace + Repaint;940000;400000;905000;165000;2410000;2155000;2875000;Biaya dapat bervariasi tergantung lokasi bengkel"},{"accident_id;part_sequence;brand;model;year;vehicle_part;damage_type;severity;damage_percentage;repair_action;spare_part_cost;labor_cost;painting_cost;additional_cost;estimated_total_cost;cost_min;cost_max;notes":"ACC-0020;2;Nissan;Grand Livina;2022;Hood;Scratch;Moderate;57;Repair + Repaint;0;385000;1160000;100000;1645000;1405000;1780000;Asumsi menggunakan sparepart aftermarket"},{"accident_id;part_sequence;brand;model;year;vehicle_part;damage_type;severity;damage_percentage;repair_action;spare_part_cost;labor_cost;painting_cost;additional_cost;estimated_total_cost;cost_min;cost_max;notes":"ACC-0020;3;Nissan;Grand Livina;2022;Headlight;Broken;Minor;18;Replace;1385000;250000;0;70000;1705000;1495000;2010000;Estimasi berdasarkan harga bengkel resmi"},{"accident_id;part_sequence;brand;model;year;vehicle_part;damage_type;severity;damage_percentage;repair_action;spare_part_cost;labor_cost;painting_cost;additional_cost;estimated_total_cost;cost_min;cost_max;notes":"ACC-0021;1;Toyota;Yaris;2023;Front Bumper;Paint Damage;Severe;70;Repair + Repaint;0;300000;795000;225000;1320000;1190000;1565000;Estimasi berdasarkan harga bengkel resmi"},{"accident_id;part_sequence;brand;model;year;vehicle_part;damage_type;severity;damage_percentage;repair_action;spare_part_cost;labor_cost;painting_cost;additional_cost;estimated_total_cost;cost_min;cost_max;notes":"ACC-0022;1;Nissan;Grand Livina;2020;Rear Bumper;Missing Part;Severe;67;Replace + Repaint;825000;385000;915000;250000;2375000;2205000;2670000;Estimasi berdasarkan harga pasar bengkel umum"},{"accident_id;part_sequence;brand;model;year;vehicle_part;damage_type;severity;damage_percentage;repair_action;spare_part_cost;labor_cost;painting_cost;additional_cost;estimated_total_cost;cost_min;cost_max;notes":"ACC-0022;2;Nissan;Grand Livina;2020;Trunk;Missing Part;Moderate;46;Replace + Repaint;1970000;425000;975000;265000;3635000;3215000;4245000;Asumsi menggunakan sparepart original"},{"accident_id;part_sequence;brand;model;year;vehicle_part;damage_type;severity;damage_percentage;repair_action;spare_part_cost;labor_cost;painting_cost;additional_cost;estimated_total_cost;cost_min;cost_max;notes":"ACC-0022;3;Nissan;Grand Livina;2020;Taillight;Missing Part;Severe;80;Replace;740000;340000;0;175000;1255000;1150000;1395000;Estimasi berdasarkan harga bengkel resmi"},{"accident_id;part_sequence;brand;model;year;vehicle_part;damage_type;severity;damage_percentage;repair_action;spare_part_cost;labor_cost;painting_cost;additional_cost;estimated_total_cost;cost_min;cost_max;notes":"ACC-0023;1;Honda;Brio;2021;Rear Bumper;Deformation;Moderate;57;Repair + Repaint;0;270000;900000;75000;1245000;1090000;1485000;Biaya dapat bervariasi tergantung lokasi bengkel"},{"accident_id;part_sequence;brand;model;year;vehicle_part;damage_type;severity;damage_percentage;repair_action;spare_part_cost;labor_cost;painting_cost;additional_cost;estimated_total_cost;cost_min;cost_max;notes":"ACC-0023;2;Honda;Brio;2021;Trunk;Crack;Severe;62;Replace + Repaint;1690000;490000;950000;125000;3255000;2850000;3765000;Estimasi berdasarkan harga pasar bengkel umum"},{"accident_id;part_sequence;brand;model;year;vehicle_part;damage_type;severity;damage_percentage;repair_action;spare_part_cost;labor_cost;painting_cost;additional_cost;estimated_total_cost;cost_min;cost_max;notes":"ACC-0023;3;Honda;Brio;2021;Taillight;Missing Part;Severe;72;Replace;790000;315000;0;75000;1180000;1050000;1270000;Biaya dapat bervariasi tergantung lokasi bengkel"},{"accident_id;part_sequence;brand;model;year;vehicle_part;damage_type;severity;damage_percentage;repair_action;spare_part_cost;labor_cost;painting_cost;additional_cost;estimated_total_cost;cost_min;cost_max;notes":"ACC-0023;4;Honda;Brio;2021;Rear Glass;Missing Part;Moderate;32;Replace;1365000;320000;0;140000;1825000;1570000;1985000;Estimasi berdasarkan harga pasar bengkel umum"},{"accident_id;part_sequence;brand;model;year;vehicle_part;damage_type;severity;damage_percentage;repair_action;spare_part_cost;labor_cost;painting_cost;additional_cost;estimated_total_cost;cost_min;cost_max;notes":"ACC-0024;1;Suzuki;Ertiga;2023;Front Door;Crack;Severe;63;Replace + Repaint;2430000;500000;1075000;70000;4075000;3730000;4735000;Termasuk estimasi waktu pengerjaan standar"},{"accident_id;part_sequence;brand;model;year;vehicle_part;damage_type;severity;damage_percentage;repair_action;spare_part_cost;labor_cost;painting_cost;additional_cost;estimated_total_cost;cost_min;cost_max;notes":"ACC-0024;2;Suzuki;Ertiga;2023;Rear Door;Broken;Minor;5;Replace + Repaint;2225000;425000;700000;145000;3495000;3200000;4170000;Biaya dapat bervariasi tergantung lokasi bengkel"},{"accident_id;part_sequence;brand;model;year;vehicle_part;damage_type;severity;damage_percentage;repair_action;spare_part_cost;labor_cost;painting_cost;additional_cost;estimated_total_cost;cost_min;cost_max;notes":"ACC-0024;3;Suzuki;Ertiga;2023;Fender;Deformation;Severe;73;Replace + Repaint;1030000;350000;685000;245000;2310000;2065000;2600000;Asumsi menggunakan sparepart aftermarket"},{"accident_id;part_sequence;brand;model;year;vehicle_part;damage_type;severity;damage_percentage;repair_action;spare_part_cost;labor_cost;painting_cost;additional_cost;estimated_total_cost;cost_min;cost_max;notes":"ACC-0024;4;Suzuki;Ertiga;2023;Quarter Panel;Broken;Severe;65;Replace;2925000;630000;0;55000;3610000;3205000;3890000;Asumsi menggunakan sparepart aftermarket"},{"accident_id;part_sequence;brand;model;year;vehicle_part;damage_type;severity;damage_percentage;repair_action;spare_part_cost;labor_cost;painting_cost;additional_cost;estimated_total_cost;cost_min;cost_max;notes":"ACC-0025;1;Suzuki;Baleno;2019;Front Door;Paint Damage;Minor;9;Repaint;0;325000;790000;195000;1310000;1215000;1465000;Estimasi berdasarkan harga bengkel resmi"},{"accident_id;part_sequence;brand;model;year;vehicle_part;damage_type;severity;damage_percentage;repair_action;spare_part_cost;labor_cost;painting_cost;additional_cost;estimated_total_cost;cost_min;cost_max;notes":"ACC-0026;1;Mitsubishi;Pajero Sport;2020;Front Door;Missing Part;Severe;98;Replace;4540000;725000;0;55000;5320000;4935000;5720000;Asumsi menggunakan sparepart aftermarket"},{"accident_id;part_sequence;brand;model;year;vehicle_part;damage_type;severity;damage_percentage;repair_action;spare_part_cost;labor_cost;painting_cost;additional_cost;estimated_total_cost;cost_min;cost_max;notes":"ACC-0026;2;Mitsubishi;Pajero Sport;2020;Rear Door;Broken;Severe;89;Replace + Repaint;4510000;700000;1040000;190000;6440000;5975000;7330000;Estimasi berdasarkan harga bengkel resmi"},{"accident_id;part_sequence;brand;model;year;vehicle_part;damage_type;severity;damage_percentage;repair_action;spare_part_cost;labor_cost;painting_cost;additional_cost;estimated_total_cost;cost_min;cost_max;notes":"ACC-0027;1;Suzuki;Ertiga;2020;Front Door;Deformation;Severe;80;Replace + Repaint;2660000;625000;1140000;275000;4700000;4010000;5200000;Estimasi berdasarkan harga bengkel resmi"},{"accident_id;part_sequence;brand;model;year;vehicle_part;damage_type;severity;damage_percentage;repair_action;spare_part_cost;labor_cost;painting_cost;additional_cost;estimated_total_cost;cost_min;cost_max;notes":"ACC-0027;2;Suzuki;Ertiga;2020;Rear Door;Missing Part;Severe;73;Replace + Repaint;2710000;585000;1110000;120000;4525000;3915000;5115000;Estimasi berdasarkan harga pasar bengkel umum"},{"accident_id;part_sequence;brand;model;year;vehicle_part;damage_type;severity;damage_percentage;repair_action;spare_part_cost;labor_cost;painting_cost;additional_cost;estimated_total_cost;cost_min;cost_max;notes":"ACC-0027;3;Suzuki;Ertiga;2020;Fender;Dent;Moderate;46;Repair + Repaint;0;255000;595000;295000;1145000;1065000;1330000;Biaya dapat bervariasi tergantung lokasi bengkel"}]};

const PARTS_MASTER = SAVERA_DB.parts.map(p => ({ ...p }));
const PART_BY_ID = new Map(PARTS_MASTER.map(p => [p.part_id, p]));
const SUPPLIERS_DB = SAVERA_DB.suppliers;
const SUPPLIER_BY_ID = new Map(SUPPLIERS_DB.map(s => [s.supplier_id, s]));
const PAINT_MATERIALS_DB = SAVERA_DB.paint_materials;
const MATERIAL_USAGE_DB = SAVERA_DB.material_usage;
const DEMAND_HISTORY_DB = SAVERA_DB.vehicle_demand_history;

// Mutable ledgers — Stock In / Stock Out / Receive Purchase / Create PO
// all push onto these at runtime, so the demo behaves like a live system.
let INV_TX = SAVERA_DB.inventory_transactions.map(t => ({ ...t }));
let PURCHASE_ORDERS = SAVERA_DB.purchase_orders.map(p => ({ ...p }));
let REPAIR_ORDERS_JSON = SAVERA_DB.repair_orders.map(r => ({ ...r }));

let txSeq = INV_TX.length;
let poSeq = PURCHASE_ORDERS.length;
function nextTxId() { txSeq++; return "TRX-" + String(txSeq).padStart(6, "0"); }
function nextPoId() { poSeq++; return "PO-" + String(poSeq).padStart(5, "0"); }
function todayISO() { return new Date().toISOString().slice(0, 10); }
function addDaysISO(iso, days) { const d = new Date(iso); d.setDate(d.getDate() + (days || 0)); return d.toISOString().slice(0, 10); }

// Current Stock = STOCK_IN - STOCK_OUT + ADJUSTMENT (+ RETURN, treated
// like a stock-in) computed live from the transaction ledger.
function computeCurrentStock(partId) {
  let stock = 0;
  INV_TX.forEach(t => {
    if (t.part_id !== partId) return;
    stock += t.transaction_type === "OUT" ? -t.quantity : t.quantity;
  });
  return stock;
}
function buildInventory() {
  return PARTS_MASTER.map(p => {
    const currentStock = computeCurrentStock(p.part_id);
    const totalDemand = INV_TX.filter(t => t.part_id === p.part_id && t.transaction_type === "OUT").reduce((s, t) => s + t.quantity, 0);
    const reorderQty = Math.max(0, p.reorder_point - currentStock);
    let status = "Healthy";
    if (currentStock <= p.reorder_point) status = "Critical";
    else if (currentStock <= p.reorder_point * 1.5) status = "Low";
    const supplier = SUPPLIER_BY_ID.get(p.supplier_id);
    return {
      partId: p.part_id, part: p.part_name, category: p.category,
      brand: p.vehicle_brand, model: p.vehicle_model, unit: p.unit,
      currentStock, reorderPoint: p.reorder_point, minimumStock: p.minimum_stock,
      totalDemand, unitCost: p.unit_cost, leadTimeDays: p.lead_time_days,
      supplierId: p.supplier_id, supplierName: supplier ? supplier.supplier_name : "—",
      reorderQty, status,
    };
  });
}
let INVENTORY = buildInventory();
function refreshInventory() { INVENTORY = buildInventory(); }

/* ---- Cross-module actions: Stock In / Stock Out / PO lifecycle ---- */
function quickCreatePO(partId, qty) {
  const part = PART_BY_ID.get(partId);
  if (!part || !qty || qty <= 0) return;
  const po = {
    po_id: nextPoId(), po_date: todayISO(), supplier_id: part.supplier_id, part_id: partId,
    quantity_ordered: qty, unit_cost: part.unit_cost, total_cost: qty * part.unit_cost,
    expected_delivery_date: addDaysISO(todayISO(), part.lead_time_days), actual_delivery_date: null, status: "Pending",
  };
  PURCHASE_ORDERS.unshift(po);
  toast("Purchase Order " + po.po_id + " created for " + part.part_name + ".");
  renderContent();
}
function receivePurchase(poId) {
  const po = PURCHASE_ORDERS.find(p => p.po_id === poId);
  if (!po || po.status === "Received" || po.status === "Cancelled") return;
  INV_TX.push({ transaction_id: nextTxId(), transaction_date: todayISO(), part_id: po.part_id, transaction_type: "IN", quantity: po.quantity_ordered, unit_cost: po.unit_cost, reference_id: po.po_id });
  po.status = "Received";
  po.actual_delivery_date = todayISO();
  refreshInventory();
  toast("Purchase " + po.po_id + " received — stock updated.");
  renderContent();
}
function fulfillRepairOrder(roId) {
  const ro = REPAIR_ORDERS_JSON.find(r => r.repair_order_id === roId);
  if (!ro) return;
  const part = PART_BY_ID.get(ro.part_id);
  const avail = computeCurrentStock(ro.part_id);
  if (avail < ro.quantity_required) {
    toast("Insufficient stock for " + (part ? part.part_name : ro.part_id) + ".");
    return;
  }
  INV_TX.push({ transaction_id: nextTxId(), transaction_date: todayISO(), part_id: ro.part_id, transaction_type: "OUT", quantity: ro.quantity_required, unit_cost: part ? part.unit_cost : 0, reference_id: ro.repair_order_id });
  if (ro.status !== "Completed") ro.status = "In Repair";
  refreshInventory();
  toast("Stock Out recorded for " + ro.repair_order_id + ".");
  renderContent();
}

/* =====================================================================
   Repair-cost pricing dataset (biaya_perbaikan_kendaraan.csv).
   Every cost figure below (spare part, labor, painting, additional,
   total, min, max) is a real value from that CSV. Matching against a
   detected damage item is done by the priority rules documented on
   matchPricing() below -- no price is ever invented; when nothing
   matches, the UI shows "Pricing data unavailable" instead of a
   guessed number.
===================================================================== */
const PRICING_COLS = ["brand","model","year","vehiclePart","damageType","severity",
  "damagePct","repairAction","sparePartCost","laborCost","paintingCost","additionalCost",
  "estimatedTotalCost","costMin","costMax"];
const PRICING_RAW = [
["Hyundai","Stargazer",2018,"Front Door","Scratch","Severe",62,"Repair + Repaint",0,460000,1045000,90000,1595000,1375000,1720000],
["Hyundai","Stargazer",2018,"Rear Door","Dent","Severe",75,"Repair + Repaint",0,480000,1145000,55000,1680000,1560000,1980000],
["Honda","Civic",2024,"Front Bumper","Crack","Minor",13,"Repair + Repaint",0,210000,600000,180000,990000,875000,1095000],
["Honda","Civic",2024,"Hood","Dent","Moderate",55,"Repair + Repaint",0,320000,990000,140000,1450000,1285000,1700000],
["Toyota","Agya",2024,"Front Bumper","Paint Damage","Moderate",34,"Repaint",0,260000,640000,200000,1100000,950000,1185000],
["Toyota","Yaris",2023,"Front Door","Missing Part","Severe",67,"Replace + Repaint",3030000,535000,945000,220000,4730000,4185000,5135000],
["Toyota","Yaris",2023,"Rear Door","Deformation","Moderate",57,"Repair + Repaint",0,370000,1095000,115000,1580000,1425000,1755000],
["Toyota","Yaris",2023,"Fender","Dent","Moderate",42,"Repair + Repaint",0,240000,595000,290000,1125000,1025000,1340000],
["Toyota","Yaris",2023,"Quarter Panel","Dent","Severe",78,"Repair + Repaint",0,525000,1435000,70000,2030000,1755000,2185000],
["Toyota","Yaris",2023,"Side Mirror","Crack","Moderate",48,"Replace + Repaint",550000,205000,360000,140000,1255000,1095000,1430000],
["Mitsubishi","Pajero Sport",2022,"Front Door","Broken","Severe",78,"Replace + Repaint",4365000,650000,1180000,100000,6295000,5355000,7405000],
["Hyundai","Santa Fe",2021,"Front Door","Deformation","Severe",96,"Replace + Repaint",4920000,595000,1155000,80000,6750000,6205000,7770000],
["Hyundai","Santa Fe",2021,"Rear Door","Crack","Moderate",54,"Repair + Repaint",0,375000,935000,130000,1440000,1310000,1660000],
["Hyundai","Santa Fe",2021,"Fender","Broken","Severe",84,"Replace + Repaint",1650000,360000,845000,240000,3095000,2770000,3620000],
["Suzuki","Ertiga",2019,"Front Bumper","Broken","Moderate",43,"Replace + Repaint",950000,330000,685000,60000,2025000,1825000,2250000],
["Suzuki","Ertiga",2019,"Hood","Paint Damage","Moderate",39,"Repaint",0,355000,895000,155000,1405000,1280000,1545000],
["Nissan","Livina",2019,"Front Door","Dent","Minor",19,"Repair",0,315000,0,280000,595000,545000,685000],
["Hyundai","Santa Fe",2020,"Front Door","Missing Part","Severe",71,"Replace + Repaint",4260000,630000,1080000,250000,6220000,5735000,6915000],
["Hyundai","Santa Fe",2020,"Rear Door","Scratch","Minor",24,"Repaint",0,330000,810000,255000,1395000,1280000,1495000],
["Hyundai","Santa Fe",2020,"Fender","Broken","Moderate",31,"Replace + Repaint",1625000,280000,550000,135000,2590000,2395000,2880000],
["Hyundai","Santa Fe",2020,"Quarter Panel","Missing Part","Moderate",56,"Replace + Repaint",5810000,605000,1300000,290000,8005000,6965000,9085000],
["Honda","HR-V",2019,"Front Bumper","Paint Damage","Minor",10,"Repaint",0,205000,635000,175000,1015000,865000,1125000],
["Honda","HR-V",2019,"Hood","Paint Damage","Severe",99,"Repair + Repaint",0,420000,1175000,170000,1765000,1640000,1945000],
["Honda","HR-V",2021,"Front Door","Scratch","Severe",76,"Repair + Repaint",0,435000,1155000,140000,1730000,1560000,1995000],
["Honda","HR-V",2021,"Rear Door","Scratch","Moderate",41,"Repair + Repaint",0,350000,985000,130000,1465000,1265000,1575000],
["Honda","HR-V",2021,"Fender","Paint Damage","Severe",96,"Repair + Repaint",0,325000,745000,180000,1250000,1085000,1440000],
["Suzuki","APV",2018,"Front Bumper","Crack","Severe",92,"Replace + Repaint",895000,510000,885000,135000,2425000,2085000,2885000],
["Suzuki","APV",2025,"Front Bumper","Crack","Moderate",44,"Repair + Repaint",0,275000,820000,190000,1285000,1145000,1415000],
["Suzuki","APV",2025,"Hood","Scratch","Minor",26,"Repaint",0,310000,970000,210000,1490000,1305000,1660000],
["Suzuki","APV",2025,"Headlight","Crack","Severe",64,"Replace",1685000,330000,0,245000,2260000,2035000,2445000],
["Suzuki","APV",2025,"Grille","Deformation","Minor",15,"Repair",0,175000,0,200000,375000,320000,405000],
["Honda","Mobilio",2021,"Front Door","Broken","Minor",30,"Replace",2350000,470000,0,225000,3045000,2745000,3345000],
["Honda","Mobilio",2021,"Rear Door","Scratch","Severe",64,"Repair + Repaint",0,410000,990000,235000,1635000,1475000,1930000],
["Honda","Mobilio",2021,"Fender","Paint Damage","Severe",61,"Repair + Repaint",0,270000,645000,140000,1055000,920000,1160000],
["Nissan","Grand Livina",2020,"Rear Bumper","Broken","Moderate",39,"Replace",955000,360000,0,250000,1565000,1395000,1790000],
["Nissan","Grand Livina",2020,"Trunk","Crack","Moderate",44,"Replace + Repaint",1710000,455000,825000,55000,3045000,2745000,3330000],
["Nissan","Grand Livina",2020,"Taillight","Scratch","Severe",70,"Replace",910000,325000,0,145000,1380000,1175000,1645000],
["Nissan","Grand Livina",2020,"Rear Glass","Missing Part","Moderate",37,"Replace",1710000,335000,0,265000,2310000,2020000,2585000],
["Nissan","Grand Livina",2020,"Quarter Panel","Paint Damage","Severe",95,"Repair + Repaint",0,555000,1290000,190000,2035000,1880000,2360000],
["Hyundai","Santa Fe",2018,"Front Bumper","Missing Part","Minor",10,"Replace + Repaint",1705000,330000,565000,180000,2780000,2560000,3240000],
["Hyundai","Santa Fe",2018,"Hood","Deformation","Severe",76,"Replace + Repaint",3485000,510000,1100000,250000,5345000,4890000,6320000],
["Hyundai","Santa Fe",2018,"Headlight","Crack","Severe",97,"Replace",2775000,385000,0,250000,3410000,3075000,3960000],
["Suzuki","XL7",2018,"Front Door","Deformation","Severe",81,"Replace + Repaint",2830000,610000,1010000,195000,4645000,3960000,5250000],
["Suzuki","XL7",2018,"Rear Door","Crack","Moderate",43,"Repair + Repaint",0,380000,940000,60000,1380000,1175000,1625000],
["Suzuki","XL7",2018,"Fender","Crack","Moderate",45,"Repair + Repaint",0,235000,660000,240000,1135000,985000,1305000],
["Suzuki","XL7",2018,"Quarter Panel","Scratch","Minor",19,"Repaint",0,355000,945000,185000,1485000,1340000,1730000],
["Suzuki","Ignis",2019,"Front Door","Dent","Moderate",45,"Repair + Repaint",0,385000,1000000,120000,1505000,1330000,1625000],
["Suzuki","Ignis",2019,"Rear Door","Deformation","Minor",14,"Repair",0,360000,0,260000,620000,560000,695000],
["Suzuki","Ignis",2019,"Fender","Missing Part","Minor",25,"Replace + Repaint",760000,275000,590000,230000,1855000,1675000,2050000],
["Suzuki","Ignis",2019,"Quarter Panel","Missing Part","Severe",96,"Replace + Repaint",2930000,765000,1450000,155000,5300000,4610000,5915000],
["Suzuki","Ignis",2019,"Side Mirror","Scratch","Severe",69,"Repair + Repaint",0,175000,340000,60000,575000,490000,680000],
["Toyota","Agya",2020,"Rear Bumper","Crack","Moderate",59,"Replace + Repaint",670000,395000,825000,95000,1985000,1755000,2225000],
["Toyota","Agya",2020,"Trunk","Scratch","Severe",88,"Repair + Repaint",0,430000,970000,145000,1545000,1390000,1755000],
["Toyota","Agya",2020,"Taillight","Crack","Severe",61,"Replace",725000,265000,0,70000,1060000,955000,1140000],
["Nissan","Grand Livina",2022,"Front Bumper","Deformation","Severe",70,"Replace + Repaint",940000,400000,905000,165000,2410000,2155000,2875000],
["Nissan","Grand Livina",2022,"Hood","Scratch","Moderate",57,"Repair + Repaint",0,385000,1160000,100000,1645000,1405000,1780000],
["Nissan","Grand Livina",2022,"Headlight","Broken","Minor",18,"Replace",1385000,250000,0,70000,1705000,1495000,2010000],
["Toyota","Yaris",2023,"Front Bumper","Paint Damage","Severe",70,"Repair + Repaint",0,300000,795000,225000,1320000,1190000,1565000],
["Nissan","Grand Livina",2020,"Rear Bumper","Missing Part","Severe",67,"Replace + Repaint",825000,385000,915000,250000,2375000,2205000,2670000],
["Nissan","Grand Livina",2020,"Trunk","Missing Part","Moderate",46,"Replace + Repaint",1970000,425000,975000,265000,3635000,3215000,4245000],
["Nissan","Grand Livina",2020,"Taillight","Missing Part","Severe",80,"Replace",740000,340000,0,175000,1255000,1150000,1395000],
["Honda","Brio",2021,"Rear Bumper","Deformation","Moderate",57,"Repair + Repaint",0,270000,900000,75000,1245000,1090000,1485000],
["Honda","Brio",2021,"Trunk","Crack","Severe",62,"Replace + Repaint",1690000,490000,950000,125000,3255000,2850000,3765000],
["Honda","Brio",2021,"Taillight","Missing Part","Severe",72,"Replace",790000,315000,0,75000,1180000,1050000,1270000],
["Honda","Brio",2021,"Rear Glass","Missing Part","Moderate",32,"Replace",1365000,320000,0,140000,1825000,1570000,1985000],
["Suzuki","Ertiga",2023,"Front Door","Crack","Severe",63,"Replace + Repaint",2430000,500000,1075000,70000,4075000,3730000,4735000],
["Suzuki","Ertiga",2023,"Rear Door","Broken","Minor",5,"Replace + Repaint",2225000,425000,700000,145000,3495000,3200000,4170000],
["Suzuki","Ertiga",2023,"Fender","Deformation","Severe",73,"Replace + Repaint",1030000,350000,685000,245000,2310000,2065000,2600000],
["Suzuki","Ertiga",2023,"Quarter Panel","Broken","Severe",65,"Replace",2925000,630000,0,55000,3610000,3205000,3890000],
["Suzuki","Baleno",2019,"Front Door","Paint Damage","Minor",9,"Repaint",0,325000,790000,195000,1310000,1215000,1465000],
["Mitsubishi","Pajero Sport",2020,"Front Door","Missing Part","Severe",98,"Replace",4540000,725000,0,55000,5320000,4935000,5720000],
["Mitsubishi","Pajero Sport",2020,"Rear Door","Broken","Severe",89,"Replace + Repaint",4510000,700000,1040000,190000,6440000,5975000,7330000],
["Suzuki","Ertiga",2020,"Front Door","Deformation","Severe",80,"Replace + Repaint",2660000,625000,1140000,275000,4700000,4010000,5200000],
["Suzuki","Ertiga",2020,"Rear Door","Missing Part","Severe",73,"Replace + Repaint",2710000,585000,1110000,120000,4525000,3915000,5115000],
["Suzuki","Ertiga",2020,"Fender","Dent","Moderate",46,"Repair + Repaint",0,255000,595000,295000,1145000,1065000,1330000],
["Nissan","Livina",2025,"Rear Bumper","Missing Part","Moderate",58,"Replace",890000,385000,0,90000,1365000,1260000,1605000],
["Nissan","Livina",2025,"Trunk","Missing Part","Severe",88,"Replace + Repaint",1850000,530000,1065000,285000,3730000,3430000,4015000],
["Nissan","Livina",2025,"Taillight","Scratch","Minor",6,"Repair",0,145000,0,255000,400000,370000,435000],
["Honda","CR-V",2019,"Rear Bumper","Missing Part","Moderate",60,"Replace + Repaint",1650000,425000,900000,165000,3140000,2775000,3470000],
["Honda","CR-V",2019,"Trunk","Deformation","Minor",20,"Repair",0,315000,0,255000,570000,530000,685000],
["Honda","CR-V",2019,"Taillight","Missing Part","Moderate",55,"Replace",1485000,305000,0,260000,2050000,1785000,2315000],
["Nissan","Magnite",2025,"Front Door","Crack","Severe",95,"Replace + Repaint",2890000,590000,1245000,205000,4930000,4330000,5350000],
["Honda","Mobilio",2021,"Rear Bumper","Broken","Moderate",32,"Replace + Repaint",930000,335000,775000,190000,2230000,1995000,2640000],
["Honda","Mobilio",2021,"Trunk","Broken","Moderate",59,"Replace",1680000,425000,0,240000,2345000,2110000,2725000],
["Honda","Mobilio",2021,"Taillight","Crack","Minor",29,"Replace",745000,215000,0,140000,1100000,985000,1235000],
["Mitsubishi","Pajero Sport",2018,"Rear Bumper","Crack","Severe",88,"Replace + Repaint",1595000,465000,1020000,150000,3230000,2905000,3820000],
["Mitsubishi","Pajero Sport",2018,"Trunk","Scratch","Severe",85,"Repair + Repaint",0,390000,1185000,175000,1750000,1525000,1975000],
["Hyundai","Palisade",2020,"Rear Bumper","Dent","Moderate",58,"Repair + Repaint",0,290000,850000,110000,1250000,1070000,1360000],
["Hyundai","Palisade",2020,"Trunk","Dent","Minor",6,"Repair",0,245000,0,85000,330000,295000,360000],
["Hyundai","Palisade",2020,"Taillight","Scratch","Moderate",41,"Repair",0,215000,0,170000,385000,350000,420000],
["Hyundai","Palisade",2020,"Rear Glass","Scratch","Minor",15,"Repair",0,185000,0,90000,275000,240000,300000],
["Hyundai","Palisade",2020,"Quarter Panel","Missing Part","Minor",17,"Replace + Repaint",5580000,490000,860000,140000,7070000,6295000,8200000],
["Daihatsu","Ayla",2025,"Front Bumper","Dent","Severe",62,"Repair + Repaint",0,300000,755000,270000,1325000,1225000,1430000],
["Honda","BR-V",2019,"Front Door","Missing Part","Severe",71,"Replace",3260000,555000,0,100000,3915000,3445000,4435000],
["Honda","BR-V",2019,"Rear Door","Paint Damage","Moderate",31,"Repaint",0,355000,850000,235000,1440000,1230000,1590000],
["Suzuki","Ertiga",2024,"Front Door","Missing Part","Severe",99,"Replace",2700000,645000,0,75000,3420000,3030000,3895000],
["Suzuki","Ertiga",2024,"Rear Door","Missing Part","Minor",6,"Replace + Repaint",2335000,375000,645000,130000,3485000,3020000,3875000],
["Suzuki","Ertiga",2024,"Fender","Deformation","Minor",16,"Repair",0,215000,0,200000,415000,375000,485000],
["Suzuki","Baleno",2018,"Rear Bumper","Deformation","Minor",21,"Repair",0,250000,0,195000,445000,405000,500000],
["Suzuki","Baleno",2018,"Trunk","Crack","Minor",24,"Repair + Repaint",0,290000,750000,210000,1250000,1120000,1395000],
["Nissan","Kicks",2025,"Rear Bumper","Missing Part","Severe",90,"Replace + Repaint",1060000,400000,880000,110000,2450000,2115000,2680000],
["Nissan","Kicks",2025,"Trunk","Broken","Moderate",41,"Replace + Repaint",2205000,440000,770000,180000,3595000,3175000,4305000],
["Nissan","Kicks",2025,"Taillight","Broken","Minor",20,"Replace",1040000,235000,0,265000,1540000,1410000,1700000],
["Nissan","Kicks",2025,"Rear Glass","Missing Part","Minor",30,"Replace",2080000,305000,0,190000,2575000,2305000,2850000],
["Nissan","Kicks",2025,"Quarter Panel","Crack","Severe",78,"Replace + Repaint",3690000,635000,1275000,175000,5775000,5020000,6265000],
["Hyundai","Santa Fe",2018,"Front Door","Deformation","Moderate",46,"Repair + Repaint",0,410000,860000,170000,1440000,1285000,1550000],
["Hyundai","Santa Fe",2018,"Rear Door","Deformation","Moderate",46,"Repair + Repaint",0,375000,840000,295000,1510000,1320000,1775000],
["Hyundai","Santa Fe",2018,"Fender","Missing Part","Minor",5,"Replace + Repaint",1735000,265000,520000,170000,2690000,2375000,3000000],
["Mitsubishi","Xpander",2022,"Front Door","Crack","Severe",90,"Replace + Repaint",3280000,580000,1235000,285000,5380000,4650000,5805000],
["Mitsubishi","Xpander",2022,"Rear Door","Crack","Severe",77,"Replace + Repaint",2760000,630000,1005000,250000,4645000,4025000,5070000],
["Mitsubishi","Xpander",2022,"Fender","Scratch","Minor",28,"Repaint",0,235000,620000,180000,1035000,910000,1225000],
["Mitsubishi","Xpander",2022,"Quarter Panel","Crack","Moderate",34,"Replace + Repaint",3810000,530000,1000000,165000,5505000,4810000,6425000],
["Mitsubishi","Xpander",2022,"Side Mirror","Crack","Moderate",37,"Repair + Repaint",0,150000,345000,145000,640000,570000,760000],
["Daihatsu","Terios",2022,"Front Bumper","Deformation","Minor",22,"Repair",0,260000,0,205000,465000,410000,505000],
["Daihatsu","Terios",2022,"Hood","Crack","Severe",63,"Replace + Repaint",2375000,475000,1190000,245000,4285000,3695000,4760000],
["Daihatsu","Terios",2022,"Headlight","Missing Part","Minor",27,"Replace",2035000,235000,0,190000,2460000,2240000,2915000],
["Hyundai","Palisade",2019,"Front Bumper","Crack","Severe",91,"Replace + Repaint",1670000,495000,880000,150000,3195000,2920000,3480000],
["Hyundai","Palisade",2019,"Hood","Missing Part","Minor",7,"Replace + Repaint",3890000,365000,805000,225000,5285000,4720000,5830000],
["Suzuki","Ignis",2020,"Front Bumper","Missing Part","Minor",21,"Replace + Repaint",915000,320000,650000,165000,2050000,1900000,2235000],
["Suzuki","Ignis",2020,"Hood","Crack","Moderate",58,"Repair + Repaint",0,360000,1090000,55000,1505000,1385000,1795000],
["Daihatsu","Terios",2018,"Front Door","Dent","Severe",96,"Repair + Repaint",0,560000,1260000,90000,1910000,1710000,2195000],
["Daihatsu","Terios",2018,"Rear Door","Scratch","Moderate",44,"Repair + Repaint",0,415000,1025000,280000,1720000,1525000,1865000],
["Daihatsu","Terios",2018,"Fender","Deformation","Severe",99,"Replace + Repaint",1250000,395000,945000,265000,2855000,2545000,3275000],
["Daihatsu","Ayla",2021,"Rear Bumper","Broken","Minor",8,"Replace + Repaint",670000,305000,535000,135000,1645000,1450000,1875000],
["Daihatsu","Ayla",2021,"Trunk","Dent","Severe",78,"Repair + Repaint",0,385000,1000000,235000,1620000,1435000,1780000],
["Toyota","Avanza",2022,"Front Door","Broken","Minor",7,"Replace + Repaint",2360000,395000,720000,280000,3755000,3300000,4300000],
["Toyota","Avanza",2022,"Rear Door","Deformation","Severe",81,"Replace + Repaint",2080000,620000,1030000,290000,4020000,3465000,4520000],
["Daihatsu","Ayla",2019,"Front Bumper","Paint Damage","Severe",89,"Repair + Repaint",0,355000,980000,65000,1400000,1275000,1535000],
["Honda","HR-V",2024,"Front Door","Missing Part","Minor",10,"Replace + Repaint",3200000,360000,745000,190000,4495000,3845000,5265000],
["Honda","HR-V",2024,"Rear Door","Broken","Moderate",40,"Replace + Repaint",3200000,470000,885000,190000,4745000,4090000,5190000],
["Honda","HR-V",2024,"Fender","Missing Part","Severe",96,"Replace + Repaint",1380000,385000,800000,210000,2775000,2450000,2980000],
["Honda","HR-V",2024,"Quarter Panel","Crack","Minor",13,"Repair + Repaint",0,370000,935000,55000,1360000,1180000,1495000],
["Toyota","Innova",2018,"Front Door","Deformation","Minor",19,"Repair",0,315000,0,250000,565000,490000,650000],
["Toyota","Innova",2018,"Rear Door","Dent","Minor",13,"Repair",0,300000,0,110000,410000,370000,485000],
["Toyota","Innova",2018,"Fender","Dent","Severe",79,"Replace + Repaint",1350000,405000,725000,125000,2605000,2400000,2790000],
["Mitsubishi","Mirage",2018,"Front Door","Missing Part","Minor",8,"Replace + Repaint",2155000,385000,755000,155000,3450000,3180000,4060000],
["Hyundai","Creta",2025,"Front Door","Broken","Minor",11,"Replace",3235000,400000,0,115000,3750000,3375000,4210000],
["Hyundai","Creta",2025,"Rear Door","Deformation","Moderate",59,"Repair + Repaint",0,400000,955000,285000,1640000,1495000,1785000],
["Nissan","Livina",2022,"Rear Bumper","Missing Part","Moderate",35,"Replace + Repaint",905000,360000,710000,55000,2030000,1770000,2315000],
["Nissan","Livina",2022,"Trunk","Crack","Severe",82,"Replace + Repaint",1650000,480000,1145000,295000,3570000,3185000,3900000],
["Nissan","Livina",2022,"Taillight","Scratch","Moderate",45,"Repair",0,180000,0,280000,460000,395000,525000],
["Nissan","Livina",2022,"Rear Glass","Broken","Moderate",53,"Replace",1480000,340000,0,255000,2075000,1800000,2225000],
["Suzuki","Ertiga",2021,"Rear Bumper","Broken","Severe",63,"Replace + Repaint",1000000,405000,865000,215000,2485000,2145000,2955000],
["Daihatsu","Ayla",2025,"Front Bumper","Scratch","Moderate",46,"Repair + Repaint",0,270000,685000,90000,1045000,950000,1130000],
["Daihatsu","Ayla",2025,"Hood","Crack","Moderate",50,"Replace + Repaint",1385000,420000,960000,140000,2905000,2635000,3220000],
["Toyota","Rush",2024,"Rear Bumper","Broken","Moderate",34,"Replace",1180000,360000,0,235000,1775000,1540000,1905000],
["Toyota","Rush",2024,"Trunk","Missing Part","Moderate",34,"Replace + Repaint",2455000,360000,825000,200000,3840000,3365000,4495000],
["Toyota","Rush",2024,"Taillight","Missing Part","Minor",5,"Replace",955000,205000,0,175000,1335000,1210000,1505000],
["Daihatsu","Ayla",2022,"Rear Bumper","Dent","Severe",72,"Repair + Repaint",0,335000,925000,120000,1380000,1240000,1540000],
["Daihatsu","Ayla",2022,"Trunk","Missing Part","Minor",17,"Replace",1625000,335000,0,290000,2250000,1995000,2460000],
["Mitsubishi","Xpander",2021,"Rear Bumper","Scratch","Severe",89,"Repair + Repaint",0,365000,1030000,215000,1610000,1460000,1900000],
["Mitsubishi","Xpander",2021,"Trunk","Paint Damage","Minor",14,"Repaint",0,275000,675000,295000,1245000,1150000,1340000],
["Mitsubishi","Xpander",2021,"Taillight","Scratch","Severe",77,"Replace",1040000,285000,0,190000,1515000,1400000,1630000],
["Nissan","Magnite",2021,"Rear Bumper","Deformation","Moderate",40,"Repair + Repaint",0,295000,830000,285000,1410000,1250000,1665000],
["Nissan","Magnite",2021,"Trunk","Missing Part","Severe",86,"Replace + Repaint",1940000,570000,955000,200000,3665000,3185000,3980000],
["Nissan","Magnite",2021,"Taillight","Crack","Minor",24,"Replace",945000,220000,0,230000,1395000,1195000,1550000],
["Mitsubishi","Outlander",2021,"Front Door","Deformation","Severe",67,"Replace + Repaint",3675000,585000,1145000,205000,5610000,4875000,6020000],
["Mitsubishi","Outlander",2021,"Rear Door","Deformation","Severe",63,"Replace + Repaint",3125000,600000,1035000,285000,5045000,4610000,6055000],
["Mitsubishi","Outlander",2021,"Fender","Missing Part","Moderate",45,"Replace + Repaint",1475000,310000,655000,205000,2645000,2435000,3170000],
["Hyundai","Creta",2019,"Rear Bumper","Missing Part","Moderate",36,"Replace + Repaint",1110000,365000,685000,80000,2240000,1970000,2480000],
["Hyundai","Creta",2019,"Trunk","Missing Part","Moderate",40,"Replace",2245000,390000,0,55000,2690000,2500000,3030000],
["Hyundai","Creta",2019,"Taillight","Crack","Moderate",45,"Replace",1115000,250000,0,285000,1650000,1505000,1785000],
["Hyundai","Creta",2019,"Rear Glass","Broken","Moderate",55,"Replace",2185000,375000,0,165000,2725000,2450000,2975000],
["Nissan","Kicks",2023,"Front Bumper","Deformation","Moderate",54,"Repair + Repaint",0,310000,835000,200000,1345000,1200000,1480000],
["Nissan","Kicks",2023,"Hood","Crack","Minor",23,"Repair + Repaint",0,270000,800000,245000,1315000,1155000,1415000],
["Nissan","Kicks",2023,"Headlight","Missing Part","Severe",67,"Replace",2185000,345000,0,300000,2830000,2445000,3175000],
["Nissan","Kicks",2023,"Grille","Dent","Severe",91,"Repair + Repaint",0,255000,505000,255000,1015000,880000,1115000],
["Nissan","Kicks",2023,"Fender","Paint Damage","Moderate",41,"Repaint",0,240000,655000,75000,970000,895000,1070000],
["Honda","Civic",2019,"Front Door","Crack","Severe",92,"Replace + Repaint",4270000,700000,1265000,215000,6450000,5765000,6975000],
["Toyota","Veloz",2020,"Rear Bumper","Broken","Moderate",51,"Replace + Repaint",860000,395000,795000,70000,2120000,1840000,2455000],
["Toyota","Veloz",2020,"Trunk","Paint Damage","Minor",18,"Repaint",0,305000,745000,170000,1220000,1095000,1435000],
["Toyota","Rush",2021,"Rear Bumper","Scratch","Severe",86,"Repair + Repaint",0,345000,890000,270000,1505000,1375000,1740000],
["Toyota","Rush",2021,"Trunk","Dent","Severe",68,"Replace + Repaint",2615000,510000,1070000,225000,4420000,3995000,5085000],
["Hyundai","Creta",2018,"Front Bumper","Paint Damage","Minor",11,"Repaint",0,250000,680000,55000,985000,900000,1070000],
["Hyundai","Creta",2018,"Hood","Crack","Moderate",55,"Repair + Repaint",0,380000,955000,255000,1590000,1455000,1805000],
["Hyundai","Creta",2018,"Headlight","Crack","Minor",13,"Replace",1895000,250000,0,295000,2440000,2195000,2695000],
["Hyundai","Creta",2018,"Grille","Dent","Severe",95,"Replace + Repaint",805000,360000,510000,240000,1915000,1710000,2290000],
["Toyota","Calya",2020,"Front Bumper","Crack","Severe",64,"Replace + Repaint",865000,370000,940000,220000,2395000,2050000,2655000],
["Toyota","Calya",2020,"Hood","Deformation","Severe",87,"Replace + Repaint",1405000,550000,1175000,205000,3335000,2845000,3945000],
["Toyota","Agya",2025,"Rear Bumper","Broken","Severe",62,"Replace + Repaint",785000,355000,895000,55000,2090000,1780000,2325000],
["Toyota","Agya",2025,"Trunk","Missing Part","Moderate",43,"Replace + Repaint",1670000,430000,855000,120000,3075000,2860000,3460000],
["Toyota","Agya",2025,"Taillight","Scratch","Moderate",53,"Repair",0,190000,0,250000,440000,400000,485000],
["Toyota","Agya",2025,"Rear Glass","Crack","Minor",7,"Replace",1365000,250000,0,120000,1735000,1605000,1890000],
["Toyota","Agya",2025,"Quarter Panel","Paint Damage","Moderate",35,"Repaint",0,440000,1015000,210000,1665000,1470000,1840000],
["Honda","City",2023,"Rear Bumper","Missing Part","Moderate",51,"Replace",1100000,345000,0,105000,1550000,1320000,1790000],
["Honda","City",2023,"Trunk","Deformation","Moderate",58,"Repair + Repaint",0,375000,935000,290000,1600000,1385000,1895000],
["Honda","City",2023,"Taillight","Scratch","Severe",89,"Replace",1005000,340000,0,240000,1585000,1425000,1725000],
["Honda","City",2023,"Rear Glass","Scratch","Minor",15,"Repair",0,215000,0,205000,420000,385000,475000],
["Honda","City",2023,"Quarter Panel","Broken","Minor",18,"Replace",3215000,500000,0,160000,3875000,3355000,4395000],
["Mitsubishi","Outlander",2022,"Rear Bumper","Deformation","Moderate",54,"Repair + Repaint",0,275000,865000,130000,1270000,1125000,1360000],
["Nissan","Grand Livina",2018,"Front Door","Missing Part","Moderate",60,"Replace",2550000,575000,0,125000,3250000,2945000,3840000],
["Suzuki","Baleno",2023,"Front Bumper","Missing Part","Minor",22,"Replace + Repaint",920000,285000,625000,295000,2125000,1830000,2410000],
["Suzuki","Baleno",2023,"Hood","Paint Damage","Severe",75,"Repair + Repaint",0,400000,1170000,50000,1620000,1420000,1840000],
["Suzuki","Baleno",2023,"Headlight","Crack","Minor",24,"Replace",1480000,225000,0,70000,1775000,1565000,1930000],
["Suzuki","Baleno",2023,"Grille","Missing Part","Severe",78,"Replace + Repaint",645000,320000,480000,90000,1535000,1320000,1770000],
["Hyundai","Santa Fe",2023,"Rear Bumper","Deformation","Minor",25,"Repair",0,265000,0,65000,330000,295000,385000],
["Hyundai","Santa Fe",2023,"Trunk","Scratch","Severe",94,"Repair + Repaint",0,435000,1200000,135000,1770000,1620000,1910000],
["Hyundai","Santa Fe",2023,"Taillight","Scratch","Severe",87,"Replace",1495000,335000,0,165000,1995000,1800000,2270000],
["Daihatsu","Sigra",2023,"Rear Bumper","Crack","Minor",19,"Repair + Repaint",0,215000,615000,90000,920000,845000,1010000],
["Daihatsu","Sigra",2023,"Trunk","Broken","Severe",92,"Replace + Repaint",1505000,505000,1185000,215000,3410000,3035000,3895000],
["Daihatsu","Sigra",2023,"Taillight","Missing Part","Severe",74,"Replace",650000,325000,0,295000,1270000,1145000,1390000],
["Toyota","Rush",2024,"Front Bumper","Scratch","Minor",12,"Repaint",0,200000,590000,165000,955000,880000,1110000],
["Toyota","Rush",2024,"Hood","Paint Damage","Severe",64,"Repair + Repaint",0,355000,1050000,145000,1550000,1440000,1665000],
["Toyota","Rush",2024,"Headlight","Broken","Severe",80,"Replace",2035000,330000,0,230000,2595000,2305000,3070000],
["Nissan","Grand Livina",2022,"Rear Bumper","Paint Damage","Moderate",53,"Repaint",0,275000,820000,280000,1375000,1190000,1585000],
["Nissan","Grand Livina",2022,"Trunk","Paint Damage","Severe",96,"Repair + Repaint",0,445000,1025000,230000,1700000,1570000,1860000],
["Nissan","Grand Livina",2022,"Taillight","Missing Part","Moderate",33,"Replace",915000,225000,0,265000,1405000,1250000,1550000],
["Nissan","Grand Livina",2022,"Rear Glass","Crack","Severe",88,"Replace",1515000,390000,0,140000,2045000,1835000,2230000],
["Nissan","Grand Livina",2022,"Quarter Panel","Broken","Moderate",60,"Replace + Repaint",3425000,590000,1235000,130000,5380000,4905000,5850000],
["Suzuki","Ertiga",2024,"Front Door","Missing Part","Moderate",53,"Replace",2515000,470000,0,90000,3075000,2740000,3425000],
["Suzuki","Ertiga",2024,"Rear Door","Broken","Severe",67,"Replace + Repaint",2435000,525000,1075000,225000,4260000,3680000,4650000],
["Suzuki","Ertiga",2024,"Fender","Broken","Minor",21,"Replace + Repaint",1025000,275000,565000,260000,2125000,1945000,2435000],
["Suzuki","Ertiga",2024,"Quarter Panel","Deformation","Severe",82,"Replace + Repaint",2995000,625000,1250000,65000,4935000,4405000,5880000],
["Suzuki","Ertiga",2024,"Side Mirror","Broken","Minor",29,"Replace",490000,190000,0,285000,965000,845000,1095000],
["Toyota","Agya",2021,"Rear Bumper","Paint Damage","Minor",9,"Repaint",0,245000,680000,50000,975000,905000,1125000],
["Toyota","Avanza",2025,"Rear Bumper","Broken","Moderate",45,"Replace + Repaint",875000,345000,800000,85000,2105000,1795000,2335000],
["Toyota","Avanza",2025,"Trunk","Paint Damage","Severe",64,"Repair + Repaint",0,335000,1010000,290000,1635000,1400000,1890000],
["Toyota","Avanza",2025,"Taillight","Crack","Moderate",40,"Replace",895000,230000,0,225000,1350000,1240000,1610000],
["Toyota","Avanza",2025,"Rear Glass","Scratch","Severe",63,"Replace",1535000,345000,0,265000,2145000,1920000,2305000],
["Daihatsu","Xenia",2019,"Front Door","Crack","Severe",99,"Replace + Repaint",2675000,635000,1260000,150000,4720000,4260000,5115000],
["Daihatsu","Xenia",2019,"Rear Door","Paint Damage","Severe",70,"Repair + Repaint",0,500000,945000,295000,1740000,1535000,2060000],
["Daihatsu","Xenia",2019,"Fender","Broken","Severe",67,"Replace",940000,380000,0,270000,1590000,1405000,1770000],
["Daihatsu","Xenia",2019,"Quarter Panel","Deformation","Severe",66,"Replace + Repaint",3305000,695000,1315000,160000,5475000,5010000,5945000],
["Daihatsu","Xenia",2019,"Side Mirror","Crack","Severe",63,"Replace + Repaint",450000,235000,350000,150000,1185000,1075000,1330000],
["Hyundai","Palisade",2025,"Front Door","Deformation","Minor",24,"Repair",0,320000,0,105000,425000,365000,490000],
["Hyundai","Palisade",2025,"Rear Door","Missing Part","Severe",82,"Replace + Repaint",4850000,585000,1095000,265000,6795000,6060000,7695000],
["Suzuki","Ertiga",2022,"Rear Bumper","Dent","Moderate",50,"Repair + Repaint",0,275000,770000,195000,1240000,1105000,1425000],
["Toyota","Yaris",2024,"Front Door","Paint Damage","Severe",84,"Repair + Repaint",0,480000,1260000,55000,1795000,1555000,1920000],
["Toyota","Yaris",2024,"Rear Door","Crack","Severe",80,"Replace + Repaint",2845000,560000,1230000,65000,4700000,4345000,5245000],
["Toyota","Yaris",2024,"Fender","Dent","Minor",15,"Repair",0,195000,0,115000,310000,270000,345000],
["Toyota","Yaris",2024,"Quarter Panel","Dent","Severe",75,"Repair + Repaint",0,510000,1220000,205000,1935000,1755000,2140000],
["Toyota","Yaris",2019,"Front Door","Dent","Minor",10,"Repair",0,300000,0,220000,520000,450000,590000],
["Toyota","Yaris",2019,"Rear Door","Missing Part","Severe",100,"Replace",2345000,685000,0,115000,3145000,2915000,3565000],
["Hyundai","Palisade",2018,"Rear Bumper","Crack","Moderate",56,"Replace + Repaint",1550000,405000,905000,200000,3060000,2800000,3625000],
["Hyundai","Palisade",2018,"Trunk","Crack","Minor",26,"Repair + Repaint",0,290000,805000,155000,1250000,1145000,1485000],
["Hyundai","Palisade",2018,"Taillight","Scratch","Moderate",45,"Repair",0,195000,0,245000,440000,385000,520000],
["Hyundai","Palisade",2018,"Rear Glass","Scratch","Moderate",47,"Repair",0,265000,0,75000,340000,305000,385000],
["Mitsubishi","Xpander",2021,"Front Door","Deformation","Minor",21,"Repair",0,355000,0,265000,620000,540000,670000],
["Mitsubishi","Xpander",2021,"Rear Door","Crack","Minor",7,"Repair + Repaint",0,315000,755000,185000,1255000,1090000,1405000],
["Mitsubishi","Xpander",2021,"Fender","Crack","Severe",89,"Replace + Repaint",1060000,435000,750000,225000,2470000,2180000,2780000],
["Honda","CR-V",2024,"Front Bumper","Broken","Severe",93,"Replace + Repaint",1755000,415000,880000,230000,3280000,2940000,3625000],
["Honda","CR-V",2024,"Hood","Scratch","Minor",16,"Repaint",0,250000,905000,100000,1255000,1100000,1380000],
["Honda","CR-V",2024,"Headlight","Crack","Moderate",41,"Replace",2340000,275000,0,65000,2680000,2450000,2950000],
["Nissan","Magnite",2020,"Front Bumper","Scratch","Severe",62,"Repair + Repaint",0,315000,850000,130000,1295000,1135000,1500000],
["Nissan","Magnite",2020,"Hood","Dent","Severe",70,"Replace + Repaint",2110000,505000,1190000,165000,3970000,3395000,4540000],
["Nissan","Magnite",2020,"Headlight","Missing Part","Severe",76,"Replace",1555000,355000,0,100000,2010000,1795000,2175000],
["Toyota","Calya",2021,"Rear Bumper","Deformation","Severe",70,"Replace + Repaint",715000,425000,940000,280000,2360000,2050000,2650000],
["Toyota","Calya",2021,"Trunk","Broken","Minor",5,"Replace + Repaint",1755000,365000,685000,260000,3065000,2735000,3530000],
["Suzuki","Ertiga",2020,"Front Door","Scratch","Severe",85,"Repair + Repaint",0,445000,1230000,245000,1920000,1740000,2065000],
["Daihatsu","Ayla",2023,"Front Bumper","Crack","Minor",22,"Repair + Repaint",0,230000,600000,285000,1115000,995000,1235000],
["Daihatsu","Ayla",2023,"Hood","Missing Part","Moderate",51,"Replace + Repaint",1455000,450000,1025000,280000,3210000,2855000,3850000],
["Mitsubishi","Pajero Sport",2020,"Front Bumper","Missing Part","Minor",11,"Replace",1935000,275000,0,255000,2465000,2170000,2920000],
["Mitsubishi","Pajero Sport",2020,"Hood","Crack","Severe",93,"Replace + Repaint",3765000,590000,1195000,70000,5620000,4960000,6140000],
["Mitsubishi","Pajero Sport",2020,"Headlight","Scratch","Severe",77,"Replace",2810000,375000,0,210000,3395000,3110000,3690000],
["Mitsubishi","Pajero Sport",2020,"Grille","Missing Part","Severe",73,"Replace + Repaint",1290000,305000,520000,240000,2355000,2035000,2675000],
["Nissan","Magnite",2022,"Front Bumper","Broken","Minor",27,"Replace + Repaint",980000,295000,610000,85000,1970000,1825000,2250000],
["Nissan","Magnite",2022,"Hood","Crack","Severe",66,"Replace + Repaint",1995000,460000,1105000,160000,3720000,3195000,4290000],
["Mitsubishi","Mirage",2024,"Front Door","Crack","Moderate",45,"Replace + Repaint",2525000,455000,830000,245000,4055000,3595000,4370000],
["Mitsubishi","Mirage",2024,"Rear Door","Dent","Severe",89,"Replace + Repaint",2000000,635000,1300000,110000,4045000,3485000,4390000],
["Toyota","Rush",2024,"Rear Bumper","Scratch","Minor",9,"Repaint",0,225000,545000,175000,945000,880000,1110000],
["Toyota","Rush",2024,"Trunk","Deformation","Moderate",56,"Repair + Repaint",0,330000,960000,180000,1470000,1300000,1600000],
["Toyota","Avanza",2019,"Front Bumper","Deformation","Moderate",45,"Repair + Repaint",0,265000,745000,155000,1165000,1065000,1360000],
["Toyota","Avanza",2019,"Hood","Crack","Severe",89,"Replace + Repaint",1625000,540000,1225000,55000,3445000,3000000,4025000],
["Toyota","Avanza",2019,"Headlight","Broken","Minor",21,"Replace",1550000,240000,0,55000,1845000,1605000,2210000],
["Toyota","Avanza",2019,"Grille","Broken","Severe",81,"Replace + Repaint",685000,320000,475000,185000,1665000,1475000,1965000],
["Toyota","Calya",2020,"Rear Bumper","Dent","Moderate",50,"Repair + Repaint",0,270000,755000,235000,1260000,1120000,1410000],
["Hyundai","Palisade",2021,"Front Bumper","Scratch","Moderate",56,"Repair + Repaint",0,310000,895000,290000,1495000,1365000,1660000],
["Hyundai","Palisade",2021,"Hood","Missing Part","Severe",81,"Replace",3635000,495000,0,260000,4390000,3745000,5210000],
["Toyota","Yaris",2022,"Front Bumper","Missing Part","Severe",69,"Replace + Repaint",1055000,440000,900000,205000,2600000,2225000,2955000],
["Toyota","Yaris",2022,"Hood","Scratch","Minor",16,"Repaint",0,290000,830000,220000,1340000,1145000,1450000],
["Suzuki","Baleno",2025,"Front Door","Missing Part","Minor",18,"Replace",2295000,375000,0,290000,2960000,2690000,3305000],
["Suzuki","Baleno",2025,"Rear Door","Dent","Moderate",41,"Repair + Repaint",0,355000,970000,215000,1540000,1330000,1685000],
["Suzuki","Baleno",2025,"Fender","Scratch","Minor",19,"Repaint",0,210000,600000,115000,925000,790000,1000000],
["Hyundai","Santa Fe",2020,"Front Door","Crack","Moderate",36,"Repair + Repaint",0,395000,910000,145000,1450000,1255000,1575000],
["Hyundai","Santa Fe",2020,"Rear Door","Dent","Severe",83,"Replace + Repaint",4530000,640000,1140000,60000,6370000,5910000,7475000],
["Hyundai","Santa Fe",2020,"Fender","Crack","Moderate",37,"Replace + Repaint",1855000,315000,640000,235000,3045000,2785000,3520000],
["Hyundai","Santa Fe",2020,"Quarter Panel","Crack","Minor",9,"Repair + Repaint",0,345000,965000,105000,1415000,1245000,1595000],
["Hyundai","Santa Fe",2020,"Side Mirror","Broken","Moderate",50,"Replace",950000,245000,0,110000,1305000,1120000,1430000],
["Toyota","Avanza",2020,"Front Bumper","Deformation","Severe",97,"Replace + Repaint",875000,500000,1080000,260000,2715000,2505000,2995000],
["Toyota","Avanza",2020,"Hood","Deformation","Severe",74,"Replace + Repaint",1825000,545000,1210000,245000,3825000,3450000,4180000],
["Toyota","Avanza",2020,"Headlight","Scratch","Moderate",50,"Repair",0,255000,0,285000,540000,460000,590000],
["Toyota","Avanza",2020,"Grille","Scratch","Minor",20,"Repaint",0,180000,405000,105000,690000,615000,815000],
["Suzuki","Baleno",2022,"Rear Bumper","Broken","Moderate",46,"Replace + Repaint",890000,360000,735000,190000,2175000,1970000,2575000],
["Suzuki","Baleno",2022,"Trunk","Paint Damage","Severe",70,"Repair + Repaint",0,395000,915000,165000,1475000,1255000,1625000],
["Suzuki","Baleno",2022,"Taillight","Missing Part","Severe",83,"Replace",920000,290000,0,150000,1360000,1245000,1490000],
["Honda","CR-V",2023,"Front Door","Dent","Severe",70,"Repair + Repaint",0,445000,980000,140000,1565000,1430000,1785000],
["Honda","CR-V",2023,"Rear Door","Crack","Minor",17,"Repair + Repaint",0,340000,695000,235000,1270000,1100000,1515000],
["Honda","CR-V",2023,"Fender","Broken","Moderate",38,"Replace",1500000,280000,0,125000,1905000,1755000,2285000],
["Nissan","Magnite",2023,"Front Bumper","Scratch","Moderate",33,"Repair + Repaint",0,265000,785000,200000,1250000,1100000,1405000],
["Nissan","Magnite",2023,"Hood","Paint Damage","Severe",90,"Repair + Repaint",0,370000,1270000,140000,1780000,1625000,1925000],
["Honda","HR-V",2023,"Front Bumper","Missing Part","Moderate",34,"Replace + Repaint",1290000,305000,735000,190000,2520000,2255000,2895000],
["Honda","HR-V",2023,"Hood","Deformation","Severe",84,"Replace + Repaint",2675000,495000,1300000,175000,4645000,3975000,5005000],
["Honda","HR-V",2023,"Headlight","Missing Part","Moderate",32,"Replace",2220000,275000,0,245000,2740000,2440000,3090000],
["Toyota","Veloz",2023,"Front Door","Dent","Minor",8,"Repair",0,300000,0,70000,370000,320000,425000],
["Daihatsu","Xenia",2023,"Front Bumper","Dent","Severe",82,"Replace + Repaint",1020000,440000,910000,210000,2580000,2355000,2800000],
["Daihatsu","Xenia",2023,"Hood","Broken","Moderate",35,"Replace + Repaint",2000000,390000,950000,195000,3535000,3055000,3950000],
["Daihatsu","Xenia",2023,"Headlight","Broken","Moderate",41,"Replace",1360000,250000,0,260000,1870000,1630000,2125000],
["Daihatsu","Sigra",2024,"Front Door","Broken","Severe",62,"Replace + Repaint",2050000,530000,1115000,260000,3955000,3420000,4645000],
["Daihatsu","Sigra",2024,"Rear Door","Scratch","Moderate",44,"Repair + Repaint",0,375000,845000,70000,1290000,1170000,1465000],
["Daihatsu","Ayla",2025,"Rear Bumper","Scratch","Severe",97,"Repair + Repaint",0,365000,910000,205000,1480000,1275000,1730000],
["Daihatsu","Ayla",2025,"Trunk","Scratch","Severe",73,"Repair + Repaint",0,405000,910000,65000,1380000,1205000,1525000],
["Mitsubishi","Outlander",2024,"Front Bumper","Deformation","Severe",69,"Replace + Repaint",1300000,380000,925000,160000,2765000,2520000,2980000],
["Mitsubishi","Outlander",2024,"Hood","Dent","Moderate",48,"Repair + Repaint",0,300000,895000,275000,1470000,1265000,1675000],
["Hyundai","Palisade",2024,"Rear Bumper","Paint Damage","Moderate",46,"Repaint",0,295000,680000,215000,1190000,1105000,1360000],
["Hyundai","Palisade",2024,"Trunk","Dent","Severe",78,"Replace + Repaint",3285000,490000,980000,235000,4990000,4635000,5505000],
["Daihatsu","Xenia",2021,"Front Door","Paint Damage","Minor",26,"Repaint",0,355000,825000,295000,1475000,1325000,1645000],
["Daihatsu","Xenia",2021,"Rear Door","Broken","Minor",17,"Replace",2155000,405000,0,115000,2675000,2455000,3055000],
["Daihatsu","Xenia",2021,"Fender","Crack","Moderate",32,"Repair + Repaint",0,210000,665000,230000,1105000,945000,1285000],
["Toyota","Rush",2025,"Front Door","Dent","Minor",8,"Repair",0,295000,0,170000,465000,400000,555000],
["Toyota","Rush",2025,"Rear Door","Deformation","Severe",98,"Replace + Repaint",3190000,625000,1185000,215000,5215000,4660000,5620000],
["Toyota","Rush",2025,"Fender","Dent","Moderate",32,"Repair + Repaint",0,230000,605000,65000,900000,820000,985000],
["Suzuki","APV",2021,"Front Bumper","Scratch","Minor",22,"Repaint",0,235000,710000,180000,1125000,975000,1330000],
["Suzuki","APV",2021,"Hood","Broken","Severe",91,"Replace + Repaint",2010000,515000,1225000,295000,4045000,3690000,4340000],
["Nissan","Magnite",2023,"Rear Bumper","Missing Part","Moderate",36,"Replace",1055000,340000,0,175000,1570000,1350000,1815000],
["Nissan","Kicks",2025,"Front Bumper","Broken","Moderate",51,"Replace + Repaint",1280000,395000,735000,180000,2590000,2260000,3040000],
["Nissan","Kicks",2025,"Hood","Dent","Severe",93,"Replace + Repaint",2475000,560000,1220000,280000,4535000,4050000,4945000],
["Nissan","Kicks",2025,"Headlight","Broken","Severe",68,"Replace",2140000,305000,0,265000,2710000,2500000,2995000],
["Nissan","Kicks",2025,"Grille","Dent","Severe",90,"Replace + Repaint",730000,295000,505000,275000,1805000,1630000,1965000],
["Honda","Brio",2023,"Rear Bumper","Scratch","Moderate",43,"Repair + Repaint",0,245000,830000,250000,1325000,1180000,1585000],
["Honda","Brio",2023,"Trunk","Scratch","Moderate",36,"Repair + Repaint",0,340000,865000,210000,1415000,1220000,1675000],
["Mitsubishi","Outlander",2021,"Front Bumper","Paint Damage","Minor",28,"Repaint",0,225000,705000,180000,1110000,1005000,1315000],
["Mitsubishi","Outlander",2021,"Hood","Scratch","Minor",13,"Repaint",0,285000,750000,265000,1300000,1190000,1480000],
["Daihatsu","Sigra",2018,"Front Door","Deformation","Moderate",60,"Repair + Repaint",0,430000,1090000,165000,1685000,1480000,1910000],
["Daihatsu","Sigra",2018,"Rear Door","Crack","Severe",100,"Replace + Repaint",1925000,635000,1285000,255000,4100000,3520000,4515000],
["Daihatsu","Sigra",2018,"Fender","Dent","Minor",9,"Repair",0,195000,0,165000,360000,330000,415000],
["Honda","BR-V",2023,"Rear Bumper","Paint Damage","Moderate",45,"Repaint",0,290000,760000,295000,1345000,1210000,1460000],
["Honda","BR-V",2023,"Trunk","Deformation","Severe",84,"Replace + Repaint",2120000,540000,955000,95000,3710000,3405000,4080000],
["Honda","BR-V",2023,"Taillight","Crack","Severe",64,"Replace",930000,290000,0,225000,1445000,1290000,1605000],
["Suzuki","APV",2020,"Front Bumper","Deformation","Minor",23,"Repair",0,235000,0,215000,450000,415000,530000],
["Suzuki","APV",2020,"Hood","Scratch","Severe",93,"Repair + Repaint",0,450000,1305000,115000,1870000,1725000,2165000],
["Nissan","Livina",2025,"Front Bumper","Deformation","Minor",5,"Repair",0,205000,0,165000,370000,340000,420000],
["Nissan","Livina",2025,"Hood","Crack","Moderate",57,"Repair + Repaint",0,375000,955000,155000,1485000,1265000,1730000],
["Nissan","Livina",2025,"Headlight","Crack","Severe",63,"Replace",1380000,330000,0,125000,1835000,1695000,2145000],
["Daihatsu","Ayla",2018,"Front Bumper","Crack","Minor",17,"Repair + Repaint",0,265000,685000,125000,1075000,985000,1190000],
["Daihatsu","Ayla",2018,"Hood","Missing Part","Severe",85,"Replace + Repaint",1335000,570000,1220000,75000,3200000,2780000,3430000],
["Daihatsu","Ayla",2018,"Headlight","Broken","Moderate",51,"Replace",1170000,315000,0,125000,1610000,1405000,1880000],
["Daihatsu","Ayla",2018,"Grille","Scratch","Minor",10,"Repaint",0,180000,385000,215000,780000,700000,925000],
["Mitsubishi","Xpander",2021,"Front Bumper","Missing Part","Minor",12,"Replace + Repaint",995000,310000,555000,195000,2055000,1910000,2425000],
["Honda","City",2021,"Front Door","Scratch","Minor",8,"Repaint",0,330000,755000,80000,1165000,1000000,1385000],
["Honda","City",2021,"Rear Door","Scratch","Severe",89,"Repair + Repaint",0,520000,1270000,195000,1985000,1770000,2235000],
["Honda","City",2021,"Fender","Deformation","Moderate",53,"Repair + Repaint",0,250000,735000,200000,1185000,1090000,1335000],
["Honda","Civic",2018,"Rear Bumper","Dent","Severe",97,"Replace + Repaint",1335000,500000,930000,180000,2945000,2530000,3300000],
["Honda","Civic",2018,"Trunk","Paint Damage","Moderate",55,"Repaint",0,375000,1030000,200000,1605000,1460000,1825000],
["Honda","Civic",2018,"Taillight","Missing Part","Severe",76,"Replace",1100000,300000,0,140000,1540000,1365000,1655000],
["Honda","Civic",2021,"Rear Bumper","Paint Damage","Minor",20,"Repaint",0,260000,635000,170000,1065000,920000,1225000],
["Daihatsu","Rocky",2023,"Front Door","Dent","Minor",12,"Repair",0,310000,0,50000,360000,305000,395000],
["Daihatsu","Rocky",2023,"Rear Door","Missing Part","Minor",27,"Replace + Repaint",2450000,430000,900000,195000,3975000,3540000,4405000],
["Toyota","Innova",2024,"Front Door","Broken","Moderate",58,"Replace + Repaint",3455000,540000,905000,135000,5035000,4485000,5960000],
["Toyota","Innova",2024,"Rear Door","Deformation","Moderate",57,"Repair + Repaint",0,420000,1115000,85000,1620000,1415000,1815000],
["Toyota","Innova",2024,"Fender","Scratch","Moderate",39,"Repair + Repaint",0,225000,700000,230000,1155000,1040000,1280000],
["Toyota","Innova",2024,"Quarter Panel","Deformation","Severe",99,"Replace + Repaint",5125000,780000,1255000,210000,7370000,6295000,8135000],
["Toyota","Innova",2024,"Side Mirror","Scratch","Minor",7,"Repaint",0,130000,270000,80000,480000,425000,540000],
["Nissan","Grand Livina",2025,"Front Bumper","Deformation","Minor",29,"Repair",0,240000,0,240000,480000,410000,520000],
["Nissan","Grand Livina",2025,"Hood","Dent","Moderate",53,"Repair + Repaint",0,365000,1075000,220000,1660000,1460000,1905000],
["Hyundai","Creta",2024,"Front Bumper","Crack","Moderate",39,"Repair + Repaint",0,285000,760000,270000,1315000,1195000,1430000],
["Mitsubishi","Mirage",2025,"Rear Bumper","Scratch","Minor",13,"Repaint",0,220000,575000,55000,850000,750000,940000],
["Mitsubishi","Mirage",2025,"Trunk","Paint Damage","Moderate",49,"Repaint",0,335000,795000,80000,1210000,1085000,1350000],
["Mitsubishi","Mirage",2025,"Taillight","Scratch","Severe",79,"Replace",810000,320000,0,225000,1355000,1200000,1570000],
["Mitsubishi","Mirage",2025,"Rear Glass","Broken","Moderate",41,"Replace",1390000,315000,0,160000,1865000,1705000,2195000],
["Mitsubishi","Mirage",2025,"Quarter Panel","Broken","Severe",97,"Replace",3220000,710000,0,130000,4060000,3640000,4540000],
["Suzuki","Baleno",2022,"Rear Bumper","Dent","Severe",95,"Repair + Repaint",0,365000,955000,90000,1410000,1245000,1535000],
["Suzuki","Baleno",2022,"Trunk","Scratch","Severe",65,"Repair + Repaint",0,355000,895000,55000,1305000,1175000,1505000],
["Suzuki","Baleno",2022,"Taillight","Crack","Moderate",55,"Replace",735000,265000,0,130000,1130000,1020000,1300000],
["Mitsubishi","Xpander",2021,"Front Bumper","Paint Damage","Minor",25,"Repaint",0,270000,675000,220000,1165000,1005000,1320000],
["Mitsubishi","Xpander",2021,"Hood","Paint Damage","Minor",20,"Repaint",0,285000,945000,145000,1375000,1175000,1475000],
["Mitsubishi","Mirage",2018,"Front Door","Scratch","Minor",21,"Repaint",0,315000,855000,165000,1335000,1165000,1585000],
["Mitsubishi","Mirage",2018,"Rear Door","Deformation","Minor",18,"Repair",0,370000,0,130000,500000,460000,575000],
["Toyota","Agya",2020,"Front Bumper","Scratch","Severe",84,"Repair + Repaint",0,330000,1040000,145000,1515000,1335000,1690000],
["Toyota","Agya",2020,"Hood","Broken","Moderate",49,"Replace + Repaint",1435000,455000,1020000,240000,3150000,2890000,3550000],
["Toyota","Agya",2020,"Headlight","Broken","Moderate",40,"Replace",1230000,265000,0,65000,1560000,1370000,1725000],
["Toyota","Agya",2020,"Grille","Missing Part","Severe",66,"Replace",530000,285000,0,195000,1010000,870000,1140000],
["Nissan","Livina",2019,"Rear Bumper","Scratch","Moderate",46,"Repair + Repaint",0,280000,865000,270000,1415000,1275000,1620000],
["Nissan","Livina",2019,"Trunk","Deformation","Severe",82,"Replace + Repaint",1625000,525000,940000,170000,3260000,2915000,3585000],
["Nissan","Livina",2019,"Taillight","Crack","Severe",94,"Replace",855000,355000,0,185000,1395000,1285000,1515000],
["Honda","Mobilio",2025,"Rear Bumper","Scratch","Minor",11,"Repaint",0,230000,585000,270000,1085000,1005000,1180000],
["Honda","Mobilio",2025,"Trunk","Dent","Moderate",55,"Repair + Repaint",0,370000,925000,265000,1560000,1400000,1745000],
["Honda","Mobilio",2025,"Taillight","Scratch","Moderate",60,"Repair",0,195000,0,240000,435000,385000,495000],
["Honda","Mobilio",2025,"Rear Glass","Missing Part","Moderate",36,"Replace",1565000,310000,0,295000,2170000,1915000,2555000],
["Honda","HR-V",2024,"Front Door","Scratch","Severe",67,"Repair + Repaint",0,465000,970000,75000,1510000,1385000,1700000],
["Honda","HR-V",2024,"Rear Door","Dent","Severe",65,"Replace + Repaint",3490000,500000,1135000,160000,5285000,4710000,6085000],
["Honda","HR-V",2024,"Fender","Missing Part","Severe",100,"Replace",1100000,405000,0,220000,1725000,1565000,2000000],
["Honda","HR-V",2024,"Quarter Panel","Missing Part","Minor",15,"Replace + Repaint",3950000,455000,980000,120000,5505000,4770000,6575000],
["Nissan","Kicks",2025,"Front Bumper","Scratch","Severe",100,"Repair + Repaint",0,360000,1085000,125000,1570000,1335000,1830000],
["Nissan","Grand Livina",2019,"Front Bumper","Scratch","Severe",66,"Repair + Repaint",0,295000,910000,240000,1445000,1305000,1690000],
["Nissan","Grand Livina",2019,"Hood","Crack","Severe",89,"Replace + Repaint",1895000,505000,1225000,70000,3695000,3260000,4150000],
["Nissan","Grand Livina",2019,"Headlight","Missing Part","Minor",8,"Replace",1480000,215000,0,250000,1945000,1800000,2100000],
["Nissan","Grand Livina",2019,"Grille","Scratch","Severe",72,"Repair + Repaint",0,235000,480000,70000,785000,700000,920000],
["Mitsubishi","Pajero Sport",2019,"Front Bumper","Crack","Minor",18,"Repair + Repaint",0,220000,635000,125000,980000,850000,1085000],
["Mitsubishi","Pajero Sport",2019,"Hood","Missing Part","Severe",66,"Replace",3870000,485000,0,275000,4630000,4055000,5240000],
["Mitsubishi","Pajero Sport",2019,"Headlight","Broken","Minor",23,"Replace",3020000,285000,0,200000,3505000,3080000,4045000],
["Honda","Civic",2024,"Front Bumper","Dent","Severe",88,"Replace + Repaint",1385000,430000,975000,205000,2995000,2565000,3470000],
["Daihatsu","Rocky",2019,"Rear Bumper","Dent","Severe",80,"Repair + Repaint",0,360000,985000,190000,1535000,1370000,1670000],
["Daihatsu","Rocky",2019,"Trunk","Crack","Severe",100,"Replace + Repaint",2005000,580000,1090000,85000,3760000,3385000,4050000],
["Nissan","Magnite",2025,"Rear Bumper","Dent","Moderate",43,"Repair + Repaint",0,240000,760000,60000,1060000,925000,1230000],
["Nissan","Magnite",2025,"Trunk","Crack","Minor",28,"Repair + Repaint",0,310000,700000,110000,1120000,1020000,1245000],
["Nissan","Magnite",2025,"Taillight","Scratch","Minor",23,"Repair",0,165000,0,120000,285000,260000,315000],
["Daihatsu","Rocky",2022,"Rear Bumper","Deformation","Severe",90,"Replace + Repaint",985000,485000,935000,290000,2695000,2310000,3125000],
["Daihatsu","Rocky",2022,"Trunk","Dent","Moderate",45,"Repair + Repaint",0,325000,905000,225000,1455000,1235000,1590000],
["Daihatsu","Rocky",2022,"Taillight","Crack","Severe",87,"Replace",980000,350000,0,240000,1570000,1455000,1825000],
["Daihatsu","Rocky",2022,"Rear Glass","Scratch","Moderate",35,"Repair",0,210000,0,245000,455000,410000,490000],
["Daihatsu","Sigra",2022,"Front Door","Paint Damage","Severe",86,"Repair + Repaint",0,475000,1130000,165000,1770000,1535000,1980000],
["Daihatsu","Sigra",2022,"Rear Door","Paint Damage","Moderate",60,"Repaint",0,380000,1075000,155000,1610000,1475000,1900000],
["Mitsubishi","Mirage",2023,"Front Door","Paint Damage","Severe",86,"Repair + Repaint",0,465000,1255000,105000,1825000,1650000,2095000],
["Mitsubishi","Mirage",2023,"Rear Door","Missing Part","Moderate",44,"Replace + Repaint",2040000,510000,980000,130000,3660000,3300000,4105000],
["Daihatsu","Sigra",2021,"Rear Bumper","Broken","Minor",8,"Replace + Repaint",810000,275000,590000,65000,1740000,1495000,1980000],
["Daihatsu","Sigra",2021,"Trunk","Scratch","Moderate",57,"Repair + Repaint",0,380000,825000,145000,1350000,1185000,1450000],
["Daihatsu","Sigra",2021,"Taillight","Broken","Minor",16,"Replace",680000,220000,0,150000,1050000,935000,1205000],
["Daihatsu","Rocky",2021,"Front Door","Crack","Moderate",32,"Replace + Repaint",3280000,470000,900000,130000,4780000,4360000,5595000],
["Toyota","Rush",2019,"Front Door","Broken","Severe",75,"Replace",3025000,545000,0,245000,3815000,3490000,4140000],
["Toyota","Rush",2019,"Rear Door","Dent","Moderate",36,"Repair + Repaint",0,340000,840000,245000,1425000,1270000,1590000],
["Toyota","Rush",2019,"Fender","Deformation","Moderate",44,"Repair + Repaint",0,225000,620000,210000,1055000,980000,1245000],
["Toyota","Veloz",2025,"Front Door","Paint Damage","Severe",67,"Repair + Repaint",0,445000,1120000,165000,1730000,1525000,1920000],
["Honda","City",2023,"Front Bumper","Paint Damage","Minor",17,"Repaint",0,220000,645000,235000,1100000,975000,1185000],
["Toyota","Rush",2023,"Rear Bumper","Dent","Severe",80,"Repair + Repaint",0,345000,1030000,185000,1560000,1445000,1685000],
["Toyota","Rush",2023,"Trunk","Crack","Moderate",53,"Repair + Repaint",0,325000,850000,85000,1260000,1135000,1475000],
["Toyota","Rush",2023,"Taillight","Scratch","Severe",99,"Replace",975000,355000,0,210000,1540000,1355000,1785000],
["Toyota","Rush",2023,"Rear Glass","Scratch","Moderate",44,"Repair",0,230000,0,280000,510000,445000,575000],
["Toyota","Rush",2023,"Quarter Panel","Broken","Severe",95,"Replace + Repaint",4200000,665000,1285000,50000,6200000,5585000,6995000],
["Honda","HR-V",2020,"Rear Bumper","Broken","Severe",69,"Replace + Repaint",1185000,395000,870000,220000,2670000,2285000,2950000],
["Suzuki","XL7",2025,"Rear Bumper","Missing Part","Moderate",55,"Replace + Repaint",1015000,360000,720000,90000,2185000,1935000,2395000],
["Suzuki","XL7",2025,"Trunk","Crack","Minor",12,"Repair + Repaint",0,280000,800000,250000,1330000,1220000,1465000],
["Suzuki","XL7",2025,"Taillight","Missing Part","Severe",71,"Replace",875000,315000,0,300000,1490000,1350000,1785000],
["Suzuki","XL7",2025,"Rear Glass","Scratch","Severe",96,"Replace",1665000,390000,0,200000,2255000,1930000,2595000],
["Toyota","Agya",2022,"Front Door","Deformation","Minor",25,"Repair",0,365000,0,275000,640000,590000,765000],
["Toyota","Agya",2022,"Rear Door","Crack","Moderate",58,"Replace + Repaint",2235000,565000,920000,170000,3890000,3530000,4285000],
["Toyota","Agya",2022,"Fender","Crack","Severe",83,"Replace + Repaint",815000,355000,810000,245000,2225000,1980000,2385000],
["Toyota","Agya",2022,"Quarter Panel","Broken","Minor",8,"Replace",2525000,495000,0,105000,3125000,2815000,3435000],
["Toyota","Agya",2022,"Side Mirror","Crack","Moderate",56,"Replace + Repaint",475000,240000,315000,155000,1185000,1010000,1340000],
["Daihatsu","Terios",2024,"Front Bumper","Paint Damage","Minor",13,"Repaint",0,210000,615000,280000,1105000,1025000,1190000],
["Daihatsu","Terios",2024,"Hood","Paint Damage","Severe",71,"Repair + Repaint",0,360000,1100000,240000,1700000,1570000,2030000],
["Daihatsu","Terios",2024,"Headlight","Missing Part","Moderate",40,"Replace",1855000,290000,0,115000,2260000,2025000,2525000],
["Daihatsu","Terios",2019,"Front Bumper","Deformation","Minor",15,"Repair",0,220000,0,280000,500000,430000,570000],
["Daihatsu","Terios",2019,"Hood","Missing Part","Minor",26,"Replace + Repaint",2045000,360000,810000,265000,3480000,3035000,4155000],
["Daihatsu","Terios",2019,"Headlight","Missing Part","Moderate",51,"Replace",1890000,310000,0,180000,2380000,2165000,2635000],
["Mitsubishi","Pajero Sport",2019,"Front Door","Crack","Severe",98,"Replace + Repaint",5400000,720000,1185000,245000,7550000,6705000,8565000],
["Mitsubishi","Pajero Sport",2019,"Rear Door","Missing Part","Minor",29,"Replace",4580000,440000,0,135000,5155000,4735000,5655000],
["Hyundai","Palisade",2023,"Front Bumper","Missing Part","Minor",14,"Replace + Repaint",2045000,295000,620000,255000,3215000,2950000,3580000],
["Honda","HR-V",2025,"Rear Bumper","Broken","Severe",90,"Replace + Repaint",1220000,405000,1050000,185000,2860000,2495000,3220000],
["Honda","HR-V",2025,"Trunk","Dent","Minor",27,"Repair",0,265000,0,240000,505000,430000,570000],
["Honda","HR-V",2025,"Taillight","Missing Part","Moderate",36,"Replace",985000,260000,0,105000,1350000,1180000,1500000],
["Toyota","Rush",2022,"Front Bumper","Deformation","Minor",27,"Repair",0,260000,0,290000,550000,475000,635000],
["Toyota","Rush",2022,"Hood","Broken","Severe",66,"Replace",2600000,475000,0,125000,3200000,2805000,3720000],
["Honda","BR-V",2019,"Front Bumper","Missing Part","Minor",8,"Replace",1070000,315000,0,250000,1635000,1520000,1910000],
["Honda","BR-V",2019,"Hood","Deformation","Moderate",35,"Repair + Repaint",0,325000,970000,70000,1365000,1220000,1585000],
["Honda","BR-V",2019,"Headlight","Crack","Minor",12,"Replace",1970000,245000,0,290000,2505000,2140000,2765000],
["Honda","BR-V",2019,"Grille","Scratch","Severe",67,"Repair + Repaint",0,220000,520000,240000,980000,840000,1115000],
["Daihatsu","Xenia",2022,"Front Bumper","Paint Damage","Moderate",51,"Repaint",0,310000,855000,225000,1390000,1260000,1570000],
["Daihatsu","Xenia",2022,"Hood","Broken","Severe",83,"Replace",1935000,545000,0,265000,2745000,2395000,3225000],
["Daihatsu","Xenia",2022,"Headlight","Broken","Minor",18,"Replace",1480000,235000,0,295000,2010000,1845000,2335000],
["Hyundai","Palisade",2021,"Front Bumper","Crack","Moderate",56,"Repair + Repaint",0,320000,815000,145000,1280000,1105000,1500000],
["Hyundai","Palisade",2021,"Hood","Deformation","Severe",66,"Replace + Repaint",3585000,440000,1195000,55000,5275000,4780000,6310000],
["Hyundai","Palisade",2021,"Headlight","Missing Part","Moderate",55,"Replace",2875000,320000,0,255000,3450000,3085000,4125000],
["Toyota","Yaris",2021,"Front Door","Broken","Moderate",34,"Replace + Repaint",2970000,510000,805000,250000,4535000,4055000,5085000],
["Suzuki","Ignis",2018,"Rear Bumper","Missing Part","Severe",91,"Replace",720000,450000,0,125000,1295000,1190000,1500000],
["Toyota","Agya",2018,"Rear Bumper","Broken","Moderate",53,"Replace + Repaint",765000,395000,865000,275000,2300000,1955000,2665000],
["Toyota","Agya",2018,"Trunk","Paint Damage","Minor",22,"Repaint",0,300000,725000,125000,1150000,1010000,1325000],
["Toyota","Agya",2018,"Taillight","Broken","Moderate",39,"Replace",735000,255000,0,65000,1055000,965000,1170000],
["Toyota","Agya",2018,"Rear Glass","Missing Part","Moderate",33,"Replace",1365000,295000,0,65000,1725000,1520000,2060000],
["Honda","CR-V",2020,"Front Door","Deformation","Severe",76,"Replace + Repaint",4495000,565000,1070000,240000,6370000,5465000,7045000],
["Honda","CR-V",2020,"Rear Door","Dent","Moderate",33,"Repair + Repaint",0,360000,970000,65000,1395000,1245000,1525000],
["Honda","CR-V",2020,"Fender","Scratch","Severe",90,"Repair + Repaint",0,285000,805000,235000,1325000,1200000,1490000],
["Suzuki","Ignis",2022,"Front Door","Crack","Moderate",47,"Repair + Repaint",0,370000,875000,170000,1415000,1235000,1565000],
["Suzuki","Ignis",2022,"Rear Door","Crack","Severe",71,"Replace + Repaint",2365000,585000,960000,70000,3980000,3685000,4410000],
["Honda","Civic",2022,"Front Door","Broken","Moderate",45,"Replace + Repaint",3960000,515000,880000,55000,5410000,5015000,5965000],
["Mitsubishi","Xpander",2023,"Front Bumper","Scratch","Severe",61,"Repair + Repaint",0,305000,800000,120000,1225000,1100000,1450000],
["Mitsubishi","Xpander",2023,"Hood","Scratch","Severe",91,"Repair + Repaint",0,380000,1135000,285000,1800000,1635000,2135000],
["Mitsubishi","Xpander",2023,"Headlight","Scratch","Minor",9,"Repair",0,175000,0,225000,400000,360000,450000],
["Nissan","Livina",2024,"Front Bumper","Scratch","Moderate",47,"Repair + Repaint",0,260000,765000,290000,1315000,1160000,1550000],
["Toyota","Avanza",2021,"Front Door","Paint Damage","Severe",90,"Repair + Repaint",0,535000,1055000,50000,1640000,1450000,1775000],
["Daihatsu","Sigra",2022,"Front Door","Dent","Severe",61,"Replace + Repaint",2145000,520000,1000000,230000,3895000,3315000,4465000],
["Daihatsu","Sigra",2022,"Rear Door","Dent","Severe",95,"Replace + Repaint",2070000,610000,1255000,75000,4010000,3470000,4750000],
["Daihatsu","Sigra",2022,"Fender","Missing Part","Severe",61,"Replace",690000,325000,0,105000,1120000,975000,1235000],
["Nissan","Kicks",2022,"Front Bumper","Deformation","Moderate",39,"Repair + Repaint",0,280000,760000,220000,1260000,1080000,1505000],
["Toyota","Veloz",2024,"Front Door","Deformation","Severe",86,"Replace + Repaint",2905000,655000,1160000,100000,4820000,4335000,5625000],
["Toyota","Veloz",2024,"Rear Door","Paint Damage","Severe",97,"Repair + Repaint",0,490000,1075000,145000,1710000,1580000,1960000],
["Toyota","Veloz",2024,"Fender","Broken","Moderate",52,"Replace",915000,315000,0,275000,1505000,1360000,1765000],
["Toyota","Veloz",2024,"Quarter Panel","Crack","Moderate",39,"Replace + Repaint",3330000,515000,1115000,155000,5115000,4530000,5905000],
["Hyundai","Santa Fe",2023,"Rear Bumper","Dent","Minor",19,"Repair",0,250000,0,125000,375000,330000,400000],
["Hyundai","Santa Fe",2023,"Trunk","Crack","Moderate",44,"Repair + Repaint",0,325000,780000,175000,1280000,1185000,1385000],
["Hyundai","Santa Fe",2023,"Taillight","Broken","Severe",89,"Replace",1445000,330000,0,115000,1890000,1630000,2060000],
["Hyundai","Santa Fe",2023,"Rear Glass","Scratch","Minor",13,"Repair",0,185000,0,215000,400000,370000,470000],
["Hyundai","Santa Fe",2023,"Quarter Panel","Scratch","Severe",71,"Repair + Repaint",0,460000,1190000,125000,1775000,1545000,2020000],
["Daihatsu","Terios",2018,"Front Bumper","Deformation","Moderate",40,"Repair + Repaint",0,270000,805000,245000,1320000,1155000,1570000],
["Daihatsu","Terios",2018,"Hood","Missing Part","Severe",72,"Replace + Repaint",2210000,500000,1140000,285000,4135000,3805000,4480000],
["Daihatsu","Terios",2018,"Headlight","Scratch","Moderate",48,"Repair",0,235000,0,175000,410000,355000,485000],
["Suzuki","APV",2019,"Rear Bumper","Missing Part","Severe",86,"Replace + Repaint",945000,475000,930000,205000,2555000,2205000,2960000],
["Suzuki","APV",2019,"Trunk","Deformation","Minor",7,"Repair",0,280000,0,105000,385000,330000,420000],
["Suzuki","APV",2019,"Taillight","Missing Part","Minor",7,"Replace",865000,220000,0,180000,1265000,1090000,1365000],
["Toyota","Veloz",2025,"Front Bumper","Dent","Minor",23,"Repair",0,255000,0,110000,365000,320000,395000],
["Nissan","Kicks",2025,"Front Bumper","Crack","Moderate",39,"Repair + Repaint",0,265000,695000,65000,1025000,905000,1130000],
["Nissan","Kicks",2025,"Hood","Scratch","Minor",24,"Repaint",0,310000,895000,190000,1395000,1230000,1570000],
["Suzuki","APV",2022,"Rear Bumper","Dent","Severe",94,"Repair + Repaint",0,365000,900000,175000,1440000,1270000,1705000],
["Suzuki","APV",2022,"Trunk","Missing Part","Severe",95,"Replace",1860000,510000,0,200000,2570000,2210000,2865000],
["Suzuki","APV",2022,"Taillight","Missing Part","Minor",20,"Replace",860000,210000,0,150000,1220000,1125000,1340000],
["Nissan","Kicks",2023,"Front Door","Scratch","Moderate",59,"Repair + Repaint",0,370000,1075000,65000,1510000,1340000,1725000],
["Nissan","Kicks",2023,"Rear Door","Scratch","Severe",91,"Repair + Repaint",0,500000,1100000,50000,1650000,1500000,1880000],
["Nissan","Kicks",2023,"Fender","Crack","Severe",98,"Replace + Repaint",1295000,435000,850000,135000,2715000,2480000,3065000],
["Honda","Brio",2021,"Front Door","Crack","Severe",72,"Replace + Repaint",2520000,580000,960000,145000,4205000,3845000,4990000],
["Honda","HR-V",2023,"Front Door","Missing Part","Minor",30,"Replace",3780000,445000,0,185000,4410000,4090000,4755000],
["Honda","HR-V",2023,"Rear Door","Paint Damage","Severe",80,"Repair + Repaint",0,420000,1080000,250000,1750000,1550000,2100000],
["Mitsubishi","Mirage",2019,"Front Bumper","Paint Damage","Moderate",37,"Repaint",0,255000,705000,145000,1105000,945000,1235000],
["Mitsubishi","Mirage",2019,"Hood","Crack","Moderate",53,"Repair + Repaint",0,370000,1070000,225000,1665000,1415000,1830000],
["Mitsubishi","Mirage",2019,"Headlight","Crack","Severe",62,"Replace",1455000,290000,0,250000,1995000,1820000,2275000],
["Suzuki","APV",2019,"Front Door","Crack","Severe",69,"Replace + Repaint",2615000,620000,1125000,250000,4610000,4110000,5015000],
["Hyundai","Palisade",2025,"Front Door","Broken","Severe",80,"Replace",5430000,545000,0,100000,6075000,5595000,7095000],
["Hyundai","Palisade",2025,"Rear Door","Dent","Severe",72,"Repair + Repaint",0,455000,1100000,215000,1770000,1630000,2025000],
["Hyundai","Palisade",2025,"Fender","Paint Damage","Severe",86,"Repair + Repaint",0,270000,805000,230000,1305000,1140000,1430000],
["Toyota","Avanza",2023,"Front Door","Crack","Minor",10,"Repair + Repaint",0,290000,735000,275000,1300000,1160000,1425000],
["Toyota","Avanza",2023,"Rear Door","Scratch","Minor",27,"Repaint",0,355000,815000,255000,1425000,1285000,1670000],
["Hyundai","Santa Fe",2025,"Front Bumper","Deformation","Severe",61,"Replace + Repaint",1565000,410000,865000,130000,2970000,2590000,3250000],
["Hyundai","Santa Fe",2025,"Hood","Broken","Severe",89,"Replace",3095000,530000,0,115000,3740000,3375000,4400000],
["Mitsubishi","Pajero Sport",2024,"Rear Bumper","Scratch","Severe",63,"Repair + Repaint",0,280000,760000,225000,1265000,1115000,1425000],
["Mitsubishi","Pajero Sport",2024,"Trunk","Scratch","Minor",15,"Repaint",0,255000,645000,270000,1170000,1015000,1335000],
["Mitsubishi","Pajero Sport",2024,"Taillight","Crack","Minor",7,"Replace",1620000,190000,0,275000,2085000,1920000,2320000],
["Mitsubishi","Pajero Sport",2024,"Rear Glass","Broken","Severe",85,"Replace",3275000,405000,0,260000,3940000,3425000,4510000],
["Hyundai","Stargazer",2019,"Rear Bumper","Scratch","Minor",15,"Repaint",0,260000,610000,235000,1105000,1010000,1305000],
["Honda","BR-V",2022,"Front Door","Dent","Moderate",32,"Repair + Repaint",0,325000,845000,85000,1255000,1070000,1400000],
["Honda","BR-V",2022,"Rear Door","Scratch","Severe",88,"Repair + Repaint",0,485000,1105000,215000,1805000,1570000,1935000],
["Honda","BR-V",2022,"Fender","Crack","Severe",99,"Replace + Repaint",1140000,430000,760000,260000,2590000,2330000,2960000],
["Honda","BR-V",2022,"Quarter Panel","Dent","Severe",67,"Repair + Repaint",0,530000,1260000,195000,1985000,1845000,2320000],
["Honda","BR-V",2022,"Side Mirror","Crack","Moderate",51,"Repair + Repaint",0,180000,330000,105000,615000,550000,730000],
["Mitsubishi","Mirage",2022,"Rear Bumper","Broken","Moderate",42,"Replace + Repaint",835000,330000,845000,295000,2305000,2080000,2705000],
["Mitsubishi","Mirage",2022,"Trunk","Crack","Severe",89,"Replace + Repaint",1795000,490000,1080000,220000,3585000,3240000,4010000],
["Mitsubishi","Mirage",2022,"Taillight","Missing Part","Severe",75,"Replace",715000,300000,0,225000,1240000,1125000,1430000],
["Mitsubishi","Mirage",2022,"Rear Glass","Crack","Moderate",35,"Replace",1340000,305000,0,200000,1845000,1595000,2145000],
["Mitsubishi","Mirage",2022,"Quarter Panel","Deformation","Moderate",34,"Repair + Repaint",0,430000,1115000,90000,1635000,1390000,1915000],
["Hyundai","Santa Fe",2024,"Front Door","Paint Damage","Severe",76,"Repair + Repaint",0,475000,1175000,290000,1940000,1730000,2200000],
["Hyundai","Santa Fe",2024,"Rear Door","Crack","Moderate",33,"Repair + Repaint",0,330000,885000,120000,1335000,1235000,1530000],
["Hyundai","Santa Fe",2024,"Fender","Scratch","Severe",93,"Repair + Repaint",0,295000,745000,60000,1100000,970000,1190000],
["Suzuki","XL7",2020,"Front Bumper","Broken","Severe",66,"Replace",1160000,420000,0,105000,1685000,1550000,1995000],
["Suzuki","XL7",2020,"Hood","Dent","Minor",25,"Repair",0,315000,0,120000,435000,400000,520000],
["Suzuki","XL7",2020,"Headlight","Missing Part","Minor",15,"Replace",1940000,250000,0,295000,2485000,2205000,2935000],
["Nissan","Livina",2019,"Rear Bumper","Scratch","Moderate",44,"Repair + Repaint",0,260000,850000,255000,1365000,1255000,1625000],
["Honda","HR-V",2019,"Front Bumper","Broken","Moderate",51,"Replace + Repaint",1115000,360000,740000,165000,2380000,2075000,2580000],
["Mitsubishi","Mirage",2020,"Rear Bumper","Deformation","Minor",12,"Repair",0,250000,0,240000,490000,455000,550000],
["Hyundai","Palisade",2022,"Rear Bumper","Missing Part","Severe",75,"Replace + Repaint",1670000,400000,840000,80000,2990000,2605000,3335000],
["Hyundai","Palisade",2022,"Trunk","Broken","Severe",81,"Replace + Repaint",3295000,485000,1135000,85000,5000000,4385000,5910000],
["Suzuki","Ignis",2021,"Rear Bumper","Scratch","Minor",14,"Repaint",0,230000,605000,190000,1025000,935000,1115000],
["Suzuki","Ertiga",2020,"Front Door","Scratch","Moderate",60,"Repair + Repaint",0,395000,1040000,120000,1555000,1380000,1680000],
["Suzuki","Ertiga",2020,"Rear Door","Deformation","Moderate",37,"Repair + Repaint",0,360000,960000,65000,1385000,1225000,1565000],
["Suzuki","Ertiga",2020,"Fender","Crack","Severe",90,"Replace + Repaint",985000,415000,880000,265000,2545000,2225000,2900000],
["Mitsubishi","Mirage",2018,"Front Bumper","Crack","Severe",71,"Replace + Repaint",960000,415000,815000,170000,2360000,2145000,2675000],
["Mitsubishi","Mirage",2018,"Hood","Deformation","Moderate",57,"Repair + Repaint",0,390000,1020000,265000,1675000,1480000,1865000],
["Mitsubishi","Mirage",2018,"Headlight","Crack","Moderate",40,"Replace",1555000,270000,0,100000,1925000,1785000,2105000],
["Mitsubishi","Mirage",2018,"Grille","Broken","Severe",64,"Replace + Repaint",595000,295000,505000,105000,1500000,1340000,1680000],
["Nissan","Grand Livina",2021,"Front Door","Broken","Minor",9,"Replace + Repaint",2605000,380000,705000,105000,3795000,3280000,4470000],
["Nissan","Grand Livina",2021,"Rear Door","Missing Part","Moderate",31,"Replace + Repaint",2605000,510000,875000,85000,4075000,3585000,4785000],
["Nissan","Grand Livina",2021,"Fender","Missing Part","Moderate",40,"Replace",830000,315000,0,260000,1405000,1285000,1535000],
["Hyundai","Santa Fe",2024,"Rear Bumper","Paint Damage","Minor",8,"Repaint",0,200000,665000,110000,975000,850000,1045000],
["Hyundai","Santa Fe",2024,"Trunk","Paint Damage","Severe",84,"Repair + Repaint",0,420000,1100000,240000,1760000,1515000,1990000],
["Hyundai","Santa Fe",2024,"Taillight","Missing Part","Moderate",40,"Replace",1330000,245000,0,280000,1855000,1585000,2055000],
["Toyota","Fortuner",2019,"Rear Bumper","Paint Damage","Minor",29,"Repaint",0,280000,695000,165000,1140000,1040000,1245000],
["Toyota","Fortuner",2019,"Trunk","Scratch","Moderate",56,"Repair + Repaint",0,355000,955000,300000,1610000,1470000,1805000],
["Mitsubishi","Outlander",2020,"Front Door","Paint Damage","Minor",27,"Repaint",0,320000,780000,135000,1235000,1100000,1420000],
["Mitsubishi","Outlander",2020,"Rear Door","Missing Part","Severe",73,"Replace + Repaint",3545000,590000,960000,60000,5155000,4610000,5810000],
["Mitsubishi","Outlander",2020,"Fender","Dent","Severe",95,"Replace + Repaint",1270000,370000,830000,110000,2580000,2205000,3005000],
["Mitsubishi","Outlander",2020,"Quarter Panel","Crack","Minor",21,"Repair + Repaint",0,395000,900000,95000,1390000,1225000,1630000],
["Nissan","Grand Livina",2020,"Rear Bumper","Deformation","Severe",66,"Replace + Repaint",790000,430000,805000,220000,2245000,2010000,2675000],
["Nissan","Grand Livina",2020,"Trunk","Crack","Moderate",38,"Replace + Repaint",1650000,380000,910000,180000,3120000,2845000,3435000],
["Mitsubishi","Outlander",2023,"Rear Bumper","Broken","Minor",11,"Replace + Repaint",1455000,295000,685000,115000,2550000,2290000,2955000],
["Mitsubishi","Outlander",2023,"Trunk","Broken","Moderate",47,"Replace + Repaint",3000000,470000,970000,235000,4675000,4080000,5175000],
["Nissan","Grand Livina",2020,"Front Bumper","Missing Part","Minor",7,"Replace + Repaint",970000,300000,620000,300000,2190000,1915000,2440000],
["Nissan","Grand Livina",2020,"Hood","Dent","Minor",15,"Repair",0,275000,0,115000,390000,340000,460000],
["Nissan","Grand Livina",2020,"Headlight","Crack","Severe",61,"Replace",1420000,310000,0,280000,2010000,1720000,2175000],
["Nissan","Grand Livina",2020,"Grille","Crack","Minor",11,"Repair + Repaint",0,165000,325000,290000,780000,690000,885000],
["Nissan","Grand Livina",2020,"Fender","Paint Damage","Moderate",55,"Repaint",0,260000,720000,240000,1220000,1110000,1395000],
["Mitsubishi","Mirage",2020,"Front Door","Paint Damage","Severe",73,"Repair + Repaint",0,480000,960000,50000,1490000,1290000,1725000],
["Mitsubishi","Mirage",2020,"Rear Door","Crack","Moderate",31,"Replace + Repaint",2185000,505000,940000,275000,3905000,3415000,4530000],
["Mitsubishi","Mirage",2020,"Fender","Dent","Moderate",31,"Repair + Repaint",0,215000,560000,135000,910000,805000,1070000],
["Mitsubishi","Mirage",2020,"Quarter Panel","Scratch","Minor",25,"Repaint",0,420000,980000,120000,1520000,1350000,1685000],
["Mitsubishi","Mirage",2020,"Side Mirror","Crack","Severe",75,"Replace + Repaint",480000,240000,350000,185000,1255000,1155000,1400000],
["Daihatsu","Xenia",2020,"Front Bumper","Crack","Severe",79,"Replace + Repaint",1020000,465000,930000,215000,2630000,2425000,2950000],
["Daihatsu","Xenia",2020,"Hood","Deformation","Moderate",47,"Repair + Repaint",0,305000,1080000,250000,1635000,1405000,1870000],
["Daihatsu","Xenia",2020,"Headlight","Missing Part","Moderate",44,"Replace",1395000,320000,0,105000,1820000,1555000,2090000],
["Honda","City",2025,"Rear Bumper","Dent","Minor",28,"Repair",0,250000,0,185000,435000,375000,475000],
["Honda","City",2025,"Trunk","Paint Damage","Moderate",47,"Repaint",0,310000,980000,255000,1545000,1435000,1705000],
["Honda","City",2025,"Taillight","Crack","Severe",84,"Replace",925000,295000,0,65000,1285000,1100000,1490000],
["Hyundai","Stargazer",2024,"Front Door","Broken","Minor",19,"Replace + Repaint",3160000,400000,810000,140000,4510000,4130000,5305000],
["Hyundai","Stargazer",2024,"Rear Door","Crack","Moderate",46,"Replace + Repaint",2725000,480000,1005000,130000,4340000,3760000,4690000],
["Hyundai","Stargazer",2022,"Rear Bumper","Crack","Moderate",34,"Replace + Repaint",1130000,315000,700000,250000,2395000,2195000,2680000],
["Hyundai","Stargazer",2022,"Trunk","Dent","Moderate",50,"Repair + Repaint",0,325000,995000,80000,1400000,1295000,1620000],
["Nissan","Magnite",2021,"Rear Bumper","Crack","Minor",12,"Repair + Repaint",0,225000,610000,90000,925000,835000,1105000],
["Nissan","Magnite",2021,"Trunk","Scratch","Moderate",52,"Repair + Repaint",0,360000,815000,155000,1330000,1145000,1530000],
["Nissan","Magnite",2021,"Taillight","Crack","Severe",97,"Replace",940000,310000,0,140000,1390000,1245000,1560000],
["Mitsubishi","Xpander",2019,"Front Door","Broken","Severe",64,"Replace + Repaint",3025000,555000,970000,75000,4625000,4065000,5195000],
["Mitsubishi","Xpander",2019,"Rear Door","Missing Part","Severe",63,"Replace",2815000,520000,0,150000,3485000,3015000,3800000],
["Mitsubishi","Xpander",2019,"Fender","Missing Part","Severe",81,"Replace + Repaint",940000,385000,725000,270000,2320000,2075000,2550000],
["Mitsubishi","Xpander",2019,"Quarter Panel","Scratch","Moderate",58,"Repair + Repaint",0,510000,1310000,105000,1925000,1775000,2295000],
["Toyota","Avanza",2020,"Rear Bumper","Scratch","Severe",86,"Repair + Repaint",0,355000,920000,240000,1515000,1350000,1755000],
["Toyota","Avanza",2020,"Trunk","Broken","Moderate",39,"Replace",1950000,450000,0,85000,2485000,2280000,2835000],
["Toyota","Avanza",2020,"Taillight","Scratch","Severe",87,"Replace",805000,315000,0,280000,1400000,1220000,1650000],
["Toyota","Avanza",2020,"Rear Glass","Broken","Moderate",34,"Replace",1545000,290000,0,195000,2030000,1780000,2180000],
["Toyota","Avanza",2020,"Quarter Panel","Deformation","Moderate",54,"Repair + Repaint",0,425000,1285000,290000,2000000,1765000,2330000]
];
const PRICING_DATA = PRICING_RAW.map((row,i)=>{
  const o = { id:i+1 };
  PRICING_COLS.forEach((c,idx)=>o[c]=row[idx]);
  return o;
});

// SAVERA's damage-detection vocabulary (generic, lowercase) is not the
// same vocabulary used in the pricing dataset (specific, English,
// Title Case). These alias tables bridge the two using only real
// category names that exist in the pricing dataset -- a part or damage
// type with no confident alias is left unmapped on purpose, so it
// correctly falls through to "Pricing data unavailable" rather than
// being matched to something it doesn't actually mean.
const PART_ALIASES = {
  bumper: ["Front Bumper", "Rear Bumper"],
  door: ["Front Door", "Rear Door"],
  fender: ["Fender"],
  headlamp: ["Headlight"],
  windshield: [], // no equivalent front-glass entry in the pricing dataset
};
const DAMAGE_ALIASES = {
  dent: ["Dent"],
  broken: ["Broken"],
  scratch: ["Scratch"],
  shatter: [], // no "shattered"/"broken glass" equivalent in the pricing dataset
};

/**
 * Find the best-available pricing record for a detected damage item.
 * Matching priority (falls back tier by tier):
 *   1. part + damage type + severity + brand + model
 *   2. part + damage type + severity + brand
 *   3. part + damage type + severity
 * Within a tier, if several records qualify, the one whose year is
 * closest to the vehicle's year is used (a tie-break on real data,
 * never a fabricated figure). Returns an object with record and tier,
 * or null when no pricing record exists at any tier.
 */
function matchPricing(part, damageType, severity, brand, model, year) {
  const partNames = PART_ALIASES[part] || [];
  const dmgNames = DAMAGE_ALIASES[damageType] || [];
  if (!partNames.length || !dmgNames.length) return null;
  const sevName = severity ? severity[0].toUpperCase() + severity.slice(1) : "";
  const base = PRICING_DATA.filter(
    (p) => partNames.includes(p.vehiclePart) && dmgNames.includes(p.damageType) && p.severity === sevName,
  );
  if (!base.length) return null;
  const pickClosestYear = (list) => {
    if (list.length === 1) return list[0];
    const y = Number(year) || 0;
    return list.slice().sort((a, b) => Math.abs(a.year - y) - Math.abs(b.year - y))[0];
  };
  const tier3 = base;
  const tier2 = brand ? base.filter((p) => p.brand === brand) : [];
  const tier1 = brand && model ? tier2.filter((p) => p.model === model) : [];
  if (tier1.length) return { record: pickClosestYear(tier1), tier: 1 };
  if (tier2.length) return { record: pickClosestYear(tier2), tier: 2 };
  return { record: pickClosestYear(tier3), tier: 3 };
}

// In-session state
const state = {
  view: "login",
  sidebarCollapsed: false,
  user: null,
  newAssessment: {
    vehicle: {},
    photos: [],
    damages: [],
    verification: {},
    finalized: false,
  },
  ddSelected: 0,
  aiProgress: 0,
  history: HISTORY.slice(),
  historyFilter: {
    q: "",
    status: "all",
    severity: "all",
    sortKey: "date",
    sortDir: "desc",
  },
  reportOf: null,
  modal: null,
};

function toast(msg) {
  const wrap = document.getElementById("toastWrap");
  const el = document.createElement("div");
  el.className = "toast";
  el.innerHTML = ICONS.check + `<span>${msg}</span>`;
  wrap.appendChild(el);
  setTimeout(() => {
    el.style.opacity = "0";
    el.style.transition = "opacity .25s";
    setTimeout(() => el.remove(), 250);
  }, 2600);
}

/* ---------- Icons (inline SVG, currentColor) ---------- */
const ICONS = {
  dashboard: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></svg>`,
  box: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M21 8 12 3 3 8l9 5 9-5Z" stroke-linejoin="round"/><path d="M3 8v8l9 5 9-5V8" stroke-linejoin="round"/><path d="M12 13v8" stroke-linejoin="round"/></svg>`,
  wrench: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.8 2.8-2-2 2.8-2.8Z" stroke-linejoin="round"/></svg>`,
  chart: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 20V10M12 20V4M20 20v-7" stroke-linecap="round"/></svg>`,
  truck: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="1.5" y="7" width="12.5" height="10" rx="1.2"/><path d="M14 10.5h3.6L20.5 14V17h-2.5" stroke-linejoin="round"/><circle cx="6" cy="18.5" r="1.7"/><circle cx="17" cy="18.5" r="1.7"/></svg>`,
  droplet: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 3s7 7.5 7 12a7 7 0 1 1-14 0c0-4.5 7-12 7-12Z" stroke-linejoin="round"/></svg>`,
  plus: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 5v14M5 12h14" stroke-linecap="round"/></svg>`,
  minus: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M5 12h14" stroke-linecap="round"/></svg>`,
  history: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 12a9 9 0 1 0 3-6.7" stroke-linecap="round"/><path d="M3 4v5h5" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 7v5l3 3" stroke-linecap="round"/></svg>`,
  report: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M7 3h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/><path d="M14 3v5h5M9 13h6M9 17h6M9 9h2"/></svg>`,
  settings: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`,
  collapse: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M15 6l-6 6 6 6" stroke-linecap="round" stroke-linejoin="round"/><path d="M4 4v16" stroke-linecap="round"/></svg>`,
  bell: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" stroke-linecap="round" stroke-linejoin="round"/><path d="M13.7 21a2 2 0 0 1-3.4 0" stroke-linecap="round"/></svg>`,
  search: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3" stroke-linecap="round"/></svg>`,
  upload: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M12 16V4M7 9l5-5 5 5" stroke-linecap="round" stroke-linejoin="round"/><path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  car: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M4 16l1.5-5.5A2 2 0 0 1 7.4 9h9.2a2 2 0 0 1 1.9 1.5L20 16" stroke-linecap="round" stroke-linejoin="round"/><rect x="2.5" y="16" width="19" height="4" rx="1.5"/><circle cx="7" cy="20" r="1.5"/><circle cx="17" cy="20" r="1.5"/></svg>`,
  check: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6 9 17l-5-5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  x: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12" stroke-linecap="round"/></svg>`,
  clock: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  shield: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z" stroke-linejoin="round"/></svg>`,
  spark: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8"/></svg>`,
  chevDown: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  logout: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" stroke-linecap="round" stroke-linejoin="round"/><path d="M16 17l5-5-5-5M21 12H9" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  trash: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  info: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="M12 8h.01M11 12h1v5h1" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  warn: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 3 2 20h20L12 3z" stroke-linejoin="round"/><path d="M12 10v4M12 17h.01" stroke-linecap="round"/></svg>`,
  print: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6 9V3h12v6M6 18H4a1 1 0 0 1-1-1v-6a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-2M6 14h12v7H6z" stroke-linejoin="round"/></svg>`,
};
function badgeSeverity(s) {
  return `<span class="badge badge-${s}">${s[0].toUpperCase() + s.slice(1)}</span>`;
}
function badgePriority(p) {
  const map = { Urgent: "critical", High: "severe", Normal: "neutral", Low: "ok" };
  return `<span class="badge badge-${map[p] || "neutral"}">${p}</span>`;
}
function badgeRepairStatus(s) {
  const map = {
    Completed: "ok",
    "In Repair": "review",
    "Quality Check": "review",
    "Ready for Repair": "neutral",
    "Parts Available": "neutral",
    "Waiting for Parts": "pending",
  };
  return `<span class="badge badge-${map[s] || "neutral"}">${s}</span>`;
}
function badgeTxType(t) {
  const map = { IN: "stockin", OUT: "stockout", ADJUSTMENT: "txadj", RETURN: "txreturn" };
  const label = { IN: "Stock In", OUT: "Stock Out", ADJUSTMENT: "Adjustment", RETURN: "Return" };
  return `<span class="badge badge-${map[t] || "neutral"}">${label[t] || t}</span>`;
}
function badgePoStatus(s) {
  const map = { Received: "ok", Ordered: "review", Pending: "pending", "Partially Received": "pending", Cancelled: "rejected" };
  return `<span class="badge badge-${map[s] || "neutral"}">${s}</span>`;
}
function badgeStockStatus(s) {
  const map = { Critical: "rejected", Low: "pending", Healthy: "ok" };
  return `<span class="badge badge-${map[s] || "neutral"}">${s}</span>`;
}
function badgeStatus(s) {
  const map = {
    Approved: "ok",
    "Pending Verification": "pending",
    "In Review": "review",
    Rejected: "rejected",
  };
  return `<span class="badge badge-${map[s] || "neutral"}">${s}</span>`;
}

/* ---------- Shell / navigation ---------- */
const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: ICONS.dashboard },
  { id: "new-assessment", label: "New Assessment", icon: ICONS.plus },
  { id: "history", label: "History & Analytics", icon: ICONS.history },
  { id: "reports", label: "Reports", icon: ICONS.report },
];
const PAGE_META = {
  dashboard: ["Dashboard", "Overview of claim assessments and fleet risk"],
  "new-assessment": [
    "New Assessment",
    "Vehicle information for a new inspection",
  ],
  "upload-photos": [
    "Upload Vehicle Photos",
    "Capture the vehicle from multiple angles",
  ],
  "ai-processing": [
    "AI Damage Analysis",
    "Model is inspecting the uploaded photos",
  ],
  "damage-detection": [
    "Damage Detection",
    "Review and edit AI-detected damage regions",
  ],
  verification: [
    "Surveyor Verification",
    "Confirm findings and estimate repair cost",
  ],
  history: [
    "History & Analytics",
    "Search past assessments and portfolio trends",
  ],
  reports: ["Reports", "Generate and export assessment reports"],
  "report-view": ["Assessment Report", "Preview before export"],
  settings: ["Profile & Settings", "Account, notifications and workspace"],
  ppic: ["PPIC", "Production planning & inventory control"],
};

/* ---------- Pagination helpers (used by Inventory, Transaction
   History, Repair Planning, Procurement and other PPIC tables) ---------- */
function pageSlice(rows, f) {
  if (!f.page) f.page = 1;
  if (!f.perPage) f.perPage = 10;
  const total = rows.length;
  const totalPages = Math.max(1, Math.ceil(total / f.perPage));
  if (f.page > totalPages) f.page = totalPages;
  if (f.page < 1) f.page = 1;
  const start = (f.page - 1) * f.perPage;
  return { pageRows: rows.slice(start, start + f.perPage), total, totalPages, start };
}
function pagerHTML(prefix, f, total) {
  const totalPages = Math.max(1, Math.ceil(total / f.perPage));
  const cur = Math.min(f.page, totalPages);
  const first = total === 0 ? 0 : (cur - 1) * f.perPage + 1;
  const last = Math.min(total, cur * f.perPage);
  const nums = [];
  for (let p = 1; p <= totalPages; p++) {
    if (p === 1 || p === totalPages || (p >= cur - 1 && p <= cur + 1)) nums.push(p);
    else if (nums[nums.length - 1] !== "...") nums.push("...");
  }
  return `<div class="pager" data-pager-prefix="${prefix}">
    <div class="pager-info">Showing ${first}–${last} of ${total} results</div>
    <div class="pager-controls">
      <button class="pager-btn" data-pg-prev ${cur <= 1 ? "disabled" : ""}>Previous</button>
      ${nums.map((n) => (n === "..." ? `<span class="pager-ellipsis">…</span>` : `<button class="pager-btn ${n === cur ? "active" : ""}" data-pg="${n}">${n}</button>`)).join("")}
      <button class="pager-btn" data-pg-next ${cur >= totalPages ? "disabled" : ""}>Next</button>
    </div>
    <div class="pager-rpp">Rows per page
      <select data-pg-rpp>
        ${[10, 25, 50].map((n) => `<option value="${n}" ${f.perPage === n ? "selected" : ""}>${n}</option>`).join("")}
      </select>
    </div>
  </div>`;
}
function wirePager(container, f) {
  if (!container) return;
  const prev = container.querySelector("[data-pg-prev]");
  const next = container.querySelector("[data-pg-next]");
  if (prev) prev.onclick = () => { f.page = Math.max(1, f.page - 1); renderContent(); };
  if (next) next.onclick = () => { f.page = f.page + 1; renderContent(); };
  container.querySelectorAll("[data-pg]").forEach((b) => (b.onclick = () => { f.page = parseInt(b.dataset.pg, 10); renderContent(); }));
  const rpp = container.querySelector("[data-pg-rpp]");
  if (rpp) rpp.onchange = () => { f.perPage = parseInt(rpp.value, 10); f.page = 1; renderContent(); };
}

/* ---------- Modal system (Stock In / Stock Out) ---------- */
function openModal(type, data) { state.modal = { type, data: data || {} }; renderContent(); }
function closeModal() { state.modal = null; renderContent(); }
function renderModalRoot() {
  if (!state.modal) return "";
  if (state.modal.type === "stock-in") return modalStockIn(state.modal.data);
  if (state.modal.type === "stock-out") return modalStockOut(state.modal.data);
  return "";
}
function modalStockIn(data) {
  const err = data.error || "";
  return `
  <div class="modal-backdrop" id="modalBackdrop">
    <div class="modal-box">
      <div class="modal-head">
        <div class="modal-title">${ICONS.plus} Stock In</div>
        <button class="modal-x" id="modalClose">${ICONS.x}</button>
      </div>
      <div class="modal-body">
        ${err ? `<div class="banner banner-warn" style="margin-bottom:14px;">${ICONS.warn}<div>${err}</div></div>` : ""}
        <div class="field"><label>Part</label>
          <select class="select" id="siPart">
            ${PARTS_MASTER.map((p) => `<option value="${p.part_id}" ${data.partId === p.part_id ? "selected" : ""}>${p.part_name} (${p.part_id})</option>`).join("")}
          </select>
        </div>
        <div class="row-2">
          <div class="field"><label>Quantity</label><input class="input" type="number" min="1" id="siQty" value="${data.qty || 1}"></div>
          <div class="field"><label>Unit Cost (Rp)</label><input class="input" type="number" min="0" id="siCost" value="${data.unitCost ?? (PART_BY_ID.get(data.partId || PARTS_MASTER[0].part_id) || {}).unit_cost ?? ""}"></div>
        </div>
        <div class="row-2">
          <div class="field"><label>Reference PO (optional)</label>
            <select class="select" id="siRefPo">
              <option value="">— None —</option>
              ${PURCHASE_ORDERS.filter((po) => po.status !== "Received" && po.status !== "Cancelled").map((po) => `<option value="${po.po_id}" ${data.refPo === po.po_id ? "selected" : ""}>${po.po_id} — ${(PART_BY_ID.get(po.part_id) || {}).part_name || po.part_id}</option>`).join("")}
            </select>
          </div>
          <div class="field"><label>Date</label><input class="input" type="date" id="siDate" value="${data.date || todayISO()}"></div>
        </div>
        <div class="field" style="margin-bottom:0;"><label>Notes</label><textarea class="input" id="siNotes">${data.notes || ""}</textarea></div>
      </div>
      <div class="modal-foot">
        <button class="btn btn-ghost" id="modalCancel">Cancel</button>
        <button class="btn btn-primary" id="siSubmit">${ICONS.check} Save Stock In</button>
      </div>
    </div>
  </div>`;
}
function modalStockOut(data) {
  const err = data.error || "";
  return `
  <div class="modal-backdrop" id="modalBackdrop">
    <div class="modal-box">
      <div class="modal-head">
        <div class="modal-title">${ICONS.minus} Stock Out</div>
        <button class="modal-x" id="modalClose">${ICONS.x}</button>
      </div>
      <div class="modal-body">
        ${err ? `<div class="banner banner-warn" style="margin-bottom:14px;">${ICONS.warn}<div>${err}</div></div>` : ""}
        <div class="field"><label>Part</label>
          <select class="select" id="soPart">
            ${PARTS_MASTER.map((p) => `<option value="${p.part_id}" ${data.partId === p.part_id ? "selected" : ""}>${p.part_name} (${p.part_id}) — ${computeCurrentStock(p.part_id)} in stock</option>`).join("")}
          </select>
        </div>
        <div class="row-2">
          <div class="field"><label>Quantity</label><input class="input" type="number" min="1" id="soQty" value="${data.qty || 1}"></div>
          <div class="field"><label>Reference Repair Order (optional)</label>
            <select class="select" id="soRefRo">
              <option value="">— None —</option>
              ${REPAIR_ORDERS_JSON.filter((r) => r.status !== "Completed").map((r) => `<option value="${r.repair_order_id}" ${data.refRo === r.repair_order_id ? "selected" : ""}>${r.repair_order_id} — ${(PART_BY_ID.get(r.part_id) || {}).part_name || r.part_id}</option>`).join("")}
            </select>
          </div>
        </div>
        <div class="row-2">
          <div class="field"><label>Date</label><input class="input" type="date" id="soDate" value="${data.date || todayISO()}"></div>
          <div class="field"><label>Notes</label><input class="input" id="soNotes" value="${data.notes || ""}"></div>
        </div>
      </div>
      <div class="modal-foot">
        <button class="btn btn-ghost" id="modalCancel">Cancel</button>
        <button class="btn btn-danger" id="soSubmit">${ICONS.check} Save Stock Out</button>
      </div>
    </div>
  </div>`;
}
function afterModal() {
  if (!state.modal) return;
  const backdrop = document.getElementById("modalBackdrop");
  if (backdrop) backdrop.onclick = (e) => { if (e.target === backdrop) closeModal(); };
  const closeBtn = document.getElementById("modalClose");
  if (closeBtn) closeBtn.onclick = closeModal;
  const cancelBtn = document.getElementById("modalCancel");
  if (cancelBtn) cancelBtn.onclick = closeModal;
  if (state.modal.type === "stock-in") {
    const partSel = document.getElementById("siPart");
    const costInput = document.getElementById("siCost");
    if (partSel) partSel.onchange = () => { costInput.value = (PART_BY_ID.get(partSel.value) || {}).unit_cost || ""; };
    const submit = document.getElementById("siSubmit");
    if (submit) submit.onclick = () => {
      const partId = document.getElementById("siPart").value;
      const qty = parseInt(document.getElementById("siQty").value, 10);
      const unitCost = parseFloat(document.getElementById("siCost").value) || 0;
      const refPo = document.getElementById("siRefPo").value;
      const date = document.getElementById("siDate").value || todayISO();
      const notes = document.getElementById("siNotes").value;
      if (!qty || qty <= 0) { state.modal.data = { partId, qty, unitCost, refPo, date, notes, error: "Quantity must be greater than 0." }; renderContent(); return; }
      INV_TX.push({ transaction_id: nextTxId(), transaction_date: date, part_id: partId, transaction_type: "IN", quantity: qty, unit_cost: unitCost, reference_id: refPo || "MANUAL", notes });
      if (refPo) { const po = PURCHASE_ORDERS.find((p) => p.po_id === refPo); if (po) { po.status = "Received"; po.actual_delivery_date = date; } }
      refreshInventory();
      closeModal();
      toast("Stock In recorded — inventory updated.");
    };
  }
  if (state.modal.type === "stock-out") {
    const submit = document.getElementById("soSubmit");
    if (submit) submit.onclick = () => {
      const partId = document.getElementById("soPart").value;
      const qty = parseInt(document.getElementById("soQty").value, 10);
      const refRo = document.getElementById("soRefRo").value;
      const date = document.getElementById("soDate").value || todayISO();
      const notes = document.getElementById("soNotes").value;
      const avail = computeCurrentStock(partId);
      if (!qty || qty <= 0) { state.modal.data = { partId, qty, refRo, date, notes, error: "Quantity must be greater than 0." }; renderContent(); return; }
      if (qty > avail) { state.modal.data = { partId, qty, refRo, date, notes, error: `Cannot exceed current stock (${avail} available).` }; renderContent(); return; }
      const part = PART_BY_ID.get(partId);
      INV_TX.push({ transaction_id: nextTxId(), transaction_date: date, part_id: partId, transaction_type: "OUT", quantity: qty, unit_cost: part ? part.unit_cost : 0, reference_id: refRo || "MANUAL", notes });
      if (refRo) { const ro = REPAIR_ORDERS_JSON.find((r) => r.repair_order_id === refRo); if (ro && ro.status !== "Completed") ro.status = "In Repair"; }
      refreshInventory();
      closeModal();
      toast("Stock Out recorded — inventory updated.");
    };
  }
}

function renderShell() {
  const shell = document.getElementById("app-shell");
  if (state.view === "login") {
    shell.innerHTML = renderLogin();
    attachLoginEvents();
    return;
  }
  const collapsed = state.sidebarCollapsed;
  shell.innerHTML = `
    <div class="sidebar ${collapsed ? "collapsed" : ""}" id="sidebar">
      <div class="sb-brand">
        <img src="assets/logo.png" alt="SAVERA Logo" style="width: 34px; height: 34px; border-radius: 50%; object-fit: cover; background: #fff; padding: 2px; flex-shrink: 0;">
        <div class="sb-brand-text">
          <div class="sb-brand-title">SAVERA</div>
          <div class="sb-brand-sub">Vehicle Evaluation &amp; Repair AI</div>
        </div>
      </div>
      <div class="sb-nav">
        <div class="sb-section-label">Workspace</div>
        ${NAV_ITEMS.map(
          (it) => `
          <button class="sb-item ${isActiveNav(it.id) ? "active" : ""}" data-nav="${it.id}">
            ${it.icon}<span class="sb-item-label">${it.label}</span>
          </button>`,
        ).join("")}
        <div class="sb-section-label">Production Planning</div>
        <button class="sb-item ${state.view === "ppic" ? "active" : ""}" data-nav="ppic">
          ${ICONS.box}<span class="sb-item-label">PPIC</span>
        </button>
        <div class="sb-section-label">Account</div>
        <button class="sb-item ${state.view === "settings" ? "active" : ""}" data-nav="settings">
          ${ICONS.settings}<span class="sb-item-label">Profile &amp; Settings</span>
        </button>
      </div>
      <div class="sb-foot">
        <button class="sb-item" data-nav="logout" style="margin-bottom:8px;">
          ${ICONS.logout}<span class="sb-item-label">Log out</span>
        </button>
        <button class="sb-collapse-btn" id="collapseBtn">
          ${ICONS.collapse}<span class="lbl">Collapse</span>
        </button>
      </div>
    </div>
    <div class="main-col">
      <div class="topbar">
        <div>
          <div class="tb-title">${PAGE_META[state.view] ? PAGE_META[state.view][0] : ""}</div>
          <div class="tb-sub">${PAGE_META[state.view] ? PAGE_META[state.view][1] : ""}</div>
        </div>
        <div class="tb-right">
          <button class="tb-icon-btn" title="Notifications">${ICONS.bell}<span class="tb-dot"></span></button>
          <div class="tb-user" data-nav="settings">
            <div class="tb-avatar">${initials(state.user?.name || "S U")}</div>
            <div>
              <div class="tb-user-name">${state.user?.name || "Surveyor"}</div>
              <div class="tb-user-role">${state.user?.role || "Field Surveyor"}</div>
            </div>
          </div>
        </div>
      </div>
      <div class="content" id="content"></div>
    </div>
  `;
  document.getElementById("collapseBtn").onclick = () => {
    state.sidebarCollapsed = !state.sidebarCollapsed;
    renderShell();
  };
  // [data-nav] clicks are handled globally via event delegation (see
  // boot section at bottom of file) so this also works for buttons
  // rendered later inside #content (Back, Cancel, quick-nav links, etc.)
  renderContent();
}
function initials(name) {
  return name
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}
function isActiveNav(id) {
  if (id === "new-assessment")
    return [
      "new-assessment",
      "upload-photos",
      "ai-processing",
      "damage-detection",
      "verification",
    ].includes(state.view);
  if (id === "reports") return ["reports", "report-view"].includes(state.view);
  return state.view === id;
}
function handleNav(id) {
  if (id === "logout") {
    state.view = "login";
    state.user = null;
    renderShell();
    return;
  }
  if (id === "new-assessment") {
    state.newAssessment = {
      vehicle: {},
      photos: [],
      damages: [],
      verification: {},
      finalized: false,
    };
  }
  state.view = id;
  renderShell();
}
function goto(view) {
  state.view = view;
  renderShell();
  window.scrollTo(0, 0);
}

function renderContent() {
  const c = document.getElementById("content");
  const map = {
    dashboard: renderDashboard,
    "new-assessment": renderNewAssessment,
    "upload-photos": renderUploadPhotos,
    "ai-processing": renderAiProcessing,
    "damage-detection": renderDamageDetection,
    verification: renderVerification,
    history: renderHistory,
    reports: renderReports,
    "report-view": renderReportView,
    settings: renderSettings,
    ppic: renderPPIC,
  };
  c.innerHTML = (map[state.view] || renderDashboard)() + renderModalRoot();
  const fn = window["after_" + state.view.replace(/-/g, "_")];
  if (fn) fn();
  afterModal();
}

/* ---------- Login ---------- */
function renderLogin() {
  return `
  <div class="login-wrap">
    <div class="login-visual" style="text-align: left; align-items: flex-start; justify-content: space-between; padding: 64px 72px;">
      <div style="margin-top: 40px;">
        <!-- Logo savera.png diperbesar menjadi height 110px -->
        <img src="assets/savera.png" alt="SAVERA Logo" style="height: 110px; width: auto; object-fit: contain; margin-bottom: 36px; display: block;">
        
        <div class="lv-headline" style="font-size: 44px; margin: 0 0 18px 0; text-align: left;">Smarter Claims, Faster Assessments.</div>
        <div class="lv-sub" style="font-size: 16px; margin: 0; text-align: left; max-width: 520px; line-height: 1.7;">SAVERA empowers insurance teams to assess vehicle damage with AI powered analysis, consistent evaluation, and transparent repair cost estimation while keeping every final decision in the hands of your surveyors.</div>
      </div>
      <div class="lv-stats" style="margin-bottom: 10px; width: 100%;">
        <div class="lv-stat-card"><div class="lv-stat-num">${HISTORY.length}</div><div class="lv-stat-lbl">Assessments on file</div></div>
        <div class="lv-stat-card"><div class="lv-stat-num">${BRANDS.length}</div><div class="lv-stat-lbl">Vehicle brands covered</div></div>
        <div class="lv-stat-card"><div class="lv-stat-num">${Math.round((RAW_DATA.reduce((a, d) => a + d.confidence, 0) / RAW_DATA.length) * 100)}%</div><div class="lv-stat-lbl">Avg. model confidence</div></div>
      </div>
    </div>
    <div class="login-form-side">
      <div style="text-align:center; margin-bottom:20px;">
        <img src="assets/logo.png" alt="SAVERA Logo" style="height: 100px; max-width: 100%; object-fit: contain; margin: 0 auto; display: block;">
      </div>
      <h1 style="font-size:20px;margin:0 0 4px;color:var(--navy-900);text-align:center;font-weight:700;">Welcome Back</h1>
      <p style="font-size:12.5px;color:var(--ink-500);margin:0 0 24px;text-align:center;">Sign in to your account</p>
      <div class="field">
        <label>Work email</label>
        <input class="input" id="loginEmail" type="email" placeholder="surveyor@savera-insure.co.id" value="nadia.pramesti@savera-insure.co.id">
      </div>
      <div class="field">
        <label>Password</label>
        <input class="input" id="loginPass" type="password" placeholder="••••••••" value="••••••••">
      </div>
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;">
        <label style="display:flex;align-items:center;gap:7px;font-size:12.3px;color:var(--ink-700);cursor:pointer;"><input type="checkbox" checked style="accent-color:var(--navy-900);"> Keep me signed in</label>
        <a href="#" style="font-size:12.3px;color:var(--cyan-500);font-weight:600;text-decoration:none;">Forgot password?</a>
      </div>
      <button class="btn btn-primary btn-block" id="loginBtn" style="padding:12px;font-weight:600;">Sign in →</button>
      <div id="loginErr" style="color:var(--bad);font-size:12px;margin-top:10px;display:none;"></div>
      <div style="margin-top:20px;text-align:center;">
        <button class="btn btn-ghost btn-sm" id="demoBtn" style="width:100%;">${ICONS.shield} Quick demo access</button>
      </div>
    </div>
  </div>`;
}
function attachLoginEvents() {
  const go = () => {
    const email = document.getElementById("loginEmail").value.trim();
    if (!email) {
      const e = document.getElementById("loginErr");
      e.style.display = "block";
      e.textContent = "Please enter your work email.";
      return;
    }
    const name =
      email
        .split("@")[0]
        .split(".")
        .map((s) => s[0]?.toUpperCase() + s.slice(1))
        .join(" ") || "Nadia Pramesti";
    state.user = {
      name: name.length > 2 ? name : "Nadia Pramesti",
      role: "Field Surveyor",
      email,
    };
    state.view = "dashboard";
    renderShell();
  };
  document.getElementById("loginBtn").onclick = go;
  document.getElementById("demoBtn").onclick = () => {
    state.user = {
      name: "Nadia Pramesti",
      role: "Field Surveyor",
      email: "nadia.pramesti@savera-insure.co.id",
    };
    state.view = "dashboard";
    renderShell();
  };
  document.getElementById("loginPass").addEventListener("keydown", (e) => {
    if (e.key === "Enter") go();
  });
}

/* ---------- Dashboard ---------- */
function renderDashboard() {
  const total = state.history.length;
  const pending = state.history.filter(
    (h) => h.status === "Pending Verification",
  ).length;
  const approved = state.history.filter((h) => h.status === "Approved").length;
  const severe = state.history.filter((h) => h.severity === "severe").length;
  const lowConf = state.history.filter((h) => h.confidence < 0.8).length;
  const avgConf = Math.round(
    (state.history.reduce((a, h) => a + h.confidence, 0) / total) * 100,
  );
  const recent = state.history
    .slice()
    .sort((a, b) => b.date - a.date)
    .slice(0, 6);
  const hour = new Date().getHours();
  const greeting =
    hour < 11
      ? "Good morning"
      : hour < 15
        ? "Good afternoon"
        : hour < 19
          ? "Good evening"
          : "Good evening";
  const firstName = (state.user?.name || "Surveyor").split(" ")[0];
  return `
  <div style="margin-bottom:22px;">
    <h2 style="font-size:21px;font-weight:700;color:var(--navy-900);margin:0 0 4px;">${greeting}, ${firstName} 👋</h2>
    <p style="font-size:13px;color:var(--ink-500);margin:0;">Here's your assessment overview and fleet risk summary</p>
  </div>

  <div class="grid g-4" style="margin-bottom:20px;">
    ${statCard("Total Assessments", total, ICONS.dashboard, "var(--info-bg)", "#2954A6", "↑ live count", "up")}
    ${statCard("Pending Verification", pending, ICONS.clock, "var(--warn-bg)", "var(--warn)", pending + " need review", "")}
    ${statCard("Approved Claims", approved, ICONS.check, "var(--ok-bg)", "var(--ok)", Math.round((approved / total) * 100) + "% of total", "up")}
    ${statCard("Avg. AI Confidence", avgConf + "%", ICONS.spark, "var(--cyan-050)", "#0A7C93", "model score", "")}
  </div>

  <div class="banner banner-info" style="margin-bottom:20px;">
    ${ICONS.info}
    <div><strong>AI is a decision-support tool.</strong> Every damage detection can be edited, and the final claim decision is always made and signed off by a licensed surveyor.</div>
  </div>

  <div class="card" style="margin-bottom:20px;">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:2px;">
      <div>
        <div class="card-title">Recent Assessments</div>
        <div class="card-desc">Latest vehicle damage evaluation logs across your portfolio</div>
      </div>
      <button class="btn btn-ghost btn-sm" data-nav="history">View all →</button>
    </div>
    <div class="table-wrap">
      <table>
        <thead><tr><th>Assessment ID</th><th>Vehicle</th><th>Damage Details</th><th>Severity</th><th>Status</th><th>Date</th></tr></thead>
        <tbody>
          ${recent
            .map(
              (h) => `
            <tr class="row-link" data-view-report="${h.assessmentId}">
              <td style="font-family:var(--font-mono);font-size:12px;font-weight:600;">${h.assessmentId}</td>
              <td style="font-weight:600;color:var(--navy-900);">${h.brand} ${h.model}</td>
              <td style="text-transform:capitalize;">${h.part} · ${h.damageType}</td>
              <td>${badgeSeverity(h.severity)}</td>
              <td>${badgeStatus(h.status)}</td>
              <td style="color:var(--ink-500);">${fmtDate(h.date)}</td>
            </tr>`,
            )
            .join("")}
        </tbody>
      </table>
    </div>
  </div>

  <div class="grid g-12-8">
    <div class="card">
      <div class="card-title">Claims Requiring Attention</div>
      <div class="card-desc">Cases that need your review or verification</div>
      <div class="grid g-3">
        <div class="attn-tile attn-bad" data-nav="history">
          <div class="attn-title">🔴 Severe Damage</div>
          <div class="attn-num">${severe} claim${severe === 1 ? "" : "s"}</div>
          <div class="attn-sub">Requires immediate review</div>
        </div>
        <div class="attn-tile attn-warn" data-nav="history">
          <div class="attn-title">🟠 Low AI Confidence</div>
          <div class="attn-num">${lowConf} claim${lowConf === 1 ? "" : "s"}</div>
          <div class="attn-sub">Confidence below 80%</div>
        </div>
        <div class="attn-tile attn-info" data-nav="history">
          <div class="attn-title">🟡 Pending Review</div>
          <div class="attn-num">${pending} claim${pending === 1 ? "" : "s"}</div>
          <div class="attn-sub">Waiting for surveyor</div>
        </div>
      </div>
    </div>
    <div class="card">
      <div class="card-title">Assessment Overview</div>
      <div class="card-desc">Your assessment activity</div>
      <div class="grid g-2" style="gap:8px;margin-bottom:16px;">
        <div class="mini-tile"><div class="mini-label">Claims</div><div class="mini-value">${total}</div></div>
        <div class="mini-tile"><div class="mini-label">Avg. Confidence</div><div class="mini-value">${avgConf}%</div></div>
        <div class="mini-tile"><div class="mini-label">Approval</div><div class="mini-value" style="color:var(--ok);">${Math.round((approved / total) * 100)}%</div></div>
        <div class="mini-tile"><div class="mini-label">Pending</div><div class="mini-value" style="color:var(--warn);">${pending}</div></div>
      </div>
      <button class="btn btn-accent btn-block" data-nav="new-assessment">${ICONS.plus} New Assessment</button>
    </div>
  </div>
  `;
}
function statCard(label, value, icon, bg, fg, delta, dir) {
  return `<div class="stat-card">
    <div class="stat-top">
      <div class="stat-label">${label}</div>
      <div class="stat-icon" style="background:${bg};color:${fg};">${icon}</div>
    </div>
    <div class="stat-value">${value}</div>
    <div class="stat-delta ${dir}">${delta}</div>
  </div>`;
}
function after_dashboard() {
  document.querySelectorAll("[data-view-report]").forEach(
    (el) =>
      (el.onclick = () => {
        const rec = state.history.find(
          (h) => h.assessmentId === el.dataset.viewReport,
        );
        state.reportOf = rec;
        goto("report-view");
      }),
  );
  // .attn-tile[data-nav] clicks are handled by the global delegated
  // listener installed at boot.
}

/* ---------- Stepper ---------- */
const WORKFLOW_STEPS = [
  { id: "new-assessment", label: "Vehicle Info" },
  { id: "upload-photos", label: "Upload Photos" },
  { id: "ai-processing", label: "AI Analysis" },
  { id: "damage-detection", label: "Damage Review" },
  { id: "verification", label: "Verify & Cost" },
];
function renderStepper(currentId) {
  const idx = WORKFLOW_STEPS.findIndex((s) => s.id === currentId);
  const pct = Math.round(((idx + 1) / WORKFLOW_STEPS.length) * 100);
  return `
  <div style="font-size:11.5px;color:var(--ink-500);margin-bottom:10px;">Step ${idx + 1} of ${WORKFLOW_STEPS.length} · ${pct}% complete</div>
  <div class="stepper">
    ${WORKFLOW_STEPS.map(
      (s, i) => `
      <div class="step ${i < idx ? "done" : ""} ${i === idx ? "active" : ""}">
        <div class="step-circle">${i < idx ? "✓" : i + 1}</div>
        <div class="step-label">${s.label}</div>
      </div>
      ${i < WORKFLOW_STEPS.length - 1 ? `<div class="step-line ${i < idx ? "done" : ""}"></div>` : ""}
    `,
    ).join("")}
  </div>`;
}

/* ---------- New Assessment: vehicle info ---------- */
function renderNewAssessment() {
  const v = state.newAssessment.vehicle;
  const claimId = v.claim || "CLM-" + Math.floor(10000 + Math.random() * 89999);
  return `
  ${renderStepper("new-assessment")}
  <div class="grid g-12-8">
    <div class="card">
      <div class="card-title">Vehicle &amp; policy information</div>
      <div class="card-desc">This information will be attached to the assessment and final report.</div>
      <div class="row-2">
        <div class="field"><label>Policy number</label><input class="input" id="f_policy" value="${v.policy || "POL-2026-8841"}"></div>
        <div class="field"><label>Claim number</label><input class="input" id="f_claim" value="${claimId}"></div>
      </div>
      <div class="row-2">
        <div class="field"><label>Policyholder name</label><input class="input" id="f_owner" placeholder="e.g. Budi Santoso" value="${v.owner || ""}"></div>
        <div class="field"><label>License plate</label><input class="input" id="f_plate" placeholder="e.g. B 1234 XYZ" value="${v.plate || ""}"></div>
      </div>
      <div class="row-3">
        <div class="field"><label>Brand</label>
          <select class="select" id="f_brand">${BRANDS.map((b) => `<option ${v.brand === b ? "selected" : ""}>${b}</option>`).join("")}</select>
        </div>
        <div class="field"><label>Model</label>
          <select class="select" id="f_model">${MODELS.map((m) => `<option ${v.model === m ? "selected" : ""}>${m}</option>`).join("")}</select>
        </div>
        <div class="field"><label>Year</label><input class="input" id="f_year" type="number" min="2000" max="2026" value="${v.year || 2023}"></div>
      </div>
      <div class="row-2">
        <div class="field"><label>Odometer (km)</label><input class="input" id="f_odo" type="number" value="${v.odo || 42500}"></div>
        <div class="field"><label>Inspection location</label><input class="input" id="f_loc" value="${v.loc || "Malang, East Java"}"></div>
      </div>
      <div class="field"><label>Incident notes</label><textarea class="input" id="f_notes" placeholder="Brief description of the incident...">${v.notes || ""}</textarea></div>
      <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:6px;">
        <button class="btn btn-ghost" data-nav="dashboard">Cancel</button>
        <button class="btn btn-primary" id="toUpload">Continue to Upload Photos →</button>
      </div>
    </div>
    <div>
      <div class="card" style="margin-bottom:16px;">
        <div class="card-title">Claim Summary</div>
        <div class="card-desc">Quick overview of this assessment</div>
        <div class="summary-row"><span>Claim ID</span><strong>${claimId}</strong></div>
        <div class="summary-row"><span>Vehicle</span><strong>${v.brand || BRANDS[0]} ${v.model || MODELS[0]}${v.year ? ", " + v.year : ""}</strong></div>
        <div class="summary-row"><span>Inspection location</span><strong>${v.loc || "Malang, East Java"}</strong></div>
      </div>
      <div class="card">
        <div class="card-title">Assessment Progress</div>
        <div class="card-desc">Complete all steps to finish the assessment</div>
        ${WORKFLOW_STEPS.map(
          (s, i) => `
          <div class="progress-step ${i === 0 ? "active" : ""}">
            <div class="progress-step-dot">${i === 0 ? "1" : i + 1}</div>
            <span>${s.label}</span>
          </div>`,
        ).join("")}
        <div class="banner banner-info" style="margin-top:14px;">${ICONS.info}<div>After completing all steps, you'll be able to generate the final assessment report.</div></div>
      </div>
    </div>
  </div>`;
}
function after_new_assessment() {
  document.getElementById("toUpload").onclick = () => {
    const g = (id) => document.getElementById(id).value;
    if (!g("f_owner") || !g("f_plate")) {
      toast("Please fill in policyholder name and plate number");
      return;
    }
    state.newAssessment.vehicle = {
      policy: g("f_policy"),
      claim: g("f_claim"),
      owner: g("f_owner"),
      plate: g("f_plate"),
      brand: g("f_brand"),
      model: g("f_model"),
      year: g("f_year"),
      odo: g("f_odo"),
      loc: g("f_loc"),
      notes: g("f_notes"),
    };
    goto("upload-photos");
  };
}

/* ---------- Upload photos ---------- */
function renderUploadPhotos() {
  const photos = state.newAssessment.photos;
  return `
  ${renderStepper("upload-photos")}
  <div class="card">
    <div class="card-title">Upload vehicle photos</div>
    <div class="card-desc">Add at least 3 photos covering the damaged area and a full vehicle view. JPG/PNG, up to 10 photos.</div>
    <div class="dropzone" id="dz">
      <div class="dz-icon">${ICONS.upload}</div>
      <div style="font-size:13.5px;font-weight:600;color:var(--navy-900);">Drag &amp; drop photos here</div>
      <div style="font-size:12px;color:var(--ink-500);margin:4px 0 14px;">or click to browse from your device</div>
      <button class="btn btn-accent btn-sm" id="browseBtn">Browse files</button>
      <input type="file" id="fileInput" accept="image/*" multiple style="display:none;">
    </div>
    ${
      photos.length
        ? `<div class="photo-grid">${photos
            .map(
              (p, i) => `
        <div class="photo-thumb">
          <img src="${p.src}">
          <div class="tag">${p.name.length > 18 ? p.name.slice(0, 15) + "…" : p.name}</div>
          <button class="rm" data-rm="${i}">${ICONS.x}</button>
        </div>`,
            )
            .join("")}
      </div>`
        : `<div class="empty-state" style="padding:20px 0 0;">No photos uploaded yet.</div>`
    }
    <div style="display:flex;justify-content:space-between;align-items:center;margin-top:22px;">
      <div style="font-size:12px;color:var(--ink-500);">${photos.length} photo${photos.length === 1 ? "" : "s"} uploaded</div>
      <div style="display:flex;gap:10px;">
        <button class="btn btn-ghost" data-nav="new-assessment">← Back</button>
        <button class="btn btn-primary" id="toAi" ${photos.length < 1 ? "disabled" : ""}>Start AI Analysis →</button>
      </div>
    </div>
  </div>`;
}
function after_upload_photos() {
  const dz = document.getElementById("dz");
  const fileInput = document.getElementById("fileInput");
  document.getElementById("browseBtn").onclick = () => fileInput.click();
  dz.addEventListener("click", (e) => {
    if (e.target.id === "dz") fileInput.click();
  });
  ["dragover", "dragenter"].forEach((ev) =>
    dz.addEventListener(ev, (e) => {
      e.preventDefault();
      dz.classList.add("drag");
    }),
  );
  ["dragleave", "drop"].forEach((ev) =>
    dz.addEventListener(ev, (e) => {
      e.preventDefault();
      dz.classList.remove("drag");
    }),
  );
  dz.addEventListener("drop", (e) => handleFiles(e.dataTransfer.files));
  fileInput.addEventListener("change", (e) => handleFiles(e.target.files));
  document.querySelectorAll("[data-rm]").forEach(
    (b) =>
      (b.onclick = () => {
        state.newAssessment.photos.splice(+b.dataset.rm, 1);
        renderContent();
      }),
  );
  const toAi = document.getElementById("toAi");
  if (toAi)
    toAi.onclick = () => {
      state.aiProgress = 0;
      goto("ai-processing");
    };
}
function handleFiles(files) {
  [...files].slice(0, 10 - state.newAssessment.photos.length).forEach((f) => {
    if (!f.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      state.newAssessment.photos.push({ name: f.name, src: e.target.result });
      renderContent();
    };
    reader.readAsDataURL(f);
  });
}

/* ---------- AI processing (animated) ---------- */
const AI_STAGES = [
  "Preprocessing uploaded images",
  "Localizing vehicle & panel regions",
  "Detecting damage regions",
  "Classifying damage type & severity",
  "Cross-referencing detection confidence",
  "Compiling findings for surveyor review",
];
function renderAiProcessing() {
  return `
  ${renderStepper("ai-processing")}
  <div class="card">
    <div class="ai-processing-wrap">
      <div class="ai-ring">
        <svg viewBox="0 0 120 120">
          <circle class="bg" cx="60" cy="60" r="52"></circle>
          <circle class="fg" id="ringFg" cx="60" cy="60" r="52" stroke-dasharray="326.7" stroke-dashoffset="326.7"></circle>
        </svg>
        <div class="pct" id="ringPct">0%</div>
      </div>
      <div class="ai-stage" id="aiStageText">${AI_STAGES[0]}</div>
      <div class="ai-substage">Analyzing ${state.newAssessment.photos.length} photo${state.newAssessment.photos.length === 1 ? "" : "s"} for ${state.newAssessment.vehicle.brand || ""} ${state.newAssessment.vehicle.model || ""}</div>
      <div class="ai-loglist" id="aiLog">
        ${AI_STAGES.map((s, i) => `<div class="ai-logitem" data-log="${i}"><div class="chk"></div><span>${s}</span></div>`).join("")}
      </div>
    </div>
  </div>`;
}
function after_ai_processing() {
  const circumference = 326.7;
  let pct = 0;
  const ring = document.getElementById("ringFg");
  const ringPct = document.getElementById("ringPct");
  const stageText = document.getElementById("aiStageText");
  const timer = setInterval(() => {
    pct += 2 + Math.random() * 4;
    if (pct >= 100) {
      pct = 100;
      clearInterval(timer);
    }
    ring.style.strokeDashoffset = (circumference * (1 - pct / 100)).toFixed(1);
    ringPct.textContent = Math.round(pct) + "%";
    const stageIdx = Math.min(
      AI_STAGES.length - 1,
      Math.floor((pct / 100) * AI_STAGES.length),
    );
    stageText.textContent = AI_STAGES[stageIdx];
    document.querySelectorAll("[data-log]").forEach((el) => {
      if (+el.dataset.log <= stageIdx) el.classList.add("on");
    });
    if (pct >= 100) {
      generateAiDamages();
      setTimeout(() => goto("damage-detection"), 500);
    }
  }, 220);
}
function generateAiDamages() {
  const v = state.newAssessment.vehicle;
  // Prefer rows matching the selected brand/model from the dataset; else sample broadly.
  let pool = RAW_DATA.filter((d) => d.brand === v.brand && d.model === v.model);
  if (pool.length < 2) pool = RAW_DATA.filter((d) => d.brand === v.brand);
  if (pool.length < 2) pool = RAW_DATA;
  const n = Math.min(pool.length, 2 + Math.floor(Math.random() * 3));
  const shuffled = pool
    .slice()
    .sort(() => Math.random() - 0.5)
    .slice(0, n);
  const positions = {
    bumper: { top: 70, left: 28, w: 44, h: 20 },
    fender: { top: 38, left: 8, w: 26, h: 28 },
    door: { top: 34, left: 38, w: 26, h: 36 },
    windshield: { top: 8, left: 32, w: 36, h: 20 },
    headlamp: { top: 34, left: 4, w: 18, h: 14 },
  };
  state.newAssessment.damages = shuffled.map((d, i) => {
    const p = positions[d.part] || { top: 40, left: 40, w: 22, h: 18 };
    return {
      id: i + 1,
      part: d.part,
      damageType: d.damageType,
      severity: d.severity,
      aiConfidence: d.confidence,
      confidence: d.confidence,
      manual: false,
      pos: {
        top: p.top + (Math.random() * 6 - 3),
        left: p.left + (Math.random() * 6 - 3),
        w: p.w,
        h: p.h,
      },
      verified: false,
      comment: "",
    };
  });
  state.ddSelected = 0;
}

/* ---------- Damage detection (editable) ---------- */
function renderDamageDetection() {
  const dmgs = state.newAssessment.damages;
  const photo = state.newAssessment.photos[0];
  return `
  ${renderStepper("damage-detection")}
  <div class="banner banner-info" style="margin-bottom:16px;">
    ${ICONS.spark}
    <div>AI detected <strong>${dmgs.length} damage region${dmgs.length === 1 ? "" : "s"}</strong> on this vehicle. Adjust part, damage type, severity, or confidence below — every field is editable before it goes to surveyor verification.</div>
  </div>
  <div class="dd-layout">
    <div>
      <div class="img-stage">
        ${photo ? `<img src="${photo.src}">` : `<div style="aspect-ratio:4/3;display:flex;align-items:center;justify-content:center;color:#8DA2C0;">${ICONS.car}</div>`}
        ${dmgs
          .map(
            (d, i) => `
          <div class="bbox ${state.ddSelected === i ? "sel" : ""}" data-box="${i}" style="top:${d.pos.top}%;left:${d.pos.left}%;width:${d.pos.w}%;height:${d.pos.h}%;">
            <div class="lbl">${d.part} · ${Math.round(d.confidence * 100)}%</div>
          </div>`,
          )
          .join("")}
      </div>
      <div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap;">
        ${state.newAssessment.photos.map((p, i) => `<img src="${p.src}" style="width:64px;height:48px;object-fit:cover;border-radius:6px;border:1px solid var(--line);cursor:pointer;">`).join("")}
      </div>
    </div>
    <div>
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
        <div style="font-size:13px;font-weight:600;color:var(--navy-900);">Detected damage (${dmgs.length})</div>
        <button class="btn btn-ghost btn-sm" id="addDmg">${ICONS.plus} Add manual entry</button>
      </div>
      <div id="dmgList">${dmgs.map((d, i) => renderDmgItem(d, i)).join("")}</div>
      <div style="display:flex;justify-content:space-between;gap:10px;margin-top:16px;">
        <button class="btn btn-ghost" data-nav="upload-photos">← Back</button>
        <button class="btn btn-primary" id="toVerify" ${dmgs.length < 1 ? "disabled" : ""}>Continue to Verification →</button>
      </div>
    </div>
  </div>`;
}
function renderDmgItem(d, i) {
  return `
  <div class="dmg-item ${state.ddSelected === i ? "sel" : ""}" data-item="${i}">
    <div class="dmg-item-top">
      <div class="dmg-item-title">Region ${i + 1} ${d.manual ? '<span class="badge badge-neutral">Manual</span>' : ""}</div>
      <button class="btn btn-ghost btn-sm" data-del="${i}" title="Remove">${ICONS.trash}</button>
    </div>
    <div class="row-2">
      <div class="field" style="margin-bottom:8px;"><label>Part</label>
        <select class="select" data-field="part" data-idx="${i}">${PARTS.map((p) => `<option ${d.part === p ? "selected" : ""}>${p}</option>`).join("")}</select>
      </div>
      <div class="field" style="margin-bottom:8px;"><label>Damage type</label>
        <select class="select" data-field="damageType" data-idx="${i}">${DAMAGE_TYPES.map((t) => `<option ${d.damageType === t ? "selected" : ""}>${t}</option>`).join("")}</select>
      </div>
    </div>
    <div class="field" style="margin-bottom:8px;"><label>Severity</label>
      <select class="select" data-field="severity" data-idx="${i}">${SEVERITIES.map((s) => `<option ${d.severity === s ? "selected" : ""}>${s}</option>`).join("")}</select>
    </div>
    <div style="font-size:11px;color:var(--ink-500);display:flex;justify-content:space-between;">
      <span>${d.manual ? "Manually added — no AI score" : "AI confidence"}</span>
      <span style="font-family:var(--font-mono);">${d.manual ? "—" : Math.round(d.confidence * 100) + "%"}</span>
    </div>
    ${!d.manual ? `<div class="conf-bar"><div class="conf-bar-fill" style="width:${d.confidence * 100}%;"></div></div>` : ""}
  </div>`;
}
function after_damage_detection() {
  document.querySelectorAll("[data-box]").forEach(
    (b) =>
      (b.onclick = () => {
        state.ddSelected = +b.dataset.box;
        renderContent();
      }),
  );
  document.querySelectorAll("[data-item]").forEach((b) =>
    b.addEventListener("click", (e) => {
      if (e.target.closest("select") || e.target.closest("[data-del]")) return;
      state.ddSelected = +b.dataset.item;
      renderContent();
    }),
  );
  document.querySelectorAll("[data-field]").forEach(
    (sel) =>
      (sel.onchange = () => {
        const d = state.newAssessment.damages[+sel.dataset.idx];
        d[sel.dataset.field] = sel.value;
        toast("Updated " + sel.dataset.field);
      }),
  );
  document.querySelectorAll("[data-del]").forEach(
    (b) =>
      (b.onclick = (e) => {
        e.stopPropagation();
        state.newAssessment.damages.splice(+b.dataset.del, 1);
        state.ddSelected = 0;
        renderContent();
      }),
  );
  const addBtn = document.getElementById("addDmg");
  if (addBtn)
    addBtn.onclick = () => {
      state.newAssessment.damages.push({
        id: Date.now(),
        part: PARTS[0],
        damageType: DAMAGE_TYPES[0],
        severity: "minor",
        aiConfidence: null,
        confidence: 0,
        manual: true,
        pos: {
          top: 45 + Math.random() * 10,
          left: 45 + Math.random() * 10,
          w: 22,
          h: 18,
        },
        verified: false,
        comment: "",
      });
      state.ddSelected = state.newAssessment.damages.length - 1;
      renderContent();
    };
  const toVerify = document.getElementById("toVerify");
  if (toVerify) toVerify.onclick = () => goto("verification");
}

/* ---------- Verification & cost estimation ---------- */
function matchTierLabel(tier) {
  if (tier === 1) return "Matched: part, damage, severity, brand &amp; model";
  if (tier === 2) return "Matched: part, damage, severity &amp; brand";
  if (tier === 3) return "Matched: part, damage &amp; severity";
  return "";
}
function costBreakdownHTML(rec) {
  return `
    <div class="summary-row"><span>Spare Part</span><strong>${fmtIDR(rec.sparePartCost)}</strong></div>
    <div class="summary-row"><span>Labor</span><strong>${fmtIDR(rec.laborCost)}</strong></div>
    <div class="summary-row"><span>Painting</span><strong>${fmtIDR(rec.paintingCost)}</strong></div>
    <div class="summary-row"><span>Additional</span><strong>${fmtIDR(rec.additionalCost)}</strong></div>
    <div class="summary-row" style="border-top:1px solid var(--line);padding-top:9px;margin-top:2px;"><span style="font-weight:700;color:var(--navy-900);">Estimated Total</span><strong style="color:var(--navy-900);">${fmtIDR(rec.estimatedTotalCost)}</strong></div>
    <div class="summary-row"><span>Cost Range</span><strong>${fmtIDR(rec.costMin)} – ${fmtIDR(rec.costMax)}</strong></div>
  `;
}
function renderVerification() {
  const dmgs = state.newAssessment.damages;
  const v = state.newAssessment.vehicle;
  dmgs.forEach((d) => { d.priceMatch = matchPricing(d.part, d.damageType, d.severity, v.brand, v.model, v.year); });
  const matched = dmgs.filter((d) => d.priceMatch);
  const unmatched = dmgs.filter((d) => !d.priceMatch);
  const total = matched.reduce((s, d) => s + d.priceMatch.record.estimatedTotalCost, 0);
  const partsSub = matched.reduce((s, d) => s + d.priceMatch.record.sparePartCost, 0);
  const laborSub = matched.reduce((s, d) => s + d.priceMatch.record.laborCost, 0);
  const paintSub = matched.reduce((s, d) => s + d.priceMatch.record.paintingCost, 0);
  const addSub = matched.reduce((s, d) => s + d.priceMatch.record.additionalCost, 0);
  const allVerified = dmgs.length > 0 && dmgs.every((d) => d.verified);
  return `
  ${renderStepper("verification")}
  <div class="banner banner-info" style="margin-bottom:16px;">
    ${ICONS.info}
    <div><strong>Repair costs are estimated automatically</strong> from the SAVERA repair-cost dataset, matched by part, damage type, severity, and vehicle (${v.brand || "—"} ${v.model || "—"} ${v.year || ""}). Figures are read-only — the estimator can review the breakdown per item below.</div>
  </div>
  ${unmatched.length ? `<div class="banner banner-warn" style="margin-bottom:16px;">${ICONS.warn}<div><strong>${unmatched.length} item${unmatched.length === 1 ? "" : "s"} have no matching pricing record</strong> and show "Pricing data unavailable" — they are excluded from the cost summary below.</div></div>` : ""}
  <div class="grid g-12-8">
    <div class="card">
      <div class="card-title">Damage verification &amp; cost estimation</div>
      <div class="card-desc">${v.brand || ""} ${v.model || ""} ${v.year || ""} · Plate ${v.plate || "—"}</div>
      <div class="table-wrap">
        <table>
          <thead><tr><th></th><th>Part</th><th>Damage</th><th>Severity</th><th>AI Confidence</th><th>Estimated Repair Cost</th><th></th></tr></thead>
          <tbody>
            ${dmgs
              .map((d, i) => {
                const m = d.priceMatch;
                return `
              <tr>
                <td><input type="checkbox" data-verify="${i}" ${d.verified ? "checked" : ""}></td>
                <td style="text-transform:capitalize;">${d.part}</td>
                <td style="text-transform:capitalize;">${d.damageType}</td>
                <td>${badgeSeverity(d.severity)}</td>
                <td style="font-family:var(--font-mono);">${d.manual ? "—" : Math.round(d.confidence * 100) + "%"}</td>
                <td style="font-family:var(--font-mono);font-weight:600;color:${m ? "var(--navy-900)" : "var(--ink-500)"};">${m ? fmtIDR(m.record.estimatedTotalCost) : "Pricing data unavailable"}</td>
                <td>${m ? `<details class="cost-breakdown"><summary>View Breakdown</summary><div style="padding-top:8px;">${costBreakdownHTML(m.record)}<div style="font-size:10.5px;color:var(--ink-500);margin-top:6px;">${matchTierLabel(m.tier)}</div></div></details>` : ""}</td>
              </tr>`;
              })
              .join("")}
          </tbody>
        </table>
      </div>
      <div class="field" style="margin-top:16px;"><label>Estimator comments</label>
        <textarea class="input" id="surveyComment" placeholder="Notes on discrepancies, additional context, or conditions for approval...">${state.newAssessment.verification.comment || ""}</textarea>
      </div>
    </div>
    <div>
      <div class="card" style="margin-bottom:18px;">
        <div class="card-title">Cost summary</div>
        <div class="card-desc">Automatically calculated from matched pricing records</div>
        <div class="summary-row"><span>Parts subtotal</span><strong>${fmtIDR(partsSub)}</strong></div>
        <div class="summary-row"><span>Labor subtotal</span><strong>${fmtIDR(laborSub)}</strong></div>
        <div class="summary-row"><span>Painting subtotal</span><strong>${fmtIDR(paintSub)}</strong></div>
        <div class="summary-row"><span>Additional cost</span><strong>${fmtIDR(addSub)}</strong></div>
        <div class="summary-row" style="border-top:1px solid var(--line);padding-top:10px;margin-top:2px;"><span style="font-weight:700;color:var(--navy-900);font-size:13.5px;">Estimated total</span><strong style="color:var(--navy-900);font-size:14.5px;">${fmtIDR(total)}</strong></div>
        <div style="font-size:11px;color:var(--ink-500);margin-top:8px;">${unmatched.length ? unmatched.length + " item(s) excluded — no pricing match." : "All items priced from the dataset."}</div>
      </div>
      <div class="card">
        <div class="card-title">Repair Decision</div>
        <div class="card-desc">Final repair decision is verified by the estimator.</div>
        <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:14px;">
          ${["Proceed with Repair", "Requires Estimator Review", "Hold for Inspection"]
            .map(
              (opt, i) => `
          <label style="display:flex;align-items:center;gap:8px;font-size:12.8px;padding:9px 10px;border:1px solid var(--line);border-radius:8px;cursor:pointer;">
            <input type="radio" name="decision" value="${opt}" ${state.newAssessment.verification.decision === opt || (!state.newAssessment.verification.decision && i === 0) ? "checked" : ""}> ${opt}
          </label>`,
            )
            .join("")}
        </div>
        <button class="btn btn-accent btn-block" id="finalizeBtn" style="padding:12px;" ${!allVerified ? "disabled" : ""}>${ICONS.check} Finalize Assessment</button>
        ${!allVerified ? `<div class="hint" style="margin-top:8px;">Check off each damage item to confirm verification before finalizing.</div>` : ""}
      </div>
    </div>
  </div>
  <div style="display:flex;justify-content:flex-start;margin-top:16px;">
    <button class="btn btn-ghost" data-nav="damage-detection">← Back to Damage Review</button>
  </div>
  `;
}
function after_verification() {
  document.querySelectorAll("[data-verify]").forEach(
    (cb) =>
      (cb.onchange = () => {
        state.newAssessment.damages[+cb.dataset.verify].verified = cb.checked;
        renderContent();
      }),
  );
  const finalizeBtn = document.getElementById("finalizeBtn");
  if (finalizeBtn)
    finalizeBtn.onclick = () => {
      const decision =
        document.querySelector('input[name="decision"]:checked')?.value ||
        "Proceed with Repair";
      state.newAssessment.verification = {
        comment: document.getElementById("surveyComment").value,
        decision,
        finalizedAt: new Date(),
      };
      state.newAssessment.finalized = true;
      const v = state.newAssessment.vehicle;
      const dmgs = state.newAssessment.damages;
      const matched = dmgs.filter((d) => d.priceMatch);
      const newId = "SVR-2026-" + String(2000 + state.history.length);
      const statusMap = {
        "Proceed with Repair": "Approved",
        "Requires Estimator Review": "In Review",
        "Hold for Inspection": "Pending Verification",
      };
      const record = {
        assessmentId: newId,
        plate: v.plate,
        brand: v.brand,
        model: v.model,
        year: +v.year,
        part: dmgs.map((d) => d.part).join(", "),
        damageType: dmgs.map((d) => d.damageType).join(", "),
        severity: dmgs.reduce(
          (worst, d) =>
            SEVERITIES.indexOf(d.severity) > SEVERITIES.indexOf(worst)
              ? d.severity
              : worst,
          "minor",
        ),
        confidence:
          dmgs
            .filter((d) => !d.manual)
            .reduce((s, d, _, arr) => s + d.confidence / arr.length, 0) || 0.9,
        date: new Date(),
        status: statusMap[decision] || "Approved",
        surveyor: state.user?.name || "Estimator",
        cost: matched.reduce((s, d) => s + d.priceMatch.record.estimatedTotalCost, 0),
        pricingIncomplete: dmgs.length - matched.length,
        damages: JSON.parse(JSON.stringify(dmgs)),
        vehicle: { ...v },
        decision,
        comment: state.newAssessment.verification.comment,
        photos: state.newAssessment.photos,
      };
      state.history.unshift(record);
      state.reportOf = record;
      toast("Assessment finalized");
      goto("report-view");
    };
}

/* ---------- History & Analytics ---------- */
function renderHistory() {
  const f = state.historyFilter;
  let rows = state.history.filter((h) => {
    const q = f.q.toLowerCase();
    const matchesQ =
      !q ||
      h.assessmentId.toLowerCase().includes(q) ||
      h.plate.toLowerCase().includes(q) ||
      h.brand.toLowerCase().includes(q) ||
      h.model.toLowerCase().includes(q) ||
      h.part.toLowerCase().includes(q);
    const matchesStatus = f.status === "all" || h.status === f.status;
    const matchesSev = f.severity === "all" || h.severity === f.severity;
    return matchesQ && matchesStatus && matchesSev;
  });
  rows.sort((a, b) => {
    let av = a[f.sortKey],
      bv = b[f.sortKey];
    if (f.sortKey === "date") {
      av = a.date.getTime();
      bv = b.date.getTime();
    }
    if (typeof av === "string") {
      av = av.toLowerCase();
      bv = bv.toLowerCase();
    }
    if (av < bv) return f.sortDir === "asc" ? -1 : 1;
    if (av > bv) return f.sortDir === "asc" ? 1 : -1;
    return 0;
  });
  const sortArrow = (key) =>
    f.sortKey === key ? (f.sortDir === "asc" ? "↑" : "↓") : "";
  return `
  <div class="tab-bar">
    <button class="tab-btn ${state.historyTab !== "analytics" ? "active" : ""}" id="tabList">Assessment list</button>
    <button class="tab-btn ${state.historyTab === "analytics" ? "active" : ""}" id="tabAnalytics">Analytics</button>
  </div>
  ${
    state.historyTab === "analytics"
      ? renderAnalyticsTab()
      : `
  <div class="card">
    <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;">
      <div style="position:relative;flex:1;min-width:220px;">
        <span style="position:absolute;left:11px;top:11px;color:var(--ink-500);">${ICONS.search}</span>
        <input class="input" id="histSearch" placeholder="Search by ID, plate, brand, model, part..." style="padding-left:36px;" value="${f.q}">
      </div>
      <select class="select" id="histStatus" style="width:180px;">
        <option value="all">All statuses</option>
        ${STATUSES.map((s) => `<option ${f.status === s ? "selected" : ""}>${s}</option>`).join("")}
      </select>
      <select class="select" id="histSeverity" style="width:160px;">
        <option value="all">All severities</option>
        ${SEVERITIES.map((s) => `<option ${f.severity === s ? "selected" : ""}>${s[0].toUpperCase() + s.slice(1)}</option>`).join("")}
      </select>
    </div>
    <div class="table-wrap">
      <table>
        <thead><tr>
          <th class="sortable" data-sort="assessmentId">Assessment <span class="arrow">${sortArrow("assessmentId")}</span></th>
          <th class="sortable" data-sort="brand">Vehicle <span class="arrow">${sortArrow("brand")}</span></th>
          <th>Plate</th>
          <th>Damage</th>
          <th class="sortable" data-sort="severity">Severity <span class="arrow">${sortArrow("severity")}</span></th>
          <th class="sortable" data-sort="status">Status <span class="arrow">${sortArrow("status")}</span></th>
          <th class="sortable" data-sort="date">Date <span class="arrow">${sortArrow("date")}</span></th>
          <th>Surveyor</th><th></th>
        </tr></thead>
        <tbody>
          ${
            rows.length
              ? rows
                  .map(
                    (h) => `
            <tr>
              <td style="font-family:var(--font-mono);font-size:12px;">${h.assessmentId}</td>
              <td>${h.brand} ${h.model} '${String(h.year).slice(2)}</td>
              <td style="font-family:var(--font-mono);font-size:12px;">${h.plate}</td>
              <td style="text-transform:capitalize;max-width:160px;">${h.part}</td>
              <td>${badgeSeverity(h.severity)}</td>
              <td>${badgeStatus(h.status)}</td>
              <td style="color:var(--ink-500);">${fmtDate(h.date)}</td>
              <td style="color:var(--ink-500);">${h.surveyor}</td>
              <td><button class="btn btn-ghost btn-sm" data-view-report="${h.assessmentId}">View</button></td>
            </tr>`,
                  )
                  .join("")
              : `<tr><td colspan="9"><div class="empty-state">${ICONS.search}<div>No assessments match your filters.</div></div></td></tr>`
          }
        </tbody>
      </table>
    </div>
    <div style="font-size:11.5px;color:var(--ink-500);margin-top:12px;">Showing ${rows.length} of ${state.history.length} assessments</div>
  </div>`
  }
  `;
}
function renderAnalyticsTab() {
  const total = state.history.length;
  const pending = state.history.filter(
    (h) => h.status === "Pending Verification",
  ).length;
  const approved = state.history.filter((h) => h.status === "Approved").length;
  const avgConf = Math.round(
    (state.history.reduce((a, h) => a + h.confidence, 0) / total) * 100,
  );
  const byBrand = {};
  state.history.forEach((h) => {
    byBrand[h.brand] = (byBrand[h.brand] || 0) + 1;
  });
  const brandRows = Object.entries(byBrand).sort((a, b) => b[1] - a[1]);
  const maxBrand = Math.max(...brandRows.map((r) => r[1]));
  return `
  <div class="grid g-4" style="margin-bottom:18px;">
    ${statCard("Total Assessments", total, ICONS.dashboard, "var(--info-bg)", "#2954A6", "↑ live count", "up")}
    ${statCard("Pending Verification", pending, ICONS.clock, "var(--warn-bg)", "var(--warn)", pending + " need review", "")}
    ${statCard("Approved Claims", approved, ICONS.check, "var(--ok-bg)", "var(--ok)", Math.round((approved / total) * 100) + "% of total", "up")}
    ${statCard("Avg. AI Confidence", avgConf + "%", ICONS.spark, "var(--cyan-050)", "#0A7C93", "model score", "")}
  </div>
  <div class="grid g-12-8" style="margin-bottom:18px;align-items:stretch;">
    <div class="card"><div class="card-title">Damage Type Distribution</div><div class="card-desc">Based on AI analysis of detected damage</div><canvas id="anType" height="230"></canvas></div>
    <div class="card">
      <div class="card-title">Assessments by Brand</div>
      <div class="card-desc">Top vehicle brands in assessment</div>
      <div style="display:flex;flex-direction:column;gap:12px;margin-top:6px;">
        ${brandRows
          .map(
            ([brand, count]) => `
          <div>
            <div style="display:flex;justify-content:space-between;font-size:12.3px;margin-bottom:5px;"><span style="font-weight:600;color:var(--navy-900);">${brand}</span><span style="color:var(--ink-500);font-family:var(--font-mono);">${count}</span></div>
            <div class="brand-bar"><div class="brand-bar-fill" style="width:${((count / maxBrand) * 100).toFixed(0)}%;"></div></div>
          </div>`,
          )
          .join("")}
      </div>
    </div>
  </div>
  <div class="grid g-2">
    <div class="card"><div class="card-title">Severity Distribution</div><div class="card-desc">Based on damage severity level</div><canvas id="anSev" height="220"></canvas></div>
    <div class="card"><div class="card-title">Claim Status Trend</div><div class="card-desc">Monthly claim status over the last few months</div><canvas id="anTrend" height="220"></canvas></div>
  </div>
  <div class="banner banner-info" style="margin-top:18px;">${ICONS.info}<div>Cost analytics (average repair cost, cost-by-part, loss ratios) will appear here once a repair-cost dataset is supplied — figures are not estimated in the absence of real pricing data.</div></div>
  `;
}
function after_history() {
  const tabList = document.getElementById("tabList"),
    tabAn = document.getElementById("tabAnalytics");
  if (tabList)
    tabList.onclick = () => {
      state.historyTab = "list";
      renderContent();
    };
  if (tabAn)
    tabAn.onclick = () => {
      state.historyTab = "analytics";
      renderContent();
    };
  if (state.historyTab === "analytics") {
    const byType = {},
      bySev = { minor: 0, moderate: 0, severe: 0 };
    const byMonthStatus = {};
    state.history.forEach((h) => {
      byType[h.damageType] = (byType[h.damageType] || 0) + 1;
      bySev[h.severity] = (bySev[h.severity] || 0) + 1;
      const key = h.date.toLocaleDateString("en-GB", {
        month: "short",
        year: "2-digit",
      });
      if (!byMonthStatus[key])
        byMonthStatus[key] = {
          Approved: 0,
          "Pending Verification": 0,
          "In Review": 0,
          Rejected: 0,
        };
      byMonthStatus[key][h.status] = (byMonthStatus[key][h.status] || 0) + 1;
    });
    new Chart(document.getElementById("anType"), {
      type: "bar",
      data: {
        labels: Object.keys(byType),
        datasets: [
          {
            data: Object.values(byType),
            backgroundColor: "#00B8D9",
            borderRadius: 6,
            maxBarThickness: 44,
          },
        ],
      },
      options: {
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true, ticks: { precision: 0 } },
          x: { grid: { display: false } },
        },
      },
    });
    new Chart(document.getElementById("anSev"), {
      type: "doughnut",
      data: {
        labels: ["Minor", "Moderate", "Severe"],
        datasets: [
          {
            data: [bySev.minor, bySev.moderate, bySev.severe],
            backgroundColor: ["#00B8D9", "#B8790A", "#C23B3B"],
            borderWidth: 2,
            borderColor: "#fff",
          },
        ],
      },
      options: {
        cutout: "60%",
        plugins: {
          legend: {
            position: "bottom",
            labels: { boxWidth: 10, font: { size: 11 } },
          },
        },
      },
    });
    const monthKeys = Object.keys(byMonthStatus).reverse();
    new Chart(document.getElementById("anTrend"), {
      type: "line",
      data: {
        labels: monthKeys,
        datasets: [
          {
            label: "Approved",
            data: monthKeys.map((k) => byMonthStatus[k].Approved),
            borderColor: "#1B9C63",
            backgroundColor: "rgba(27,156,99,.08)",
            tension: 0.35,
            pointRadius: 3,
          },
          {
            label: "Pending",
            data: monthKeys.map(
              (k) => byMonthStatus[k]["Pending Verification"],
            ),
            borderColor: "#B8790A",
            backgroundColor: "rgba(184,121,10,.08)",
            tension: 0.35,
            pointRadius: 3,
          },
          {
            label: "Rejected",
            data: monthKeys.map((k) => byMonthStatus[k].Rejected),
            borderColor: "#C23B3B",
            backgroundColor: "rgba(194,59,59,.08)",
            tension: 0.35,
            pointRadius: 3,
          },
        ],
      },
      options: {
        plugins: {
          legend: {
            position: "bottom",
            labels: { boxWidth: 10, font: { size: 11 } },
          },
        },
        scales: {
          y: { beginAtZero: true, ticks: { precision: 0 } },
          x: { grid: { display: false } },
        },
      },
    });
    return;
  }
  const search = document.getElementById("histSearch");
  if (search) {
    search.oninput = () => {
      state.historyFilter.q = search.value;
      renderContent();
      document.getElementById("histSearch").focus();
      document
        .getElementById("histSearch")
        .setSelectionRange(search.value.length, search.value.length);
    };
  }
  const statusSel = document.getElementById("histStatus");
  if (statusSel)
    statusSel.onchange = () => {
      state.historyFilter.status = statusSel.value;
      renderContent();
    };
  const sevSel = document.getElementById("histSeverity");
  if (sevSel)
    sevSel.onchange = () => {
      state.historyFilter.severity = sevSel.value;
      renderContent();
    };
  document.querySelectorAll("th.sortable").forEach(
    (th) =>
      (th.onclick = () => {
        const key = th.dataset.sort;
        if (state.historyFilter.sortKey === key)
          state.historyFilter.sortDir =
            state.historyFilter.sortDir === "asc" ? "desc" : "asc";
        else {
          state.historyFilter.sortKey = key;
          state.historyFilter.sortDir = "asc";
        }
        renderContent();
      }),
  );
  document.querySelectorAll("[data-view-report]").forEach(
    (b) =>
      (b.onclick = () => {
        const rec = state.history.find(
          (h) => h.assessmentId === b.dataset.viewReport,
        );
        state.reportOf = rec;
        goto("report-view");
      }),
  );
}

/* ---------- Reports (list) ---------- */
function renderReports() {
  const q = (state.reportsFilter || "").toLowerCase();
  const rows = state.history.filter(
    (h) =>
      !q ||
      h.assessmentId.toLowerCase().includes(q) ||
      h.brand.toLowerCase().includes(q) ||
      h.model.toLowerCase().includes(q) ||
      h.plate.toLowerCase().includes(q),
  );
  return `
  <div class="card">
    <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:4px;flex-wrap:wrap;">
      <div>
        <div class="card-title">Generate a report</div>
        <div class="card-desc" style="margin-bottom:0;">Select a finalized assessment to preview and export as a formatted report.</div>
      </div>
      <button class="btn btn-ghost btn-sm" id="exportCsv">${ICONS.upload} Export CSV</button>
    </div>
    <div style="position:relative;max-width:340px;margin:14px 0 6px;">
      <span style="position:absolute;left:11px;top:11px;color:var(--ink-500);">${ICONS.search}</span>
      <input class="input" id="repSearch" placeholder="Search by ID, vehicle, or plate..." style="padding-left:36px;" value="${state.reportsFilter || ""}">
    </div>
    <div class="table-wrap">
      <table>
        <thead><tr><th>Assessment</th><th>Vehicle</th><th>Status</th><th>Date</th><th>Surveyor</th><th></th></tr></thead>
        <tbody>
          ${rows
            .map(
              (h) => `
            <tr>
              <td style="font-family:var(--font-mono);font-size:12px;">${h.assessmentId}</td>
              <td>${h.brand} ${h.model} '${String(h.year).slice(2)} · ${h.plate}</td>
              <td>${badgeStatus(h.status)}</td>
              <td style="color:var(--ink-500);">${fmtDate(h.date)}</td>
              <td style="color:var(--ink-500);">${h.surveyor}</td>
              <td><button class="btn btn-primary btn-sm" data-gen="${h.assessmentId}">${ICONS.report} Preview report</button></td>
            </tr>`,
            )
            .join("")}
        </tbody>
      </table>
    </div>
  </div>`;
}
function after_reports() {
  document.querySelectorAll("[data-gen]").forEach(
    (b) =>
      (b.onclick = () => {
        state.reportOf = state.history.find(
          (h) => h.assessmentId === b.dataset.gen,
        );
        goto("report-view");
      }),
  );
  const search = document.getElementById("repSearch");
  if (search)
    search.oninput = () => {
      state.reportsFilter = search.value;
      renderContent();
    };
  const exportBtn = document.getElementById("exportCsv");
  if (exportBtn)
    exportBtn.onclick = () => {
      const header = [
        "Assessment ID",
        "Brand",
        "Model",
        "Year",
        "Plate",
        "Part",
        "Damage Type",
        "Severity",
        "Status",
        "Date",
        "Surveyor",
      ];
      const lines = [header.join(",")].concat(
        state.history.map((h) =>
          [
            h.assessmentId,
            h.brand,
            h.model,
            h.year,
            h.plate,
            h.part,
            h.damageType,
            h.severity,
            h.status,
            fmtDate(h.date),
            h.surveyor,
          ]
            .map((v) => `"${String(v).replace(/"/g, '""')}"`)
            .join(","),
        ),
      );
      const blob = new Blob([lines.join("\n")], { type: "text/csv" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "savera-assessments.csv";
      a.click();
      toast("CSV exported");
    };
}

/* ---------- Report view (printable) ---------- */
function renderReportView() {
  const r = state.reportOf || state.history[0];
  if (!r) return `<div class="empty-state">No assessment selected.</div>`;
  const isLive = !!r.damages;
  const damageRows = isLive
    ? r.damages
    : [
        {
          part: r.part,
          damageType: r.damageType,
          severity: r.severity,
          confidence: r.confidence,
          priceMatch: null,
        },
      ];
  const total = isLive ? r.cost : null;
  return `
  <div class="no-print" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
    <button class="btn btn-ghost" data-nav="history">← Back to history</button>
    <div style="display:flex;gap:10px;">
      <button class="btn btn-ghost" id="printBtn">${ICONS.print} Print / Save as PDF</button>
    </div>
  </div>
  <div class="report-doc">
    <div class="report-head">
      <div>
        <div style="display:flex;align-items:center;gap:9px;margin-bottom:6px;"><div class="sb-mark" style="width:28px;height:28px;font-size:12px;">SV</div><div style="font-weight:700;font-size:15px;color:var(--navy-900);">SAVERA</div></div>
        <div style="font-size:11.5px;color:var(--ink-500);">Smart Automotive Vehicle Evaluation &amp; Repair Assessment</div>
      </div>
      <div style="text-align:right;">
        <div style="font-family:var(--font-mono);font-weight:700;font-size:14px;color:var(--navy-900);">${r.assessmentId}</div>
        <div style="font-size:11.5px;color:var(--ink-500);margin-top:2px;">${fmtDate(r.date)}</div>
        <div style="margin-top:6px;">${badgeStatus(r.status)}</div>
      </div>
    </div>

    <div class="report-sec-title">Vehicle &amp; policy</div>
    <div class="report-kv">
      <div><span>Policyholder</span>${r.vehicle?.owner || "—"}</div>
      <div><span>License plate</span>${r.plate}</div>
      <div><span>Vehicle</span>${r.brand} ${r.model}, ${r.year}</div>
      <div><span>Odometer</span>${r.vehicle?.odo ? r.vehicle.odo + " km" : "—"}</div>
      <div><span>Policy no.</span>${r.vehicle?.policy || "—"}</div>
      <div><span>Claim no.</span>${r.vehicle?.claim || "—"}</div>
      <div><span>Inspection location</span>${r.vehicle?.loc || "—"}</div>
      <div><span>Surveyor</span>${r.surveyor}</div>
    </div>

    ${r.vehicle?.notes ? `<div class="report-sec-title">Incident notes</div><div style="font-size:12.8px;color:var(--ink-700);">${r.vehicle.notes}</div>` : ""}

    <div class="report-sec-title">Damage findings &amp; automatic cost estimate</div>
    <div class="table-wrap">
      <table>
        <thead><tr><th>Part</th><th>Damage type</th><th>Severity</th><th>AI conf.</th><th>Spare Part</th><th>Labor</th><th>Painting</th><th>Additional</th><th>Estimated Cost</th></tr></thead>
        <tbody>
          ${damageRows
            .map((d) => {
              const rec = d.priceMatch?.record;
              return `
            <tr>
              <td style="text-transform:capitalize;">${d.part}</td>
              <td style="text-transform:capitalize;">${d.damageType}</td>
              <td>${badgeSeverity(d.severity)}</td>
              <td style="font-family:var(--font-mono);">${d.manual ? "—" : Math.round((d.confidence || 0) * 100) + "%"}</td>
              <td style="font-family:var(--font-mono);">${rec ? fmtIDR(rec.sparePartCost) : "—"}</td>
              <td style="font-family:var(--font-mono);">${rec ? fmtIDR(rec.laborCost) : "—"}</td>
              <td style="font-family:var(--font-mono);">${rec ? fmtIDR(rec.paintingCost) : "—"}</td>
              <td style="font-family:var(--font-mono);">${rec ? fmtIDR(rec.additionalCost) : "—"}</td>
              <td style="font-family:var(--font-mono);font-weight:600;">${rec ? fmtIDR(rec.estimatedTotalCost) : "Pricing data unavailable"}</td>
            </tr>`;
            })
            .join("")}
        </tbody>
      </table>
    </div>
    <div style="display:flex;justify-content:flex-end;margin-top:10px;font-size:14px;font-weight:700;color:var(--navy-900);">
      Estimated total: <span style="font-family:var(--font-mono);margin-left:8px;">${fmtIDR(total)}</span>
    </div>
    ${r.pricingIncomplete ? `<div style="font-size:11px;color:var(--warn);margin-top:4px;text-align:right;">${r.pricingIncomplete} item(s) excluded — no pricing match available.</div>` : ""}

    ${r.decision ? `<div class="report-sec-title">Repair decision</div><div style="font-size:12.8px;"><strong>${r.decision}</strong>${r.comment ? " — " + r.comment : ""}<div style="font-size:11px;color:var(--ink-500);margin-top:4px;">Final repair decision is verified by the estimator.</div></div>` : ""}

    <div class="report-sec-title">Sign-off</div>
    <div class="row-2">
      <div><div style="font-size:11.5px;color:var(--ink-500);margin-bottom:4px;">Surveyor signature</div><div class="sig-box">${r.surveyor}</div></div>
      <div><div style="font-size:11.5px;color:var(--ink-500);margin-bottom:4px;">Policyholder acknowledgement</div><div class="sig-box">Pending signature</div></div>
    </div>
    <div style="margin-top:26px;font-size:10.5px;color:var(--ink-300);border-top:1px solid var(--line);padding-top:12px;">
      This report is AI-assisted decision support. All findings were reviewed and the final claim decision was made by a licensed surveyor. Generated by SAVERA on ${fmtDate(new Date())}.
    </div>
  </div>`;
}
function after_report_view() {
  const p = document.getElementById("printBtn");
  if (p) p.onclick = () => window.print();
}

/* ---------- Settings / profile ---------- */
function renderSettings() {
  const u = state.user || {
    name: "Nadia Pramesti",
    role: "Field Surveyor",
    email: "nadia.pramesti@savera-insure.co.id",
  };
  return `
  <div class="grid g-12-8">
    <div class="card">
      <div class="card-title">Profile</div>
      <div style="display:flex;align-items:center;gap:16px;margin-bottom:20px;">
        <div class="avatar-ring">${initials(u.name)}</div>
        <div>
          <div style="font-size:15px;font-weight:700;color:var(--navy-900);">${u.name}</div>
          <div style="font-size:12.5px;color:var(--ink-500);">${u.role} · SAVERA Insurance</div>
        </div>
      </div>
      <div class="row-2">
        <div class="field"><label>Full name</label><input class="input" id="s_name" value="${u.name}"></div>
        <div class="field"><label>Role</label><input class="input" id="s_role" value="${u.role}"></div>
      </div>
      <div class="row-2">
        <div class="field"><label>Work email</label><input class="input" id="s_email" value="${u.email}"></div>
        <div class="field"><label>Phone</label><input class="input" value="+62 812-3456-7890"></div>
      </div>
      <div class="field"><label>Assigned region</label><input class="input" value="Malang &amp; Greater East Java"></div>
      <button class="btn btn-primary" id="saveProfile">Save changes</button>
    </div>
    <div>
      <div class="card" style="margin-bottom:18px;">
        <div class="card-title">Notifications</div>
        <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--line);">
          <div><div style="font-size:12.8px;font-weight:600;">New assessment assigned</div></div>
          <button class="toggle on" data-toggle></button>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--line);">
          <div><div style="font-size:12.8px;font-weight:600;">Verification reminders</div></div>
          <button class="toggle on" data-toggle></button>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;">
          <div><div style="font-size:12.8px;font-weight:600;">Weekly analytics digest</div></div>
          <button class="toggle" data-toggle></button>
        </div>
      </div>
      <div class="card">
        <div class="card-title">Workspace</div>
        <div class="field"><label>Currency</label><select class="select"><option>IDR — Indonesian Rupiah</option></select></div>
        <div class="field" style="margin-bottom:0;"><label>Sidebar</label>
          <button class="btn btn-ghost btn-block" id="toggleSidebarBtn">${state.sidebarCollapsed ? "Expand" : "Collapse"} sidebar</button>
        </div>
      </div>
    </div>
  </div>`;
}
function after_settings() {
  document
    .querySelectorAll("[data-toggle]")
    .forEach((t) => (t.onclick = () => t.classList.toggle("on")));
  const save = document.getElementById("saveProfile");
  if (save)
    save.onclick = () => {
      state.user = {
        ...state.user,
        name: document.getElementById("s_name").value,
        role: document.getElementById("s_role").value,
        email: document.getElementById("s_email").value,
      };
      toast("Profile updated");
      renderShell();
    };
  const tsb = document.getElementById("toggleSidebarBtn");
  if (tsb)
    tsb.onclick = () => {
      state.sidebarCollapsed = !state.sidebarCollapsed;
      renderShell();
    };
}


/* =====================================================================
   PPIC module — render functions
===================================================================== */
const PPIC_TABS = [
  { id: "ppic-dashboard", label: "Dashboard" },
  { id: "ppic-inventory", label: "Inventory" },
  { id: "ppic-transactions", label: "Transactions" },
  { id: "ppic-repair", label: "Repair Planning" },
  { id: "ppic-demand", label: "Demand Analytics" },
  { id: "ppic-procurement", label: "Procurement" },
  { id: "ppic-material", label: "Paint & Material" },
  { id: "ppic-analytics", label: "PPIC Analytics" },
];
function ppicTabBar() {
  return `<div class="tab-bar" style="flex-wrap:wrap;">
    ${PPIC_TABS.map(
      (t) => `<button class="tab-btn ${state.ppicTab === t.id ? "active" : ""}" data-ppictab="${t.id}">${t.label}</button>`,
    ).join("")}
  </div>`;
}
function renderPPIC() {
  const map = {
    "ppic-dashboard": renderPpicDashboard,
    "ppic-inventory": renderPpicInventory,
    "ppic-transactions": renderPpicTransactions,
    "ppic-repair": renderPpicRepair,
    "ppic-demand": renderPpicDemand,
    "ppic-procurement": renderPpicProcurement,
    "ppic-material": renderPpicMaterial,
    "ppic-analytics": renderPpicAnalytics,
  };
  return ppicTabBar() + (map[state.ppicTab] || renderPpicDashboard)();
}
function after_ppic() {
  document.querySelectorAll("[data-ppictab]").forEach(
    (b) => (b.onclick = () => { state.ppicTab = b.dataset.ppictab; renderContent(); }),
  );
  const fn = window["afterppic_" + state.ppicTab.replace(/-/g, "_")];
  if (fn) fn();
}

/* ---- 1. PPIC Dashboard ---- */
function renderPpicDashboard() {
  const lowStock = INVENTORY.filter((p) => p.status !== "Healthy");
  const activeOrders = PPIC_DATA.filter((d) => d.repairStatus !== "Completed").length;
  const procurementCost = PPIC_DATA.filter((d) => d.purchaseQty > 0).reduce((s, d) => s + d.unitCost * d.purchaseQty, 0);
  return `
  <div class="grid g-4" style="margin-bottom:20px;">
    ${statCard("Total Parts Tracked", PARTS_MASTER.length, ICONS.box, "var(--info-bg)", "#2954A6", "unique SKUs", "")}
    ${statCard("Low Stock Items", lowStock.length, ICONS.warn, "var(--warn-bg)", "var(--warn)", lowStock.filter((p) => p.status === "Critical").length + " critical", "")}
    ${statCard("Active Repair Orders", activeOrders, ICONS.wrench, "var(--cyan-050)", "#0A7C93", (PPIC_DATA.length - activeOrders) + " completed", "")}
    ${statCard("Procurement Cost", fmtIDR(procurementCost), ICONS.truck, "var(--ok-bg)", "var(--ok)", "logged purchase orders", "")}
  </div>
  <div class="banner banner-info" style="margin-bottom:20px;">
    ${ICONS.info}
    <div><strong>PPIC pipeline:</strong> Damage Detection → Severity → Repair / Repaint / Replace → Parts &amp; Material Requirement → Inventory Check → Demand Analysis → Reorder Recommendation → Repair Planning → Procurement.</div>
  </div>
  <div class="grid g-12-8">
    <div class="card">
      <div class="card-title">Parts Needing Reorder</div>
      <div class="card-desc">Current stock at or below reorder point</div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Part</th><th>Current Stock</th><th>Reorder Point</th><th>Suggested Reorder Qty</th><th>Status</th></tr></thead>
          <tbody>
            ${lowStock.length ? lowStock.sort((a, b) => (a.status === "Critical" ? -1 : 1)).map((p) => `
              <tr>
                <td style="font-weight:600;color:var(--navy-900);">${p.part}</td>
                <td style="font-family:var(--font-mono);">${p.currentStock}</td>
                <td style="font-family:var(--font-mono);">${p.reorderPoint}</td>
                <td style="font-family:var(--font-mono);font-weight:600;">${p.reorderQty}</td>
                <td>${badgeStockStatus(p.status)}</td>
              </tr>`).join("") : `<tr><td colspan="5"><div class="empty-state">${ICONS.check}<div>All tracked parts are above their reorder point.</div></div></td></tr>`}
          </tbody>
        </table>
      </div>
    </div>
    <div class="card">
      <div class="card-title">Stock Status</div>
      <div class="card-desc">Across all tracked parts</div>
      <canvas id="ppicStockChart" height="200"></canvas>
      <div style="margin-top:16px;display:flex;flex-direction:column;gap:8px;">
        ${INVENTORY.map((p) => `<div class="summary-row"><span>${p.part}</span>${badgeStockStatus(p.status)}</div>`).join("")}
      </div>
    </div>
  </div>`;
}
function afterppic_ppic_dashboard() {
  const counts = { Critical: 0, Low: 0, Healthy: 0 };
  INVENTORY.forEach((p) => counts[p.status]++);
  new Chart(document.getElementById("ppicStockChart"), {
    type: "doughnut",
    data: { labels: ["Critical", "Low", "Healthy"], datasets: [{ data: [counts.Critical, counts.Low, counts.Healthy], backgroundColor: ["#C23B3B", "#B8790A", "#1B9C63"], borderWidth: 2, borderColor: "#fff" }] },
    options: { cutout: "62%", plugins: { legend: { position: "bottom", labels: { boxWidth: 10, font: { size: 11 } } } } },
  });
}

/* ---- 2. Inventory ---- */
function renderPpicInventory() {
  const f = state.ppicInvFilter || (state.ppicInvFilter = { q: "", status: "all", sortKey: "part", sortDir: "asc", page: 1, perPage: 10 });
  let rows = INVENTORY.filter((p) => {
    const q = f.q.toLowerCase();
    const matchesQ = !q || p.part.toLowerCase().includes(q) || p.partId.toLowerCase().includes(q);
    const matchesStatus = f.status === "all" || p.status === f.status;
    return matchesQ && matchesStatus;
  });
  rows.sort((a, b) => {
    let av = a[f.sortKey], bv = b[f.sortKey];
    if (typeof av === "string") { av = av.toLowerCase(); bv = bv.toLowerCase(); }
    if (av < bv) return f.sortDir === "asc" ? -1 : 1;
    if (av > bv) return f.sortDir === "asc" ? 1 : -1;
    return 0;
  });
  const { pageRows, total } = pageSlice(rows, f);
  const arrow = (key) => (f.sortKey === key ? (f.sortDir === "asc" ? "↑" : "↓") : "");
  return `
  <div class="card">
    <div class="card-title" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;">
      <span>Spare Part Inventory</span>
      <div style="display:flex;gap:8px;">
        <button class="btn btn-primary btn-sm" id="btnStockIn">${ICONS.plus} Stock In</button>
        <button class="btn btn-danger btn-sm" id="btnStockOut">${ICONS.minus} Stock Out</button>
      </div>
    </div>
    <div class="card-desc">Current Stock = Stock In − Stock Out + Adjustment, computed live from the transaction ledger</div>
    <div style="display:flex;gap:10px;flex-wrap:wrap;margin:14px 0;">
      <div style="position:relative;flex:1;min-width:220px;">
        <span style="position:absolute;left:11px;top:11px;color:var(--ink-500);">${ICONS.search}</span>
        <input class="input" id="invSearch" placeholder="Search part or part ID..." style="padding-left:36px;" value="${f.q}">
      </div>
      <select class="select" id="invStatus" style="width:180px;">
        <option value="all">All statuses</option>
        <option ${f.status === "Critical" ? "selected" : ""}>Critical</option>
        <option ${f.status === "Low" ? "selected" : ""}>Low</option>
        <option ${f.status === "Healthy" ? "selected" : ""}>Healthy</option>
      </select>
    </div>
    <div class="table-wrap">
      <table>
        <thead><tr>
          <th class="sortable" data-sort="part">Part <span class="arrow">${arrow("part")}</span></th>
          <th class="sortable" data-sort="currentStock">Current Stock <span class="arrow">${arrow("currentStock")}</span></th>
          <th class="sortable" data-sort="reorderPoint">Reorder Point <span class="arrow">${arrow("reorderPoint")}</span></th>
          <th class="sortable" data-sort="totalDemand">Total Stock Out <span class="arrow">${arrow("totalDemand")}</span></th>
          <th>Unit Cost</th><th>Supplier</th><th>Lead Time</th>
          <th class="sortable" data-sort="status">Status <span class="arrow">${arrow("status")}</span></th>
        </tr></thead>
        <tbody>
          ${pageRows.length ? pageRows.map((p) => `
            <tr>
              <td style="font-weight:600;color:var(--navy-900);">${p.part}<div style="font-weight:400;color:var(--ink-500);font-size:11px;">${p.partId}</div></td>
              <td style="font-family:var(--font-mono);">${p.currentStock}</td>
              <td style="font-family:var(--font-mono);">${p.reorderPoint}</td>
              <td style="font-family:var(--font-mono);">${p.totalDemand}</td>
              <td style="font-family:var(--font-mono);">${fmtIDR(p.unitCost)}</td>
              <td style="color:var(--ink-500);">${p.supplierName}</td>
              <td style="color:var(--ink-500);">${p.leadTimeDays} days</td>
              <td>${badgeStockStatus(p.status)}</td>
            </tr>`).join("") : `<tr><td colspan="8"><div class="empty-state">${ICONS.search}<div>No parts match your filters.</div></div></td></tr>`}
        </tbody>
      </table>
    </div>
    ${pagerHTML("inv", f, total)}
  </div>`;
}
function afterppic_ppic_inventory() {
  const f = state.ppicInvFilter;
  const search = document.getElementById("invSearch");
  if (search) search.oninput = () => { f.q = search.value; f.page = 1; renderContent(); };
  const statusSel = document.getElementById("invStatus");
  if (statusSel) statusSel.onchange = () => { f.status = statusSel.value; f.page = 1; renderContent(); };
  document.querySelectorAll("th.sortable").forEach((th) => (th.onclick = () => {
    const key = th.dataset.sort;
    if (f.sortKey === key) f.sortDir = f.sortDir === "asc" ? "desc" : "asc";
    else { f.sortKey = key; f.sortDir = "asc"; }
    renderContent();
  }));
  wirePager(document.querySelector('[data-pager-prefix="inv"]'), f);
  const bi = document.getElementById("btnStockIn");
  if (bi) bi.onclick = () => openModal("stock-in", {});
  const bo = document.getElementById("btnStockOut");
  if (bo) bo.onclick = () => openModal("stock-out", {});
}

/* ---- 2b. Transaction History ---- */
function renderPpicTransactions() {
  const f = state.ppicTxFilter || (state.ppicTxFilter = { q: "", type: "all", sortKey: "transaction_date", sortDir: "desc", page: 1, perPage: 10 });
  let rows = INV_TX.map((t) => {
    const part = PART_BY_ID.get(t.part_id);
    return { ...t, partName: part ? part.part_name : t.part_id, totalCost: t.quantity * (t.unit_cost || 0) };
  }).filter((t) => {
    const q = f.q.toLowerCase();
    const matchesQ = !q || t.partName.toLowerCase().includes(q) || t.part_id.toLowerCase().includes(q) || t.transaction_id.toLowerCase().includes(q) || (t.reference_id || "").toLowerCase().includes(q);
    const matchesType = f.type === "all" || t.transaction_type === f.type;
    return matchesQ && matchesType;
  });
  rows.sort((a, b) => {
    let av = a[f.sortKey], bv = b[f.sortKey];
    if (typeof av === "string") { av = av.toLowerCase(); bv = bv.toLowerCase(); }
    if (av < bv) return f.sortDir === "asc" ? -1 : 1;
    if (av > bv) return f.sortDir === "asc" ? 1 : -1;
    return 0;
  });
  const { pageRows, total } = pageSlice(rows, f);
  const arrow = (key) => (f.sortKey === key ? (f.sortDir === "asc" ? "↑" : "↓") : "");
  return `
  <div class="card">
    <div class="card-title">Inventory Transaction History</div>
    <div class="card-desc">Every stock movement recorded against the parts ledger</div>
    <div style="display:flex;gap:10px;flex-wrap:wrap;margin:14px 0;">
      <div style="position:relative;flex:1;min-width:220px;">
        <span style="position:absolute;left:11px;top:11px;color:var(--ink-500);">${ICONS.search}</span>
        <input class="input" id="txSearch" placeholder="Search part, transaction ID, or reference..." style="padding-left:36px;" value="${f.q}">
      </div>
      <select class="select" id="txType" style="width:180px;">
        <option value="all">All types</option>
        <option value="IN" ${f.type === "IN" ? "selected" : ""}>Stock In</option>
        <option value="OUT" ${f.type === "OUT" ? "selected" : ""}>Stock Out</option>
        <option value="ADJUSTMENT" ${f.type === "ADJUSTMENT" ? "selected" : ""}>Adjustment</option>
        <option value="RETURN" ${f.type === "RETURN" ? "selected" : ""}>Return</option>
      </select>
    </div>
    <div class="table-wrap">
      <table>
        <thead><tr>
          <th class="sortable" data-sort="transaction_date">Date <span class="arrow">${arrow("transaction_date")}</span></th>
          <th>Transaction ID</th><th>Part</th><th>Type</th>
          <th class="sortable" data-sort="quantity">Quantity <span class="arrow">${arrow("quantity")}</span></th>
          <th>Reference</th><th>Unit Cost</th><th>Total Cost</th>
        </tr></thead>
        <tbody>
          ${pageRows.length ? pageRows.map((t) => `
            <tr>
              <td style="color:var(--ink-500);">${t.transaction_date}</td>
              <td style="font-family:var(--font-mono);">${t.transaction_id}</td>
              <td style="font-weight:600;color:var(--navy-900);">${t.partName}</td>
              <td>${badgeTxType(t.transaction_type)}</td>
              <td style="font-family:var(--font-mono);">${t.transaction_type === "OUT" ? "−" : "+"}${t.quantity}</td>
              <td style="color:var(--ink-500);">${t.reference_id || "—"}</td>
              <td style="font-family:var(--font-mono);">${fmtIDR(t.unit_cost)}</td>
              <td style="font-family:var(--font-mono);">${fmtIDR(t.totalCost)}</td>
            </tr>`).join("") : `<tr><td colspan="8"><div class="empty-state">${ICONS.search}<div>No transactions match your filters.</div></div></td></tr>`}
        </tbody>
      </table>
    </div>
    ${pagerHTML("tx", f, total)}
  </div>`;
}
function afterppic_ppic_transactions() {
  const f = state.ppicTxFilter;
  const search = document.getElementById("txSearch");
  if (search) search.oninput = () => { f.q = search.value; f.page = 1; renderContent(); };
  const typeSel = document.getElementById("txType");
  if (typeSel) typeSel.onchange = () => { f.type = typeSel.value; f.page = 1; renderContent(); };
  document.querySelectorAll("th.sortable").forEach((th) => (th.onclick = () => {
    const key = th.dataset.sort;
    if (f.sortKey === key) f.sortDir = f.sortDir === "asc" ? "desc" : "asc";
    else { f.sortKey = key; f.sortDir = "desc"; }
    renderContent();
  }));
  wirePager(document.querySelector('[data-pager-prefix="tx"]'), f);
}

/* ---- 3. Repair Planning ---- */
function renderPpicRepair() {
  const f = state.ppicRepairFilter || (state.ppicRepairFilter = { q: "", status: "all", priority: "all", sortKey: "priority", sortDir: "asc", page: 1, perPage: 10 });
  const repairStatuses = [...new Set(REPAIR_ORDERS_JSON.map((r) => r.status))];
  let rows = REPAIR_ORDERS_JSON.map((r) => {
    const part = PART_BY_ID.get(r.part_id);
    const avail = computeCurrentStock(r.part_id);
    return { ...r, partName: part ? part.part_name : r.part_id, avail, sufficient: avail >= r.quantity_required };
  }).filter((r) => {
    const q = f.q.toLowerCase();
    const matchesQ = !q || r.partName.toLowerCase().includes(q) || r.vehicle_brand.toLowerCase().includes(q) || r.vehicle_model.toLowerCase().includes(q) || r.repair_order_id.toLowerCase().includes(q);
    const matchesStatus = f.status === "all" || r.status === f.status;
    const matchesPriority = f.priority === "all" || r.priority === f.priority;
    return matchesQ && matchesStatus && matchesPriority;
  });
  const prOrder = { Urgent: 0, High: 1, Normal: 2, Low: 3 };
  rows.sort((a, b) => {
    let av = a[f.sortKey], bv = b[f.sortKey];
    if (f.sortKey === "priority") { av = prOrder[av]; bv = prOrder[bv]; }
    if (typeof av === "string") { av = av.toLowerCase(); bv = bv.toLowerCase(); }
    if (av < bv) return f.sortDir === "asc" ? -1 : 1;
    if (av > bv) return f.sortDir === "asc" ? 1 : -1;
    return 0;
  });
  const { pageRows, total } = pageSlice(rows, f);
  const arrow = (key) => (f.sortKey === key ? (f.sortDir === "asc" ? "↑" : "↓") : "");
  return `
  <div class="card">
    <div class="card-title">Repair Orders</div>
    <div class="card-desc">Part requirement checked against live inventory — insufficient stock is flagged with a reorder recommendation</div>
    <div style="display:flex;gap:10px;flex-wrap:wrap;margin:14px 0;">
      <div style="position:relative;flex:1;min-width:200px;">
        <span style="position:absolute;left:11px;top:11px;color:var(--ink-500);">${ICONS.search}</span>
        <input class="input" id="repSearch2" placeholder="Search RO ID, part, brand, model..." style="padding-left:36px;" value="${f.q}">
      </div>
      <select class="select" id="repStatus" style="width:170px;"><option value="all">All statuses</option>${repairStatuses.map((s) => `<option ${f.status === s ? "selected" : ""}>${s}</option>`).join("")}</select>
      <select class="select" id="repPriority" style="width:140px;"><option value="all">All priorities</option>${PRIORITIES.map((s) => `<option ${f.priority === s ? "selected" : ""}>${s}</option>`).join("")}</select>
    </div>
    <div class="table-wrap">
      <table>
        <thead><tr>
          <th>RO ID</th><th>Vehicle</th><th>Part</th><th>Repair Action</th>
          <th class="sortable" data-sort="priority">Priority <span class="arrow">${arrow("priority")}</span></th>
          <th class="sortable" data-sort="status">Status <span class="arrow">${arrow("status")}</span></th>
          <th class="sortable" data-sort="quantity_required">Qty Req. <span class="arrow">${arrow("quantity_required")}</span></th>
          <th>Stock Check</th><th>Action</th>
        </tr></thead>
        <tbody>
          ${pageRows.length ? pageRows.map((r) => `
            <tr>
              <td style="font-family:var(--font-mono);">${r.repair_order_id}</td>
              <td>${r.vehicle_brand} ${r.vehicle_model} '${String(r.vehicle_year).slice(2)}</td>
              <td>${r.partName}</td>
              <td>${r.repair_action}</td>
              <td>${badgePriority(r.priority)}</td>
              <td>${badgeRepairStatus(r.status)}</td>
              <td style="font-family:var(--font-mono);">${r.quantity_required}</td>
              <td>${r.sufficient ? `<span class="stock-ok">${ICONS.check} In Stock (${r.avail})</span>` : `<span class="stock-insufficient">${ICONS.warn} Insufficient Stock (${r.avail}/${r.quantity_required})</span><div style="margin-top:4px;"><button class="btn btn-ghost btn-sm" data-quick-po="${r.part_id}|${Math.max(1, r.quantity_required - r.avail)}">Recommended To Order</button></div>`}</td>
              <td>${r.status === "Completed" ? `<span style="color:var(--ink-500);font-size:12px;">Completed</span>` : `<button class="btn btn-primary btn-sm" ${r.sufficient ? "" : "disabled"} data-fulfill-ro="${r.repair_order_id}">Stock Out</button>`}</td>
            </tr>`).join("") : `<tr><td colspan="9"><div class="empty-state">${ICONS.search}<div>No repair orders match your filters.</div></div></td></tr>`}
        </tbody>
      </table>
    </div>
    ${pagerHTML("rep", f, total)}
  </div>`;
}
function afterppic_ppic_repair() {
  const f = state.ppicRepairFilter;
  const search = document.getElementById("repSearch2");
  if (search) search.oninput = () => { f.q = search.value; f.page = 1; renderContent(); };
  ["repStatus", "repPriority"].forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    const key = id === "repStatus" ? "status" : "priority";
    el.onchange = () => { f[key] = el.value; f.page = 1; renderContent(); };
  });
  document.querySelectorAll("th.sortable").forEach((th) => (th.onclick = () => {
    const key = th.dataset.sort;
    if (f.sortKey === key) f.sortDir = f.sortDir === "asc" ? "desc" : "asc";
    else { f.sortKey = key; f.sortDir = "asc"; }
    renderContent();
  }));
  wirePager(document.querySelector('[data-pager-prefix="rep"]'), f);
  document.querySelectorAll("[data-fulfill-ro]").forEach((b) => (b.onclick = () => fulfillRepairOrder(b.dataset.fulfillRo)));
  document.querySelectorAll("[data-quick-po]").forEach((b) => (b.onclick = () => {
    const [partId, qty] = b.dataset.quickPo.split("|");
    quickCreatePO(partId, parseInt(qty, 10));
  }));
}

/* ---- 4. Demand Analytics ---- */
function renderPpicDemand() {
  return `
  <div class="banner banner-info" style="margin-bottom:18px;">${ICONS.info}<div>The dataset has no timestamp field, so demand is broken down by part, vehicle brand, and severity rather than over time. The reorder chart is a live recommendation computed from current stock vs. reorder point.</div></div>
  <div class="grid g-2" style="margin-bottom:18px;">
    <div class="card"><div class="card-title">Demand by Part</div><div class="card-desc">Sum of logged demand quantity</div><canvas id="demByPart" height="220"></canvas></div>
    <div class="card"><div class="card-title">Demand by Vehicle Brand</div><div class="card-desc">Sum of logged demand quantity</div><canvas id="demByBrand" height="220"></canvas></div>
  </div>
  <div class="grid g-2">
    <div class="card"><div class="card-title">Demand by Severity</div><canvas id="demBySeverity" height="220"></canvas></div>
    <div class="card"><div class="card-title">Reorder Recommendation by Part</div><div class="card-desc">max(0, reorder point − current stock)</div><canvas id="demForecast" height="220"></canvas></div>
  </div>`;
}
function afterppic_ppic_demand() {
  const byPart = {}, byBrand = {}, bySev = {};
  PPIC_DATA.forEach((d) => {
    byPart[d.part] = (byPart[d.part] || 0) + d.demandQty;
    byBrand[d.brand] = (byBrand[d.brand] || 0) + d.demandQty;
    bySev[d.severity] = (bySev[d.severity] || 0) + d.demandQty;
  });
  new Chart(document.getElementById("demByPart"), { type: "bar", data: { labels: Object.keys(byPart), datasets: [{ data: Object.values(byPart), backgroundColor: "#00B8D9", borderRadius: 6, maxBarThickness: 40 }] }, options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true }, x: { grid: { display: false }, ticks: { autoSkip: false, maxRotation: 40, minRotation: 20 } } } } });
  new Chart(document.getElementById("demByBrand"), { type: "bar", data: { labels: Object.keys(byBrand), datasets: [{ data: Object.values(byBrand), backgroundColor: "#0B1F3A", borderRadius: 6, maxBarThickness: 40 }] }, options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true }, x: { grid: { display: false } } } } });
  new Chart(document.getElementById("demBySeverity"), { type: "doughnut", data: { labels: Object.keys(bySev), datasets: [{ data: Object.values(bySev), backgroundColor: ["#00B8D9", "#B8790A", "#C23B3B", "#2a0a0a"], borderWidth: 2, borderColor: "#fff" }] }, options: { cutout: "60%", plugins: { legend: { position: "bottom", labels: { boxWidth: 10, font: { size: 11 } } } } } });
  new Chart(document.getElementById("demForecast"), { type: "bar", data: { labels: INVENTORY.map((p) => p.part), datasets: [{ data: INVENTORY.map((p) => p.reorderQty), backgroundColor: INVENTORY.map((p) => (p.status === "Critical" ? "#C23B3B" : p.status === "Low" ? "#B8790A" : "#1B9C63")), borderRadius: 6, maxBarThickness: 40 }] }, options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true }, x: { grid: { display: false }, ticks: { autoSkip: false, maxRotation: 40, minRotation: 20 } } } } });
}

/* ---- 5. Procurement ---- */
function renderPpicProcurement() {
  const f = state.ppicPoFilter || (state.ppicPoFilter = { q: "", status: "all", page: 1, perPage: 10 });
  const orders = PURCHASE_ORDERS.map((po) => {
    const part = PART_BY_ID.get(po.part_id);
    const supplier = SUPPLIER_BY_ID.get(po.supplier_id);
    return { ...po, partName: part ? part.part_name : po.part_id, supplierName: supplier ? supplier.supplier_name : po.supplier_id, leadTimeDays: part ? part.lead_time_days : 0 };
  });
  let rows = orders.filter((d) => {
    const q = f.q.toLowerCase();
    const matchesQ = !q || d.partName.toLowerCase().includes(q) || d.po_id.toLowerCase().includes(q) || d.supplierName.toLowerCase().includes(q);
    const matchesStatus = f.status === "all" || d.status === f.status;
    return matchesQ && matchesStatus;
  });
  const totalCost = orders.reduce((s, d) => s + d.total_cost, 0);
  const avgLead = orders.length ? Math.round(orders.reduce((s, d) => s + d.leadTimeDays, 0) / orders.length) : 0;
  const suppliersActive = new Set(orders.map((d) => d.supplier_id));
  const suggested = INVENTORY.filter((p) => p.status !== "Healthy");
  const { pageRows, total } = pageSlice(rows, f);
  const poStatuses = [...new Set(PURCHASE_ORDERS.map((p) => p.status))];
  return `
  <div class="grid g-4" style="margin-bottom:20px;">
    ${statCard("Purchase Orders", orders.length, ICONS.truck, "var(--info-bg)", "#2954A6", "logged in dataset", "")}
    ${statCard("Procurement Cost", fmtIDR(totalCost), ICONS.dashboard, "var(--ok-bg)", "var(--ok)", "unit cost × qty", "")}
    ${statCard("Avg. Lead Time", avgLead + " days", ICONS.clock, "var(--warn-bg)", "var(--warn)", "across parts on order", "")}
    ${statCard("Active Suppliers", suppliersActive.size, ICONS.box, "var(--cyan-050)", "#0A7C93", "of " + SUPPLIERS_DB.length + " total", "")}
  </div>
  <div class="card" style="margin-bottom:18px;">
    <div class="card-title">Purchase Orders</div>
    <div class="card-desc">Creating a PO does not add stock — use Receive Purchase once goods arrive to post a Stock In</div>
    <div style="display:flex;gap:10px;flex-wrap:wrap;margin:14px 0;">
      <div style="position:relative;flex:1;min-width:200px;">
        <span style="position:absolute;left:11px;top:11px;color:var(--ink-500);">${ICONS.search}</span>
        <input class="input" id="poSearch" placeholder="Search PO ID, part, supplier..." style="padding-left:36px;" value="${f.q}">
      </div>
      <select class="select" id="poStatus" style="width:170px;"><option value="all">All statuses</option>${poStatuses.map((s) => `<option ${f.status === s ? "selected" : ""}>${s}</option>`).join("")}</select>
    </div>
    <div class="table-wrap">
      <table>
        <thead><tr><th>PO ID</th><th>Date</th><th>Part</th><th>Supplier</th><th>Qty</th><th>Unit Cost</th><th>Total Cost</th><th>Expected</th><th>Status</th><th>Action</th></tr></thead>
        <tbody>
          ${pageRows.length ? pageRows.map((d) => `
            <tr>
              <td style="font-family:var(--font-mono);">${d.po_id}</td>
              <td style="color:var(--ink-500);">${d.po_date}</td>
              <td style="font-weight:600;color:var(--navy-900);">${d.partName}</td>
              <td>${d.supplierName}</td>
              <td style="font-family:var(--font-mono);">${d.quantity_ordered}</td>
              <td style="font-family:var(--font-mono);">${fmtIDR(d.unit_cost)}</td>
              <td style="font-family:var(--font-mono);">${fmtIDR(d.total_cost)}</td>
              <td style="color:var(--ink-500);">${d.expected_delivery_date || "—"}</td>
              <td>${badgePoStatus(d.status)}</td>
              <td>${d.status === "Received" || d.status === "Cancelled" ? "—" : `<button class="btn btn-accent btn-sm" data-receive-po="${d.po_id}">Receive Purchase</button>`}</td>
            </tr>`).join("") : `<tr><td colspan="10"><div class="empty-state">${ICONS.search}<div>No purchase orders match your filters.</div></div></td></tr>`}
        </tbody>
      </table>
    </div>
    ${pagerHTML("po", f, total)}
  </div>
  <div class="card">
    <div class="card-title">Recommended To Order</div>
    <div class="card-desc">Parts below/near their reorder point, computed live from the transaction ledger</div>
    <div class="table-wrap">
      <table>
        <thead><tr><th>Part</th><th>Current Stock</th><th>Reorder Point</th><th>Recommended Qty</th><th>Status</th><th>Action</th></tr></thead>
        <tbody>
          ${suggested.length ? suggested.map((p) => `
            <tr>
              <td style="font-weight:600;color:var(--navy-900);">${p.part}</td>
              <td style="font-family:var(--font-mono);">${p.currentStock}</td>
              <td style="font-family:var(--font-mono);">${p.reorderPoint}</td>
              <td style="font-family:var(--font-mono);font-weight:600;">${p.reorderQty}</td>
              <td>${badgeStockStatus(p.status)}</td>
              <td><button class="btn btn-ghost btn-sm" data-quick-po="${p.partId}|${p.reorderQty || 1}">Create PO</button></td>
            </tr>`).join("") : `<tr><td colspan="6"><div class="empty-state">${ICONS.check}<div>Nothing needs ordering right now.</div></div></td></tr>`}
        </tbody>
      </table>
    </div>
  </div>`;
}
function afterppic_ppic_procurement() {
  const f = state.ppicPoFilter;
  const search = document.getElementById("poSearch");
  if (search) search.oninput = () => { f.q = search.value; f.page = 1; renderContent(); };
  const statusSel = document.getElementById("poStatus");
  if (statusSel) statusSel.onchange = () => { f.status = statusSel.value; f.page = 1; renderContent(); };
  wirePager(document.querySelector('[data-pager-prefix="po"]'), f);
  document.querySelectorAll("[data-receive-po]").forEach((b) => (b.onclick = () => receivePurchase(b.dataset.receivePo)));
  document.querySelectorAll("[data-quick-po]").forEach((b) => (b.onclick = () => {
    const [partId, qty] = b.dataset.quickPo.split("|");
    quickCreatePO(partId, parseInt(qty, 10));
  }));
}

/* ---- 6. Paint & Material Planning ---- */
function renderPpicMaterial() {
  const rows = PPIC_DATA.filter((d) => d.materialType !== "None");
  const byType = {};
  rows.forEach((d) => { byType[d.materialType] = (byType[d.materialType] || 0) + d.materialQty; });
  const topType = Object.entries(byType).sort((a, b) => b[1] - a[1])[0];
  return `
  <div class="grid g-3" style="margin-bottom:18px;">
    ${statCard("Material Records", rows.length, ICONS.droplet, "var(--info-bg)", "#2954A6", "repaint/repair jobs", "")}
    ${statCard("Material Types Used", MATERIAL_TYPES.length, ICONS.box, "var(--cyan-050)", "#0A7C93", "", "")}
    ${statCard("Most Used Material", topType ? topType[0] : "—", ICONS.spark, "var(--ok-bg)", "var(--ok)", topType ? topType[1].toFixed(1) + " total qty" : "", "")}
  </div>
  <div class="grid g-12-8">
    <div class="card">
      <div class="card-title">Material Usage Records</div>
      <div class="card-desc">Jobs where a paint / body material was consumed</div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Part</th><th>Damage Type</th><th>Repair Action</th><th>Material</th><th>Quantity</th><th>Vehicle</th></tr></thead>
          <tbody>
            ${rows.slice(0, 150).map((d) => `
              <tr>
                <td style="font-weight:600;color:var(--navy-900);">${d.part}</td>
                <td>${d.damageType}</td>
                <td>${d.repairAction}</td>
                <td>${d.materialType}</td>
                <td style="font-family:var(--font-mono);">${d.materialQty}</td>
                <td style="color:var(--ink-500);">${d.brand} ${d.model}</td>
              </tr>`).join("")}
          </tbody>
        </table>
      </div>
      <div style="font-size:11.5px;color:var(--ink-500);margin-top:12px;">Showing ${Math.min(150,rows.length)} of ${rows.length} material usage records</div>
    </div>
    <div class="card">
      <div class="card-title">Material Usage Overview</div>
      <div class="card-desc">Total quantity by material type</div>
      <canvas id="materialChart" height="230"></canvas>
    </div>
  </div>`;
}
function afterppic_ppic_material() {
  const rows = PPIC_DATA.filter((d) => d.materialType !== "None");
  const byType = {};
  rows.forEach((d) => { byType[d.materialType] = (byType[d.materialType] || 0) + d.materialQty; });
  new Chart(document.getElementById("materialChart"), { type: "bar", data: { labels: Object.keys(byType), datasets: [{ data: Object.values(byType).map((v) => +v.toFixed(1)), backgroundColor: "#00B8D9", borderRadius: 6, maxBarThickness: 40 }] }, options: { indexAxis: "y", plugins: { legend: { display: false } }, scales: { x: { beginAtZero: true } } } });
}

/* ---- 7. PPIC Analytics ---- */
function renderPpicAnalytics() {
  const totalCost = PPIC_DATA.reduce((s, d) => s + d.totalCost, 0);
  const avgLead = Math.round(PPIC_DATA.reduce((s, d) => s + d.leadTimeDays, 0) / PPIC_DATA.length);
  const avgRepairDays = (PPIC_DATA.reduce((s, d) => s + d.repairDays, 0) / PPIC_DATA.length).toFixed(1);
  return `
  <div class="grid g-4" style="margin-bottom:18px;">
    ${statCard("Total Repair Orders", PPIC_DATA.length, ICONS.wrench, "var(--info-bg)", "#2954A6", "in dataset", "")}
    ${statCard("Total Repair Cost", fmtIDR(totalCost), ICONS.dashboard, "var(--ok-bg)", "var(--ok)", "sum of total_cost", "")}
    ${statCard("Avg. Lead Time", avgLead + " days", ICONS.truck, "var(--warn-bg)", "var(--warn)", "supplier average", "")}
    ${statCard("Avg. Repair Days", avgRepairDays + " days", ICONS.clock, "var(--cyan-050)", "#0A7C93", "per order", "")}
  </div>
  <div class="grid g-2" style="margin-bottom:18px;">
    <div class="card"><div class="card-title">Priority Distribution</div><canvas id="anaPriority" height="220"></canvas></div>
    <div class="card"><div class="card-title">Repair Status Distribution</div><canvas id="anaStatus" height="220"></canvas></div>
  </div>
  <div class="grid g-2">
    <div class="card">
      <div class="card-title">Top Suppliers by Order Count</div>
      <div id="supplierList" style="display:flex;flex-direction:column;gap:12px;margin-top:6px;"></div>
    </div>
    <div class="card"><div class="card-title">Total Cost by Repair Action</div><canvas id="anaAction" height="220"></canvas></div>
  </div>`;
}
function afterppic_ppic_analytics() {
  const byPriority = {}, byStatus = {}, bySupplier = {}, byAction = {};
  PPIC_DATA.forEach((d) => {
    byPriority[d.priority] = (byPriority[d.priority] || 0) + 1;
    byStatus[d.repairStatus] = (byStatus[d.repairStatus] || 0) + 1;
    bySupplier[d.supplierName] = (bySupplier[d.supplierName] || 0) + 1;
    byAction[d.repairAction] = (byAction[d.repairAction] || 0) + d.totalCost;
  });
  new Chart(document.getElementById("anaPriority"), { type: "doughnut", data: { labels: PRIORITIES.filter((p) => byPriority[p]), datasets: [{ data: PRIORITIES.filter((p) => byPriority[p]).map((p) => byPriority[p]), backgroundColor: ["#2a0a0a", "#C23B3B", "#0B1F3A", "#00B8D9"], borderWidth: 2, borderColor: "#fff" }] }, options: { cutout: "60%", plugins: { legend: { position: "bottom", labels: { boxWidth: 10, font: { size: 11 } } } } } });
  new Chart(document.getElementById("anaStatus"), { type: "bar", data: { labels: Object.keys(byStatus), datasets: [{ data: Object.values(byStatus), backgroundColor: "#0B1F3A", borderRadius: 6, maxBarThickness: 40 }] }, options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true }, x: { grid: { display: false }, ticks: { autoSkip: false, maxRotation: 30, minRotation: 10 } } } } });
  new Chart(document.getElementById("anaAction"), { type: "bar", data: { labels: Object.keys(byAction), datasets: [{ data: Object.values(byAction), backgroundColor: "#00B8D9", borderRadius: 6, maxBarThickness: 50 }] }, options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { callback: (v) => (v / 1000000).toFixed(0) + "jt" } }, x: { grid: { display: false } } } } });
  const maxSup = Math.max(...Object.values(bySupplier));
  document.getElementById("supplierList").innerHTML = Object.entries(bySupplier).sort((a, b) => b[1] - a[1]).map(([name, count]) => `
    <div>
      <div style="display:flex;justify-content:space-between;font-size:12.3px;margin-bottom:5px;"><span style="font-weight:600;color:var(--navy-900);">${name}</span><span style="color:var(--ink-500);font-family:var(--font-mono);">${count}</span></div>
      <div class="brand-bar"><div class="brand-bar-fill" style="width:${(count / maxSup * 100).toFixed(0)}%;"></div></div>
    </div>`).join("");
}

/* ---------- Boot ---------- */
state.historyTab = "list";
state.ppicTab = "ppic-dashboard";
// Global event delegation for every [data-nav] element, including ones
// rendered later inside #content (Back/Cancel buttons, quick links,
// attention tiles, etc.) — #app-shell itself is never replaced, only
// its innerHTML, so binding once here covers every render.
document.getElementById("app-shell").addEventListener("click", (e) => {
  const btn = e.target.closest("[data-nav]");
  if (btn) handleNav(btn.dataset.nav);
});
renderShell();
