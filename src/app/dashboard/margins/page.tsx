import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, DataTable, PageHeader, Pager, Panel, StatCard, StatGrid, paginate, type Column } from "@/components/admin/kit";
import { costsStore } from "@/lib/admin/collections";
import { fmtEur, fmtPct } from "@/lib/admin/format";
import { marginOf } from "@/lib/admin/margins";
import { adminCars } from "@/lib/admin/stock-admin";
import { can } from "@/lib/permissions";
import { carName } from "@/lib/stock/format";
import { isSold } from "@/lib/stock/types";
import type { Car } from "@/lib/stock/types";

export const metadata = { title: "Margins" };

type Row = { car: Car; cost?: number };

// Needs the "margins" permission. Without it the page is not there: a hidden link is never the only protection.
export default async function Page({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  if (!(await can("margins"))) notFound();
  const [cars, costs] = await Promise.all([adminCars(), costsStore.list()]);
  const byId = new Map(costs.map((c) => [c.id, c.costEur]));
  const rows: Row[] = cars.map((car) => ({ car, cost: byId.get(car.id) })).sort((a, b) => Number(isSold(a.car)) - Number(isSold(b.car)) || Number(b.car.id) - Number(a.car.id));
  const known = rows.filter((r): r is Row & { cost: number } => r.cost !== undefined);
  const stock = known.filter((r) => !isSold(r.car));
  const stockPrice = stock.reduce((s, r) => s + r.car.priceEur, 0);
  const stockCost = stock.reduce((s, r) => s + r.cost, 0);
  const sold = known.filter((r) => isSold(r.car));
  const soldMargin = sold.reduce((s, r) => s + marginOf(r.car.priceEur, r.cost).eur, 0);
  const stockMargin = marginOf(stockPrice, stockCost);
  const paged = paginate(rows, (await searchParams).page); // the figures above are over every car; the table is in pages

  const columns: Column<Row>[] = [
    {
      key: "car",
      header: "Car",
      cell: (r) => (
        <Link href={`/dashboard/stock/${r.car.id}`} className="font-semibold underline-offset-2 hover:underline">
          {carName(r.car)}
        </Link>
      ),
    },
    { key: "status", header: "Status", hide: "md", cell: (r) => (isSold(r.car) ? <Badge tone="neutral">Sold</Badge> : <Badge tone="good">For sale</Badge>) },
    { key: "price", header: "Price", align: "right", cell: (r) => fmtEur(r.car.priceEur) },
    { key: "cost", header: "Cost", align: "right", cell: (r) => (r.cost === undefined ? "Not set" : fmtEur(r.cost)) },
    { key: "margin", header: "Margin", align: "right", cell: (r) => (r.cost === undefined ? "" : fmtEur(marginOf(r.car.priceEur, r.cost).eur)) },
    { key: "pct", header: "Margin %", align: "right", hide: "md", cell: (r) => (r.cost === undefined ? "" : fmtPct(marginOf(r.car.priceEur, r.cost).pct)) },
  ];

  return (
    <>
      <PageHeader title="Margins" text="What each car cost and what it should make: the advertised price less the cost, before VAT and running costs. Only owners, managers and finance see this." />
      <StatGrid>
        <StatCard label="Stock cost" value={fmtEur(stockCost)} hint={`${stock.length} cars for sale`} />
        <StatCard label="Stock value" value={fmtEur(stockPrice)} hint="At the advertised prices" />
        <StatCard label="Expected margin" value={fmtEur(stockMargin.eur)} hint={`${fmtPct(stockMargin.pct)} of the value`} />
        <StatCard label="Margin on sold cars" value={fmtEur(soldMargin)} hint={`${sold.length} sold cars shown on the site`} />
      </StatGrid>
      <Panel title="Every car">
        <DataTable bare columns={columns} rows={paged.rows} rowKey={(r) => r.car.id} />
        <Pager page={paged.page} pageCount={paged.pageCount} total={paged.total} href={(n) => `/dashboard/margins?page=${n}`} />
      </Panel>
    </>
  );
}
