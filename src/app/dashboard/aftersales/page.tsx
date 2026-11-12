import Link from "next/link";
import { ClaimStatusBadge, CoverBadge } from "@/components/admin/badges";
import { DataTable, EmptyState, FilterSelect, PageHeader, Pager, SummaryTabs, TableToolbar, adminButton, paginate, sortRows, type Column } from "@/components/admin/kit";
import { PlusIcon } from "@/components/stock/icons";
import { CLAIM_STATUSES, claimOpen, claimsStore, customersStore, leadsStore, type Claim } from "@/lib/admin/collections";
import { openWarrantyRequests } from "@/lib/admin/leads";
import { fmtAgo, fmtDate } from "@/lib/admin/format";

export const metadata = { title: "Aftersales" };

// Warranty requests from the website, then the claims, open first. Each row opens its record; a claim's customer name is read from their
// record, so an erased customer shows none. A request becomes a claim with Open a claim on it.
const VIEWS = { open: { label: "Open", test: (c: Claim) => claimOpen(c.status) }, closed: { label: "Closed", test: (c: Claim) => !claimOpen(c.status) }, all: { label: "All", test: () => true } } as const;
type View = keyof typeof VIEWS | "requests";

export default async function Page({ searchParams }: { searchParams: Promise<{ view?: string; q?: string; cover?: string; sort?: string; dir?: string; page?: string }> }) {
  const sp = await searchParams;
  const [claims, customers, leads] = await Promise.all([claimsStore.list(), customersStore.list(), leadsStore.list()]);
  const requests = openWarrantyRequests(leads, claims);
  // Requests waiting are what to do first, so the page opens on them; with none, on the open claims.
  const view: View = sp.view === "requests" || (sp.view && Object.hasOwn(VIEWS, sp.view)) ? (sp.view as View) : requests.length ? "requests" : "open";
  const names = new Map(customers.map((c) => [c.id, c.name]));
  const q = (sp.q ?? "").trim().toLowerCase().slice(0, 60);
  const columns: Column<Claim>[] = [
    {
      key: "car",
      header: "Car",
      sort: (c) => c.carTitle,
      cell: (c) => (
        <span className="flex min-w-0 flex-col">
          <Link href={`/dashboard/aftersales/${c.id}`} title={c.carTitle} className="line-clamp-2 font-medium text-text after:absolute after:inset-0">{c.carTitle}</Link>
          <span className="truncate text-meta text-text-2">{(c.customerId && names.get(c.customerId)) || "Customer not on file"}</span>
        </span>
      ),
      className: "max-w-[12rem] sm:max-w-[20rem]",
    },
    { key: "fault", header: "Fault", hide: "lg", cell: (c) => <span title={c.fault} className="line-clamp-1 max-w-[24rem] text-text-2">{c.fault}</span> },
    { key: "cover", header: "Cover", hide: "md", sort: (c) => (c.inCover ? 0 : 1), cell: (c) => <CoverBadge inCover={c.inCover} /> },
    { key: "status", header: "Status", sort: (c) => CLAIM_STATUSES.indexOf(c.status), cell: (c) => <ClaimStatusBadge status={c.status} /> },
    { key: "opened", header: "Opened", align: "right", hide: "sm", nowrap: true, sort: (c) => c.openedOn, cell: (c) => fmtDate(`${c.openedOn}T12:00:00Z`) },
  ];
  const matching = view === "requests" ? [] : claims.filter((c) => VIEWS[view].test(c) && (!sp.cover || String(c.inCover) === sp.cover) && (!q || `${c.carTitle} ${c.fault} ${(c.customerId && names.get(c.customerId)) || ""}`.toLowerCase().includes(q)));
  const { rows: sorted, sort } = sortRows(matching, columns, sp, { key: "opened", dir: "desc" });
  const { rows, page, pageCount, total } = paginate(sorted, sp.page);
  return (
    <>
      <PageHeader
        title="Aftersales"
        text="Warranty claims on cars you sold, from the call to the repair."
        actions={
          <Link href="/dashboard/aftersales/new" className={adminButton}>
            <PlusIcon className="size-4" />
            Open a claim
          </Link>
        }
      />
      <SummaryTabs
        label="Claims"
        items={[
          { label: "Requests", count: requests.length, href: "/dashboard/aftersales?view=requests", active: view === "requests" },
          ...(Object.keys(VIEWS) as (keyof typeof VIEWS)[]).map((v) => ({ label: VIEWS[v].label, count: claims.filter(VIEWS[v].test).length, href: `/dashboard/aftersales?view=${v}`, active: view === v })),
        ]}
      />
      {view === "requests" ? (
        <DataTable
          label="Warranty requests"
          linkRows
          rows={requests}
          rowKey={(l) => l.id}
          empty={<EmptyState title="No requests waiting" text="A warranty message sent from the website shows here, to open a claim from." />}
          columns={[
            {
              key: "who",
              header: "Who",
              cell: (l) => (
                <span className="flex min-w-0 flex-col">
                  <Link href={`/dashboard/aftersales/requests/${l.id}`} title={l.name} className="line-clamp-2 font-medium after:absolute after:inset-0">{l.name}</Link>
                  <span className="truncate text-meta text-text-2">{l.carTitle ?? l.source}</span>
                </span>
              ),
              className: "max-w-[12rem] sm:max-w-[20rem]",
            },
            { key: "message", header: "Message", hide: "md", cell: (l) => <span title={l.message} className="line-clamp-1 max-w-[28rem] text-text-2">{l.message}</span> },
            { key: "received", header: "Received", align: "right", nowrap: true, cell: (l) => fmtAgo(l.createdAt) },
          ]}
        />
      ) : (
      <>
      <TableToolbar search={{ placeholder: "Search car, customer or fault", label: "Search claims" }}>
        <FilterSelect name="cover" label="Cover" all="In and out of cover" options={[["true", "In cover"], ["false", "Out of cover"]]} />
      </TableToolbar>
      <DataTable
        label="Warranty claims"
        linkRows
        rows={rows}
        rowKey={(c) => c.id}
        sort={sort}
        columns={columns}
        empty={<EmptyState title={view === "open" ? "No open claims" : "No claims"} text={view === "open" ? "A claim from the website comes in under Requests. Open one from there, or here." : undefined} />}
      />
      <Pager page={page} pageCount={pageCount} total={total} />
      </>
      )}
    </>
  );
}
