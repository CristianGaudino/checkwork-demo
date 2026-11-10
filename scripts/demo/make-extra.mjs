// Builds src/lib/stock/demo-cars-extra.json: six new cars and six vans (VAT excluded) for the demo, made from the used demo cars so the
// pictures are the same made-up art. Deterministic: the same input always gives the same file. Run: node scripts/demo/make-extra.mjs
import { readFileSync, writeFileSync } from "node:fs";

const used = JSON.parse(readFileSync("src/lib/stock/demo-cars.json", "utf8")).filter((c) => !c.soldAt);
const slug = (s) => s.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const pickMake = (make) => used.find((c) => c.make === make) ?? used[0];
const build = (base, id, over) => {
  const c = { ...base, ...over, id: String(id) };
  c.makeSlug = slug(c.make);
  c.modelSlug = slug(c.model);
  c.slug = `${c.makeSlug}-${c.modelSlug}-${c.year}-${c.id}`;
  c.bodySlug = c.bodyType ? slug(c.bodyType) : undefined;
  return JSON.parse(JSON.stringify(c)); // drops undefined
};

// New cars: the franchise brands (src/lib/partners.ts). Delivery mileage only, one owner or none, no NCT yet.
const NEW = [
  ["Hyundai", "i20", "1.0 T-GDi Comfort", 24995],
  ["Kia", "Picanto", "1.0 GT-Line", 19950],
  ["Toyota", "Yaris", "1.5 Hybrid Icon", 29950],
  ["Volkswagen", "Polo", "1.0 TSI Life", 27450],
  ["SEAT", "Ibiza", "1.0 TSI FR", 26950],
  ["Dacia", "Sandero Stepway", "1.0 TCe Expression", 19495],
].map(([make, model, variant, price], i) =>
  build(pickMake(make), 5000001 + i, {
    make,
    model,
    variant,
    year: 2026,
    condition: "new",
    vat: "inc",
    priceEur: price,
    mileageKm: 10 + i * 4,
    owners: 0,
    nctExpiry: undefined,
    fuel: i === 2 ? "hybrid" : "petrol",
    bodyType: "Hatchback",
    description: `Brand new ${make} ${model}, ready for delivery. Ask us about the manufacturer's warranty and the finance offers that go with it.`,
  }),
);

// Vans: priced without VAT, which a VAT-registered buyer can reclaim. Two have a price drop.
const VANS = [
  ["Ford", "Transit Custom", "2.0 EcoBlue 130 Limited", 2022, 54210, 27950, 31950],
  ["Volkswagen", "Transporter", "2.0 TDI 110 Startline", 2021, 78400, 24950, undefined],
  ["Renault", "Trafic", "2.0 dCi 120 Sport", 2023, 31200, 29950, undefined],
  ["Mercedes-Benz", "Sprinter", "314 CDI Medium Roof", 2020, 112500, 21950, 23450],
  ["Peugeot", "Partner", "1.5 BlueHDi 100 Professional", 2022, 40800, 16950, undefined],
  ["Citroën", "Berlingo Van", "1.5 BlueHDi 100 Enterprise", 2021, 66300, 14950, undefined],
].map(([make, model, variant, year, km, price, was], i) =>
  build(used[i % used.length], 5100001 + i, {
    make,
    model,
    variant,
    year,
    condition: "commercial",
    vat: "ex",
    priceEur: price,
    wasPriceEur: was,
    mileageKm: km,
    fuel: "diesel",
    gearbox: "manual",
    bodyType: "Van",
    engineLitres: 2,
    doors: 4,
    seats: 3,
    owners: 1,
    description: `${year} ${make} ${model}, serviced and ready to work. The price shown is without VAT, which a VAT-registered buyer can usually reclaim.`,
  }),
);

writeFileSync("src/lib/stock/demo-cars-extra.json", JSON.stringify([...NEW, ...VANS], null, 2) + "\n");
console.log(`${NEW.length} new cars and ${VANS.length} vans written to src/lib/stock/demo-cars-extra.json`);
