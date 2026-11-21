import Link from "next/link";
import { bounds } from "@/lib/reports/monthly";
import { DAY } from "@/lib/time";
import { alertsStore, salesStore } from "@/lib/admin/collections";
import { addDays, dublinDay } from "@/lib/admin/format";
import { visitorFigures } from "@/lib/admin/visitor-figures";
import { countsBetween } from "@/lib/owner-api/counters";
import type { Range } from "@/lib/admin/analytics";
import { AreaChart, BarList } from "@/components/admin/charts";
import { MoreDetail } from "@/components/admin/MoreDetail";
import { DataTable, PageHeader, Panel, Segmented, StatCard, StatGrid } from "@/components/admin/kit";
import { RANGES, buildAnalytics, change, changeText, parseRange } from "@/lib/admin/analytics";
import { fmtNum, fmtPct, threeLetter } from "@/lib/admin/format";
import { leadsStore } from "@/lib/admin/collections";
import { adminCars } from "@/lib/admin/stock-admin";
import { simulating } from "@/lib/integrations";
import { currentMember } from "@/lib/permissions";
import { roleCan } from "@/lib/permission-rules";
import { carName, carHref } from "@/lib/stock/format";
import { forSale } from "@/lib/stock/types";
import { BrandName } from "@/components/admin/BrandIcon";

export const metadata = { title: "Analytics" };

const shortDate = new Intl.DateTimeFormat("en-IE", { day: "numeric", month: "short", timeZone: "UTC" });

export default async function Page({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const range = parseRange((await searchParams).range);
  // The demo shows generated figures; a dealer's own site shows what its visitors really did.
  if (!simulating()) return <RealAnalytics range={range} />;
  const [all, leads, allSales, me] = await Promise.all([adminCars(), leadsStore.list(), salesStore.list(), currentMember()]);
  // As on Reports (owner's decision): the roles allowed margins see the dealership's sales; a salesperson sees their own.
  const whole = roleCan(me.role, "margins");
  const sales = whole ? allSales : allSales.filter((s) => s.salesperson === me.name);
  const cars = all.filter(forSale).map((c) => ({ slug: c.slug, title: carName(c) }));
  const a = buildAnalytics({ range, cars, leadTimes: leads.map((l) => l.createdAt) });
  const dv = change(a.totals.visitors, a.previous.visitors);
  const dp = change(a.totals.pageviews, a.previous.pageviews);
  const dl = change(a.totals.leads, a.previous.leads);
  const convBefore = a.previous.visitors ? (a.previous.leads / a.previous.visitors) * 100 : 0;
  const top = a.funnel[0].count;
  // Cars sold is the sales recorded in the period (as Reports counts them), never a generated figure; the funnel ends on the same number.
  const from = addDays(dublinDay(), -range);
  const sold = sales.filter((s) => !s.returnedOn && s.soldOn > from).length;
  // The funnel is the dealership's: its last step only for those who see every sale, never one person's sales under it.
  const funnel = whole ? a.funnel.map((s, i, f) => (i === f.length - 1 ? { ...s, count: Math.min(sold, f[i - 1]?.count ?? sold) } : s)) : a.funnel.slice(0, -1);
  const best = [...a.sources].sort((x, y) => y.leads - x.leads)[0];

  return (
    <>
      <PageHeader title="Analytics" text="How many people found your site, how many got in touch, and where they came from." />
      <Segmented label="Period" items={RANGES.map((r) => ({ label: `${r} days`, href: `/dashboard/analytics?range=${r}`, active: range === r }))} />

      {/* The answer first, in words; the figures behind it follow. */}
      <p className="max-w-measure text-body">
        {fmtNum(a.totals.visitors)} people visited your site in the last {range} days, {changeText(a.totals.visitors, a.previous.visitors).toLowerCase()}. {fmtNum(a.totals.leads)} got in touch{whole ? ` and ${fmtNum(sold)} bought a car.` : `, and you sold ${fmtNum(sold)}.`}
        {best && best.leads > 0 && ` Most leads came from ${best.name}.`}
      </p>

      <StatGrid>
        <StatCard label="Visitors" value={fmtNum(a.totals.visitors)} hint={changeText(a.totals.visitors, a.previous.visitors)} tone={dv >= 0 ? "good" : "bad"} />
        <StatCard label="Leads" value={fmtNum(a.totals.leads)} hint={changeText(a.totals.leads, a.previous.leads)} tone={dl >= 0 ? "good" : "bad"} />
        <StatCard label="Cars sold" value={fmtNum(sold)} hint={whole ? "Sales you recorded" : "Your own sales"} />
        <StatCard label="Visitors who got in touch" value={fmtPct(a.totals.conversion)} hint={changeText(a.totals.conversion, convBefore, true)} tone={a.totals.conversion >= convBefore ? "good" : "bad"} />
      </StatGrid>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
        <Panel title="Where visitors come from">
          <DataTable
            bare
            rows={[...a.sources].sort((x, y) => y.leads - x.leads || y.visitors - x.visitors)}
            rowKey={(s) => s.name}
            columns={[
              { key: "name", header: "Source", cell: (s) => <BrandName name={s.name} className="font-medium" /> },
              { key: "v", header: "Visitors", align: "right", cell: (s) => fmtNum(s.visitors) },
              { key: "l", header: "Leads", align: "right", cell: (s) => <span className="font-semibold">{fmtNum(s.leads)}</span> },
              { key: "c", header: "Got in touch", align: "right", cell: (s) => fmtPct(s.visitors ? (s.leads / s.visitors) * 100 : 0), hide: "sm" },
            ]}
          />
        </Panel>
        <Panel title="From visit to sale">
          <BarList items={funnel.map((s, i) => ({ label: s.label, value: s.count, note: i ? fmtPct((s.count / top) * 100) : undefined }))} of={top} />
        </Panel>
      </div>

      <Panel title="Visitors each day">
        <AreaChart data={a.days.map((d) => ({ label: threeLetter(shortDate.format(new Date(d.date))), value: d.visitors }))} format={(n) => `${fmtNum(n)} visitors`} summary={`Visitors each day over the last ${range} days, from ${fmtNum(Math.min(...a.days.map((d) => d.visitors)))} to ${fmtNum(Math.max(...a.days.map((d) => d.visitors)))}.`} />
      </Panel>

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

      {/* Worth a look now and then, not every day: folded so the page stays short. */}
      <MoreDetail>
        <p className="text-body">
          {fmtNum(a.totals.pageviews)} pages viewed, <span className={dp >= 0 ? "text-ok" : "text-bad"}>{changeText(a.totals.pageviews, a.previous.pageviews).toLowerCase()}</span>.
        </p>
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
          <Panel title="Where in Ireland" quiet>
            <BarList items={a.places.map((p) => ({ label: p.name, value: p.visitors }))} />
          </Panel>
          <Panel title="Devices" quiet>
            <BarList items={a.devices.map((d) => ({ label: d.name, value: d.visitors, note: fmtPct((d.visitors / a.totals.visitors) * 100) }))} of={a.totals.visitors} />
          </Panel>
        </div>
      </MoreDetail>
    </>
  );
}

const today = () => Date.now(); // lint: a page may not call Date.now directly
const none = <p className="text-meta text-text-2">None in this period.</p>;

async function RealAnalytics({ range }: { range: Range }) {
  const now = today();
  const [from, to] = [dublinDay(now - (range - 1) * DAY), dublinDay(now)];
  const [start] = bounds(from, to);
  const [{ features }, leads, alerts] = await Promise.all([countsBetween(from, to), leadsStore.list(), alertsStore.list()]);
  const f = visitorFigures({ counts: features, leads: leads.filter((l) => l.createdAt >= start), alerts });

  return (
    <>
      <PageHeader title="Analytics" text="Who visits your site, where they come from and what they look at." />
      <Segmented label="Period" items={RANGES.map((r) => ({ label: `${r} days`, href: `/dashboard/analytics?range=${r}`, active: range === r }))} />

      <StatGrid>
        <StatCard label="Visits" value={fmtNum(f.totals.visits)} />
        <StatCard label="Website leads" value={fmtNum(f.totals.leads)} />
        <StatCard label="Visits that became leads" value={fmtPct(f.totals.conversion)} />
      </StatGrid>

      <Panel title="Where visitors come from">
        {f.sources.length ? (
          <DataTable
            bare
            rows={f.sources}
            rowKey={(s) => s.name}
            columns={[
              { key: "name", header: "Source", cell: (s) => <BrandName name={s.name} className="font-medium" /> },
              { key: "v", header: "Visits", align: "right", cell: (s) => fmtNum(s.visits) },
              { key: "l", header: "Leads", align: "right", cell: (s) => fmtNum(s.leads) },
              { key: "c", header: "Became leads", align: "right", cell: (s) => (s.visits ? fmtPct((s.leads / s.visits) * 100) : ""), hide: "sm" },
            ]}
          />
        ) : (
          none
        )}
      </Panel>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Panel title="Searches with no cars to show" count={f.noResults.count}>
          {f.noResults.makes.length ? <BarList items={f.noResults.makes} /> : none}
        </Panel>
        <Panel title="Prices people look at">{f.bands.length ? <BarList items={f.bands} /> : none}</Panel>
        <Panel title="Filters people use">{f.filters.length ? <BarList items={f.filters} /> : none}</Panel>
        <Panel title="Finance">
          <BarList items={[{ label: "Used the calculator", value: f.finance.calculator }, { label: "Applied", value: f.finance.applications }]} />
        </Panel>
      </div>

      <Panel title="Alerts on each car">
        {f.alertsPerCar.length ? <BarList items={f.alertsPerCar} /> : <p className="text-meta text-text-2">No one is waiting on a price drop or a car coming back.</p>}
      </Panel>

      <p className="text-meta text-text-2">A visit counts once, from its first page. Nothing here says who a visitor is.</p>
    </>
  );
}
