import Link from "next/link";
import { Badge, DataTable, EmptyState, PageHeader, Pager, SearchBar, SummaryTabs, adminButton, paginate, rowButton, type Column } from "@/components/admin/kit";
import { ExternalIcon, PencilIcon, PlusIcon, SyncIcon } from "@/components/stock/icons";
import { NEW_TAB } from "@/components/ui";
import { costsStore } from "@/lib/admin/collections";
import { marginOf } from "@/lib/admin/margins";
import { adminCars } from "@/lib/admin/stock-admin";
import { can } from "@/lib/permissions";
import { fmtEur, fmtNum } from "@/lib/admin/format";
import { carName } from "@/lib/stock/format";
import { isSold, type Car } from "@/lib/stock/types";
import { stockSource } from "@/lib/stock-source";
import { DONEDEAL_DEALER_URL } from "@/lib/stock-source-rules";
import { SEARCH_MAKE_MODEL } from "@/lib/copy";
import { toggleSoldAction } from "./actions";

export const metadata = { title: "Stock" };

// "Today", "1 day", "23 days", from a YYYY-MM-DD listing date.
const daysIn = (listedAt: string, now = Date.now()) => {
  const d = Math.max(0, Math.floor((now - Date.parse(`${listedAt}T00:00:00Z`)) / 86_400_000));
  return d === 0 ? "Today" : d === 1 ? "1 day" : `${d} days`;
};

// The views are the summary: each is a tile with its count, and the chosen one filters the table.
const FEW_PHOTOS = 4;
const VIEWS = {
  "for-sale": { label: "For sale", test: (c: Car) => !isSold(c) },
  reduced: { label: "Reduced", test: (c: Car) => !isSold(c) && c.wasPriceEur !== undefined && c.wasPriceEur > c.priceEur },
  photos: { label: "Need photos", test: (c: Car) => !isSold(c) && c.photos.length < FEW_PHOTOS },
  sold: { label: "Sold", test: (c: Car) => isSold(c) },
  all: { label: "All", test: () => true },
} as const;
type View = keyof typeof VIEWS;

export default async function Page({ searchParams }: { searchParams: Promise<{ view?: string; status?: string; q?: string; saved?: string; deleted?: string; page?: string }> }) {
  const sp = await searchParams;
  const asked = sp.view ?? sp.status; // `status` is the old name for the view, kept so old links still work
  const view: View = asked && Object.hasOwn(VIEWS, asked) ? (asked as View) : "for-sale";
  const q = (sp.q ?? "").trim().toLowerCase().slice(0, 60);
  const [all, source] = await Promise.all([adminCars(), stockSource()]);
  const synced = source === "donedeal";
  // The margin column is for staff with the margins permission; without it the costs are not even read.
  const costs = (await can("margins")) ? new Map((await costsStore.list()).map((c) => [c.id, c.costEur])) : null;
  const matching = all
    .filter(VIEWS[view].test)
    .filter((c) => !q || `${c.make} ${c.model} ${c.variant ?? ""} ${c.year}`.toLowerCase().includes(q))
    .sort((a, b) => Number(b.id) - Number(a.id));
  const { rows, page, pageCount, total } = paginate(matching, sp.page);
  const saved = sp.saved ? all.find((c) => c.id === sp.saved) : undefined;
  const href = (v: View) => `/dashboard/stock?view=${v}${q ? `&q=${encodeURIComponent(q)}` : ""}`;
  // Where a row goes: the car's editor here, or, for synced stock, the car on the site (it is changed on DoneDeal).
  const open = (c: Car) => (synced ? `/used-cars/${c.slug}` : `/dashboard/stock/${c.id}`);

  const columns: Column<Car>[] = [
    {
      key: "car",
      header: "Car",
      cell: (c) => (
        <div className="flex min-w-0 items-center gap-3">
          <div className="h-12 w-16 shrink-0 overflow-hidden rounded-control bg-photo-bg">
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
      className: "max-w-[15rem] sm:max-w-[20rem]",
    },
    {
      key: "price",
      header: "Price",
      align: "right",
      nowrap: true,
      cell: (c) => (
        <span className="flex flex-col items-end">
          {fmtEur(c.priceEur)}
          {c.wasPriceEur !== undefined && c.wasPriceEur > c.priceEur && <span className="text-meta text-ok">was {fmtEur(c.wasPriceEur)}</span>}
        </span>
      ),
    },
    ...(costs ? [{ key: "margin", header: "Margin", align: "right" as const, hide: "md" as const, nowrap: true, cell: (c: Car) => (costs.has(c.id) ? fmtEur(marginOf(c.priceEur, costs.get(c.id)!).eur) : <span className="text-text-2">Not set</span>) }] : []),
    // How long a car has been for sale: what a dealer watches to decide on a price drop.
    { key: "age", header: "In stock", align: "right", hide: "lg", nowrap: true, cell: (c) => (c.listedAt && !isSold(c) ? daysIn(c.listedAt) : <span className="text-text-2">-</span>) },
    { key: "km", header: "Mileage", align: "right", hide: "md", nowrap: true, cell: (c) => (c.mileageKm !== undefined ? `${fmtNum(c.mileageKm)} km` : "") },
    { key: "photos", header: "Photos", align: "right", hide: "xl", cell: (c) => (c.photos.length < FEW_PHOTOS ? <span className="text-warn">{c.photos.length}</span> : c.photos.length) },
    // Only in the All view: the other views already say it.
    ...(view === "all" ? [{ key: "status", header: "Status", hide: "md" as const, cell: (c: Car) => (isSold(c) ? <Badge tone="neutral">Sold</Badge> : <Badge tone="good">For sale</Badge>) }] : []),
    {
      key: "actions",
      header: "",
      hide: "sm", // on a phone the row itself opens the car
      cell: (c) =>
        // Above the row's own link, so these buttons are what a press on them hits.
        synced ? (
          <div className="relative z-10 flex justify-end">
            <a href={DONEDEAL_DEALER_URL} {...NEW_TAB} className={rowButton}>
              DoneDeal
              <ExternalIcon className="size-4" />
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          </div>
        ) : (
          <div className="relative z-10 flex justify-end gap-2">
            <Link href={`/dashboard/stock/${c.id}`} className={rowButton} aria-label={`Edit ${carName(c)}`}>
              <PencilIcon className="size-4" />
              Edit
            </Link>
            <form action={toggleSoldAction.bind(null, c.id)}>
              <button type="submit" className={rowButton}>
                {isSold(c) ? "Back on sale" : "Mark sold"}
              </button>
            </form>
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
          synced ? (
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
          )
        }
      />
      {saved && <p role="status" className="rounded-control bg-ok-soft px-4 py-3 text-body text-ok">Saved {carName(saved)}.</p>}
      {sp.deleted && <p role="status" className="rounded-control bg-hairline px-4 py-3 text-body">Car deleted.</p>}
      <SummaryTabs label="Stock views" items={(Object.keys(VIEWS) as View[]).map((v) => ({ label: VIEWS[v].label, count: all.filter(VIEWS[v].test).length, href: href(v), active: view === v }))} />
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
