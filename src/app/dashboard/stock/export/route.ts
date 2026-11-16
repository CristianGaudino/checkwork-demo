import { carCosts } from "@/lib/admin/costs";
import { csvResponse, toCsv, type CsvColumn } from "@/lib/admin/csv";
import { adminCars } from "@/lib/admin/stock-admin";
import { carStatus } from "@/lib/admin/stock-admin-pure";
import { parseStockList, stockList } from "@/lib/admin/stock-views";
import { can } from "@/lib/permissions";
import { FUEL_LABELS, GEARBOX_LABELS, type Car } from "@/lib/stock/types";

// The stock list as a CSV, with the list's view, search and filters. Every staff member; cost, prep and margin only for the margins roles.
export async function GET(req: Request) {
  const { view, q, ...filters } = parseStockList(Object.fromEntries(new URL(req.url).searchParams));
  const rows = stockList(await adminCars(), view, q, filters);
  const costs = (await can("margins")) ? await carCosts() : null;
  const columns: CsvColumn<Car>[] = [
    ["Make", (c) => c.make],
    ["Model", (c) => c.model],
    ["Variant", (c) => c.variant],
    ["Year", (c) => c.year],
    ["Price (€)", (c) => c.priceEur],
    ["Earlier price (€)", (c) => c.wasPriceEur],
    ["Mileage (km)", (c) => c.mileageKm],
    ["Fuel", (c) => (c.fuel ? FUEL_LABELS[c.fuel] : "")],
    ["Gearbox", (c) => (c.gearbox ? GEARBOX_LABELS[c.gearbox] : "")],
    ["Status", carStatus],
    ["Listed", (c) => c.listedAt],
    ["Photos", (c) => c.photos.length],
    ...(costs
      ? ([
          ["Cost (€)", (c) => costs.get(c.id)?.purchase],
          ["Prep (€)", (c) => costs.get(c.id)?.prep],
          ["Warranty repairs (€)", (c) => costs.get(c.id)?.claims],
          ["Margin (€)", (c) => (costs.has(c.id) && c.priceEur ? c.priceEur - costs.get(c.id)!.total : "")],
        ] as CsvColumn<Car>[])
      : []),
  ];
  return csvResponse("stock", toCsv(rows, columns));
}
