import { FUEL_LABELS, GEARBOX_LABELS, onRequest } from "./types";
import { knownKm } from "./markers";
import { PRICING } from "./pricing.config";
import type { Car, Condition } from "./types";

const eur = new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
const km = new Intl.NumberFormat("en-IE");

export const fmtEur = (n: number) => eur.format(n);
export const formatKm = (n: number) => `${km.format(n)} km`;
export const fmtNum = (n: number) => km.format(n); // 1,163, as the rest of the site writes a number
export const KM_PER_MILE = 1.609344;

export const carTitle = (car: Pick<Car, "make" | "model" | "variant">) => [car.make, car.model, car.variant].filter(Boolean).join(" ");
export const carName = (car: Pick<Car, "year" | "make" | "model">) => `${car.year} ${car.make} ${car.model}`;
// A car's own page, whatever kind it is (used and commercial both live under /used-cars).
export const carHref = (slug: string) => `/used-cars/${slug}`;
// What a lead dialog shows of a car (CarSummary). Only these fields cross into client components, never the Car (LED-02).
// The price as words: the figure, or Price on request for a price of 0.
export const priceLabel = (car: Pick<Car, "priceEur">) => (onRequest(car) ? PRICING.labels.onRequest : fmtEur(car.priceEur));
export const carSummary = (car: Car) => ({ id: car.id, name: carName(car), title: carTitle(car), variant: car.variant, price: priceLabel(car), photo: car.photos[0]?.src });

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
// "2027-07" -> "Jul 2027". Fixed names, not Intl, so the Worker and Node print the same text.
const nctLabel = (s: string) => {
  const m = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(s);
  return m ? `${MONTHS[Number(m[2]) - 1]} ${m[1]}` : undefined;
};

// Every spec the car has, in the order the page shows them. Rows with no value are left out (D-10); a feed's road tax due date is dropped on purpose (stale), and
// the annual motor tax shows only as the dealer entered it.
// The speeds are in km/h, the site's own unit; `miles` is the same row for a buyer who chose miles, with the mph as published.
export type SpecRow = { label: string; value: string; miles?: { label: string; value: string } };
const withUnit = (n: number | undefined, unit: string) => (n === undefined ? undefined : `${fmtNum(n)} ${unit}`);

export function specRows(car: Car): SpecRow[] {
  const mph = car.maxSpeedMph;
  const range = car.evRangeKm;
  const rows: [string, string | undefined, SpecRow["miles"]?][] = [
    ["Year", String(car.year)],
    ["Mileage", knownKm(car) === undefined ? undefined : formatKm(knownKm(car)!)],
    ["Fuel", car.fuel && FUEL_LABELS[car.fuel]],
    ["Transmission", car.gearbox && GEARBOX_LABELS[car.gearbox]],
    ["Body type", car.bodyType],
    ["Engine", car.engineLitres === undefined ? undefined : `${car.engineLitres.toFixed(1)} L`],
    ["Range (WLTP)", withUnit(range, "km"), range === undefined ? undefined : { label: "Range (WLTP)", value: `${fmtNum(Math.round(range / KM_PER_MILE))} miles` }],
    ["Battery", withUnit(car.batteryKwh, "kWh")],
    ["Max AC charging", withUnit(car.acChargeKw, "kW")],
    ["Max DC charging", withUnit(car.dcChargeKw, "kW")],
    ["10 to 80% charge", withUnit(car.charge10To80Mins, "min")],
    ["Colour", car.colour],
    ["Doors", car.doors === undefined ? undefined : String(car.doors)],
    ["Seats", car.seats === undefined ? undefined : String(car.seats)],
    ["Owners", car.owners ? String(car.owners) : undefined], // 0 is a new vehicle: no row, not "Owners 0"
    ["NCT expires", car.nctExpiry && nctLabel(car.nctExpiry)],
    ["CO2", withUnit(car.co2GKm, "g/km")],
    ["Motor tax", car.motorTaxEur === undefined ? undefined : `${fmtEur(car.motorTaxEur)} a year`],
    ["Max speed", mph === undefined ? undefined : `${Math.round(mph * KM_PER_MILE)} km/h`, { label: "Max speed", value: `${mph} mph` }],
    ["0 to 100 km/h", car.zeroTo62Secs === undefined ? undefined : `${car.zeroTo62Secs} s`, { label: "0 to 62 mph", value: `${car.zeroTo62Secs} s` }],
  ];
  return rows.flatMap(([label, value, miles]) => (value ? [miles ? { label, value, miles } : { label, value }] : []));
}

// The first four present of Year, Mileage, Fuel, Transmission, Body type, Engine, Colour: spec order is the priority order.
const KEY_LABELS = ["Year", "Mileage", "Fuel", "Transmission", "Body type", "Engine", "Colour"];
export const keyFacts = (car: Car) => specRows(car).filter((r) => KEY_LABELS.includes(r.label)).slice(0, 4);

// What a list of each kind counts: the commercial pages call theirs vans, as the home page tile does.
export const NOUNS: Record<Condition, string> = { used: "car", commercial: "van" };
export const countLabel = (n: number, noun = "car") => (n === 0 ? `No ${noun}s` : n === 1 ? `1 ${noun}` : `${fmtNum(n)} ${noun}s`);

// Equipment comes from the dealer's feed in Title Case ("Air Conditioning"); the site writes sentence case ("Air conditioning"). Only
// plain capitalised words after the first are lowered: acronyms (ABS, DAB) and brand names in KEEP stay as they are.
const KEEP = new Set(["Android", "Apple", "Auto", "Bluetooth", "Isofix", "Bose", "Harman", "Kardon", "Meridian", "Alcantara"]);
export const featureLabel = (f: string) =>
  f
    .split(" ")
    .map((w, i) => (i > 0 && /^[A-Z][a-z]+$/.test(w) && !KEEP.has(w) ? w.toLowerCase() : w))
    .join(" ");

// Dealer text as plain words: tags dropped (a <br> or </p> becomes a line break) and the common entities decoded. React still escapes
// what is left, so this is about looks, not safety.
export const plainText = (s: string) =>
  s
    .replace(/<br\s*\/?>|<\/p>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

// A sold car's text without its closing invitation ("Call in to see it, or book a test drive..."): only a last paragraph of its own that
// asks for a visit or a drive goes, so the facts about the car stay.
export const withoutInvitation = (s: string) => s.replace(/\s*\n\s*(?:call in|book a test drive)\b[^\n]*$/i, "");

// Search ignores case and accents, so "skoda" finds "Škoda" and "citroen" finds "Citroën". The one rule for every search on the site.
export const fold = (s: string) => s.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
