// The text on a car's page, written from the car's own facts so it reads like a dealer's listing. Plain words, no claims beyond the
// facts on the page, no em dashes, and nothing that says it is a demo. build.mjs calls it for every car.
const FUEL = { diesel: "diesel", petrol: "petrol", hybrid: "hybrid", electric: "electric", "plug-in-hybrid": "plug-in hybrid" };
const owners = (n) => (n === 1 ? "One previous owner" : `${n} previous owners`);
// The items worth naming in a sentence, best first.
const HEADLINE = ["Panoramic Sunroof", "Full Leather", "Satellite Navigation", "Heated Front Seats", "Reversing Camera", "Keyless Entry", "Climate Control", "Cruise Control", "Bluetooth"];
const list = (a) => (a.length < 2 ? a.join("") : `${a.slice(0, -1).join(", ")} and ${a.at(-1)}`);

export function describeCar(c) {
  const name = `${c.year} ${c.make} ${c.model}${c.variant ? ` ${c.variant}` : ""}`;
  const spec = [c.colour?.toLowerCase(), FUEL[c.fuel], c.gearbox && `${c.gearbox} gearbox`].filter(Boolean).join(", ");
  const nct = c.nctExpiry && `NCT until ${c.nctExpiry.slice(5)}/${c.nctExpiry.slice(0, 4)}`;
  const km = c.mileageKm !== undefined && `${c.mileageKm.toLocaleString("en-IE")} km on the clock`;
  const facts =
    c.condition === "commercial" ? [km, c.owners && owners(c.owners), "The price shown is without VAT, which a VAT-registered buyer can usually reclaim"]
    : [km, c.owners && owners(c.owners), nct, c.features?.includes("Full Service History") && "Full service history"];
  const kit = HEADLINE.filter((f) => c.features?.includes(f)).slice(0, 4);
  const lines = [`${name}${spec ? `, ${spec}` : ""}.`, `${facts.filter(Boolean).join(". ")}.`, kit.length > 1 && `Equipment includes ${list(kit.map((f) => f.toLowerCase()))}.`];
  // `story`: the dealer's own paragraph about this car, when the catalogue has one (build.mjs passes it in).
  return `${lines.filter(Boolean).join(" ")}${c.story ? `\n\n${c.story}` : ""}\n\nCall in to see it, or book a test drive. Part exchange welcome and finance available.`;
}
