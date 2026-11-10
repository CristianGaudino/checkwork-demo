import { beforeEach, describe, expect, it, vi } from "vitest";
import { truncate } from "@/test/sqlite-db";
import type { Car } from "@/lib/stock/types";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => import("@/test/sqlite-db"));
vi.mock("@/lib/leads/bindings", () => ({ getBindings: () => ({ DB: {} }) }));
vi.mock("@/lib/stock/d1-provider", () => ({ invalidateStockSnapshot: vi.fn() }));
const { adminCar, adminCars, removeCar, saveCar } = await import("./stock-admin");

const car = (id: string, price: number): Car => ({ id, slug: `make-model-2020-${id}`, make: "Make", makeSlug: "make", model: "Model", modelSlug: "model", year: 2020, priceEur: price, photos: [] });

// The dealer's writes against a real SQLite with the committed migrations (the D1 path), through the same `cars` table the site reads.
describe("stock admin (D1 path, on SQLite)", () => {
  beforeEach(() => truncate("cars"));

  it("adds a car, changes it by id, and removes it", async () => {
    await saveCar(car("10", 5000));
    await saveCar(car("11", 6000));
    expect((await adminCars()).map((c) => c.id).sort()).toEqual(["10", "11"]);
    await saveCar({ ...car("10", 4500), wasPriceEur: 5000 });
    expect(await adminCar("10")).toMatchObject({ priceEur: 4500, wasPriceEur: 5000 });
    expect(await adminCars()).toHaveLength(2);
    await removeCar("10");
    expect(await adminCar("10")).toBeUndefined();
    expect(await adminCars()).toHaveLength(1);
  });
});
