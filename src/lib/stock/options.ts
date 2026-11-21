import { everyKindOrNull } from "@/lib/stock";
import { carName } from "@/lib/stock/format";
import { forSale } from "@/lib/stock/types";

// The cars a visitor can pick in a form, as [id, name], newest first. Only cars for sale: a trade-in against a sold or reserved one would be refused.
export async function carChoices(): Promise<[string, string][]> {
  return ((await everyKindOrNull()) ?? [])
    .filter(forSale)
    .sort((a, b) => Number(b.id) - Number(a.id))
    .map((c) => [c.id, `${carName(c)}${c.variant ? ` ${c.variant}` : ""}`]);
}
