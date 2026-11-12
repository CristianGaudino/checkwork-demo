import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader, Panel, adminButtonQuiet } from "@/components/admin/kit";
import { SaleForm } from "@/components/admin/SaleForm";
import { customersStore, getSettings, heldFor, reservationsStore, salesStore } from "@/lib/admin/collections";
import { dublinDay, fmtEur } from "@/lib/admin/format";
import { adminCar } from "@/lib/admin/stock-admin";
import { currentMember } from "@/lib/permissions";
import { stockSource } from "@/lib/stock-source";
import { carName } from "@/lib/stock/format";
import { isSold } from "@/lib/stock/types";

export const metadata = { title: "Record a sale" };

// Mark sold in our version (the car is marked sold on the sale's day) and for a DoneDeal car whose ad came down, Record sale for a sold car
// with none, and Change the sale for one already recorded. A DoneDeal car still for sale is sold on DoneDeal first: the ad coming down is what asks.
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [car, was, customers, { team }, me, source, reservations] = await Promise.all([adminCar(id), salesStore.get(id), customersStore.list(), getSettings(), currentMember(), stockSource(), reservationsStore.list()]);
  if (!car || (source === "donedeal" && !isSold(car) && !was && !car.takenDownAt)) notFound();
  const today = dublinDay();
  const title = was ? "Change the sale" : isSold(car) ? "Record the sale" : "Mark sold";
  // A deposit on the car: its buyer and salesperson start the form, and it becomes part of the sale.
  const held = heldFor(reservations, car.id);
  return (
    <>
      <PageHeader title={title} text={carName(car)} actions={<Link href="/dashboard/stock?view=sold" className={adminButtonQuiet}>Sold cars</Link>} />
      <Panel>
        {held && <p className="max-w-measure text-body">A deposit of {fmtEur(held.depositEur)} was paid on this car. It is recorded as part of this sale.</p>}
        <SaleForm
          carId={car.id}
          today={today}
          submit={was ? "Save the sale" : isSold(car) ? "Record sale" : "Mark sold"}
          team={team.map((t) => t.name)}
          customers={[...customers].sort((a, b) => a.name.localeCompare(b.name, "en-IE")).map((c) => ({ id: c.id, label: c.phone ? `${c.name}, ${c.phone}` : c.name }))}
          defaults={was ?? { priceEur: car.priceEur, soldOn: car.soldAt ?? today, salesperson: held?.salesperson ?? (team.some((t) => t.name === me.name) ? me.name : undefined), customerId: held?.customerId }}
        />
      </Panel>
    </>
  );
}
