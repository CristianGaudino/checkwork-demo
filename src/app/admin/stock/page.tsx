import Link from "next/link";
import { Badge, DataTable, EmptyState, FilterTabs, PageHeader, adminButton, adminButtonQuiet, adminInput, type Column } from "@/components/admin/kit";
import { adminCars } from "@/lib/admin/stock-admin";
import { fmtEur, fmtNum } from "@/lib/admin/format";
import { priceInfo } from "@/lib/stock/price";
import { carName } from "@/lib/stock/format";
import { isSold, type Car } from "@/lib/stock/types";
import { deleteCarAction, toggleSoldAction } from "./actions";

export const metadata = { title: "Stock" };

const FILTERS = [["for-sale", "For sale"], ["sold", "Sold"], ["all", "All"]] as const;

export default async function Page({ searchParams }: { searchParams: Promise<{ status?: string; q?: string; saved?: string; deleted?: string }> }) {
  const sp = await searchParams;
  const status = FILTERS.some(([k]) => k === sp.status) ? sp.status! : "for-sale";
  const q = (sp.q ?? "").trim().toLowerCase().slice(0, 60);
  const all = await adminCars();
  const counts = { "for-sale": all.filter((c) => !isSold(c)).length, sold: all.filter(isSold).length, all: all.length };
  const rows = all
    .filter((c) => status === "all" || (status === "sold") === isSold(c))
    .filter((c) => !q || `${c.make} ${c.model} ${c.variant ?? ""} ${c.year}`.toLowerCase().includes(q))
    .sort((a, b) => Number(b.id) - Number(a.id));
  const saved = sp.saved ? all.find((c) => c.id === sp.saved) : undefined;

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
            <Link href={`/admin/stock/${c.id}`} className="block truncate font-semibold underline-offset-2 hover:underline">
              {c.make} {c.model}
            </Link>
            <span className="block truncate text-meta text-text-2">{[c.variant, c.year].filter(Boolean).join(" · ")}</span>
          </div>
        </div>
      ),
      className: "max-w-[22rem]",
    },
    { key: "price", header: "Price", align: "right", cell: (c) => (priceInfo(c).was ? <span>{fmtEur(c.priceEur)} <Badge tone="good">Reduced</Badge></span> : fmtEur(c.priceEur)) },
    { key: "km", header: "Mileage", align: "right", hide: "md", cell: (c) => (c.mileageKm !== undefined ? `${fmtNum(c.mileageKm)} km` : "") },
    { key: "status", header: "Status", hide: "md", cell: (c) => (isSold(c) ? <Badge tone="neutral">Sold</Badge> : <Badge tone="good">For sale</Badge>) },
    {
      key: "actions",
      header: "Actions",
      cell: (c) => (
        <div className="flex gap-3 whitespace-nowrap">
          <Link href={`/admin/stock/${c.id}`} className="inline-flex min-h-11 items-center text-meta font-semibold underline">
            Edit
          </Link>
          <form action={toggleSoldAction.bind(null, c.id)}>
            <button type="submit" className="min-h-11 text-meta font-semibold underline">
              {isSold(c) ? "Put back on sale" : "Mark sold"}
            </button>
          </form>
          <Link href={`/used-cars/${c.slug}`} aria-label={`View ${carName(c)} on the site`} className="inline-flex min-h-11 items-center text-meta underline">
            View
          </Link>
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader title="Stock" text="Every car on the site. Changes show on the site within seconds." actions={<Link href="/admin/stock/new" className={adminButton}>Add a car</Link>} />
      {saved && <p role="status" className="rounded-control bg-better/15 px-4 py-3 text-body text-better">Saved {carName(saved)}.</p>}
      {sp.deleted && <p role="status" className="rounded-control bg-hairline px-4 py-3 text-body">Car deleted.</p>}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <FilterTabs items={FILTERS.map(([k, label]) => ({ label, count: counts[k], href: `/admin/stock?status=${k}${q ? `&q=${encodeURIComponent(q)}` : ""}`, active: status === k }))} />
        <form action="/admin/stock" method="get" className="flex w-full gap-2 sm:w-auto">
          <input type="hidden" name="status" value={status} />
          <input name="q" defaultValue={q} placeholder="Search make or model" aria-label="Search stock" className={`${adminInput} min-w-0 flex-1 sm:w-56 sm:flex-none`} />
          <button type="submit" className={adminButtonQuiet}>Search</button>
        </form>
      </div>
      <DataTable
        rows={rows}
        rowKey={(c) => c.id}
        columns={columns}
        empty={<EmptyState title="No cars match" text={q ? "Try a different search." : "Add a car to get started."} action={<Link href="/admin/stock/new" className={adminButton}>Add a car</Link>} />}
      />
      <details className="text-meta text-text-2">
        <summary className="min-h-11 cursor-pointer py-3">Delete a car for good</summary>
        <p className="mb-2 max-w-[65ch]">Marking a car sold is usually what you want: it stays on the site as Sold for a while. Deleting removes it at once, and its link stops working.</p>
        <ul className="flex flex-col gap-1">
          {rows.slice(0, 20).map((c) => (
            <li key={c.id}>
              <form action={deleteCarAction.bind(null, c.id)} className="flex items-center justify-between gap-3">
                <span className="truncate">{carName(c)}</span>
                <button type="submit" className="min-h-11 font-semibold text-destructive underline">Delete</button>
              </form>
            </li>
          ))}
        </ul>
      </details>
    </>
  );
}
