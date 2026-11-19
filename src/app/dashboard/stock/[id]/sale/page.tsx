import { notFound } from "next/navigation";
import { PageHeader, Panel } from "@/components/admin/kit";
import { SaleForm } from "@/components/admin/SaleForm";
import { LEAD_TYPE_LABELS, customersStore, getSettings, heldFor, leadsStore, reservationsStore, salesStore } from "@/lib/admin/collections";
import { dublinDay, fmtDate, fmtEur } from "@/lib/admin/format";
import { adminCar } from "@/lib/admin/stock-admin";
import { can, currentMember } from "@/lib/permissions";
import { stockSource } from "@/lib/stock-source";
import { carName } from "@/lib/stock/format";
import { isSold } from "@/lib/stock/types";

// One name for the action on its button, heading and tab: Mark sold, Record sale (a sold car with none), Change the sale.
const titleOf = (was: unknown, sold: boolean) => (was ? "Change the sale" : sold ? "Record sale" : "Mark sold");
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [car, was] = await Promise.all([adminCar(id), salesStore.get(id)]);
  return { title: titleOf(was, Boolean(car && isSold(car))) };
}

// Mark sold in our version (the car is marked sold on the sale's day) and for a DoneDeal car whose ad came down, Record sale for a sold car
// with none, and Change the sale for one already recorded. A DoneDeal car still for sale is sold on DoneDeal first: the ad coming down is what asks.
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [car, was, customers, { team }, me, source, reservations, leads] = await Promise.all([adminCar(id), salesStore.get(id), customersStore.list(), getSettings(), currentMember(), stockSource(), reservationsStore.list(), leadsStore.list()]);
  if (!car || (source === "donedeal" && !isSold(car) && !was && !car.takenDownAt)) notFound();
  if (was && !(await can("settings"))) notFound(); // changing a sale is for owners and managers (actions.ts)
  const today = dublinDay();
  const title = titleOf(was, isSold(car));
  // A deposit on the car: its buyer and salesperson start the form, and it becomes part of the sale.
  const held = heldFor(reservations, car.id);
  return (
    <>
      <PageHeader title={title} text={carName(car)} back={isSold(car) ? { href: "/dashboard/stock?view=sold", label: "Sold cars" } : { href: "/dashboard/stock", label: "Stock" }} />
      <Panel>
        {held && <p className="max-w-measure text-body">A deposit of {fmtEur(held.depositEur)} was paid on this car. It is recorded as part of this sale.</p>}
        <SaleForm
          carId={car.id}
          today={today}
          submit={was ? "Save the sale" : isSold(car) ? "Record sale" : "Mark sold"}
          team={team.map((t) => t.name)}
          leads={leads.filter((l) => l.carSlug === car.slug && l.status !== "lost").sort((a, b) => b.createdAt - a.createdAt).map((l) => ({ id: l.id, label: `${l.name}, ${LEAD_TYPE_LABELS[l.type].toLowerCase()}, ${fmtDate(l.createdAt)}` }))}
          customers={[...customers].sort((a, b) => a.name.localeCompare(b.name, "en-IE")).map((c) => ({ id: c.id, label: c.phone ? `${c.name}, ${c.phone}` : c.name }))}
          defaults={was ?? { priceEur: car.priceEur, soldOn: car.soldAt ?? today, salesperson: held?.salesperson ?? (team.some((t) => t.name === me.name) ? me.name : undefined), customerId: held?.customerId }}
        />
      </Panel>
    </>
  );
}
