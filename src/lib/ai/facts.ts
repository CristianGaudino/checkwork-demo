import { FUEL_LABELS, GEARBOX_LABELS, forSale, type Car, type Fuel, type Gearbox } from "@/lib/stock/types";
import { carHref, carName, formatPrice } from "@/lib/stock/format";
import { priceInfo } from "@/lib/stock/price";
import { SITE_URL } from "@/lib/site";
import { adminCars } from "@/lib/admin/stock-admin";
import { getSettings, leadsStore, LEAD_TYPE_LABELS, reviewsStore } from "@/lib/admin/collections";
import type { CarFacts, FactsOf, WriteRequest } from "./tasks";

// Builds what a task may see from the records. The browser sends ids (and, for a car being edited, the form's own boxes); never the facts.
export function carFacts(c: Car): CarFacts {
  const p = priceInfo(c);
  return {
    name: `${carName(c)}${c.variant ? ` ${c.variant}` : ""}`,
    year: c.year, mileageKm: c.mileageKm, fuel: c.fuel && FUEL_LABELS[c.fuel], gearbox: c.gearbox && GEARBOX_LABELS[c.gearbox], body: c.bodyType, engineLitres: c.engineLitres,
    colour: c.colour, doors: c.doors, seats: c.seats, owners: c.owners, nctExpiry: c.nctExpiry,
    price: [p.headline, p.vatLine].filter(Boolean).join(" "),
    was: c.wasPriceEur !== undefined && c.wasPriceEur > c.priceEur ? formatPrice(c.wasPriceEur) : undefined,
    features: c.features?.slice(0, 12),
    link: `${SITE_URL}${carHref(c.slug)}`,
  };
}

const num = (s: string | undefined) => (s && Number.isFinite(Number(s)) && Number(s) > 0 ? Number(s) : undefined);
const text = (s: string | undefined, max = 80) => s?.trim().slice(0, max) || undefined;
// The car form's boxes, as typed (they may not be saved yet).
export function formCarFacts(f: Record<string, string>): CarFacts | null {
  const make = text(f.make);
  const model = text(f.model);
  if (!make || !model) return null;
  const year = num(f.year);
  const label = <T extends string>(map: Record<T, string>, v?: string) => (v && v in map ? map[v as T] : undefined);
  return {
    name: [year, make, model, text(f.variant)].filter(Boolean).join(" "),
    year, mileageKm: num(f.mileageKm), fuel: label<Fuel>(FUEL_LABELS, f.fuel), gearbox: label<Gearbox>(GEARBOX_LABELS, f.gearbox), body: text(f.bodyType), engineLitres: num(f.engineLitres),
    colour: text(f.colour), doors: num(f.doors), seats: num(f.seats), owners: num(f.owners), nctExpiry: text(f.nctExpiry, 7),
    features: (f.features ?? "").split("\n").map((x) => x.trim().slice(0, 60)).filter(Boolean).slice(0, 20),
  };
}

const first = (name: string) => name.trim().split(/\s+/)[0] ?? "";
type Built = { [K in WriteRequest["task"]]: { task: K; facts: FactsOf[K] } }[WriteRequest["task"]];
export async function buildFacts(req: WriteRequest, dealer: string): Promise<Built | null> {
  const { marketing: voice } = await getSettings();
  const v = { signOff: voice.signOff, hashtags: voice.hashtags };
  switch (req.task) {
    case "post": {
      const car = (await adminCars()).find((c) => c.slug === req.carSlug && forSale(c));
      return car ? { task: "post", facts: { dealer, car: carFacts(car), network: req.network, format: req.format, layout: req.layout, voice: v } } : null;
    }
    case "newsletter": {
      const cars = (await adminCars()).filter(forSale).sort((a, b) => Number(b.id) - Number(a.id)).slice(0, 5);
      return { task: "newsletter", facts: { dealer, cars: cars.map(carFacts), voice: v } };
    }
    case "carDescription": {
      const car = formCarFacts(req.fields);
      return car ? { task: "carDescription", facts: { dealer, car, notes: text(req.fields.description, 600) } } : null;
    }
    case "leadReply": {
      const lead = await leadsStore.get(req.leadId);
      return lead ? { task: "leadReply", facts: { dealer, firstName: first(lead.name), kind: LEAD_TYPE_LABELS[lead.type], message: lead.message.slice(0, 600), car: lead.carTitle } } : null;
    }
    case "reviewReply": {
      const r = await reviewsStore.get(req.reviewId);
      return r ? { task: "reviewReply", facts: { dealer, firstName: first(r.author), rating: r.rating, text: r.text.slice(0, 600) } } : null;
    }
  }
}
