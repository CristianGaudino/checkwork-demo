import Link from "next/link";
import { notFound } from "next/navigation";
import { ClaimStatusBadge, CoverBadge, DriveStatusBadge, LeadStatusBadge, OrderBadge } from "@/components/admin/badges";
import { Badge, PageHeader, Panel, Task, TaskList, rowButton } from "@/components/admin/kit";
import { CalendarIcon, CarIcon, InboxIcon, ReceiptIcon, WrenchIcon } from "@/components/stock/icons";
import { LEAD_TYPE_LABELS, claimOpen, claimsStore, coverEnds, customersStore, drivesStore, leadsStore, orderOpen, ordersStore, reservationsStore, salesStore } from "@/lib/admin/collections";
import { monthLabel } from "@/lib/admin/reports";
import { dublinDay, fmtDate, fmtEur, fmtTime } from "@/lib/admin/format";
import { isOpenDrive } from "@/lib/admin/drives";
import { isOpenLead, openWarrantyRequests } from "@/lib/admin/leads";
import { matchesAny, parsePersonQuery, type PersonQuery } from "@/lib/admin/person-match";
import { hasModule } from "@/lib/modules";
import { ContactButtons } from "@/components/admin/ContactButtons";
import { stockSource } from "@/lib/stock-source";

export const metadata = { title: "Customer" };

// One customer. At the top: how to reach them and what is still open for them (a deposit held, a claim, a car on order, a lead, a test
// drive), each a link to it. Below: what they bought (with the warranty on each), and their history. Aftersales starts here: a claim is
// opened on one of their purchases.
const list = "flex flex-col divide-y divide-hairline";
const item = "flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-3";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const c = await customersStore.get(id);
  if (!c) notFound();
  // Claims, orders and test drives are modules of their own: with one off, its records stay but its links go (#173).
  const [service, newCars, drivesOn] = await Promise.all([hasModule("service"), hasModule("newCars"), hasModule("testDrives")]);
  // Orders and deposits are our version only: with DoneDeal stock their pages are not there.
  const synced = (await stockSource()) === "donedeal";
  const ordersOn = newCars && !synced;
  const [sales, reservations, claims, leads, drives, orders] = await Promise.all([salesStore.list(), reservationsStore.list(), claimsStore.list(), leadsStore.list(), drivesStore.list(), ordersStore.list()]);
  const today = dublinDay();
  const day = (d: string) => fmtDate(`${d}T12:00:00Z`);
  const qs = [c.email, c.phone].map((v) => (v ? parsePersonQuery(v) : null)).filter((q): q is PersonQuery => q !== null);
  const bought = sales.filter((s) => s.customerId === id).sort((a, b) => b.soldOn.localeCompare(a.soldOn));
  const deposits = reservations.filter((r) => r.customerId === id).sort((a, b) => b.paidOn.localeCompare(a.paidOn));
  const theirOrders = orders.filter((o) => o.customerId === id).sort((a, b) => b.createdAt - a.createdAt);
  const theirClaims = claims.filter((k) => k.customerId === id).sort((a, b) => b.createdAt - a.createdAt);
  const theirLeads = qs.length ? leads.filter((l) => matchesAny(l, qs)).sort((a, b) => b.createdAt - a.createdAt) : [];
  const theirDrives = qs.length ? drives.filter((d) => matchesAny(d, qs)).sort((a, b) => b.startsAt - a.startsAt) : [];
  const none = (what: string) => <p className="text-body text-text-2">{what}</p>;
  const leadHref = (l: { id: string; type: string }) => (l.type === "warranty" && service ? `/dashboard/aftersales/requests/${l.id}` : `/dashboard/leads/${l.id}`);

  // What is still open for them, as tasks to open. Soonest needs first: a drive coming up, a lead to answer, then the longer-running ones.
  const openDrives = drivesOn ? theirDrives.filter((d) => isOpenDrive(d) && dublinDay(d.startsAt) >= today).reverse() : [];
  // A warranty request that became a claim is done, as on Aftersales: the claim is what is open.
  const openRequests = new Set(openWarrantyRequests(theirLeads, claims).map((l) => l.id));
  const openLeads = theirLeads.filter((l) => (l.type === "warranty" ? service && openRequests.has(l.id) : isOpenLead(l)));
  const openClaims = service ? theirClaims.filter((k) => claimOpen(k.status)) : [];
  const openOrders = ordersOn ? theirOrders.filter((o) => orderOpen(o.status)) : [];
  const held = synced ? [] : deposits.filter((r) => r.status === "held");
  const openCount = openDrives.length + openLeads.length + openClaims.length + openOrders.length + held.length;

  return (
    <>
      <PageHeader title={c.name} text={`Customer since ${fmtDate(c.createdAt)} · ${c.source}`} back={{ href: "/dashboard/customers", label: "Customers" }} />
      <Panel>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[20rem_minmax(0,1fr)]">
          <section aria-labelledby="reach" className="flex min-w-0 flex-col gap-3">
            <h2 id="reach" className="text-meta font-medium text-text-2">Contact</h2>
            <p className="flex flex-col text-body">
              {c.email && <span className="break-all">{c.email}</span>}
              {c.phone && <span>{c.phone}</span>}
            </p>
            <ContactButtons phone={c.phone || undefined} email={c.email || undefined} />
            <p className="text-meta text-text-2">{c.marketingConsent ? "Agreed to marketing" : "No marketing: do not send offers"}</p>
          </section>
          <section aria-labelledby="open" className="flex min-w-0 flex-col gap-2 lg:border-l lg:border-hairline lg:pl-6">
            <h2 id="open" className="text-meta font-medium text-text-2">
              Open for them <span className="tabular-nums">{openCount}</span>
            </h2>
            {openCount === 0 ? (
              none("Nothing open. Everything they started is finished.")
            ) : (
              <TaskList label="Open for them">
                {openDrives.map((d) => (
                  <Task key={d.id} href={`/dashboard/test-drives/${d.id}`} urgency={dublinDay(d.startsAt) === today ? "now" : "soon"} icon={<CalendarIcon />} title={`Test drive, ${d.carTitle}`} detail={`${fmtDate(d.startsAt)}, ${fmtTime(d.startsAt)}`} action={<DriveStatusBadge status={d.status} />} />
                ))}
                {openLeads.map((l) => (
                  <Task key={l.id} href={leadHref(l)} urgency={l.status === "new" ? "now" : "soon"} icon={<InboxIcon />} title={`${LEAD_TYPE_LABELS[l.type]}${l.carTitle ? `, ${l.carTitle}` : ""}`} detail={`Came in ${fmtDate(l.createdAt)}`} action={<LeadStatusBadge status={l.status} type={l.type} />} />
                ))}
                {openClaims.map((k) => (
                  <Task key={k.id} href={`/dashboard/aftersales/${k.id}`} icon={<WrenchIcon />} title={`Warranty claim, ${k.carTitle}`} detail={<span className="line-clamp-1">{k.fault}</span>} action={<ClaimStatusBadge status={k.status} />} />
                ))}
                {openOrders.map((o) => (
                  <Task key={o.id} href={`/dashboard/orders/${o.id}`} icon={<CarIcon />} title={`On order, ${o.regPeriod} ${o.make} ${o.model}`} detail={`Due ${monthLabel(o.expected)}`} action={<OrderBadge status={o.status} />} />
                ))}
                {held.map((r) => (
                  <Task key={r.id} icon={<ReceiptIcon />} href={`/dashboard/stock/${r.carId}/reserve`} title={`Deposit held, ${r.carTitle}`} detail={`${fmtEur(r.depositEur)}, held until ${day(r.until)}`} />
                ))}
              </TaskList>
            )}
          </section>
        </div>
      </Panel>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-6">
          <Panel title="Purchases">
            {bought.length === 0
              ? none("Nothing bought yet.")
              : (
                <ul className={list}>
                  {bought.map((s) => (
                    <li key={s.id} className={item}>
                      <span className="flex min-w-0 flex-col">
                        <span className="font-medium">{s.carTitle}</span>
                        <span className="text-meta text-text-2">
                          {fmtEur(s.priceEur)}, {day(s.soldOn)}
                          {s.returnedOn ? `, ${s.kind === "returned" ? "brought back" : "fell through"} ${day(s.returnedOn)}` : `, warranty until ${day(coverEnds(s))}`}
                        </span>
                      </span>
                      {!s.returnedOn && (
                        <span className="flex flex-wrap items-center gap-2">
                          <CoverBadge inCover={coverEnds(s) >= today} />
                          {service && <Link href={`/dashboard/aftersales/new?sale=${s.id}`} className={rowButton}>Open a claim</Link>}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
          </Panel>
          {ordersOn && theirOrders.length > 0 && (
            <Panel title="Factory orders">
              <ul className={list}>
                {theirOrders.map((o) => (
                  <li key={o.id} className={item}>
                    <Link href={`/dashboard/orders/${o.id}`} className="flex min-w-0 flex-col">
                      <span className="font-medium underline-offset-2 hover:underline">{o.regPeriod} {o.make} {o.model}</span>
                      <span className="text-meta text-text-2">Due {monthLabel(o.expected)}</span>
                    </Link>
                    <OrderBadge status={o.status} />
                  </li>
                ))}
              </ul>
            </Panel>
          )}
          {service && theirClaims.length > 0 && (
            <Panel title="Warranty claims">
              <ul className={list}>
                {theirClaims.map((k) => (
                  <li key={k.id} className={item}>
                    {/* The text takes the room left (a long fault is cut short, whole on hover), so the status stays on the right. */}
                    <Link href={`/dashboard/aftersales/${k.id}`} className="flex min-w-0 flex-1 flex-col">
                      <span className="font-medium underline-offset-2 hover:underline">{k.carTitle}</span>
                      <span title={k.fault} className="line-clamp-1 text-meta text-text-2">{day(k.openedOn)}: {k.fault}</span>
                    </Link>
                    <span className="shrink-0"><ClaimStatusBadge status={k.status} /></span>
                  </li>
                ))}
              </ul>
            </Panel>
          )}
          {deposits.length > 0 && (
            <Panel title="Deposits">
              <ul className={list}>
                {deposits.map((r) => (
                  <li key={r.id} className={item}>
                    <span className="flex min-w-0 flex-col">
                      <span className="font-medium">{r.carTitle}</span>
                      <span className="text-meta text-text-2">{fmtEur(r.depositEur)}, paid {day(r.paidOn)}</span>
                    </span>
                    <Badge tone={r.status === "held" ? "info" : "neutral"}>{{ held: "Held", sold: "Part of the sale", refunded: "Refunded", kept: "Kept" }[r.status]}</Badge>
                  </li>
                ))}
              </ul>
            </Panel>
          )}
        </div>
        <div className="flex min-w-0 flex-col gap-6">
          <Panel title="Leads" quiet>
            {theirLeads.length === 0
              ? none("No leads from them yet.")
              : (
                <ul className={list}>
                  {theirLeads.map((l) => (
                    <li key={l.id} className={item}>
                      <Link href={leadHref(l)} className="flex min-w-0 flex-col">
                        <span className="font-medium underline-offset-2 hover:underline">{LEAD_TYPE_LABELS[l.type]}{l.carTitle ? `, ${l.carTitle}` : ""}</span>
                        <span className="text-meta text-text-2">{fmtDate(l.createdAt)}</span>
                      </Link>
                      <LeadStatusBadge status={l.status} type={l.type} />
                    </li>
                  ))}
                </ul>
              )}
          </Panel>
          {theirDrives.length > 0 && (
            <Panel title="Test drives" quiet>
              <ul className={list}>
                {theirDrives.map((d) => (
                  <li key={d.id} className={item}>
                    {drivesOn ? (
                      <Link href={`/dashboard/test-drives/${d.id}`} className="flex min-w-0 flex-col">
                        <span className="font-medium underline-offset-2 hover:underline">{d.carTitle}</span>
                        <span className="text-meta text-text-2">{fmtDate(d.startsAt)}</span>
                      </Link>
                    ) : (
                      <span className="flex min-w-0 flex-col">
                        <span className="font-medium">{d.carTitle}</span>
                        <span className="text-meta text-text-2">{fmtDate(d.startsAt)}</span>
                      </span>
                    )}
                    <DriveStatusBadge status={d.status} />
                  </li>
                ))}
              </ul>
            </Panel>
          )}
        </div>
      </div>
    </>
  );
}
