import "server-only";
import { and, count, desc, eq, gte, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { activity, adminDocs } from "@/lib/db/schema";
import { getBindings } from "@/lib/leads/bindings";
import { currentMember } from "@/lib/permissions";
import demoCars from "@/lib/stock/demo-cars.json";
import type { Car } from "@/lib/stock/types";
import { DAY, HOUR, MINUTE } from "@/lib/time";
import { SEEDED, seedsDemoRecords } from "./docs";
import { aOrAn } from "./activity-text";
import { fmtEur } from "./format";
import { newId } from "./ids";
import { carTitleOf, rng } from "./seed-data";

// The dashboard's activity history: who changed what, and when. Written by every dashboard action through logActivity, read by
// /dashboard/activity (owners and managers). Changes only, never page views. Never what a customer wrote: a record that holds personal
// data (a lead, a booking, an alert, a subscriber, a review) is kept as its kind and id, and its name is looked up when the page is shown,
// so a deleted person leaves no name behind. A car, a post or a team member keeps its label. Kept ACTIVITY_RETENTION_MONTHS (activity-purge.ts).
export const ACTIVITY_AREAS = ["stock", "leads", "test-drives", "customers", "reviews", "marketing", "settings"] as const;
export type ActivityArea = (typeof ACTIVITY_AREAS)[number];
export const AREA_LABELS: Record<ActivityArea, string> = { stock: "Stock", leads: "Leads", "test-drives": "Test drives", customers: "Customers", reviews: "Reviews", marketing: "Marketing", settings: "Settings" };

export type RefKind = "car" | "lead" | "drive" | "alert" | "subscriber" | "review" | "post" | "ad" | "newsletter" | "team";
// The kinds whose label is personal data: never stored, looked up at show time.
export const PERSONAL_KINDS: readonly RefKind[] = ["lead", "drive", "alert", "subscriber", "review"];
export type Ref = { kind: RefKind; id: string; label?: string };
export type ActivityEntry = { id: string; at: number; actor: string; area: ActivityArea; summary: string; refKind: RefKind | null; refId: string | null; refLabel: string | null };

const hasDb = () => Boolean(getBindings().DB);
// With no D1 binding (next dev, the E2E run) the log is a list in memory, like the record store (docs.ts).
// shortcut: memory is per server instance and grows until restart. Fine for dev and tests, never used on the Worker.
let memory: ActivityEntry[] | null = null;
let seededHere = false;

const row = (at: number, actor: string, area: ActivityArea, summary: string, ref?: Ref): ActivityEntry => ({
  id: newId("act"),
  at,
  actor,
  area,
  summary,
  refKind: ref?.kind ?? null,
  refId: ref?.id ?? null,
  refLabel: ref && !PERSONAL_KINDS.includes(ref.kind) ? (ref.label ?? null) : null, // a person's name is never stored
});

// The demo's lived-in history: the made-up team at work over the last six weeks, on the seeded records (collections.ts).
function seedActivity(now = Date.now()): ActivityEntry[] {
  const r = rng(97);
  const cars = demoCars as Car[];
  const live = cars.filter((c) => !c.soldAt);
  const car = (c: Car): Ref => ({ kind: "car", id: c.id, label: carTitleOf(c) });
  const STEPS = ["New to Contacted", "Contacted to Appointment set", "Appointment set to Won", "Contacted to Lost"];
  const make: ((at: number) => ActivityEntry)[] = [
    (at) => {
      const c = r.pick(live);
      const drop = r.pick([250, 500, 750, 1000]);
      return row(at, "Aoife Brennan", "stock", `Changed the price from ${fmtEur(c.priceEur + drop)} to ${fmtEur(c.priceEur)}`, car(c));
    },
    (at) => row(at, "Aoife Brennan", "stock", "Added the car", car(r.pick(live))),
    (at) => row(at, "Conor Doyle", "leads", `Moved the lead from ${r.pick(STEPS)}`, { kind: "lead", id: `lead-${1000 + r.int(0, 27)}` }),
    (at) => row(at, "Ciara Walsh", "leads", r.pick(["Gave the lead to Conor Doyle", "Gave the lead to Aoife Brennan"]), { kind: "lead", id: `lead-${1000 + r.int(0, 27)}` }),
    (at) => row(at, "Conor Doyle", "leads", "Added a note", { kind: "lead", id: `lead-${1000 + r.int(0, 27)}` }),
    (at) => row(at, "Conor Doyle", "test-drives", "Changed the test drive from Requested to Confirmed", { kind: "drive", id: `drive-${200 + r.int(0, 15)}` }),
    (at) => {
      const c = r.pick(live);
      return row(at, "Niamh Kavanagh", "stock", `Changed the cost from ${fmtEur(Math.round(c.priceEur * 0.82))} to ${fmtEur(Math.round(c.priceEur * 0.8))}`, car(c));
    },
    (at) => row(at, "Ciara Walsh", "marketing", `Published ${aOrAn(r.pick(["Facebook", "Instagram"]))} post`, { kind: "post", id: `post-${700 + r.int(4, 8)}`, label: carTitleOf(r.pick(live)) }),
    (at) => row(at, "Aoife Brennan", "reviews", "Replied to the review", { kind: "review", id: `review-${600 + r.int(0, 9)}` }),
    (at) => row(at, "Ciara Walsh", "customers", r.pick(["Paused the stock alert", "Removed a stock alert"]), { kind: "alert", id: `alert-${400 + r.int(0, 13)}` }),
  ];
  const sold = cars.filter((c) => c.soldAt).map((c) => row(new Date(`${c.soldAt}T15:00:00Z`).getTime(), "Conor Doyle", "stock", "Marked sold", car(c)));
  const rows = Array.from({ length: 70 }, (_, i) => make[r.int(0, make.length - 1)](now - i * 14 * HOUR - r.int(5, 50) * MINUTE));
  // The stories seeded in collections.ts: the deposits, the car brought back, the newest claim and order.
  const byId = (id: string) => car(cars.find((c) => c.id === id)!);
  rows.push(
    row(now - 3 * DAY, "Conor Doyle", "stock", "Took a deposit of €1,000", byId("4710026")),
    row(now - 16 * DAY, "Aoife Brennan", "stock", "Took a deposit of €2,000", byId("4710010")),
    row(now - 14 * DAY, "Ciara Walsh", "stock", "Took the car back and refunded €9,950", byId("4710009")),
    row(now - 4 * DAY, "Aoife Brennan", "stock", "Cancelled the sale", byId("4710020")),
    row(now - 2 * DAY + HOUR, "Conor Doyle", "customers", "Opened a warranty claim", byId(cars.filter((c) => c.soldAt)[0].id)),
    row(now - 12 * DAY, "Conor Doyle", "stock", "Placed a factory order: Toyota RAV4, €1,000 deposit"),
  );
  rows.push(row(now - 20 * DAY, "Aoife Brennan", "settings", "Changed the lead reply target from 24 to 12 hours"),row(now - 33 * DAY, "Aoife Brennan", "settings", "Added Ciara Walsh to the team as Manager", { kind: "team", id: "u4", label: "Ciara Walsh" }));
  // Fixed ids, so two first visits at once insert the history once (the second insert is ignored), like the other seeds.
  return [...rows, ...sold.filter((s) => s.at > now - 45 * DAY)].map((e, i) => ({ ...e, id: `seed-${i}` }));
}

// The demo seeds its history once, the first time the log is read or written. A real dealer's log starts empty.
async function ready() {
  if (!hasDb()) {
    memory ??= seedsDemoRecords() ? seedActivity() : [];
    return;
  }
  if (seededHere || !seedsDemoRecords()) return;
  const db = getDb();
  const done = await db.select({ id: adminDocs.id }).from(adminDocs).where(and(eq(adminDocs.collection, SEEDED), eq(adminDocs.id, "activity"))).limit(1);
  if (!done.length) {
    const rows = seedActivity();
    for (let i = 0; i < rows.length; i += 10) await db.insert(activity).values(rows.slice(i, i + 10)).onConflictDoNothing(); // D1: 100 bound values a statement
    await db.insert(adminDocs).values({ collection: SEEDED, id: "activity", data: {} }).onConflictDoNothing();
  }
  seededHere = true;
}

// Records one change, by the signed-in person unless `actor` names someone else (the stock sync). Best effort: a log that cannot be
// written never stops the change it describes, and the failure is reported without the entry (it may name a car or a team member).
export async function logActivity(area: ActivityArea, summary: string, ref?: Ref, actor?: string): Promise<void> {
  try {
    const entry = row(Date.now(), actor ?? ((await currentMember()).name || "Someone"), area, summary, ref);
    await ready();
    if (!hasDb()) return void memory!.push(entry);
    await getDb().insert(activity).values(entry);
  } catch {
    console.error(JSON.stringify({ job: "activity", error: "could not record a change" }));
  }
}

export type ActivityFilter = { area?: ActivityArea; actor?: string; since?: number };
export type ActivityPage = { rows: ActivityEntry[]; total: number; byArea: Partial<Record<ActivityArea, number>>; actors: string[] };

// One page of the history, newest first, with the count per area (for the summary tiles, under the person and date filters) and everyone
// who appears in it (for the person filter).
export async function listActivity(filter: ActivityFilter, page: number, size: number): Promise<ActivityPage> {
  await ready();
  const offset = (page - 1) * size;
  if (!hasDb()) {
    const base = memory!.filter((e) => (!filter.actor || e.actor === filter.actor) && (!filter.since || e.at >= filter.since));
    // Reversed first, so entries made in the same millisecond still come newest written first (the sort keeps ties in order).
    const hits = base.filter((e) => !filter.area || e.area === filter.area).reverse().sort((a, b) => b.at - a.at);
    const byArea: ActivityPage["byArea"] = {};
    for (const e of base) byArea[e.area] = (byArea[e.area] ?? 0) + 1;
    return { rows: hits.slice(offset, offset + size), total: hits.length, byArea, actors: [...new Set(memory!.map((e) => e.actor))].sort() };
  }
  const db = getDb();
  const base = [filter.actor ? eq(activity.actor, filter.actor) : undefined, filter.since ? gte(activity.at, filter.since) : undefined];
  const where = and(...base, filter.area ? eq(activity.area, filter.area) : undefined);
  const [rows, [{ n }], areas, actors] = await Promise.all([
    db.select().from(activity).where(where).orderBy(desc(activity.at), desc(sql`rowid`)).limit(size).offset(offset), // rowid: newest written first on a tie
    db.select({ n: count() }).from(activity).where(where),
    db.select({ area: activity.area, n: count() }).from(activity).where(and(...base)).groupBy(activity.area),
    db.selectDistinct({ actor: activity.actor }).from(activity).orderBy(activity.actor),
  ]);
  return { rows: rows as ActivityEntry[], total: n, byArea: Object.fromEntries(areas.map((a) => [a.area, a.n])), actors: actors.map((a) => a.actor) };
}

// "Reset demo data": the history goes back to the seed with the rest of the demo. Demo only (the caller checks).
export async function resetActivity(): Promise<void> {
  if (!hasDb()) {
    memory = null;
    return;
  }
  const db = getDb();
  await db.delete(activity);
  await db.delete(adminDocs).where(and(eq(adminDocs.collection, SEEDED), eq(adminDocs.id, "activity")));
  seededHere = false;
}
