import Link from "next/link";
import { notFound } from "next/navigation";
import { DataTable, EmptyState, PageHeader, SummaryTabs, TableFooter, TableToolbar, adminButton, pageOf, rowButton, sortRows, type Column, type FilterGroup } from "@/components/admin/kit";
import { OrderBadge } from "@/components/admin/badges";
import { ChoiceAct } from "@/components/admin/ActButton";
import { PlusIcon } from "@/components/stock/icons";
import { ORDER_STATUSES, ORDER_STATUS_LABELS, customersStore, orderOpen, ordersStore, type Order } from "@/lib/admin/collections";
import { monthLabel } from "@/lib/admin/reports";
import { stockSource } from "@/lib/stock-source";
import { setOrderStatusAction } from "./actions";

export const metadata = { title: "Orders" };

// New cars ordered from the factory for customers, due first. Our version only. The first view is every order still on its way to the
// customer, arrived ones included, so the next job on each (built, on its way, arrived, hand over) is in its row.
const VIEWS = {
  open: { label: "In progress", test: (o: Order) => orderOpen(o.status) },
  arrived: { label: "Ready to hand over", test: (o: Order) => o.status === "arrived" },
  done: { label: "Handed over", test: (o: Order) => o.status === "handed-over" },
  cancelled: { label: "Cancelled", test: (o: Order) => o.status === "cancelled" },
} as const;
type View = keyof typeof VIEWS;

// The way an order goes, and the button that moves it one step on. Arrived puts the car in stock and cannot be stepped back, so it asks.
const PATH = ["ordered", "built", "in-transit", "arrived"] as const;
const NEXT: Partial<Record<Order["status"], { to: (typeof PATH)[number]; label: string }>> = {
  ordered: { to: "built", label: "Mark built" },
  built: { to: "in-transit", label: "Mark on its way" },
  "in-transit": { to: "arrived", label: "Mark arrived" },
};

function NextStep({ o }: { o: Order }) {
  if (o.status === "arrived" && o.carId)
    return (
      <Link href={`/dashboard/stock/${o.carId}/sale`} className={`${rowButton} relative z-10 border-accent text-accent-text`}>
        Hand over
      </Link>
    );
  const next = NEXT[o.status];
  if (!next) return null;
  return (
    <span className="relative z-10">
      <ChoiceAct
        action={setOrderStatusAction.bind(null, o.id)}
        set={{ status: next.to, from: o.status }}
        back={next.to === "arrived" ? undefined : { status: o.status, from: next.to }}
        confirm={next.to === "arrived" ? { title: "Mark it arrived?", text: "The car goes into stock, held for the buyer. This cannot be stepped back.", yes: "It has arrived" } : undefined}
        active={false}
        done={`${o.make} ${o.model}: ${ORDER_STATUS_LABELS[next.to]}`}
        label={`${next.label}: ${o.make} ${o.model}`}
        className={rowButton}
      >
        {next.label}
      </ChoiceAct>
    </span>
  );
}

// Four dots for the four steps, filled up to where it is: the way along at a glance. The badge beside it says it in words.
function Steps({ status }: { status: Order["status"] }) {
  const at = PATH.indexOf(status as (typeof PATH)[number]);
  if (at < 0) return null;
  return (
    <span aria-hidden="true" className="hidden gap-1 sm:inline-flex">
      {PATH.map((s, i) => (
        <span key={s} className={`size-2 rounded-full ${i <= at ? "bg-accent" : "bg-hairline"}`} />
      ))}
    </span>
  );
}

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
          {/* On a phone where it is goes under the car, so the row keeps room for its next step. */}
          <span className="mt-1 sm:hidden"><OrderBadge status={o.status} /></span>
        </span>
      ),
      className: "max-w-[8.5rem] min-[25rem]:max-w-[12rem] sm:max-w-[20rem]", // narrow on a small phone, so the status beside it fits
    },
    { key: "spec", header: "Spec", hide: "xl", cell: (o) => <span title={[o.spec, o.colour].filter(Boolean).join(", ")} className="line-clamp-1 text-text-2">{[o.spec, o.colour].filter(Boolean).join(", ")}</span> },
    { key: "due", header: "Due", hide: "md", nowrap: true, sort: (o) => o.expected, cell: (o) => monthLabel(o.expected) },
    {
      key: "status",
      header: "Where it is",
      hide: "sm",
      nowrap: true,
      sort: (o) => ORDER_STATUSES.indexOf(o.status),
      cell: (o) => (
        <span className="inline-flex items-center gap-3">
          <Steps status={o.status} />
          <OrderBadge status={o.status} />
        </span>
      ),
    },
    // The job that moves it on, in the row: no need to open the order to say it was built or has arrived.
    ...(view === "open" || view === "arrived" ? [{ key: "next", header: "Next step", align: "right" as const, nowrap: true, cell: (o: Order) => <NextStep o={o} /> }] : []),
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
        text="New cars ordered from the factory for your customers, from the order to the handover."
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
        empty={
          <EmptyState
            title="No orders here"
            text={view === "open" && !q ? "An order request from your website comes in as a lead. Place the order from the lead, or here." : undefined}
            action={view === "open" && !q ? <Link href="/dashboard/orders/new" className={`mt-2 ${adminButton}`}>Place an order</Link> : undefined}
          />
        }
      />
      <TableFooter page={paged.page} pageCount={paged.pageCount} total={paged.total} per={paged.per} />
    </>
  );
}
