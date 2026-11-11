import { and, eq, lt, sql } from "drizzle-orm";
import type { BaseSQLiteDatabase } from "drizzle-orm/sqlite-core";
import { adminDocs } from "../db/schema";
import type * as schema from "../db/schema";
import { SALE_KEEP_YEARS } from "../leads/constants";

// A sale names its buyer (a customer, by id). Irish business records are kept six years (owner's decision, 2026-11-11), so after that the
// daily job (worker.mjs) removes the link to the buyer and keeps the figures (price, day, salesperson) for the reports.
// Relative imports only: wrangler bundles this outside Next's "@/" alias.

export async function anonymiseOldSales(db: BaseSQLiteDatabase<"async", unknown, typeof schema>, now = new Date()): Promise<number> {
  const cutoff = new Date(now);
  cutoff.setUTCFullYear(cutoff.getUTCFullYear() - SALE_KEEP_YEARS);
  const day = cutoff.toISOString().slice(0, 10);
  const done = await db
    .update(adminDocs)
    .set({ data: sql`json_remove(${adminDocs.data}, '$.customerId')`, updatedAt: now })
    .where(and(eq(adminDocs.collection, "sales"), lt(sql`json_extract(${adminDocs.data}, '$.soldOn')`, day), sql`json_extract(${adminDocs.data}, '$.customerId') IS NOT NULL`))
    .returning({ id: adminDocs.id });
  return done.length;
}
