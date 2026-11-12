import Link from "next/link";
import { notFound } from "next/navigation";
import { ClaimStatusBadge, CoverBadge, DriveStatusBadge, LeadStatusBadge } from "@/components/admin/badges";
import { Badge, PageHeader, Panel, adminButtonQuiet, rowButton } from "@/components/admin/kit";
import { PhoneIcon } from "@/components/stock/icons";
import { LEAD_TYPE_LABELS, claimsStore, coverEnds, customersStore, drivesStore, leadsStore, reservationsStore, salesStore } from "@/lib/admin/collections";
import { dublinDay, fmtDate, fmtEur } from "@/lib/admin/format";
import { matchesAny, parsePersonQuery, type PersonQuery } from "@/lib/admin/person-match";
import { telHref } from "@/lib/phone";

export const metadata = { title: "Customer" };

// One customer: how to reach them, what they bought (with the warranty on each), their deposits and claims, and the leads and test drives
// that carry their email or phone. Aftersales starts here: a claim is opened on one of their purchases.
const list = "flex flex-col divide-y divide-hairline";
const item = "flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-3";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const c = await customersStore.get(id);
  if (!c) notFound();
  const [sales, reservations, claims, leads, drives] = await Promise.all([salesStore.list(), reservationsStore.list(), claimsStore.list(), leadsStore.list(), drivesStore.list()]);
  const today = dublinDay();
  const day = (d: string) => fmtDate(`${d}T12:00:00Z`);
  const qs = [c.email, c.phone].map((v) => (v ? parsePersonQuery(v) : null)).filter((q): q is PersonQuery => q !== null);
  const bought = sales.filter((s) => s.customerId === id).sort((a, b) => b.soldOn.localeCompare(a.soldOn));
  const deposits = reservations.filter((r) => r.customerId === id).sort((a, b) => b.paidOn.localeCompare(a.paidOn));
  const theirClaims = claims.filter((k) => k.customerId === id).sort((a, b) => b.createdAt - a.createdAt);
  const theirLeads = qs.length ? leads.filter((l) => matchesAny(l, qs)).sort((a, b) => b.createdAt - a.createdAt) : [];
  const theirDrives = qs.length ? drives.filter((d) => matchesAny(d, qs)).sort((a, b) => b.startsAt - a.startsAt) : [];
  const tel = telHref(c.phone);
  const none = (what: string) => <p className="text-body text-text-2">{what}</p>;

  return (
    <>
      <PageHeader title={c.name} text={`Customer since ${fmtDate(c.createdAt)} · ${c.source}`} actions={<Link href="/dashboard/customers" className={adminButtonQuiet}>Customers</Link>} />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="flex min-w-0 flex-col gap-6">
          <Panel title="Purchases">
            {bought.length === 0
              ? none("Nothing bought on file.")
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
                          <Link href={`/dashboard/aftersales/new?sale=${s.id}`} className={rowButton}>Open a claim</Link>
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
          </Panel>
          {theirClaims.length > 0 && (
            <Panel title="Warranty claims">
              <ul className={list}>
                {theirClaims.map((k) => (
                  <li key={k.id} className={item}>
                    <Link href={`/dashboard/aftersales/${k.id}`} className="flex min-w-0 flex-col">
                      <span className="font-medium underline-offset-2 hover:underline">{k.carTitle}</span>
                      <span className="line-clamp-1 text-meta text-text-2">{day(k.openedOn)}: {k.fault}</span>
                    </Link>
                    <ClaimStatusBadge status={k.status} />
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
          <Panel title="Leads">
            {theirLeads.length === 0
              ? none("No leads with their email or phone.")
              : (
                <ul className={list}>
                  {theirLeads.map((l) => (
                    <li key={l.id} className={item}>
                      <Link href={`/dashboard/leads/${l.id}`} className="flex min-w-0 flex-col">
                        <span className="font-medium underline-offset-2 hover:underline">{LEAD_TYPE_LABELS[l.type]}{l.carTitle ? `, ${l.carTitle}` : ""}</span>
                        <span className="text-meta text-text-2">{fmtDate(l.createdAt)}</span>
                      </Link>
                      <LeadStatusBadge status={l.status} />
                    </li>
                  ))}
                </ul>
              )}
          </Panel>
          {theirDrives.length > 0 && (
            <Panel title="Test drives">
              <ul className={list}>
                {theirDrives.map((d) => (
                  <li key={d.id} className={item}>
                    <span className="flex min-w-0 flex-col">
                      <span className="font-medium">{d.carTitle}</span>
                      <span className="text-meta text-text-2">{fmtDate(d.startsAt)}</span>
                    </span>
                    <DriveStatusBadge status={d.status} />
                  </li>
                ))}
              </ul>
            </Panel>
          )}
        </div>
        <div className="flex min-w-0 flex-col gap-6 max-lg:order-first">
          <Panel title="Contact">
            <p className="flex flex-col text-meta text-text-2">
              {c.email && <span className="break-all">{c.email}</span>}
              {c.phone && <span>{c.phone}</span>}
            </p>
            <div className="flex flex-wrap gap-2">
              {tel && (
                <a href={tel} className={rowButton}>
                  <PhoneIcon className="size-4" />
                  Call
                </a>
              )}
              {c.email && <a href={`mailto:${c.email}`} className={rowButton}>Email</a>}
            </div>
            <p className="text-meta text-text-2">{c.marketingConsent ? "Agreed to marketing" : "No marketing"}</p>
          </Panel>
        </div>
      </div>
    </>
  );
}
