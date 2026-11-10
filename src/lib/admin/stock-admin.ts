import "server-only";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { cars } from "@/lib/db/schema";
import { getBindings } from "@/lib/leads/bindings";
import { memoryCars, refreshMemoryStock } from "@/lib/stock";
import type { Car } from "@/lib/stock/types";

// The dealer's view of the stock: every car, sold ones too, and the writes. On the Worker this is the `cars` table the public site reads
// (so a change shows on the site within seconds). With no D1 binding it edits the in-memory list the site reads (dev and E2E).
const hasDb = () => Boolean(getBindings().DB);

async function afterWrite() {
  if (hasDb()) (await import("@/lib/stock/d1-provider")).invalidateStockSnapshot();
  else refreshMemoryStock();
}

export async function adminCars(): Promise<Car[]> {
  if (!hasDb()) return [...memoryCars];
  const rows = await getDb().select({ data: cars.data }).from(cars);
  return rows.map((r) => r.data as Car);
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

export async function removeCar(id: string): Promise<void> {
  if (hasDb()) await getDb().delete(cars).where(eq(cars.id, id));
  else {
    const i = memoryCars.findIndex((c) => c.id === id);
    if (i >= 0) memoryCars.splice(i, 1);
  }
  await afterWrite();
}
