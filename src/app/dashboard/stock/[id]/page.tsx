import Link from "next/link";
import { notFound } from "next/navigation";
import { CarForm } from "@/components/admin/CarForm";
import { Field, PageHeader, Panel, adminButton, adminButtonQuiet, adminInput, dangerButton } from "@/components/admin/kit";
import { ActButton } from "@/components/admin/ActButton";
import { SyncedNotice } from "@/components/admin/SyncedNotice";
import { TrashIcon } from "@/components/stock/icons";
import { costsStore, prepStore } from "@/lib/admin/collections";
import { PrepPanel } from "@/components/admin/PrepPanel";
import { adminCar } from "@/lib/admin/stock-admin";
import { can } from "@/lib/permissions";
import { carName, carHref } from "@/lib/stock/format";
import { stockSource } from "@/lib/stock-source";
import { deleteCarAction, saveCostAction } from "../actions";

export const metadata = { title: "Edit car" };

export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ cost?: string }> }) {
  const { id } = await params;
  const costSaved = (await searchParams).cost === "saved";
  const car = await adminCar(id);
  if (!car) notFound();
  // A hidden car or a draft has no page on the website to view.
  const view = car.listing ? undefined : <Link href={carHref(car.slug)} className={adminButtonQuiet}>View on the site</Link>;
  const [margins, canDelete] = await Promise.all([can("margins"), can("settings")]);
  const cost = margins ? { eur: (await costsStore.get(id))?.costEur } : undefined;
  // Prep, for staff who see margins: in both versions, since it is the dealer's own spend.
  const prep = margins ? <PrepPanel carId={car.id} lines={(await prepStore.get(id))?.lines ?? []} /> : null;
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
        {prep}
      </>
    );
  }
  return (
    <>
      <PageHeader title={carName(car)} actions={view} />
      <CarForm car={car} cost={cost} />
      {prep}
      {/* Out of the way, at the end: marking a car sold is nearly always what is wanted, and it keeps the car's page as Sold for a while.
          Owners and managers only; the server refuses anyone else. */}
      {canDelete && (
        <Panel title="Delete this car">
          <p className="max-w-measure text-body text-text-2">It leaves the site at once and its link stops working. To take it off the website for now, hide it instead.</p>
          <ActButton act={deleteCarAction.bind(null, car.id)} confirm={{ title: `Delete ${carName(car)}?`, text: "This cannot be undone. Its cost and prep go with it.", yes: "Delete" }} className={`${dangerButton} w-fit`}>
            <TrashIcon className="size-4" />
            Delete {carName(car)}
          </ActButton>
        </Panel>
      )}
    </>
  );
}
