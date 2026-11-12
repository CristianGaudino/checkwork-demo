"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { carFromForm } from "@/lib/admin/car-form";
import { logActivity } from "@/lib/admin/activity";
import { carEditSummary, costText } from "@/lib/admin/activity-text";
import { z } from "zod";
import { PREP_KINDS } from "@/lib/admin/prep";
import { costsStore, customersStore, getSettings, prepStore, salesStore } from "@/lib/admin/collections";
import { dublinDay, fmtEur } from "@/lib/admin/format";
import { newId } from "@/lib/admin/ids";
import { fieldErrors } from "@/lib/admin/validation";
import { EMAIL_INVALID } from "@/lib/copy";
import { LIMITS } from "@/lib/leads/constants";
import { carTitleOf } from "@/lib/admin/seed-data";
import { BAD_COST, parseCost } from "@/lib/admin/margins";
import { can } from "@/lib/permissions";
import { adminCar, adminCars, removeCar, saveCar } from "@/lib/admin/stock-admin";
import { nextCarId } from "@/lib/admin/stock-admin-pure";
import { stockSource } from "@/lib/stock-source";
import { runSync } from "@/lib/donedeal/sync";
import { isSold, type Car } from "@/lib/stock/types";

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
  if (was) await salesStore.remove(id); // back on sale: the sale fell through
  await logActivity("stock", was ? "Put back on sale" : "Marked sold", carRef(car));
  redirect("/dashboard/stock");
}

// Deleting is for owners and managers (the settings permission, as for a forced sync): it cannot be undone. Everyone else marks it sold.
export async function deleteCarAction(id: string) {
  if ((await readOnly()) || !(await can("settings"))) return;
  const car = await adminCar(id);
  await removeCar(id);
  await costsStore.remove(id); // the cost and the prep go with the car
  await prepStore.remove(id);
  if (car) await logActivity("stock", "Deleted the car", carRef(car));
  redirect("/dashboard/stock?deleted=1");
}

// Sync now, for stock from DoneDeal. `force` applies a sync that was held because DoneDeal's answer looked wrong: owners and managers only,
// since it can mark many cars sold at once. The sync records its own changes in the activity history.
export async function syncNowAction(force: boolean) {
  if (!(await readOnly())) return;
  await runSync({ force: force && (await can("settings")) });
  redirect(`/dashboard/stock?synced=1`);
}

export type SaleFormState = { errors?: Record<string, string> } | undefined;
const sale = z.object({
  priceEur: z.coerce.number({ message: "Enter the price in whole euros" }).int("Enter the price in whole euros").min(1, "Enter the price in whole euros").max(10_000_000, "That price looks too high"),
  soldOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose the day it sold"),
  salesperson: z.string().max(80).optional(),
  customerId: z.string().max(40).optional(),
  name: z.string().trim().max(80).optional(),
  email: z.preprocess((v) => (v === "" ? undefined : v), z.string().trim().toLowerCase().email(EMAIL_INVALID).max(LIMITS.email).optional()),
  phone: z.string().trim().max(30).optional(),
});

// What the car sold for, when, by whom and to whom. The buyer is a customer already on file, or a new one made here. In our version this
// is Mark sold, so the car is marked sold on the sale's day. In the DoneDeal version the car is sold there; the sale is only recorded.
export async function recordSaleAction(carId: string, _prev: SaleFormState, data: FormData): Promise<SaleFormState> {
  const car = await adminCar(carId);
  if (!car) return { errors: { priceEur: "This car no longer exists" } };
  const r = sale.safeParse(Object.fromEntries(data));
  if (!r.success) return { errors: fieldErrors(r.error) };
  const d = r.data;
  const today = dublinDay();
  if (d.soldOn > today) return { errors: { soldOn: "Choose a day that has passed or today" } };
  const { team } = await getSettings();
  const salesperson = team.some((t) => t.name === d.salesperson) ? d.salesperson : undefined;
  let customerId = d.customerId && (await customersStore.get(d.customerId)) ? d.customerId : undefined;
  if (!customerId) {
    if (!d.name) return { errors: { name: "Choose a customer, or enter the new customer's name" } };
    if (!d.email && !d.phone) return { errors: { phone: "Enter a phone number or an email" } };
    customerId = newId("cust");
    const at = Date.now();
    await customersStore.put({ id: customerId, name: d.name, email: d.email ?? "", phone: d.phone ?? "", source: "Sale", marketingConsent: false, createdAt: at, lastContactAt: at });
  }
  const was = await salesStore.get(car.id);
  await salesStore.put({ id: car.id, carTitle: carTitleOf(car), priceEur: d.priceEur, soldOn: d.soldOn, salesperson, customerId, createdAt: was?.createdAt ?? Date.now() });
  const markSold = !isSold(car) && !(await readOnly());
  if (markSold) await saveCar({ ...car, soldAt: d.soldOn });
  await logActivity("stock", `${was ? "Changed the sale to" : "Recorded the sale for"} ${fmtEur(d.priceEur)}${markSold ? " and marked it sold" : ""}`, carRef(car));
  redirect(`/dashboard/stock?view=sold&sale=${car.id}`);
}

// Prep costs: one line at a time, from the fixed list of kinds, margins permission only. Both versions: prep is the dealer's own spend.
const prepLine = z.object({
  kind: z.enum(PREP_KINDS, { message: "Choose what it was for" }),
  eur: z.coerce.number({ message: "Enter the amount in whole euros" }).int("Enter the amount in whole euros").min(1, "Enter the amount in whole euros").max(100_000, "That amount looks too high"),
  note: z.string().trim().max(80).optional(),
});
export type PrepFormState = { errors?: Record<string, string>; added?: number } | undefined;
export async function addPrepAction(carId: string, _prev: PrepFormState, data: FormData): Promise<PrepFormState> {
  const car = (await can("margins")) ? await adminCar(carId) : undefined;
  if (!car) return { errors: { kind: "Only staff who see margins can add prep costs" } };
  const r = prepLine.safeParse(Object.fromEntries(data));
  if (!r.success) return { errors: fieldErrors(r.error) };
  const prep = (await prepStore.get(carId)) ?? { id: carId, lines: [] };
  await prepStore.put({ ...prep, lines: [...prep.lines, { kind: r.data.kind, eur: r.data.eur, ...(r.data.note && { note: r.data.note }), at: Date.now() }] });
  await logActivity("stock", `Added a prep cost: ${r.data.kind}, ${fmtEur(r.data.eur)}`, carRef(car));
  revalidatePath(`/dashboard/stock/${carId}`);
  return { added: Date.now() }; // a new value each time, so the form clears after every line
}

// `at` names the line: two lines can share a kind and an amount, never the moment they were added.
export async function removePrepAction(carId: string, at: number) {
  const car = (await can("margins")) ? await adminCar(carId) : undefined;
  const prep = car && (await prepStore.get(carId));
  const line = prep?.lines.find((l) => l.at === at);
  if (!car || !prep || !line) return;
  await prepStore.put({ ...prep, lines: prep.lines.filter((l) => l !== line) });
  await logActivity("stock", `Removed a prep cost: ${line.kind}, ${fmtEur(line.eur)}`, carRef(car));
  revalidatePath(`/dashboard/stock/${carId}`);
}
