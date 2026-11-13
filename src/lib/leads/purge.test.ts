import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { adminDocs, leads } from "@/lib/db/schema";
import { getDb, truncate } from "@/test/sqlite-db";
import { CONSENT, LEAD_RETENTION_MONTHS } from "./constants";
import { purgeOldLeads } from "./purge";

const NOW = new Date("2026-11-09T12:00:00Z");
const monthsAgo = (n: number, extraDays = 0) => {
  const d = new Date(NOW);
  d.setUTCMonth(d.getUTCMonth() - n);
  d.setUTCDate(d.getUTCDate() + extraDays);
  return d;
};
const lead = (id: string, createdAt: Date, photoKeys: string[] = []) => ({
  id, clientRef: id, type: "trade_in" as const, sourcePath: "/trade-in", name: "Test buyer", email: "buyer@example.com", details: {}, photoKeys,
  consentAt: createdAt, consentVersion: CONSENT.version, createdAt,
});
const ids = async () => (await getDb().select({ id: leads.id }).from(leads)).map((r) => r.id).sort();

beforeEach(() => truncate("leads", "admin_docs"));

describe("purgeOldLeads", () => {
  it("deletes leads past the retention period with their photos, and keeps newer ones", async () => {
    await getDb().insert(leads).values([
      lead("old-1", monthsAgo(LEAD_RETENTION_MONTHS, -1), ["trade-in/old-1/1.jpg", "trade-in/old-1/2.jpg"]),
      lead("old-2", monthsAgo(24)),
      lead("new-1", monthsAgo(LEAD_RETENTION_MONTHS, 1), ["trade-in/new-1/1.jpg"]), // a day short of the period: kept
      lead("new-2", monthsAgo(0)),
    ]);
    const bucket = { delete: vi.fn(async () => {}) };
    expect(await purgeOldLeads(getDb(), bucket, NOW)).toBe(2);
    expect(await ids()).toEqual(["new-1", "new-2"]);
    expect(bucket.delete).toHaveBeenCalledOnce();
    expect(bucket.delete).toHaveBeenCalledWith(["trade-in/old-1/1.jpg", "trade-in/old-1/2.jpg"]);
  });

  it("keeps the rows when the photos cannot be deleted, so the next run can try again", async () => {
    await getDb().insert(leads).values([lead("old-1", monthsAgo(13), ["trade-in/old-1/1.jpg"])]);
    const bucket = { delete: vi.fn(async () => Promise.reject(new Error("R2 down"))) };
    await expect(purgeOldLeads(getDb(), bucket, NOW)).rejects.toThrow("R2 down");
    expect(await ids()).toEqual(["old-1"]);
  });

  it("deletes photos in batches of 1000 keys", async () => {
    const keys = Array.from({ length: 2500 }, (_, i) => `trade-in/old-1/${i}.jpg`);
    await getDb().insert(leads).values([lead("old-1", monthsAgo(13), keys)]);
    const bucket = { delete: vi.fn(async () => {}) };
    await purgeOldLeads(getDb(), bucket, NOW);
    expect(bucket.delete.mock.calls.map((c) => (c as unknown as string[][])[0].length)).toEqual([1000, 1000, 500]);
  });

  it("does nothing, and touches no bucket, when there is nothing old", async () => {
    await getDb().insert(leads).values([lead("new-1", monthsAgo(1))]);
    const bucket = { delete: vi.fn(async () => {}) };
    expect(await purgeOldLeads(getDb(), bucket, NOW)).toBe(0);
    expect(bucket.delete).not.toHaveBeenCalled();
  });

  it("deletes the admin's copies of old leads, bookings and customers too, and keeps newer copies and the made-up seed records", async () => {
    const old = monthsAgo(13).getTime();
    const fresh = monthsAgo(0).getTime();
    const doc = (collection: string, id: string, createdAt: number) => ({ collection, id, data: { id, createdAt } });
    await getDb().insert(adminDocs).values([
      doc("leads", "real-old", old), doc("test-drives", "real-old", old), doc("alerts", "real-old", old), { collection: "customers", id: "real-c-old", data: { id: "real-c-old", createdAt: old, lastContactAt: old } }, { collection: "customers", id: "real-c-returning", data: { id: "real-c-returning", createdAt: old, lastContactAt: fresh } },
      doc("leads", "real-new", fresh), doc("leads", "lead-1000", old), // a seed record is not personal data and keeps its place
      doc("test-drives", "drive-3f9a1c2e", old), doc("test-drives", "drive-5b2e7d10", fresh), // booked on the dashboard: the same name and contact
    ]);
    await purgeOldLeads(getDb(), { delete: async () => {} }, NOW);
    const left = (await getDb().select({ id: adminDocs.id }).from(adminDocs)).map((r) => r.id).sort();
    expect(left).toEqual(["drive-5b2e7d10", "lead-1000", "real-c-returning", "real-new"]); // the customer first seen long ago but in touch lately stays
  });

  it("clears the registration lookup's cache after 30 days, and the past days' counts", async () => {
    const at = (days: number) => NOW.getTime() - days * 86_400_000;
    await getDb().insert(adminDocs).values([
      { collection: "reg-cache", id: "191-KY-1", data: { id: "191-KY-1", car: null, at: at(31) } },
      { collection: "reg-cache", id: "191-KY-2", data: { id: "191-KY-2", car: null, at: at(29) } },
      { collection: "reg-counts", id: "day-2026-11-08", data: { id: "day-2026-11-08", n: 3 } },
      { collection: "reg-counts", id: "day-2026-11-09", data: { id: "day-2026-11-09", n: 1 } },
      { collection: "reg-counts", id: "day-2026-11-08-v-0a1b2c", data: { id: "day-2026-11-08-v-0a1b2c", n: 4 } }, // a visitor's, yesterday
      { collection: "reg-counts", id: "day-2026-11-09-v-0a1b2c", data: { id: "day-2026-11-09-v-0a1b2c", n: 2 } },
    ]);
    await purgeOldLeads(getDb(), { delete: async () => {} }, NOW);
    expect((await getDb().select({ id: adminDocs.id }).from(adminDocs)).map((r) => r.id).sort()).toEqual(["191-KY-2", "day-2026-11-09", "day-2026-11-09-v-0a1b2c"]);
  });

  it("keeps a customer while a sale, deposit, claim or order names them, from the website or the dashboard, and deletes them after", async () => {
    const old = monthsAgo(13).getTime();
    const customer = (id: string) => ({ collection: "customers", id, data: { id, createdAt: old, lastContactAt: old } });
    await getDb().insert(adminDocs).values([
      customer("real-c-buyer"), customer("cust-buyer"), customer("cust-claim"), customer("cust-unlinked"), customer("cust-walkin"),
      { collection: "sales", id: "4710001", data: { id: "4710001", customerId: "real-c-buyer" } },
      { collection: "orders", id: "order-1", data: { id: "order-1", customerId: "cust-buyer" } },
      { collection: "claims", id: "claim-1", data: { id: "claim-1", customerId: "cust-claim" } },
      { collection: "sales", id: "past-1", data: { id: "past-1" } }, // six years on, the sales purge removed its buyer
    ]);
    await purgeOldLeads(getDb(), { delete: async () => {} }, NOW);
    const left = (await getDb().select({ id: adminDocs.id }).from(adminDocs).where(eq(adminDocs.collection, "customers"))).map((r) => r.id).sort();
    expect(left).toEqual(["cust-buyer", "cust-claim", "real-c-buyer"]);
  });
});
