import Link from "next/link";
import { DriveStatusBadge } from "@/components/admin/badges";
import { DriveSteps } from "@/components/admin/DriveSteps";
import { Badge, DataTable, EmptyState, PageHeader, Panel, Segmented, TableFooter, TableToolbar, adminButton, choicePill, pageOf, rowButton, sortRows, type Column, type FilterGroup } from "@/components/admin/kit";
import { CheckIcon, ChevronLeftIcon, ChevronRightIcon, PhoneIcon, PlusIcon } from "@/components/stock/icons";
import { telHref } from "@/lib/phone";
import { card } from "@/components/ui";
import { DRIVE_STATUSES, DRIVE_STATUS_LABELS, drivesStore, getSettings, type DriveStatus, type TestDrive } from "@/lib/admin/collections";
import { filterDrives, isOpenDrive, waitingDrives } from "@/lib/admin/drives";
import { addDays, dublinDay, fmtDate, fmtDay, fmtTime, isIsoDay } from "@/lib/admin/format";
import { adminCars } from "@/lib/admin/stock-admin";
import { driveTimes } from "@/lib/leads/constants";
import { forSale } from "@/lib/stock/types";
import { currentMember } from "@/lib/permissions";

export const metadata = { title: "Test drives" };

// The Monday of a day's week.
const mondayOf = (iso: string) => addDays(iso, -((new Date(`${iso}T12:00:00Z`).getUTCDay() + 6) % 7));
// A booking's colour in the week: its status's urgency, the same as its badge.
const EDGE: Record<DriveStatus, string> = { requested: "border-l-warn", confirmed: "border-l-info", completed: "border-l-ok", "no-show": "border-l-bad", cancelled: "border-l-hairline opacity-60" };
const VIEWS = ["today", "week", "list"] as const;
type View = (typeof VIEWS)[number];
type Params = { view?: string; day?: string; mine?: string; q?: string; status?: string; with?: string; when?: string; car?: string; sort?: string; dir?: string; page?: string; per?: string };

// The diary. Today: the day's bookings in order, and the requests still to confirm. Week: a calendar of seven days (on a phone, a strip of
// days and the one chosen). List: every booking in a table, searched and filtered. "Only mine" keeps the bookings given to whoever is
// looking. A booking opens on its own page, where it is moved or given to someone.
export default async function Page({ searchParams }: { searchParams: Promise<Params> }) {
  const sp = await searchParams;
  const view: View = (VIEWS as readonly string[]).includes(sp.view ?? "") ? (sp.view as View) : "today";
  const mine = sp.mine === "1";
  const [all, cars, me, { team }] = await Promise.all([drivesStore.list(), adminCars(), currentMember(), getSettings()]);
  const gone = new Set(cars.filter((c) => !forSale(c)).map((c) => c.slug)); // a booking still open on a car no longer for sale needs a call
  const drives = mine ? all.filter((d) => d.assignedTo === me.name) : all;
  const today = dublinDay();
  const day = sp.day && isIsoDay(sp.day) ? sp.day : today;
  const link = (over: Partial<Params>) => {
    const q = new URLSearchParams(Object.entries({ view: view === "today" ? undefined : view, mine: mine ? "1" : undefined, day: sp.day && isIsoDay(sp.day) ? sp.day : undefined, ...over }).filter((e): e is [string, string] => Boolean(e[1])));
    return `/dashboard/test-drives${q.size ? `?${q}` : ""}`;
  };
  const onDay = (iso: string) => drives.filter((d) => dublinDay(d.startsAt) === iso).sort((a, b) => a.startsAt - b.startsAt);
  const waiting = waitingDrives(drives);
  const later = waiting.filter((d) => dublinDay(d.startsAt) !== today);
  // The next six days' confirmed bookings, by day: the diary ahead. Requests are under Still to confirm, so none shows twice.
  const ahead = Array.from({ length: 6 }, (_, i) => addDays(today, i + 1))
    .map((iso) => [iso, onDay(iso).filter((d) => d.status === "confirmed")] as const)
    .filter(([, list]) => list.length > 0);

  return (
    <>
      <PageHeader
        title="Test drives"
        text="Bookings from the site and the ones you add. Confirm a request to lock in the time."
        actions={
          <Link href="/dashboard/test-drives/new" className={adminButton}>
            <PlusIcon className="size-4" />
            Book a test drive
          </Link>
        }
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmented
          label="View"
          items={[
            { label: "Today", href: link({ view: undefined, day: undefined, q: undefined }), active: view === "today" },
            { label: "Week", href: link({ view: "week" }), active: view === "week" },
            { label: "List", href: link({ view: "list", day: undefined }), active: view === "list" },
          ]}
        />
        <Link href={link({ mine: mine ? undefined : "1", page: undefined })} aria-current={mine ? "true" : undefined} className={choicePill(mine)}>
          {mine && <CheckIcon className="size-4" />}
          Only mine
        </Link>
      </div>

      {view === "today" && (
        <>
          <Panel title={`Today, ${fmtDay(today)}`} count={onDay(today).length}>
            <Agenda drives={onDay(today)} gone={gone} empty={driveTimes(today).length ? "Nothing booked today." : "We're closed today."} />
          </Panel>
          {/* Today's are listed above with their buttons; this is the rest, so no booking shows twice. */}
          {later.length > 0 && (
            <Panel title="Still to confirm" count={later.length}>
              <Agenda drives={later.slice(0, 8)} gone={gone} withDay />
              {later.length > 8 && <Link href={link({ view: "list", status: "requested", when: "ahead", day: undefined })} className="w-fit text-meta font-medium underline">See all {later.length}</Link>}
            </Panel>
          )}
          <Panel title="Next few days" action={<Link href={link({ view: "week" })} className="text-meta font-medium underline">See the week</Link>}>
            {ahead.length === 0 ? (
              <p className="text-body text-text-2">Nothing confirmed for the next six days.</p>
            ) : (
              ahead.map(([iso, list]) => (
                <section key={iso} aria-label={fmtDay(iso)} className="flex flex-col gap-1">
                  <h3 className="text-meta font-semibold text-text-2">{fmtDay(iso)}</h3>
                  <Agenda drives={list} gone={gone} />
                </section>
              ))
            )}
          </Panel>
        </>
      )}

      {view === "week" && <Week day={day} today={today} onDay={onDay} gone={gone} link={link} />}

      {view === "list" && <List drives={drives} sp={sp} team={team.map((t) => t.name)} gone={gone} />}
    </>
  );
}

// A day's bookings in time order. Each opens its booking; the next steps (confirm, done, no show, cancel) are on the row, with Undo.
function Agenda({ drives, gone, empty = "Nothing booked.", withDay = false }: { drives: TestDrive[]; gone: Set<string>; empty?: string; withDay?: boolean }) {
  if (drives.length === 0) return <p className="text-body text-text-2">{empty}</p>;
  return (
    <ul className="-mx-5 flex flex-col">
      {drives.map((d) => (
        <li key={d.id} className="relative grid grid-cols-[3.5rem_minmax(0,1fr)] items-center gap-x-4 gap-y-2 px-5 py-3 even:bg-row-alt hover:bg-surface md:grid-cols-[3.5rem_minmax(0,1fr)_auto]">
          <span className="self-start font-medium tabular-nums md:self-center">
            {fmtTime(d.startsAt)}
            {withDay && <span className="block text-meta font-normal text-text-2">{fmtDay(dublinDay(d.startsAt), "weekday")} {fmtDay(dublinDay(d.startsAt), "day")}</span>}
          </span>
          <span className="flex min-w-0 flex-col">
            <span className="flex flex-wrap items-center gap-2">
              <Link href={`/dashboard/test-drives/${d.id}`} data-name className="font-medium after:absolute after:inset-0">
                {d.name}
              </Link>
              <DriveStatusBadge status={d.status} />
              {isOpenDrive(d) && gone.has(d.carSlug) && <Badge tone="warn">No longer for sale</Badge>}
            </span>
            <span className="text-meta text-text-2">
              {d.carTitle} · {d.assignedTo ?? "Nobody yet"}
            </span>
          </span>
          {/* Call them, then the next step, one press each. */}
          <span className="relative z-10 col-span-2 flex flex-wrap gap-2 md:col-span-1 md:col-start-3 md:justify-end">
            {isOpenDrive(d) && telHref(d.phone) && (
              <a href={telHref(d.phone) ?? undefined} className={rowButton}>
                <PhoneIcon className="size-4" />
                Call
              </a>
            )}
            <DriveSteps drive={d} ahead={dublinDay(d.startsAt) > dublinDay()} />
          </span>
        </li>
      ))}
    </ul>
  );
}

// Seven days from Monday. From 1024px a column a day; on a phone a strip of the seven days, each with its count, and the chosen day below.
function Week({ day, today, onDay, gone, link }: { day: string; today: string; onDay: (iso: string) => TestDrive[]; gone: Set<string>; link: (over: Partial<Params>) => string }) {
  const monday = mondayOf(day);
  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  const sunday = days[6];
  const range = monday.slice(5, 7) === sunday.slice(5, 7) ? `${fmtDay(monday, "day")} to ${fmtDay(sunday, "dayMonth")}` : `${fmtDay(monday, "dayMonth")} to ${fmtDay(sunday, "dayMonth")}`;
  const arrow = "inline-flex size-11 items-center justify-center rounded-control border border-hairline bg-card hover:border-control";
  return (
    <>
      <div className="flex items-center gap-2">
        <Link href={link({ day: addDays(monday, -7) })} aria-label="Week before" className={arrow}>
          <ChevronLeftIcon className="size-4" />
        </Link>
        <Link href={link({ day: addDays(monday, 7) })} aria-label="Week after" className={arrow}>
          <ChevronRightIcon className="size-4" />
        </Link>
        <h2 className="ml-2 text-heading font-semibold">{range}</h2>
        {mondayOf(today) !== monday && (
          <Link href={link({ day: undefined })} className="ml-auto text-meta font-medium underline">
            This week
          </Link>
        )}
      </div>

      {/* A phone: the days as a strip, then the chosen one. */}
      <div className="flex flex-col gap-4 lg:hidden">
        <nav aria-label="Day" className="grid grid-cols-7 gap-1.5">
          {days.map((d) => {
            const n = onDay(d).filter((x) => x.status !== "cancelled").length;
            const on = d === day;
            return (
              <Link key={d} href={link({ day: d })} aria-current={on ? "date" : undefined} className={`flex min-h-16 flex-col items-center justify-center rounded-control border text-meta ${on ? "border-accent bg-accent text-on-accent" : `border-hairline bg-card ${d === today ? "text-accent-text" : ""}`}`}>
                <span>{fmtDay(d, "weekday")}</span>
                <span className="text-body font-semibold tabular-nums">{fmtDay(d, "day")}</span>
                <span className={`text-[0.6875rem] tabular-nums ${on ? "" : "text-text-2"}`}>{n || ""}</span>
              </Link>
            );
          })}
        </nav>
        <Panel title={fmtDay(day)}>
          <Agenda drives={onDay(day)} gone={gone} empty={driveTimes(day).length ? "Nothing booked." : "Closed."} />
        </Panel>
      </div>

      {/* From 1024px: a column a day. */}
      <div className="hidden grid-cols-7 gap-2 lg:grid">
        {days.map((d) => {
          const list = onDay(d);
          return (
            <section key={d} aria-label={fmtDay(d)} className={`${card} flex min-h-48 min-w-0 flex-col gap-1.5 p-2 ${d === today ? "ring-2 ring-inset ring-accent" : ""}`}>
              <h3 className={`flex items-baseline gap-1.5 px-1 pb-1 text-meta ${d === today ? "font-semibold text-accent-text" : "text-text-2"}`}>
                {fmtDay(d, "weekday")}
                <span className="text-body font-semibold tabular-nums text-text">{fmtDay(d, "day")}</span>
              </h3>
              {list.length === 0 && <p className="px-1 text-meta text-text-2">{driveTimes(d).length ? "" : "Closed"}</p>}
              {list.map((x) => (
                <Link key={x.id} href={`/dashboard/test-drives/${x.id}`} className={`flex min-w-0 flex-col rounded-control border-l-4 bg-surface px-2 py-1.5 text-meta hover:bg-row-alt ${EDGE[x.status]}`}>
                  <span className="font-semibold tabular-nums">{fmtTime(x.startsAt)}</span>
                  <span className={`truncate font-medium ${x.status === "cancelled" ? "line-through" : ""}`}>{x.name}</span>
                  <span title={x.carTitle} className="truncate text-text-2">{x.carTitle}</span>
                  {isOpenDrive(x) && gone.has(x.carSlug) && <span className="text-warn">No longer for sale</span>}
                </Link>
              ))}
            </section>
          );
        })}
      </div>
      <p className="hidden flex-wrap gap-x-4 gap-y-1 text-meta text-text-2 lg:flex">
        {DRIVE_STATUSES.map((s) => (
          <span key={s} className="inline-flex items-center gap-1.5">
            <span aria-hidden className={`h-3 w-1 rounded-full border-l-4 ${EDGE[s]}`} />
            {DRIVE_STATUS_LABELS[s]}
          </span>
        ))}
      </p>
    </>
  );
}

// Every booking as a table: searched by name, phone or car; filtered by status, who has it and whether it has happened; sorted; in pages.
function List({ drives, sp, team, gone }: { drives: TestDrive[]; sp: Params; team: string[]; gone: Set<string> }) {
  const rows = filterDrives(drives, sp, undefined, gone);
  const columns: Column<TestDrive>[] = [
    { key: "when", header: "When", sort: (d) => d.startsAt, nowrap: true, cell: (d) => <span className="tabular-nums">{fmtDate(d.startsAt)}, {fmtTime(d.startsAt)}</span> },
    {
      key: "who",
      header: "Customer",
      sort: (d) => d.name,
      cell: (d) => (
        <span className="flex min-w-0 flex-col">
          <Link href={`/dashboard/test-drives/${d.id}`} className="font-medium after:absolute after:inset-0">
            {d.name}
          </Link>
          <span className="text-meta text-text-2 md:hidden">{d.carTitle}</span>
        </span>
      ),
    },
    { key: "car", header: "Car", sort: (d) => d.carTitle, cell: (d) => <span className="line-clamp-2 max-w-[16rem]">{d.carTitle}</span>, hide: "md" },
    { key: "with", header: "Taking them out", sort: (d) => d.assignedTo, cell: (d) => d.assignedTo ?? <span className="text-text-2">Nobody yet</span>, hide: "lg" },
    { key: "status", header: "Status", sort: (d) => DRIVE_STATUSES.indexOf(d.status), nowrap: true, cell: (d) => <DriveStatusBadge status={d.status} /> },
  ];
  const { rows: sorted, sort } = sortRows(rows, columns, sp, { key: "when", dir: "desc" });
  const paged = pageOf(sorted, sp);
  const filters: FilterGroup[] = [
    { name: "when", label: "When", any: "Any time", options: [["ahead", "Coming up"], ["past", "Past"]] },
    { name: "status", label: "Status", any: "Any status", options: DRIVE_STATUSES.map((s) => [s, DRIVE_STATUS_LABELS[s]] as const) },
    { name: "with", label: "Taking them out", any: "Anyone", options: [["none", "Nobody yet"], ...team.map((t) => [t, t] as const)] },
    { name: "car", label: "Car", any: "Any car", options: [["gone", "No longer for sale"]] },
  ];
  return (
    <>
      <TableToolbar search={{ placeholder: "Search", label: "Search test drives" }} filters={filters} />
      <DataTable label="Test drives" linkRows rows={paged.rows} rowKey={(d) => d.id} columns={columns} sort={sort} empty={<EmptyState title="No bookings match" text="Try another filter or search." />} />
      <TableFooter page={paged.page} pageCount={paged.pageCount} total={paged.total} per={paged.per} />
    </>
  );
}
