// The text on a demo car's page, written from the car's own facts so it reads like a dealer's listing. Plain words, no claims beyond the
// facts on the page, and nothing that says it is a demo. make-demo.mjs uses it for new cars; rewrite-descriptions.mjs applies it to the existing ones.
const GEARBOX = { manual: "manual", automatic: "automatic" };
const FUEL = { diesel: "diesel", petrol: "petrol", hybrid: "hybrid", electric: "electric", "plug-in-hybrid": "plug-in hybrid" };
const ordinal = (n) => (n === 1 ? "one previous owner" : `${n} previous owners`);

export function describeCar(c) {
  const name = `${c.year} ${c.make} ${c.model}${c.variant ? ` ${c.variant}` : ""}`;
  const spec = [c.colour && c.colour.toLowerCase(), FUEL[c.fuel] ?? c.fuel, GEARBOX[c.gearbox] && `${GEARBOX[c.gearbox]} gearbox`].filter(Boolean).join(", ");
  const facts = [c.mileageKm !== undefined && `${c.mileageKm.toLocaleString("en-IE")} km on the clock`, c.owners && ordinal(c.owners), c.nctExpiry && `NCT until ${c.nctExpiry.slice(5)}/${c.nctExpiry.slice(0, 4)}`].filter(Boolean).join(". ");
  return `${name}${spec ? `, ${spec}` : ""}. ${facts ? facts + "." : ""}\n\nCall in to see it, or book a test drive. Part exchange welcome and finance available.`.replace(". .", ".");
}

