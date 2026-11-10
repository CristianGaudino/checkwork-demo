import Link from "next/link";
import { AddDealershipForm } from "@/components/admin/PlatformForms";
import { Badge, DataTable, FilterTabs, PageHeader, Panel, StatCard, StatGrid, type Tone } from "@/components/admin/kit";
import { fmtEur, fmtNum } from "@/lib/admin/format";
import { dealershipsStore } from "@/lib/admin/platform";
import { monthlyEur } from "@/lib/admin/platform-calc";
import { planOf } from "@/lib/plans";

export const metadata = { title: "Dealerships" };

const FILTERS = [["all", "All"], ["active", "Active"], ["trial", "On trial"], ["paused", "Paused"]] as const;
const TONE: Record<string, Tone> = { active: "good", trial: "info", paused: "warn" };
const LABEL: Record<string, string> = { active: "Active", trial: "On trial", paused: "Paused" };

export default async function Page({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const sp = await searchParams;
  const status = FILTERS.some(([k]) => k === sp.status) ? sp.status! : "all";
  const all = await dealershipsStore.list();
  const rows = all.filter((d) => status === "all" || d.status === status).sort((a, b) => a.name.localeCompare(b.name, "en-IE"));
  const count = (s: string) => (s === "all" ? all.length : all.filter((d) => d.status === s).length);
  const mrr = all.reduce((s, d) => s + monthlyEur(d), 0);

  return (
    <>
      <PageHeader title="Dealerships" text="Every dealership on the platform." />
      <StatGrid>
        <StatCard label="Dealerships" value={fmtNum(all.length)} />
        <StatCard label="Monthly revenue" value={fmtEur(mrr)} hint="From active accounts" />
        <StatCard label="On trial" value={fmtNum(count("trial"))} />
        <StatCard label="Cars listed" value={fmtNum(all.reduce((s, d) => s + d.cars, 0))} />
      </StatGrid>
      <FilterTabs items={FILTERS.map(([k, label]) => ({ label, count: count(k), href: `/platform?status=${k}`, active: status === k }))} />
      <DataTable
        rows={rows}
        rowKey={(d) => d.id}
        columns={[
          { key: "name", header: "Dealership", cell: (d) => <div className="min-w-0"><Link href={`/platform/dealerships/${d.id}`} className="block font-semibold underline-offset-2 hover:underline">{d.name}</Link><span className="text-meta text-text-2">{d.town}</span></div> },
          { key: "plan", header: "Plan", cell: (d) => planOf(d.plan).name },
          { key: "status", header: "Status", cell: (d) => <Badge tone={TONE[d.status]}>{LABEL[d.status]}</Badge> },
          { key: "cars", header: "Cars", align: "right", cell: (d) => fmtNum(d.cars) },
          { key: "leads", header: "Leads this month", align: "right", cell: (d) => fmtNum(d.leadsMonth) },
          { key: "mrr", header: "Per month", align: "right", cell: (d) => (monthlyEur(d) ? fmtEur(monthlyEur(d)) : "None") },
        ]}
      />
      <Panel title="Add a dealership">
        <AddDealershipForm />
      </Panel>
    </>
  );
}
