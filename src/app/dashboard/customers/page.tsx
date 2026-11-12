import Link from "next/link";
import { Badge, DataTable, EmptyState, FilterSelect, PageHeader, Pager, SummaryTabs, TableToolbar, adminButtonQuiet, paginate, rowButton, sortRows, type Column } from "@/components/admin/kit";
import { ActButton } from "@/components/admin/ActButton";
import { can } from "@/lib/permissions";
import { ALERT_KINDS, ALERT_KIND_LABELS, alertsStore, customersStore, subscribersStore, type Customer, type StockAlert, type Subscriber } from "@/lib/admin/collections";
import { fmtAgo, fmtDate, fmtNum } from "@/lib/admin/format";
import { pauseAlertAction, removeAlertAction, unsubscribeAction } from "./actions";

export const metadata = { title: "Customers" };

const TABS = [["customers", "Customers"], ["alerts", "Stock alerts"], ["newsletter", "Newsletter"]] as const;
type Params = { tab?: string; q?: string; source?: string; consent?: string; kind?: string; state?: string; sort?: string; dir?: string; page?: string };

// What the search matches: a name, an email, a phone or a car that contains what was typed (in lower case).
const has = (q: string, ...fields: (string | undefined)[]) => !q || fields.some((f) => f?.toLowerCase().includes(q));

export default async function Page({ searchParams }: { searchParams: Promise<Params> }) {
  const sp = await searchParams;
  const tab = TABS.some(([k]) => k === sp.tab) ? sp.tab! : "customers";
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
  const people = sortRows(customers.filter((c) => has(q, c.name, c.email, c.phone) && (!sp.source || c.source === sp.source) && (!sp.consent || String(c.marketingConsent) === sp.consent)), customerColumns, sp, { key: "last", dir: "desc" });
  const alertList = sortRows(alerts.filter((a) => has(q, a.email, a.criteria) && (!sp.kind || a.kind === sp.kind) && (!sp.state || (sp.state === "active") === a.active)), alertColumns, sp, { key: "since", dir: "desc" });
  const subList = sortRows(subs.filter((s) => has(q, s.email) && (!sp.state || s.status === sp.state)), subColumns, sp, { key: "since", dir: "desc" });
  const pager = (p: { page: number; pageCount: number; total: number }) => <Pager page={p.page} pageCount={p.pageCount} total={p.total} />;

  return (
    <>
      <PageHeader
        title="Customers"
        actions={
          (await can("data")) && (
            // This tab's list. Owners and managers only.
            <a href={`/dashboard/customers/export?tab=${tab}`} className={adminButtonQuiet} download>
              Export CSV
            </a>
          )
        }
      />
      {/* The three lists are the summary: each tile is its count and opens its list. */}
      <SummaryTabs
        label="Customer lists"
        items={[
          { label: "Customers", count: fmtNum(customers.length), hint: `${customers.filter((c) => c.marketingConsent).length} agreed to marketing`, href: "/dashboard/customers", active: tab === "customers" },
          { label: "Stock alerts", count: fmtNum(alerts.filter((a) => a.active).length), hint: `${alerts.filter((a) => a.lastSentAt).length} sent at least once`, href: "/dashboard/customers?tab=alerts", active: tab === "alerts" },
          { label: "Newsletter", count: fmtNum(live), hint: "subscribed", href: "/dashboard/customers?tab=newsletter", active: tab === "newsletter" },
        ]}
      />

      {tab === "customers" && (
        <>
          <TableToolbar search={{ placeholder: "Search name, email, phone", label: "Search customers" }}>
            <FilterSelect name="source" label="Source" all="Any source" options={sources.map((s) => [s, s] as const)} />
            <FilterSelect name="consent" label="Marketing" all="Marketing: any" options={[["true", "Agreed to marketing"], ["false", "Not agreed"]]} />
          </TableToolbar>
          <DataTable label="Customers" linkRows sort={people.sort} rows={paginate(people.rows, sp.page).rows} rowKey={(c) => c.id} columns={customerColumns} empty={<EmptyState title="No customers match" text="Try another filter or search." />} />
          {pager(paginate(people.rows, sp.page))}
        </>
      )}

      {tab === "alerts" && (
        <>
          <TableToolbar search={{ placeholder: "Search email or car", label: "Search stock alerts" }}>
            <FilterSelect name="kind" label="Alert" all="Every alert" options={ALERT_KINDS.map((k) => [k, ALERT_KIND_LABELS[k]] as const)} />
            <FilterSelect name="state" label="Status" all="Active and paused" options={[["active", "Active"], ["paused", "Paused"]]} />
          </TableToolbar>
          <DataTable label="Stock alerts" sort={alertList.sort} rows={paginate(alertList.rows, sp.page).rows} rowKey={(a) => a.id} columns={alertColumns} empty={<EmptyState title={q || sp.kind || sp.state ? "No alerts match" : "No alerts yet"} text={q || sp.kind || sp.state ? "Try another filter or search." : "Visitors can ask to be told about a car. They show here."} />} />
          {pager(paginate(alertList.rows, sp.page))}
        </>
      )}

      {tab === "newsletter" && (
        <>
          <TableToolbar search={{ placeholder: "Search email", label: "Search subscribers" }}>
            <FilterSelect name="state" label="Status" all="Subscribed and not" options={[["subscribed", "Subscribed"], ["unsubscribed", "Unsubscribed"]]} />
          </TableToolbar>
          <DataTable label="Newsletter subscribers" sort={subList.sort} rows={paginate(subList.rows, sp.page).rows} rowKey={(s) => s.id} columns={subColumns} empty={<EmptyState title="No subscribers match" />} />
          {pager(paginate(subList.rows, sp.page))}
        </>
      )}
    </>
  );
}
