import Link from "next/link";
import { notFound } from "next/navigation";
import { OrderBadge } from "@/components/admin/badges";
import { ChoiceButton, Field, PageHeader, Panel, adminButton, adminButtonQuiet, adminInput } from "@/components/admin/kit";
import { CancelOrderForm } from "@/components/admin/OrderForms";
import { ORDER_STATUS_LABELS, customersStore, orderOpen, ordersStore } from "@/lib/admin/collections";
import { fmtDate, fmtDateTime, fmtEur } from "@/lib/admin/format";
import { monthLabel } from "@/lib/admin/reports";
import { regPeriodLabel } from "@/lib/leads/reg-periods";
import { can } from "@/lib/permissions";
import { stockSource } from "@/lib/stock-source";
import { addOrderNoteAction, setOrderStatusAction } from "../actions";

export const metadata = { title: "Order" };

const STEPS = ["ordered", "built", "in-transit", "arrived"] as const;

// One factory order: the car, the buyer, the deposit, where it is, and notes. Arrived puts the car in stock for the handover.
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  if ((await stockSource()) === "donedeal") notFound();
  const { id } = await params;
  const o = await ordersStore.get(id);
  if (!o) notFound();
  const [buyer, canCancel] = await Promise.all([o.customerId ? customersStore.get(o.customerId) : undefined, can("settings")]);
  const open = orderOpen(o.status);
  return (
    <>
      <PageHeader title={`${o.make} ${o.model}`} text={`Ordered ${fmtDate(`${o.orderedOn}T12:00:00Z`)} for ${regPeriodLabel(o.regPeriod)}`} actions={<Link href="/dashboard/orders" className={adminButtonQuiet}>Orders</Link>} />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="flex min-w-0 flex-col gap-6">
          <Panel title="The order">
            <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
              {[
                ["Customer", buyer ? <Link key="b" href={`/dashboard/customers/${buyer.id}`} className="underline">{buyer.name}</Link> : "Not on file"],
                ["Spec", [o.spec, o.colour].filter(Boolean).join(", ") || "Not given"],
                ["Price", fmtEur(o.priceEur)],
                ["Deposit", o.depositEur ? `${fmtEur(o.depositEur)}, ${o.depositMethod?.toLowerCase()}${o.refundEur ? `, ${fmtEur(o.refundEur)} refunded` : ""}` : "None"],
                ["Due", monthLabel(o.expected)],
                ["Taken by", o.salesperson ?? "Not set"],
              ].map(([k, v]) => (
                <div key={String(k)} className="flex flex-col">
                  <dt className="text-meta text-text-2">{k}</dt>
                  <dd className="text-body">{v}</dd>
                </div>
              ))}
            </dl>
            {o.leadId && <Link href={`/dashboard/leads/${o.leadId}`} className="w-fit text-meta underline">The website request</Link>}
          </Panel>
          <Panel title="Notes">
            {o.notes.length === 0 ? (
              <p className="text-body text-text-2">No notes yet.</p>
            ) : (
              <ul className="flex flex-col divide-y divide-hairline">
                {o.notes.map((n) => (
                  <li key={n.at} className="flex flex-col gap-0.5 py-2">
                    <span className="text-body">{n.text}</span>
                    <span className="text-meta text-text-2">{fmtDateTime(n.at)}</span>
                  </li>
                ))}
              </ul>
            )}
            <form action={addOrderNoteAction.bind(null, o.id)} className="flex flex-col gap-3">
              <Field label="Add a note">
                <textarea name="note" rows={3} maxLength={500} required className={`${adminInput} h-auto py-2`} />
              </Field>
              <button type="submit" className={`${adminButton} self-start`}>Add note</button>
            </form>
          </Panel>
        </div>
        <div className="flex min-w-0 flex-col gap-6 max-lg:order-first">
          <Panel title="Where it is" action={<OrderBadge status={o.status} />}>
            {open && (
              <div className="flex flex-wrap gap-2">
                {STEPS.map((s) => (
                  <ChoiceButton key={s} action={setOrderStatusAction.bind(null, o.id)} name="status" value={s} active={o.status === s}>
                    {ORDER_STATUS_LABELS[s]}
                  </ChoiceButton>
                ))}
              </div>
            )}
            {/* Arrived: the car is in stock, hidden and held for them. Mark sold on it is the handover. */}
            {o.carId && o.status === "arrived" && (
              <>
                <p className="text-body text-text-2">It is in stock, held for {buyer?.name ?? "the buyer"}. Mark it sold when they collect it.</p>
                <div className="flex flex-wrap gap-2">
                  <Link href={`/dashboard/stock/${o.carId}/sale`} className={adminButton}>Hand over</Link>
                  <Link href={`/dashboard/stock/${o.carId}`} className={adminButtonQuiet}>The car</Link>
                </div>
              </>
            )}
            {o.carId && !open && <Link href={`/dashboard/stock/${o.carId}`} className="w-fit text-meta underline">The car</Link>}
          </Panel>
          {open && canCancel && (
            <Panel title="Cancel the order">
              <CancelOrderForm id={o.id} depositEur={o.depositEur} />
            </Panel>
          )}
        </div>
      </div>
    </>
  );
}
