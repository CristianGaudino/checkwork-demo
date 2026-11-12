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
const { addPrepAction, removePrepAction, deleteCarAction, endReservationAction, recordSaleAction, reserveAction, saveCarAction, saveCostAction, setListingAction, toggleSoldAction, undoSaleAction, withdrawnAction } = await import("./actions");
const { costsStore, customersStore, prepStore, reservationsStore, salesStore } = await import("@/lib/admin/collections");
const { carCosts } = await import("@/lib/admin/costs");
const { adminCar, adminCars, saveCar } = await import("@/lib/admin/stock-admin");

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

  it("lets sales hide, show and publish a car of our own, never one from DoneDeal", async () => {
    const car = (await adminCars()).find((c) => !c.soldAt && !c.listing)!;
    await setListingAction(car.id, "hidden");
    expect((await adminCar(car.id))?.listing).toBeUndefined(); // DoneDeal: refused
    stockCookie = "checkwork";
    await setListingAction(car.id, "hidden");
    expect((await adminCar(car.id))?.listing).toBe("hidden");
    await setListingAction(car.id, "nonsense");
    expect((await adminCar(car.id))?.listing).toBe("hidden");
    await setListingAction(car.id, "live");
    expect(await adminCar(car.id)).toMatchObject({ listedAt: car.listedAt });
    expect((await adminCar(car.id))?.listing).toBeUndefined();
  });

  it("asks about a car whose DoneDeal ad came down: sold records the sale and shows it as sold, did not sell keeps it hidden", async () => {
    const [a, b] = (await adminCars()).filter((c) => !c.soldAt && !c.listing);
    const today = new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Dublin" });
    for (const c of [a, b]) await saveCar({ ...c, listing: "hidden", takenDownAt: today });
    const sale = Object.entries({ priceEur: "9000", soldOn: today, customerId: (await customersStore.list())[0].id }).reduce((f, [k, v]) => (f.set(k, v), f), new FormData());
    await expect(recordSaleAction(a.id, undefined, sale)).rejects.toThrow(/redirect/);
    expect(await adminCar(a.id)).toMatchObject({ soldAt: today });
    expect((await adminCar(a.id))?.listing).toBeUndefined();
    await withdrawnAction(b.id);
    expect(await adminCar(b.id)).toMatchObject({ listing: "hidden" });
    expect((await adminCar(b.id))?.takenDownAt).toBeUndefined();
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
    // Back on sale no longer throws a recorded sale away: it is refused, and the sale is undone on its own page instead.
    await toggleSoldAction(car.id);
    expect((await adminCar(car.id))?.soldAt).toBe(today);
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

describe("deposits and undoing a sale", () => {
  const form = (o: Record<string, string>) => Object.entries(o).reduce((f, [k, v]) => (f.set(k, v), f), new FormData());
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Dublin" });
  const inDays = (n: number) => new Date(Date.now() + n * 86_400_000).toLocaleDateString("en-CA", { timeZone: "Europe/Dublin" });
  beforeEach(() => {
    stockCookie = "checkwork";
    role = "Sales";
  });

  it("takes a deposit: the car is reserved, and the sale that follows takes its buyer and ends it as sold", async () => {
    const car = (await adminCars()).find((c) => !c.soldAt && !c.listing && !c.reserved)!;
    const customer = (await customersStore.list())[1];
    expect((await reserveAction(car.id, undefined, form({ depositEur: String(car.priceEur + 1), method: "Card", paidOn: today, until: inDays(7), customerId: customer.id })))?.errors?.depositEur).toMatch(/more than the price/);
    expect((await reserveAction(car.id, undefined, form({ depositEur: "500", method: "Card", paidOn: today, until: inDays(200), customerId: customer.id })))?.errors?.until).toMatch(/three months/);
    await expect(reserveAction(car.id, undefined, form({ depositEur: "500", method: "Cash", paidOn: today, until: inDays(7), customerId: customer.id }))).rejects.toThrow(/redirect:\/dashboard\/stock\?view=reserved/);
    expect((await adminCar(car.id))?.reserved).toBe(true);
    // A reserved car is not for sale: a second deposit is refused.
    expect((await reserveAction(car.id, undefined, form({ depositEur: "500", method: "Cash", paidOn: today, until: inDays(7), customerId: customer.id })))?.errors?.depositEur).toMatch(/not for sale/);
    await expect(recordSaleAction(car.id, undefined, form({ priceEur: String(car.priceEur), soldOn: today, customerId: customer.id }))).rejects.toThrow(/redirect/);
    expect(await salesStore.get(car.id)).toMatchObject({ depositEur: 500 });
    expect((await reservationsStore.list()).find((r) => r.carId === car.id)).toMatchObject({ status: "sold", endedOn: today });
    expect(await adminCar(car.id)).toMatchObject({ soldAt: today });
    expect((await adminCar(car.id))?.reserved).toBeUndefined();
  });

  it("lets only owners and managers end a reservation, with the deposit refunded or kept", async () => {
    const car = (await adminCars()).find((c) => !c.soldAt && !c.listing && !c.reserved)!;
    await expect(reserveAction(car.id, undefined, form({ depositEur: "1000", method: "Card", paidOn: today, until: inDays(3), name: "Sam Reid", phone: "+353 83 000 9999" }))).rejects.toThrow(/redirect/);
    expect((await endReservationAction(car.id, undefined, form({ outcome: "refunded", refundEur: "1000" })))?.errors?.outcome).toMatch(/owners and managers/);
    role = "Manager";
    await deleteCarAction(car.id);
    expect(await adminCar(car.id)).toBeDefined(); // not while a deposit is held on it
    expect((await endReservationAction(car.id, undefined, form({ outcome: "refunded", refundEur: "1500" })))?.errors?.refundEur).toMatch(/deposit was/);
    await expect(endReservationAction(car.id, undefined, form({ outcome: "refunded", refundEur: "800" }))).rejects.toThrow(/redirect/);
    expect((await reservationsStore.list()).find((r) => r.carId === car.id)).toMatchObject({ status: "refunded", refundEur: 800 });
    expect((await adminCar(car.id))?.reserved).toBeUndefined();
  });

  it("undoes a sale and keeps its record: a car brought back comes back hidden, and the reports leave the sale out", async () => {
    const car = (await adminCars()).find((c) => !c.soldAt && !c.listing && !c.reserved)!;
    const customer = (await customersStore.list())[2];
    await expect(recordSaleAction(car.id, undefined, form({ priceEur: "12000", soldOn: today, customerId: customer.id }))).rejects.toThrow(/redirect/);
    expect((await undoSaleAction(car.id, undefined, form({ kind: "returned", returnedOn: today, refundEur: "12000", reason: "Gearbox fault" })))?.errors?.kind).toMatch(/owners and managers/);
    role = "Owner";
    expect((await undoSaleAction(car.id, undefined, form({ kind: "returned", returnedOn: today, refundEur: "12000" })))?.errors?.reason).toMatch(/why/);
    expect((await undoSaleAction(car.id, undefined, form({ kind: "returned", returnedOn: today, refundEur: "13000", reason: "x" })))?.errors?.refundEur).toMatch(/sold for/);
    await expect(undoSaleAction(car.id, undefined, form({ kind: "returned", returnedOn: today, refundEur: "12000", reason: "Gearbox fault" }))).rejects.toThrow(/redirect:\/dashboard\/stock\?view=hidden/);
    expect(await salesStore.get(car.id)).toBeUndefined(); // the car's id is free for the next sale
    expect((await salesStore.list()).find((s) => s.carId === car.id)).toMatchObject({ kind: "returned", refundEur: 12000, reason: "Gearbox fault", customerId: customer.id, returnedOn: today });
    expect(await adminCar(car.id)).toMatchObject({ listing: "hidden" });
    expect((await adminCar(car.id))?.soldAt).toBeUndefined();
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
