import { logActivity } from "@/lib/admin/activity";
import { LEAD_STATUS_LABELS, LEAD_TYPE_LABELS, leadsStore } from "@/lib/admin/collections";
import { csvResponse, toCsv } from "@/lib/admin/csv";
import { dublinDateTime, dublinDay } from "@/lib/admin/format";
import { filterLeads, parseLeadFilter } from "@/lib/admin/leads";
import { can } from "@/lib/permissions";

// The leads list as a CSV, with the list's filters. Personal data: owners and managers only, and each export is in the activity history.
export async function GET(req: Request) {
  if (!(await can("data"))) return new Response(null, { status: 404 });
  const sp = Object.fromEntries(new URL(req.url).searchParams);
  const today = dublinDay();
  const rows = filterLeads(await leadsStore.list(), parseLeadFilter(sp), today);
  await logActivity("leads", `Exported the leads list (${rows.length === 1 ? "1 lead" : `${rows.length} leads`})`);
  return csvResponse(
    "leads",
    toCsv(rows, [
      ["Received", (l) => dublinDateTime(l.createdAt)],
      ["Name", (l) => l.name],
      ["Email", (l) => l.email],
      ["Phone", (l) => l.phone],
      ["Type", (l) => LEAD_TYPE_LABELS[l.type]],
      ["Source", (l) => l.source],
      ["Status", (l) => LEAD_STATUS_LABELS[l.status]],
      ["Car", (l) => l.carTitle],
      ["Registration", (l) => l.reg],
      ["Message", (l) => l.message],
      ["With", (l) => l.assignedTo],
      ["Follow up", (l) => l.followUpOn],
    ]),
  );
}
