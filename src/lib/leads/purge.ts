import { and, eq, lt, sql } from "drizzle-orm";
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
  // Only clears rows the removed registration lookup (#272) left behind: its 30-day plate cache and its past day counts, whose ids hold a
  // hash of the day and the visitor's address. Nothing writes them now; this keeps them from being kept forever.
  const regCutoff = now.getTime() - 30 * 86_400_000;
  await db.delete(adminDocs).where(and(eq(adminDocs.collection, "reg-cache"), lt(sql`json_extract(${adminDocs.data}, '$.at')`, regCutoff)));
  await db.delete(adminDocs).where(and(eq(adminDocs.collection, "reg-counts"), lt(adminDocs.id, `day-${now.toISOString().slice(0, 10)}`)));
  const gone = await db.delete(leads).where(lt(leads.createdAt, cutoff)).returning({ id: leads.id });
  return gone.length;
}
