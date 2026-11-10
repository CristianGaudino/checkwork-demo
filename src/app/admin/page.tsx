import Link from "next/link";
import { LeadStatusBadge } from "@/components/admin/badges";
import { DataTable, EmptyState, PageHeader, Panel, StatCard, StatGrid, adminButtonQuiet } from "@/components/admin/kit";
import { drivesStore, leadsStore, reviewsStore } from "@/lib/admin/collections";
import { fmtAgo, fmtDateTime, fmtEur, fmtNum, fmtPct } from "@/lib/admin/format";
import { overview } from "@/lib/admin/overview";
import { SITE_NAME } from "@/lib/site";
import { queryAllOrNull } from "@/lib/stock";

export const metadata = { title: "Overview" };

export default async function Page() {
  const [leads, drives, reviews, stock] = await Promise.all([leadsStore.list(), drivesStore.list(), reviewsStore.list(), queryAllOrNull()]);
  const o = overview({ leads, drives, reviews });
  const cars = stock?.cars ?? [];
  const value = cars.reduce((s, c) => s + c.priceEur, 0);
  const thin = cars.filter((c) => c.photos.length < 4).length;

  return (
    <>
      <PageHeader title="Overview" text={`How ${SITE_NAME} is doing this week.`} actions={<Link href="/admin/stock" className={adminButtonQuiet}>Manage stock</Link>} />

      <StatGrid>
        <StatCard label="Leads this week" value={fmtNum(o.leadsThisWeek)} hint={`${o.leadsChange >= 0 ? "Up" : "Down"} ${Math.abs(o.leadsChange)} on last week`} tone={o.leadsChange >= 0 ? "good" : "bad"} />
        <StatCard label="Waiting for a reply" value={fmtNum(o.newLeads)} hint="Leads marked New" />
        <StatCard label="Win rate" value={fmtPct(o.winRate)} hint="Of leads won or lost" />
        <StatCard label="Review rating" value={o.reviewCount ? o.averageRating.toFixed(1) : "None"} hint={`${o.reviewCount} reviews`} />
      </StatGrid>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Panel title="Latest leads" action={<Link href="/admin/leads" className="text-meta font-semibold underline">All leads</Link>}>
          <DataTable
            bare
            rows={o.recentLeads}
            rowKey={(l) => l.id}
            columns={[
              { key: "who", header: "Who", cell: (l) => <span className="font-semibold">{l.name}</span> },
              { key: "about", header: "About", cell: (l) => l.carTitle ?? <span className="line-clamp-1">{l.message}</span> },
              { key: "status", header: "Status", cell: (l) => <LeadStatusBadge status={l.status} /> },
              { key: "when", header: "When", cell: (l) => fmtAgo(l.createdAt), align: "right" },
            ]}
          />
        </Panel>

        <div className="flex min-w-0 flex-col gap-6">
          <Panel title="Needs attention">
            {o.attention.length === 0 ? (
              <EmptyState title="All clear" text="Nothing is waiting on you." />
            ) : (
              <ul className="flex flex-col divide-y divide-hairline">
                {o.attention.map((a) => (
                  <li key={a.key}>
                    <Link href={a.href} className="flex min-h-11 items-center justify-between gap-3 py-2">
                      <span>{a.label}</span>
                      <span className="font-bold tabular-nums">{a.count}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Test drives this week" action={<Link href="/admin/test-drives" className="text-meta font-semibold underline">All bookings</Link>}>
            {o.upcomingDrives.length === 0 ? (
              <EmptyState title="No test drives booked" />
            ) : (
              <ul className="flex flex-col divide-y divide-hairline">
                {o.upcomingDrives.slice(0, 5).map((d) => (
                  <li key={d.id} className="flex flex-col gap-0.5 py-2">
                    <span className="font-semibold">{d.name}</span>
                    <span className="text-meta text-text-2">{d.carTitle} · {fmtDateTime(d.startsAt)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>

      <Panel title="Stock" action={<Link href="/admin/stock" className="text-meta font-semibold underline">Open stock</Link>}>
        {stock ? (
          <StatGrid>
            <StatCard label="Cars for sale" value={fmtNum(cars.length)} />
            <StatCard label="Stock value" value={fmtEur(value)} />
            <StatCard label="Average price" value={cars.length ? fmtEur(Math.round(value / cars.length)) : "None"} />
            <StatCard label="Need more photos" value={fmtNum(thin)} hint="Fewer than 4 photos" tone={thin ? "bad" : "good"} />
          </StatGrid>
        ) : (
          <EmptyState title="Stock could not be loaded" text="Try again in a moment." />
        )}
      </Panel>
    </>
  );
}
