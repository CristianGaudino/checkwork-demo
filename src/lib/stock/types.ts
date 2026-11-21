import textLimits from "./text-limits.json";
import { DEALER_RULES } from "@/lib/dealer.config";
export const FUELS = ["petrol", "diesel", "hybrid", "plug-in-hybrid", "electric", "other"] as const;
export type Fuel = (typeof FUELS)[number];
// The fuels with a plug: the ones that have a range, a battery and charging figures.
export const PLUG_FUELS: readonly Fuel[] = ["electric", "plug-in-hybrid"];
export const FUEL_LABELS: Record<Fuel, string> = {
  petrol: "Petrol",
  diesel: "Diesel",
  hybrid: "Hybrid",
  "plug-in-hybrid": "Plug-in hybrid",
  electric: "Electric",
  other: "Other",
};
export const GEARBOXES = ["manual", "automatic"] as const;
export type Gearbox = (typeof GEARBOXES)[number];
export const GEARBOX_LABELS: Record<Gearbox, string> = { manual: "Manual", automatic: "Automatic" };
// The stops of the price slider (PriceRange). The first and last mean "no limit". Here, so the server schema can read them.
export const PRICE_STOPS = [0, 2500, 5000, 7500, 10_000, 12_500, 15_000, 17_500, 20_000, 25_000, 30_000, 35_000, 40_000, 50_000, 60_000, 80_000, 100_000];
// What kind of vehicle it is. Absent means used, which is every car in the seed today (#23, #24 add new and commercial).
export const CONDITIONS = ["used", "new", "commercial"] as const;
export type Condition = (typeof CONDITIONS)[number];
// Whether priceEur has VAT in it. "inc": included. "ex": VAT on top, reclaimable by a VAT-registered buyer (vans). Absent: nothing said.
export const VAT_STATUSES = ["inc", "ex"] as const;
export type VatStatus = (typeof VAT_STATUSES)[number];
export const SORT_KEYS = ["newest", "price-asc", "price-desc", "year-desc", "km-asc"] as const;
export type SortKey = (typeof SORT_KEYS)[number];

export interface Photo {
  src: string;
  width: number;
  height: number;
}

// The most a feed's free text may run to (the demo's longest: 978, 33 and 52). The numbers are in text-limits.json, which the feed script reads
// too; the mapper cuts to them and demo-cars.test.ts holds the data to them. A guess to confirm with the real feed: the layout is checked
// against these lengths, so raise them only after looking at the pages.
export const TEXT_LIMITS: { description: number; variant: number; feature: number } = textLimits;

export interface Car {
  id: string; // stable source listing id, digits only, e.g. "4508173"
  slug: string; // `${makeSlug}-${modelSlug}-${year}-${id}`, unique, a public URL (D-08)
  make: string; // display label, e.g. "Mercedes-Benz"
  makeSlug: string; // e.g. "mercedes-benz"
  model: string;
  modelSlug: string;
  variant?: string;
  year: number;
  priceEur: number; // whole euro, as advertised: see vat for whether VAT is in it
  wasPriceEur?: number; // the earlier price, when this one is a drop
  condition?: Condition;
  vat?: VatStatus;
  mileageKm?: number;
  fuel?: Fuel;
  gearbox?: Gearbox;
  bodyType?: string; // display label, e.g. "SUV"
  bodySlug?: string; // e.g. "suv"
  engineLitres?: number; // 2 for "2L"; render "2.0 L"
  colour?: string;
  doors?: number;
  seats?: number;
  owners?: number; // 2 for "2 Owners"
  nctExpiry?: string; // "2027-07" for "07/2027"
  maxSpeedMph?: number; // 126 for "126 mph", as published; the page shows km/h unless the buyer chose miles
  zeroTo62Secs?: number; // 9.9 for "9.9 seconds"
  co2GKm?: number; // CO2 in g/km, as the dealer entered it
  motorTaxEur?: number; // annual motor tax in whole euro, entered by the dealer: the site never works it out
  // Electric and plug-in hybrid only (the car form keeps them for those fuels alone).
  evRangeKm?: number; // WLTP range
  batteryKwh?: number;
  acChargeKw?: number; // the most it takes on AC
  dcChargeKw?: number; // the most it takes on DC
  charge10To80Mins?: number; // 10 to 80% on a fast charger
  description?: string; // the dealer's text, line breaks kept, contact block removed
  features?: string[]; // equipment items
  photos: Photo[]; // 0 to 6, local /stock/... paths
  soldAt?: string; // ISO date (YYYY-MM-DD). Drives the sold window and the 410 only. Never render it anywhere.
  listedAt?: string; // ISO date (YYYY-MM-DD) the car went on the site: the Newest sort, days in stock, the sitemap date
  listing?: "draft" | "hidden"; // off the website: a draft not yet published, or hidden by the dealer. Absent: on the website. Never public.
  reserved?: boolean; // a deposit is on it: on the website, marked Reserved and listed after the cars for sale. Our version only.
  takenDownAt?: string; // YYYY-MM-DD the DoneDeal ad came down: hidden until the dealer says whether it sold or was withdrawn
  listingUrl?: string; // its ad on DoneDeal, for stock synced from there (src/lib/donedeal): where the dealer edits it
}

export interface StockQuery {
  condition?: Condition; // absent means used: new cars and vans are asked for by name
  q?: string;
  make: string[]; // makeSlug values
  model: string[]; // modelSlug values
  yearFrom?: number;
  yearTo?: number;
  priceMin?: number;
  priceMax?: number;
  body: string[]; // bodySlug values
  fuel: Fuel[];
  gearbox?: Gearbox;
  kmMax?: number;
  sort: SortKey;
  sold?: "include" | "only"; // absent = in stock only; "include" lists in-period sold cars after the in-stock ones
  page: number; // 1-based
  pageSize: number;
}

export type FacetGroup = "make" | "model" | "body" | "fuel" | "gearbox";
export interface FacetOption {
  value: string;
  label: string;
  count: number;
  parent?: string; // makeSlug, model options only
}
export interface Facets {
  make: FacetOption[];
  model: FacetOption[];
  body: FacetOption[];
  fuel: FacetOption[];
  gearbox: FacetOption[];
  years: { min: number; max: number } | null; // over the whole stock, not the selection
}
export interface StockResult {
  cars: Car[];
  total: number;
  page: number;
  pageCount: number;
  facets: Facets;
}
// Days a sold car stays visible after its sale date (D-02): the dealer's setting.
export const SOLD_VISIBLE_DAYS = DEALER_RULES.soldVisibleDays;
// Whether the car has a page on the public site now: not hidden or a draft, and if sold, inside the sold period (the engine's own rule).
export const onPublicSite = (c: Pick<Car, "listing" | "soldAt">, now = Date.now()) => !c.listing && (!c.soldAt || Date.parse(c.soldAt) + SOLD_VISIBLE_DAYS * 86_400_000 > now);
export const isSold = (car: Pick<Car, "soldAt">) => car.soldAt !== undefined;
// New from the maker: a new car, or a van with no previous owner (vans are sold new and used under one condition).
export const isNew = (car: Pick<Car, "condition" | "owners">) => car.condition === "new" || (car.condition === "commercial" && car.owners === 0);
// On the website and for sale: not sold, not a draft, not hidden, not reserved. Where a car must be offered (posts, test drives) and old
// stock (a price to look at); "not sold" alone is the stock the dealer owns (margins), hidden cars included.
export const forSale = (car: Pick<Car, "soldAt" | "listing" | "reserved">) => !isSold(car) && !car.listing && !car.reserved;
// A price of €0 is Price on request: no figure, no finance, no drop, and last in a price sort.
export const onRequest = (car: Pick<Car, "priceEur">) => car.priceEur === 0;
// Reduced: an earlier, higher price is shown struck through. Never on a car with its price on request.
export const isReduced = (car: Pick<Car, "priceEur" | "wasPriceEur">) => !onRequest(car) && car.wasPriceEur !== undefined && car.wasPriceEur > car.priceEur;

// live: in stock or sold inside the period. gone: sold past the period (the URL answers 410). null: never known (404).
export type Lookup = { state: "live"; car: Car } | { state: "gone"; make: string; makeSlug: string } | null;

// Every make, body type and model ever listed, expired cars included, so a make page can exist with nothing in stock.
export interface Taxonomy {
  makes: { slug: string; label: string }[];
  bodies: { slug: string; label: string }[];
  models: { makeSlug: string; slug: string; label: string }[];
}

export interface StockProvider {
  query(q: StockQuery): Promise<StockResult>;
  getBySlug(slug: string): Promise<Car | null>; // in stock or sold inside the period
  getById(id: string): Promise<Car | null>; // the stable source listing id (STK-01 "one car by id/slug"); same visibility as getBySlug
  getByIds(ids: string[]): Promise<(Car | null)[]>; // same order as asked; one round trip for a live provider
  lookup(slug: string): Promise<Lookup>;
  taxonomy(): Promise<Taxonomy>; // over every car, expired included
}
