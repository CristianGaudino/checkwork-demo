import demoCars from "@/lib/stock/demo-cars.json";
import type { Car } from "@/lib/stock/types";

// Made-up records for the admin and platform areas. Everything here is invented: names, emails (example.com is reserved for this),
// numbers and figures. Times are relative to "now" when a collection is first read, so the demo always looks current.
const cars = demoCars as Car[];
const live = cars.filter((c) => !c.soldAt);

// A small seeded random generator (mulberry32), so a seed gives the same records every time it runs.
export function rng(seed: number) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int: (min: number, max: number) => min + Math.floor(next() * (max - min + 1)),
    pick: <T>(list: readonly T[]): T => list[Math.floor(next() * list.length)],
  };
}

const FIRST = ["Aoife", "Ciaran", "Niamh", "Sean", "Orla", "Conor", "Saoirse", "Darragh", "Roisin", "Eoin", "Grainne", "Fionn", "Maeve", "Cathal", "Sinead", "Tadhg", "Aisling", "Rory", "Clodagh", "Donal", "Una", "Padraig", "Eimear", "Colm"];
const LAST = ["Brennan", "Doyle", "Kavanagh", "Lynch", "Murphy", "Nolan", "O'Brien", "Quinn", "Ryan", "Walsh", "Byrne", "Fitzgerald", "Gallagher", "Hegarty", "Keane", "McCarthy", "Sheehan", "Foley", "Daly", "Moran"];

export const DAY = 86_400_000;
export const HOUR = 3_600_000;

export function person(r: ReturnType<typeof rng>) {
  const first = r.pick(FIRST);
  const last = r.pick(LAST);
  const email = `${first}.${last}`.toLowerCase().replace(/[^a-z.]/g, "") + "@example.com";
  const phone = `+353 83 000 ${String(r.int(1000, 9999))}`;
  return { name: `${first} ${last}`, email, phone };
}

export const carTitleOf = (c: Car) => `${c.year} ${c.make} ${c.model}`;
export const livePicks = (r: ReturnType<typeof rng>) => r.pick(live);
export const liveCars = live;
export const allCars = cars;
