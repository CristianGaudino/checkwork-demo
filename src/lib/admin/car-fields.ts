import { CONDITIONS, FUEL_LABELS, FUELS, GEARBOX_LABELS, GEARBOXES, VAT_STATUSES } from "@/lib/stock/types";

// The car form as data: which boxes there are, in which group, and what they offer. The form component draws from this, so adding a
// field is one line here (and one in car-form.ts, which checks it).
export type FieldSpec = {
  name: string;
  label: string;
  type: "text" | "number" | "select" | "textarea" | "month";
  group: (typeof FIELD_GROUPS)[number];
  options?: readonly (readonly [string, string])[];
  hint?: string;
  step?: string;
  wide?: boolean;
};

const cap = (s: string) => s[0].toUpperCase() + s.slice(1);

export const CAR_FIELDS: FieldSpec[] = [
  { name: "make", label: "Make", type: "text", group: "Basics" },
  { name: "model", label: "Model", type: "text", group: "Basics" },
  { name: "variant", label: "Variant", type: "text", group: "Basics", wide: true },
  { name: "year", label: "Year", type: "number", group: "Basics" },
  { name: "condition", label: "Type", type: "select", group: "Basics", options: CONDITIONS.map((c) => [c, cap(c)] as const) },
  { name: "priceEur", label: "Price (€)", type: "number", group: "Price" },
  { name: "wasPriceEur", label: "Earlier price (€)", type: "number", group: "Price", hint: "Fill in for a price drop" },
  { name: "vat", label: "VAT", type: "select", group: "Price", options: VAT_STATUSES.map((v) => [v, v === "inc" ? "Price includes VAT" : "Price excludes VAT"] as const) },
  { name: "mileageKm", label: "Mileage (km)", type: "number", group: "Details" },
  { name: "fuel", label: "Fuel", type: "select", group: "Details", options: FUELS.map((f) => [f, FUEL_LABELS[f]] as const) },
  { name: "gearbox", label: "Gearbox", type: "select", group: "Details", options: GEARBOXES.map((g) => [g, GEARBOX_LABELS[g]] as const) },
  { name: "bodyType", label: "Body type", type: "text", group: "Details", hint: "For example SUV or Hatchback" },
  { name: "engineLitres", label: "Engine (litres)", type: "number", group: "Details", step: "0.1" },
  { name: "colour", label: "Colour", type: "text", group: "Details" },
  { name: "doors", label: "Doors", type: "number", group: "Details" },
  { name: "seats", label: "Seats", type: "number", group: "Details" },
  { name: "owners", label: "Owners", type: "number", group: "Details" },
  { name: "nctExpiry", label: "NCT expiry", type: "month", group: "Details" },
  { name: "co2GKm", label: "CO2 (g/km)", type: "number", group: "Details" },
  { name: "motorTaxEur", label: "Motor tax (€ a year)", type: "number", group: "Details" },
  // Shown for an electric car or a plug-in hybrid only (CarForm); the server drops them for any other fuel.
  { name: "evRangeKm", label: "Range (km, WLTP)", type: "number", group: "Battery and charging" },
  { name: "batteryKwh", label: "Battery (kWh)", type: "number", group: "Battery and charging", step: "0.1" },
  { name: "acChargeKw", label: "Max AC charging (kW)", type: "number", group: "Battery and charging", step: "0.1" },
  { name: "dcChargeKw", label: "Max DC charging (kW)", type: "number", group: "Battery and charging" },
  { name: "charge10To80Mins", label: "10 to 80% charge (minutes)", type: "number", group: "Battery and charging" },
  { name: "description", label: "Description", type: "textarea", group: "Description and equipment", wide: true },
  { name: "features", label: "Equipment", type: "textarea", group: "Description and equipment", wide: true, hint: "One item per line" },
];

export const FIELD_GROUPS = ["Basics", "Price", "Details", "Battery and charging", "Description and equipment"] as const;

// A saved car as the form's boxes, cut to what the AI writer accepts: what "Improve this description" sends for a synced car, which has no form.
export const carFields = (car: object): Record<string, string> =>
  Object.fromEntries(CAR_FIELDS.map(({ name }) => {
    const v = name === "features" ? (car as { features?: string[] }).features?.join("\n") : (car as Record<string, unknown>)[name];
    return [name, v === undefined || v === null ? "" : String(v).slice(0, 4000)];
  }));
