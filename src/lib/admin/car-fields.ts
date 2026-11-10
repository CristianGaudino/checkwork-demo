import { CONDITIONS, FUEL_LABELS, FUELS, GEARBOX_LABELS, GEARBOXES, VAT_STATUSES } from "@/lib/stock/types";

// The car form as data: which boxes there are, in which group, and what they offer. The form component draws from this, so adding a
// field is one line here (and one in car-form.ts, which checks it).
export type FieldSpec = {
  name: string;
  label: string;
  type: "text" | "number" | "select" | "textarea";
  group: "Basics" | "Price" | "Details" | "Description";
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
  { name: "vat", label: "VAT", type: "select", group: "Price", options: VAT_STATUSES.map((v) => [v, v === "inc" ? "Price includes VAT" : "Price excludes VAT"] as const), hint: "Leave empty to say nothing" },
  { name: "mileageKm", label: "Mileage (km)", type: "number", group: "Details" },
  { name: "fuel", label: "Fuel", type: "select", group: "Details", options: FUELS.map((f) => [f, FUEL_LABELS[f]] as const) },
  { name: "gearbox", label: "Gearbox", type: "select", group: "Details", options: GEARBOXES.map((g) => [g, GEARBOX_LABELS[g]] as const) },
  { name: "bodyType", label: "Body type", type: "text", group: "Details", hint: "For example SUV or Hatchback" },
  { name: "engineLitres", label: "Engine (litres)", type: "number", group: "Details", step: "0.1" },
  { name: "colour", label: "Colour", type: "text", group: "Details" },
  { name: "doors", label: "Doors", type: "number", group: "Details" },
  { name: "seats", label: "Seats", type: "number", group: "Details" },
  { name: "owners", label: "Owners", type: "number", group: "Details" },
  { name: "nctExpiry", label: "NCT expiry", type: "text", group: "Details", hint: "Month and year, like 2027-07" },
  { name: "description", label: "Description", type: "textarea", group: "Description", wide: true },
  { name: "features", label: "Equipment", type: "textarea", group: "Description", wide: true, hint: "One item per line" },
];

export const FIELD_GROUPS = ["Basics", "Price", "Details", "Description"] as const;
