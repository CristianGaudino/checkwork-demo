import "server-only";
import { logActivity } from "@/lib/admin/activity";
import { carEditSummary } from "@/lib/admin/activity-text";
import { getSettings, leaderEmails, salesStore, undoSale } from "@/lib/admin/collections";
import { defineCollection } from "@/lib/admin/docs";
import { dublinDay } from "@/lib/admin/format";
import { carTitleOf } from "@/lib/admin/seed-data";
import { adminCars, saveCar } from "@/lib/admin/stock-admin";
import { sendTo } from "@/lib/leads/mail";
import { notify } from "@/lib/admin/notifications";
import { DEMO_BAR_ENABLED } from "@/lib/demo";
import { SITE_NAME, TIME_ZONE } from "@/lib/site";
import type { Car } from "@/lib/stock/types";
import { HOUR, MINUTE } from "@/lib/time";
import { fetchListings, type FeedResult } from "./feed";
import { planSync } from "./plan";
import { LISTING_SITE } from "@/lib/stock-source-rules";

// One sync: read the dealer's DoneDeal ads, work out the changes (plan.ts), write them to the stock the site reads, and record each in the
// activity history as "DoneDeal sync". Run every 15 minutes by the Worker (worker.mjs, through /api/donedeal/sync) and by Sync now.
// A failed or held sync changes nothing: the site keeps the stock from the last good one. After an hour of failures the owners and
// managers get one email, then no more until a sync works again.
export const SYNC_ACTOR = `${LISTING_SITE} sync`;
// Where the sync runs: a site whose stock comes from DoneDeal, and wherever the demo bar is on (next dev, the E2E run: its feed changes nothing).
// The live demo has no bar and its own stock, so the route answers 404 there and the Worker skips it.
export const syncRunsHere = () => DEMO_BAR_ENABLED || process.env.NEXT_PUBLIC_STOCK_SOURCE === "donedeal";
export const ALERT_AFTER = HOUR;

export type SyncStatus = {
  id: "status";
  lastRunAt?: number;
  lastOkAt?: number;
  result?: { added: number; changed: number; takenDown: number };
  problem?: string; // why the last run changed nothing, in the dealer's words; absent when it worked
  held?: boolean; // the problem is DoneDeal's answer looking wrong; Apply anyway runs it with force
  failingSince?: number; // the first failed run of this outage
  alertedAt?: number;
};

// The demo's last sync, a few minutes ago with nothing to change (its feed is the stock itself). A real site starts with none.
const statusStore = defineCollection<SyncStatus>("donedeal-sync", () => [{ id: "status", lastRunAt: Date.now() - 6 * MINUTE, lastOkAt: Date.now() - 6 * MINUTE, result: { added: 0, changed: 0, takenDown: 0 } }]);

export const resetSyncStatus = () => statusStore.reset(); // "Reset demo data"

export async function syncStatus(): Promise<SyncStatus> {
  return (await statusStore.get("status")) ?? { id: "status" };
}

const PROBLEMS: Record<Exclude<FeedResult, { ok: true }>["reason"], string> = {
  "not-connected": `${LISTING_SITE} is not connected. Add the API key under Settings, Connected services.`,
  "not-installed": `The ${LISTING_SITE} key is set, but the connection is not switched on yet.`,
  failed: `${LISTING_SITE} did not answer.`,
};

const ref = (c: Car) => ({ kind: "car" as const, id: c.id, label: carTitleOf(c) });

export async function runSync({ force = false, now = Date.now() } = {}): Promise<SyncStatus> {
  const prev = await syncStatus();
  const feed: FeedResult = await fetchListings().catch(() => ({ ok: false, reason: "failed" }) as const);
  if (!feed.ok) return failed(prev, PROBLEMS[feed.reason], false, now);
  const today = dublinDay(now); // the Irish day, as the rest of the dashboard dates a sale
  const plan = planSync(await adminCars(), feed.listings, today, { force });
  if (plan.held) return failed(prev, `${plan.held} The site kept its stock. Check ${LISTING_SITE}, then sync again.`, true, now);
  // Car by car: one that cannot be saved (an ad whose address clashes with another car's) is skipped and counted, never stops the rest.
  // shortcut: a cron run and Sync now at the same moment both apply the plan; the stock ends the same but the history shows each change
  // twice. Fine while syncs take seconds; add a lock if it shows up.
  let skipped = 0;
  const apply = async (car: Car, summary: string) => {
    try {
      await saveCar(car);
      await logActivity("stock", summary, ref(car), SYNC_ACTOR);
      return true;
    } catch {
      skipped++;
      return false;
    }
  };
  const result = { added: 0, changed: 0, takenDown: 0 };
  for (const c of plan.added) if (await apply(c, `Added from ${LISTING_SITE}`)) result.added++;
  for (const { before, after } of plan.changed) {
    if (!(await apply(after, before.soldAt ? `Back on sale on ${LISTING_SITE}` : before.listing ? `Back on ${LISTING_SITE}` : carEditSummary(before, after)))) continue;
    result.changed++;
    // Back on sale: the sale fell through. Kept as a cancelled sale, as in our version, so the history still has it.
    const sale = before.soldAt ? await salesStore.get(after.id) : undefined;
    if (sale) await undoSale(sale, { returnedOn: today, kind: "cancelled", reason: `Listed again on ${LISTING_SITE}` });
  }
  for (const c of plan.gone) {
    if (!(await apply(c, `Hidden: the ad came down on ${LISTING_SITE}`))) continue;
    result.takenDown++;
    await notify({ kind: "taken-down", text: `Ad taken down on ${LISTING_SITE}: ${carTitleOf(c)}`, href: "/dashboard/stock" }, now);
  }
  const status: SyncStatus = { id: "status", lastRunAt: now, lastOkAt: now, result, ...(skipped && { problem: `${skipped === 1 ? "1 car" : `${skipped} cars`} from ${LISTING_SITE} could not be saved. The rest are up to date.` }) };
  await statusStore.put(status);
  return status;
}

async function failed(prev: SyncStatus, problem: string, held: boolean, now: number): Promise<SyncStatus> {
  // An outage starts at its first failed run (a site that has never synced too), and gets one email an hour in, none after it.
  const failingSince = prev.problem && prev.failingSince !== undefined ? prev.failingSince : now;
  const status: SyncStatus = { ...prev, lastRunAt: now, problem, held, failingSince };
  // In the bell once an outage starts, not every 15 minutes it lasts.
  if (failingSince === now) await notify({ kind: "sync", text: `The ${LISTING_SITE} stock did not update`, href: "/dashboard/stock" }, now);
  const due = now - failingSince >= ALERT_AFTER && !(prev.alertedAt !== undefined && prev.alertedAt >= failingSince);
  if (due && (await alertOwners(problem, prev.lastOkAt))) status.alertedAt = now;
  await statusStore.put(status);
  return status;
}

async function alertOwners(problem: string, lastOkAt?: number): Promise<boolean> {
  const to = leaderEmails((await getSettings()).team);
  const since = lastOkAt ? `since ${new Date(lastOkAt).toLocaleString("en-IE", { timeZone: TIME_ZONE, dateStyle: "medium", timeStyle: "short" })}` : "yet";
  try {
    await sendTo(to, {
      subject: `${SITE_NAME}: the ${LISTING_SITE} stock has not updated ${since}`,
      text: `${problem}\n\nThe website still shows the cars from the last update ${since}. New cars, price changes and sales on ${LISTING_SITE} will not show until it works again. Open the dealer dashboard, Stock, to see the latest attempt and to sync again.`,
    });
    return true;
  } catch {
    console.error(JSON.stringify({ job: "donedeal-sync", error: "the warning email did not go" }));
    return false;
  }
}
