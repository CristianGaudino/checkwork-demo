import Link from "next/link";
import { notFound } from "next/navigation";
import { Avatar, EmptyState, PageHeader, Segmented, SummaryTabs, TableFooter, type FilterGroup } from "@/components/admin/kit";
import { AppliedFilters, Filters } from "@/components/admin/TableTools";
import { card } from "@/components/ui";
import { perPage } from "@/lib/admin/paging";
import { ACTIVITY_AREAS, AREA_LABELS, PERSONAL_KINDS, listActivity, type ActivityArea, type ActivityEntry } from "@/lib/admin/activity";
import { refView } from "@/lib/admin/activity-refs";
import { alertsStore, drivesStore, leadsStore, reviewsStore, subscribersStore } from "@/lib/admin/collections";
import { addDays, dublinDay, fmtDateTime, fmtDay, fmtNum, fmtTime, dublinMs } from "@/lib/admin/format";
import { adminCars } from "@/lib/admin/stock-admin";
import { can } from "@/lib/permissions";
import { DAY } from "@/lib/time";

export const metadata = { title: "Activity" };

const PERIODS = [
  ["today", "Today", DAY],
  ["7d", "7 days", 7 * DAY],
  ["30d", "30 days", 30 * DAY],
  ["all", "12 months", 0],
] as const;
type Params = { area?: string; who?: string; period?: string; page?: string; per?: string };
// The start of a period, from now. Out of the component, like the stock page's days in stock: a page rendered per request.
// Today is the Irish calendar day, from midnight, so it matches the Today heading; the others are rolling.
const sinceOf = (key: string, span: number, now = Date.now()) => (key === "today" ? dublinMs(dublinDay(now), "00:00") : span ? now - span : undefined);

// Owners and managers only (the "activity" permission). Without it the page is not there: a hidden link is never the only protection.
export default async function Page({ searchParams }: { searchParams: Promise<Params> }) {
  if (!(await can("activity"))) notFound();
  const sp = await searchParams;
  const area = (ACTIVITY_AREAS as readonly string[]).includes(sp.area ?? "") ? (sp.area as ActivityArea) : undefined;
  const period = PERIODS.find(([k]) => k === sp.period) ?? PERIODS[3];
  const askedPage = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);
  const size = perPage(sp.per);
  const since = sinceOf(period[0], period[2]);
  const first = await listActivity({ area, actor: sp.who || undefined, since }, askedPage, size);
  const actor = first.actors.includes(sp.who ?? "") ? sp.who : undefined; // an unknown name is dropped, like a bad filter elsewhere
  const pageCount = Math.max(1, Math.ceil(first.total / size));
  const page = Math.min(askedPage, pageCount);
  const result = page === askedPage && actor === sp.who ? first : await listActivity({ area, actor, since }, page, size);
  const href = (p: Partial<Params>) => {
    const q = new URLSearchParams(Object.entries({ area, who: actor, period: period[0] === "all" ? undefined : period[0], per: sp.per, ...p }).filter((e): e is [string, string] => Boolean(e[1])));
    return `/dashboard/activity${q.size ? `?${q}` : ""}`;
  };
  // When, as four plain choices always in view; who, in the Filters panel (a list of names can be long). The area stays as the tiles.
  const filters: FilterGroup[] = result.actors.length > 1 ? [{ name: "who", label: "Who made the change", any: "Everyone", options: result.actors.map((a) => [a, a] as const) }] : [];
  const view = await refViews(result.rows);
  const total = Object.values(result.byArea).reduce((s, n) => s + (n ?? 0), 0);
  const days = byDay(result.rows);

  const record = (e: ActivityEntry) => {
    const r = view(e);
    if (!r) return null;
    return r.href ? (
      <Link href={r.href} className="font-medium text-accent-text underline-offset-2 hover:underline">
        {r.label}
      </Link>
    ) : (
      <span>{r.label}</span>
    );
  };
  return (
    <>
      <PageHeader title="Activity" text="Every change made in the dashboard, newest first, kept for 12 months." />
      <SummaryTabs
        label="Area"
        items={[
          { label: "All", count: fmtNum(total), href: href({ area: undefined, page: undefined }), active: !area },
          ...ACTIVITY_AREAS.map((a) => ({ label: AREA_LABELS[a], count: fmtNum(result.byArea[a] ?? 0), href: href({ area: a, page: undefined }), active: area === a })),
        ]}
      />
      <div className="flex flex-wrap items-center gap-2">
        <Segmented label="When" items={PERIODS.map(([k, label]) => ({ label, href: href({ period: k === "all" ? undefined : k, page: undefined }), active: period[0] === k }))} />
        {filters.length > 0 && <Filters groups={filters} />}
      </div>
      {filters.length > 0 && <AppliedFilters groups={filters} />}
      {/* The changes by day, each a plain line: what was done, then who, when and to what. */}
      <section aria-label="Changes" className="flex flex-col gap-6">
        {days.length === 0 ? (
          <div className={card}>
            <EmptyState title="No changes" text={area || actor || since ? "Nothing matches these filters." : "Changes made in the dashboard show here."} />
          </div>
        ) : (
          days.map(([day, entries]) => (
            <div key={day} className="flex flex-col gap-2">
              <h2 className="text-section font-semibold">{dayName(day)}</h2>
              <ul className={`${card} flex flex-col divide-y divide-hairline`}>
                {entries.map((e) => (
                  <li key={e.id} className="flex items-start gap-3 px-4 py-3">
                    <Avatar name={e.actor} className="mt-0.5" />
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="text-body">{e.summary}</span>
                      <span className="text-meta text-text-2 [overflow-wrap:anywhere]">
                        <span className="font-medium text-text">{e.actor}</span>
                        {", "}
                        <time dateTime={new Date(e.at).toISOString()} title={fmtDateTime(e.at)}>{fmtTime(e.at)}</time>
                        {view(e) && <>{", "}{record(e)}</>}
                      </span>
                    </span>
                    <span className="hidden shrink-0 text-meta text-text-2 sm:block">{AREA_LABELS[e.area]}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}
      </section>
      <TableFooter page={page} pageCount={pageCount} total={result.total} per={size} />
    </>
  );
}

// The page's changes in Irish days, newest first (the list already is), kept in order.
function byDay(rows: ActivityEntry[]): [string, ActivityEntry[]][] {
  const days = new Map<string, ActivityEntry[]>();
  for (const e of rows) {
    const d = dublinDay(e.at);
    days.set(d, [...(days.get(d) ?? []), e]);
  }
  return [...days];
}
function dayName(day: string) {
  const today = dublinDay();
  return day === today ? "Today" : day === addDays(today, -1) ? "Yesterday" : fmtDay(day);
}

// Names for the people these rows point at, read from the live records, and which cars still exist. Only the stores the rows need.
async function refViews(rows: ActivityEntry[]) {
  const kinds = new Set(rows.map((e) => e.refKind));
  const pick = async <T extends { id: string }>(kind: string, store: { list(): Promise<T[]> }, name: (r: T) => string) =>
    kinds.has(kind as never) ? (await store.list()).map((r) => [`${kind}:${r.id}`, name(r)] as const) : [];
  const [leads, drives, alerts, subs, reviews, cars] = await Promise.all([
    pick("lead", leadsStore, (l) => l.name),
    pick("drive", drivesStore, (d) => `${d.name}, ${d.carTitle}`),
    pick("alert", alertsStore, (a) => a.email),
    pick("subscriber", subscribersStore, (s) => s.email),
    pick("review", reviewsStore, (r) => `Review by ${r.author}`),
    kinds.has("car") ? adminCars() : Promise.resolve([]),
  ]);
  const people = new Map([...leads, ...drives, ...alerts, ...subs, ...reviews]);
  const carIds = new Set(cars.map((c) => c.id));
  return (e: ActivityEntry) =>
    refView(e, people, (kind, id) => (kind === "car" ? carIds.has(id) : PERSONAL_KINDS.includes(kind) ? people.has(`${kind}:${id}`) : true));
}
