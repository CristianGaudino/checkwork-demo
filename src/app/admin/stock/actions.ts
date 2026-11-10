"use server";

import { redirect } from "next/navigation";
import { carFromForm } from "@/lib/admin/car-form";
import { costsStore } from "@/lib/admin/collections";
import { can } from "@/lib/permissions";
import { adminCar, adminCars, removeCar, saveCar } from "@/lib/admin/stock-admin";
import { nextCarId } from "@/lib/admin/stock-admin-pure";

export type CarFormState = { errors?: Record<string, string> } | undefined;

// `id` is null for a new car. A bad form comes back with a message per box; a good one saves and goes to the list.
export async function saveCarAction(id: string | null, _prev: CarFormState, data: FormData): Promise<CarFormState> {
  const existing = id ? await adminCar(id) : undefined;
  if (id && !existing) return { errors: { make: "This car no longer exists" } };
  const result = carFromForm(data, id ?? nextCarId(await adminCars()), existing);
  if (!result.ok) return { errors: result.errors };
  await saveCar(result.car);
  // The cost belongs to staff with the margins permission: without it the box never came, and a forged one is ignored.
  if (await can("margins")) {
    const raw = String(data.get("costEur") ?? "").trim();
    const eur = Number(raw);
    if (raw === "") await costsStore.remove(result.car.id);
    else if (Number.isFinite(eur) && eur >= 0 && eur <= 2_000_000) await costsStore.put({ id: result.car.id, costEur: Math.round(eur) });
  }
  redirect(`/admin/stock?saved=${result.car.id}`);
}

export async function toggleSoldAction(id: string) {
  const car = await adminCar(id);
  if (!car) return;
  const { soldAt: was, ...rest } = car;
  await saveCar(was ? rest : { ...car, soldAt: new Date().toISOString().slice(0, 10) });
  redirect("/admin/stock");
}

export async function deleteCarAction(id: string) {
  await removeCar(id);
  await costsStore.remove(id); // the cost goes with the car
  redirect("/admin/stock?deleted=1");
}
