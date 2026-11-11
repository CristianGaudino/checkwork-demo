import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));
vi.mock("next/navigation", () => ({ redirect: (to: string) => { throw new Error(`redirect:${to}`); } }));
// The demo's stock switch is a cookie (src/lib/stock-source.ts); this run says DoneDeal.
let stockCookie = "donedeal";
let perms = "";
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: (n: string) => (n === "checkwork-demo-stock" ? { value: stockCookie } : n === "checkwork-demo-perms" ? { value: perms } : undefined) }),
  headers: async () => ({ get: () => null }),
}));
const { deleteCarAction, saveCarAction, saveCostAction, toggleSoldAction } = await import("./actions");
const { costsStore } = await import("@/lib/admin/collections");
const { adminCar, adminCars } = await import("@/lib/admin/stock-admin");

describe("stock synced from DoneDeal", () => {
  beforeEach(() => {
    stockCookie = "donedeal";
    perms = "";
  });

  it("still takes the cost, which is the dealer's own, from staff with the margins permission only", async () => {
    const car = (await adminCars()).find((c) => !c.soldAt)!;
    const form = (v: string) => {
      const f = new FormData();
      f.set("costEur", v);
      return f;
    };
    await saveCostAction(car.id, form("12345"));
    expect((await costsStore.get(car.id))?.costEur).not.toBe(12345); // no permission, no change
    perms = "margins";
    await expect(saveCostAction(car.id, form("12345"))).rejects.toThrow(/redirect/);
    expect((await costsStore.get(car.id))?.costEur).toBe(12345);
    await saveCostAction(car.id, form("not a number"));
    expect((await costsStore.get(car.id))?.costEur).toBe(12345); // a bad figure saves nothing
  });

  it("refuses every write on the server, whatever the page sent", async () => {
    const car = (await adminCars()).find((c) => !c.soldAt)!;
    await toggleSoldAction(car.id);
    expect((await adminCar(car.id))?.soldAt).toBeUndefined();
    await deleteCarAction(car.id);
    expect(await adminCar(car.id)).toBeDefined();
    const r = await saveCarAction(car.id, undefined, new FormData());
    expect(r?.errors?.make).toMatch(/DoneDeal/);
  });

  it("with our own stock the same press does mark the car sold", async () => {
    stockCookie = "checkwork";
    const car = (await adminCars()).find((c) => !c.soldAt)!;
    await expect(toggleSoldAction(car.id)).rejects.toThrow(/redirect/);
    expect((await adminCar(car.id))?.soldAt).toBeDefined();
    await expect(toggleSoldAction(car.id)).rejects.toThrow(/redirect/); // put it back for the next test
  });
});
