// The Worker entry (wrangler.jsonc "main"): OpenNext's worker, plus the daily purge of old leads and activity. OpenNext's own worker has no scheduled
// handler, so this wraps it. Plain JS on purpose: it imports .open-next/worker.js, which exists only after `opennextjs-cloudflare build`,
// so a typecheck of it would fail on a clean checkout.
import { drizzle } from "drizzle-orm/d1";
import handler from "./.open-next/worker.js";
import { purgeOldActivity } from "./src/lib/admin/activity-purge.ts";
import { anonymiseOldSales } from "./src/lib/admin/sales-purge.ts";
import { purgeOldLeads } from "./src/lib/leads/purge.ts";
import { apexRedirect } from "./src/lib/redirect.ts";
import { SITE_URL } from "./src/lib/site.ts";

// OpenNext's worker exports these classes for features this site does not use; kept so the wrapper stays a drop-in.
export { BucketCachePurge, DOQueueHandler, DOShardedTagCache } from "./.open-next/worker.js";

const HOST = new URL(SITE_URL).hostname;
// The jobs that live in the app, by cron (wrangler.jsonc triggers): the Worker calls their route through the app's own handler with the
// CRON_KEY secret. Without the key nothing runs. A 404 means the job does not apply to this site. Logs counts only.
const APP_JOBS = {
  "*/15 * * * *": { job: "donedeal-sync", path: "/api/donedeal/sync" }, // src/lib/donedeal/sync.ts
  "0 7 * * *": { job: "follow-up-digest", path: "/api/follow-ups/digest" }, // src/lib/admin/follow-up-digest.ts, 7am or 8am Irish time
  "0 7 1 * *": { job: "monthly-report", path: "/api/reports/monthly" }, // src/lib/reports/send.ts, the 1st, 7am or 8am Irish time
  "30 6 * * 1": { job: "demo-reset", path: "/api/demo/reset" }, // the demo only: after the Monday 06:00 deploy moves the sold dates (deploy.yml)
};

async function runAppJob({ job, path }, env, ctx) {
  if (!env.CRON_KEY) return;
  const res = await handler.fetch(new Request(`${SITE_URL}${path}`, { method: "POST", headers: { authorization: `Bearer ${env.CRON_KEY}` } }), env, ctx);
  if (res.status === 404) return;
  console.log(JSON.stringify({ job, status: res.status, ...(await res.json().catch(() => ({}))) }));
}

const worker = {
  // The bare domain is a second custom domain on this Worker (wrangler.jsonc routes); it only redirects.
  fetch(request, env, ctx) {
    const to = apexRedirect(request.url, HOST);
    return to ? Response.redirect(to, 308) : handler.fetch(request, env, ctx);
  },
  // wrangler.jsonc "triggers". A failure throws, so Cloudflare marks the run failed and Workers Logs shows it.
  // The nightly jobs each run whatever the others do (photo storage being down must not stop the sales being anonymised), then the run
  // fails if any did, so it shows as failed and the next night tries again.
  async scheduled(controller, env, ctx) {
    if (APP_JOBS[controller.cron]) return runAppJob(APP_JOBS[controller.cron], env, ctx);
    const db = drizzle(env.DB);
    const jobs = [
      ["purge-leads", "deleted", () => purgeOldLeads(db, env.LEAD_PHOTOS)], // a count only, never a lead (D-08)
      ["purge-activity", "deleted", () => purgeOldActivity(db)],
      ["anonymise-sales", "done", () => anonymiseOldSales(db)],
    ];
    let failed = 0;
    for (const [job, key, run] of jobs) {
      try {
        console.log(JSON.stringify({ job, [key]: await run() }));
      } catch {
        failed++;
        console.error(JSON.stringify({ job, error: "failed" })); // never the error itself: a database error carries the values
      }
    }
    if (failed) throw new Error(`${failed} nightly job(s) failed`);
  },
};
export default worker;
