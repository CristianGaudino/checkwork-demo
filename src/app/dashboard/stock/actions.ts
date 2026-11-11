"use server";

import { redirect } from "next/navigation";
import { carFromForm } from "@/lib/admin/car-form";
import { logActivity } from "@/lib/admin/activity";
import { carEditSummary, costText } from "@/lib/admin/activity-text";
import { costsStore } from "@/lib/admin/collections";
import { carTitleOf } from "@/lib/admin/seed-data";
import { BAD_COST, parseCost } from "@/lib/admin/margins";
import { can } from "@/lib/permissions";
import { adminCar, adminCars, removeCar, saveCar } from "@/lib/admin/stock-admin";
import { nextCarId } from "@/lib/admin/stock-admin-pure";
import { stockSource } from "@/lib/stock-source";
import type { Car } from "@/lib/stock/types";

const carRef = (c: Car) => ({ kind: "car" as const, id: c.id, label: carTitleOf(c) });


// Stock synced from DoneDeal is edited on DoneDeal: every write here is refused, whatever the page showed.
const readOnly = async () => (await stockSource()) === "donedeal";

export type CarFormState = { errors?: Record<string, string> } | undefined;

// `id` is null for a new car. A bad form comes back with a message per box; a good one saves and goes to the list.
export async function saveCarAction(id: string | null, _prev: CarFormState, data: FormData): Promise<CarFormState> {
  if (await readOnly()) return { errors: { make: "This stock comes from DoneDeal. Change it there." } };
  const existing = id ? await adminCar(id) : undefined;
  if (id && !existing) return { errors: { make: "This car no longer exists" } };
  const result = carFromForm(data, id ?? nextCarId(await adminCars()), existing);
  if (!result.ok) return { errors: result.errors };
  // The cost belongs to staff with the margins permission: without it the box never came, and a forged one is ignored. A bad figure stops the
  // save, so the car is never saved with a cost the dealer did not mean.
  const cost = (await can("margins")) ? parseCost(String(data.get("costEur") ?? "")) : undefined;
  if (cost === "invalid") return { errors: { costEur: BAD_COST } };
  const wasCost = cost === undefined ? undefined : (await costsStore.get(result.car.id))?.costEur;
  await saveCar(result.car);
  if (cost === null) await costsStore.remove(result.car.id);
  else if (cost !== undefined) await costsStore.put({ id: result.car.id, costEur: cost });
  await logActivity("stock", existing ? carEditSummary(existing, result.car) : "Added the car", carRef(result.car));
  const costChange = cost === undefined ? null : costText(wasCost, cost);
  if (costChange) await logActivity("stock", costChange, carRef(result.car));
  redirect(`/dashboard/stock?saved=${result.car.id}`);
}

// The cost is the dealer's own figure, never DoneDeal's, so it can be set on synced stock too. Margins permission only; a bad figure saves nothing.
export async function saveCostAction(id: string, data: FormData) {
  const car = (await can("margins")) ? await adminCar(id) : undefined;
  if (!car) return;
  const cost = parseCost(String(data.get("costEur") ?? ""));
  if (cost === "invalid") return;
  const was = (await costsStore.get(id))?.costEur;
  if (cost === null) await costsStore.remove(id);
  else await costsStore.put({ id, costEur: cost });
  const change = costText(was, cost);
  if (change) await logActivity("stock", change, carRef(car));
  redirect(`/dashboard/stock/${id}?cost=saved`);
}

export async function toggleSoldAction(id: string) {
  if (await readOnly()) return;
  const car = await adminCar(id);
  if (!car) return;
  const { soldAt: was, ...rest } = car;
  await saveCar(was ? rest : { ...car, soldAt: new Date().toISOString().slice(0, 10) });
  await logActivity("stock", was ? "Put back on sale" : "Marked sold", carRef(car));
  redirect("/dashboard/stock");
}

export async function deleteCarAction(id: string) {
  if (await readOnly()) return;
  const car = await adminCar(id);
  await removeCar(id);
  await costsStore.remove(id); // the cost goes with the car
  if (car) await logActivity("stock", "Deleted the car", carRef(car));
  redirect("/dashboard/stock?deleted=1");
}
