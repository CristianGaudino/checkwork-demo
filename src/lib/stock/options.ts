import { everyKindOrNull } from "@/lib/stock";
import { carName } from "@/lib/stock/format";
import { isSold } from "@/lib/stock/types";

// The cars a visitor can pick in a form, as [id, name], newest first. Never a sold car: a trade-in against one would be refused.
export async function carChoices(): Promise<[string, string][]> {
  const cars = (await everyKindOrNull()) ?? [];
  return cars
    .filter((c) => !isSold(c))
    .sort((a, b) => Number(b.id) - Number(a.id))
    .map((c) => [c.id, `${carName(c)}${c.variant ? ` ${c.variant}` : ""}`]);
}
