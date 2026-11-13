import "server-only";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { cars } from "@/lib/db/schema";
import { getBindings } from "@/lib/leads/bindings";
import { memoryCars, refreshMemoryStock } from "@/lib/stock";
import type { Car } from "@/lib/stock/types";
import { devFixtureCars } from "@/lib/dev-data";
import { reservationsStore, salesStore } from "./collections";
import { nextCarId } from "./stock-admin-pure";
import { dropCarPhotos } from "./car-photos";

// The dealer's view of the stock: every car, sold ones too, and the writes. On the Worker this is the `cars` table the public site reads
// (so a change shows on the site within seconds). With no D1 binding it edits the in-memory list the site reads (dev and E2E).
const hasDb = () => Boolean(getBindings().DB);

async function afterWrite() {
  if (hasDb()) (await import("@/lib/stock/d1-provider")).invalidateStockSnapshot();
  else refreshMemoryStock();
}

export async function adminCars(): Promise<Car[]> {
  if (!hasDb()) {
    // break-ui: in `next dev` the Demo / Worst case switch reaches the dashboard too, so its lists can be tried at 0, 1 or 1,284 cars.
    const dev = await devFixtureCars();
    return [...(dev ?? memoryCars)];
  }
  const rows = await getDb().select({ data: cars.data }).from(cars);
  return rows.map((r) => r.data as Car);
}

// The id for a new car: above every id still in use, by a car or by a record that names one (a sale, a deposit), so none is given twice.
export async function freeCarId(): Promise<string> {
  const [cars, sales, deposits] = await Promise.all([adminCars(), salesStore.list(), reservationsStore.list()]);
  return nextCarId([...cars, ...sales.map((s) => ({ id: s.carId ?? s.id })), ...deposits.map((r) => ({ id: r.carId }))]);
}

export async function adminCar(id: string): Promise<Car | undefined> {
  return (await adminCars()).find((c) => c.id === id);
}

export async function saveCar(car: Car): Promise<void> {
  if (hasDb()) {
    await getDb().insert(cars).values({ id: car.id, slug: car.slug, data: car }).onConflictDoUpdate({ target: cars.id, set: { slug: car.slug, data: car } });
  } else {
    const i = memoryCars.findIndex((c) => c.id === car.id);
    if (i >= 0) memoryCars[i] = car;
    else memoryCars.unshift(car);
  }
  await afterWrite();
}

// Its photos added in the dashboard go with it, after the row: a photo left behind is only space, a car without its photos is broken.
export async function removeCar(id: string): Promise<void> {
  const car = await adminCar(id);
  if (hasDb()) await getDb().delete(cars).where(eq(cars.id, id));
  else {
    const i = memoryCars.findIndex((c) => c.id === id);
    if (i >= 0) memoryCars.splice(i, 1);
  }
  await afterWrite();
  if (car) await dropCarPhotos(car.photos);
}
