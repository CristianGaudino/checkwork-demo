// The Worker entry (wrangler.jsonc "main"): OpenNext's worker, plus the daily purge of old leads and activity. OpenNext's own worker has no scheduled
// handler, so this wraps it. Plain JS on purpose: it imports .open-next/worker.js, which exists only after `opennextjs-cloudflare build`,
// so a typecheck of it would fail on a clean checkout.
import { drizzle } from "drizzle-orm/d1";
import handler from "./.open-next/worker.js";
import { purgeOldActivity } from "./src/lib/admin/activity-purge.ts";
import { purgeOldLeads } from "./src/lib/leads/purge.ts";
import { apexRedirect } from "./src/lib/redirect.ts";
import { SITE_URL } from "./src/lib/site.ts";

// OpenNext's worker exports these classes for features this site does not use; kept so the wrapper stays a drop-in.
export { BucketCachePurge, DOQueueHandler, DOShardedTagCache } from "./.open-next/worker.js";

const HOST = new URL(SITE_URL).hostname;
const SYNC_CRON = "*/15 * * * *";

// The DoneDeal sync lives in the app (src/lib/donedeal/sync.ts), so the cron calls its route through the app's own handler, with the
// CRON_KEY secret. Without the key there is nothing to run. Logs counts only.
async function syncDoneDeal(env, ctx) {
  if (!env.CRON_KEY) return;
  const res = await handler.fetch(new Request(`${SITE_URL}/api/donedeal/sync`, { method: "POST", headers: { authorization: `Bearer ${env.CRON_KEY}` } }), env, ctx);
  if (res.status === 404) return; // this site's stock is not from DoneDeal
  const body = await res.json().catch(() => null);
  console.log(JSON.stringify({ job: "donedeal-sync", status: res.status, ok: body?.ok ?? false, result: body?.result ?? null }));
}

const worker = {
  // The bare domain is a second custom domain on this Worker (wrangler.jsonc routes); it only redirects.
  fetch(request, env, ctx) {
    const to = apexRedirect(request.url, HOST);
    return to ? Response.redirect(to, 308) : handler.fetch(request, env, ctx);
  },
  // wrangler.jsonc "triggers". A failure throws, so Cloudflare marks the run failed and Workers Logs shows it.
  async scheduled(controller, env, ctx) {
    if (controller.cron === SYNC_CRON) return syncDoneDeal(env, ctx);
    const deleted = await purgeOldLeads(drizzle(env.DB), env.LEAD_PHOTOS);
    console.log(JSON.stringify({ job: "purge-leads", deleted })); // a count only, never a lead (D-08)
    console.log(JSON.stringify({ job: "purge-activity", deleted: await purgeOldActivity(drizzle(env.DB)) }));
  },
};
export default worker;
