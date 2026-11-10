// Draws the demo's brand pictures: the hero, the about picture, the logo files and the default share image. Manual: never run in CI,
// at build time or at runtime.   node scripts/demo/make-demo.mjs build
// The cars and their photos are not here: see scripts/stock/build.mjs.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import sharp from "sharp";

const BRAND = "public/brand";
const INDIGO = "#4f46e5";

// A side-on car, 620 wide, on a 900 x 675 canvas. `lift` raises (or lowers) the roof.
function carShape({ paint, lift }) {
  const l = lift;
  const body = `M140 432 L146 392 Q150 378 175 372 L310 350 Q340 346 360 ${322 - l / 2} L405 ${300 - l} Q420 ${290 - l} 445 ${290 - l} L560 ${290 - l} Q590 ${292 - l} 612 ${318 - l / 2} L650 352 Q700 358 735 372 Q758 382 760 410 L762 432 Z`;
  const glass = `M372 ${332 - l / 2} L410 ${306 - l} L548 ${306 - l} L592 ${332 - l / 2} Z`;
  const wheel = (x) => `<circle cx="${x}" cy="452" r="54" fill="#090b13"/><circle cx="${x}" cy="452" r="34" fill="#2a2f45"/><circle cx="${x}" cy="452" r="14" fill="#8e96b8"/>`;
  return `<path d="${body}" fill="${paint}"/><path d="${body}" fill="url(#paint)"/><path d="${glass}" fill="#cfe0ff" opacity="0.32"/><path d="M480 ${306 - l} L480 ${340 - l / 2}" stroke="${paint}" stroke-width="8"/>${wheel(290)}${wheel(610)}`;
}

const defs = (hue, paint) => `<defs>
  <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="hsl(${hue} 45% 20%)"/><stop offset="1" stop-color="#0b1020"/></linearGradient>
  <linearGradient id="paint" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${paint}"/><stop offset="1" stop-color="#05060a" stop-opacity="0.55"/></linearGradient>
  <radialGradient id="glow" cx="0.5" cy="0.62" r="0.5"><stop offset="0" stop-color="${INDIGO}" stop-opacity="0.35"/><stop offset="1" stop-color="${INDIGO}" stop-opacity="0"/></radialGradient>
</defs>`;

function photoSvg({ paint, lift, flip, scale, hue, label }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="675" viewBox="0 0 900 675">${defs(hue, paint)}
  <rect width="900" height="675" fill="url(#bg)"/><rect width="900" height="675" fill="url(#glow)"/>
  <rect y="505" width="900" height="170" fill="#080b16" opacity="0.7"/>
  <ellipse cx="450" cy="510" rx="340" ry="22" fill="#000" opacity="0.55"/>
  <g transform="translate(${flip ? 900 : 0} 0) scale(${flip ? -1 : 1} 1) translate(450 ${470 - 470 * scale}) scale(${scale}) translate(-450 0)">${carShape({ paint, lift })}</g>
  <text x="32" y="48" fill="#a5adc9" opacity="0.7" font-family="Arial, Helvetica, sans-serif" font-size="22" letter-spacing="3">${label}</text>
</svg>`;
}

const write = (p, data) => (mkdirSync(dirname(p), { recursive: true }), writeFileSync(p, data));

async function build() {
  // Brand pictures: the Checkwork logo, and a made-up hero, about picture and share image in its colours.
  const logo = readFileSync(`${BRAND}/checkwork-logo-on-dark.svg`);
  write(`${BRAND}/logo.svg`, logo);
  write(`${BRAND}/logo.png`, await sharp(logo, { density: 300 }).resize({ width: 960 }).png().toBuffer());
  const paint = "#6a65e8";
  const heroSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="819" viewBox="0 0 1920 819">${defs(235, paint)}
  <rect width="1920" height="819" fill="url(#bg)"/><rect width="1920" height="819" fill="url(#glow)" transform="translate(500 0)"/>
  <rect y="640" width="1920" height="179" fill="#070a14"/><ellipse cx="1420" cy="660" rx="520" ry="30" fill="#000" opacity="0.55"/>
  <g transform="translate(800 60) scale(1.25)">${carShape({ paint, lift: 20 })}</g></svg>`;
  const heroWebp = await sharp(Buffer.from(heroSvg)).webp({ quality: 84 }).toBuffer();
  write(`${BRAND}/hero.webp`, heroWebp);
  write(`${BRAND}/hero-sm.webp`, await sharp(heroWebp).extract({ left: 960, top: 100, width: 900, height: 700 }).webp({ quality: 84 }).toBuffer());
  write(`${BRAND}/about.webp`, await sharp(Buffer.from(photoSvg({ paint, lift: 20, flip: true, scale: 1, hue: 235, label: "" }))).resize(1200, 900).webp({ quality: 82 }).toBuffer());
  const og = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630"><defs><radialGradient id="g" cx="0.5" cy="0.5" r="0.7"><stop offset="0" stop-color="${INDIGO}" stop-opacity="0.5"/><stop offset="1" stop-color="#0b1020"/></radialGradient></defs><rect width="1200" height="630" fill="url(#g)"/></svg>`);
  const mark = await sharp(logo, { density: 300 }).resize({ width: 640 }).png().toBuffer();
  write(`${BRAND}/og-default.png`, await sharp(og).composite([{ input: mark, gravity: "center" }]).png().toBuffer());
}

const [cmd] = process.argv.slice(2);
if (cmd === "build") await build();
else {
  console.error("Usage: make-demo.mjs build");
  process.exit(1);
}
