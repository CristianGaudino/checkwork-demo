import { revalidatePath } from "next/cache";
import { seedsDemoRecords } from "@/lib/admin/docs";
import { resetDemoRecords } from "@/lib/admin/demo-reset";
import { cronAuthorized } from "@/lib/cron";
import { isDemoSite } from "@/lib/site";

const headers = { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" };

// The Worker's Monday cron (worker.mjs) puts the demo's made-up records back to their seed, with CRON_KEY, after the deploy moved the demo
// cars' sold dates, so a sale's day matches its car's again. The demo deploy only: anywhere else it is not there.
export async function POST(req: Request) {
  if (!cronAuthorized(req) || !isDemoSite() || !seedsDemoRecords()) return new Response(null, { status: 404, headers });
  await resetDemoRecords();
  revalidatePath("/", "layout");
  return Response.json({ ok: true }, { headers });
}
