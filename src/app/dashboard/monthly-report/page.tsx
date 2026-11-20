import { BarList } from "@/components/admin/charts";
import { DataTable, PageHeader, Panel, StatCard, StatGrid, adminButtonQuiet, rowButton } from "@/components/admin/kit";
import Link from "next/link";
import { LEAD_TYPE_LABELS, type LeadType } from "@/lib/admin/collections";
import { buildAnalytics } from "@/lib/admin/analytics";
import { carCosts } from "@/lib/admin/costs";
import { addMonths, dublinDay, fmtEur, fmtNum, fmtPct, isIsoMonth, plural } from "@/lib/admin/format";
import { visitorFigures } from "@/lib/admin/visitor-figures";
import { countsBetween } from "@/lib/owner-api/counters";
import { monthLabel } from "@/lib/admin/reports";
import { simulating } from "@/lib/integrations";
import { hasModule } from "@/lib/modules";
import { can, currentMember } from "@/lib/permissions";
import { roleCan } from "@/lib/permission-rules";
import { loadReportData } from "@/lib/reports/load";
import { advice, bounds, compare, fmtWait, monthBefore, monthRange, summarise } from "@/lib/reports/monthly";
import { OLD_STOCK_DAYS } from "@/lib/admin/overview";
import { carName } from "@/lib/stock/format";
import { forSale } from "@/lib/stock/types";
import { notFound } from "next/navigation";
import { PrintButton } from "./PrintButton";

export const metadata = { title: "Monthly report" };

const today = () => Date.now(); // lint: a page may not call Date.now directly
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export default async function Page({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  if (!(await can("reports"))) notFound();
  const now = today();
  const last = monthBefore(dublinDay(now).slice(0, 7));
  // Last month by default; any of the twelve up to it (a month that has not finished is not a report yet).
  const asked = (await searchParams).month ?? "";
  const months = Array.from({ length: 12 }, (_, i) => addMonths(`${last}-01`, -i).slice(0, 7));
  const month = isIsoMonth(asked) && months.includes(asked) ? asked : last;
  const earlier = months[months.indexOf(month) + 1];
  const later = months[months.indexOf(month) - 1];
  const [all, seeMargins, me, hasSales, hasReviews, hasAnalytics, hasMargins] = await Promise.all([loadReportData(), can("margins"), currentMember(), hasModule("sales"), hasModule("reviews"), hasModule("analytics"), hasModule("margins")]);
  // As on Reports (owner's decision): the roles allowed margins see the dealership; a salesperson sees their own leads and sales, and
  // nothing of the stock, visitors or reviews. By role, not by `can`: with the Margins module off an owner still sees the dealership (only
  // the money goes, `seeMargins`).
  const whole = roleCan(me.role, "margins");
  const data = whole ? all : { leads: all.leads.filter((l) => l.assignedTo === me.name), sales: all.sales.filter((x) => x.salesperson === me.name), cars: [], reviews: [] };
  const { from, to } = monthRange(month);
  const prevMonth = monthBefore(month);
  const prevRange = monthRange(prevMonth);
  const s = summarise(data, from, to, now, { money: seeMargins });
  const p = summarise(data, prevRange.from, prevRange.to, now);

  let profit: number | undefined;
  if (hasSales && hasMargins && seeMargins) {
    const costs = await carCosts();
    profit = data.sales.filter((x) => !x.returnedOn && x.soldOn >= from && x.soldOn <= to && costs.has(x.id)).reduce((n, x) => n + x.priceEur - costs.get(x.id)!.total, 0);
  }

  // shortcut: the demo's visitor figures are generated for the 30 days to the month's end, not the calendar month; real analytics replaces it.
  const a = whole && hasAnalytics && simulating() ? buildAnalytics({ range: 30, cars: data.cars.filter(forSale).map((c) => ({ slug: c.slug, title: carName(c) })), now: bounds(from, to)[1] - 1, leadTimes: data.leads.map((l) => l.createdAt) }) : undefined;
  // A dealer's own site: the visits its visitors really made, from the site's anonymous counts, and where its website leads came from.
  const inMonth = (r: { from: string; to: string }) => data.leads.filter((l) => l.createdAt >= bounds(r.from, r.to)[0] && l.createdAt < bounds(r.from, r.to)[1]);
  const real =
    whole && hasAnalytics && !simulating()
      ? await Promise.all([countsBetween(from, to), countsBetween(prevRange.from, prevRange.to)]).then(([c, pc]) => ({
          now: visitorFigures({ counts: c.features, leads: inMonth({ from, to }), alerts: [] }),
          before: visitorFigures({ counts: pc.features, leads: inMonth(prevRange), alerts: [] }),
        }))
      : undefined;
  const topTypes = Object.entries(s.leads.byType).sort((x, y) => y[1] - x[1]);
  const sources = Object.entries(s.leads.bySource).sort((x, y) => y[1] - x[1]);
  const topSource = sources[0];

  return (
    <>
      {/* Printing leaves out the menu, the demo bar and the picker: the page alone, in the browser's own PDF. */}
      <style>{"@media print { aside, [data-demo-bar], .no-print { display: none !important; } main { padding: 0 !important; } * { box-shadow: none !important; } }"}</style>
      <PageHeader title="Monthly report" text={`${whole ? "" : `${me.name}, `}${monthLabel(month)}, compared with ${monthLabel(prevMonth)}.`} actions={
          // The months before and after, one tap each, as the Marketing calendar moves by week; twelve months back at most.
          <>
            {earlier && <Link href={`/dashboard/monthly-report?month=${earlier}`} className={`${adminButtonQuiet} no-print`}>Earlier</Link>}
            {later && <Link href={`/dashboard/monthly-report?month=${later}`} className={`${adminButtonQuiet} no-print`}>Later</Link>}
            <PrintButton />
          </>
        } />

      <Panel title="What to do" action={whole && s.stock.oldStock > 0 ? <Link href="/dashboard/stock?view=old" className={rowButton}>See the old stock</Link> : undefined}>
        <p className="text-body">{advice(s)}</p>
      </Panel>

      {/* The month in short: the few numbers an owner asks about first, each against the month before. The sections below say more. */}
      <StatGrid>
        <StatCard label="Leads" value={fmtNum(s.leads.total)} hint={compare(s.leads.total, p.leads.total)} href="/dashboard/leads" />
        {a && <StatCard label="Visitors" value={fmtNum(a.totals.visitors)} hint={compare(a.totals.visitors, a.previous.visitors)} href="/dashboard/analytics" />}
        {real && <StatCard label="Visits" value={fmtNum(real.now.totals.visits)} hint={compare(real.now.totals.visits, real.before.totals.visits)} href="/dashboard/analytics" />}
        {hasSales ? (
          <StatCard label="Cars sold" value={fmtNum(s.sales.count)} hint={compare(s.sales.count, p.sales.count)} href="/dashboard/reports" />
        ) : (
          whole && <StatCard label="Cars sold" value={fmtNum(s.stock.sold)} hint={compare(s.stock.sold, p.stock.sold)} />
        )}
        {topSource && <StatCard label="Most leads from" value={topSource[0]} hint={plural(topSource[1], "lead")} />}
      </StatGrid>

      <h2 className="text-heading font-semibold">Leads</h2>
      <StatGrid>
        <StatCard label="Out of hours" value={fmtNum(s.leads.outOfHours)} hint={s.leads.total ? `${Math.round((s.leads.outOfHours / s.leads.total) * 100)}% of leads` : undefined} />
        <StatCard label="First reply, when open" value={fmtWait(s.replies.medianInHoursMin)} hint="Typical" />
        <StatCard label="First reply, when closed" value={fmtWait(s.replies.medianOutOfHoursMin)} hint="Typical" />
        <StatCard label="No reply in 24 hours" value={fmtNum(s.replies.none)} tone={s.replies.none ? "warn" : undefined} href="/dashboard/leads" />
      </StatGrid>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">
        <Panel title="Where they came from">
          {sources.length ? <BarList items={sources.map(([name, n]) => ({ label: name, value: n }))} /> : <p className="text-meta text-text-2">No leads this month.</p>}
        </Panel>
        <Panel title="What they asked about">
          {topTypes.length ? <BarList items={topTypes.map(([t, n]) => ({ label: LEAD_TYPE_LABELS[t as LeadType] ?? t, value: n }))} /> : <p className="text-meta text-text-2">No leads this month.</p>}
        </Panel>
        <Panel title="By day of the week">
          <BarList items={DAYS.map((d, i) => ({ label: d, value: s.leads.byWeekday[i] }))} />
        </Panel>
      </div>

      {a && (
        <>
          <h2 className="text-heading font-semibold">Visitors</h2>
          <Panel title="Top 5 cars viewed">
            <p className="text-meta text-text-2">
              {fmtNum(a.totals.pageviews)} pages viewed in all. {compare(a.totals.pageviews, a.previous.pageviews)}.
            </p>
            <DataTable bare rows={a.topCars.slice(0, 5)} rowKey={(c) => c.slug} columns={[{ key: "t", header: "Car", cell: (c) => <span className="font-medium">{c.title}</span> }, { key: "v", header: "Views", align: "right", cell: (c) => fmtNum(c.views) }]} />
          </Panel>
        </>
      )}

      {real && (
        <>
          <h2 className="text-heading font-semibold">Visitors</h2>
          <StatGrid>
            <StatCard label="Visits that became leads" value={fmtPct(real.now.totals.conversion)} />
          </StatGrid>
          {real.now.sources.length > 0 && (
            <Panel title="Where visitors came from">
              <DataTable bare rows={real.now.sources.slice(0, 6)} rowKey={(c) => c.name} columns={[{ key: "n", header: "Source", cell: (c) => <span className="font-medium">{c.name}</span> }, { key: "v", header: "Visits", align: "right", cell: (c) => fmtNum(c.visits) }, { key: "l", header: "Leads", align: "right", cell: (c) => fmtNum(c.leads) }]} />
            </Panel>
          )}
        </>
      )}

      {whole && (
        <>
          <h2 className="text-heading font-semibold">Stock</h2>
          <StatGrid>
            <StatCard label="Cars added" value={fmtNum(s.stock.added)} hint={compare(s.stock.added, p.stock.added)} />
            <StatCard label="Days in stock" value={s.stock.avgDaysInStock === null ? "None" : fmtNum(s.stock.avgDaysInStock)} hint="Average, cars for sale now" />
            <StatCard href="/dashboard/stock?view=old" label={`${OLD_STOCK_DAYS} days or more`} value={fmtNum(s.stock.oldStock)} tone={s.stock.oldStock ? "warn" : undefined} hint="Cars for sale now" />
          </StatGrid>
        </>
      )}

      {/* Sales and reviews side by side on a wide screen: each is two or three figures, too few to fill the width alone. */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {hasSales && (
          <section className="flex flex-col gap-4">
            <h2 className="text-heading font-semibold">Sales</h2>
            <StatGrid>
              {/* Cars sold is in the month in short at the top; here it shows only when there is no money to show beside it. */}
              {s.sales.valueEur === undefined && profit === undefined && <StatCard label="Cars sold" value={fmtNum(s.sales.count)} hint={compare(s.sales.count, p.sales.count)} />}
              {s.sales.valueEur !== undefined && <StatCard label="Sales" value={fmtEur(s.sales.valueEur)} />}
              {profit !== undefined && <StatCard label="Profit" value={fmtEur(profit)} hint="Cars with their cost entered" />}
            </StatGrid>
          </section>
        )}

        {whole && hasReviews && (
          <section className="flex flex-col gap-4">
            <h2 className="text-heading font-semibold">Reviews</h2>
            <StatGrid>
              <StatCard label="New reviews" value={fmtNum(s.reviews.count)} hint={compare(s.reviews.count, p.reviews.count)} />
              <StatCard label="Average rating" value={s.reviews.average === null ? "None" : `${s.reviews.average.toFixed(1)} average`} hint={plural(s.reviews.count, "review")} />
            </StatGrid>
          </section>
        )}
      </div>
    </>
  );
}
