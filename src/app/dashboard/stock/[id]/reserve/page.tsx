import Link from "next/link";
import { notFound } from "next/navigation";
import { Facts, PageHeader, Panel, adminButton } from "@/components/admin/kit";
import { EndReservationForm, ReserveForm } from "@/components/admin/DepositForms";
import { customersStore, getSettings, heldFor, reservationsStore } from "@/lib/admin/collections";
import { addMonths, dublinDay, fmtDate, fmtEur } from "@/lib/admin/format";
import { adminCar } from "@/lib/admin/stock-admin";
import { can, currentMember } from "@/lib/permissions";
import { stockSource } from "@/lib/stock-source";
import { carName, priceLabel } from "@/lib/stock/format";
import { forSale } from "@/lib/stock/types";

export const metadata = { title: "Reserve" };

// Take a deposit on a car for sale, or see the one on it: Mark sold turns it into the sale, and owners and managers can end it with the
// deposit refunded or kept. Our version only: DoneDeal stock is not reserved here.
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [car, reservations, customers, { team }, me, source, canEnd] = await Promise.all([adminCar(id), reservationsStore.list(), customersStore.list(), getSettings(), currentMember(), stockSource(), can("settings")]);
  const held = car && heldFor(reservations, car.id);
  if (!car || source === "donedeal" || (!held && !forSale(car))) notFound();
  const today = dublinDay();
  const back = { href: "/dashboard/stock", label: "Stock" };
  if (!held) {
    return (
      <>
        <PageHeader title="Reserve" text={`${carName(car)}, ${priceLabel(car)}. It shows as Reserved on the website until the day you choose.`} back={back} />
        <Panel>
          <ReserveForm carId={car.id} today={today} latest={addMonths(today, 3)} team={team.map((t) => t.name)} me={team.some((t) => t.name === me.name) ? me.name : undefined} customers={[...customers].sort((a, b) => a.name.localeCompare(b.name, "en-IE")).map((c) => ({ id: c.id, label: c.phone ? `${c.name}, ${c.phone}` : c.name }))} />
        </Panel>
      </>
    );
  }
  const buyer = customers.find((c) => c.id === held.customerId);
  const late = held.until < today;
  return (
    <>
      <PageHeader title="Reserved" text={`${carName(car)}. When the buyer pays the rest, mark it sold.`} back={back} />
      <Panel title="The deposit">
        <Facts
          items={[
            ["Deposit", `${fmtEur(held.depositEur)}, ${held.method.toLowerCase()}`],
            ["Paid", fmtDate(`${held.paidOn}T12:00:00Z`)],
            ["Held until", `${fmtDate(`${held.until}T12:00:00Z`)}${late ? ", now passed" : ""}`, late ? "text-warn" : ""],
            ["Buyer", buyer ? [buyer.name, buyer.phone].filter(Boolean).join(", ") : "Not on file"],
            ["Taken by", held.salesperson ?? "Not set"],
          ] as const}
        />
        <Link href={`/dashboard/stock/${car.id}/sale`} className={`${adminButton} w-fit`}>Mark sold</Link>
      </Panel>
      {/* Money going back, or kept: owners and managers only, and the server refuses anyone else. */}
      {canEnd && (
        <Panel title="End the reservation">
          <p className="max-w-measure text-body text-text-2">The car goes back on sale. Keep or refund the deposit as your terms say.</p>
          <EndReservationForm carId={car.id} depositEur={held.depositEur} />
        </Panel>
      )}
    </>
  );
}
