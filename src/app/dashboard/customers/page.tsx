import Link from "next/link";
import { Badge, DataTable, EmptyState, PageHeader, SummaryTabs, TableFooter, TableToolbar, pageOf, rowButton, sortRows, type Column, type FilterGroup } from "@/components/admin/kit";
import { filterAlerts, filterCustomers, filterSubscribers } from "@/lib/admin/customer-lists";
import { ActButton } from "@/components/admin/ActButton";
import { can } from "@/lib/permissions";
import { notFound } from "next/navigation";
import { hasModule } from "@/lib/modules";
import { ALERT_KINDS, ALERT_KIND_LABELS, alertsStore, customersStore, subscribersStore, type Customer, type StockAlert, type Subscriber } from "@/lib/admin/collections";
import { fmtAgo, fmtDate, fmtNum } from "@/lib/admin/format";
import { pauseAlertAction, removeAlertAction, unsubscribeAction } from "./actions";

export const metadata = { title: "Customers" };

// The customer list is the sales module; stock alerts and the newsletter are the newsletter module, where visitors sign up (#173).
const TABS = [["customers", "Customers", "sales"], ["alerts", "Stock alerts", "newsletter"], ["newsletter", "Newsletter", "newsletter"]] as const;
type Params = { tab?: string; q?: string; source?: string; consent?: string; kind?: string; state?: string; sort?: string; dir?: string; page?: string; per?: string };

export default async function Page({ searchParams }: { searchParams: Promise<Params> }) {
  const sp = await searchParams;
  const [sales, newsletter] = await Promise.all([hasModule("sales"), hasModule("newsletter")]);
  const tabs = TABS.filter(([, , m]) => (m === "sales" ? sales : newsletter));
  if (!tabs.length) notFound();
  const tab = tabs.find(([k]) => k === sp.tab)?.[0] ?? tabs[0][0];
  const q = (sp.q ?? "").trim().toLowerCase().slice(0, 60);
  const [customers, alerts, subs] = await Promise.all([customersStore.list(), alertsStore.list(), subscribersStore.list()]);
  const live = subs.filter((s) => s.status === "subscribed").length;
  const sources = [...new Set(customers.map((c) => c.source))].sort();

  const customerColumns: Column<Customer>[] = [
    {
      key: "name",
      header: "Customer",
      sort: (c) => c.name,
      cell: (c) => (
        <span className="flex min-w-0 flex-col">
          <Link href={`/dashboard/customers/${c.id}`} className="font-medium text-text after:absolute after:inset-0">{c.name}</Link>
          <span className="truncate text-meta text-text-2">{c.email || c.phone}</span>
        </span>
      ),
      // A long email still asks for its whole width: the cap keeps Last contact on a phone screen.
      className: "max-w-[12rem] sm:max-w-none",
    },
    { key: "source", header: "Source", sort: (c) => c.source, cell: (c) => c.source, hide: "sm" },
    { key: "consent", header: "Marketing", hide: "sm", sort: (c) => (c.marketingConsent ? 0 : 1), cell: (c) => (c.marketingConsent ? <Badge tone="good">Agreed</Badge> : <Badge>No</Badge>) },
    { key: "added", header: "Customer since", hide: "md", nowrap: true, sort: (c) => c.createdAt, cell: (c) => fmtDate(c.createdAt) },
    { key: "last", header: "Last contact", sort: (c) => c.lastContactAt, cell: (c) => fmtAgo(c.lastContactAt), align: "right", nowrap: true },
  ];
  const alertColumns: Column<StockAlert>[] = [
    { key: "kind", header: "Alert", sort: (a) => ALERT_KIND_LABELS[a.kind], cell: (a) => ALERT_KIND_LABELS[a.kind] },
    { key: "criteria", header: "Looking for", sort: (a) => a.criteria, cell: (a) => (<span className="flex min-w-0 flex-col"><span>{a.criteria}</span><span className="truncate text-meta text-text-2">{a.email}</span></span>) },
    { key: "status", header: "Status", sort: (a) => (a.active ? 0 : 1), cell: (a) => (a.active ? <Badge tone="good">Active</Badge> : <Badge>Paused</Badge>) },
    { key: "since", header: "Since", sort: (a) => a.createdAt, cell: (a) => fmtDate(a.createdAt), hide: "md", nowrap: true },
    {
      key: "actions",
      header: "",
      cell: (a) => (
        <div className="flex justify-end gap-2">
          {/* Pause only: an alert starts again only when the person signs up again (actions.ts). */}
          {a.active && (
            <ActButton act={pauseAlertAction.bind(null, a.id)} confirm={{ title: "Pause this stock alert?", text: "Only the customer can start it again, by signing up on the website.", yes: "Pause" }} className={rowButton}>Pause</ActButton>
          )}
          <ActButton act={removeAlertAction.bind(null, a.id)} confirm={{ title: "Remove this stock alert?", text: "This cannot be undone.", yes: "Remove" }} className={`${rowButton} text-bad`}>Remove</ActButton>
        </div>
      ),
    },
  ];
  const subColumns: Column<Subscriber>[] = [
    { key: "email", header: "Email", sort: (s) => s.email, cell: (s) => s.email },
    { key: "status", header: "Status", sort: (s) => s.status, cell: (s) => (s.status === "subscribed" ? <Badge tone="good">Subscribed</Badge> : <Badge>Unsubscribed</Badge>) },
    { key: "since", header: "Joined", sort: (s) => s.createdAt, cell: (s) => fmtDate(s.createdAt), nowrap: true },
    {
      key: "actions",
      header: "",
      // Unsubscribe only: only the person can sign up again (actions.ts).
      cell: (s) =>
        s.status === "subscribed" && (
          <span className="flex justify-end">
            <ActButton act={unsubscribeAction.bind(null, s.id)} confirm={{ title: `Unsubscribe ${s.email}?`, text: "Only they can sign up again, on the website.", yes: "Unsubscribe" }} className={rowButton}>Unsubscribe</ActButton>
          </span>
        ),
    },
  ];

  // Each list searched, filtered and sorted from the URL, then in pages of 50: a dealer's customers and subscribers only grow.
  const people = sortRows(filterCustomers(customers, sp), customerColumns, sp, { key: "last", dir: "desc" });
  const alertList = sortRows(filterAlerts(alerts, sp), alertColumns, sp, { key: "since", dir: "desc" });
  const subList = sortRows(filterSubscribers(subs, sp), subColumns, sp, { key: "since", dir: "desc" });
  // Each list's page, worked out once (slices: only the open tab's is shown).
  const [peoplePage, alertPage, subPage] = [pageOf(people.rows, sp), pageOf(alertList.rows, sp), pageOf(subList.rows, sp)];
  // Each tab's footer, with its own CSV (the list as it is filtered now): owners and managers only.
  const canExport = await can("data");
  const footer = (p: { page: number; pageCount: number; total: number; per: number }) => <TableFooter {...p} exportHref={canExport ? `/dashboard/customers/export?tab=${tab}` : undefined} />;
  const filters: Record<string, FilterGroup[]> = {
    customers: [
      { name: "source", label: "Where they came from", any: "Any source", options: sources.map((s) => [s, s] as const) },
      { name: "consent", label: "Marketing", any: "Either", options: [["true", "Agreed to marketing"], ["false", "Not agreed"]] },
    ],
    alerts: [
      { name: "kind", label: "Alert", any: "Every alert", options: ALERT_KINDS.map((k) => [k, ALERT_KIND_LABELS[k]] as const) },
      { name: "state", label: "Status", any: "Active and paused", options: [["active", "Active"], ["paused", "Paused"]] },
    ],
    newsletter: [{ name: "state", label: "Status", any: "Subscribed or not", options: [["subscribed", "Subscribed"], ["unsubscribed", "Unsubscribed"]] }],
  };

  return (
    <>
      <PageHeader title="Customers" />
      {/* The three lists are the summary: each tile is its count and opens its list. */}
      <SummaryTabs
        label="Customer lists"
        items={[
          ...(sales ? [{ label: "Customers", count: fmtNum(customers.length), hint: `${customers.filter((c) => c.marketingConsent).length} agreed to marketing`, href: "/dashboard/customers", active: tab === "customers" }] : []),
          ...(newsletter
            ? [
                { label: "Stock alerts", count: fmtNum(alerts.filter((a) => a.active).length), hint: `${alerts.filter((a) => a.lastSentAt).length} sent at least once`, href: "/dashboard/customers?tab=alerts", active: tab === "alerts" },
                { label: "Newsletter", count: fmtNum(live), hint: "subscribed", href: "/dashboard/customers?tab=newsletter", active: tab === "newsletter" },
              ]
            : []),
        ]}
      />

      {tab === "customers" && (
        <>
          <TableToolbar search={{ placeholder: "Search", label: "Search customers" }} filters={filters.customers} />
          <DataTable label="Customers" linkRows sort={people.sort} rows={peoplePage.rows} rowKey={(c) => c.id} columns={customerColumns} empty={<EmptyState title="No customers match" text="Try another filter or search." />} />
          {footer(peoplePage)}
        </>
      )}

      {tab === "alerts" && (
        <>
          <TableToolbar search={{ placeholder: "Search", label: "Search stock alerts" }} filters={filters.alerts} />
          <DataTable label="Stock alerts" sort={alertList.sort} rows={alertPage.rows} rowKey={(a) => a.id} columns={alertColumns} empty={<EmptyState title={q || sp.kind || sp.state ? "No alerts match" : "No alerts yet"} text={q || sp.kind || sp.state ? "Try another filter or search." : "Visitors can ask to be told about a car. They show here."} />} />
          {footer(alertPage)}
        </>
      )}

      {tab === "newsletter" && (
        <>
          <TableToolbar search={{ placeholder: "Search", label: "Search subscribers" }} filters={filters.newsletter} />
          <DataTable label="Newsletter subscribers" sort={subList.sort} rows={subPage.rows} rowKey={(s) => s.id} columns={subColumns} empty={<EmptyState title="No subscribers match" />} />
          {footer(subPage)}
        </>
      )}
    </>
  );
}
