import Link from "next/link";
import { notFound } from "next/navigation";
import { CarForm } from "@/components/admin/CarForm";
import { Field, PageHeader, Panel, adminButton, adminButtonQuiet, adminInput } from "@/components/admin/kit";
import { SyncedNotice } from "@/components/admin/SyncedNotice";
import { TrashIcon } from "@/components/stock/icons";
import { costsStore } from "@/lib/admin/collections";
import { adminCar } from "@/lib/admin/stock-admin";
import { can } from "@/lib/permissions";
import { carName } from "@/lib/stock/format";
import { stockSource } from "@/lib/stock-source";
import { deleteCarAction, saveCostAction } from "../actions";

export const metadata = { title: "Edit car" };

export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ cost?: string }> }) {
  const { id } = await params;
  const costSaved = (await searchParams).cost === "saved";
  const car = await adminCar(id);
  if (!car) notFound();
  const view = <Link href={`/used-cars/${car.slug}`} className={adminButtonQuiet}>View on the site</Link>;
  const cost = (await can("margins")) ? { eur: (await costsStore.get(id))?.costEur } : undefined;
  if ((await stockSource()) === "donedeal") {
    return (
      <>
        <PageHeader title={carName(car)} actions={view} />
        <SyncedNotice car={car} />
        {/* DoneDeal has the car; the cost is the dealer's own, so it is still entered here. */}
        {cost && (
          <Panel title="Cost price">
            {costSaved && <p role="status" className="rounded-control bg-ok-soft px-4 py-3 text-body text-ok">Cost saved.</p>}
            <form action={saveCostAction.bind(null, car.id)} className="flex flex-wrap items-end gap-3">
              <Field label="Cost price (€)" hint="Leave empty to clear it" className="sm:max-w-xs">
                <input name="costEur" inputMode="numeric" defaultValue={cost.eur ?? ""} className={adminInput} />
              </Field>
              <button type="submit" className={adminButton}>Save cost</button>
            </form>
          </Panel>
        )}
      </>
    );
  }
  return (
    <>
      <PageHeader title={carName(car)} actions={view} />
      <CarForm car={car} cost={cost} />
      {/* Out of the way, at the end: marking a car sold is nearly always what is wanted, and it keeps the car's page as Sold for a while. */}
      <Panel title="Delete this car">
        <p className="max-w-measure text-body text-text-2">It leaves the site at once and its link stops working. To keep it on the site as sold, use Mark sold instead.</p>
        <form action={deleteCarAction.bind(null, car.id)}>
          <button type="submit" className="inline-flex h-11 items-center gap-2 rounded-control border border-bad px-4 text-meta font-medium text-bad">
            <TrashIcon className="size-4" />
            Delete {carName(car)}
          </button>
        </form>
      </Panel>
    </>
  );
}
