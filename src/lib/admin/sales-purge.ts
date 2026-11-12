import { and, eq, lt, sql } from "drizzle-orm";
import type { BaseSQLiteDatabase } from "drizzle-orm/sqlite-core";
import { adminDocs } from "../db/schema";
import type * as schema from "../db/schema";
import { SALE_KEEP_YEARS } from "../leads/constants";

// A sale and a deposit name the buyer (a customer, by id). Irish business records are kept six years (owner's decision, 2026-11-11), so
// after that the daily job (worker.mjs) removes the link to the buyer and keeps the figures (price, day, salesperson) for the reports.
// Each collection, with the field that dates it.
const DATED = [["sales", "$.soldOn"], ["reservations", "$.paidOn"], ["claims", "$.openedOn"]] as const;
// Relative imports only: wrangler bundles this outside Next's "@/" alias.

export async function anonymiseOldSales(db: BaseSQLiteDatabase<"async", unknown, typeof schema>, now = new Date()): Promise<number> {
  const cutoff = new Date(now);
  cutoff.setUTCFullYear(cutoff.getUTCFullYear() - SALE_KEEP_YEARS);
  const day = cutoff.toISOString().slice(0, 10);
  let done = 0;
  for (const [collection, dated] of DATED) {
    const rows = await db
      .update(adminDocs)
      .set({ data: sql`json_remove(${adminDocs.data}, '$.customerId')`, updatedAt: now })
      .where(and(eq(adminDocs.collection, collection), lt(sql`json_extract(${adminDocs.data}, ${dated})`, day), sql`json_extract(${adminDocs.data}, '$.customerId') IS NOT NULL`))
      .returning({ id: adminDocs.id });
    done += rows.length;
  }
  return done;
}
