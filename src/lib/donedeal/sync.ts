import "server-only";
import { logActivity } from "@/lib/admin/activity";
import { carEditSummary } from "@/lib/admin/activity-text";
import { getSettings, salesStore } from "@/lib/admin/collections";
import { defineCollection } from "@/lib/admin/docs";
import { carTitleOf } from "@/lib/admin/seed-data";
import { adminCars, saveCar } from "@/lib/admin/stock-admin";
import { sendTo } from "@/lib/leads/mail";
import { DEMO_BAR_ENABLED } from "@/lib/demo";
import { SITE_NAME } from "@/lib/site";
import type { Car } from "@/lib/stock/types";
import { HOUR, MINUTE } from "@/lib/time";
import { fetchListings, type FeedResult } from "./feed";
import { planSync } from "./plan";

// One sync: read the dealer's DoneDeal ads, work out the changes (plan.ts), write them to the stock the site reads, and record each in the
// activity history as "DoneDeal sync". Run every 15 minutes by the Worker (worker.mjs, through /api/donedeal/sync) and by Sync now.
// A failed or held sync changes nothing: the site keeps the stock from the last good one. After an hour of failures the owners and
// managers get one email, then no more until a sync works again.
export const SYNC_ACTOR = "DoneDeal sync";
// Where the sync runs: a site whose stock comes from DoneDeal, and the demo (which shows both versions; its feed changes nothing).
export const syncRunsHere = () => DEMO_BAR_ENABLED || process.env.NEXT_PUBLIC_STOCK_SOURCE === "donedeal";
export const ALERT_AFTER = HOUR;

export type SyncStatus = {
  id: "status";
  lastRunAt?: number;
  lastOkAt?: number;
  result?: { added: number; changed: number; sold: number };
  problem?: string; // why the last run changed nothing, in the dealer's words; absent when it worked
  held?: boolean; // the problem is DoneDeal's answer looking wrong; Apply anyway runs it with force
  failingSince?: number; // the first failed run of this outage
  alertedAt?: number;
};

// The demo's last sync, a few minutes ago with nothing to change (its feed is the stock itself). A real site starts with none.
const statusStore = defineCollection<SyncStatus>("donedeal-sync", () => [{ id: "status", lastRunAt: Date.now() - 6 * MINUTE, lastOkAt: Date.now() - 6 * MINUTE, result: { added: 0, changed: 0, sold: 0 } }]);

export const resetSyncStatus = () => statusStore.reset(); // "Reset demo data"

export async function syncStatus(): Promise<SyncStatus> {
  return (await statusStore.get("status")) ?? { id: "status" };
}

const PROBLEMS: Record<Exclude<FeedResult, { ok: true }>["reason"], string> = {
  "not-connected": "DoneDeal is not connected. Add the API key under Settings, Connected services.",
  "not-installed": "The DoneDeal key is set, but the connection is not switched on yet.",
  failed: "DoneDeal did not answer.",
};

const ref = (c: Car) => ({ kind: "car" as const, id: c.id, label: carTitleOf(c) });

export async function runSync({ force = false, now = Date.now() } = {}): Promise<SyncStatus> {
  const prev = await syncStatus();
  const feed: FeedResult = await fetchListings().catch(() => ({ ok: false, reason: "failed" }) as const);
  if (!feed.ok) return failed(prev, PROBLEMS[feed.reason], false, now);
  const today = new Date(now).toISOString().slice(0, 10);
  const plan = planSync(await adminCars(), feed.listings, today, { force });
  if (plan.held) return failed(prev, `${plan.held} The site kept its stock. Check DoneDeal, then sync again.`, true, now);
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
  const result = { added: 0, changed: 0, sold: 0 };
  for (const c of plan.added) if (await apply(c, "Added from DoneDeal")) result.added++;
  for (const { before, after } of plan.changed) {
    if (!(await apply(after, before.soldAt ? "Back on sale on DoneDeal" : carEditSummary(before, after)))) continue;
    result.changed++;
    if (before.soldAt) await salesStore.remove(after.id); // back on sale: the sale fell through, as Back on sale does in our version
  }
  for (const c of plan.gone) if (await apply(c, "Marked sold: no longer on DoneDeal")) result.sold++;
  const status: SyncStatus = { id: "status", lastRunAt: now, lastOkAt: now, result, ...(skipped && { problem: `${skipped === 1 ? "1 car" : `${skipped} cars`} from DoneDeal could not be saved. The rest are up to date.` }) };
  await statusStore.put(status);
  return status;
}

async function failed(prev: SyncStatus, problem: string, held: boolean, now: number): Promise<SyncStatus> {
  // An outage starts at its first failed run (a site that has never synced too), and gets one email an hour in, none after it.
  const failingSince = prev.problem && prev.failingSince !== undefined ? prev.failingSince : now;
  const status: SyncStatus = { ...prev, lastRunAt: now, problem, held, failingSince };
  const due = now - failingSince >= ALERT_AFTER && !(prev.alertedAt !== undefined && prev.alertedAt >= failingSince);
  if (due && (await alertOwners(problem, prev.lastOkAt))) status.alertedAt = now;
  await statusStore.put(status);
  return status;
}

// The owners and managers on the team, and the owners named in ADMIN_OWNER_EMAILS. Never a customer address.
async function alertOwners(problem: string, lastOkAt?: number): Promise<boolean> {
  const { team } = await getSettings();
  const to = [...new Set([...team.filter((t) => t.role === "Owner" || t.role === "Manager").map((t) => t.email), ...(process.env.ADMIN_OWNER_EMAILS ?? "").split(",")].map((e) => e.trim().toLowerCase()).filter(Boolean))];
  const since = lastOkAt ? `since ${new Date(lastOkAt).toLocaleString("en-IE", { timeZone: "Europe/Dublin", dateStyle: "medium", timeStyle: "short" })}` : "yet";
  try {
    await sendTo(to, {
      subject: `${SITE_NAME}: the DoneDeal stock has not updated ${since}`,
      text: `${problem}\n\nThe website still shows the cars from the last update ${since}. New cars, price changes and sales on DoneDeal will not show until it works again. Open the dealer dashboard, Stock, to see the latest attempt and to sync again.`,
    });
    return true;
  } catch {
    console.error(JSON.stringify({ job: "donedeal-sync", error: "the warning email did not go" }));
    return false;
  }
}
