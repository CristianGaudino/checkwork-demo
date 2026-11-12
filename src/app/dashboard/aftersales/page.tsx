import Link from "next/link";
import { ClaimStatusBadge, CoverBadge } from "@/components/admin/badges";
import { DataTable, EmptyState, PageHeader, Pager, SummaryTabs, adminButton, paginate } from "@/components/admin/kit";
import { PlusIcon } from "@/components/stock/icons";
import { claimOpen, claimsStore, customersStore, type Claim } from "@/lib/admin/collections";
import { fmtDate } from "@/lib/admin/format";

export const metadata = { title: "Aftersales" };

// Warranty claims, open first. Each row opens the claim; the customer's name is read from their record, so an erased customer shows none.
const VIEWS = { open: { label: "Open", test: (c: Claim) => claimOpen(c.status) }, closed: { label: "Closed", test: (c: Claim) => !claimOpen(c.status) }, all: { label: "All", test: () => true } } as const;
type View = keyof typeof VIEWS;

export default async function Page({ searchParams }: { searchParams: Promise<{ view?: string; page?: string }> }) {
  const sp = await searchParams;
  const view: View = sp.view && Object.hasOwn(VIEWS, sp.view) ? (sp.view as View) : "open";
  const [claims, customers] = await Promise.all([claimsStore.list(), customersStore.list()]);
  const names = new Map(customers.map((c) => [c.id, c.name]));
  const { rows, page, pageCount, total } = paginate([...claims].filter(VIEWS[view].test).sort((a, b) => b.createdAt - a.createdAt), sp.page);
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
      <SummaryTabs label="Claims" items={(Object.keys(VIEWS) as View[]).map((v) => ({ label: VIEWS[v].label, count: claims.filter(VIEWS[v].test).length, href: `/dashboard/aftersales?view=${v}`, active: view === v }))} />
      <DataTable
        label="Warranty claims"
        linkRows
        rows={rows}
        rowKey={(c) => c.id}
        empty={<EmptyState title={view === "open" ? "No open claims" : "No claims"} text={view === "open" ? "A claim from the website comes in as a lead. Open one from the lead, or here." : undefined} />}
        columns={[
          {
            key: "car",
            header: "Car",
            cell: (c) => (
              <span className="flex min-w-0 flex-col">
                <Link href={`/dashboard/aftersales/${c.id}`} className="truncate font-medium after:absolute after:inset-0">{c.carTitle}</Link>
                <span className="truncate text-meta text-text-2">{(c.customerId && names.get(c.customerId)) || "Customer not on file"}</span>
              </span>
            ),
            className: "max-w-[12rem] sm:max-w-[20rem]",
          },
          { key: "fault", header: "Fault", hide: "lg", cell: (c) => <span className="line-clamp-1 max-w-[24rem] text-text-2">{c.fault}</span> },
          { key: "cover", header: "Cover", hide: "md", cell: (c) => <CoverBadge inCover={c.inCover} /> },
          { key: "status", header: "Status", cell: (c) => <ClaimStatusBadge status={c.status} /> },
          { key: "opened", header: "Opened", align: "right", hide: "sm", nowrap: true, cell: (c) => fmtDate(`${c.openedOn}T12:00:00Z`) },
        ]}
      />
      <Pager page={page} pageCount={pageCount} total={total} href={(n) => `/dashboard/aftersales?view=${view}&page=${n}`} />
    </>
  );
}
