import Link from "next/link";
import { LeadStatusBadge } from "@/components/admin/badges";
import { Avatar, DataTable, EmptyState, FilterTabs, PageHeader, Pager, SearchBar, SummaryTabs, paginate } from "@/components/admin/kit";
import { LEAD_STATUSES, LEAD_STATUS_LABELS, LEAD_TYPES, LEAD_TYPE_LABELS, leadsStore } from "@/lib/admin/collections";
import { fmtAgo } from "@/lib/admin/format";
import { countByStatus, filterLeads, parseLeadFilter } from "@/lib/admin/leads";

export const metadata = { title: "Leads" };

export default async function Page({ searchParams }: { searchParams: Promise<{ status?: string; type?: string; q?: string; page?: string }> }) {
  const sp = await searchParams;
  const f = parseLeadFilter(sp);
  const all = await leadsStore.list();
  const counts = countByStatus(all);
  const { rows, page, pageCount, total } = paginate(filterLeads(all, f), sp.page);
  // Links keep the other filters, so picking a status does not forget the type or the search.
  const href = (over: { status?: string; type?: string }) => {
    const p = new URLSearchParams();
    const status = "status" in over ? over.status : f.status;
    const type = "type" in over ? over.type : f.type;
    if (status) p.set("status", status);
    if (type) p.set("type", type);
    if (f.q) p.set("q", f.q);
    const qs = p.toString();
    return `/dashboard/leads${qs ? `?${qs}` : ""}`;
  };

  return (
    <>
      <PageHeader title="Leads" />
      <SummaryTabs
        label="Lead status"
        items={[{ label: "All", href: href({ status: undefined }), active: !f.status, count: all.length }, ...LEAD_STATUSES.map((s) => ({ label: LEAD_STATUS_LABELS[s], href: href({ status: s }), active: f.status === s, count: counts[s] }))]}
      />
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <FilterTabs
          label="Type of lead"
          items={[{ label: "All types", href: href({ type: undefined }), active: !f.type }, ...LEAD_TYPES.map((t) => ({ label: LEAD_TYPE_LABELS[t], href: href({ type: t }), active: f.type === t }))]}
        />
        <SearchBar action="/dashboard/leads" value={f.q} placeholder="Search name, email, car" label="Search leads" keep={{ status: f.status, type: f.type }} />
      </div>
      <DataTable
        label="Leads"
        linkRows
        rows={rows}
        rowKey={(l) => l.id}
        columns={[
          {
            key: "who",
            header: "Who",
            cell: (l) => (
              <span className="flex min-w-0 flex-col">
                <Link href={`/dashboard/leads/${l.id}`} className="truncate font-medium after:absolute after:inset-0">
                  {l.name}
                </Link>
                <span className="truncate text-meta text-text-2">
                  {LEAD_TYPE_LABELS[l.type]} · {l.source}
                </span>
              </span>
            ),
            className: "max-w-[14rem]",
          },
          { key: "about", header: "About", cell: (l) => <span className="block truncate">{l.carTitle ?? <span className="text-text-2">{l.message}</span>}</span>, className: "max-w-[16rem]", hide: "sm" },
          { key: "status", header: "Status", cell: (l) => <LeadStatusBadge status={l.status} /> },
          { key: "owner", header: "With", hide: "lg", nowrap: true, cell: (l) => (l.assignedTo ? <span className="inline-flex items-center gap-2"><Avatar name={l.assignedTo} />{l.assignedTo.split(" ")[0]}</span> : <span className="text-text-2">Nobody</span>) },
          { key: "when", header: "When", cell: (l) => fmtAgo(l.createdAt), align: "right", nowrap: true },
        ]}
        empty={<EmptyState title="No leads match" text="Try another filter or search." />}
      />
      <Pager page={page} pageCount={pageCount} total={total} href={(n) => `${href({})}${href({}).includes("?") ? "&" : "?"}page=${n}`} />
    </>
  );
}
