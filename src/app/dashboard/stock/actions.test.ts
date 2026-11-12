import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));
vi.mock("next/navigation", () => ({ redirect: (to: string) => { throw new Error(`redirect:${to}`); } }));
// These act as the demo's roles (the demo bar's cookie), which count only on the demo deploy (src/lib/demo.ts, demoCookiesCount).
beforeEach(() => vi.stubEnv("APP_ENV", "demo"));

// The demo's stock switch is a cookie (src/lib/stock-source.ts); this run says DoneDeal.
let stockCookie = "donedeal";
let role = "Sales"; // the demo bar's role (src/lib/permissions.ts): sales has no margins
vi.mock("react", async (orig) => ({ ...(await orig<typeof import("react")>()), cache: <T,>(fn: T) => fn }));
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: (n: string) => (n === "checkwork-demo-stock" ? { value: stockCookie } : n === "checkwork-demo-role" ? { value: role } : undefined) }),
  headers: async () => ({ get: () => null }),
}));
const { addPrepAction, removePrepAction, deleteCarAction, recordSaleAction, saveCarAction, saveCostAction, toggleSoldAction } = await import("./actions");
const { costsStore, customersStore, prepStore, salesStore } = await import("@/lib/admin/collections");
const { carCosts } = await import("@/lib/admin/costs");
const { adminCar, adminCars } = await import("@/lib/admin/stock-admin");

describe("stock synced from DoneDeal", () => {
  beforeEach(() => {
    stockCookie = "donedeal";
    role = "Sales";
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
    role = "Finance";
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

  it("lets only owners and managers delete a car of our own: sales can still mark it sold", async () => {
    stockCookie = "checkwork";
    const car = (await adminCars()).find((c) => !c.soldAt)!;
    await deleteCarAction(car.id);
    expect(await adminCar(car.id)).toBeDefined(); // Sales: refused
    role = "Manager";
    await expect(deleteCarAction(car.id)).rejects.toThrow(/redirect/);
    expect(await adminCar(car.id)).toBeUndefined();
  });

  it("with our own stock the same press does mark the car sold", async () => {
    stockCookie = "checkwork";
    const car = (await adminCars()).find((c) => !c.soldAt)!;
    await expect(toggleSoldAction(car.id)).rejects.toThrow(/redirect/);
    expect((await adminCar(car.id))?.soldAt).toBeDefined();
    await expect(toggleSoldAction(car.id)).rejects.toThrow(/redirect/); // put it back for the next test
  });
});

describe("recording a sale", () => {
  const form = (o: Record<string, string>) => Object.entries(o).reduce((f, [k, v]) => (f.set(k, v), f), new FormData());
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Dublin" });

  it("with our own stock, records the sale with a new customer and marks the car sold on the sale's day", async () => {
    stockCookie = "checkwork";
    const car = (await adminCars()).find((c) => !c.soldAt)!;
    await expect(recordSaleAction(car.id, undefined, form({ priceEur: "15000", soldOn: today, salesperson: "Conor Doyle", customerId: "", name: "Pat Byrne", phone: "+353 83 000 1234" }))).rejects.toThrow(/redirect:\/dashboard\/stock\?view=sold&sale=/);
    const sale = (await salesStore.get(car.id))!;
    expect(sale).toMatchObject({ priceEur: 15000, soldOn: today, salesperson: "Conor Doyle" });
    expect((await customersStore.get(sale.customerId!))?.name).toBe("Pat Byrne");
    expect((await adminCar(car.id))?.soldAt).toBe(today);
    // Back on sale: the sale fell through, so it goes.
    await expect(toggleSoldAction(car.id)).rejects.toThrow(/redirect/);
    expect(await salesStore.get(car.id)).toBeUndefined();
  });

  it("with DoneDeal stock, records the sale of a car the sync marked sold, and never marks one sold itself", async () => {
    stockCookie = "donedeal";
    const sold = (await adminCars()).find((c) => c.soldAt)!;
    const customer = (await customersStore.list())[0];
    await expect(recordSaleAction(sold.id, undefined, form({ priceEur: "9000", soldOn: sold.soldAt!, customerId: customer.id }))).rejects.toThrow(/redirect/);
    expect((await salesStore.get(sold.id))?.customerId).toBe(customer.id);
    const forSale = (await adminCars()).find((c) => !c.soldAt)!;
    await expect(recordSaleAction(forSale.id, undefined, form({ priceEur: "9000", soldOn: today, customerId: customer.id }))).rejects.toThrow(/redirect/);
    expect((await adminCar(forSale.id))?.soldAt).toBeUndefined(); // the sync marks it, from DoneDeal
  });

  it("refuses a missing buyer, a bad price and a day to come, and saves nothing", async () => {
    const recorded = new Set((await salesStore.list()).map((x) => x.id));
    const car = (await adminCars()).find((c) => !c.soldAt && !recorded.has(c.id))!;
    const tomorrow = new Date(Date.now() + 2 * 86_400_000).toISOString().slice(0, 10);
    expect((await recordSaleAction(car.id, undefined, form({ priceEur: "9000", soldOn: today, customerId: "" })))?.errors?.name).toMatch(/Choose a customer/);
    expect((await recordSaleAction(car.id, undefined, form({ priceEur: "9000", soldOn: today, customerId: "", name: "Pat" })))?.errors?.phone).toMatch(/phone number or an email/);
    expect((await recordSaleAction(car.id, undefined, form({ priceEur: "-1", soldOn: today, customerId: "" })))?.errors?.priceEur).toBeTruthy();
    expect((await recordSaleAction(car.id, undefined, form({ priceEur: "9000", soldOn: tomorrow, customerId: "", name: "Pat", phone: "1" })))?.errors?.soldOn).toMatch(/passed or today/);
    expect(await salesStore.get(car.id)).toBeUndefined();
  });
});

describe("prep costs", () => {
  const form = (o: Record<string, string>) => Object.entries(o).reduce((f, [k, v]) => (f.set(k, v), f), new FormData());
  it("only staff who see margins add a line; a bad one is refused; each counts in the car's whole cost, and can be removed", async () => {
    const car = (await adminCars()).find((c) => !c.soldAt)!;
    const before = (await prepStore.get(car.id))?.lines.length ?? 0;
    role = "Sales";
    expect((await addPrepAction(car.id, undefined, form({ kind: "Tyres", eur: "300" })))?.errors?.kind).toMatch(/margins/);
    role = "Finance";
    expect(Object.keys((await addPrepAction(car.id, undefined, form({ kind: "Wheels", eur: "0" })))?.errors ?? {}).sort()).toEqual(["eur", "kind"]);
    expect((await prepStore.get(car.id))?.lines.length ?? 0).toBe(before);
    await costsStore.put({ id: car.id, costEur: 10000 });
    const was = (await carCosts()).get(car.id)!;
    expect((await addPrepAction(car.id, undefined, form({ kind: "Tyres", eur: "300", note: "Two fronts" })))?.added).toBeTruthy();
    expect((await carCosts()).get(car.id)).toEqual({ purchase: 10000, prep: was.prep + 300, total: was.total + 300 });
    const line = (await prepStore.get(car.id))!.lines.at(-1)!;
    await removePrepAction(car.id, line.at);
    expect((await carCosts()).get(car.id)!.total).toBe(was.total);
  });
});
