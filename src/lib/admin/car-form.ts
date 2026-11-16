import { z } from "zod";
import { listedOn, slugify, carSlug } from "./stock-admin-pure";
import { CONDITIONS, FUELS, GEARBOXES, TEXT_LIMITS, VAT_STATUSES, type Car } from "@/lib/stock/types";
import { blank, fieldErrors } from "./validation";

// The car form, as data the server checks. The browser's own limits (min, max, maxLength) are a convenience; this is the check.
// Empty boxes mean "not given", never zero.
const text = (max: number) => z.preprocess(blank, z.string().trim().max(max).optional());
const num = (min: number, max: number) => z.preprocess(blank, z.coerce.number().min(min).max(max).optional());
const int = (min: number, max: number) => z.preprocess(blank, z.coerce.number().int().min(min).max(max).optional());
const oneOf = <T extends readonly [string, ...string[]]>(values: T) => z.preprocess(blank, z.enum(values).optional());

export const carFormSchema = z.object({
  make: z.string().trim().min(1, "Enter the make").max(40),
  model: z.string().trim().min(1, "Enter the model").max(60),
  variant: text(TEXT_LIMITS.variant),
  year: z.coerce.number().int().min(1980, "Enter a year from 1980").max(new Date().getFullYear() + 1),
  priceEur: z.coerce.number().int("Whole euros only").min(1, "Enter the price").max(1_000_000),
  wasPriceEur: int(0, 1_000_000),
  condition: oneOf(CONDITIONS),
  vat: oneOf(VAT_STATUSES),
  mileageKm: int(0, 2_000_000),
  fuel: oneOf(FUELS),
  gearbox: oneOf(GEARBOXES),
  bodyType: text(40),
  engineLitres: num(0, 10),
  colour: text(40),
  doors: int(1, 6),
  seats: int(1, 9),
  owners: int(0, 20),
  nctExpiry: z.preprocess(blank, z.string().regex(/^\d{4}-\d{2}$/, "Use the form 2027-07").optional()),
  description: text(TEXT_LIMITS.description),
  features: z.preprocess(
    (v) => (typeof v === "string" ? v.split("\n").map((l) => l.trim()).filter(Boolean) : []),
    z.array(z.string().max(TEXT_LIMITS.feature)).max(60),
  ),
  // Whether it is on the website. Selling is never here: Mark sold records the sale with it.
  listing: z.enum(["live", "hidden", "draft"]).default("live"),
});

export type CarForm = z.infer<typeof carFormSchema>;
export type FormResult = { ok: true; car: Car } | { ok: false; errors: Record<string, string> };

// Turns what the form sent into a Car. The photos, and anything the form does not edit, come from the car being edited.
export function carFromForm(data: FormData, id: string, existing?: Car, today = new Date().toISOString().slice(0, 10)): FormResult {
  const parsed = carFormSchema.safeParse(Object.fromEntries(data));
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };
  const f = parsed.data;
  const base = { id, make: f.make, model: f.model, year: f.year };
  const car: Car = {
    ...existing,
    ...base,
    slug: carSlug(base),
    makeSlug: slugify(f.make),
    modelSlug: slugify(f.model),
    variant: f.variant,
    priceEur: f.priceEur,
    wasPriceEur: f.wasPriceEur,
    condition: f.condition,
    vat: f.vat,
    mileageKm: f.mileageKm,
    fuel: f.fuel,
    gearbox: f.gearbox,
    bodyType: f.bodyType,
    bodySlug: f.bodyType ? slugify(f.bodyType) : undefined,
    engineLitres: f.engineLitres,
    colour: f.colour,
    doors: f.doors,
    seats: f.seats,
    owners: f.owners,
    nctExpiry: f.nctExpiry,
    description: f.description,
    features: f.features.length ? f.features : undefined,
    photos: existing?.photos ?? [],
    listing: f.listing === "live" ? undefined : f.listing,
    listedAt: listedOn(existing, f.listing === "live", today),
  };
  // JSON drops undefined, but a stored car with empty keys is noise: leave them out.
  return { ok: true, car: JSON.parse(JSON.stringify(car)) as Car };
}
