import { cronAuthorized } from "@/lib/cron";
import { sendDailyAlerts } from "@/lib/whatsapp/alerts";

const headers = { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" };

// The Worker's morning cron (worker.mjs) sends the day's WhatsApp alerts through here, with CRON_KEY: slow stock, new reviews, and on a
// Monday last week's summary. Nothing without the WhatsApp module. The answer is a count only.
export async function POST(req: Request) {
  if (!cronAuthorized(req)) return new Response(null, { status: 404, headers });
  return Response.json(await sendDailyAlerts(), { headers });
}
