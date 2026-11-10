import Link from "next/link";
import { Badge, DataTable, FilterTabs, PageHeader, Panel, StatCard, StatGrid, type Tone } from "@/components/admin/kit";
import { fmtEur, fmtNum } from "@/lib/admin/format";
import { dealershipsStore, invoicesStore } from "@/lib/admin/platform";
import { monthlyEur, usageState } from "@/lib/admin/platform-calc";
import { ADDONS, planOf } from "@/lib/plans";
import { markInvoicePaidAction } from "../actions";

export const metadata = { title: "Usage and billing" };

const INV_TONE: Record<string, Tone> = { paid: "good", due: "info", overdue: "bad" };
const FILTERS = [["all", "All"], ["due", "Due"], ["overdue", "Overdue"], ["paid", "Paid"]] as const;

export default async function Page({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const status = ((await searchParams).status ?? "all") as string;
  const filter = FILTERS.some(([k]) => k === status) ? status : "all";
  const [ds, invoices] = await Promise.all([dealershipsStore.list(), invoicesStore.list()]);
  const mrr = ds.reduce((s, d) => s + monthlyEur(d), 0);
  const addonRevenue = ds.filter((d) => d.status === "active").reduce((s, d) => s + d.addons.reduce((t, id) => t + (ADDONS.find((a) => a.id === id)?.priceEur ?? 0), 0), 0);
  const owed = invoices.filter((i) => i.status !== "paid").reduce((s, i) => s + i.amountEur, 0);
  const rows = invoices.filter((i) => filter === "all" || i.status === filter).sort((a, b) => b.month.localeCompare(a.month) || a.dealershipName.localeCompare(b.dealershipName));
  const count = (s: string) => (s === "all" ? invoices.length : invoices.filter((i) => i.status === s).length);
  const over = ds.filter((d) => [usageState(d.cars, planOf(d.plan).limits.cars), usageState(d.leadsMonth, planOf(d.plan).limits.leads)].some((u) => u.tone === "bad"));

  return (
    <>
      <PageHeader title="Usage and billing" text="What each dealership uses, and what is invoiced." />
      <StatGrid>
        <StatCard label="Monthly revenue" value={fmtEur(mrr)} />
        <StatCard label="From add-ons" value={fmtEur(addonRevenue)} hint={`${mrr ? Math.round((addonRevenue / mrr) * 100) : 0}% of revenue`} />
        <StatCard label="Waiting to be paid" value={fmtEur(owed)} tone={owed ? "bad" : "good"} />
        <StatCard label="Over a plan limit" value={fmtNum(over.length)} hint={over.length ? over.map((d) => d.name).join(", ") : "None"} tone={over.length ? "bad" : "good"} />
      </StatGrid>

      <Panel title="Usage against each plan">
        <DataTable
          bare
          rows={[...ds].sort((a, b) => a.name.localeCompare(b.name, "en-IE"))}
          rowKey={(d) => d.id}
          columns={[
            { key: "name", header: "Dealership", cell: (d) => <Link href={`/platform/dealerships/${d.id}`} className="font-semibold underline-offset-2 hover:underline">{d.name}</Link> },
            { key: "plan", header: "Plan", cell: (d) => planOf(d.plan).name },
            { key: "cars", header: "Cars", align: "right", cell: (d) => `${fmtNum(d.cars)} of ${fmtNum(planOf(d.plan).limits.cars)}` },
            { key: "leads", header: "Leads", align: "right", cell: (d) => `${fmtNum(d.leadsMonth)} of ${fmtNum(planOf(d.plan).limits.leads)}` },
            { key: "state", header: "Limits", cell: (d) => { const u = usageState(Math.max(d.cars / planOf(d.plan).limits.cars, d.leadsMonth / planOf(d.plan).limits.leads) * 100, 100); return <Badge tone={u.tone}>{u.label}</Badge>; } },
          ]}
        />
      </Panel>

      <FilterTabs items={FILTERS.map(([k, label]) => ({ label, count: count(k), href: `/platform/usage?status=${k}`, active: filter === k }))} />
      <DataTable
        rows={rows}
        rowKey={(i) => i.id}
        columns={[
          { key: "month", header: "Month", cell: (i) => i.month },
          { key: "name", header: "Dealership", cell: (i) => i.dealershipName },
          { key: "amount", header: "Amount", align: "right", cell: (i) => fmtEur(i.amountEur) },
          { key: "status", header: "Status", cell: (i) => <Badge tone={INV_TONE[i.status]}>{i.status[0].toUpperCase() + i.status.slice(1)}</Badge> },
          {
            key: "actions",
            header: "Actions",
            cell: (i) =>
              i.status !== "paid" && (
                <form action={markInvoicePaidAction.bind(null, i.id)}>
                  <button type="submit" className="min-h-11 px-2 text-meta font-semibold underline">
                    Mark paid
                  </button>
                </form>
              ),
          },
        ]}
      />
    </>
  );
}
