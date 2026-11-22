import { and, eq, inArray, like, lt, or, sql } from "drizzle-orm";
import type { BaseSQLiteDatabase } from "drizzle-orm/sqlite-core";
import { adminDocs, leads } from "../db/schema";
import type * as schema from "../db/schema";
import { LEAD_RETENTION_MONTHS, REG_CACHE_DAYS } from "./constants";

// WhatsApp messages stay 30 days: what matters is on the lead's notes, and the panel reads the messages on every refresh.
const WHATSAPP_KEEP_DAYS = 30;
const DAY = 86_400_000;

// The retention promise on /privacy (docs/lead-retention.md): leads, and the trade-in photos they point at, go after LEAD_RETENTION_MONTHS.
// Run daily by worker.mjs. Relative imports only: wrangler bundles this outside Next's "@/" alias.
const R2_DELETE_MAX = 1000; // keys per R2 delete call

// Photos first, then the rows: if R2 fails the rows stay, so the next run still knows which photos to delete.
// Returns how many leads were deleted. It never logs what it deletes (D-08): the count is the caller's to report.
export async function purgeOldLeads(
  db: BaseSQLiteDatabase<"async", unknown, typeof schema>,
  bucket: { delete(keys: string[]): Promise<void> },
  now = new Date(),
): Promise<number> {
  const cutoff = new Date(now);
  cutoff.setUTCMonth(cutoff.getUTCMonth() - LEAD_RETENTION_MONTHS);
  const old = await db.select({ photoKeys: leads.photoKeys }).from(leads).where(lt(leads.createdAt, cutoff));
  const keys = old.flatMap((r) => r.photoKeys);
  for (let i = 0; i < keys.length; i += R2_DELETE_MAX) await bucket.delete(keys.slice(i, i + R2_DELETE_MAX));
  // Rows only get newer than the cutoff, so this deletes exactly the rows whose photos were just deleted.
  // The old /dashboard's copies of website leads and alerts (the "real-" rows in admin_docs; checkwork-dash keeps its own) go on the same day.
  const older = lt(sql`json_extract(${adminDocs.data}, '$.createdAt')`, cutoff.getTime());
  await db.delete(adminDocs).where(and(inArray(adminDocs.collection, ["leads", "alerts"]), like(adminDocs.id, "real-%"), older));
  // The WhatsApp messages about those leads go with them, and any message older than 30 days (the lead keeps its notes), so a buyer's
  // words do not outlive their lead and the panel, which reads them on every refresh, stays small.
  const chat = sql`json_extract(${adminDocs.data}, '$.leadId')`;
  await db.delete(adminDocs).where(and(eq(adminDocs.collection, "whatsapp"), or(lt(sql`json_extract(${adminDocs.data}, '$.at')`, now.getTime() - WHATSAPP_KEEP_DAYS * DAY), and(like(chat, "real-%"), sql`${chat} NOT IN (SELECT l.id FROM admin_docs l WHERE l.collection = 'leads')`))));
  // Every test drive, not only the website's: one staff booked on the old dashboard (a phone booking, "drive-...") holds the same name and contact.
  await db.delete(adminDocs).where(and(eq(adminDocs.collection, "test-drives"), older));
  // A customer (from the website or typed in on the old dashboard) goes once they have not been in touch for the same period and no sale,
  // deposit, claim or order names them: a buyer stays while their records do, and leaves after the sales purge unlinks them (sales-purge.ts).
  const named = sql`(SELECT json_extract(n.data, '$.customerId') FROM admin_docs n WHERE n.collection IN ('sales', 'reservations', 'claims', 'orders') AND json_extract(n.data, '$.customerId') IS NOT NULL)`;
  await db.delete(adminDocs).where(and(eq(adminDocs.collection, "customers"), lt(sql`json_extract(${adminDocs.data}, '$.lastContactAt')`, cutoff.getTime()), sql`${adminDocs.id} NOT IN ${named}`));
  // The registration lookup's cache (src/lib/reg-lookup.ts) and its past day counts: no plate kept longer than needed.
  const regCutoff = now.getTime() - REG_CACHE_DAYS * 86_400_000;
  await db.delete(adminDocs).where(and(eq(adminDocs.collection, "reg-cache"), lt(sql`json_extract(${adminDocs.data}, '$.at')`, regCutoff)));
  await db.delete(adminDocs).where(and(eq(adminDocs.collection, "reg-counts"), lt(adminDocs.id, `day-${now.toISOString().slice(0, 10)}`)));
  const gone = await db.delete(leads).where(lt(leads.createdAt, cutoff)).returning({ id: leads.id });
  return gone.length;
}
