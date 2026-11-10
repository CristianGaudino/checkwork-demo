// Builds the stock from catalogue.mjs. Manual: never run in CI, at build time or at runtime, except `redate`, which is offline.
//
//   node scripts/stock/build.mjs <dataset dir>   photos to public/stock/<id>/, and src/lib/stock/demo-cars.json (used) and demo-cars-extra.json (new, vans)
//   node scripts/stock/build.mjs redate          sale dates relative to today, so the sold cars stay inside the 30 day window
//
// Same input, same output: the photos are named by their content hash. Run `npm run stock:og` after it for the share images.
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import sharp from "sharp";
import { describeCar } from "./describe.mjs";
import { NEW, USED, VANS, carFeatures } from "./catalogue.mjs";

const USED_FILE = "src/lib/stock/demo-cars.json";
const EXTRA_FILE = "src/lib/stock/demo-cars-extra.json";
const W = 900;
const H = 675;

const slug = (s) => s.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const soldDate = (days, today) => new Date(today.getTime() - days * 86_400_000).toISOString().slice(0, 10);
const write = (path, data) => writeFileSync(path, JSON.stringify(data, null, 2) + "\n");

// 4:3 centre crop. A shot that is far from 4:3 (a tall rear view) is fitted whole on its own background instead of cut, so no car loses a bumper.
async function frame(file) {
  const meta = await sharp(file).metadata();
  const ratio = meta.width / meta.height / (W / H);
  if (Math.abs(ratio - 1) <= 0.25) return sharp(file).resize(W, H, { fit: "cover" }).webp({ quality: 82 }).toBuffer();
  const [r, g, b] = await sharp(file).extract({ left: 0, top: 0, width: 1, height: 1 }).removeAlpha().raw().toBuffer();
  return sharp(file).resize(W, H, { fit: "contain", background: { r, g, b } }).webp({ quality: 82 }).toBuffer();
}

async function photos(dir, id, stems) {
  mkdirSync(`public/stock/${id}`, { recursive: true });
  const seen = new Set();
  const out = [];
  for (const stem of stems) {
    const webp = await frame(`${dir}/${stem}.jpg`);
    const hash = createHash("sha256").update(webp).digest("hex").slice(0, 8);
    if (seen.has(hash)) {
      console.warn(`${id}: ${stem.split("_").pop()} is the same picture as an earlier shot, left out`);
      continue;
    }
    seen.add(hash);
    const src = `/stock/${id}/${out.length + 1}-${hash}.webp`;
    writeFileSync(`public${src}`, webp);
    out.push({ src, width: W, height: H });
  }
  if (out.length < 3) throw new Error(`${id}: only ${out.length} different photos, the site wants 3 or more`);
  return out;
}

async function car(dir, c, today) {
  const { photos: stems, tier, extra, history, sold, nct, ...rest } = c;
  const out = { ...rest };
  out.makeSlug = slug(c.make);
  out.modelSlug = slug(c.model);
  out.slug = `${out.makeSlug}-${out.modelSlug}-${c.year}-${c.id}`;
  out.bodySlug = slug(c.bodyType);
  if (nct) out.nctExpiry = nct;
  out.features = carFeatures({ tier, year: c.year, extra, condition: c.condition, history });
  out.description = describeCar(out);
  out.photos = await photos(dir, c.id, stems);
  if (sold !== undefined) out.soldAt = soldDate(sold, today);
  return JSON.parse(JSON.stringify(out)); // drops undefined
}

const [arg] = process.argv.slice(2);
if (arg === "redate") {
  const today = new Date();
  const days = Object.fromEntries(USED.filter((c) => c.sold !== undefined).map((c) => [c.id, c.sold]));
  const cars = JSON.parse(readFileSync(USED_FILE, "utf8"));
  for (const c of cars) if (c.id in days) c.soldAt = soldDate(days[c.id], today);
  write(USED_FILE, cars);
} else if (arg) {
  const today = new Date();
  rmSync("public/stock", { recursive: true, force: true });
  write(USED_FILE, await Promise.all(USED.map((c) => car(arg, c, today))));
  write(EXTRA_FILE, await Promise.all([...NEW, ...VANS].map((c) => car(arg, c, today))));
  console.log(`${USED.length} used, ${NEW.length} new and ${VANS.length} vans written`);
} else {
  console.error("Usage: build.mjs <dataset dir> | redate");
  process.exit(1);
}
