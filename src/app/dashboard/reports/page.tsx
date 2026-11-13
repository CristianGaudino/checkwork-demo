import { notFound } from "next/navigation";
import { AreaChart, BarList } from "@/components/admin/charts";
import { DataTable, PageHeader, Panel, Segmented, StatCard, StatGrid } from "@/components/admin/kit";
import { getSettings, leadsStore, prepStore, salesStore } from "@/lib/admin/collections";
import { isSalesLead } from "@/lib/admin/leads";
import { carCosts } from "@/lib/admin/costs";
import { fmtEur, fmtNum, plural } from "@/lib/admin/format";
import { PERIODS, fullReport, monthLabel, personalReport, type Period } from "@/lib/admin/reports";
import { adminCars } from "@/lib/admin/stock-admin";
import { can, currentMember } from "@/lib/permissions";

export const metadata = { title: "Reports" };

// Who sees what (owner's decision, 2026-11-11): owners, managers and finance (the margins permission) see the whole dealership's report,
// profit included. A salesperson sees their own: counts only, no money, nobody else's. Anyone else, no page.
const now = () => Date.now();

export default async function Page({ searchParams }: { searchParams: Promise<{ period?: string }> }) {
  if (!(await can("reports"))) notFound();
  const asked = Number((await searchParams).period);
  const period: Period = (PERIODS as readonly number[]).includes(asked) ? (asked as Period) : 12;
  const tabs = (
    <Segmented label="Period" items={PERIODS.map((p) => ({ label: `${p} months`, href: p === 12 ? "/dashboard/reports" : `/dashboard/reports?period=${p}`, active: p === period }))} />
  );
  if (!(await can("margins"))) return <Personal period={period} tabs={tabs} />;

  const [sales, cars, leads, costs, prep, { team }] = await Promise.all([salesStore.list(), adminCars(), (await leadsStore.list()).filter(isSalesLead), carCosts(), prepStore.list(), getSettings()]);
  const r = fullReport({ sales, cars, leads, team: team.map((t) => t.name), costs: new Map([...costs].map(([id, c]) => [id, c.total])), prep, period, now: now() });
  const best = r.months.reduce((a, b) => (b.value > a.value ? b : a), r.months[0]);

  return (
    <>
      <PageHeader title="Reports" text={`The last ${period} months, this month included. Profit is the sale price less the cost and prep, before VAT and running costs.`} />
      {tabs}
      <StatGrid>
        <StatCard label="Cars sold" value={fmtNum(r.totals.sold)} />
        <StatCard label="Sales" value={fmtEur(r.totals.value)} />
        <StatCard label="Profit" value={fmtEur(r.totals.profit)} hint={r.totals.costed < r.totals.sold ? `On ${r.totals.costed} of ${r.totals.sold} sales with a cost` : undefined} />
        <StatCard label="Days to sell" value={r.totals.avgDaysToSell === null ? "None" : fmtNum(r.totals.avgDaysToSell)} hint="On average, from listing to sale" />
        {r.returns.count > 0 && <StatCard label="Returns" value={fmtNum(r.returns.count)} hint={`${fmtEur(r.returns.refundEur)} refunded, not counted in sales`} />}
      </StatGrid>

      <Panel title="Sales by month">
        <AreaChart
          data={r.months.map((m) => ({ label: monthLabel(m.month), value: m.value }))}
          format={fmtEur}
          summary={`Sales each month over the last ${period} months, the most in ${monthLabel(best.month)} at ${fmtEur(best.value)}.`}
        />
        <DataTable
          bare
          label="Sales by month"
          rows={[...r.months].reverse()}
          rowKey={(m) => m.month}
          columns={[
            { key: "month", header: "Month", cell: (m) => monthLabel(m.month), nowrap: true },
            { key: "sold", header: "Cars sold", align: "right", hide: "sm", cell: (m) => fmtNum(m.sold) },
            { key: "value", header: "Sales", align: "right", cell: (m) => fmtEur(m.value) },
            { key: "profit", header: "Profit", align: "right", cell: (m) => (m.costed ? fmtEur(m.profit) : <span className="text-text-2">-</span>) },
          ]}
        />
      </Panel>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Panel title="By salesperson">
          <DataTable
            bare
            label="By salesperson"
            rows={r.people}
            rowKey={(p) => p.name}
            empty={<p className="text-body text-text-2">No sales or leads in this period.</p>}
            columns={[
              { key: "name", header: "Name", cell: (p) => <span className="font-medium">{p.name}</span> },
              { key: "sold", header: "Sold", align: "right", cell: (p) => fmtNum(p.sold) },
              { key: "value", header: "Sales", align: "right", hide: "sm", cell: (p) => fmtEur(p.value) },
              { key: "profit", header: "Profit", align: "right", hide: "md", cell: (p) => (p.costed ? fmtEur(p.profit) : <span className="text-text-2">-</span>) },
              { key: "won", header: "Leads won", align: "right", cell: (p) => `${p.won} of ${p.leads}` },
            ]}
          />
        </Panel>
        <Panel title="Where the won leads came from">
          {r.sources.length ? <BarList items={r.sources.map((s) => ({ label: s.source, value: s.won, note: `of ${plural(s.leads, "lead")}, ${s.winRate}%` }))} /> : <p className="text-body text-text-2">No leads in this period.</p>}
        </Panel>
        <Panel title="Why leads were lost">
          {r.lost.length ? <BarList items={r.lost.map((x) => ({ label: x.reason, value: x.leads, note: `${Math.round((x.leads / r.lost.reduce((n, y) => n + y.leads, 0)) * 100)}% of lost leads` }))} /> : <p className="text-body text-text-2">No lost leads in this period.</p>}
        </Panel>
        <Panel title="Stock by age">
          <BarList items={r.stockAge.map((b) => ({ label: b.band, value: b.cars, note: fmtEur(b.value) }))} />
        </Panel>
        <Panel title="Prep spend">
          {r.prep.length ? <BarList format={fmtEur} items={r.prep.map((p) => ({ label: p.kind, value: p.eur, note: p.lines === 1 ? "1 job" : `${p.lines} jobs` }))} /> : <p className="text-body text-text-2">No prep costs in this period.</p>}
        </Panel>
      </div>
    </>
  );
}

// A salesperson's own figures: counts only.
async function Personal({ period, tabs }: { period: Period; tabs: React.ReactNode }) {
  const me = await currentMember();
  const [sales, leads] = await Promise.all([salesStore.list(), (await leadsStore.list()).filter(isSalesLead)]);
  const r = personalReport({ name: me.name, sales, leads, period, now: now() });
  return (
    <>
      <PageHeader title="Your report" text={`${me.name}, the last ${period} months, this month included.`} />
      {tabs}
      <StatGrid>
        <StatCard label="Cars sold" value={fmtNum(r.totals.sold)} />
        <StatCard label="Leads" value={fmtNum(r.totals.leads)} />
        <StatCard label="Leads won" value={fmtNum(r.totals.won)} hint={`${r.totals.winRate}% of your leads`} />
        <StatCard href="/dashboard/leads?due=1" label="Follow-ups due" value={fmtNum(r.totals.followUpsDue)} />
      </StatGrid>
      <Panel title="By month">
        <DataTable
          bare
          label="By month"
          rows={[...r.months].reverse()}
          rowKey={(m) => m.month}
          columns={[
            { key: "month", header: "Month", cell: (m) => monthLabel(m.month), nowrap: true },
            { key: "sold", header: "Cars sold", align: "right", cell: (m) => fmtNum(m.sold) },
            { key: "leads", header: "Leads", align: "right", cell: (m) => fmtNum(m.leads) },
            { key: "won", header: "Won", align: "right", cell: (m) => fmtNum(m.won) },
          ]}
        />
      </Panel>
    </>
  );
}
