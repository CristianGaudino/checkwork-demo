import { beforeEach, describe, expect, it, vi } from "vitest";
import { truncate } from "@/test/sqlite-db";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => import("@/test/sqlite-db"));
vi.mock("@/lib/leads/bindings", () => ({ getBindings: () => ({ DB: {} }) }));
const { getDb } = await import("@/test/sqlite-db");
const { leads } = await import("@/lib/db/schema");
const { erasePerson, findPerson } = await import("./data-requests");
const { customersStore, salesStore } = await import("./collections");
const { parsePersonQuery } = await import("./person-match");

const pat = parsePersonQuery("pat@example.com")!;

// The D1 path on SQLite with the committed migrations.
describe("a data request (D1 path, on SQLite)", () => {
  beforeEach(() => truncate("admin_docs", "leads"));

  it("finds and erases more form submissions than D1 binds in one statement", async () => {
    const row = (i: number) => ({ clientRef: `ref-${i}`, type: "enquiry" as const, sourcePath: "/", name: "Pat", email: "pat@example.com", consentAt: new Date(), consentVersion: "1" });
    await getDb().insert(leads).values(Array.from({ length: 150 }, (_, i) => row(i)));
    await getDb().insert(leads).values({ ...row(999), email: "someone@example.com" });
    expect((await findPerson(pat)).formLeads).toHaveLength(150);
    await erasePerson(pat);
    expect((await getDb().select().from(leads)).map((r) => r.email)).toEqual(["someone@example.com"]);
  });

  it("takes the buyer off the sale before the customer record goes, so a run that stops part way can be run again", async () => {
    const now = Date.now();
    await customersStore.put({ id: "cust-x", name: "Pat Byrne", email: "pat@example.com", phone: "", source: "Sale", marketingConsent: false, createdAt: now, lastContactAt: now });
    await salesStore.put({ id: "car-x", carTitle: "2016 Ford Focus", priceEur: 9000, soldOn: "2026-11-01", customerId: "cust-x", createdAt: now });
    const remove = vi.spyOn(customersStore, "remove").mockRejectedValueOnce(new Error("D1 down"));
    await expect(erasePerson(pat)).rejects.toThrow();
    expect((await salesStore.get("car-x"))!.customerId).toBeUndefined(); // already done
    remove.mockRestore();
    await erasePerson(pat);
    expect(await customersStore.get("cust-x")).toBeUndefined();
    expect(await salesStore.get("car-x")).toMatchObject({ priceEur: 9000 });
  });
});
