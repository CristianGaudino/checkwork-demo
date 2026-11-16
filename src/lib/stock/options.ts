import { everyKindOrNull } from "@/lib/stock";
import { carName } from "@/lib/stock/format";
import { isSold } from "@/lib/stock/types";
import { enabledModules } from "@/lib/modules";
import { conditionShown } from "@/lib/modules-rules";

// The cars a visitor can pick in a form, as [id, name], newest first. Never a sold car: a trade-in against one would be refused.
// New cars and vans only with their module (#173): their pages are not there without it.
export async function carChoices(): Promise<[string, string][]> {
  const [cars, modules] = [(await everyKindOrNull()) ?? [], await enabledModules()];
  return cars
    .filter((c) => !isSold(c) && conditionShown(modules, c.condition))
    .sort((a, b) => Number(b.id) - Number(a.id))
    .map((c) => [c.id, `${carName(c)}${c.variant ? ` ${c.variant}` : ""}`]);
}
