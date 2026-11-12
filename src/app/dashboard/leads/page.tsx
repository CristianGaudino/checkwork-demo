import Link from "next/link";
import { LeadStatusBadge } from "@/components/admin/badges";
import { Avatar, Badge, DataTable, EmptyState, FilterSelect, FilterTabs, PageHeader, Pager, SummaryTabs, TableToolbar, adminButtonQuiet, paginate, sortRows, type Column } from "@/components/admin/kit";
import { can } from "@/lib/permissions";
import { LEAD_SOURCES, LEAD_STATUSES, LEAD_STATUS_LABELS, LEAD_TYPE_LABELS, getSettings, leadsStore, type Lead } from "@/lib/admin/collections";
import { dublinDay, fmtAgo, fmtDate } from "@/lib/admin/format";
import { SALES_LEAD_TYPES, countByStatus, filterLeads, followUpDue, isOpenLead, isSalesLead, parseLeadFilter } from "@/lib/admin/leads";

export const metadata = { title: "Leads" };

type Params = { status?: string; type?: string; q?: string; due?: string; late?: string; with?: string; source?: string; sort?: string; dir?: string; page?: string };

export default async function Page({ searchParams }: { searchParams: Promise<Params> }) {
  const sp = await searchParams;
  const f = parseLeadFilter(sp);
  const [everyLead, { leadSlaHours, team }] = await Promise.all([leadsStore.list(), getSettings()]);
  const all = everyLead.filter(isSalesLead);
  const counts = countByStatus(all);
  const today = dublinDay();
  const due = all.filter((l) => followUpDue(l, today)).length;
  // New leads waiting past the reply target: counted for the filter, and marked Late on their rows.
  const lateIds = new Set(filterLeads(all, { q: "", late: true }, today, leadSlaHours).map((l) => l.id));
  const late = lateIds.size;
  const STATUS_ORDER = Object.fromEntries(LEAD_STATUSES.map((s, i) => [s, i]));
  const columns: Column<Lead>[] = [
    {
      key: "who",
      header: "Who",
      sort: (l) => l.name,
      cell: (l) => (
        <span className="flex min-w-0 flex-col">
          <Link href={`/dashboard/leads/${l.id}`} title={l.name} className="line-clamp-2 font-medium text-text after:absolute after:inset-0">
            {l.name}
          </Link>
          <span className="truncate text-meta text-text-2">
            {LEAD_TYPE_LABELS[l.type]} · {l.source}
          </span>
        </span>
      ),
      className: "max-w-[14rem]",
    },
    { key: "about", header: "About", sort: (l) => l.carTitle, cell: (l) => <span title={l.carTitle ?? l.message} className="block truncate">{l.carTitle ?? <span className="text-text-2">{l.message.split("\n")[0]}</span>}</span>, className: "max-w-[16rem]", hide: "sm" },
    {
      key: "status",
      header: "Status",
      sort: (l) => STATUS_ORDER[l.status],
      nowrap: true,
      // A new lead waiting past the reply target says so, filled: it is the one to answer now.
      cell: (l) => (
        <span className="inline-flex items-center gap-1.5">
          <LeadStatusBadge status={l.status} />
          {lateIds.has(l.id) && (
            <Badge tone="bad" strong>
              Late
            </Badge>
          )}
        </span>
      ),
    },
    {
      key: "follow",
      header: "Follow up",
      hide: "md",
      nowrap: true,
      sort: (l) => (l.followUpOn && isOpenLead(l) ? l.followUpOn : undefined),
      // Overdue is late (red), today is due (amber), later is just a date.
      cell: (l) =>
        l.followUpOn && isOpenLead(l) ? (
          <span className={l.followUpOn < today ? "font-medium text-bad" : followUpDue(l, today) ? "font-medium text-warn" : ""}>{l.followUpOn === today ? "Today" : l.followUpOn < today ? `Overdue, ${fmtDate(`${l.followUpOn}T12:00:00Z`)}` : fmtDate(`${l.followUpOn}T12:00:00Z`)}</span>
        ) : null,
    },
    { key: "owner", header: "With", hide: "lg", nowrap: true, sort: (l) => l.assignedTo, cell: (l) => (l.assignedTo ? <span className="inline-flex items-center gap-2"><Avatar name={l.assignedTo} />{l.assignedTo.split(" ")[0]}</span> : <span className="text-text-2">Nobody</span>) },
    { key: "when", header: "Received", sort: (l) => l.createdAt, cell: (l) => fmtAgo(l.createdAt), align: "right", nowrap: true },
  ];
  const { rows: sorted, sort } = sortRows(filterLeads(all, f, today, leadSlaHours), columns, sp, { key: "when", dir: "desc" });
  const { rows, page, pageCount, total } = paginate(sorted, sp.page);
  // Links keep everything else in the URL (search, the other filters, the sort), so picking a status does not forget the rest.
  const href = (over: { status?: string; type?: string; due?: boolean; late?: boolean }) => {
    const p = new URLSearchParams(Object.entries(sp).filter((e): e is [string, string] => typeof e[1] === "string" && e[0] !== "page"));
    const set = (k: string, v: string | undefined) => (v ? p.set(k, v) : p.delete(k));
    if ("status" in over) set("status", over.status);
    if ("type" in over) set("type", over.type);
    if ("due" in over) set("due", over.due ? "1" : undefined);
    if ("late" in over) set("late", over.late ? "1" : undefined);
    const qs = p.toString();
    return `/dashboard/leads${qs ? `?${qs}` : ""}`;
  };

  return (
    <>
      <PageHeader
        title="Leads"
        actions={
          (await can("data")) && (
            // The list as it is filtered now. Owners and managers only.
            <a href={`/dashboard/leads/export${href({}).replace("/dashboard/leads", "")}`} className={adminButtonQuiet} download>
              Export CSV
            </a>
          )
        }
      />
      <SummaryTabs
        label="Lead status"
        items={[{ label: "All", href: href({ status: undefined }), active: !f.status, count: all.length }, ...LEAD_STATUSES.map((s) => ({ label: LEAD_STATUS_LABELS[s], href: href({ status: s }), active: f.status === s, count: counts[s] }))]}
      />
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <FilterTabs
          label="Type of lead"
          items={[{ label: "All types", href: href({ type: undefined }), active: !f.type }, ...SALES_LEAD_TYPES.map((t) => ({ label: LEAD_TYPE_LABELS[t], href: href({ type: t }), active: f.type === t }))]}
        />
      </div>
      <TableToolbar search={{ placeholder: "Search name, phone, email, car", label: "Search leads" }}>
        <FilterSelect name="with" label="Who has it" all="Anyone" options={[["none", "Nobody"], ...team.map((t) => [t.name, t.name] as const)]} />
        <FilterSelect name="source" label="Where it came from" all="Any source" options={LEAD_SOURCES.map((s) => [s, s] as const)} />
      </TableToolbar>
      <FilterTabs
        label="Needs a reply"
        items={[
          { label: "Any", href: href({ due: false, late: false }), active: !f.due && !f.late },
          { label: "Follow-ups due", href: href({ due: true, late: false }), active: Boolean(f.due), count: due },
          { label: "Past reply target", href: href({ late: true, due: false }), active: Boolean(f.late), count: late },
        ]}
      />
      <DataTable label="Leads" linkRows rows={rows} rowKey={(l) => l.id} columns={columns} sort={sort} empty={<EmptyState title="No leads match" text="Try another filter or search." />} />
      <Pager page={page} pageCount={pageCount} total={total} />
    </>
  );
}
