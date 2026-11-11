import { sendFollowUpDigest } from "@/lib/admin/follow-up-digest";
import { cronAuthorized } from "@/lib/cron";

const headers = { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" };

// The Worker's morning cron (worker.mjs) sends the follow-up emails through here, with CRON_KEY. It sends nothing unless the dealer turned
// the email on in Settings. The answer is a count only.
export async function POST(req: Request) {
  if (!cronAuthorized(req)) return new Response(null, { status: 404, headers });
  return Response.json(await sendFollowUpDigest(), { headers });
}
