import { and, eq, gte, sql } from "drizzle-orm";
import type { BaseSQLiteDatabase } from "drizzle-orm/sqlite-core";
import { adminDocs } from "../db/schema";
import type * as schema from "../db/schema";
import { askDash, DASH_HOST } from "../dash-request";
import { addDays, dublinDay } from "../format";
import { BUYER_EVENTS } from "./rules";

// The nightly send of the day counts to the dealer dashboard (site API v1, POST /api/site/v1/counts), so it keeps them past this site's own
// retention. The dashboard replaces a day's counts, so sending the last 7 days every night is safe and a missed night heals itself.
// wrangler bundles this outside Next (its esbuild reads the tsconfig "@/" alias), so nothing under these imports may reach server-only or the bindings.
export const COUNTS_SEND_DAYS = 7;
const TIMEOUT_MS = 5000;

type Dash = { fetch(req: Request): Promise<Response> };
type Env = { DASH_SITE_KEY?: string; DASH_URL?: string; DASH?: Dash };

// Never throws: returns how many days the dashboard took, of how many it had. Only the names this site records go (the dashboard allow-lists them). No key, or nowhere to send: 0, quietly.
export async function sendCountsToDash(db: BaseSQLiteDatabase<"async", unknown, typeof schema>, env: Env, now = Date.now()): Promise<{ days: number; of: number }> {
  const none = { days: 0, of: 0 };
  const key = env.DASH_SITE_KEY;
  const base = env.DASH_URL || (env.DASH ? DASH_HOST : "");
  if (!key || !base) return none;
  const today = dublinDay(now);
  const from = addDays(today, -COUNTS_SEND_DAYS);
  let rows: { id: string; data: Record<string, unknown> }[];
  try {
    // Yesterday back 7 days: today is still counting, and the dashboard takes no day in the future.
    rows = await db.select({ id: adminDocs.id, data: adminDocs.data }).from(adminDocs).where(and(eq(adminDocs.collection, "feature-counts"), gte(sql`substr(${adminDocs.id}, 1, 10)`, from), sql`substr(${adminDocs.id}, 1, 10) < ${today}`));
  } catch {
    return none;
  }
  const days = new Map<string, Record<string, number>>();
  for (const { data } of rows) {
    const { day, event, count } = data as { day?: string; event?: string; count?: number };
    if (!day || !event || !BUYER_EVENTS.includes(event) || !Number.isInteger(count)) continue;
    (days.get(day) ?? days.set(day, {}).get(day)!)[event] = count!;
  }
  let sent = 0;
  for (const [day, counts] of [...days].sort()) {
    if (await post(env.DASH, new URL("/api/site/v1/counts", base), key, JSON.stringify({ day, counts }))) sent++;
  }
  return { days: sent, of: days.size };
}

// 204 is the only success. No redirects (Cloudflare Access's login page is a failure) and a timeout aborts the request.
async function post(dash: Dash | undefined, url: URL, key: string, body: string): Promise<boolean> {
  const res = await askDash(dash, new Request(url, { method: "POST", redirect: "manual", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" }, body }), TIMEOUT_MS);
  res?.body?.cancel().catch(() => {});
  return res?.status === 204;
}
