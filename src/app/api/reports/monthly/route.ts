import { cronAuthorized } from "@/lib/cron";
import { sendMonthlyReport } from "@/lib/reports/send";

const headers = { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" };

// The Worker's cron on the 1st (worker.mjs) sends last month's report through here, with CRON_KEY. The answer is a count only.
export async function POST(req: Request) {
  if (!cronAuthorized(req)) return new Response(null, { status: 404, headers });
  return Response.json(await sendMonthlyReport(), { headers });
}
