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
    await db.insert(adminDocs).values([sale("old", "2020-11-10"), sale("kept", "2020-11-12"), { collection: "leads", id: "x", data: { id: "x", soldOn: "2000-01-01", customerId: "c" } }, { collection: "reservations", id: "dep", data: { id: "dep", paidOn: "2020-01-01", depositEur: 500, customerId: "cust-1" } }]);
    expect(await anonymiseOldSales(db as never, new Date("2026-11-11T03:00:00Z"))).toBe(2);
    const rows = Object.fromEntries((await db.select().from(adminDocs)).map((r) => [r.id, r.data]));
    expect(rows.old).toEqual({ id: "old", priceEur: 9000, soldOn: "2020-11-10", salesperson: "Conor Doyle" });
    expect(rows.kept).toMatchObject({ customerId: "cust-1" });
    expect(rows.x).toMatchObject({ customerId: "c" });
    expect(rows.dep).toEqual({ id: "dep", paidOn: "2020-01-01", depositEur: 500 }); // a deposit as old goes the same way
    expect(await anonymiseOldSales(db as never, new Date("2026-11-11T03:00:00Z"))).toBe(0); // done once
  });

  it("clears an old claim's and order's lead, fault and notes as an erasure does, and keeps the figures", async () => {
    const db = getDb();
    const notes = [{ at: 1, text: "Pat rang about the clutch" }];
    await db.insert(adminDocs).values([
      { collection: "claims", id: "k", data: { id: "k", openedOn: "2020-01-01", fault: "Pat says it slips", notes, costEur: 400, customerId: "cust-1", leadId: "lead-1" } },
      { collection: "orders", id: "o", data: { id: "o", orderedOn: "2020-01-01", priceEur: 30000, notes, customerId: "cust-1", leadId: "lead-1" } },
      { collection: "claims", id: "new", data: { id: "new", openedOn: "2026-01-01", fault: "Kept", notes, customerId: "cust-2" } },
    ]);
    expect(await anonymiseOldSales(db as never, new Date("2026-11-11T03:00:00Z"))).toBe(2);
    const rows = Object.fromEntries((await db.select().from(adminDocs)).map((r) => [r.id, r.data]));
    expect(rows.k).toEqual({ id: "k", openedOn: "2020-01-01", fault: "Removed after six years", notes: [], costEur: 400 });
    expect(rows.o).toEqual({ id: "o", orderedOn: "2020-01-01", priceEur: 30000, notes: [] });
    expect(rows.new).toMatchObject({ fault: "Kept", customerId: "cust-2" });
  });
});
