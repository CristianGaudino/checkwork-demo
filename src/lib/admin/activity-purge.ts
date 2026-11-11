import { lt } from "drizzle-orm";
import type { BaseSQLiteDatabase } from "drizzle-orm/sqlite-core";
import { activity } from "../db/schema";
import type * as schema from "../db/schema";

// The activity history keeps a year (owner's decision, 2026-11-11), then the daily job (worker.mjs) deletes the rest.
// Relative imports only: wrangler bundles this outside Next's "@/" alias.
export const ACTIVITY_RETENTION_MONTHS = 12;

export async function purgeOldActivity(db: BaseSQLiteDatabase<"async", unknown, typeof schema>, now = new Date()): Promise<number> {
  const cutoff = new Date(now);
  cutoff.setUTCMonth(cutoff.getUTCMonth() - ACTIVITY_RETENTION_MONTHS);
  return (await db.delete(activity).where(lt(activity.at, cutoff.getTime())).returning({ id: activity.id })).length;
}
