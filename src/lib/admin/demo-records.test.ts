import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

// A clone for a real dealer must not open its dashboard on made-up leads, reviews and people.
async function fresh() {
  vi.resetModules();
  return import("./collections");
}

describe("demo records", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("a production site starts empty, with the settings it needs and no made-up team", async () => {
    vi.stubEnv("APP_ENV", "production");
    const c = await fresh();
    expect(await c.leadsStore.list()).toEqual([]);
    expect(await c.reviewsStore.list()).toEqual([]);
    expect(await c.postsStore.list()).toEqual([]);
    expect((await c.getSettings()).team).toEqual([]);
    expect((await c.getSettings()).leadSlaHours).toBe(24);
  });

  it("the demo is seeded, and DEMO_RECORDS=on seeds a production showcase too", async () => {
    expect((await (await fresh()).leadsStore.list()).length).toBeGreaterThan(10);
    vi.stubEnv("APP_ENV", "production");
    vi.stubEnv("DEMO_RECORDS", "on");
    expect((await (await fresh()).leadsStore.list()).length).toBeGreaterThan(10);
  });
});

describe("the demo's stories", () => {
  it("agree with each other: claims are on real sales, held deposits on the cars marked reserved, linked records exist", async () => {
    const c = await fresh();
    const cars = (await import("@/lib/stock/demo-cars.json")).default as { id: string; reserved?: boolean }[];
    const [sales, deposits, claims, orders, leads, customers] = await Promise.all([c.salesStore.list(), c.reservationsStore.list(), c.claimsStore.list(), c.ordersStore.list(), c.leadsStore.list(), c.customersStore.list()]);
    const ids = (l: { id: string }[]) => new Set(l.map((x) => x.id));
    for (const k of claims) {
      const sale = sales.find((s) => s.id === k.saleId)!;
      expect(sale.returnedOn).toBeUndefined();
      expect(k.openedOn >= sale.soldOn).toBe(true);
      expect(k.customerId).toBe(sale.customerId);
    }
    expect(deposits.filter((d) => d.status === "held").map((d) => d.carId).sort()).toEqual(cars.filter((x) => x.reserved).map((x) => x.id).sort());
    const linked = [...claims, ...orders].flatMap((x) => (x.leadId ? [x.leadId] : []));
    expect(linked.length).toBeGreaterThan(0);
    for (const id of linked) expect(ids(leads).has(id)).toBe(true);
    for (const x of [...deposits, ...claims, ...orders]) expect(ids(customers).has(x.customerId!)).toBe(true);
    // Every stage but Arrived, which puts a car in stock (orders/actions.ts), so the demo would need a car made for it.
    expect([...new Set(orders.map((o) => o.status))].sort()).toEqual(c.ORDER_STATUSES.filter((s) => s !== "arrived").sort());
  });
});

describe("reset demo data", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("does nothing on a site without demo records, so a real dealer's leads are never wiped", async () => {
    vi.stubEnv("APP_ENV", "production");
    vi.resetModules();
    vi.doMock("next/cache", () => ({ revalidatePath: () => {} }));
    const { leadsStore } = await import("./collections");
    const { resetDemoAction } = await import("@/app/dashboard/settings/actions");
    await leadsStore.put({ id: "lead-own-1", type: "enquiry", status: "new", name: "A", email: "", phone: "", message: "", source: "Website", notes: [], createdAt: 1 });
    await resetDemoAction();
    expect((await leadsStore.list()).map((l) => l.id)).toEqual(["lead-own-1"]);
  });
});
