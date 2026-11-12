import Link from "next/link";
import { notFound } from "next/navigation";
import { DataTable, EmptyState, PageHeader, Pager, SummaryTabs, adminButton, paginate } from "@/components/admin/kit";
import { OrderBadge } from "@/components/admin/badges";
import { PlusIcon } from "@/components/stock/icons";
import { customersStore, orderOpen, ordersStore, type Order } from "@/lib/admin/collections";
import { monthLabel } from "@/lib/admin/reports";
import { stockSource } from "@/lib/stock-source";

export const metadata = { title: "Orders" };

// New cars ordered from the factory for customers, due first. Our version only.
const VIEWS = {
  open: { label: "On order", test: (o: Order) => orderOpen(o.status) && o.status !== "arrived" },
  arrived: { label: "To hand over", test: (o: Order) => o.status === "arrived" },
  done: { label: "Handed over", test: (o: Order) => o.status === "handed-over" },
  cancelled: { label: "Cancelled", test: (o: Order) => o.status === "cancelled" },
} as const;
type View = keyof typeof VIEWS;

export default async function Page({ searchParams }: { searchParams: Promise<{ view?: string; page?: string }> }) {
  if ((await stockSource()) === "donedeal") notFound();
  const sp = await searchParams;
  const view: View = sp.view && Object.hasOwn(VIEWS, sp.view) ? (sp.view as View) : "open";
  const [orders, customers] = await Promise.all([ordersStore.list(), customersStore.list()]);
  const names = new Map(customers.map((c) => [c.id, c.name]));
  const { rows, page, pageCount, total } = paginate([...orders].filter(VIEWS[view].test).sort((a, b) => a.expected.localeCompare(b.expected) || b.createdAt - a.createdAt), sp.page);
  return (
    <>
      <PageHeader
        title="Orders"
        text="New cars ordered from the factory for customers."
        actions={
          <Link href="/dashboard/orders/new" className={adminButton}>
            <PlusIcon className="size-4" />
            Place an order
          </Link>
        }
      />
      <SummaryTabs label="Orders" items={(Object.keys(VIEWS) as View[]).map((v) => ({ label: VIEWS[v].label, count: orders.filter(VIEWS[v].test).length, href: `/dashboard/orders?view=${v}`, active: view === v }))} />
      <DataTable
        label="Orders"
        linkRows
        rows={rows}
        rowKey={(o) => o.id}
        empty={<EmptyState title="No orders here" text={view === "open" ? "A request from the website's order form comes in as a lead. Place the order from the lead, or here." : undefined} />}
        columns={[
          {
            key: "car",
            header: "Car",
            cell: (o) => (
              <span className="flex min-w-0 flex-col">
                <Link href={`/dashboard/orders/${o.id}`} className="truncate font-medium after:absolute after:inset-0">{o.regPeriod} {o.make} {o.model}</Link>
                <span className="truncate text-meta text-text-2">{(o.customerId && names.get(o.customerId)) || "Customer not on file"}</span>
              </span>
            ),
            className: "max-w-[12rem] sm:max-w-[20rem]",
          },
          { key: "spec", header: "Spec", hide: "lg", cell: (o) => <span className="line-clamp-1 text-text-2">{[o.spec, o.colour].filter(Boolean).join(", ")}</span> },
          { key: "due", header: "Due", hide: "sm", nowrap: true, cell: (o) => monthLabel(o.expected) },
          { key: "status", header: "Status", align: "right", cell: (o) => <OrderBadge status={o.status} /> },
        ]}
      />
      <Pager page={page} pageCount={pageCount} total={total} href={(n) => `/dashboard/orders?view=${view}&page=${n}`} />
    </>
  );
}
