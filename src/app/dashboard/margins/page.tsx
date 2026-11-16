import Link from "next/link";
import { notFound } from "next/navigation";
import { CarStatusBadge } from "@/components/admin/badges";
import { DataTable, EmptyState, PageHeader, Panel, StatCard, StatGrid, TableFooter, TableToolbar, pageOf, sortRows, type Column } from "@/components/admin/kit";
import { carStatus } from "@/lib/admin/stock-admin-pure";
import { salesStore } from "@/lib/admin/collections";
import { carCosts } from "@/lib/admin/costs";
import { fmtEur, fmtPct, plural } from "@/lib/admin/format";
import { marginOf } from "@/lib/admin/margins";
import { adminCars } from "@/lib/admin/stock-admin";
import { can } from "@/lib/permissions";
import { carName } from "@/lib/stock/format";
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
  const known = rows.filter((r): r is Row & { cost: number } => r.cost !== undefined);
  const stock = known.filter((r) => !isSold(r.car));
  const stockPrice = stock.reduce((s, r) => s + r.car.priceEur, 0);
  const stockCost = stock.reduce((s, r) => s + r.cost, 0);
  const sold = known.filter((r) => isSold(r.car));
  const soldMargin = sold.reduce((s, r) => s + marginOf(r.price, r.cost).eur, 0);
  const stockMargin = marginOf(stockPrice, stockCost);

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
    { key: "price", header: "Price", align: "right", hide: "sm", sort: (r) => r.price, cell: (r) => (r.salePrice !== undefined ? <span className="flex flex-col items-end">{fmtEur(r.salePrice)}<span className="text-meta text-text-2">sold for</span></span> : fmtEur(r.car.priceEur)) },
    {
      key: "cost",
      header: "Cost",
      align: "right",
      sort: (r) => r.cost,
      cell: (r) => {
        if (r.cost === undefined) return "Not set";
        const { prep, claims } = costs.get(r.car.id)!;
        const parts = [prep && `${fmtEur(prep)} prep`, claims && `${fmtEur(claims)} warranty`].filter(Boolean).join(", ");
        return parts ? <span className="flex flex-col items-end">{fmtEur(r.cost)}<span className="text-meta text-text-2 max-sm:hidden">with {parts}</span></span> : fmtEur(r.cost);
      },
    },
    { key: "margin", header: "Margin", align: "right", sort: (r) => (r.cost === undefined ? undefined : marginOf(r.price, r.cost).eur), cell: (r) => (r.cost === undefined ? "" : fmtEur(marginOf(r.price, r.cost).eur)) },
    { key: "pct", header: "Margin %", align: "right", hide: "md", sort: (r) => (r.cost === undefined ? undefined : marginOf(r.price, r.cost).pct), cell: (r) => (r.cost === undefined ? "" : fmtPct(marginOf(r.price, r.cost).pct)) },
  ];
  // The figures above are over every car; the table is searched, filtered, sorted and in pages.
  const q = (sp.q ?? "").trim().toLowerCase().slice(0, 60);
  const shown = rows.filter((r) => (!q || carName(r.car).toLowerCase().includes(q)) && (!sp.state || (sp.state === "sold") === isSold(r.car)) && (sp.state !== "no-cost" || r.cost === undefined));
  const { rows: sorted, sort } = sortRows(shown, columns, sp, { key: "", dir: "asc" });
  const paged = pageOf(sorted, sp);

  return (
    <>
      <PageHeader title="Margins" text="What each car cost, prep included, and what it makes: the price less the cost, before VAT and running costs. A sold car uses what it sold for. Only owners, managers and finance see this." />
      <StatGrid>
        <StatCard label="Stock cost" value={fmtEur(stockCost)} hint={`${plural(stock.length, "unsold car")} with a cost`} />
        <StatCard label="Stock value" value={fmtEur(stockPrice)} hint="At the advertised prices" />
        <StatCard label="Expected margin" value={fmtEur(stockMargin.eur)} hint={`${fmtPct(stockMargin.pct)} of the value`} />
        <StatCard label="Margin on sold cars" value={fmtEur(soldMargin)} hint={`${plural(sold.length, "sold car")}, at what they sold for where recorded`} />
      </StatGrid>
      <Panel title="Every car">
        <TableToolbar search={{ placeholder: "Search", label: "Search cars" }} filters={[{ name: "state", label: "Which cars", any: "Every car", options: [["stock", "In stock"], ["sold", "Sold"], ["no-cost", "No cost price yet"]] }]} />
        <DataTable bare columns={columns} rows={paged.rows} rowKey={(r) => r.car.id} sort={sort} empty={<EmptyState title="No cars match" />} />
        <TableFooter page={paged.page} pageCount={paged.pageCount} total={paged.total} per={paged.per} />
      </Panel>
    </>
  );
}
