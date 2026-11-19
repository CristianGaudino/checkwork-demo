import Link from "next/link";
import { notFound } from "next/navigation";
import { CarStatusBadge } from "@/components/admin/badges";
import { DataTable, EmptyState, PageHeader, Panel, StatCard, StatGrid, TableFooter, TableToolbar, pageOf, sortRows, type Column } from "@/components/admin/kit";
import { carStatus } from "@/lib/admin/stock-admin-pure";
import { salesStore } from "@/lib/admin/collections";
import { carCosts } from "@/lib/admin/costs";
import { fmtEur, fmtNum, fmtPct, plural } from "@/lib/admin/format";
import { marginOf } from "@/lib/admin/margins";
import { adminCars } from "@/lib/admin/stock-admin";
import { can } from "@/lib/permissions";
import { carName, priceLabel } from "@/lib/stock/format";
import { isSold } from "@/lib/stock/types";
import type { Car } from "@/lib/stock/types";

export const metadata = { title: "Margins" };

// `price`: what the car sold for when a sale is recorded, else its advertised price. The margin is worked on it.
type Row = { car: Car; cost?: number; price: number; salePrice?: number };

// Needs the "margins" permission. Without it the page is not there: a hidden link is never the only protection.
export default async function Page({ searchParams }: { searchParams: Promise<{ q?: string; state?: string; sort?: string; dir?: string; page?: string; per?: string }> }) {
  const sp = await searchParams;
  if (!(await can("margins"))) notFound();
  const [cars, costs, sales] = await Promise.all([adminCars(), carCosts(), salesStore.list()]);
  const byId = new Map([...costs].map(([id, c]) => [id, c.total]));
  const soldFor = new Map(sales.filter((s) => !s.returnedOn).map((s) => [s.id, s.priceEur]));
  const rows: Row[] = cars
    .map((car) => {
      const salePrice = isSold(car) ? soldFor.get(car.id) : undefined;
      return { car, cost: byId.get(car.id), price: salePrice ?? car.priceEur, salePrice };
    }).sort((a, b) => Number(isSold(a.car)) - Number(isSold(b.car)) || Number(b.car.id) - Number(a.car.id));
  // A car on request (price 0, no sale recorded) has no margin to work out: it is left out of the sums.
  const known = rows.filter((r): r is Row & { cost: number } => r.cost !== undefined && r.price > 0);
  const stock = known.filter((r) => !isSold(r.car));
  const stockPrice = stock.reduce((s, r) => s + r.price, 0);
  const stockCost = stock.reduce((s, r) => s + r.cost, 0);
  const sold = known.filter((r) => isSold(r.car));
  const soldMargin = sold.reduce((s, r) => s + marginOf(r.price, r.cost).eur, 0);
  const stockMargin = marginOf(stockPrice, stockCost);
  // What "in stock" counts here (every car not sold, so reserved and hidden ones too), as Stock and Overview name them: "35 for sale, 2 reserved".
  const byStatus = new Map<string, number>();
  for (const r of stock) byStatus.set(carStatus(r.car), (byStatus.get(carStatus(r.car)) ?? 0) + 1);
  const stockHint = [...byStatus].sort((a, b) => b[1] - a[1]).map(([s, n]) => `${fmtNum(n)} ${s.toLowerCase()}`).join(", ") || "No cars in stock";

  const columns: Column<Row>[] = [
    {
      key: "car",
      header: "Car",
      sort: (r) => carName(r.car),
      cell: (r) => (
        <Link href={`/dashboard/stock/${r.car.id}`} className="inline-block min-w-28 font-semibold underline-offset-2 hover:underline">
          {carName(r.car)}
        </Link>
      ),
    },
    { key: "status", header: "Status", hide: "md", sort: (r) => carStatus(r.car), cell: (r) => <CarStatusBadge car={r.car} /> },
    { key: "price", header: "Price", align: "right", hide: "sm", sort: (r) => r.price, cell: (r) => (r.salePrice !== undefined ? <span className="flex flex-col items-end">{fmtEur(r.salePrice)}<span className="text-meta text-text-2">sold for</span></span> : priceLabel(r.car)) },
    {
      key: "cost",
      header: "Cost",
      align: "right",
      hide: "sm", // a phone keeps Car and Margin, so the margin is never cut off
      sort: (r) => r.cost,
      cell: (r) => {
        if (r.cost === undefined) return "Not set";
        const { prep, claims } = costs.get(r.car.id)!;
        const parts = [prep && `${fmtEur(prep)} prep`, claims && `${fmtEur(claims)} warranty`].filter(Boolean).join(", ");
        return parts ? <span className="flex flex-col items-end">{fmtEur(r.cost)}<span className="text-meta text-text-2 max-sm:hidden">with {parts}</span></span> : fmtEur(r.cost);
      },
    },
    { key: "margin", header: "Margin", align: "right", sort: (r) => (r.cost === undefined || !r.price ? undefined : marginOf(r.price, r.cost).eur), cell: (r) => (r.cost === undefined || !r.price ? "" : fmtEur(marginOf(r.price, r.cost).eur)) },
    { key: "pct", header: "Margin %", align: "right", hide: "md", sort: (r) => (r.cost === undefined || !r.price ? undefined : marginOf(r.price, r.cost).pct), cell: (r) => (r.cost === undefined || !r.price ? "" : fmtPct(marginOf(r.price, r.cost).pct)) },
  ];
  // The figures above are over every car; the table is searched, filtered, sorted and in pages.
  const q = (sp.q ?? "").trim().toLowerCase().slice(0, 60);
  const shown = rows.filter((r) => (!q || carName(r.car).toLowerCase().includes(q)) && (!sp.state || (sp.state === "sold") === isSold(r.car)) && (sp.state !== "no-cost" || r.cost === undefined));
  const { rows: sorted, sort } = sortRows(shown, columns, sp, { key: "", dir: "asc" });
  const paged = pageOf(sorted, sp);
  // The table's name says what it lists, so its "of 42" is not read as the stock count above.
  const scope = ({ stock: "In stock", sold: "Sold", "no-cost": "No cost price yet" } as Record<string, string>)[sp.state ?? ""] ?? "Every car, in stock and sold";

  return (
    <>
      <PageHeader title="Margins" text="Price less cost, prep included, before VAT. A sold car uses what it sold for." />
      <StatGrid>
        <StatCard label="Stock cost" value={fmtEur(stockCost)} hint={stockHint} />
        <StatCard label="Stock value" value={fmtEur(stockPrice)} hint="At the advertised prices" />
        <StatCard label="Expected margin" value={fmtEur(stockMargin.eur)} hint={`${fmtPct(stockMargin.pct)} of the value`} />
        <StatCard label="Margin on sold cars" value={fmtEur(soldMargin)} hint={`${plural(sold.length, "car")} sold`} />
      </StatGrid>
      <Panel title={scope}>
        <TableToolbar search={{ placeholder: "Search", label: "Search cars" }} filters={[{ name: "state", label: "Which cars", any: "Every car", options: [["stock", "In stock"], ["sold", "Sold"], ["no-cost", "No cost price yet"]] }]} />
        <DataTable bare columns={columns} rows={paged.rows} rowKey={(r) => r.car.id} sort={sort} empty={<EmptyState title="No cars match" />} />
        <TableFooter page={paged.page} pageCount={paged.pageCount} total={paged.total} per={paged.per} />
      </Panel>
    </>
  );
}
