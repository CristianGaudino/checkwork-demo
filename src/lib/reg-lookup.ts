import "server-only";
import demoCars from "@/lib/stock/demo-cars.json";
import { modeOf } from "@/lib/integrations";
import { parseIrishReg, type RegFacts } from "@/lib/reg";
import type { Car, Fuel } from "@/lib/stock/types";

// A registration lookup: what the plate says on its own (year, county), and with a lookup service the car itself. `filled` is what was
// found beyond the plate, for the forms to fill in.
export type CarFound = { make: string; model: string; fuel?: Fuel; engineLitres?: number; colour?: string; bodyType?: string };
export type RegLookup = RegFacts & { car?: CarFound };

// Cartell is the service (issue #2). Until its adapter is written:
// - simulated (the demo): sample details from the demo stock, the same for the same plate every time, so the flow can be shown;
// - off, or live without the adapter: only the plate's own facts, which are always true.
// shortcut: no adapter yet. Each real lookup costs money, so the adapter must cache by registration, cap lookups a day, and be behind the
// bot check on the public forms before it is switched on.
export async function lookupReg(raw: string): Promise<RegLookup | null> {
  const facts = parseIrishReg(raw);
  if (!facts) return null;
  if (modeOf("reglookup") !== "simulated") return facts; // ADAPTER GOES HERE for "live"
  return { ...facts, car: sampleCar(facts.reg) };
}

// One of the demo cars, picked by the plate, so a plate always gives the same car.
function sampleCar(reg: string): CarFound {
  const cars = demoCars as Car[];
  let h = 0;
  for (const ch of reg) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const c = cars[h % cars.length];
  return { make: c.make, model: c.model, fuel: c.fuel, engineLitres: c.engineLitres, colour: c.colour, bodyType: c.bodyType };
}
