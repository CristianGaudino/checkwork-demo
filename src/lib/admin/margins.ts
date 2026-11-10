// Margin = what the car is advertised at, less what it cost the dealer. Before VAT and running costs: a simple figure for the dealer's own
// view. Pure, so it is tested.
export function marginOf(priceEur: number, costEur: number) {
  const eur = priceEur - costEur;
  return { eur, pct: priceEur > 0 ? (eur / priceEur) * 100 : 0 };
}

// A cost for a demo car: 80 to 90 percent of the advertised price, to the nearest 50 euro, the same every time for the same car.
export const demoCost = (id: string, priceEur: number) => Math.round((priceEur * (0.8 + ((Number(id) * 7) % 11) / 100)) / 50) * 50;
