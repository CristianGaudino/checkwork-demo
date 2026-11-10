import Link from "next/link";
import { LeadStatusBadge } from "@/components/admin/badges";
import { Avatar, DataTable, EmptyState, FilterTabs, PageHeader, adminButtonQuiet, adminInput } from "@/components/admin/kit";
import { LEAD_STATUSES, LEAD_STATUS_LABELS, LEAD_TYPES, LEAD_TYPE_LABELS, leadsStore } from "@/lib/admin/collections";
import { fmtAgo } from "@/lib/admin/format";
import { countByStatus, filterLeads, parseLeadFilter } from "@/lib/admin/leads";

export const metadata = { title: "Leads" };

export default async function Page({ searchParams }: { searchParams: Promise<{ status?: string; type?: string; q?: string }> }) {
  const f = parseLeadFilter(await searchParams);
  const all = await leadsStore.list();
  const counts = countByStatus(all);
  const rows = filterLeads(all, f);
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
      <FilterTabs items={[{ label: "All", href: href({ status: undefined }), active: !f.status, count: all.length }, ...LEAD_STATUSES.map((s) => ({ label: LEAD_STATUS_LABELS[s], href: href({ status: s }), active: f.status === s, count: counts[s] }))]} />
      <FilterTabs
        label="Type of lead"
        items={[{ label: "All types", href: href({ type: undefined }), active: !f.type, count: undefined }, ...LEAD_TYPES.map((t) => ({ label: LEAD_TYPE_LABELS[t], href: href({ type: t }), active: f.type === t }))]}
      />
      <form action="/dashboard/leads" method="get" className="flex flex-wrap gap-2">
        {f.status && <input type="hidden" name="status" value={f.status} />}
        {f.type && <input type="hidden" name="type" value={f.type} />}
        <input name="q" defaultValue={f.q} placeholder="Search name, email, car" aria-label="Search leads" className={`${adminInput} w-64`} />
        <button type="submit" className={adminButtonQuiet}>
          Search
        </button>
      </form>
      <DataTable
        linkRows
        rows={rows}
        rowKey={(l) => l.id}
        columns={[
          {
            key: "who",
            header: "Who",
            cell: (l) => (
              <Link href={`/dashboard/leads/${l.id}`} className="whitespace-nowrap font-medium after:absolute after:inset-0">
                {l.name}
              </Link>
            ),
          },
          { key: "type", header: "Type", cell: (l) => LEAD_TYPE_LABELS[l.type], hide: "md", nowrap: true },
          { key: "about", header: "About", cell: (l) => l.carTitle ?? <span className="line-clamp-1 text-text-2">{l.message}</span>, className: "max-w-[16rem]" },
          { key: "source", header: "Source", cell: (l) => l.source, hide: "xl" },
          { key: "status", header: "Status", cell: (l) => <LeadStatusBadge status={l.status} /> },
          { key: "owner", header: "With", cell: (l) => (l.assignedTo ? <span className="inline-flex items-center gap-2"><Avatar name={l.assignedTo} />{l.assignedTo}</span> : <span className="text-text-2">Nobody</span>), hide: "xl" },
          { key: "when", header: "When", cell: (l) => fmtAgo(l.createdAt), align: "right", className: "whitespace-nowrap" },
        ]}
        empty={<EmptyState title="No leads match" text="Try another filter or search." />}
      />
    </>
  );
}
