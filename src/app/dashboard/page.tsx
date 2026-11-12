import Link from "next/link";
import { LeadStatusBadge } from "@/components/admin/badges";
import { Badge, EmptyState, PageHeader, Panel, StatCard, StatGrid, adminButtonQuiet } from "@/components/admin/kit";
import { CalendarIcon, CarIcon, ShareIcon } from "@/components/stock/icons";
import { carCosts } from "@/lib/admin/costs";
import { drivesStore, getSettings, leadsStore, ordersStore, reservationsStore, reviewsStore, salesStore } from "@/lib/admin/collections";
import { marginOf } from "@/lib/admin/margins";
import { can } from "@/lib/permissions";
import { fmtAgo, fmtDateTime, fmtEur, fmtNum } from "@/lib/admin/format";
import { overview } from "@/lib/admin/overview";
import { SyncPanel } from "@/components/admin/SyncPanel";
import { adminCars } from "@/lib/admin/stock-admin";
import { syncStatus } from "@/lib/donedeal/sync";
import { stockSource } from "@/lib/stock-source";
import { forSale, isSold } from "@/lib/stock/types";
import { isSalesLead } from "@/lib/admin/leads";

export const metadata = { title: "Overview" };

const row = "flex min-h-14 items-center justify-between gap-3 px-1 py-3 transition-colors hover:bg-surface";

export default async function Page() {
  const [leads, drives, reviews, all, settings, source, sales, reservations, orders] = await Promise.all([leadsStore.list(), drivesStore.list(), reviewsStore.list(), adminCars(), getSettings(), stockSource(), salesStore.list(), reservationsStore.list(), ordersStore.list()]);
  const synced = source === "donedeal";
  const sync = synced ? await syncStatus() : null;
  const cars = all.filter((c) => !isSold(c));
  // Only for staff with the margins permission: the costs are not read without it.
  const costs = (await can("margins")) ? new Map([...(await carCosts())].map(([id, c]) => [id, c.total])) : null;
  const o = overview({ leads: leads.filter(isSalesLead), drives, reviews, cars: all, costs: costs ? new Set(costs.keys()) : undefined, sales: new Set(sales.map((s) => s.id)), reservations, orders, syncProblem: Boolean(sync?.problem), slaHours: settings.leadSlaHours });
  const margin = costs ? cars.filter((c) => costs.has(c.id)).reduce((s, c) => s + marginOf(c.priceEur, costs.get(c.id)!).eur, 0) : 0;

  return (
    <>
      <PageHeader
        title="Overview"
        actions={
          <>
            {/* Stock from DoneDeal is added there, never here. */}
            {!synced && (
              <Link href="/dashboard/stock/new" className={adminButtonQuiet}>
                <CarIcon className="size-4" />
                Add car
              </Link>
            )}
            <Link href="/dashboard/test-drives" className={adminButtonQuiet}>
              <CalendarIcon className="size-4" />
              Test drive
            </Link>
            <Link href="/dashboard/marketing" className={adminButtonQuiet}>
              <ShareIcon className="size-4" />
              New post
            </Link>
          </>
        }
      />

      <StatGrid>
        <StatCard href="/dashboard/leads?status=new" label="Leads to answer" value={fmtNum(o.newLeads)} />
        <StatCard href="/dashboard/leads" label="Leads this week" value={fmtNum(o.leadsThisWeek)} hint={`${o.leadsChange >= 0 ? "Up" : "Down"} ${Math.abs(o.leadsChange)} on last week`} tone={o.leadsChange >= 0 ? "good" : "bad"} />
        <StatCard href="/dashboard/stock" label="Cars for sale" value={fmtNum(cars.filter(forSale).length)} />
        {costs && <StatCard href="/dashboard/margins" label="Stock margin" value={fmtEur(margin)} />}
        <StatCard href="/dashboard/reviews" label="Review rating" value={o.reviewCount ? o.averageRating.toFixed(1) : "None"} hint={`${o.reviewCount} reviews`} />
      </StatGrid>

      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Panel title="Latest leads" action={<Link href="/dashboard/leads" className="inline-flex min-h-11 items-center text-meta font-medium text-accent-text underline">All leads</Link>}>
          {o.recentLeads.length === 0 ? (
            <EmptyState title="No leads yet" />
          ) : (
            <ul className="-mx-1 flex flex-col divide-y divide-hairline">
              {o.recentLeads.map((l) => (
                <li key={l.id}>
                  <Link href={`/dashboard/leads/${l.id}`} className={row}>
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate font-medium">{l.name}</span>
                      <span className="truncate text-meta text-text-2">{l.carTitle ?? l.message} · {fmtAgo(l.createdAt)}</span>
                    </span>
                    <LeadStatusBadge status={l.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <div className="flex min-w-0 flex-col gap-6">
          {sync && <SyncPanel status={sync} canForce={await can("settings")} />}
          <Panel title="Needs attention">
            {o.attention.length === 0 ? (
              <EmptyState title="All clear" />
            ) : (
              <ul className="-mx-1 flex flex-col divide-y divide-hairline">
                {o.attention.map((a) => (
                  <li key={a.key}>
                    <Link href={a.href} className={row}>
                      <span>{a.label}</span>
                      <Badge tone={a.urgency === "now" ? "bad" : a.urgency === "soon" ? "warn" : "neutral"} strong={a.urgency === "now"}>
                        {a.count}
                      </Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Test drives this week" action={<Link href="/dashboard/test-drives" className="inline-flex min-h-11 items-center text-meta font-medium text-accent-text underline">All bookings</Link>}>
            {o.upcomingDrives.length === 0 ? (
              <EmptyState title="None booked" />
            ) : (
              <ul className="-mx-1 flex flex-col divide-y divide-hairline">
                {o.upcomingDrives.slice(0, 5).map((d) => (
                  <li key={d.id}>
                    <Link href="/dashboard/test-drives" className={`${row} flex-col !items-start !justify-center gap-0.5`}>
                      <span className="font-medium">{d.name}</span>
                      <span className="text-meta text-text-2">{d.carTitle} · {fmtDateTime(d.startsAt)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>
    </>
  );
}
