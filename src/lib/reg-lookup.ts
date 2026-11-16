import "server-only";
import demoCars from "@/lib/stock/demo-cars.json";
import { defineCollection } from "@/lib/admin/docs";
import { getBindings } from "@/lib/leads/bindings";
import { REG_CACHE_DAYS } from "@/lib/leads/constants";
import { modeOf } from "@/lib/integrations";
import { parseIrishReg, type RegFacts } from "@/lib/reg";
import { DAY } from "@/lib/time";
import type { Car, Fuel } from "@/lib/stock/types";

// A registration lookup: what the plate says on its own (year, county), and with a lookup service the car itself. One lookup for the
// visitor's forms (trade-in, sell) and the dealer's (Add a car, #103; a lead).
export type CarFound = { make: string; model: string; fuel?: Fuel; engineLitres?: number; colour?: string; bodyType?: string };
// `limited`: the dealer's monthly limit for lookups is reached (#181), so only the plate's own facts came back.
export type RegLookup = RegFacts & { car?: CarFound; limited?: true };

// Cartell is the service (issue #2). Each real lookup costs money, so a live one goes through these limits first, in this order:
// 1. the cache: a plate looked up in the last 30 days is answered from it, free, however often it is asked for;
// 2. a cap for the whole site a day (REG_LOOKUPS_A_DAY), so a bot that gets past the rest still has a ceiling on the bill;
// 3. per visitor, REG_LOOKUPS_PER_VISITOR_A_DAY paid lookups a day: a trade-in needs one or two, so more is someone trying plates;
// 4. per visitor, 5 a minute (the lead form's limiter, its own key), so a burst stops at once.
// Staff (the dashboard's own action, behind Cloudflare Access) skip 3 and 4: the whole dealership shares one address. The site cap holds.
// Past a limit, the answer is the plate's own facts, as when the service is off: the form still works, the person types the rest.
// Simulated (the demo): a sample car from the demo stock, the same for the same plate every time. Off: only the plate's facts.
export const REG_LOOKUPS_A_DAY = 200;
export const REG_LOOKUPS_PER_VISITOR_A_DAY = 10;
type Cached = { id: string; car: CarFound | null; at: number };
type Count = { id: string; n: number };
export const regCache = defineCollection<Cached>("reg-cache", () => []);
export const regCounts = defineCollection<Count>("reg-counts", () => []);

// The service itself. ADAPTER GOES HERE: call Cartell with CARTELL_API_KEY and map its answer; null when it does not know the plate.
export async function cartell(reg: string): Promise<CarFound | null> {
  void reg;
  throw new Error("Cartell adapter not installed");
}

// The visitor's count is kept under a hash of the day and their address, never the address: it cannot be read back, nor linked to the
// same visitor on another day. The daily purge clears past days (src/lib/leads/purge.ts, by the "day-" prefix).
async function visitorCountId(today: string, visitor: string): Promise<string> {
  const hash = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${today}|${visitor}`)));
  return `${today}-v-${[...hash.slice(0, 12)].map((b) => b.toString(16).padStart(2, "0")).join("")}`;
}

// `visitor`: the visitor's address, for their limits; null for staff, who have none. `meter`: the dealer's monthly limit and count
// (src/lib/billing/usage.ts): asked before a lookup that costs money (or would, on the demo), counted after it. A cached answer is free, so
// it is given even past the limit and never counted. Past the limit the answer is the plate's own facts, marked `limited`.
type Meter = { allowed(): Promise<boolean>; paid(): Promise<void> };
export async function lookupReg(raw: string, visitor: string | null, service: (reg: string) => Promise<CarFound | null> = cartell, meter?: Meter): Promise<RegLookup | null> {
  const facts = parseIrishReg(raw);
  if (!facts) return null;
  const mode = modeOf("reglookup");
  if (mode === "simulated") {
    if (meter && !(await meter.allowed())) return { ...facts, limited: true };
    await meter?.paid();
    return { ...facts, car: sampleCar(facts.reg) };
  }
  if (mode === "off") return facts;

  const now = Date.now();
  const hit = await regCache.get(facts.reg);
  if (hit && hit.at > now - REG_CACHE_DAYS * DAY) return hit.car ? { ...facts, car: hit.car } : facts;
  if (meter && !(await meter.allowed())) return { ...facts, limited: true };
  const today = `day-${new Date(now).toISOString().slice(0, 10)}`;
  // shortcut: the count is read then written, so two lookups at the same moment can both pass at the cap. A few over a cap of 200 is
  // fine; a Durable Object counter if the cap ever has to be exact.
  const count = (await regCounts.get(today))?.n ?? 0;
  if (count >= REG_LOOKUPS_A_DAY) return facts;
  const mine = visitor === null ? null : await visitorCountId(today, visitor);
  const used = mine ? ((await regCounts.get(mine))?.n ?? 0) : 0;
  if (mine && used >= REG_LOOKUPS_PER_VISITOR_A_DAY) return facts;
  const limiter = getBindings().LEAD_LIMITER;
  if (visitor !== null && limiter && !(await limiter.limit({ key: `reg:${visitor}` })).success) return facts;

  await regCounts.put({ id: today, n: count + 1 });
  if (mine) await regCounts.put({ id: mine, n: used + 1 });
  let car: CarFound | null;
  try {
    car = await service(facts.reg);
  } catch {
    return facts; // a failed lookup is not cached, and never stops the form
  }
  await meter?.paid();
  await regCache.put({ id: facts.reg, car, at: now });
  return car ? { ...facts, car } : facts;
}

// One of the demo cars, picked by the plate, so a plate always gives the same car.
function sampleCar(reg: string): CarFound {
  const cars = demoCars as Car[];
  let h = 0;
  for (const ch of reg) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const c = cars[h % cars.length];
  return { make: c.make, model: c.model, fuel: c.fuel, engineLitres: c.engineLitres, colour: c.colour, bodyType: c.bodyType };
}
