import { FUEL_LABELS, GEARBOX_LABELS, forSale, type Fuel, type Gearbox } from "@/lib/stock/types";
import { carFacts, newestForSale } from "@/lib/admin/marketing";
import { adminCars } from "@/lib/admin/stock-admin";
import { getSettings, leadsStore, LEAD_TYPE_LABELS, reviewsStore } from "@/lib/admin/collections";
import { noContacts, type CarFacts, type FactsOf, type WriteRequest } from "./tasks";
import { firstName } from "@/lib/whatsapp/rules";

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

// Builds what a task may see from the records. The browser sends ids (and, for a car being edited, the form's own boxes); never the facts.
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
      const cars = newestForSale(await adminCars(), 5);
      return { task: "newsletter", facts: { dealer, cars: cars.map(carFacts), voice: v } };
    }
    case "carDescription": {
      const car = formCarFacts(req.fields);
      return car ? { task: "carDescription", facts: { dealer, car, notes: text(noContacts(req.fields.description ?? ""), 600) } } : null;
    }
    case "leadReply": {
      const lead = await leadsStore.get(req.leadId);
      return lead ? { task: "leadReply", facts: { dealer, firstName: firstName(lead.name, ""), kind: LEAD_TYPE_LABELS[lead.type], message: noContacts(lead.message).slice(0, 600), car: lead.carTitle } } : null;
    }
    case "reviewReply": {
      const r = await reviewsStore.get(req.reviewId);
      return r ? { task: "reviewReply", facts: { dealer, firstName: firstName(r.author, ""), rating: r.rating, text: noContacts(r.text).slice(0, 600) } } : null;
    }
  }
}
