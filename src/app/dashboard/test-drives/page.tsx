import { DriveStatusBadge } from "@/components/admin/badges";
import { AddDriveForm } from "@/components/admin/AddDriveForm";
import { Badge, EmptyState, PageHeader, Pager, Panel, SummaryTabs, adminButton, paginate, rowButton } from "@/components/admin/kit";
import { PlusIcon } from "@/components/stock/icons";
import { card } from "@/components/ui";
import { DRIVE_STATUSES, DRIVE_STATUS_LABELS, drivesStore } from "@/lib/admin/collections";
import { groupByDay, parseDriveStatus } from "@/lib/admin/drives";
import { TEST_DRIVE } from "@/lib/leads/constants";
import { TIME_ZONE } from "@/lib/site";
import { addMonths, dublinDay } from "@/lib/admin/format";
import { adminCars } from "@/lib/admin/stock-admin";
import { carName } from "@/lib/stock/format";
import { isSold } from "@/lib/stock/types";
import { telHref } from "@/lib/phone";
import { setDriveStatusAction } from "./actions";

export const metadata = { title: "Test drives" };

const day = new Intl.DateTimeFormat("en-IE", { weekday: "long", day: "numeric", month: "long", timeZone: TIME_ZONE });
// A day in another year says which, so a booking typed a year out never reads as this year.
const dayLabel = (t: number) => (dublinDay(t).slice(0, 4) === dublinDay().slice(0, 4) ? day.format(t) : `${day.format(t)} ${dublinDay(t).slice(0, 4)}`);
const time = new Intl.DateTimeFormat("en-IE", { hour: "2-digit", minute: "2-digit", timeZone: TIME_ZONE });
// What the dealer can do next from each status. Anything else is not offered.
const NEXT: Record<string, [string, string][]> = {
  requested: [["confirmed", "Confirm"], ["cancelled", "Cancel"]],
  confirmed: [["completed", "Mark done"], ["no-show", "No show"], ["cancelled", "Cancel"]],
};

export default async function Page({ searchParams }: { searchParams: Promise<{ status?: string; page?: string }> }) {
  const sp = await searchParams;
  const status = parseDriveStatus(sp.status);
  const [all, cars] = await Promise.all([drivesStore.list(), adminCars()]);
  const soldSlugs = new Set(cars.filter(isSold).map((c) => c.slug)); // a booking still open on a car that has since sold needs a call
  const open = (s: string) => s === "requested" || s === "confirmed";
  const rows = all.filter((d) => (status ? d.status === status : open(d.status)));
  // Done, no-show and cancelled only grow: every list is in pages, then grouped by day.
  // Coming up: soonest first. Done, no-show and cancelled: most recent first, so page 1 is what just happened.
  const ahead = !status || status === "requested" || status === "confirmed";
  const paged = paginate([...rows].sort((x, y) => (ahead ? x.startsAt - y.startsAt : y.startsAt - x.startsAt)), sp.page);
  const groups = groupByDay(paged.rows);
  const count = (s: string) => all.filter((d) => d.status === s).length;

  return (
    <>
      <PageHeader title="Test drives" />
      <SummaryTabs
        label="Booking status"
        items={[
          { label: "Upcoming", href: "/dashboard/test-drives", active: !status, count: all.filter((d) => open(d.status)).length },
          ...DRIVE_STATUSES.map((s) => ({ label: DRIVE_STATUS_LABELS[s], href: `/dashboard/test-drives?status=${s}`, active: status === s, count: count(s) })),
        ]}
      />
      {/* Taken by phone or in person: the form opens on demand, so the list comes first. */}
      <details className="group">
        <summary className={`${adminButton} w-fit cursor-pointer list-none [&::-webkit-details-marker]:hidden`}>
          <PlusIcon className="size-4" />
          Add a booking
        </summary>
        <Panel className="mt-3">
          <AddDriveForm cars={cars.filter((c) => !isSold(c)).map((c) => ({ slug: c.slug, label: carName(c) }))} min={dublinDay()} max={addMonths(dublinDay(), TEST_DRIVE.monthsAhead)} />
        </Panel>
      </details>
      {groups.length === 0 ? (
        <Panel>
          <EmptyState title="No bookings here" />
        </Panel>
      ) : (
        // One list, a heading row per day, and every other booking filled, as in the other tables.
        <section aria-label="Bookings" className={`${card} overflow-hidden`}>
          {groups.map((g) => (
            <div key={g.day}>
              <h2 className="border-b border-hairline bg-surface px-4 py-2 text-meta font-medium text-text-2">{dayLabel(g.drives[0].startsAt)}</h2>
              <ul>
                {g.drives.map((d) => (
                  <li key={d.id} className="grid grid-cols-[4rem_minmax(0,1fr)] items-center gap-x-4 gap-y-2 px-4 py-3 even:bg-row-alt md:grid-cols-[4rem_minmax(0,1fr)_auto]">
                    <span className="self-start font-medium tabular-nums md:self-center">{time.format(d.startsAt)}</span>
                    <div className="flex min-w-0 flex-col">
                      <span className="flex flex-wrap items-center gap-2 font-medium">
                        <span data-name>{d.name}</span>
                        <DriveStatusBadge status={d.status} />
                      </span>
                      <span className="flex flex-wrap items-center gap-2 text-meta text-text-2">
                        {d.carTitle}
                        {open(d.status) && soldSlugs.has(d.carSlug) && <Badge tone="warn">Car sold</Badge>}
                      </span>
                      <a href={telHref(d.phone) ?? undefined} className="inline-flex min-h-11 w-fit items-center text-meta text-text-2 underline-offset-2 hover:underline md:min-h-0">
                        {d.phone}
                      </a>
                      {d.notes && <span className="text-meta text-text-2">{d.notes}</span>}
                    </div>
                    {(NEXT[d.status] ?? []).length > 0 && (
                      <div className="col-start-2 flex flex-wrap gap-2 md:col-start-3 md:justify-end">
                        {(NEXT[d.status] ?? []).map(([to, label]) => (
                          <form key={to} action={setDriveStatusAction.bind(null, d.id, to)}>
                            <button type="submit" className={`${rowButton} ${to === "cancelled" ? "text-bad" : ""}`}>
                              {label}
                            </button>
                          </form>
                        ))}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      )}
      <Pager page={paged.page} pageCount={paged.pageCount} total={paged.total} href={(n) => `/dashboard/test-drives?${status ? `status=${status}&` : ""}page=${n}`} />
    </>
  );
}
