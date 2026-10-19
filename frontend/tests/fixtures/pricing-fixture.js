/* FIXTURE untuk tes Node & harness — BUKAN data produksi. Di aplikasi, semuanya berasal dari app.js.
   Bentuk PRICING_DATA / PART_ALIASES / DAMAGE_ALIASES diturunkan dari cara matchPricing() membacanya.
   matchPricing() di bawah = salinan PERSIS dari assessment_lama.js (baris asli 1445-1465). */
var PART_ALIASES = {
  "Front Bumper": ["Front Bumper", "Bumper Depan"],
  "Rear Bumper": ["Rear Bumper", "Bumper Belakang"],
  "Tail Lamp": ["Tail Lamp", "Lampu Belakang"],
  "Headlight": ["Headlight", "Headlamp"],
  "Front Fender": ["Front Fender"],
  "Hood": ["Hood"],
};
var DAMAGE_ALIASES = { Dent: ["Dent"], Scratch: ["Scratch"], Crack: ["Crack"], Broken: ["Broken"] };
var PRICING_DATA = [
  { vehiclePart: "Front Bumper", damageType: "Crack", severity: "Moderate", brand: "Mitsubishi", model: "Pajero Sport", year: 2020, sparePartCost: 0, laborCost: 450000, paintingCost: 650000, additionalCost: 75000, estimatedTotalCost: 1175000, costMin: 1000000, costMax: 1400000 },
  { vehiclePart: "Bumper Depan", damageType: "Crack", severity: "Moderate", brand: "Toyota", model: "Avanza", year: 2021, sparePartCost: 0, laborCost: 300000, paintingCost: 450000, additionalCost: 50000, estimatedTotalCost: 800000, costMin: 700000, costMax: 950000 },
  { vehiclePart: "Bumper Belakang", damageType: "Broken", severity: "Severe", brand: "Mitsubishi", model: "Xpander", year: 2022, sparePartCost: 2850000, laborCost: 350000, paintingCost: 750000, additionalCost: 100000, estimatedTotalCost: 4050000, costMin: 3600000, costMax: 4600000 },
  { vehiclePart: "Rear Bumper", damageType: "Broken", severity: "Moderate", brand: "Mitsubishi", model: "Pajero Sport", year: 2021, sparePartCost: 2850000, laborCost: 300000, paintingCost: 650000, additionalCost: 80000, estimatedTotalCost: 3880000, costMin: 3500000, costMax: 4300000 },
  { vehiclePart: "Rear Bumper", damageType: "Dent", severity: "Moderate", brand: "Toyota", model: "Fortuner", year: 2021, sparePartCost: 0, laborCost: 400000, paintingCost: 600000, additionalCost: 50000, estimatedTotalCost: 1050000, costMin: 900000, costMax: 1300000 },
  { vehiclePart: "Lampu Belakang", damageType: "Crack", severity: "Moderate", brand: "Toyota", model: "Innova", year: 2019, sparePartCost: 1650000, laborCost: 150000, paintingCost: 0, additionalCost: 50000, estimatedTotalCost: 1850000, costMin: 1600000, costMax: 2200000 },
];

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

if (typeof module !== "undefined" && module.exports) module.exports = { PART_ALIASES, DAMAGE_ALIASES, PRICING_DATA, matchPricing };
