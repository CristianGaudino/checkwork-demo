import { BarList } from "@/components/admin/charts";
import { DataTable, PageHeader, Panel, StatCard, StatGrid, adminButton, adminInput } from "@/components/admin/kit";
import { LEAD_TYPE_LABELS, type LeadType } from "@/lib/admin/collections";
import { buildAnalytics } from "@/lib/admin/analytics";
import { carCosts } from "@/lib/admin/costs";
import { addMonths, dublinDay, fmtEur, fmtNum, isIsoMonth, plural } from "@/lib/admin/format";
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
  const topTypes = Object.entries(s.leads.byType).sort((x, y) => y[1] - x[1]);

  return (
    <>
      {/* Printing leaves out the menu, the demo bar and the picker: the page alone, in the browser's own PDF. */}
      <style>{"@media print { aside, [data-demo-bar], .no-print { display: none !important; } main { padding: 0 !important; } * { box-shadow: none !important; } }"}</style>
      <PageHeader title="Monthly report" text={`${whole ? "" : `${me.name}, `}${monthLabel(month)}, compared with ${monthLabel(prevMonth)}.`} actions={<PrintButton />} />
      <form method="get" className="no-print flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1 text-meta font-semibold">
          Month
          <select name="month" defaultValue={month} className={adminInput}>
            {months.map((m) => (
              <option key={m} value={m}>
                {monthLabel(m)}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className={adminButton}>
          Show
        </button>
      </form>

      <Panel title="What to do">
        <p className="text-body">{advice(s)}</p>
      </Panel>

      <h2 className="text-heading font-semibold">Leads</h2>
      <StatGrid>
        <StatCard label="Leads" value={fmtNum(s.leads.total)} hint={compare(s.leads.total, p.leads.total)} />
        <StatCard label="Out of hours" value={fmtNum(s.leads.outOfHours)} hint={s.leads.total ? `${Math.round((s.leads.outOfHours / s.leads.total) * 100)}% of leads` : undefined} />
        <StatCard label="First reply, in hours" value={fmtWait(s.replies.medianInHoursMin)} hint="Median" />
        <StatCard label="First reply, out of hours" value={fmtWait(s.replies.medianOutOfHoursMin)} hint="Median" />
        <StatCard label="No reply in 24 hours" value={fmtNum(s.replies.none)} tone={s.replies.none ? "warn" : undefined} />
      </StatGrid>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Panel title="By type">
          {topTypes.length ? <BarList items={topTypes.map(([t, n]) => ({ label: LEAD_TYPE_LABELS[t as LeadType] ?? t, value: n }))} /> : <p className="text-meta text-text-2">No leads this month.</p>}
        </Panel>
        <Panel title="By day of the week">
          <BarList items={DAYS.map((d, i) => ({ label: d, value: s.leads.byWeekday[i] }))} />
        </Panel>
      </div>

      {a && (
        <>
          <h2 className="text-heading font-semibold">Visitors</h2>
          <StatGrid>
            <StatCard label="Visitors" value={fmtNum(a.totals.visitors)} hint={compare(a.totals.visitors, a.previous.visitors)} />
            <StatCard label="Page views" value={fmtNum(a.totals.pageviews)} hint={compare(a.totals.pageviews, a.previous.pageviews)} />
          </StatGrid>
          <Panel title="Top 5 cars viewed">
            <DataTable bare rows={a.topCars.slice(0, 5)} rowKey={(c) => c.slug} columns={[{ key: "t", header: "Car", cell: (c) => <span className="font-medium">{c.title}</span> }, { key: "v", header: "Views", align: "right", cell: (c) => fmtNum(c.views) }]} />
          </Panel>
        </>
      )}

      {whole && (
        <>
          <h2 className="text-heading font-semibold">Stock</h2>
          <StatGrid>
            <StatCard label="Cars added" value={fmtNum(s.stock.added)} hint={compare(s.stock.added, p.stock.added)} />
            <StatCard label="Cars sold" value={fmtNum(s.stock.sold)} hint={compare(s.stock.sold, p.stock.sold)} />
            <StatCard label="Days in stock" value={s.stock.avgDaysInStock === null ? "None" : fmtNum(s.stock.avgDaysInStock)} hint="Average, cars for sale now" />
            <StatCard label={`${OLD_STOCK_DAYS} days or more`} value={fmtNum(s.stock.oldStock)} tone={s.stock.oldStock ? "warn" : undefined} hint="Cars for sale now" />
          </StatGrid>
        </>
      )}

      {hasSales && (
        <>
          <h2 className="text-heading font-semibold">Sales</h2>
          <StatGrid>
            <StatCard label="Sales" value={fmtNum(s.sales.count)} hint={compare(s.sales.count, p.sales.count)} />
            {s.sales.valueEur !== undefined && <StatCard label="Sales value" value={fmtEur(s.sales.valueEur)} />}
            {profit !== undefined && <StatCard label="Profit" value={fmtEur(profit)} hint="On sales with a cost" />}
          </StatGrid>
        </>
      )}

      {whole && hasReviews && (
        <>
          <h2 className="text-heading font-semibold">Reviews</h2>
          <StatGrid>
            <StatCard label="New reviews" value={fmtNum(s.reviews.count)} hint={compare(s.reviews.count, p.reviews.count)} />
            <StatCard label="Average rating" value={s.reviews.average === null ? "None" : `${s.reviews.average} of 5`} hint={plural(s.reviews.count, "review")} />
          </StatGrid>
        </>
      )}
    </>
  );
}
