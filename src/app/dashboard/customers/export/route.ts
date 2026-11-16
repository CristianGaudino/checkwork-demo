import { logActivity } from "@/lib/admin/activity";
import { ALERT_KIND_LABELS, alertsStore, customersStore, subscribersStore } from "@/lib/admin/collections";
import { csvResponse, toCsv } from "@/lib/admin/csv";
import { filterAlerts, filterCustomers, filterSubscribers } from "@/lib/admin/customer-lists";
import { can } from "@/lib/permissions";
import { hasModule } from "@/lib/modules";
import { dublinDay as day } from "@/lib/admin/format";

// The Customers page's list (customers, stock alerts or the newsletter), searched and filtered as it is shown, as a CSV. Personal data: owners and managers only, each export in
// the activity history.
export async function GET(req: Request) {
  if (!(await can("data"))) return new Response(null, { status: 404 });
  const sp = Object.fromEntries(new URL(req.url).searchParams);
  const tab = sp.tab;
  // Each list only with its module, as on the page: alerts and the newsletter are the newsletter's, customers are sales'.
  if (!(await hasModule(tab === "alerts" || tab === "newsletter" ? "newsletter" : "sales"))) return new Response(null, { status: 404 });
  if (tab === "alerts") {
    const rows = filterAlerts(await alertsStore.list(), sp).sort((a, b) => b.createdAt - a.createdAt);
    await logActivity("customers", `Exported the stock alerts (${rows.length})`);
    return csvResponse("stock-alerts", toCsv(rows, [["Email", (a) => a.email], ["Alert", (a) => ALERT_KIND_LABELS[a.kind]], ["For", (a) => a.criteria], ["On", (a) => (a.active ? "Yes" : "No")], ["Added", (a) => day(a.createdAt)], ["Last sent", (a) => (a.lastSentAt ? day(a.lastSentAt) : "")]]));
  }
  if (tab === "newsletter") {
    const rows = filterSubscribers(await subscribersStore.list(), sp).sort((a, b) => b.createdAt - a.createdAt);
    await logActivity("customers", `Exported the newsletter list (${rows.length})`);
    return csvResponse("newsletter", toCsv(rows, [["Email", (s) => s.email], ["Status", (s) => (s.status === "subscribed" ? "Subscribed" : "Unsubscribed")], ["Added", (s) => day(s.createdAt)]]));
  }
  const rows = filterCustomers(await customersStore.list(), sp).sort((a, b) => b.lastContactAt - a.lastContactAt);
  await logActivity("customers", `Exported the customer list (${rows.length})`);
  return csvResponse("customers", toCsv(rows, [["Name", (c) => c.name], ["Email", (c) => c.email], ["Phone", (c) => c.phone], ["Source", (c) => c.source], ["Marketing", (c) => (c.marketingConsent ? "Agreed" : "No")], ["Added", (c) => day(c.createdAt)], ["Last contact", (c) => day(c.lastContactAt)]]));
}
