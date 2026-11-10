import Link from "next/link";
import { LeadStatusBadge } from "@/components/admin/badges";
import { DataTable, EmptyState, FilterTabs, PageHeader, adminButtonQuiet, adminInput } from "@/components/admin/kit";
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
    return `/admin/leads${qs ? `?${qs}` : ""}`;
  };

  return (
    <>
      <PageHeader title="Leads" text="Everyone who got in touch through the site, the phone or social media." />
      <FilterTabs items={[{ label: "All", href: href({ status: undefined }), active: !f.status, count: all.length }, ...LEAD_STATUSES.map((s) => ({ label: LEAD_STATUS_LABELS[s], href: href({ status: s }), active: f.status === s, count: counts[s] }))]} />
      <form action="/admin/leads" method="get" className="flex flex-wrap gap-2">
        {f.status && <input type="hidden" name="status" value={f.status} />}
        <select name="type" defaultValue={f.type ?? ""} aria-label="Type of lead" className={`${adminInput} w-48`}>
          <option value="">All types</option>
          {LEAD_TYPES.map((t) => (
            <option key={t} value={t}>
              {LEAD_TYPE_LABELS[t]}
            </option>
          ))}
        </select>
        <input name="q" defaultValue={f.q} placeholder="Search name, email, car" aria-label="Search leads" className={`${adminInput} w-64`} />
        <button type="submit" className={adminButtonQuiet}>
          Filter
        </button>
      </form>
      <DataTable
        rows={rows}
        rowKey={(l) => l.id}
        columns={[
          {
            key: "who",
            header: "Who",
            cell: (l) => (
              <Link href={`/admin/leads/${l.id}`} className="font-semibold underline-offset-2 hover:underline">
                {l.name}
              </Link>
            ),
          },
          { key: "type", header: "Type", cell: (l) => LEAD_TYPE_LABELS[l.type] },
          { key: "about", header: "About", cell: (l) => l.carTitle ?? <span className="line-clamp-1 text-text-2">{l.message}</span>, className: "max-w-[18rem]" },
          { key: "source", header: "Source", cell: (l) => l.source },
          { key: "status", header: "Status", cell: (l) => <LeadStatusBadge status={l.status} /> },
          { key: "owner", header: "With", cell: (l) => l.assignedTo ?? <span className="text-text-2">Nobody yet</span> },
          { key: "when", header: "When", cell: (l) => fmtAgo(l.createdAt), align: "right" },
        ]}
        empty={<EmptyState title="No leads match" text="Try another filter or search." />}
      />
    </>
  );
}
