import { and, eq, inArray, like, lt, sql } from "drizzle-orm";
import type { BaseSQLiteDatabase } from "drizzle-orm/sqlite-core";
import { adminDocs, leads } from "../db/schema";
import type * as schema from "../db/schema";
import { LEAD_RETENTION_MONTHS } from "./constants";

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
  // The admin's copies of website leads and alerts (src/lib/admin/real-leads.ts, the "real-" rows) go on the same day.
  const older = lt(sql`json_extract(${adminDocs.data}, '$.createdAt')`, cutoff.getTime());
  await db.delete(adminDocs).where(and(inArray(adminDocs.collection, ["leads", "alerts"]), like(adminDocs.id, "real-%"), older));
  // Every test drive, not only the website's: one staff book on the dashboard (a phone booking, "drive-...") holds the same name and contact.
  await db.delete(adminDocs).where(and(eq(adminDocs.collection, "test-drives"), older));
  // A customer (from the website or typed in on the dashboard) goes once they have not been in touch for the same period and no sale,
  // deposit, claim or order names them: a buyer stays while their records do, and leaves after the sales purge unlinks them (sales-purge.ts).
  const named = sql`(SELECT json_extract(n.data, '$.customerId') FROM admin_docs n WHERE n.collection IN ('sales', 'reservations', 'claims', 'orders') AND json_extract(n.data, '$.customerId') IS NOT NULL)`;
  await db.delete(adminDocs).where(and(eq(adminDocs.collection, "customers"), lt(sql`json_extract(${adminDocs.data}, '$.lastContactAt')`, cutoff.getTime()), sql`${adminDocs.id} NOT IN ${named}`));
  const gone = await db.delete(leads).where(lt(leads.createdAt, cutoff)).returning({ id: leads.id });
  return gone.length;
}
