import Link from "next/link";
import { notFound } from "next/navigation";
import { DataTable, EmptyState, PageHeader, SummaryTabs, TableFooter, TableToolbar, adminButton, pageOf, sortRows, type Column, type FilterGroup } from "@/components/admin/kit";
import { OrderBadge } from "@/components/admin/badges";
import { PlusIcon } from "@/components/stock/icons";
import { ORDER_STATUSES, customersStore, orderOpen, ordersStore, type Order } from "@/lib/admin/collections";
import { fmtDate } from "@/lib/admin/format";
import { monthLabel } from "@/lib/admin/reports";
import { stockSource } from "@/lib/stock-source";

export const metadata = { title: "Orders" };

// New cars ordered from the factory for customers, due first. Our version only.
const VIEWS = {
  open: { label: "On order", test: (o: Order) => orderOpen(o.status) && o.status !== "arrived" },
  arrived: { label: "Arrived", test: (o: Order) => o.status === "arrived" },
  done: { label: "Handed over", test: (o: Order) => o.status === "handed-over" },
  cancelled: { label: "Cancelled", test: (o: Order) => o.status === "cancelled" },
} as const;
type View = keyof typeof VIEWS;

export default async function Page({ searchParams }: { searchParams: Promise<{ view?: string; q?: string; period?: string; by?: string; sort?: string; dir?: string; page?: string; per?: string }> }) {
  if ((await stockSource()) === "donedeal") notFound();
  const sp = await searchParams;
  const view: View = sp.view && Object.hasOwn(VIEWS, sp.view) ? (sp.view as View) : "open";
  const [orders, customers] = await Promise.all([ordersStore.list(), customersStore.list()]);
  const names = new Map(customers.map((c) => [c.id, c.name]));
  const q = (sp.q ?? "").trim().toLowerCase().slice(0, 60);
  const periods = [...new Set(orders.map((o) => o.regPeriod))].sort();
  const columns: Column<Order>[] = [
    {
      key: "car",
      header: "Car",
      sort: (o) => `${o.make} ${o.model}`,
      cell: (o) => (
        <span className="flex min-w-0 flex-col">
          <Link href={`/dashboard/orders/${o.id}`} title={`${o.regPeriod} ${o.make} ${o.model}`} className="line-clamp-2 font-medium text-text after:absolute after:inset-0">{o.regPeriod} {o.make} {o.model}</Link>
          <span className="truncate text-meta text-text-2">{(o.customerId && names.get(o.customerId)) || "Customer not on file"}</span>
        </span>
      ),
      className: "max-w-[8.5rem] min-[25rem]:max-w-[12rem] sm:max-w-[20rem]", // narrow on a small phone, so the status beside it fits
    },
    { key: "spec", header: "Spec", hide: "lg", cell: (o) => <span title={[o.spec, o.colour].filter(Boolean).join(", ")} className="line-clamp-1 text-text-2">{[o.spec, o.colour].filter(Boolean).join(", ")}</span> },
    { key: "ordered", header: "Ordered", hide: "md", nowrap: true, sort: (o) => o.orderedOn, cell: (o) => fmtDate(`${o.orderedOn}T12:00:00Z`) },
    { key: "due", header: "Due", hide: "sm", nowrap: true, sort: (o) => o.expected, cell: (o) => monthLabel(o.expected) },
    // Where it is on the way, as dots beside its status, so a list of orders reads at a glance.
    {
      key: "status",
      header: "Status",
      align: "right",
      nowrap: true,
      sort: (o) => ORDER_STATUSES.indexOf(o.status),
      cell: (o) => (
        <span className="inline-flex items-center gap-3">
          <OrderBadge status={o.status} />
        </span>
      ),
    },
  ];
  const matching = orders.filter((o) => VIEWS[view].test(o) && (!sp.period || o.regPeriod === sp.period) && (!sp.by || o.salesperson === sp.by) && (!q || `${o.make} ${o.model} ${o.spec ?? ""} ${(o.customerId && names.get(o.customerId)) || ""}`.toLowerCase().includes(q)));
  // No sort chosen: the soonest due first.
  const { rows: sorted, sort } = sortRows(matching, columns, sp, { key: "due", dir: "asc" });
  const paged = pageOf(sorted, sp);
  const rows = paged.rows;
  const takenBy = [...new Set(orders.map((o) => o.salesperson).filter((n): n is string => Boolean(n)))].sort();
  const filters: FilterGroup[] = [
    { name: "period", label: "Registration period", any: "Every period", options: periods.map((p) => [p, `${p} reg`] as const) },
    { name: "by", label: "Taken by", any: "Anyone", options: takenBy.map((n) => [n, n] as const) },
  ];
  return (
    <>
      <PageHeader
        title="Orders"
        text="Factory orders for new cars, from the order to the handover."
        actions={
          <Link href="/dashboard/orders/new" className={adminButton}>
            <PlusIcon className="size-4" />
            Place an order
          </Link>
        }
      />
      <SummaryTabs label="Orders" items={(Object.keys(VIEWS) as View[]).map((v) => ({ label: VIEWS[v].label, count: orders.filter(VIEWS[v].test).length, href: `/dashboard/orders?view=${v}`, active: view === v }))} />
      <TableToolbar search={{ placeholder: "Search", label: "Search orders" }} filters={filters} />
      <DataTable
        label="Orders"
        linkRows
        rows={rows}
        rowKey={(o) => o.id}
        sort={sort}
        columns={columns}
        empty={<EmptyState title="No orders here" text={view === "open" && !q ? "A request from the website's order form comes in as a lead. Place the order from the lead, or here." : undefined} />}
      />
      <TableFooter page={paged.page} pageCount={paged.pageCount} total={paged.total} per={paged.per} />
    </>
  );
}
