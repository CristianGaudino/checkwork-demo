import { Badge, DataTable, EmptyState, FilterTabs, PageHeader, StatCard, StatGrid } from "@/components/admin/kit";
import { ALERT_KIND_LABELS, alertsStore, customersStore, subscribersStore } from "@/lib/admin/collections";
import { fmtAgo, fmtDate, fmtNum } from "@/lib/admin/format";
import { removeAlertAction, toggleAlertAction, toggleSubscriberAction } from "./actions";

export const metadata = { title: "Customers and alerts" };

const TABS = [["customers", "Customers"], ["alerts", "Stock alerts"], ["newsletter", "Newsletter"]] as const;
const link = "min-h-11 px-2 text-meta font-semibold underline";

export default async function Page({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const sp = await searchParams;
  const tab = TABS.some(([k]) => k === sp.tab) ? sp.tab! : "customers";
  const [customers, alerts, subs] = await Promise.all([customersStore.list(), alertsStore.list(), subscribersStore.list()]);
  const live = subs.filter((s) => s.status === "subscribed").length;

  return (
    <>
      <PageHeader title="Customers and alerts" />
      <StatGrid>
        <StatCard label="Customers" value={fmtNum(customers.length)} hint={`${customers.filter((c) => c.marketingConsent).length} agreed to marketing`} />
        <StatCard label="Active stock alerts" value={fmtNum(alerts.filter((a) => a.active).length)} />
        <StatCard label="Newsletter subscribers" value={fmtNum(live)} />
        <StatCard label="Alerts sent" value={fmtNum(alerts.filter((a) => a.lastSentAt).length)} hint="At least once" />
      </StatGrid>
      <FilterTabs items={TABS.map(([k, label]) => ({ label, href: `/dashboard/customers?tab=${k}`, active: tab === k }))} />

      {tab === "customers" && (
        <DataTable
          rows={[...customers].sort((a, b) => b.lastContactAt - a.lastContactAt)}
          rowKey={(c) => c.id}
          columns={[
            { key: "name", header: "Name", cell: (c) => <span className="font-semibold">{c.name}</span> },
            { key: "email", header: "Email", cell: (c) => <a href={`mailto:${c.email}`} className="inline-flex min-h-11 items-center underline">{c.email}</a> },
            { key: "source", header: "Source", cell: (c) => c.source },
            { key: "consent", header: "Marketing", cell: (c) => (c.marketingConsent ? <Badge tone="good">Agreed</Badge> : <Badge>No</Badge>) },
            { key: "last", header: "Last contact", cell: (c) => fmtAgo(c.lastContactAt), align: "right" },
          ]}
        />
      )}

      {tab === "alerts" && (
        <DataTable
          rows={[...alerts].sort((a, b) => b.createdAt - a.createdAt)}
          rowKey={(a) => a.id}
          columns={[
            { key: "kind", header: "Alert", cell: (a) => ALERT_KIND_LABELS[a.kind] },
            { key: "criteria", header: "Looking for", cell: (a) => a.criteria },
            { key: "email", header: "Email", cell: (a) => a.email },
            { key: "status", header: "Status", cell: (a) => (a.active ? <Badge tone="good">Active</Badge> : <Badge>Paused</Badge>) },
            { key: "since", header: "Since", cell: (a) => fmtDate(a.createdAt) },
            {
              key: "actions",
              header: "Actions",
              cell: (a) => (
                <div className="flex gap-1">
                  <form action={toggleAlertAction.bind(null, a.id)}>
                    <button type="submit" className={link}>{a.active ? "Pause" : "Resume"}</button>
                  </form>
                  <form action={removeAlertAction.bind(null, a.id)}>
                    <button type="submit" className={`${link} text-destructive`}>Remove</button>
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
          rows={[...subs].sort((a, b) => b.createdAt - a.createdAt)}
          rowKey={(s) => s.id}
          columns={[
            { key: "email", header: "Email", cell: (s) => s.email },
            { key: "status", header: "Status", cell: (s) => (s.status === "subscribed" ? <Badge tone="good">Subscribed</Badge> : <Badge>Unsubscribed</Badge>) },
            { key: "since", header: "Joined", cell: (s) => fmtDate(s.createdAt) },
            {
              key: "actions",
              header: "Actions",
              cell: (s) => (
                <form action={toggleSubscriberAction.bind(null, s.id)}>
                  <button type="submit" className={link}>{s.status === "subscribed" ? "Unsubscribe" : "Resubscribe"}</button>
                </form>
              ),
            },
          ]}
        />
      )}
    </>
  );
}
