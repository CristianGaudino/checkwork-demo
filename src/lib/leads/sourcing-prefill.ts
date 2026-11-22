import { slugify } from "@/lib/stock/slug";
import { PRICE_STOPS } from "@/lib/stock/types";
import { SOURCING_BODIES } from "./constants";
import { MAKE_OPTIONS } from "./makes";

const one = (v: string | string[] | undefined) => (typeof v === "string" ? v : undefined);

// Find a car opened from a search (a make page, or no cars matching the filters) starts with that search filled in. Only what the form
// itself accepts is taken: a make and a type from their lists (matched by slug, so "Škoda" finds "Skoda"), a budget on the slider's steps,
// a one-line model of up to 60 characters. Anything else is left for the buyer to fill.
export function sourcingPrefill(p: Record<string, string | string[] | undefined>): Record<string, string> | undefined {
  const out: Record<string, string> = {};
  const make = one(p.make);
  const knownMake = make && MAKE_OPTIONS.find((o) => o.value && slugify(o.value) === slugify(make))?.value;
  if (knownMake) out.make = knownMake;
  const model = one(p.model)?.trim();
  if (model && model.length <= 60 && !/[\r\n]/.test(model)) out.model = model;
  const body = one(p.body);
  const knownBody = body && SOURCING_BODIES.find((b) => slugify(b) === slugify(body));
  if (knownBody) out.bodyType = knownBody;
  const budget = Number(one(p.budget));
  if (PRICE_STOPS.slice(1).includes(budget)) out.budgetMax = String(budget);
  return Object.keys(out).length ? out : undefined;
}
