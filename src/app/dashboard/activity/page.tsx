import Link from "next/link";
import { notFound } from "next/navigation";
import { Avatar, DataTable, EmptyState, PageHeader, SummaryTabs, TableFooter, TableToolbar, type FilterGroup } from "@/components/admin/kit";
import { perPage } from "@/lib/admin/paging";
import { ACTIVITY_AREAS, AREA_LABELS, PERSONAL_KINDS, listActivity, type ActivityArea, type ActivityEntry } from "@/lib/admin/activity";
import { refView } from "@/lib/admin/activity-refs";
import { alertsStore, drivesStore, leadsStore, reviewsStore, subscribersStore } from "@/lib/admin/collections";
import { fmtAgo, fmtDateTime, fmtNum } from "@/lib/admin/format";
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
const sinceOf = (span: number, now = Date.now()) => (span ? now - span : undefined);

// Owners and managers only (the "activity" permission). Without it the page is not there: a hidden link is never the only protection.
export default async function Page({ searchParams }: { searchParams: Promise<Params> }) {
  if (!(await can("activity"))) notFound();
  const sp = await searchParams;
  const area = (ACTIVITY_AREAS as readonly string[]).includes(sp.area ?? "") ? (sp.area as ActivityArea) : undefined;
  const period = PERIODS.find(([k]) => k === sp.period) ?? PERIODS[3];
  const askedPage = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);
  const size = perPage(sp.per);
  const since = sinceOf(period[2]);
  const first = await listActivity({ area, actor: sp.who || undefined, since }, askedPage, size);
  const actor = first.actors.includes(sp.who ?? "") ? sp.who : undefined; // an unknown name is dropped, like a bad filter elsewhere
  const pageCount = Math.max(1, Math.ceil(first.total / size));
  const page = Math.min(askedPage, pageCount);
  const result = page === askedPage && actor === sp.who ? first : await listActivity({ area, actor, since }, page, size);
  const href = (p: Partial<Params>) => {
    const q = new URLSearchParams(Object.entries({ area, who: actor, period: period[0] === "all" ? undefined : period[0], per: sp.per, ...p }).filter((e): e is [string, string] => Boolean(e[1])));
    return `/dashboard/activity${q.size ? `?${q}` : ""}`;
  };
  // The period and the person in one Filters panel; the area stays as the tiles above.
  const filters: FilterGroup[] = [
    { name: "period", label: "When", any: "Last 12 months", options: PERIODS.filter(([k]) => k !== "all").map(([k, label]) => [k, label === "Today" ? label : `Last ${label}`] as const) },
    ...(result.actors.length > 1 ? [{ name: "who", label: "Who", any: "Everyone", options: result.actors.map((a) => [a, a] as const) }] : []),
  ];
  const view = await refViews(result.rows);
  const total = Object.values(result.byArea).reduce((s, n) => s + (n ?? 0), 0);

  return (
    <>
      <PageHeader title="Activity" text="Every change made in the dashboard, kept for 12 months. Only owners and managers see this." />
      <SummaryTabs
        label="Area"
        items={[
          { label: "All", count: fmtNum(total), href: href({ area: undefined, page: undefined }), active: !area },
          ...ACTIVITY_AREAS.map((a) => ({ label: AREA_LABELS[a], count: fmtNum(result.byArea[a] ?? 0), href: href({ area: a, page: undefined }), active: area === a })),
        ]}
      />
      <TableToolbar filters={filters} />
      <DataTable
        label="Activity"
        rows={result.rows}
        rowKey={(e) => e.id}
        empty={<EmptyState title="No changes" text={area || actor || since ? "Nothing matches these filters." : "Changes made in the dashboard show here."} />}
        columns={[
          { key: "when", header: "When", cell: (e) => <When at={e.at} />, nowrap: true, hide: "sm" },
          {
            key: "who",
            header: "Who",
            hide: "sm",
            cell: (e) => (
              <span className="flex items-center gap-2">
                <Avatar name={e.actor} />
                <span className="font-medium">{e.actor}</span>
              </span>
            ),
          },
          {
            key: "what",
            header: "What",
            // On a phone who and when go under the change, so the change itself is the first thing in the row.
            cell: (e) => (
              <span className="flex flex-col">
                {e.summary}
                <span className="text-meta text-text-2 sm:hidden">
                  {e.actor}, <When at={e.at} />
                </span>
              </span>
            ),
            className: "min-w-[11rem]",
          },
          {
            key: "ref",
            header: "Record",
            cell: (e) => {
              const r = view(e);
              if (!r) return null;
              return r.href ? (
                <Link href={r.href} className="underline-offset-2 hover:underline">
                  {r.label}
                </Link>
              ) : (
                <span className="text-text-2">{r.label}</span>
              );
            },
            className: "[overflow-wrap:anywhere]", // an alert or subscriber is an email, which would otherwise widen the table
          },
          { key: "area", header: "Area", cell: (e) => AREA_LABELS[e.area], hide: "lg" },
        ]}
      />
      <TableFooter page={page} pageCount={pageCount} total={result.total} per={size} />
    </>
  );
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

function When({ at }: { at: number }) {
  return (
    <time dateTime={new Date(at).toISOString()} title={fmtDateTime(at)}>
      {fmtAgo(at)}
    </time>
  );
}
