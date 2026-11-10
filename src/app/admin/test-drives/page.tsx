import { DriveStatusBadge } from "@/components/admin/badges";
import { AddDriveForm } from "@/components/admin/AddDriveForm";
import { EmptyState, FilterTabs, PageHeader, Panel } from "@/components/admin/kit";
import { DRIVE_STATUSES, DRIVE_STATUS_LABELS, drivesStore } from "@/lib/admin/collections";
import { groupByDay, parseDriveStatus } from "@/lib/admin/drives";
import { fmtDate } from "@/lib/admin/format";
import { adminCars } from "@/lib/admin/stock-admin";
import { carName } from "@/lib/stock/format";
import { isSold } from "@/lib/stock/types";
import { setDriveStatusAction } from "./actions";

export const metadata = { title: "Test drives" };

const time = new Intl.DateTimeFormat("en-IE", { hour: "2-digit", minute: "2-digit" });
// What the dealer can do next from each status. Anything else is not offered.
const NEXT: Record<string, [string, string][]> = {
  requested: [["confirmed", "Confirm"], ["cancelled", "Cancel"]],
  confirmed: [["completed", "Mark done"], ["no-show", "No show"], ["cancelled", "Cancel"]],
};

export default async function Page({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const status = parseDriveStatus((await searchParams).status);
  const [all, cars] = await Promise.all([drivesStore.list(), adminCars()]);
  const open = (s: string) => s === "requested" || s === "confirmed";
  const rows = all.filter((d) => (status ? d.status === status : open(d.status)));
  const groups = groupByDay(rows);
  const count = (s: string) => all.filter((d) => d.status === s).length;

  return (
    <>
      <PageHeader title="Test drives" text="Bookings in date order. Confirm a request, or mark a drive done." />
      <FilterTabs
        items={[
          { label: "Upcoming", href: "/admin/test-drives", active: !status, count: all.filter((d) => open(d.status)).length },
          ...DRIVE_STATUSES.map((s) => ({ label: DRIVE_STATUS_LABELS[s], href: `/admin/test-drives?status=${s}`, active: status === s, count: count(s) })),
        ]}
      />
      {groups.length === 0 ? (
        <Panel>
          <EmptyState title="No bookings here" />
        </Panel>
      ) : (
        groups.map((g) => (
          <Panel key={g.day} title={fmtDate(g.drives[0].startsAt)}>
            <ul className="flex flex-col divide-y divide-hairline">
              {g.drives.map((d) => (
                <li key={d.id} className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 py-3">
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <span className="font-semibold">
                      {time.format(d.startsAt)} · {d.name}
                    </span>
                    <span className="text-meta text-text-2">
                      {d.carTitle} · <a href={`tel:${d.phone.replace(/\s/g, "")}`} className="underline">{d.phone}</a>
                    </span>
                    {d.notes && <span className="text-meta text-text-2">{d.notes}</span>}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <DriveStatusBadge status={d.status} />
                    {(NEXT[d.status] ?? []).map(([to, label]) => (
                      <form key={to} action={setDriveStatusAction.bind(null, d.id, to)}>
                        <button type="submit" className="min-h-11 px-2 text-meta font-semibold underline">
                          {label}
                        </button>
                      </form>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          </Panel>
        ))
      )}
      <Panel title="Add a booking">
        <AddDriveForm cars={cars.filter((c) => !isSold(c)).map((c) => ({ slug: c.slug, label: carName(c) }))} />
      </Panel>
    </>
  );
}
