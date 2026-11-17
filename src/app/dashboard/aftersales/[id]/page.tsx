import Link from "next/link";
import { notFound } from "next/navigation";
import { ClaimStatusBadge, CoverBadge } from "@/components/admin/badges";
import { ChoiceAct } from "@/components/admin/ActButton";
import { Facts, PageHeader, Panel } from "@/components/admin/kit";
import { ClaimCostForm } from "@/components/admin/ClaimForms";
import { CLAIM_STATUSES, CLAIM_STATUS_LABELS, claimsStore, coverEnds, customersStore, salesStore } from "@/lib/admin/collections";
import { TimeLeft } from "@/components/admin/charts";
import { dublinDay, fmtDate } from "@/lib/admin/format";
import { can } from "@/lib/permissions";
import { hasModule } from "@/lib/modules";
import { addClaimNoteAction, setClaimStatusAction } from "../actions";
import { NotesPanel } from "@/components/admin/NotesPanel";

export const metadata = { title: "Warranty claim" };

// One claim: the car, the buyer, the cover, the fault, where it is, notes, and (margins only) what the repair cost the dealer.
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const claim = await claimsStore.get(id);
  if (!claim) notFound();
  const [sale, buyer, margins] = await Promise.all([salesStore.get(claim.saleId), claim.customerId ? customersStore.get(claim.customerId) : undefined, can("margins")]);
  const day = (d: string) => fmtDate(`${d}T12:00:00Z`);
  // The warranty as time: from the sale to the last day of cover, how much is used and how much is left (or when it ended).
  const ends = sale ? coverEnds(sale) : undefined;
  const now = Date.parse(`${dublinDay()}T12:00:00Z`);
  const left = ends ? Math.round((Date.parse(`${ends}T12:00:00Z`) - now) / (30.44 * 86_400_000)) : 0;
  const coverText = !ends ? "" : left <= 0 ? `Ended ${day(ends)}` : `${left === 1 ? "About a month" : `About ${left} months`} left, until ${day(ends)}`;
  return (
    <>
      <PageHeader title={claim.carTitle} text={`Warranty claim opened ${day(claim.openedOn)}`} back={{ href: "/dashboard/aftersales", label: "Aftersales" }} />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="flex min-w-0 flex-col gap-6">
          <Panel title="The fault" action={<CoverBadge inCover={claim.inCover} />}>
            <p className="max-w-measure whitespace-pre-line text-body">{claim.fault}</p>
            <Facts
              items={[
                ["Customer", buyer ? ((await hasModule("sales")) ? <Link key="b" href={`/dashboard/customers/${buyer.id}`} className="underline">{buyer.name}</Link> : buyer.name) : "Not on file"],
                ["Sold", sale ? day(sale.soldOn) : "Not on file"],
                ["Cover until", sale ? day(coverEnds(sale)) : "Not known"],
                ...(claim.leadId ? [["From", <Link key="l" href={`/dashboard/aftersales/requests/${claim.leadId}`} className="underline">The website request</Link>] as const] : []),
              ] as const}
            />
          </Panel>
          <NotesPanel notes={claim.notes} action={addClaimNoteAction.bind(null, claim.id)} />
        </div>
        <div className="flex min-w-0 flex-col gap-6">
          <Panel title="Status" action={<ClaimStatusBadge status={claim.status} />}>
            <div className="flex flex-wrap gap-2">
              {CLAIM_STATUSES.map((s) => (
                <ChoiceAct key={s} action={setClaimStatusAction.bind(null, claim.id)} set={{ status: s }} back={{ status: claim.status }} active={claim.status === s} done={`Claim: ${CLAIM_STATUS_LABELS[s]}`}>
                  {CLAIM_STATUS_LABELS[s]}
                </ChoiceAct>
              ))}
            </div>
          </Panel>
          {sale && ends && (
            <Panel title="Cover" quiet>
              <TimeLeft from={Date.parse(`${sale.soldOn}T12:00:00Z`)} to={Date.parse(`${ends}T12:00:00Z`)} now={now} text={coverText} />
            </Panel>
          )}
          {margins && (
            <Panel title="Cost">
              <ClaimCostForm id={claim.id} costEur={claim.costEur} />
            </Panel>
          )}
        </div>
      </div>
    </>
  );
}
