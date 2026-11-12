import Link from "next/link";
import { notFound } from "next/navigation";
import { CarForm } from "@/components/admin/CarForm";
import { Field, Notice, PageHeader, Panel, adminButton, adminButtonQuiet, adminInput, dangerButton } from "@/components/admin/kit";
import { ActButton } from "@/components/admin/ActButton";
import { SyncedNotice } from "@/components/admin/SyncedNotice";
import { TrashIcon } from "@/components/stock/icons";
import { costsStore, heldFor, prepStore, reservationsStore, salesStore } from "@/lib/admin/collections";
import { RETURN_WINDOW_DAYS, withinReturnWindow } from "@/lib/admin/deposits";
import { fmtDate, fmtEur } from "@/lib/admin/format";
import { PrepPanel } from "@/components/admin/PrepPanel";
import { adminCar } from "@/lib/admin/stock-admin";
import { can } from "@/lib/permissions";
import { carName, carHref } from "@/lib/stock/format";
import { stockSource } from "@/lib/stock-source";
import { forSale } from "@/lib/stock/types";
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
  // What happened to this car before: deposits, and sales undone (each keeps its record). Shown under the car, in both versions.
  const [sales, reservations] = await Promise.all([salesStore.list(), reservationsStore.list()]);
  const day = (d: string) => fmtDate(`${d}T12:00:00Z`);
  const held = heldFor(reservations, id);
  const past = [
    ...reservations.filter((r) => r.carId === id).map((r) => ({ on: r.paidOn, text: `Deposit of ${fmtEur(r.depositEur)} on ${day(r.paidOn)}: ${r.status === "held" ? `held until ${day(r.until)}` : r.status === "sold" ? "part of the sale" : r.status === "refunded" ? `ended, ${fmtEur(r.refundEur ?? 0)} refunded` : "ended, deposit kept"}` })),
    ...sales.filter((s) => s.carId === id && s.returnedOn).map((s) => ({ on: s.returnedOn!, text: `Sold for ${fmtEur(s.priceEur)} on ${day(s.soldOn)}, ${s.kind === "returned" ? `brought back ${day(s.returnedOn!)}${withinReturnWindow(s.soldOn, s.returnedOn!) ? ` (within ${RETURN_WINDOW_DAYS} days)` : ""}, ${fmtEur(s.refundEur ?? 0)} refunded${s.reason ? `: ${s.reason}` : ""}` : `fell through ${day(s.returnedOn!)}${s.reason ? `: ${s.reason}` : ""}`}` })),
  ].sort((a, b) => b.on.localeCompare(a.on));
  const history = past.length > 0 && (
    <Panel title="Deposits and undone sales">
      <ul className="flex flex-col gap-2 text-body">
        {past.map((p, i) => <li key={i}>{p.text}</li>)}
      </ul>
    </Panel>
  );
  // The sale's next steps, in the header so a phone has them too (the stock list's row buttons are a desktop table's).
  const synced = (await stockSource()) === "donedeal";
  const sold = Boolean(car.soldAt);
  const sale = sales.find((s) => s.id === id);
  const steps = (
    <>
      {view}
      {sold && !sale && <Link href={`/dashboard/stock/${id}/sale`} className={adminButton}>Record sale</Link>}
      {sold && sale && canDelete && <Link href={`/dashboard/stock/${id}/undo-sale`} className={adminButtonQuiet}>Undo sale</Link>}
      {!synced && !sold && (held || forSale(car)) && <Link href={`/dashboard/stock/${id}/reserve`} className={adminButtonQuiet}>{held ? "Deposit" : "Reserve"}</Link>}
      {!synced && !sold && <Link href={`/dashboard/stock/${id}/sale`} className={adminButton}>Mark sold</Link>}
    </>
  );
  if (synced) {
    return (
      <>
        <PageHeader title={carName(car)} actions={steps} />
        <SyncedNotice car={car} />
        {/* DoneDeal has the car; the cost is the dealer's own, so it is still entered here. */}
        {cost && (
          <Panel title="Cost price">
            {costSaved && <Notice>Cost saved.</Notice>}
            <form action={saveCostAction.bind(null, car.id)} className="flex flex-wrap items-end gap-3">
              <Field label="Cost price (€)" hint="Leave empty to clear it" className="sm:max-w-xs">
                <input name="costEur" inputMode="numeric" defaultValue={cost.eur ?? ""} className={adminInput} />
              </Field>
              <button type="submit" className={adminButton}>Save cost</button>
            </form>
          </Panel>
        )}
        {prep}
        {history}
      </>
    );
  }
  return (
    <>
      <PageHeader title={carName(car)} actions={steps} />
      <CarForm car={car} cost={cost} />
      {prep}
      {history}
      {/* Out of the way, at the end: marking a car sold is nearly always what is wanted, and it keeps the car's page as Sold for a while.
          Owners and managers only; the server refuses anyone else. */}
      {canDelete && (
        <Panel title="Delete this car">
          <p className="max-w-measure text-body text-text-2">It leaves the site at once and its link stops working. To take it off the website for now, hide it instead.</p>
          {held ? (
            <p className="max-w-measure text-body">A deposit is held on this car. <Link href={`/dashboard/stock/${car.id}/reserve`} className="underline">End the reservation</Link> before deleting it.</p>
          ) : (
          <ActButton act={deleteCarAction.bind(null, car.id)} confirm={{ title: `Delete ${carName(car)}?`, text: "This cannot be undone. Its cost and prep go with it.", yes: "Delete" }} className={`${dangerButton} w-fit`}>
            <TrashIcon className="size-4" />
            Delete {carName(car)}
          </ActButton>
          )}
        </Panel>
      )}
    </>
  );
}
