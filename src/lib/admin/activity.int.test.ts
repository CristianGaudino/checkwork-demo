import { beforeEach, describe, expect, it, vi } from "vitest";
import { truncate } from "@/test/sqlite-db";

vi.mock("server-only", () => ({}));
vi.mock("react", async (orig) => ({ ...(await orig<typeof import("react")>()), cache: <T,>(fn: T) => fn }));
vi.mock("@/lib/db", () => import("@/test/sqlite-db"));
vi.mock("@/lib/leads/bindings", () => ({ getBindings: () => ({ DB: {} }) }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined }), headers: async () => ({ get: () => null }) }));
const { listActivity, logActivity, resetActivity } = await import("./activity");
const { purgeOldActivity } = await import("./activity-purge");
const { getDb } = await import("@/test/sqlite-db");

// The D1 path, on SQLite with the committed migrations.
describe("activity history (D1 path, on SQLite)", () => {
  beforeEach(async () => {
    await truncate("activity", "admin_docs");
    await resetActivity();
  });

  it("seeds the demo history once, then adds to it", async () => {
    const seeded = (await listActivity({}, 1, 1)).total;
    expect(seeded).toBeGreaterThan(50);
    await logActivity("settings", "Changed the marketing voice");
    const after = await listActivity({}, 1, 1);
    expect(after.total).toBe(seeded + 1);
    expect(after.rows[0]).toMatchObject({ actor: "Aoife Brennan", summary: "Changed the marketing voice" });
  });

  it("two first visits at once seed the history once", async () => {
    const [a] = await Promise.all([listActivity({}, 1, 1), listActivity({}, 1, 1)]);
    await resetActivity();
    await truncate("activity", "admin_docs");
    const alone = await listActivity({}, 1, 1);
    expect(a.total).toBe(alone.total);
  });

  it("filters, counts per area and pages like the memory path", async () => {
    const all = await listActivity({}, 1, 10);
    const stock = await listActivity({ area: "stock" }, 1, 500);
    expect(stock.rows.every((r) => r.area === "stock")).toBe(true);
    expect(stock.total).toBe(all.byArea.stock);
    expect(stock.byArea).toEqual(all.byArea);
    const two = await listActivity({}, 2, 10);
    expect(new Set([...all.rows, ...two.rows].map((r) => r.id)).size).toBe(20);
    expect((await listActivity({ actor: "Conor Doyle" }, 1, 500)).rows.every((r) => r.actor === "Conor Doyle")).toBe(true);
  });

  it("the daily purge deletes entries older than 12 months, and only those", async () => {
    const now = new Date("2026-11-11T03:00:00Z");
    const db = getDb();
    const { activity } = await import("@/lib/db/schema");
    await truncate("activity");
    const at = (iso: string) => new Date(iso).getTime();
    await db.insert(activity).values([
      { id: "old", at: at("2025-11-10T00:00:00Z"), actor: "A", area: "stock", summary: "x" },
      { id: "kept", at: at("2025-11-12T00:00:00Z"), actor: "A", area: "stock", summary: "x" },
    ]);
    expect(await purgeOldActivity(db as never, now)).toBe(1);
    expect((await db.select().from(activity)).map((r) => r.id)).toEqual(["kept"]);
  });
});
