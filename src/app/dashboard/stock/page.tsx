import Link from "next/link";
import { Badge, DataTable, EmptyState, PageHeader, Pager, Panel, SearchBar, SummaryTabs, adminButton, paginate, rowButton, type Column, adminButtonQuiet } from "@/components/admin/kit";
import { ActButton } from "@/components/admin/ActButton";
import { ExternalIcon, PencilIcon, PlusIcon, SyncIcon } from "@/components/stock/icons";
import { NEW_TAB } from "@/components/ui";
import { carCosts } from "@/lib/admin/costs";
import { marginOf } from "@/lib/admin/margins";
import { adminCars } from "@/lib/admin/stock-admin";
import { can } from "@/lib/permissions";
import { fmtDate, fmtEur, fmtNum } from "@/lib/admin/format";
import { carName, carHref } from "@/lib/stock/format";
import { forSale, isSold, type Car } from "@/lib/stock/types";
import { stockSource } from "@/lib/stock-source";
import { DONEDEAL_DEALER_URL, listingHref } from "@/lib/stock-source-rules";
import { SyncPanel } from "@/components/admin/SyncPanel";
import { FEW_PHOTOS, STOCK_VIEWS, parseStockList, stockList, type StockView } from "@/lib/admin/stock-views";
import { salesStore } from "@/lib/admin/collections";
import { syncStatus } from "@/lib/donedeal/sync";
import { SEARCH_MAKE_MODEL } from "@/lib/copy";
import { setListingAction, toggleSoldAction, withdrawnAction } from "./actions";

export const metadata = { title: "Stock" };

// "Today", "1 day", "23 days", from a YYYY-MM-DD listing date.
const daysIn = (listedAt: string, now = Date.now()) => {
  const d = Math.max(0, Math.floor((now - Date.parse(`${listedAt}T00:00:00Z`)) / 86_400_000));
  return d === 0 ? "Today" : d === 1 ? "1 day" : `${d} days`;
};

// The views (src/lib/admin/stock-views.ts) are the summary: each is a tile with its count, and the chosen one filters the table.

export default async function Page({ searchParams }: { searchParams: Promise<{ view?: string; status?: string; q?: string; saved?: string; deleted?: string; sale?: string; reserved?: string; undone?: string; page?: string }> }) {
  const sp = await searchParams;
  const { view, q } = parseStockList(sp);
  const [all, source] = await Promise.all([adminCars(), stockSource()]);
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
  const matching = stockList(all, view, q);
  const { rows, page, pageCount, total } = paginate(matching, sp.page);
  const saved = sp.saved ? all.find((c) => c.id === sp.saved) : undefined;
  const href = (v: StockView) => `/dashboard/stock?view=${v}${q ? `&q=${encodeURIComponent(q)}` : ""}`;
  // Where a row goes: the car's editor here, or, for synced stock, the car on the site (it is changed on DoneDeal).
  // A synced car off the website (its ad came down) has no page there, so it opens here.
  const open = (c: Car) => (synced && !c.listing ? carHref(c.slug) : `/dashboard/stock/${c.id}`);
  const takenDown = synced ? all.filter((c) => c.takenDownAt) : [];
  const canUndo = await can("settings"); // undoing a sale is money going back: owners and managers
  const undoSale = (c: Car) =>
    canUndo && isSold(c) && sales.has(c.id) ? (
      <Link href={`/dashboard/stock/${c.id}/undo-sale`} className={rowButton}>
        Undo sale
      </Link>
    ) : null;
  // Hide, show or publish, with Undo in the toast. Our version only: DoneDeal stock is shown and hidden there.
  const listingButton = (c: Car) => {
    const name = carName(c);
    const [to, label, done] = c.listing === "draft" ? ["live", "Publish", `Published ${name}`] : c.listing ? ["live", "Show", `${name} is on the website again`] : ["hidden", "Hide", `Hid ${name} from the website`];
    return (
      <ActButton act={setListingAction.bind(null, c.id, to)} undo={setListingAction.bind(null, c.id, c.listing ?? "live")} done={done} className={rowButton}>
        {label}
      </ActButton>
    );
  };

  const columns: Column<Car>[] = [
    {
      key: "car",
      header: "Car",
      cell: (c) => (
        <div className="flex min-w-0 items-center gap-3">
          <div className="hidden h-12 w-16 shrink-0 overflow-hidden rounded-control bg-photo-bg min-[25rem]:block">
            {/* eslint-disable-next-line @next/next/no-img-element -- a local /stock file, sized by its box */}
            {c.photos[0] && <img src={c.photos[0].src} alt="" width={64} height={48} loading="lazy" className="size-full object-cover" />}
          </div>
          <div className="min-w-0">
            <Link href={open(c)} className="block truncate font-medium after:absolute after:inset-0">
              {c.make} {c.model}
            </Link>
            <span className="block truncate text-meta text-text-2">{[c.variant, c.year].filter(Boolean).join(" · ")}</span>
          </div>
        </div>
      ),
      // A truncated name still asks for its whole width in a table: the cap lets the car and its price fit a 360px phone.
      className: "max-w-[10rem] min-[25rem]:max-w-[15rem] sm:max-w-[20rem]",
    },
    {
      key: "price",
      header: "Price",
      align: "right",
      nowrap: true,
      cell: (c) => (
        <span className="flex flex-col items-end">
          {fmtEur(c.priceEur)}
          {isSold(c) && sales.has(c.id) ? (
            <span className="text-meta text-text-2">sold for {fmtEur(sales.get(c.id)!.priceEur)}</span>
          ) : (
            c.wasPriceEur !== undefined && c.wasPriceEur > c.priceEur && <span className="text-meta text-ok">was {fmtEur(c.wasPriceEur)}</span>
          )}
        </span>
      ),
    },
    ...(costs ? [{ key: "margin", header: "Margin", align: "right" as const, hide: "md" as const, nowrap: true, cell: (c: Car) => (costs.has(c.id) ? fmtEur(marginOf(c.priceEur, costs.get(c.id)!).eur) : <span className="text-text-2">Not set</span>) }] : []),
    // How long a car has been for sale: what a dealer watches to decide on a price drop.
    { key: "age", header: "In stock", align: "right", hide: "lg", nowrap: true, cell: (c) => (c.listedAt && !isSold(c) ? daysIn(c.listedAt) : <span className="text-text-2">-</span>) },
    { key: "km", header: "Mileage", align: "right", hide: "md", nowrap: true, cell: (c) => (c.mileageKm !== undefined ? `${fmtNum(c.mileageKm)} km` : "") },
    { key: "photos", header: "Photos", align: "right", hide: "xl", cell: (c) => (c.photos.length < FEW_PHOTOS ? <span className="text-warn">{c.photos.length}</span> : c.photos.length) },
    // Only in the All view: the other views already say it.
    ...(view === "all" ? [{ key: "status", header: "Status", hide: "md" as const, cell: (c: Car) => (c.listing === "draft" ? <Badge tone="info">Draft</Badge> : c.listing ? <Badge tone="warn">Hidden</Badge> : isSold(c) ? <Badge tone="neutral">Sold</Badge> : c.reserved ? <Badge tone="info">Reserved</Badge> : <Badge tone="good">For sale</Badge>) }] : []),
    {
      key: "actions",
      header: "",
      hide: "sm", // on a phone the row itself opens the car
      cell: (c) =>
        // Above the row's own link, so these buttons are what a press on them hits.
        synced ? (
          <div className="relative z-10 flex justify-end gap-2">
            {recordSale(c)}
            {undoSale(c)}
            <a href={listingHref(c)} {...NEW_TAB} className={rowButton} aria-label={`Edit ${carName(c)} on DoneDeal (opens in a new tab)`}>
              DoneDeal
              <ExternalIcon className="size-4" />
            </a>
          </div>
        ) : (
          <div className="relative z-10 flex justify-end gap-2">
            <Link href={`/dashboard/stock/${c.id}`} className={rowButton} aria-label={`Edit ${carName(c)}`}>
              <PencilIcon className="size-4" />
              Edit
            </Link>
            {recordSale(c)}
            {listingButton(c)}
            {undoSale(c)}
            {/* Back on sale only where no sale is recorded: undoing a recorded sale keeps its record (Undo sale). */}
            {isSold(c) && !sales.has(c.id) && (
              <ActButton act={toggleSoldAction.bind(null, c.id)} confirm={{ title: `Put ${carName(c)} back on sale?`, text: c.listing ? "It stays off the website until you show it." : "It goes back on the website for sale.", yes: "Put back on sale" }} className={rowButton}>
                Back on sale
              </ActButton>
            )}
            {(forSale(c) || c.reserved) && !isSold(c) && (
              <Link href={`/dashboard/stock/${c.id}/reserve`} className={rowButton}>
                {c.reserved ? "Deposit" : "Reserve"}
              </Link>
            )}
            {!isSold(c) && (
              <Link href={`/dashboard/stock/${c.id}/sale`} className={rowButton}>
                Mark sold
              </Link>
            )}
          </div>
        ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Stock"
        text={synced ? "Synced from DoneDeal. Add, edit and sell cars there; they update here within 15 minutes." : undefined}
        actions={
          <>
            {/* The list as it is filtered now: cost and margin columns only for the margins roles. */}
            <a href={`/dashboard/stock/export?view=${view}${q ? `&q=${encodeURIComponent(q)}` : ""}`} className={adminButtonQuiet} download>
              Export CSV
            </a>
            {synced ? (
              <a href={DONEDEAL_DEALER_URL} {...NEW_TAB} className={adminButton}>
                <SyncIcon className="size-4" />
                Open DoneDeal
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
      {saved && <p role="status" className="rounded-control bg-ok-soft px-4 py-3 text-body text-ok">Saved {carName(saved)}.</p>}
      {saleFor && (
        <p role="status" className="rounded-control bg-ok-soft px-4 py-3 text-body text-ok">
          Sale recorded for {carName(saleFor)}.
          {/* The car taken in part exchange is the next car in stock: start it from its registration. Our version only. */}
          {!synced && tradeIn && (
            <>
              {" "}
              <Link href={`/dashboard/stock/new?reg=${encodeURIComponent(tradeIn.reg)}`} className="font-semibold underline">Add the trade-in, {tradeIn.reg}, to stock</Link>
            </>
          )}
        </p>
      )}
      {sp.deleted && <p role="status" className="rounded-control bg-hairline px-4 py-3 text-body">Car deleted.</p>}
      {reservedNow && <p role="status" className="rounded-control bg-ok-soft px-4 py-3 text-body text-ok">Deposit taken. {carName(reservedNow)} shows as Reserved on the website.</p>}
      {undoneNow && <p role="status" className="rounded-control bg-hairline px-4 py-3 text-body">Sale undone for {carName(undoneNow)}. The record is kept.</p>}
      {/* DoneDeal does not say why an ad came down, so the car is hidden until the dealer says. Above the table, so a phone has it too. */}
      {takenDown.length > 0 && (
        <Panel title="Ads taken down on DoneDeal">
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
                  <ActButton act={withdrawnAction.bind(null, c.id)} confirm={{ title: `${carName(c)} did not sell?`, text: "It stays off the website. If the ad goes back up on DoneDeal, the car comes back too.", yes: "It did not sell" }} className={rowButton}>
                    It did not sell
                  </ActButton>
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      )}
      {/* Hidden and Drafts only show when they hold a car (or are open), so a dealer who never uses them never sees them. */}
      <SummaryTabs label="Stock views" items={(Object.keys(STOCK_VIEWS) as StockView[])
          .map((v) => [v, all.filter(STOCK_VIEWS[v].test).length] as const)
          .filter(([v, count]) => count > 0 || view === v || !["hidden", "drafts", "reserved"].includes(v))
          .map(([v, count]) => ({ label: STOCK_VIEWS[v].label, count, href: href(v), active: view === v }))} />
      <SearchBar action="/dashboard/stock" value={q} placeholder={SEARCH_MAKE_MODEL} label="Search stock" keep={{ view }} />
      <DataTable
        label="Stock"
        linkRows
        rows={rows}
        rowKey={(c) => c.id}
        columns={columns}
        empty={<EmptyState title="No cars match" text={q ? "Try a different search." : undefined} action={!synced && !q ? <Link href="/dashboard/stock/new" className={adminButton}>Add a car</Link> : undefined} />}
      />
      <Pager page={page} pageCount={pageCount} total={total} href={(n) => `${href(view)}&page=${n}`} />
    </>
  );
}
