import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Car } from "@/lib/stock/types";

vi.mock("server-only", () => ({}));
vi.mock("react", async (orig) => ({ ...(await orig<typeof import("react")>()), cache: <T,>(fn: T) => fn }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined }), headers: async () => ({ get: () => null }) }));
// The feed and the email are what a test changes: DoneDeal's answer, and whether the warning went.
let feed: () => Promise<unknown> = async () => ({ ok: false, reason: "failed" });
vi.mock("./feed", () => ({ fetchListings: () => feed() }));
const sent: { to: string[]; subject: string }[] = [];
// A car whose save fails (as an address clash with another car would in D1).
vi.mock("@/lib/admin/stock-admin", async (orig) => {
  const real = await orig<typeof import("@/lib/admin/stock-admin")>();
  return { ...real, saveCar: async (c: Car) => (c.id === "bad" ? Promise.reject(new Error("UNIQUE constraint failed: cars.slug")) : real.saveCar(c)) };
});
vi.mock("@/lib/leads/mail", () => ({ sendTo: async (to: string[], m: { subject: string }) => void sent.push({ to, subject: m.subject }) }));

const { runSync, syncStatus, resetSyncStatus, SYNC_ACTOR } = await import("./sync");
const { adminCars } = await import("@/lib/admin/stock-admin");
const { listActivity } = await import("@/lib/admin/activity");
const { HOUR } = await import("@/lib/time");

const forSale = async () => (await adminCars()).filter((c) => !c.soldAt && !c.listing);

describe("the DoneDeal sync", () => {
  beforeEach(async () => {
    sent.length = 0;
    await resetSyncStatus();
  });

  it("with what we already have, changes nothing and says when it ran", async () => {
    const cars = await forSale();
    feed = async () => ({ ok: true, listings: cars });
    const s = await runSync({ now: 1_000 });
    expect(s).toMatchObject({ lastOkAt: 1_000, result: { added: 0, changed: 0, takenDown: 0 } });
    expect(s.problem).toBeUndefined();
  });

  it("writes each change to the stock and the activity history, as the sync", async () => {
    const [a, b, ...rest] = await forSale();
    const fresh: Car = { ...a, id: "dd-1", slug: "ford-focus-dd-1" };
    feed = async () => ({ ok: true, listings: [{ ...a, priceEur: a.priceEur - 500 }, ...rest, fresh] });
    const s = await runSync();
    expect(s.result).toEqual({ added: 1, changed: 1, takenDown: 1 });
    const now = await adminCars();
    expect(now.find((c) => c.id === a.id)?.priceEur).toBe(a.priceEur - 500);
    expect(now.find((c) => c.id === b.id)).toMatchObject({ listing: "hidden", takenDownAt: expect.any(String) });
    expect(now.find((c) => c.id === "dd-1")?.listedAt).toBeTruthy();
    const log = (await listActivity({ actor: SYNC_ACTOR }, 1, 3)).rows.map((r) => r.summary);
    expect(log).toEqual(expect.arrayContaining(["Added from DoneDeal", "Hidden: the ad came down on DoneDeal", expect.stringMatching(/^Changed the price from/)]));
  });

  it("a sold car DoneDeal lists again goes back on sale, and its sale goes with it", async () => {
    const { salesStore } = await import("@/lib/admin/collections");
    const sold = (await adminCars()).find((c) => c.soldAt && c.id !== "dd-1")!;
    await salesStore.put({ id: sold.id, carTitle: "x", priceEur: 1, soldOn: sold.soldAt!, createdAt: 0 });
    feed = async () => ({ ok: true, listings: [...(await forSale()), { ...sold, soldAt: undefined }] });
    await runSync();
    expect((await adminCars()).find((c) => c.id === sold.id)?.soldAt).toBeUndefined();
    expect(await salesStore.get(sold.id)).toBeUndefined();
  });

  it("a broken answer changes nothing and is held", async () => {
    const before = await adminCars();
    feed = async () => ({ ok: true, listings: [] });
    const s = await runSync();
    expect(s).toMatchObject({ held: true, problem: expect.stringMatching(/sent no cars/) });
    expect(await adminCars()).toEqual(before);
  });

  it("skips a car that cannot be saved, saves the rest, and says so", async () => {
    const cars = await forSale();
    feed = async () => ({ ok: true, listings: [...cars, { ...cars[0], id: "bad", slug: "clash" }, { ...cars[0], id: "dd-ok", slug: "fine" }] });
    const s = await runSync();
    expect(s.result).toEqual({ added: 1, changed: 0, takenDown: 0 });
    expect(s.problem).toBe("1 car from DoneDeal could not be saved. The rest are up to date.");
    expect((await adminCars()).some((c) => c.id === "dd-ok")).toBe(true);
  });

  it("warns the owners and managers an hour into an outage, once, and again for a new one", async () => {
    const cars = await forSale();
    feed = async () => ({ ok: true, listings: cars });
    await runSync({ now: 0 });
    feed = async () => ({ ok: false, reason: "failed" });
    await runSync({ now: HOUR / 2 }); // the outage starts here
    await runSync({ now: HOUR });
    expect(sent).toHaveLength(0); // half an hour in
    expect((await syncStatus()).problem).toBe("DoneDeal did not answer.");
    await runSync({ now: 1.5 * HOUR });
    await runSync({ now: 1.75 * HOUR });
    expect(sent).toHaveLength(1);
    expect(sent[0].to.sort()).toEqual(["aoife@example.com", "ciara@example.com"]); // the owner and the manager, not sales or finance
    feed = async () => ({ ok: true, listings: cars });
    await runSync({ now: 2 * HOUR });
    expect((await syncStatus()).problem).toBeUndefined();
    feed = async () => ({ ok: false, reason: "failed" });
    await runSync({ now: 3 * HOUR });
    await runSync({ now: 4 * HOUR });
    expect(sent).toHaveLength(2); // a new outage, a new warning
  });

  it("is not warned on the first failure, however long ago the last good sync was", async () => {
    feed = async () => ({ ok: false, reason: "not-connected" });
    await runSync({ now: 10 * HOUR });
    expect(sent).toHaveLength(0);
    await runSync({ now: 11 * HOUR });
    expect(sent).toHaveLength(1);
  });
});
