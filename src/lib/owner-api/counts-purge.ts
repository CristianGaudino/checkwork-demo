import { and, eq, lt, sql } from "drizzle-orm";
import type { BaseSQLiteDatabase } from "drizzle-orm/sqlite-core";
import { adminDocs } from "../db/schema";
import type * as schema from "../db/schema";

// The anonymous feature counts (#174) keep 13 months, enough for a year on year, then the daily job (worker.mjs) deletes the rest.
// Relative imports only: wrangler bundles this outside Next's "@/" alias.
export const COUNTS_RETENTION_MONTHS = 13;

export async function purgeOldCounts(db: BaseSQLiteDatabase<"async", unknown, typeof schema>, now = new Date()): Promise<number> {
  const cutoff = new Date(now);
  cutoff.setUTCMonth(cutoff.getUTCMonth() - COUNTS_RETENTION_MONTHS);
  const day = cutoff.toISOString().slice(0, 10);
  // A record's id starts with its day (counter-rules.ts countId), so the day is compared without reading the JSON.
  return (await db.delete(adminDocs).where(and(eq(adminDocs.collection, "feature-counts"), lt(sql`substr(${adminDocs.id}, 1, 10)`, day))).returning({ id: adminDocs.id })).length;
}
