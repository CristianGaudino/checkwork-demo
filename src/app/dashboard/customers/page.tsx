import { Badge, DataTable, EmptyState, PageHeader, Pager, SummaryTabs, adminButtonQuiet, paginate, rowButton } from "@/components/admin/kit";
import { ActButton } from "@/components/admin/ActButton";
import { can } from "@/lib/permissions";
import { ALERT_KIND_LABELS, alertsStore, customersStore, subscribersStore } from "@/lib/admin/collections";
import { fmtAgo, fmtDate, fmtNum } from "@/lib/admin/format";
import { pauseAlertAction, removeAlertAction, unsubscribeAction } from "./actions";

export const metadata = { title: "Customers" };

const TABS = [["customers", "Customers"], ["alerts", "Stock alerts"], ["newsletter", "Newsletter"]] as const;

export default async function Page({ searchParams }: { searchParams: Promise<{ tab?: string; page?: string }> }) {
  const sp = await searchParams;
  const tab = TABS.some(([k]) => k === sp.tab) ? sp.tab! : "customers";
  const [customers, alerts, subs] = await Promise.all([customersStore.list(), alertsStore.list(), subscribersStore.list()]);
  const live = subs.filter((s) => s.status === "subscribed").length;
  // Each list in pages of 50: a dealer's customers and subscribers only grow.
  const pageOf = <T,>(rows: T[]) => paginate(rows, sp.page);
  const pager = (p: { page: number; pageCount: number; total: number }) => <Pager {...p} href={(n) => `/dashboard/customers?tab=${tab}&page=${n}`} />;
  const people = pageOf([...customers].sort((a, b) => b.lastContactAt - a.lastContactAt));
  const alertRows = pageOf([...alerts].sort((a, b) => b.createdAt - a.createdAt));
  const subRows = pageOf([...subs].sort((a, b) => b.createdAt - a.createdAt));

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
        <DataTable
          label="Customers"
          rows={people.rows}
          rowKey={(c) => c.id}
          columns={[
            {
              key: "name",
              header: "Customer",
              cell: (c) => (
                <span className="flex min-w-0 flex-col">
                  <span className="font-medium">{c.name}</span>
                  <a href={`mailto:${c.email}`} className="truncate text-meta text-text-2 underline-offset-2 hover:underline">{c.email}</a>
                </span>
              ),
            },
            { key: "source", header: "Source", cell: (c) => c.source, hide: "sm" },
            { key: "consent", header: "Marketing", hide: "sm", cell: (c) => (c.marketingConsent ? <Badge tone="good">Agreed</Badge> : <Badge>No</Badge>) },
            { key: "last", header: "Last contact", cell: (c) => fmtAgo(c.lastContactAt), align: "right", nowrap: true },
          ]}
        />
        {pager(people)}
        </>
      )}

      {tab === "alerts" && (
        <>
        <DataTable
          label="Stock alerts"
          rows={alertRows.rows}
          rowKey={(a) => a.id}
          columns={[
            { key: "kind", header: "Alert", cell: (a) => ALERT_KIND_LABELS[a.kind] },
            { key: "criteria", header: "Looking for", cell: (a) => (<span className="flex min-w-0 flex-col"><span>{a.criteria}</span><span className="truncate text-meta text-text-2">{a.email}</span></span>) },
            { key: "status", header: "Status", cell: (a) => (a.active ? <Badge tone="good">Active</Badge> : <Badge>Paused</Badge>) },
            { key: "since", header: "Since", cell: (a) => fmtDate(a.createdAt), hide: "md", nowrap: true },
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
          ]}
          empty={<EmptyState title="No alerts yet" text="Visitors can ask to be told about a car. They show here." />}
        />
        {pager(alertRows)}
        </>
      )}

      {tab === "newsletter" && (
        <>
        <DataTable
          label="Newsletter subscribers"
          rows={subRows.rows}
          rowKey={(s) => s.id}
          columns={[
            { key: "email", header: "Email", cell: (s) => s.email },
            { key: "status", header: "Status", cell: (s) => (s.status === "subscribed" ? <Badge tone="good">Subscribed</Badge> : <Badge>Unsubscribed</Badge>) },
            { key: "since", header: "Joined", cell: (s) => fmtDate(s.createdAt), nowrap: true },
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
          ]}
        />
        {pager(subRows)}
        </>
      )}
    </>
  );
}
