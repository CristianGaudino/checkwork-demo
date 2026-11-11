import { Badge, DataTable, EmptyState, PageHeader, SummaryTabs, rowButton } from "@/components/admin/kit";
import { ALERT_KIND_LABELS, alertsStore, customersStore, subscribersStore } from "@/lib/admin/collections";
import { fmtAgo, fmtDate, fmtNum } from "@/lib/admin/format";
import { removeAlertAction, toggleAlertAction, toggleSubscriberAction } from "./actions";

export const metadata = { title: "Customers" };

const TABS = [["customers", "Customers"], ["alerts", "Stock alerts"], ["newsletter", "Newsletter"]] as const;

export default async function Page({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const sp = await searchParams;
  const tab = TABS.some(([k]) => k === sp.tab) ? sp.tab! : "customers";
  const [customers, alerts, subs] = await Promise.all([customersStore.list(), alertsStore.list(), subscribersStore.list()]);
  const live = subs.filter((s) => s.status === "subscribed").length;

  return (
    <>
      <PageHeader title="Customers" />
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
        <DataTable
          label="Customers"
          rows={[...customers].sort((a, b) => b.lastContactAt - a.lastContactAt)}
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
            { key: "consent", header: "Marketing", cell: (c) => (c.marketingConsent ? <Badge tone="good">Agreed</Badge> : <Badge>No</Badge>) },
            { key: "last", header: "Last contact", cell: (c) => fmtAgo(c.lastContactAt), align: "right", nowrap: true },
          ]}
        />
      )}

      {tab === "alerts" && (
        <DataTable
          label="Stock alerts"
          rows={[...alerts].sort((a, b) => b.createdAt - a.createdAt)}
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
                  <form action={toggleAlertAction.bind(null, a.id)}>
                    <button type="submit" className={rowButton}>{a.active ? "Pause" : "Resume"}</button>
                  </form>
                  <form action={removeAlertAction.bind(null, a.id)}>
                    <button type="submit" className={`${rowButton} text-bad`}>Remove</button>
                  </form>
                </div>
              ),
            },
          ]}
          empty={<EmptyState title="No alerts yet" text="Visitors can ask to be told about a car. They show here." />}
        />
      )}

      {tab === "newsletter" && (
        <DataTable
          label="Newsletter subscribers"
          rows={[...subs].sort((a, b) => b.createdAt - a.createdAt)}
          rowKey={(s) => s.id}
          columns={[
            { key: "email", header: "Email", cell: (s) => s.email },
            { key: "status", header: "Status", cell: (s) => (s.status === "subscribed" ? <Badge tone="good">Subscribed</Badge> : <Badge>Unsubscribed</Badge>) },
            { key: "since", header: "Joined", cell: (s) => fmtDate(s.createdAt), nowrap: true },
            {
              key: "actions",
              header: "",
              cell: (s) => (
                <form action={toggleSubscriberAction.bind(null, s.id)} className="flex justify-end">
                  <button type="submit" className={rowButton}>{s.status === "subscribed" ? "Unsubscribe" : "Resubscribe"}</button>
                </form>
              ),
            },
          ]}
        />
      )}
    </>
  );
}
