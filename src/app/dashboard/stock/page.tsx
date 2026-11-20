import Link from "next/link";
import { DataTable, EmptyState, Notice, PageHeader, Panel, SummaryTabs, TableFooter, TableToolbar, Task, TaskList, adminButton, pageOf, rowButton, sortRows, type Column, type FilterGroup } from "@/components/admin/kit";
import { CarFlags, ListingButton, PostToSocial, ViewOnSite, daysInStock } from "@/components/admin/CarActions";
import { ActButton } from "@/components/admin/ActButton";
import { RowMenu } from "@/components/admin/RowMenu";
import { CameraIcon, CheckIcon, HistoryIcon, PencilIcon, PlusIcon, ReceiptIcon, SyncIcon } from "@/components/stock/icons";
import { NEW_TAB } from "@/components/ui";
import { carCosts } from "@/lib/admin/costs";
import { marginOf } from "@/lib/admin/margins";
import { adminCars } from "@/lib/admin/stock-admin";
import { can } from "@/lib/permissions";
import { daysSince, fmtDate, fmtEur, fmtNum } from "@/lib/admin/format";
import { carName, carHref, priceLabel } from "@/lib/stock/format";
import { FUEL_LABELS, FUELS, GEARBOXES, GEARBOX_LABELS, forSale, isReduced, isSold, onRequest, type Car } from "@/lib/stock/types";
import { stockSource } from "@/lib/stock-source";
import { LISTING_SITE, DONEDEAL_DEALER_URL, listingHref } from "@/lib/stock-source-rules";
import { SyncPanel } from "@/components/admin/SyncPanel";
import { StockBulk, StockPick } from "@/components/admin/StockBulk";
import { CarThumb } from "@/components/admin/CarThumb";
import { AgeBar } from "@/components/admin/charts";
import { OLD_STOCK_DAYS, SALE_NUDGE_DAYS } from "@/lib/admin/overview";
import { FEW_PHOTOS, STOCK_VIEWS, parseStockList, stockList, type StockView } from "@/lib/admin/stock-views";
import { salesStore } from "@/lib/admin/collections";
import { syncStatus } from "@/lib/donedeal/sync";
import { toggleSoldAction, withdrawnAction } from "./actions";
import { hasModule } from "@/lib/modules";

export const metadata = { title: "Stock" };

// The views (src/lib/admin/stock-views.ts) are the summary: each is a tile with its count, and the chosen one filters the table.

export default async function Page({ searchParams }: { searchParams: Promise<{ view?: string; status?: string; q?: string; make?: string; fuel?: string; gearbox?: string; sort?: string; dir?: string; per?: string; saved?: string; deleted?: string; sale?: string; reserved?: string; undone?: string; page?: string }> }) {
  const sp = await searchParams;
  const { view, q, make, fuel, gearbox } = parseStockList(sp);
  const [all, source, deposits] = await Promise.all([adminCars(), stockSource(), hasModule("sales")]);
  const synced = source === "donedeal";
  const sync = synced ? await syncStatus() : null;
  const sales = new Map((await salesStore.list()).map((s) => [s.id, s]));
  const saleFor = sp.sale ? all.find((c) => c.id === sp.sale) : undefined;
  const tradeIn = saleFor && sales.get(saleFor.id)?.tradeIn;
  const reservedNow = sp.reserved ? all.find((c) => c.id === sp.reserved) : undefined;
  const undoneNow = sp.undone ? all.find((c) => c.id === sp.undone) : undefined;
  // A sold car with no sale recorded gets the button: Mark sold in our version records it; after the DoneDeal sync it is asked for here.
  const recordSale = (c: Car) =>
    isSold(c) && !sales.has(c.id) ? (
      <Link href={`/dashboard/stock/${c.id}/sale`} className={rowButton}>
        Record sale
      </Link>
    ) : null;
  // The margin column is for staff with the margins permission; without it the costs are not even read.
  const costs = (await can("margins")) ? new Map([...(await carCosts())].map(([id, c]) => [id, c.total])) : null;
  // The makes in stock, for the make filter.
  const makes = [...new Map(all.map((c) => [c.makeSlug, c.make])).entries()].sort((a, b) => a[1].localeCompare(b[1], "en-IE"));
  const matching = stockList(all, view, q, { make, fuel, gearbox });
  const saved = sp.saved ? all.find((c) => c.id === sp.saved) : undefined;
  // A view keeps the search and the filters; the sort and the page start again.
  const href = (v: StockView) => `/dashboard/stock?${new URLSearchParams(Object.entries({ view: v, q, make, fuel, gearbox }).filter((e): e is [string, string] => Boolean(e[1])))}`;
  // Where a row goes: the car's editor here, or, for synced stock, the car on the site (it is changed on DoneDeal).
  // A synced car off the website (its ad came down) has no page there, so it opens here; so does every car with AI, to improve its description.
  const ai = synced && (await hasModule("ai"));
  const open = (c: Car) => (synced && !ai && !c.listing ? carHref(c.slug) : `/dashboard/stock/${c.id}`);
  const takenDown = synced ? all.filter((c) => c.takenDownAt) : [];
  const canUndo = await can("settings"); // undoing a sale is money going back: owners and managers
  const undoSale = (c: Car) =>
    canUndo && isSold(c) && sales.has(c.id) ? (
      <Link href={`/dashboard/stock/${c.id}/undo-sale`} className={rowButton}>
        Undo sale
      </Link>
    ) : null;
  const social = await hasModule("social");

  const columns: Column<Car>[] = [
    // Tick several cars to change them at once (#104). Our version only: DoneDeal stock is changed on DoneDeal.
    ...(synced ? [] : [{ key: "pick", header: "Select", quietHeader: true, className: "w-10 !pr-0", cell: (c: Car) => <StockPick id={c.id} name={carName(c)} /> }]),
    {
      key: "car",
      header: "Car",
      sort: (c) => `${c.make} ${c.model} ${c.variant ?? ""}`,
      cell: (c) => (
        <div className="flex min-w-0 items-center gap-3">
          {/* The photo goes in compact rows: there the row is the size of a line. */}
          <div className="hidden h-12 w-16 shrink-0 overflow-hidden rounded-control bg-photo-bg min-[25rem]:block group-data-[density=compact]/shell:hidden">
            <CarThumb src={c.photos[0]?.src} />
          </div>
          {/* The name, then the year and variant, then what needs doing about the car (few photos, hidden, in stock too long). */}
          <div className="flex min-w-0 flex-col gap-1 py-1">
            <span className="min-w-0">
              <Link href={open(c)} title={`${c.make} ${c.model}`} className="line-clamp-2 font-medium after:absolute after:inset-0">
                {c.make} {c.model}
              </Link>
              <span title={[c.year, c.variant].filter(Boolean).join(" · ")} className="line-clamp-2 text-meta text-text-2">
                {[c.year, c.variant].filter(Boolean).join(" · ")}
                {/* The days in stock have their own column from 1024px. */}
                {c.listedAt && !isSold(c) && <span className="lg:hidden"> · {daysInStock(c.listedAt)}</span>}
              </span>
            </span>
            <CarFlags car={c} status={view === "all"} />
          </div>
        </div>
      ),
      // A truncated name still asks for its whole width in a table: the cap lets the car and its price fit a 360px phone.
      className: "max-w-[10rem] min-[25rem]:max-w-[15rem] sm:min-w-[13rem] sm:max-w-[18rem]",
    },
    {
      key: "price",
      header: "Price",
      align: "right",
      nowrap: true,
      sort: (c) => c.priceEur,
      cell: (c) => (
        <span className="flex flex-col items-end">
          <span className="font-medium">{priceLabel(c)}</span>
          {isSold(c) && sales.has(c.id) ? (
            <span className="text-meta text-text-2">sold for {fmtEur(sales.get(c.id)!.priceEur)}</span>
          ) : (
            isReduced(c) && <span className="text-meta text-ok">was {fmtEur(c.wasPriceEur!)}</span>
          )}
        </span>
      ),
    },
    ...(costs ? [{ key: "margin", header: "Margin", align: "right" as const, hide: "md" as const, nowrap: true, sort: (c: Car) => (costs.has(c.id) && !onRequest(c) ? marginOf(c.priceEur, costs.get(c.id)!).eur : undefined), cell: (c: Car) => (onRequest(c) ? "" : costs.has(c.id) ? fmtEur(marginOf(c.priceEur, costs.get(c.id)!).eur) : <span className="text-text-2">Not set</span>) }] : []),
    // How long a car has been for sale: what a dealer watches to decide on a price drop.
    // The days, and a bar that turns amber at OLD_STOCK_DAYS (the old stock view): which cars are ageing, down the column at a glance.
    {
      key: "age",
      header: "In stock",
      align: "right",
      hide: "lg",
      nowrap: true,
      sort: (c) => (c.listedAt && !isSold(c) ? daysSince(c.listedAt) : undefined),
      cell: (c) =>
        c.listedAt && !isSold(c) ? (
          <span className="inline-flex items-center gap-2">
            {/* Amber exactly for the cars the old stock view counts (for sale: not reserved or hidden). */}
            <span className="hidden 2xl:contents">
              <AgeBar days={daysSince(c.listedAt)} late={forSale(c) ? OLD_STOCK_DAYS : Infinity} />
            </span>
            <span className={STOCK_VIEWS.old.test(c) ? "font-medium text-warn" : ""}>{daysInStock(c.listedAt)}</span>
          </span>
        ) : (
          <span className="text-text-2">-</span>
        ),
    },
    { key: "km", header: "Mileage", align: "right", hide: "2xl", nowrap: true, sort: (c) => c.mileageKm, cell: (c) => (c.mileageKm !== undefined ? `${fmtNum(c.mileageKm)} km` : "") },
    {
      key: "actions",
      header: "",
      hide: "sm", // on a phone the row opens the car, and its page has these at the top
      cell: (c) => (
        // Above the row's own link, so these buttons are what a press on them hits. The most used ones are in the row, labelled; the rest
        // are under More. On a smaller laptop Post and View show their icon only (CarActions), so the row fits.
        <div className="relative z-10 flex justify-end gap-2">
          {recordSale(c)}
          {social && <PostToSocial car={c} short className={rowButton} />}
          <ViewOnSite car={c} short className={rowButton} />
          {synced ? (
            <>
              {undoSale(c)}
              <a href={listingHref(c)} {...NEW_TAB} className={rowButton} aria-label={`Edit ${carName(c)} on ${LISTING_SITE} (opens in a new tab)`}>
                <PencilIcon className="size-4" />
                Edit on {LISTING_SITE}
              </a>
            </>
          ) : (
            <>
              {!isSold(c) && (
                <Link href={`/dashboard/stock/${c.id}/sale`} className={rowButton}>
                  <CheckIcon className="size-4" />
                  Mark sold
                </Link>
              )}
              <RowMenu label={`More for ${carName(c)}`}>
                <Link href={`/dashboard/stock/${c.id}`} className={rowButton}>
                  <PencilIcon className="size-4" />
                  Edit details and photos
                </Link>
                {deposits && (forSale(c) || c.reserved) && !isSold(c) && (
                  <Link href={`/dashboard/stock/${c.id}/reserve`} className={rowButton}>
                    {c.reserved ? "Deposit" : "Reserve"}
                  </Link>
                )}
                <ListingButton car={c} className={rowButton} />
                {undoSale(c)}
                {/* Back on sale only where no sale is recorded: undoing a recorded sale keeps its record (Undo sale). */}
                {isSold(c) && !sales.has(c.id) && (
                  <ActButton act={toggleSoldAction.bind(null, c.id)} confirm={{ title: `Put ${carName(c)} back on sale?`, text: c.listing ? "It stays off the website until you show it." : "It goes back on the website for sale.", yes: "Put back on sale" }} className={rowButton}>
                    Back on sale
                  </ActButton>
                )}
              </RowMenu>
            </>
          )}
        </div>
      ),
    },
  ];

  // No sort chosen: the view's own order (stock-views.ts).
  const { rows: sorted, sort } = sortRows(matching, columns, sp, { key: "", dir: "asc" });
  const paged = pageOf(sorted, sp);
  const rows = paged.rows;
  // Every filter in one panel: the make (those in stock), the fuel, the gearbox.
  const filters: FilterGroup[] = [
    { name: "make", label: "Make", any: "Every make", options: makes },
    { name: "fuel", label: "Fuel", any: "Any fuel", options: FUELS.filter((f) => all.some((c) => c.fuel === f)).map((f) => [f, FUEL_LABELS[f]] as const) },
    { name: "gearbox", label: "Gearbox", any: "Any gearbox", options: GEARBOXES.map((g) => [g, GEARBOX_LABELS[g]] as const) },
  ];

  // What needs doing about the stock, at the top, each with the button that does it. A sale is asked for while it is recent, as the
  // overview does; photos and price drops for the cars still to sell. Drafts only in our version (DoneDeal stock has none).
  const toRecord = all.filter((c) => isSold(c) && !sales.has(c.id) && daysSince(c.soldAt!) <= SALE_NUDGE_DAYS);
  const needPhotos = all.filter((c) => !isSold(c) && c.photos.length < FEW_PHOTOS);
  const old = all.filter((c) => STOCK_VIEWS.old.test(c));
  const drafts = synced ? [] : all.filter((c) => c.listing === "draft" && !isSold(c));
  const one = (cars: Car[], many: string, single: string) => (cars.length === 1 ? single : many);
  // The why under each task is for a laptop: on a phone the task and its button, so the cars are on the first screen.
  const phoneless = (text: string) => <span className="max-sm:hidden">{text}</span>;
  const todo = [
    toRecord.length > 0 && (
      <Task key="sale" urgency="now" icon={<ReceiptIcon />} count={toRecord.length} title={one(toRecord, "sold cars with no sale recorded", "sold car with no sale recorded")} detail={phoneless("Add the buyer and the price, so your reports are right.")} href={href("sold")}
        action={toRecord.length === 1 ? <Link href={`/dashboard/stock/${toRecord[0].id}/sale`} className={rowButton}>Record sale</Link> : <Link href={href("sold")} className={rowButton}>Record sales</Link>} />
    ),
    !synced && needPhotos.length > 0 && (
      <Task key="photos" urgency="soon" icon={<CameraIcon />} count={needPhotos.length} title={one(needPhotos, "cars need more photos", "car needs more photos")} detail={phoneless(`Cars with ${FEW_PHOTOS} or more photos get more enquiries.`)} href={href("photos")}
        action={<Link href={`/dashboard/stock/${needPhotos[0].id}#photos`} className={rowButton}>Add photos</Link>} />
    ),
    old.length > 0 && (
      <Task key="old" urgency="soon" icon={<HistoryIcon />} count={old.length} title={one(old, `cars for sale ${OLD_STOCK_DAYS} days or more`, `car for sale ${OLD_STOCK_DAYS} days or more`)} detail={phoneless(synced ? `Think about a price drop on ${LISTING_SITE}.` : "Tick them below to drop the price, or post them to social.")} href={href("old")}
        action={<Link href={href("old")} className={rowButton}>See them</Link>} />
    ),
    drafts.length > 0 && (
      <Task key="drafts" icon={<PencilIcon />} count={drafts.length} title={one(drafts, "drafts not on the website yet", "draft not on the website yet")} detail={phoneless("Finish them and publish when ready.")} href={href("drafts")}
        action={<Link href={href("drafts")} className={rowButton}>See drafts</Link>} />
    ),
  ].filter(Boolean);

  return (
    <>
      <PageHeader
        title="Stock"
        text={synced ? `Your cars come from ${LISTING_SITE}. Add, change and sell them there; changes show here within 15 minutes.` : "Every car on your website. Press a car to change its price, photos or details."}
        actions={
          <>
            {synced ? (
              <a href={DONEDEAL_DEALER_URL} {...NEW_TAB} className={adminButton}>
                <SyncIcon className="size-4" />
                Open {LISTING_SITE}
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            ) : (
              <Link href="/dashboard/stock/new" className={adminButton}>
                <PlusIcon className="size-4" />
                Add a car
              </Link>
            )}
          </>
        }
      />
      {sync && <SyncPanel status={sync} canForce={await can("settings")} />}
      {saved && (
        <Notice>
          Saved {carName(saved)}.
          {!synced && saved.photos.length === 0 && (
            <>
              {" "}
              <Link href={`/dashboard/stock/${saved.id}#photos`} className="font-semibold underline">Add its photos</Link>
            </>
          )}
        </Notice>
      )}
      {saleFor && (
        <Notice>
          Sale recorded for {carName(saleFor)}.
          {/* The car taken in part exchange is the next car in stock: start it from its registration. Our version only. */}
          {!synced && tradeIn && (
            <>
              {" "}
              <Link href={`/dashboard/stock/new?reg=${encodeURIComponent(tradeIn.reg)}`} className="font-semibold underline">Add the trade-in, {tradeIn.reg}, to stock</Link>
            </>
          )}
        </Notice>
      )}
      {sp.deleted && <Notice tone="neutral">Car deleted.</Notice>}
      {reservedNow && <Notice>Deposit taken. {carName(reservedNow)} shows as Reserved on the website.</Notice>}
      {undoneNow && <Notice tone="neutral">Sale undone for {carName(undoneNow)}. The record is kept.</Notice>}
      {/* DoneDeal does not say why an ad came down, so the car is hidden until the dealer says. Above the table, so a phone has it too. */}
      {takenDown.length > 0 && (
        <Panel title={`Ads taken down on ${LISTING_SITE}`}>
          <p className="max-w-measure text-body text-text-2">These cars are off the website. Did they sell?</p>
          <ul className="divide-y divide-hairline">
            {takenDown.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <span className="flex min-w-0 flex-col">
                  <span className="font-medium">{carName(c)}</span>
                  <span className="text-meta text-text-2">Ad came down {fmtDate(Date.parse(`${c.takenDownAt}T12:00:00Z`))}</span>
                </span>
                <span className="flex flex-wrap gap-2">
                  <Link href={`/dashboard/stock/${c.id}/sale`} className={rowButton}>It sold</Link>
                  <ActButton act={withdrawnAction.bind(null, c.id)} confirm={{ title: `${carName(c)} did not sell?`, text: `It stays off the website. If the ad goes back up on ${LISTING_SITE}, the car comes back too.`, yes: "It did not sell" }} className={rowButton}>
                    It did not sell
                  </ActButton>
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      )}
      {todo.length > 0 && (
        <Panel title="To do" count={todo.length}>
          <TaskList label="To do">{todo}</TaskList>
        </Panel>
      )}
      {/* Hidden and Drafts only show when they hold a car (or are open), so a dealer who never uses them never sees them. */}
      <SummaryTabs label="Stock views" items={(Object.keys(STOCK_VIEWS) as StockView[])
          .map((v) => [v, all.filter(STOCK_VIEWS[v].test).length] as const)
          .filter(([v, count]) => count > 0 || view === v || !["hidden", "drafts", "reserved"].includes(v))
          .map(([v, count]) => ({ label: STOCK_VIEWS[v].label, count, href: href(v), active: view === v }))} />
      <TableToolbar search={{ placeholder: "Search", label: "Search stock" }} filters={filters} />
      {/* Keyed by the list's address: a new search or filter starts the bar again, counting the boxes that are really ticked. */}
      {!synced && <StockBulk key={new URLSearchParams(sp as Record<string, string>).toString()} canDelete={canUndo} />}
      <DataTable
        label="Stock"
        linkRows
        rows={rows}
        rowKey={(c) => c.id}
        columns={columns}
        sort={sort}
        empty={<EmptyState title="No cars match" text={q ? "Try a different search." : undefined} action={!synced && !q ? <Link href="/dashboard/stock/new" className={adminButton}>Add a car</Link> : undefined} />}
      />
      {/* The list as it is filtered now, as a CSV: cost and margin columns only for the margins roles. */}
      <TableFooter page={paged.page} pageCount={paged.pageCount} total={paged.total} per={paged.per} exportHref="/dashboard/stock/export" />
    </>
  );
}
