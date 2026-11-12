import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));
vi.mock("next/navigation", () => ({ redirect: (to: string) => { throw new Error(`redirect:${to}`); } }));
beforeEach(() => vi.stubEnv("APP_ENV", "demo"));
let role = "Sales";
let stockCookie = "checkwork";
vi.mock("react", async (orig) => ({ ...(await orig<typeof import("react")>()), cache: <T,>(fn: T) => fn }));
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: (n: string) => (n === "checkwork-demo-role" ? { value: role } : n === "checkwork-demo-stock" ? { value: stockCookie } : undefined) }),
  headers: async () => ({ get: () => null }),
}));
const { cancelOrderAction, placeOrderAction, setOrderStatusAction } = await import("./actions");
const { recordSaleAction } = await import("../stock/actions");
const { customersStore, ordersStore, reservationsStore, salesStore } = await import("@/lib/admin/collections");
const { adminCar } = await import("@/lib/admin/stock-admin");
const { regPeriods } = await import("@/lib/leads/reg-periods");

const form = (o: Record<string, string>) => Object.entries(o).reduce((f, [k, v]) => (f.set(k, v), f), new FormData());
const today = new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Dublin" });
const period = regPeriods(today)[1];
const order = (o: Record<string, string> = {}) => form({ make: "Kia", model: "Sportage", spec: "GT-Line hybrid", colour: "White", priceEur: "38000", depositEur: "1000", depositMethod: "Card", regPeriod: period, expected: today.slice(0, 7), ...o });
const placed = async (o: Record<string, string> = {}) => {
  await expect(placeOrderAction(undefined, order(o))).rejects.toThrow(/redirect:\/dashboard\/orders\/order-/);
  return (await ordersStore.list()).sort((a, b) => b.createdAt - a.createdAt)[0];
};

describe("factory orders", () => {
  beforeEach(() => {
    role = "Sales";
    stockCookie = "checkwork";
  });

  it("checks the order, and is only for stock kept here", async () => {
    const customerId = (await customersStore.list())[0].id;
    expect((await placeOrderAction(undefined, order({ customerId, regPeriod: "201" })))?.errors?.regPeriod).toBeTruthy();
    expect((await placeOrderAction(undefined, order({ customerId, depositEur: "50000" })))?.errors?.depositEur).toMatch(/more than the price/);
    expect((await placeOrderAction(undefined, order({ customerId, depositMethod: "" })))?.errors?.depositMethod).toMatch(/how the deposit/);
    expect((await placeOrderAction(undefined, order({ customerId, expected: "2020-01" })))?.errors?.expected).toBeTruthy();
    stockCookie = "donedeal";
    expect((await placeOrderAction(undefined, order({ customerId })))?.errors?.make).toMatch(/DoneDeal/);
  });

  it("arrives as a hidden car held for the buyer with their deposit, and its sale hands the order over", async () => {
    const customerId = (await customersStore.list())[1].id;
    const o = await placed({ customerId });
    expect(o).toMatchObject({ status: "ordered", customerId, depositEur: 1000, regPeriod: period });
    await setOrderStatusAction(o.id, form({ status: "built" }));
    await setOrderStatusAction(o.id, form({ status: "handed-over" })); // never by hand
    expect((await ordersStore.get(o.id))?.status).toBe("built");
    await setOrderStatusAction(o.id, form({ status: "arrived" }));
    const arrived = (await ordersStore.get(o.id))!;
    const car = (await adminCar(arrived.carId!))!;
    expect(car).toMatchObject({ make: "Kia", model: "Sportage", variant: "GT-Line hybrid", condition: "new", listing: "hidden", reserved: true, year: 2000 + Number(period.slice(0, 2)) });
    expect((await reservationsStore.list()).find((r) => r.carId === car.id)).toMatchObject({ status: "held", depositEur: 1000, customerId });
    await expect(recordSaleAction(car.id, undefined, form({ priceEur: "38000", soldOn: today, customerId }))).rejects.toThrow(/redirect/);
    expect((await ordersStore.get(o.id))?.status).toBe("handed-over");
    expect(await salesStore.get(car.id)).toMatchObject({ depositEur: 1000, customerId });
  });

  it("is cancelled by owners and managers only, with the deposit refunded or kept", async () => {
    const o = await placed({ name: "Lee Moran", phone: "+353 83 000 7777" });
    await setOrderStatusAction(o.id, form({ status: "arrived" }));
    const carId = (await ordersStore.get(o.id))!.carId!;
    expect((await cancelOrderAction(o.id, undefined, form({ outcome: "refunded", refundEur: "1000" })))?.errors?.outcome).toMatch(/owners and managers/);
    role = "Manager";
    expect((await cancelOrderAction(o.id, undefined, form({ outcome: "none" })))?.errors?.outcome).toMatch(/deposit/);
    await expect(cancelOrderAction(o.id, undefined, form({ outcome: "kept" }))).rejects.toThrow(/redirect/);
    expect((await ordersStore.get(o.id))?.status).toBe("cancelled");
    expect((await reservationsStore.list()).find((r) => r.carId === carId)?.status).toBe("kept");
    expect(await adminCar(carId)).toMatchObject({ listing: "hidden" }); // still in stock, for the dealer to decide
    expect((await adminCar(carId))?.reserved).toBeUndefined();
  });
});
