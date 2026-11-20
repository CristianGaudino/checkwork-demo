import Link from "next/link";
import { LeadStatusBadge } from "@/components/admin/badges";
import { ActButton } from "@/components/admin/ActButton";
import { ActionTile, ActionTiles, Avatar, Columns, EmptyState, PageHeader, Panel, PanelLink, StatCard, StatGrid, Task, TaskList, adminButtonQuiet, rowButton, type TaskUrgency } from "@/components/admin/kit";
import { AlertIcon, CalendarIcon, CarIcon, CheckIcon, ExternalIcon, InboxIcon, PercentIcon, PhoneIcon, ReceiptIcon, ShareIcon, StarIcon, SyncIcon, TruckIcon } from "@/components/stock/icons";
import { carCosts } from "@/lib/admin/costs";
import { drivesStore, getSettings, leadsStore, ordersStore, reservationsStore, reviewsStore, salesStore, type Lead } from "@/lib/admin/collections";
import { marginOf } from "@/lib/admin/margins";
import { can } from "@/lib/permissions";
import { dublinDay, fmtAgo, fmtDateTime, fmtDay, fmtEur, fmtNum, fmtTime, plural } from "@/lib/admin/format";
import { OLD_STOCK_DAYS, overview } from "@/lib/admin/overview";
import { SyncPanel } from "@/components/admin/SyncPanel";
import { adminCars } from "@/lib/admin/stock-admin";
import { syncStatus } from "@/lib/donedeal/sync";
import { stockSource } from "@/lib/stock-source";
import { DONEDEAL_DEALER_URL, LISTING_SITE } from "@/lib/stock-source-rules";
import { forSale, isSold, onRequest } from "@/lib/stock/types";
import { isSalesLead } from "@/lib/admin/leads";
import { enabledModules } from "@/lib/modules";
import type { ModuleId } from "@/lib/modules-rules";
import { telHref } from "@/lib/phone";
import { setDriveStatusAction } from "@/app/dashboard/test-drives/actions";
import { DRIVE_STATUS_LABELS } from "@/lib/admin/drives";

// The layout's "%s | Dealer dashboard" template reaches only the pages under it, not this one beside it.
export const metadata = { title: { absolute: "Overview | Dealer dashboard" } };

// How many of one kind of to-do are listed one by one; the rest are one row that opens the whole list.
const EACH = 3;
const MODULE_OF: Record<string, ModuleId> = { drives: "testDrives", "sold-drives": "testDrives", reviews: "reviews", deposits: "sales", orders: "newCars", costs: "margins" };
// The to-dos that stay one row each: what they count (`noun`), the button's word and the icon.
const GROUPED: Record<string, { noun: string; verb: string; icon: React.ReactNode }> = {
  reviews: { noun: "review", verb: "Reply", icon: <StarIcon /> },
  sync: { noun: "problem", verb: "Check", icon: <SyncIcon /> },
  "sold-drives": { noun: "booking", verb: "See them", icon: <CalendarIcon /> },
  deposits: { noun: "reservation", verb: "See them", icon: <ReceiptIcon /> },
  orders: { noun: "car", verb: "See them", icon: <TruckIcon /> },
  "taken-down": { noun: "car", verb: "Check", icon: <CarIcon /> },
  old: { noun: "car", verb: "See them", icon: <CarIcon /> },
  costs: { noun: "car", verb: "Add costs", icon: <PercentIcon /> },
};

// A lead in a line: the car, else the first line of the message.
const about = (l: Lead) => l.carTitle ?? (l.message.trim().split("\n")[0] || undefined);
function CallButton({ phone, name }: { phone: string; name: string }) {
  const tel = phone ? telHref(phone) : undefined;
  return tel ? (
    <a href={tel} aria-label={`Call ${name}`} className={rowButton}>
      <PhoneIcon className="size-4" />
      Call
    </a>
  ) : null;
}
const ReplyButton = ({ id, name }: { id: string; name: string }) => (
  <Link href={`/dashboard/leads/${id}`} aria-label={`Reply to ${name}`} className={rowButton}>
    Reply
  </Link>
);
const ConfirmDrive = ({ id, name, status }: { id: string; name: string; status: string }) => (
  <ActButton act={setDriveStatusAction.bind(null, id, "confirmed")} undo={setDriveStatusAction.bind(null, id, status)} done={`${name}: ${DRIVE_STATUS_LABELS.confirmed}`} label={`Confirm ${name}'s test drive`} className={rowButton}>
    <CheckIcon className="size-4" />
    Confirm
  </ActButton>
);
const row = "relative flex min-h-16 items-center gap-3 px-1 py-3 transition-colors has-[>a:hover]:bg-surface";

// Where the day starts: the main jobs as big buttons, then what needs doing (each with the button that does it), today's test drives and
// the newest leads with Call and Reply in the row, and a few numbers last. No chart (docs/dashboard-polish.md #72): Analytics has them.
export default async function Page() {
  const [leads, drives, reviews, all, settings, source, sales, reservations, orders, mods] = await Promise.all([leadsStore.list(), drivesStore.list(), reviewsStore.list(), adminCars(), getSettings(), stockSource(), salesStore.list(), reservationsStore.list(), ordersStore.list(), enabledModules()]);
  const synced = source === "donedeal";
  const sync = synced ? await syncStatus() : null;
  const cars = all.filter((c) => !isSold(c));
  // Only for staff with the margins permission: the costs are not read without it.
  const costs = (await can("margins")) ? new Map([...(await carCosts())].map(([id, c]) => [id, c.total])) : null;
  const o = overview({ leads: leads.filter(isSalesLead), drives, reviews, cars: all, costs: costs ? new Set(costs.keys()) : undefined, sales: new Set(sales.map((s) => s.id)), reservations, orders, syncProblem: Boolean(sync?.problem), slaHours: settings.leadSlaHours });
  // What a module that is off would show goes with it (#173): its buttons, figures and to-dos.
  const attention = o.attention.filter((a) => !MODULE_OF[a.key] || mods.has(MODULE_OF[a.key]));
  const margin = costs ? cars.filter((c) => costs.has(c.id) && !onRequest(c)).reduce((s, c) => s + marginOf(c.priceEur, costs.get(c.id)!).eur, 0) : 0;
  const drivesOn = mods.has("testDrives");
  const today = dublinDay();
  const toDo = attention.reduce((n, a) => n + a.count, 0);
  const thisWeek = o.weeks[o.weeks.length - 1];

  // One kind of to-do as rows: the first few records each with their own buttons, then one row for the rest.
  const rest = (key: string, n: number, one: string, many: string, href: string, urgency: TaskUrgency) =>
    n > EACH ? [<Task key={`${key}-more`} title={`${n - EACH} more ${n - EACH === 1 ? one : many}`} urgency={urgency} action={<Link href={href} className={rowButton}>See all</Link>} />] : [];
  const tasks = attention.flatMap((a) => {
    switch (a.key) {
      case "slow":
        return [
          ...o.late.slice(0, EACH).map((l) => (
            <Task key={`slow-${l.id}`} urgency="now" icon={<InboxIcon />} title={`Reply to ${l.name}`} detail={[about(l), `waiting since ${fmtAgo(l.createdAt)}`].filter(Boolean).join(" · ")} action={<><CallButton phone={l.phone} name={l.name} /><ReplyButton id={l.id} name={l.name} /></>} />
          )),
          ...rest(a.key, o.late.length, "lead past your reply target", "leads past your reply target", a.href, "now"),
        ];
      case "follow":
        return [
          ...o.due.slice(0, EACH).map((l) => {
            const late = l.followUpOn! < today;
            return (
              <Task key={`follow-${l.id}`} urgency={late ? "now" : "soon"} icon={<PhoneIcon />} title={`Follow up with ${l.name}`} detail={[late ? `Was due ${fmtDay(l.followUpOn!, "dayMonth")}` : "Due today", about(l)].filter(Boolean).join(" · ")} action={<><CallButton phone={l.phone} name={l.name} /><Link href={`/dashboard/leads/${l.id}`} aria-label={`Open ${l.name}'s lead`} className={rowButton}>Open</Link></>} />
            );
          }),
          ...rest(a.key, o.due.length, "follow-up due", "follow-ups due", a.href, a.urgency),
        ];
      case "drives":
        return [
          ...o.toConfirm.slice(0, EACH).map((d) => (
            <Task key={`drive-${d.id}`} urgency="soon" icon={<CalendarIcon />} title={`Confirm ${d.name}'s test drive`} detail={`${d.carTitle} · ${fmtDateTime(d.startsAt)}`} href={`/dashboard/test-drives/${d.id}`} action={<ConfirmDrive id={d.id} name={d.name} status={d.status} />} />
          )),
          ...rest(a.key, o.toConfirm.length, "test drive to confirm", "test drives to confirm", a.href, "soon"),
        ];
      case "sales":
        return [
          ...o.unrecorded.slice(0, EACH).map((c) => (
            <Task key={`sale-${c.id}`} urgency="soon" icon={<ReceiptIcon />} title={`Record the sale of the ${c.year} ${c.make} ${c.model}`} detail={`Sold ${fmtDay(c.soldAt!, "dayMonth")}, no buyer or price yet`} action={<Link href={`/dashboard/stock/${c.id}/sale`} className={rowButton}>Record sale</Link>} />
          )),
          ...rest(a.key, o.unrecorded.length, "sold car with no sale recorded", "sold cars with no sale recorded", a.href, "soon"),
        ];
      default: {
        const g = GROUPED[a.key];
        return [<Task key={a.key} urgency={a.urgency} icon={g?.icon ?? <AlertIcon />} title={a.label} detail={a.key === "sync" ? undefined : plural(a.count, g?.noun ?? "item")} action={<Link href={a.href} aria-label={`${g?.verb ?? "Open"}: ${a.label}`} className={rowButton}>{g?.verb ?? "Open"}</Link>} />];
      }
    }
  });

  return (
    <>
      <PageHeader title="Overview" text={`${fmtDay(today)}. ${toDo ? `${plural(toDo, "thing")} to do.` : "Nothing waiting on you."}`} />

      <ActionTiles>
        {/* Stock from DoneDeal is added there, never here. */}
        {synced ? (
          <ActionTile external primary href={DONEDEAL_DEALER_URL} icon={<ExternalIcon />} label={`Open ${LISTING_SITE}`} text="Add or change a car" />
        ) : (
          <ActionTile primary href="/dashboard/stock/new" icon={<CarIcon />} label="Add a car" text="Photos, price and details" />
        )}
        {drivesOn && <ActionTile href="/dashboard/test-drives/new" icon={<CalendarIcon />} label="Book a test drive" text="Pick a car and a time" />}
        {mods.has("social") && <ActionTile href="/dashboard/marketing/new" icon={<ShareIcon />} label="New post" text="Facebook and Instagram" />}
        <ActionTile href="/dashboard/leads?status=new" icon={<InboxIcon />} label="Reply to leads" text={o.newLeads ? `${plural(o.newLeads, "new lead")} waiting` : "No new leads"} />
      </ActionTiles>

      <Columns
        aside={
          <>
            {sync && <SyncPanel status={sync} canForce={await can("settings")} />}
            {drivesOn && (
              <Panel title="Test drives today" count={o.todayDrives.length || undefined} action={<PanelLink href="/dashboard/test-drives">All test drives</PanelLink>}>
                {o.todayDrives.length === 0 ? (
                  <EmptyState
                    compact
                    title="None today"
                    text={o.upcomingDrives[0] ? `Next: ${o.upcomingDrives[0].name}, ${fmtDateTime(o.upcomingDrives[0].startsAt)}.` : "Nothing booked this week."}
                    action={<Link href="/dashboard/test-drives/new" className={adminButtonQuiet}>Book a test drive</Link>}
                  />
                ) : (
                  <ul className="-mx-1 flex flex-col divide-y divide-hairline">
                    {o.todayDrives.map((d) => (
                      <li key={d.id} className={row}>
                        <span className="w-12 shrink-0 font-display font-semibold tabular-nums">{fmtTime(d.startsAt)}</span>
                        <span className="flex min-w-0 flex-1 flex-col">
                          <span className="truncate font-medium">{d.name}</span>
                          <span className="truncate text-meta text-text-2">{d.carTitle}</span>
                        </span>
                        <Link href={`/dashboard/test-drives/${d.id}`} aria-label={`${d.name}, ${fmtTime(d.startsAt)}`} className="absolute inset-0" />
                        <span className="relative z-10 flex shrink-0 gap-2">{d.status === "requested" ? <ConfirmDrive id={d.id} name={d.name} status={d.status} /> : <CallButton phone={d.phone} name={d.name} />}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </Panel>
            )}
            <Panel plain title="Your numbers">
              <StatGrid>
                <StatCard href="/dashboard/leads" label="Leads this week" value={fmtNum(thisWeek)} hint={`${fmtNum(o.usualWeek)} in a usual week`} tone={thisWeek > o.usualWeek ? "good" : undefined} />
                <StatCard href="/dashboard/stock" label="Cars for sale" value={fmtNum(cars.filter(forSale).length)} hint={o.oldStock ? `${o.oldStock} for sale ${OLD_STOCK_DAYS} days or more` : undefined} tone={o.oldStock ? "warn" : undefined} />
                {costs && <StatCard href="/dashboard/margins" label="Expected margin" value={fmtEur(margin)} />}
                {mods.has("reviews") && <StatCard href="/dashboard/reviews" label="Review rating" value={o.reviewCount ? o.averageRating.toFixed(1) : "None"} hint={plural(o.reviewCount, "review")} />}
              </StatGrid>
            </Panel>
          </>
        }
      >
        <Panel title="To do" count={toDo || undefined} text={toDo ? "The most urgent first. Each button does the job." : undefined}>
          {tasks.length === 0 ? <EmptyState compact icon={<CheckIcon />} title="All done" text="Nothing is waiting on you. New leads and bookings show here as they come in." /> : <TaskList label="To do">{tasks}</TaskList>}
        </Panel>

        <Panel title="Newest leads" action={<PanelLink href="/dashboard/leads">All leads</PanelLink>}>
          {o.recentLeads.length === 0 ? (
            <EmptyState compact icon={<InboxIcon />} title="No leads yet" text="When someone asks about a car on your site, they show here." />
          ) : (
            <ul className="-mx-1 flex flex-col divide-y divide-hairline">
              {o.recentLeads.map((l) => (
                <li key={l.id} className={row}>
                  <Avatar name={l.name} className="max-sm:hidden" />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="truncate font-medium">{l.name}</span>
                      <span className="max-sm:hidden">
                        <LeadStatusBadge status={l.status} type={l.type} />
                      </span>
                    </span>
                    <span className="flex min-w-0 gap-1 text-meta text-text-2">
                      {about(l) && <span className="truncate">{about(l)}</span>}
                      <span className="shrink-0">
                        {about(l) && "· "}
                        {fmtAgo(l.createdAt)}
                      </span>
                    </span>
                  </span>
                  <Link href={`/dashboard/leads/${l.id}`} aria-label={l.name} className="absolute inset-0" />
                  <span className="relative z-10 flex shrink-0 gap-2">
                    <CallButton phone={l.phone} name={l.name} />
                    <ReplyButton id={l.id} name={l.name} />
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </Columns>
    </>
  );
}
