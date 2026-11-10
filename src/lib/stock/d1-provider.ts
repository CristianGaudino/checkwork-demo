import "server-only";
import { getDb } from "@/lib/db";
import { cars } from "@/lib/db/schema";
import { createStockEngine } from "./engine";
import type { Car, StockProvider } from "./types";

// The stock, read from Cloudflare D1 (the `cars` table: one row per car, the whole Car as JSON). The demo seeds it with made-up cars
// (npm run stock:seed, then npm run db:seed); a site that manages its own stock writes the same rows.
// shortcut: every call works on a snapshot of the whole table, kept for 30 seconds per Worker instance and filtered in memory by the engine.
// Fine for a few hundred cars. With more, query D1 by filter and page it instead of loading it all.
const TTL_MS = 30_000;
let snapshot: { at: number; engine: StockProvider } | undefined;

async function engine(): Promise<StockProvider> {
  if (snapshot && Date.now() - snapshot.at < TTL_MS) return snapshot.engine;
  const rows = await getDb().select({ data: cars.data }).from(cars);
  snapshot = { at: Date.now(), engine: createStockEngine(rows.map((r) => r.data as Car)) };
  return snapshot.engine;
}

// The admin changed a car: the next read rebuilds the snapshot instead of waiting out the 30 seconds.
export const invalidateStockSnapshot = () => void (snapshot = undefined);

export const d1Provider: StockProvider = {
  query: async (q) => (await engine()).query(q),
  getBySlug: async (slug) => (await engine()).getBySlug(slug),
  getById: async (id) => (await engine()).getById(id),
  getByIds: async (ids) => (await engine()).getByIds(ids),
  lookup: async (slug) => (await engine()).lookup(slug),
  taxonomy: async () => (await engine()).taxonomy(),
};
