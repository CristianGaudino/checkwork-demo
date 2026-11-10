// Margin = what the car is advertised at, less what it cost the dealer. Before VAT and running costs: a simple figure for the dealer's own
// view. Pure, so it is tested.
export function marginOf(priceEur: number, costEur: number) {
  const eur = priceEur - costEur;
  return { eur, pct: priceEur > 0 ? (eur / priceEur) * 100 : 0 };
}

// A cost for a demo car: 80 to 90 percent of the advertised price, to the nearest 50 euro, the same every time for the same car.
export const demoCost = (id: string, priceEur: number) => Math.round((priceEur * (0.8 + ((Number(id) * 7) % 11) / 100)) / 50) * 50;

export const MAX_COST_EUR = 1_000_000;
export const BAD_COST = "Enter the cost in whole euros, like 12500.";

// What the cost box held: blank means "no cost on record" (null), a good figure is rounded to whole euros, anything else is invalid.
export function parseCost(raw: string): number | null | "invalid" {
  const text = raw.trim();
  if (text === "") return null;
  const eur = Number(text);
  return Number.isFinite(eur) && eur >= 0 && eur <= MAX_COST_EUR ? Math.round(eur) : "invalid";
}
