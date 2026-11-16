import "server-only";
import { getSettings, leaderEmails } from "@/lib/admin/collections";
import { dublinDay, fmtNum } from "@/lib/admin/format";
import { monthLabel } from "@/lib/admin/reports";
import { sendTo } from "@/lib/leads/mail";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { loadReportData } from "./load";
import { hasModule } from "@/lib/modules";
import { advice, compare, fmtWait, monthBefore, monthRange, summarise } from "./monthly";

// The email on the 1st (worker.mjs, /api/reports/monthly): last month's figures to the owners and managers. Counts only, never a customer.
export async function sendMonthlyReport(now = Date.now()): Promise<{ month: string; sent: number }> {
  const month = monthBefore(dublinDay(now).slice(0, 7));
  // The report is a dashboard page: a dealer without the dashboard (#173) gets no email pointing at it.
  if (!(await hasModule("dashboard"))) return { month, sent: 0 };
  const { team } = await getSettings();
  const to = leaderEmails(team);
  if (!to.length) return { month, sent: 0 };
  const data = await loadReportData();
  const at = (m: string) => summarise(data, monthRange(m).from, monthRange(m).to, now);
  const s = at(month);
  const p = at(monthBefore(month));
  const text = [
    `${monthLabel(month)} on ${SITE_NAME}`,
    "",
    `Leads: ${fmtNum(s.leads.total)} (${compare(s.leads.total, p.leads.total)}), ${fmtNum(s.leads.outOfHours)} out of hours`,
    `First reply, median: ${fmtWait(s.replies.medianInHoursMin)} in hours, ${fmtWait(s.replies.medianOutOfHoursMin)} out of hours; ${fmtNum(s.replies.none)} with no reply in 24 hours`,
    `Cars: ${fmtNum(s.stock.added)} added, ${fmtNum(s.stock.sold)} sold, ${fmtNum(s.stock.over45Days)} over 45 days`,
    `Reviews: ${fmtNum(s.reviews.count)} new`,
    "",
    advice(s),
    "",
    `The full report: ${SITE_URL}/dashboard/monthly-report?month=${month}`,
  ].join("\n");
  try {
    await sendTo(to, { subject: `${SITE_NAME}: your report for ${monthLabel(month)}`, text });
    return { month, sent: to.length };
  } catch {
    console.error(JSON.stringify({ job: "monthly-report", error: "the email did not go" }));
    return { month, sent: 0 };
  }
}
