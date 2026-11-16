import Link from "next/link";
import { AreaChart, BarList } from "@/components/admin/charts";
import { DataTable, EmptyState, PageHeader, Panel, Segmented, StatCard, StatGrid } from "@/components/admin/kit";
import { RANGES, buildAnalytics, change, parseRange } from "@/lib/admin/analytics";
import { fmtNum, fmtPct, threeLetter } from "@/lib/admin/format";
import { leadsStore } from "@/lib/admin/collections";
import { adminCars } from "@/lib/admin/stock-admin";
import { simulating } from "@/lib/integrations";
import { carName, carHref } from "@/lib/stock/format";
import { forSale } from "@/lib/stock/types";

export const metadata = { title: "Analytics" };

const shortDate = new Intl.DateTimeFormat("en-IE", { day: "numeric", month: "short", timeZone: "UTC" });
const arrow = (n: number) => `${n >= 0 ? "Up" : "Down"} ${fmtPct(Math.abs(n))} on the period before`;

export default async function Page({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  // The figures are a sample until a site analytics adapter reads real ones: shown on the demo, never on a dealer's own site.
  if (!simulating())
    return (
      <>
        <PageHeader title="Analytics" />
        <Panel>
          <EmptyState title="No visitor numbers yet" text="Visitors, sources and the path from visit to sale show here once site analytics is connected." action={<Link href="/dashboard/settings?section=services" className="text-body font-semibold underline">Settings</Link>} />
        </Panel>
      </>
    );
  const range = parseRange((await searchParams).range);
  const [all, leads] = await Promise.all([adminCars(), leadsStore.list()]);
  const cars = all.filter(forSale).map((c) => ({ slug: c.slug, title: carName(c) }));
  const a = buildAnalytics({ range, cars, leadTimes: leads.map((l) => l.createdAt) });
  const c = (now: number, before: number) => change(now, before);
  const dv = c(a.totals.visitors, a.previous.visitors);
  const dp = c(a.totals.pageviews, a.previous.pageviews);
  const dl = c(a.totals.leads, a.previous.leads);
  const top = a.funnel[0].count;

  return (
    <>
      <PageHeader title="Analytics" />
      <Segmented label="Period" items={RANGES.map((r) => ({ label: `${r} days`, href: `/dashboard/analytics?range=${r}`, active: range === r }))} />

      <StatGrid>
        <StatCard label="Visitors" value={fmtNum(a.totals.visitors)} hint={arrow(dv)} tone={dv >= 0 ? "good" : "bad"} />
        <StatCard label="Page views" value={fmtNum(a.totals.pageviews)} hint={arrow(dp)} tone={dp >= 0 ? "good" : "bad"} />
        <StatCard label="Leads" value={fmtNum(a.totals.leads)} hint={arrow(dl)} tone={dl >= 0 ? "good" : "bad"} />
        <StatCard label="Visitors who became leads" value={fmtPct(a.totals.conversion)} />
      </StatGrid>

      <Panel title="Visitors each day">
        <AreaChart data={a.days.map((d) => ({ label: threeLetter(shortDate.format(new Date(d.date))), value: d.visitors }))} summary={`Visitors each day over the last ${range} days, from ${fmtNum(Math.min(...a.days.map((d) => d.visitors)))} to ${fmtNum(Math.max(...a.days.map((d) => d.visitors)))}.`} />
      </Panel>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Panel title="From visit to sale">
          <BarList items={a.funnel.map((s, i) => ({ label: s.label, value: s.count, note: i ? fmtPct((s.count / top) * 100) : undefined }))} of={top} />
        </Panel>
        <Panel title="Where visitors come from">
          <DataTable
            bare
            rows={a.sources}
            rowKey={(s) => s.name}
            columns={[
              { key: "name", header: "Source", cell: (s) => <span className="font-medium">{s.name}</span> },
              { key: "v", header: "Visitors", align: "right", cell: (s) => fmtNum(s.visitors) },
              { key: "l", header: "Leads", align: "right", cell: (s) => fmtNum(s.leads), hide: "sm" },
              { key: "c", header: "Rate", align: "right", cell: (s) => fmtPct(s.visitors ? (s.leads / s.visitors) * 100 : 0) },
            ]}
          />
        </Panel>
        <Panel title="Where in Ireland">
          <BarList items={a.places.map((p) => ({ label: p.name, value: p.visitors }))} />
        </Panel>
        <Panel title="Devices">
          <BarList items={a.devices.map((d) => ({ label: d.name, value: d.visitors, note: fmtPct((d.visitors / a.totals.visitors) * 100) }))} of={a.totals.visitors} />
        </Panel>
      </div>

      <Panel title="Most viewed cars">
        <DataTable
          bare
          rows={a.topCars}
          rowKey={(t) => t.slug}
          columns={[
            { key: "car", header: "Car", cell: (t) => <Link href={carHref(t.slug)} className="font-semibold underline-offset-2 hover:underline">{t.title}</Link> },
            { key: "views", header: "Views", align: "right", cell: (t) => fmtNum(t.views) },
            { key: "saves", header: "Saved", align: "right", cell: (t) => fmtNum(t.saves), hide: "sm" },
            { key: "leads", header: "Leads", align: "right", cell: (t) => fmtNum(t.leads) },
          ]}
        />
      </Panel>

      <p className="text-meta text-text-2">Figures update with real visitor numbers once site analytics is connected, under Settings, Connected services.</p>
    </>
  );
}
