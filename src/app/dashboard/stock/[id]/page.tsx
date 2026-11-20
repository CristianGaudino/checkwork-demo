import Link from "next/link";
import { notFound } from "next/navigation";
import { CarForm } from "@/components/admin/CarForm";
import { Field, Notice, PageHeader, Panel, adminButton, adminButtonQuiet, adminInput, choicePill, dangerButton } from "@/components/admin/kit";
import { CarFlags, ListingButton, PostToSocial, ViewOnSite, daysInStock } from "@/components/admin/CarActions";
import { CarThumb } from "@/components/admin/CarThumb";
import { card, NEW_TAB } from "@/components/ui";
import { ActButton } from "@/components/admin/ActButton";
import { AITextarea } from "@/components/admin/AIWriter";
import { carFields } from "@/lib/admin/car-fields";
import { LISTING_SITE, listingHref } from "@/lib/stock-source-rules";
import { CheckIcon, PencilIcon, ReceiptIcon, TrashIcon } from "@/components/stock/icons";
import { costsStore, heldFor, prepStore, reservationsStore, salesStore } from "@/lib/admin/collections";
import { RETURN_WINDOW_DAYS, withinReturnWindow } from "@/lib/admin/deposits";
import { fmtDate, fmtEur, fmtNum } from "@/lib/admin/format";
import { PrepPanel } from "@/components/admin/PrepPanel";
import { CarPhotos } from "@/components/admin/CarPhotos";
import { CAR_PHOTOS_MAX } from "@/lib/admin/car-photos";
import { adminCar } from "@/lib/admin/stock-admin";
import { can } from "@/lib/permissions";
import { carName, priceLabel } from "@/lib/stock/format";
import { stockSource } from "@/lib/stock-source";
import { forSale, isReduced } from "@/lib/stock/types";
import { deleteCarAction, saveCostAction } from "../actions";
import { hasModule } from "@/lib/modules";

export const metadata = { title: "Edit car" };

export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ cost?: string; photos?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const costSaved = sp.cost === "saved";
  const [car, deposits] = await Promise.all([adminCar(id), hasModule("sales")]);
  if (!car) notFound();
  const [margins, canDelete] = await Promise.all([can("margins"), can("settings")]);
  const cost = margins ? { eur: (await costsStore.get(id))?.costEur } : undefined;
  // Prep, for staff who see margins: in both versions, since it is the dealer's own spend.
  const prep = margins ? <div id="prep" className="scroll-mt-24"><PrepPanel carId={car.id} lines={(await prepStore.get(id))?.lines ?? []} /></div> : null;
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
  // The car's one main step, in the header so a phone has it on its first screen: Mark sold, or Record sale for a sold car with none, or
  // for synced stock Edit on DoneDeal. The other things to do with the car sit under it, labelled, in the car's summary.
  const synced = (await stockSource()) === "donedeal";
  const sold = Boolean(car.soldAt);
  const sale = sales.find((s) => s.id === id);
  const main = sold && !sale ? (
    <Link href={`/dashboard/stock/${id}/sale`} className={adminButton}><ReceiptIcon className="size-4" />Record sale</Link>
  ) : synced ? (
    <a href={listingHref(car)} {...NEW_TAB} className={adminButton}><PencilIcon className="size-4" />Edit on {LISTING_SITE}<span className="sr-only"> (opens in a new tab)</span></a>
  ) : !sold ? (
    <Link href={`/dashboard/stock/${id}/sale`} className={adminButton}><CheckIcon className="size-4" />Mark sold</Link>
  ) : undefined;
  const quiet = `${adminButtonQuiet} px-4`;
  const actions = [
    (await hasModule("social")) && <PostToSocial key="post" car={car} className={quiet} />,
    <ViewOnSite key="view" car={car} className={quiet} />,
    deposits && !synced && !sold && (held || forSale(car)) && <Link key="reserve" href={`/dashboard/stock/${id}/reserve`} className={quiet}>{held ? "See the deposit" : "Reserve with a deposit"}</Link>,
    !synced && !sold && <ListingButton key="listing" car={car} className={quiet} />,
    synced && sold && !sale && <a key="dd" href={listingHref(car)} {...NEW_TAB} className={quiet}>Edit on {LISTING_SITE}<span className="sr-only"> (opens in a new tab)</span></a>,
    sold && sale && canDelete && <Link key="change" href={`/dashboard/stock/${id}/sale`} className={quiet}>Change the sale</Link>,
    sold && sale && canDelete && <Link key="undo" href={`/dashboard/stock/${id}/undo-sale`} className={quiet}>Undo sale</Link>,
  ].filter(Boolean);
  const facts = [
    car.listedAt && !sold ? `${daysInStock(car.listedAt)} in stock` : sale ? `Sold for ${fmtEur(sale.priceEur)} on ${day(sale.soldOn)}` : sold ? `Sold ${day(car.soldAt!)}` : undefined,
    `${car.photos.length} ${car.photos.length === 1 ? "photo" : "photos"}`,
    car.mileageKm !== undefined ? `${fmtNum(car.mileageKm)} km` : undefined,
  ].filter(Boolean).join(" · ");
  // The car at a glance (photo, price, status and what needs doing) with what can be done with it. The first block on every car's page.
  const summary = (
    <section aria-label="This car" className={`${card} flex flex-col gap-4 p-4 sm:p-5`}>
      <div className="flex items-center gap-4">
        <div className="aspect-[4/3] w-28 shrink-0 overflow-hidden rounded-control bg-photo-bg sm:w-40">
          <CarThumb src={car.photos[0]?.src} />
        </div>
        <div className="flex min-w-0 flex-col gap-1">
          <p className="font-display text-title font-semibold tabular-nums">
            {priceLabel(car)}
            {isReduced(car) && <span className="block text-meta font-normal text-ok sm:ml-2 sm:inline">was {fmtEur(car.wasPriceEur!)}</span>}
          </p>
          <p className="text-meta text-text-2">{facts}</p>
          <CarFlags car={car} />
        </div>
      </div>
      {/* Two across on a phone, each a 44px button; in a row from 640px. */}
      {actions.length > 0 && <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap max-sm:[&>*]:h-auto max-sm:[&>*]:min-h-11 max-sm:[&>*]:px-3 max-sm:[&>*]:py-2 max-sm:[&>*]:text-center">{actions}</div>}
    </section>
  );
  if (synced) {
    return (
      <>
        <PageHeader title={carName(car)} text={`This car comes from ${LISTING_SITE}. Change it there; your website updates within 15 minutes.`} actions={main} back={{ href: "/dashboard/stock", label: "Stock" }} />
        {summary}
        {/* The site shows the feed's text, so a better one is written here and pasted into the listing site (#225). Not for an ad that is gone. */}
        {!sold && !car.takenDownAt && (await hasModule("ai")) && (
          <Panel title="Improve this description">
            <AITextarea label="Description" task="carDescription" defaultValue={car.description ?? ""} rows={8} request={{ task: "carDescription", fields: carFields(car) }} copy={`Copy for ${LISTING_SITE}`} />
            <p className="max-w-measure text-body text-text-2">
              Paste it into {LISTING_SITE}; the site updates within 15 minutes.
            </p>
          </Panel>
        )}
        {/* DoneDeal has the car; the cost is the dealer's own, so it is still entered here. */}
        {cost && (
          <div id="cost" className="scroll-mt-24">
          <Panel title="Cost price">
            {costSaved && <Notice>Cost saved.</Notice>}
            <form action={saveCostAction.bind(null, car.id)} className="flex flex-wrap items-end gap-3">
              <Field label="Cost price (€)" hint="Leave empty to clear it" className="sm:max-w-xs">
                <input name="costEur" inputMode="numeric" defaultValue={cost.eur ?? ""} className={adminInput} />
              </Field>
              <button type="submit" className={adminButton}>Save cost</button>
            </form>
          </Panel>
          </div>
        )}
        {prep}
        {history}
      </>
    );
  }
  return (
    <>
      <PageHeader title={carName(car)} actions={main} back={{ href: "/dashboard/stock", label: "Stock" }} />
      {sp.photos === "failed" && <Notice tone="warn">The car is saved, but its photos did not upload. Add them below.</Notice>}
      {summary}
      {/* The long form in named parts, so price, photos or the description is one press away. */}
      <nav aria-label="Parts of this car's page" className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
        {[["photos", "Photos"], ["basics", "About the car"], ["price", "Price"], ["details", "Details"], ["description", "Description"], ...(cost ? [["cost", "Cost"]] : []), ...(prep ? [["prep", "Prep costs"]] : [])].map(([to, label]) => (
          <a key={to} href={`#${to}`} className={`${choicePill(false)} shrink-0 whitespace-nowrap`}>{label}</a>
        ))}
      </nav>
      {/* Photos first: they are the job on the forecourt, and they save on their own, apart from the form's Save changes. */}
      <CarPhotos carId={car.id} photos={car.photos} max={CAR_PHOTOS_MAX} />
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
