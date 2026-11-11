import { beforeEach, describe, expect, it, vi } from "vitest";
import { truncate } from "@/test/sqlite-db";

vi.mock("@/lib/db", () => import("@/test/sqlite-db"));
const { getDb } = await import("@/test/sqlite-db");
const { adminDocs } = await import("@/lib/db/schema");
const { anonymiseOldSales } = await import("./sales-purge");

describe("anonymiseOldSales", () => {
  beforeEach(() => truncate("admin_docs"));

  it("removes the buyer from sales older than six years, keeps the figures, and leaves newer sales and other records alone", async () => {
    const db = getDb();
    const sale = (id: string, soldOn: string) => ({ collection: "sales", id, data: { id, priceEur: 9000, soldOn, salesperson: "Conor Doyle", customerId: "cust-1" } });
    await db.insert(adminDocs).values([sale("old", "2020-11-10"), sale("kept", "2020-11-12"), { collection: "leads", id: "x", data: { id: "x", soldOn: "2000-01-01", customerId: "c" } }]);
    expect(await anonymiseOldSales(db as never, new Date("2026-11-11T03:00:00Z"))).toBe(1);
    const rows = Object.fromEntries((await db.select().from(adminDocs)).map((r) => [r.id, r.data]));
    expect(rows.old).toEqual({ id: "old", priceEur: 9000, soldOn: "2020-11-10", salesperson: "Conor Doyle" });
    expect(rows.kept).toMatchObject({ customerId: "cust-1" });
    expect(rows.x).toMatchObject({ customerId: "c" });
    expect(await anonymiseOldSales(db as never, new Date("2026-11-11T03:00:00Z"))).toBe(0); // done once
  });
});
