// Step 1 of #45: index the photo dataset and find sets of one car.
//
//   node scripts/stock/index-dataset.mjs <dataset dir> <out dir>
//
// Writes <out dir>/sets.json (every candidate set) and <out dir>/sheet-N.jpg (contact sheets).
//
// The file title is Make_Model_Year_<specs>_<drive>_<seats>_<doors>_<body>_<id>. It has no colour
// and no car id, so a title group is a model year, not one car: it mixes colours, trims, auto-show
// stands and press shots. A set of one car is found by looking at the pixels instead: studio shots
// (white border) in the same body colour.
import { readdirSync, mkdirSync, writeFileSync } from 'node:fs'
import sharp from 'sharp'

const [dir, out] = process.argv.slice(2)
if (!dir || !out) throw new Error('usage: index-dataset.mjs <dataset dir> <out dir>')
mkdirSync(out, { recursive: true })

// Models that sell in Ireland (the dataset has US names for some). Everything else is skipped.
const IRISH = {
  Toyota: ['Yaris', 'Corolla', 'Prius', 'RAV4', 'C-HR', 'Prius C'],
  Hyundai: ['Elantra', 'Accent', 'Tucson', 'Santa Fe', 'Ioniq', 'Kona', 'Veloster', 'Kona Electric'],
  Volkswagen: ['Golf', 'Passat', 'Tiguan', 'Beetle', 'e-Golf', 'Jetta', 'Arteon'],
  Ford: ['Fiesta', 'Fusion', 'Escape', 'Edge', 'Mustang', 'Ecosport', 'Transit Connect Wagon'],
  Kia: ['Rio', 'Soul', 'Sportage', 'Sorento', 'Optima', 'Niro', 'Soul EV', 'Forte', 'Sedona', 'Stinger'],
  Nissan: ['Leaf', 'Versa', 'Rogue', 'Rogue Sport', 'Kicks', 'NV200', 'Murano'],
  Audi: ['A3', 'A4', 'A5', 'A6', 'Q3', 'Q5', 'Q7', 'TT', 'e-tron'],
  BMW: ['2-Series', '3-Series', '4-Series', '5-Series', 'X1', 'X2', 'X3', 'X5', 'i3'],
  'Mercedes-Benz': ['A Class', 'C Class', 'E Class', 'CLA Class', 'GLA Class', 'GLC Class'],
  Mazda: ['MAZDA3', 'MAZDA6', 'CX-5', 'CX-3', 'MX-5 Miata', 'CX-30'],
  Honda: ['Civic', 'Accord', 'Fit', 'CR-V', 'HR-V', 'Insight', 'Clarity'],
  Volvo: ['S60', 'V60', 'XC60', 'XC90', 'S90', 'V90', 'XC40'],
  'Land Rover': ['Range Rover Evoque', 'Discovery Sport', 'Discovery', 'Range Rover Sport', 'Range Rover Velar'],
  MINI: ['Cooper', 'Cooper Countryman', 'Clubman'],
}

const groups = new Map()
for (const f of readdirSync(dir)) {
  const p = f.replace(/\.jpg$/, '').split('_')
  if (p.length !== 17 || !IRISH[p[0]]?.includes(p[1])) continue
  const key = p.slice(0, 16).join('_')
  if (!groups.has(key)) groups.set(key, { key, make: p[0], model: p[1], year: +p[2], body: p[15], drive: p[12], files: [] })
  groups.get(key).files.push(f)
}

// 40x30 look at a photo: studio shot (white border) and the median body colour.
async function look(file) {
  const W = 40, H = 30
  const px = await sharp(`${dir}/${file}`).resize(W, H, { fit: 'fill' }).removeAlpha().raw().toBuffer()
  const at = (x, y) => [px[(y * W + x) * 3], px[(y * W + x) * 3 + 1], px[(y * W + x) * 3 + 2]]
  let ring = 0, white = 0
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (x > 1 && x < W - 2 && y > 1 && y < H - 2) continue
    ring++
    if (Math.min(...at(x, y)) >= 235) white++
  }
  const body = [[], [], []]
  for (let y = 8; y < 26; y++) for (let x = 6; x < 34; x++) {
    const c = at(x, y)
    if (Math.min(...c) < 225) c.forEach((v, i) => body[i].push(v))
  }
  const med = (a) => a.sort((m, n) => m - n)[a.length >> 1] ?? 255
  return { file, studio: white / ring > 0.9, colour: body.map(med) }
}

const dist = (a, b) => Math.hypot(...a.map((v, i) => v - b[i]))
const sets = []
const all = [...groups.values()]
for (let i = 0, queue = [...all]; i < all.length; i += 16) {
  const batch = queue.splice(0, 16)
  await Promise.all(batch.map(async (g) => {
    const shots = (await Promise.all(g.files.map(look))).filter((s) => s.studio)
    const clusters = []
    for (const s of shots) {
      const c = clusters.find((k) => dist(k.colour, s.colour) < 25)
      if (c) { c.files.push(s.file); c.colour = c.colour.map((v, j) => (v * (c.files.length - 1) + s.colour[j]) / c.files.length) }
      else clusters.push({ colour: s.colour, files: [s.file] })
    }
    for (const c of clusters) if (c.files.length >= 4) sets.push({ key: g.key, make: g.make, model: g.model, year: g.year, body: g.body, drive: g.drive, colour: c.colour.map(Math.round), photos: c.files.length, files: c.files.sort() })
  }))
  process.stderr.write(`\r${Math.min(i + 16, all.length)}/${all.length} title groups`)
}
sets.sort((a, b) => b.photos - a.photos)
writeFileSync(`${out}/sets.json`, JSON.stringify(sets, null, 1))

// Compact list: set key, photos, year
console.log(`\n${all.length} title groups for Irish models, ${sets.length} candidate sets of 4+ studio shots`)
const perModel = {}
for (const s of sets) perModel[`${s.make} ${s.model}`] = (perModel[`${s.make} ${s.model}`] ?? 0) + 1
console.log(Object.entries(perModel).sort().map(([m, n]) => `${m}: ${n}`).join('\n'))

// Contact sheets: best set per make/model/year, 6 shots a row. Sets over 14 photos are almost always
// several cars merged (same colour family), so the strongest are 6 to 14 and the rest are left out.
const seen = new Set(), best = []
for (const s of sets.filter((s) => s.photos >= 6 && s.photos <= 14)) { const k = `${s.make} ${s.model} ${s.year}`; if (!seen.has(k)) { seen.add(k); best.push(s) } }
const ROWS = 8, COLS = 6, W = 200, H = 150, LABEL = 22
for (let n = 0; n < 6 && n * ROWS < best.length; n++) {
  const rows = best.slice(n * ROWS, (n + 1) * ROWS)
  const layers = []
  for (const [r, s] of rows.entries()) {
    const top = r * (H + LABEL)
    const [cr, cg, cb] = s.colour
    const text = `${s.make} ${s.model} ${s.year} ${s.body} ${s.photos} photos`.replace(/&/g, '&amp;')
    layers.push({ input: Buffer.from(`<svg width="${COLS * W}" height="${LABEL}"><rect width="100%" height="100%" fill="#222"/><rect width="${LABEL}" height="${LABEL}" fill="rgb(${cr},${cg},${cb})"/><text x="${LABEL + 6}" y="16" font-size="14" font-family="Helvetica" fill="#fff">${text}</text></svg>`), left: 0, top })
    for (const [c, f] of s.files.slice(0, COLS).entries())
      layers.push({ input: await sharp(`${dir}/${f}`).resize(W, H, { fit: 'cover' }).toBuffer(), left: c * W, top: top + LABEL })
  }
  await sharp({ create: { width: COLS * W, height: rows.length * (H + LABEL), channels: 3, background: '#fff' } })
    .composite(layers).jpeg({ quality: 72 }).toFile(`${out}/sheet-${n + 1}.jpg`)
}
console.log(`${best.length} strong make/model/year sets, first ${Math.min(6, Math.ceil(best.length / ROWS))} sheets in ${out}`)
