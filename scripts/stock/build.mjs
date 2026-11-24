// Builds the stock from catalogue.mjs. Manual: never run in CI, at build time or at runtime, except `redate`, which is offline.
//
//   node scripts/stock/build.mjs <dataset dir>   photos to public/stock/<id>/, and src/lib/stock/demo-cars.json (used) and demo-cars-extra.json (vans)
//   node scripts/stock/build.mjs redate          sale and listing dates relative to today, so the sold cars stay inside the 30 day window
//
// Same input, same output: the photos are named by their content hash. Run `npm run stock:og` after it for the share images.
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import sharp from "sharp";
import { describeCar } from "./describe.mjs";
import { USED, VANS, carFeatures } from "./catalogue.mjs";

const USED_FILE = "src/lib/stock/demo-cars.json";
const EXTRA_FILE = "src/lib/stock/demo-cars-extra.json";
const NEXT = "public/.stock-next"; // photos are built here and swapped in only when every car worked, so a failed run leaves public/stock as it was
const W = 900;
const H = 675;

const slug = (s) => s.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const soldDate = (days, today) => new Date(today.getTime() - days * 86_400_000).toISOString().slice(0, 10);
const write = (path, data) => writeFileSync(path, JSON.stringify(data, null, 2) + "\n");

// When each demo car went on the site, relative to today so the demo keeps a believable spread: the newest (highest id) two days ago,
// each older one three days before the next, and a sold car at least two weeks before it sold.
function listDates(cars, today) {
  const byNewest = [...cars].sort((a, b) => Number(b.id) - Number(a.id));
  for (const [rank, c] of byNewest.entries()) {
    let days = 2 + rank * 3;
    if (c.soldAt) days = Math.max(days, Math.round((today.getTime() - Date.parse(c.soldAt)) / 86_400_000) + 14);
    c.listedAt = soldDate(days, today);
  }
  return cars;
}

// 4:3 centre crop. A shot that is far from 4:3 (a tall rear view) is fitted whole on its own background instead of cut, so no car loses a bumper.
async function frame(file) {
  const meta = await sharp(file).metadata();
  const ratio = meta.width / meta.height / (W / H);
  if (Math.abs(ratio - 1) <= 0.25) return sharp(file).resize(W, H, { fit: "cover" }).webp({ quality: 82 }).toBuffer();
  const [r, g, b] = await sharp(file).extract({ left: 0, top: 0, width: 1, height: 1 }).removeAlpha().raw().toBuffer();
  return sharp(file).resize(W, H, { fit: "contain", background: { r, g, b } }).webp({ quality: 82 }).toBuffer();
}

// A 16x12 grey thumbnail: two shots of the same view (a different crop or size) differ by almost nothing here, a different angle by a lot.
const thumb = async (webp) => [...(await sharp(webp).resize(16, 12, { fit: "fill" }).greyscale().raw().toBuffer())];
const alike = (a, b) => a.reduce((n, v, i) => n + Math.abs(v - b[i]), 0) / a.length < 6;

async function photos(dir, id, stems) {
  mkdirSync(`${NEXT}/${id}`, { recursive: true });
  const seen = [];
  const out = [];
  for (const stem of stems) {
    const webp = await frame(`${dir}/${stem}.jpg`);
    const t = await thumb(webp);
    if (seen.some((o) => alike(o, t))) {
      console.warn(`${id}: ${stem.split("_").pop()} is the same view as an earlier shot, left out`);
      continue;
    }
    seen.push(t);
    const hash = createHash("sha256").update(webp).digest("hex").slice(0, 8);
    const src = `/stock/${id}/${out.length + 1}-${hash}.webp`;
    writeFileSync(`${NEXT}${src.slice("/stock".length)}`, webp);
    out.push({ src, width: W, height: H });
  }
  if (out.length < 3) throw new Error(`${id}: only ${out.length} different photos, the site wants 3 or more`);
  return out;
}

// The catalogue gives the month the NCT runs to ("2027-03"). It is shown as the next such month from the day of the build, so it never reads as expired.
function nextNct(nct, today) {
  const month = Number(nct.slice(5));
  let year = today.getFullYear();
  if (month <= today.getMonth() + 1) year += 1; // this month or earlier: next year
  return `${year}-${String(month).padStart(2, "0")}`;
}

async function car(dir, c, today) {
  const { photos: stems, tier, extra, history, sold, nct, story, ...rest } = c;
  const out = { ...rest };
  out.makeSlug = slug(c.make);
  out.modelSlug = slug(c.model);
  out.slug = `${out.makeSlug}-${out.modelSlug}-${c.year}-${c.id}`;
  out.bodySlug = slug(c.bodyType);
  if (nct) out.nctExpiry = nextNct(nct, today);
  out.features = carFeatures({ tier, year: c.year, extra, condition: c.condition, history });
  out.description = describeCar({ ...out, story });
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
  write(USED_FILE, listDates(cars, today));
  write(EXTRA_FILE, listDates(JSON.parse(readFileSync(EXTRA_FILE, "utf8")), today));
} else if (arg) {
  const today = new Date();
  rmSync(NEXT, { recursive: true, force: true });
  const used = await Promise.all(USED.map((c) => car(arg, c, today)));
  const extra = await Promise.all(VANS.map((c) => car(arg, c, today)));
  rmSync("public/stock", { recursive: true, force: true });
  renameSync(NEXT, "public/stock");
  write(USED_FILE, listDates(used, today));
  write(EXTRA_FILE, listDates(extra, today));
  console.log(`${USED.length} used and ${VANS.length} vans written`);
} else {
  console.error("Usage: build.mjs <dataset dir> | redate");
  process.exit(1);
}
