import Link from "next/link";
import { PageHeader, Panel, adminButtonQuiet } from "@/components/admin/kit";
import { OpenClaimForm } from "@/components/admin/ClaimForms";
import { coverEnds, customersStore, leadsStore, salesStore } from "@/lib/admin/collections";
import { dublinDay, fmtDate } from "@/lib/admin/format";
import { matchesAny, parsePersonQuery, type PersonQuery } from "@/lib/admin/person-match";

export const metadata = { title: "Open a claim" };

// A claim is on a sale. From a customer's page the sale is chosen (?sale=); from a warranty lead (?lead=) the buyer is found by the email
// or phone the lead gave, their latest purchase is chosen, and the fault starts as their message.
export default async function Page({ searchParams }: { searchParams: Promise<{ sale?: string; lead?: string }> }) {
  const sp = await searchParams;
  const [sales, customers, lead] = await Promise.all([salesStore.list(), customersStore.list(), sp.lead ? leadsStore.get(sp.lead) : undefined]);
  const names = new Map(customers.map((c) => [c.id, c]));
  const today = dublinDay();
  const sold = sales.filter((s) => !s.returnedOn).sort((a, b) => b.soldOn.localeCompare(a.soldOn));
  const qs = lead ? [lead.email, lead.phone].map((v) => (v ? parsePersonQuery(v) : null)).filter((q): q is PersonQuery => q !== null) : [];
  const theirs = qs.length ? sold.find((s) => s.customerId && names.has(s.customerId) && matchesAny(names.get(s.customerId)!, qs)) : undefined;
  const label = (s: (typeof sold)[number]) =>
    [s.carTitle, s.customerId && names.get(s.customerId)?.name, `sold ${fmtDate(`${s.soldOn}T12:00:00Z`)}`, coverEnds(s) >= today ? "in cover" : "out of cover"].filter(Boolean).join(", ");
  return (
    <>
      <PageHeader title="Open a claim" actions={<Link href="/dashboard/aftersales" className={adminButtonQuiet}>Aftersales</Link>} />
      <Panel>
        {lead && !theirs && <p className="max-w-measure text-body text-warn">No purchase on file matches {lead.name}&apos;s email or phone. Choose the sale.</p>}
        <OpenClaimForm sales={sold.map((s) => ({ id: s.id, label: label(s) }))} today={today} defaults={{ saleId: sp.sale ?? theirs?.id, fault: lead?.message, leadId: lead?.id }} />
      </Panel>
    </>
  );
}
