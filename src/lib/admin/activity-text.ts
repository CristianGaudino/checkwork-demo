import { CAR_FIELDS } from "./car-fields";
import { fmtEur } from "./format";
import { priceLabel } from "@/lib/stock/format";

// The words an activity entry uses for a car edit: the price in full (the change people ask about), the rest by name.
// "Changed the price from €17,950 to €16,950, and the mileage and colour". Pure, so it is tested.
// Ordinary words lowered, short forms (NCT, CO2, AC) kept.
const name = (label: string) => label.replace(/\s*\(.*\)$/, "").replace(/\b[A-Z][a-z]*\b/g, (w) => w.toLowerCase());
const list = (words: string[]) => (words.length > 1 ? `${words.slice(0, -1).join(", ")} and ${words.at(-1)}` : (words[0] ?? ""));

export function carEditSummary(was: object, now: object): string {
  const [before, after] = [was as Record<string, unknown>, now as Record<string, unknown>];
  const changed = CAR_FIELDS.filter((f) => JSON.stringify(before[f.name] ?? null) !== JSON.stringify(after[f.name] ?? null));
  const price = changed.find((f) => f.name === "priceEur");
  const photos = JSON.stringify(before.photos ?? []) !== JSON.stringify(after.photos ?? []) ? ["photos"] : []; // not a form field, but synced
  const rest = list([...changed.filter((f) => f !== price).map((f) => name(f.label)), ...photos]);
  const priceText = price ? `the price from ${priceLabel({ priceEur: Number(before.priceEur) })} to ${priceLabel({ priceEur: Number(after.priceEur) })}` : "";
  if (!priceText && !rest) return "Saved the car with no changes";
  return `Changed ${priceText}${priceText && rest ? ", and the " : rest ? "the " : ""}${rest}`;
}

// "Set the cost to €11,500", "Changed the cost from €12,000 to €11,500", "Cleared the cost"; null when it did not change.
export function costText(was: number | undefined, now: number | null): string | null {
  if (now === (was ?? null)) return null;
  if (now === null) return "Cleared the cost";
  return was === undefined ? `Set the cost to ${fmtEur(now)}` : `Changed the cost from ${fmtEur(was)} to ${fmtEur(now)}`;
}

// "a Facebook post", "an Instagram post".
export const aOrAn = (word: string) => `${/^[aeiou]/i.test(word) ? "an" : "a"} ${word}`;
