import { withDevData } from "../dev-data";
import { getBindings } from "../leads/bindings";
import demoCars from "./demo-cars.json";
import extraCars from "./demo-cars-extra.json";
import { createStockEngine } from "./engine";
import { DEFAULT_QUERY } from "./query";
import type { Car, StockProvider, StockQuery } from "./types";

// Where the cars come from (D-06, the one place that names a provider): Cloudflare D1 on the Worker. With no D1 binding, which is the
// E2E run and `next dev`, the made-up demo cars in demo-cars.json stand in, the way the lead fakes do. Any other missing binding fails
// loudly: stock never quietly falls back to the file on a deployed site.
// Admin edits with no D1 binding land in memoryCars (src/lib/admin/stock-admin.ts), and the engine is rebuilt from it.
export const memoryCars: Car[] = [...(demoCars as Car[]), ...(extraCars as Car[])];
let memory = createStockEngine(memoryCars);
export const refreshMemoryStock = () => void (memory = createStockEngine(memoryCars));
const files: StockProvider = {
  query: async (q) => (await source()).query(q),
  getBySlug: async (s) => (await source()).getBySlug(s),
  getById: async (id) => (await source()).getById(id),
  getByIds: async (ids) => (await source()).getByIds(ids),
  lookup: async (s) => (await source()).lookup(s),
  taxonomy: async () => (await source()).taxonomy(),
};
// The D1 provider is server-only and loaded only where there is a binding, so tests and the memory stand-in never import it.
async function source(): Promise<StockProvider> {
  if (getBindings().DB) return (await import("./d1-provider")).d1Provider;
  if (process.env.E2E_FAKE_BACKENDS === "1" || process.env.NODE_ENV !== "production") return memory;
  throw new Error("Missing binding DB");
}

const prod: StockProvider = {
  ...files,
  // E2E only: set by playwright.config.ts for its local server, never in wrangler.jsonc, a workflow or a deploy.
  // shortcut: this branch is in every build, so if E2E_FAIL_QUERY is ever defined on the Worker (dashboard variable,
  // [vars], .dev.vars) any visitor can force the error state for that one search. Never define it there. CI checks
  // wrangler.jsonc builds only (ci.yml worker job); revisit with a build-time switch if the Worker gets more vars.
  query: (q) => {
    const fail = process.env.E2E_FAIL_QUERY;
    return fail && fail === q.q ? Promise.reject(new Error("forced failure")) : files.query(q);
  },
};
export const stock = withDevData(prod); // break-ui: the dev-only Demo / Worst case switch; returns `prod` itself outside `next dev`

// Every car at once, for the pages that need the whole stock (home, finance, sitemap, landing pages). shortcut: one query covers the
// stock while it is under 1000 cars; with a live provider page through it or ask for counts.
export const queryAll = (extra: Partial<StockQuery> = {}) => stock.query({ ...DEFAULT_QUERY, ...extra, pageSize: 1000 });

// The same, for a page that must still render when stock fails: null, and one log line with the error name only.
export const queryAllOrNull = (extra?: Partial<StockQuery>) =>
  queryAll(extra).catch((e) => (console.error("stock.query failed", e instanceof Error ? e.name : typeof e), null));

// Every car for sale of every kind (used, new and commercial), for the pages that offer a choice of any car: test drive, trade-in.
export async function everyKindOrNull() {
  const lists = await Promise.all([queryAllOrNull(), queryAllOrNull({ condition: "new" }), queryAllOrNull({ condition: "commercial" })]);
  return lists.every((l) => l === null) ? null : lists.flatMap((l) => l?.cars ?? []);
}
