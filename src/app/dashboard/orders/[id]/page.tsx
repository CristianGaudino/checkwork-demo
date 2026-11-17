import Link from "next/link";
import { notFound } from "next/navigation";
import { OrderBadge } from "@/components/admin/badges";
import { ChoiceAct } from "@/components/admin/ActButton";
import { Facts, PageHeader, Panel, adminButton, adminButtonQuiet } from "@/components/admin/kit";
import { CancelOrderForm } from "@/components/admin/OrderForms";
import { ORDER_STATUS_LABELS, customersStore, orderOpen, ordersStore } from "@/lib/admin/collections";
import { fmtDate, fmtEur } from "@/lib/admin/format";
import { monthLabel } from "@/lib/admin/reports";
import { regPeriodLabel } from "@/lib/leads/reg-periods";
import { can } from "@/lib/permissions";
import { hasModule } from "@/lib/modules";
import { stockSource } from "@/lib/stock-source";
import { addOrderNoteAction, setOrderStatusAction } from "../actions";
import { NotesPanel } from "@/components/admin/NotesPanel";

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
      <PageHeader title={`${o.make} ${o.model}`} text={`Ordered ${fmtDate(`${o.orderedOn}T12:00:00Z`)} for ${regPeriodLabel(o.regPeriod)}`} back={{ href: "/dashboard/orders", label: "Orders" }} />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="flex min-w-0 flex-col gap-6">
          <Panel title="The order">
            <Facts
              items={[
                ["Customer", buyer ? ((await hasModule("sales")) ? <Link key="b" href={`/dashboard/customers/${buyer.id}`} className="underline">{buyer.name}</Link> : buyer.name) : "Not on file"],
                ["Spec", [o.spec, o.colour].filter(Boolean).join(", ") || "Not given"],
                ["Price", fmtEur(o.priceEur)],
                ["Deposit", o.depositEur ? `${fmtEur(o.depositEur)}, ${o.depositMethod?.toLowerCase()}${o.refundEur ? `, ${fmtEur(o.refundEur)} refunded` : ""}` : "None"],
                ["Due", monthLabel(o.expected)],
                ["Taken by", o.salesperson ?? "Not set"],
              ] as const}
            />
            {o.leadId && <Link href={`/dashboard/leads/${o.leadId}`} className="w-fit text-meta underline">The website request</Link>}
          </Panel>
          <NotesPanel notes={o.notes} action={addOrderNoteAction.bind(null, o.id)} />
          {/* At the end, out of the way: it cannot be taken back. Owners and managers only; the server refuses anyone else. */}
          {open && canCancel && (
            <Panel title="Cancel the order">
              <CancelOrderForm id={o.id} depositEur={o.depositEur} />
            </Panel>
          )}
        </div>
        <div className="flex min-w-0 flex-col gap-6 max-lg:order-first">
          <Panel title="Where it is" action={<OrderBadge status={o.status} />}>
            {open && o.status !== "arrived" && (
              <div className="flex flex-wrap gap-2">
                {STEPS.map((s) => (
                  // Arrived puts the car in stock and never steps back, so it asks first; the other steps can be taken back.
                  <ChoiceAct
                    key={s}
                    action={setOrderStatusAction.bind(null, o.id)}
                    set={{ status: s }}
                    back={s === "arrived" ? undefined : { status: o.status }}
                    confirm={s === "arrived" ? { title: "Mark it arrived?", text: "The car goes into stock, held for the buyer. This cannot be stepped back.", yes: "It has arrived" } : undefined}
                    active={o.status === s}
                    done={`Order: ${ORDER_STATUS_LABELS[s]}`}
                  >
                    {ORDER_STATUS_LABELS[s]}
                  </ChoiceAct>
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
        </div>
      </div>
    </>
  );
}
