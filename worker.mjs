// The Worker entry (wrangler.jsonc "main"): OpenNext's worker, plus the daily purge of old leads and counts. OpenNext's own worker has no scheduled
// handler, so this wraps it. Plain JS on purpose: it imports .open-next/worker.js, which exists only after `opennextjs-cloudflare build`,
// so a typecheck of it would fail on a clean checkout.
import { drizzle } from "drizzle-orm/d1";
import handler from "./.open-next/worker.js";
import { purgeOldCounts } from "./src/lib/counts/purge.ts";
import { purgeOldLeads } from "./src/lib/leads/purge.ts";
import { apexRedirect } from "./src/lib/redirect.ts";
import { SITE_URL } from "./src/lib/site.ts";

// OpenNext's worker exports these classes for features this site does not use; kept so the wrapper stays a drop-in.
export { BucketCachePurge, DOQueueHandler, DOShardedTagCache } from "./.open-next/worker.js";

const HOST = new URL(SITE_URL).hostname;
const worker = {
  // The bare domain is a second custom domain on this Worker (wrangler.jsonc routes); it only redirects.
  fetch(request, env, ctx) {
    const to = apexRedirect(request.url, HOST);
    return to ? Response.redirect(to, 308) : handler.fetch(request, env, ctx);
  },
  // wrangler.jsonc "triggers". A failure throws, so Cloudflare marks the run failed and Workers Logs shows it.
  // The nightly jobs each run whatever the others do, then the run fails if any did, so it shows as failed and the next night tries again.
  async scheduled(controller, env) {
    const db = drizzle(env.DB);
    const jobs = [
      ["purge-leads", "deleted", () => purgeOldLeads(db, env.LEAD_PHOTOS)], // a count only, never a lead (D-08)
      ["purge-counts", "deleted", () => purgeOldCounts(db)],
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
