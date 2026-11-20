import { sourceText } from "@/lib/visit-rules";
import Link from "next/link";
import { LeadStatusBadge } from "@/components/admin/badges";
import { Avatar, Badge, DataTable, EmptyState, PageHeader, Panel, SummaryTabs, TableFooter, TableToolbar, Task, TaskList, pageOf, sortRows, type Column, type FilterGroup, type TaskUrgency } from "@/components/admin/kit";
import { NextStatusButton, ReachButton } from "@/components/admin/LeadActions";
import { AlertIcon, CalendarIcon, InboxIcon } from "@/components/stock/icons";
import { can } from "@/lib/permissions";
import { LEAD_SOURCES, LEAD_STATUSES, LEAD_STATUS_LABELS, LEAD_TYPE_LABELS, getSettings, leadsStore, type Lead } from "@/lib/admin/collections";
import { dublinDay, fmtAgo, fmtDate } from "@/lib/admin/format";
import { SALES_LEAD_TYPES, countByStatus, filterLeads, followUpDue, isHotLead, isOpenLead, isSalesLead, parseLeadFilter, urgentFirst } from "@/lib/admin/leads";
import { TOPICS, isUrgent, leadTags } from "@/lib/leads/contact-topics";
import { enabledModules } from "@/lib/modules";

export const metadata = { title: "Leads" };

// What each status means, in a few words under it.
const STATUS_HINTS = { new: "Not answered yet", contacted: "Answered", appointment: "Coming in", won: "Bought", lost: "Did not buy" } as const;

type Params = { status?: string; type?: string; topic?: string; q?: string; due?: string; late?: string; need?: string; with?: string; source?: string; sort?: string; dir?: string; page?: string; per?: string };

export default async function Page({ searchParams }: { searchParams: Promise<Params> }) {
  const sp = await searchParams;
  const f = parseLeadFilter(sp);
  const [everyLead, { leadSlaHours, team }, modules] = await Promise.all([leadsStore.list(), getSettings(), enabledModules()]);
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
          <Link href={`/dashboard/leads/${l.id}`} className="font-medium text-text [overflow-wrap:anywhere] after:absolute after:inset-0">
            {l.name}
          </Link>
          <span className="truncate text-meta text-text-2">
            {LEAD_TYPE_LABELS[l.type]} · {sourceText(l)}
          </span>
          {l.topic && (
            <span className={`truncate text-meta ${l.status === "new" && isUrgent(l.answers ?? {}) ? "font-medium text-warn" : "text-text-2"}`}>{leadTags(l.topic, l.answers ?? {}).join(" · ")}</span>
          )}
        </span>
      ),
      className: "max-w-[9.5rem] sm:max-w-[14rem]",
    },
    { key: "about", header: "About", sort: (l) => l.carTitle, cell: (l) => <span title={l.carTitle ?? l.message} className="line-clamp-2">{l.carTitle ?? <span className="text-text-2">{l.message.split("\n")[0]}</span>}</span>, className: "max-w-[16rem]", hide: "sm" },
    {
      key: "status",
      header: "Status",
      sort: (l) => STATUS_ORDER[l.status],
      nowrap: true,
      // A new lead waiting past the reply target says so, filled: it is the one to answer now.
      cell: (l) => (
        <span className="flex flex-col items-start gap-1">
          <span className="inline-flex items-center gap-1.5">
            <LeadStatusBadge status={l.status} type={l.type} />
            {/* Why it sits at the top of the list: urgentFirst pins these. */}
            {isHotLead(l) && <Badge tone="warn">Urgent</Badge>}
            {lateIds.has(l.id) && (
              <Badge tone="bad" strong>
                Late
              </Badge>
            )}
          </span>
          {/* The follow-up, when there is one, under the status: one place to look for what to do next. Overdue is red, today amber. */}
          {l.followUpOn && isOpenLead(l) && (
            <span className={`text-meta ${l.followUpOn < today ? "font-medium text-bad" : followUpDue(l, today) ? "font-medium text-warn" : "text-text-2"}`}>
              Follow up {l.followUpOn === today ? "today" : l.followUpOn < today ? "overdue" : fmtDate(`${l.followUpOn}T12:00:00Z`)}
            </span>
          )}
          {/* On a phone the Received column is hidden; when it came in sits here, under its status. */}
          <span className="text-meta text-text-2 sm:hidden">{fmtAgo(l.createdAt)}</span>
        </span>
      ),
    },
    { key: "owner", header: "Who has it", hide: "xl", nowrap: true, sort: (l) => l.assignedTo, cell: (l) => (l.assignedTo ? <span className="inline-flex items-center gap-2"><Avatar name={l.assignedTo} />{l.assignedTo.split(" ")[0]}</span> : <span className="text-text-2">Nobody</span>) },
    { key: "when", header: "Received", sort: (l) => l.createdAt, cell: (l) => fmtAgo(l.createdAt), align: "right", nowrap: true, hide: "sm" }, // on a phone it is in the Who column
    // The two things done most from the list: reach them the way they asked, and move it on a step. Above the row's link.
    { key: "act", header: "Next step", quietHeader: true, hide: "md", nowrap: true, cell: (l) => <span className="relative z-10 flex justify-end gap-2">{isOpenLead(l) && <ReachButton lead={l} />}<NextStatusButton lead={l} /></span> },
  ];
  const ordered = sortRows(filterLeads(all, f, today, leadSlaHours), columns, sp, { key: "when", dir: "desc" });
  // Unless a column was chosen, the urgent new ones come first.
  const sorted = sp.sort ? ordered.rows : urgentFirst(ordered.rows);
  const sort = ordered.sort;
  const paged = pageOf(sorted, sp);
  const rows = paged.rows;
  // Every filter in one panel: what kind of lead, whether it needs a reply, who has it, where it came from.
  const filters: FilterGroup[] = [
    { name: "type", label: "What they want", any: "Anything", options: SALES_LEAD_TYPES.map((t) => [t, LEAD_TYPE_LABELS[t]] as const) },
    { name: "topic", label: "Topic", any: "Any topic", options: TOPICS.filter((t) => t.id !== "bought" && (!("module" in t) || modules.has(t.module))).map((t) => [t.id, t.label] as const) }, // "bought" is filed in Aftersales
    { name: "need", label: "Needs a reply", any: "Any", options: [["due", `Follow-up due (${due})`], ["late", `Waiting too long (${late})`]] },
    { name: "with", label: "Who has it", any: "Anyone", options: [["none", "Nobody"], ...team.map((t) => [t.name, t.name] as const)] },
    { name: "source", label: "Where it came from", any: "Any source", options: LEAD_SOURCES.map((s) => [s, s] as const) },
  ];
  const canExport = await can("data");
  // A status tile keeps everything else in the URL (search, filters, sort), so picking a status does not forget the rest.
  const href = ({ status }: { status?: string }) => {
    const p = new URLSearchParams(Object.entries(sp).filter((e): e is [string, string] => typeof e[1] === "string" && e[0] !== "page"));
    if (status) p.set("status", status);
    else p.delete("status");
    const qs = p.toString();
    return `/dashboard/leads${qs ? `?${qs}` : ""}`;
  };

  // What to answer now, worked down from the top: new leads waiting too long or in a hurry and follow-ups overdue, then the other new
  // ones and today's follow-ups. On the plain list only: a filter or a search is looking for something else.
  const filtered = Boolean(f.status || f.type || f.topic || f.q || f.due || f.late || f.with || f.source || (sp.page && sp.page !== "1"));
  const todo = all
    .flatMap((l): { lead: Lead; why: string; urgency: TaskUrgency }[] => {
      if (l.status === "new") {
        const now = lateIds.has(l.id) || isHotLead(l);
        const why = lateIds.has(l.id) ? `Waiting since ${fmtAgo(l.createdAt)}, past your reply time` : isHotLead(l) ? `In a hurry: ${leadTags(l.topic!, l.answers ?? {}).join(", ")}` : `New, came in ${fmtAgo(l.createdAt)}`;
        return [{ lead: l, why, urgency: now ? "now" : "soon" }];
      }
      if (!followUpDue(l, today)) return [];
      const late = l.followUpOn! < today;
      return [{ lead: l, why: late ? `Follow-up was due ${fmtDate(`${l.followUpOn}T12:00:00Z`)}` : "Follow up today", urgency: late ? "now" : "soon" }];
    })
    .sort((a, b) => (a.urgency === b.urgency ? b.lead.createdAt - a.lead.createdAt : a.urgency === "now" ? -1 : 1));
  const SHOWN = 8;

  return (
    <>
      <PageHeader title="Leads" text="Everyone who got in touch. Answer the ones at the top first." />
      {!filtered && (
        <Panel title="To answer now" count={todo.length}>
          {todo.length === 0 ? (
            <p className="text-body text-text-2">All caught up. No new leads and no follow-ups due.</p>
          ) : (
            <TaskList label="Leads to answer now">
              {todo.slice(0, SHOWN).map(({ lead: l, why, urgency }) => (
                <Task
                  key={l.id}
                  href={`/dashboard/leads/${l.id}`}
                  urgency={urgency}
                  icon={l.status !== "new" ? <CalendarIcon /> : urgency === "now" ? <AlertIcon /> : <InboxIcon />}
                  title={`${l.name}: ${l.carTitle ?? LEAD_TYPE_LABELS[l.type]}`}
                  detail={why}
                  action={
                    <>
                      <ReachButton lead={l} />
                      <span className="contents max-sm:hidden">
                        <NextStatusButton lead={l} />
                      </span>
                    </>
                  }
                />
              ))}
            </TaskList>
          )}
          {todo.length > SHOWN && (
            <p className="flex flex-wrap gap-x-4 text-meta text-text-2">
              {todo.length - SHOWN} more waiting.
              <Link href="/dashboard/leads?status=new" className="font-medium text-text underline">New leads ({counts.new})</Link>
              {due > 0 && <Link href="/dashboard/leads?need=due" className="font-medium text-text underline">Follow-ups due ({due})</Link>}
            </p>
          )}
        </Panel>
      )}
      <SummaryTabs
        label="Lead status"
        items={[{ label: "All", href: href({ status: undefined }), active: !f.status, count: all.length }, ...LEAD_STATUSES.map((s) => ({ label: LEAD_STATUS_LABELS[s], hint: STATUS_HINTS[s], href: href({ status: s }), active: f.status === s, count: counts[s] }))]}
      />
      <TableToolbar search={{ placeholder: "Search", label: "Search leads" }} filters={filters} />
      <DataTable label="Leads" linkRows rows={rows} rowKey={(l) => l.id} columns={columns} sort={sp.sort ? sort : { key: "", dir: "desc" }} empty={<EmptyState title="No leads match" text="Try another filter or search." />} />
      {/* The list as it is filtered now, as a CSV: owners and managers only. */}
      <TableFooter page={paged.page} pageCount={paged.pageCount} total={paged.total} per={paged.per} exportHref={canExport ? "/dashboard/leads/export" : undefined} />
    </>
  );
}
