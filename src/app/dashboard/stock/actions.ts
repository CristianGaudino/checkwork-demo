"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { carFromForm } from "@/lib/admin/car-form";
import { logActivity } from "@/lib/admin/activity";
import { carEditSummary, costText } from "@/lib/admin/activity-text";
import { z } from "zod";
import { PREP_KINDS } from "@/lib/admin/prep";
import { DEPOSIT_METHODS, costsStore, customersStore, getSettings, heldFor, leadsStore, prepStore, reservationsStore, salesStore, undoSale } from "@/lib/admin/collections";
import { addMonths, dublinDay, fmtEur } from "@/lib/admin/format";
import { newId } from "@/lib/admin/ids";
import { fieldErrors } from "@/lib/admin/validation";
import { COVER_CHOICES, COVER_MONTHS } from "@/lib/admin/deposits";
import { EMAIL_INVALID } from "@/lib/copy";
import { LIMITS } from "@/lib/leads/constants";
import { carTitleOf } from "@/lib/admin/seed-data";
import { BAD_COST, parseCost } from "@/lib/admin/margins";
import { can } from "@/lib/permissions";
import { adminCar, adminCars, removeCar, saveCar } from "@/lib/admin/stock-admin";
import { listedOn, nextCarId } from "@/lib/admin/stock-admin-pure";
import { stockSource } from "@/lib/stock-source";
import { runSync } from "@/lib/donedeal/sync";
import { forSale, isSold, type Car } from "@/lib/stock/types";

const carRef = (c: Car) => ({ kind: "car" as const, id: c.id, label: carTitleOf(c) });


// Stock synced from DoneDeal is edited on DoneDeal: every write here is refused, whatever the page showed.
const readOnly = async () => (await stockSource()) === "donedeal";

export type CarFormState = { errors?: Record<string, string> } | undefined;

// `id` is null for a new car. A bad form comes back with a message per box; a good one saves and goes to the list.
export async function saveCarAction(id: string | null, _prev: CarFormState, data: FormData): Promise<CarFormState> {
  if (await readOnly()) return { errors: { make: "This stock comes from DoneDeal. Change it there." } };
  const existing = id ? await adminCar(id) : undefined;
  if (id && !existing) return { errors: { make: "This car no longer exists" } };
  const used = async () => [...(await adminCars()), ...(await salesStore.list()).map((s) => ({ id: s.carId ?? s.id })), ...(await reservationsStore.list()).map((r) => ({ id: r.carId }))];
  const result = carFromForm(data, id ?? nextCarId(await used()), existing);
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

// Back on sale is for a sold car with no sale recorded. One with a sale is undone on its own page (undoSaleAction), which keeps the record.
export async function toggleSoldAction(id: string) {
  if (await readOnly()) return;
  const car = await adminCar(id);
  if (!car || (car.soldAt && (await salesStore.get(id)))) return;
  const { soldAt: was, ...rest } = car;
  await saveCar(was ? rest : { ...car, soldAt: new Date().toISOString().slice(0, 10) });
  await logActivity("stock", was ? "Put back on sale" : "Marked sold", carRef(car));
  redirect("/dashboard/stock");
}

// On or off the website: publish a draft, hide a car, show it again. Anyone on the team (deleting is for managers). Our version only:
// DoneDeal stock is shown or hidden there. Undone from the toast by calling it again with the old state.
const LISTINGS = { live: "Put it on the website", hidden: "Hid it from the website", draft: "Made it a draft" } as const;
export async function setListingAction(id: string, to: string) {
  if (!Object.hasOwn(LISTINGS, to) || (await readOnly())) return;
  const car = await adminCar(id);
  const listing = to === "live" ? undefined : (to as "hidden" | "draft");
  if (!car || car.listing === listing) return;
  await saveCar({ ...car, listing, listedAt: listedOn(car, !listing, dublinDay()) });
  await logActivity("stock", LISTINGS[to as keyof typeof LISTINGS], carRef(car));
  revalidatePath("/dashboard/stock");
}

// DoneDeal took the ad down and the dealer says it was not sold: it stays hidden, and stops asking. (Sold goes through the sale form.)
export async function withdrawnAction(id: string) {
  const car = await adminCar(id);
  if (!car?.takenDownAt) return;
  await saveCar({ ...car, takenDownAt: undefined });
  await logActivity("stock", "Withdrawn: the DoneDeal ad came down and it did not sell", carRef(car));
  revalidatePath("/dashboard/stock");
}

// Deleting is for owners and managers (the settings permission, as for a forced sync): it cannot be undone. Everyone else marks it sold.
// Not while a deposit is held on it: the reservation is ended first, so the money is accounted for. Its sale, if any, stays for the books.
export async function deleteCarAction(id: string) {
  if ((await readOnly()) || !(await can("settings")) || heldFor(await reservationsStore.list(), id)) return;
  const car = await adminCar(id);
  await removeCar(id);
  await costsStore.remove(id); // the cost and the prep go with the car
  await prepStore.remove(id);
  if (car) await logActivity("stock", "Deleted the car", carRef(car));
  redirect("/dashboard/stock?deleted=1");
}

// Sync now, for stock from DoneDeal. `force` applies a sync that was held because DoneDeal's answer looked wrong: owners and managers only,
// since it can take many cars off the site at once. The sync records its own changes in the activity history.
export async function syncNowAction(force: boolean) {
  if (!(await readOnly())) return;
  await runSync({ force: force && (await can("settings")) });
  redirect(`/dashboard/stock?synced=1`);
}

export type SaleFormState = { errors?: Record<string, string> } | undefined;
const day = (message: string) => z.string().regex(/^\d{4}-\d{2}-\d{2}$/, message);
const euros = (max: number, min = 1) => z.coerce.number({ message: "Enter the amount in whole euros" }).int("Enter the amount in whole euros").min(min, "Enter the amount in whole euros").max(max, "That amount looks too high");
// The buyer, on a sale or a deposit: a customer already on file, or a new one made from a name and a phone or an email.
const buyer = {
  salesperson: z.string().max(80).optional(),
  customerId: z.string().max(40).optional(),
  name: z.string().trim().max(80).optional(),
  email: z.preprocess((v) => (v === "" ? undefined : v), z.string().trim().toLowerCase().email(EMAIL_INVALID).max(LIMITS.email).optional()),
  phone: z.string().trim().max(30).optional(),
};
type Buyer = { salesperson?: string; customerId?: string; name?: string; email?: string; phone?: string };
async function buyerOf(d: Buyer, source: string): Promise<{ customerId: string; salesperson?: string } | { errors: Record<string, string> }> {
  const { team } = await getSettings();
  const salesperson = team.some((t) => t.name === d.salesperson) ? d.salesperson : undefined;
  if (d.customerId && (await customersStore.get(d.customerId))) return { customerId: d.customerId, salesperson };
  if (!d.name) return { errors: { name: "Choose a customer, or enter the new customer's name" } };
  if (!d.email && !d.phone) return { errors: { phone: "Enter a phone number or an email" } };
  const customerId = newId("cust");
  const at = Date.now();
  await customersStore.put({ id: customerId, name: d.name, email: d.email ?? "", phone: d.phone ?? "", source, marketingConsent: false, createdAt: at, lastContactAt: at });
  return { customerId, salesperson };
}
// Cover is the included months or more (extended cover bought); a trade-in is a reg with its allowance, both or neither.
const blank = (v: unknown) => (v === "" ? undefined : v);
const sale = z.object({
  priceEur: euros(10_000_000),
  soldOn: day("Choose the day it sold"),
  coverMonths: z.preprocess(blank, z.coerce.number().refine((n) => (COVER_CHOICES as readonly number[]).includes(n), "Choose the cover").optional()),
  tradeReg: z.preprocess(blank, z.string().trim().toUpperCase().max(12).optional()),
  tradeEur: z.preprocess(blank, euros(1_000_000).optional()),
  leadId: z.string().max(60).optional(),
  ...buyer,
});

// What the car sold for, when, by whom and to whom. The buyer is a customer already on file, or a new one made here. In our version this
// is Mark sold, so the car is marked sold on the sale's day. In the DoneDeal version the car is sold there; the sale is only recorded, and a
// car hidden because its ad came down is marked sold here (the dealer's answer), so its page shows it as sold for a while.
export async function recordSaleAction(carId: string, _prev: SaleFormState, data: FormData): Promise<SaleFormState> {
  const car = await adminCar(carId);
  if (!car) return { errors: { priceEur: "This car no longer exists" } };
  const r = sale.safeParse(Object.fromEntries(data));
  if (!r.success) return { errors: fieldErrors(r.error) };
  const d = r.data;
  const today = dublinDay();
  if (d.soldOn > today) return { errors: { soldOn: "Choose a day that has passed or today" } };
  if (Boolean(d.tradeReg) !== Boolean(d.tradeEur)) return { errors: d.tradeReg ? { tradeEur: "Enter the allowance for the trade-in" } : { tradeReg: "Enter the trade-in's registration" } };
  const who = await buyerOf(d, "Sale");
  if ("errors" in who) return who;
  const was = await salesStore.get(car.id);
  // A deposit on the car is part of this sale: the reservation ends as sold, and the sale says how much was paid up front.
  const held = heldFor(await reservationsStore.list(), car.id);
  if (held) await reservationsStore.put({ ...held, status: "sold", endedOn: d.soldOn });
  const depositEur = held?.depositEur ?? was?.depositEur;
  // The lead it came from (one on this car, still open or already won) is marked won with it.
  const lead = d.leadId ? await leadsStore.get(d.leadId) : undefined;
  const leadId = lead?.carSlug === car.slug && lead.status !== "lost" ? lead.id : undefined;
  if (lead && leadId && lead.status !== "won") await leadsStore.put({ ...lead, status: "won", followUpOn: undefined, notes: [...lead.notes, { at: Date.now(), text: "Bought the car." }] });
  await salesStore.put({
    id: car.id,
    carTitle: carTitleOf(car),
    priceEur: d.priceEur,
    soldOn: d.soldOn,
    ...who,
    ...(depositEur && { depositEur }),
    ...(d.coverMonths && d.coverMonths !== COVER_MONTHS && { coverMonths: d.coverMonths }),
    ...(d.tradeReg && d.tradeEur && { tradeIn: { reg: d.tradeReg, allowanceEur: d.tradeEur } }),
    ...(leadId && { leadId }),
    createdAt: was?.createdAt ?? Date.now(),
  });
  const markSold = !isSold(car) && (!(await readOnly()) || Boolean(car.takenDownAt));
  if (markSold) await saveCar({ ...car, soldAt: d.soldOn, reserved: undefined, ...(car.takenDownAt && { takenDownAt: undefined, listing: undefined }) });
  await logActivity("stock", `${was ? "Changed the sale to" : "Recorded the sale for"} ${fmtEur(d.priceEur)}${markSold ? " and marked it sold" : ""}`, carRef(car));
  redirect(`/dashboard/stock?view=sold&sale=${car.id}`);
}

// A deposit: the car is reserved, on the website as Reserved, until the day agreed. Anyone on the team. Our version only.
export type DepositFormState = { errors?: Record<string, string> } | undefined;
const deposit = z.object({
  depositEur: euros(1_000_000),
  method: z.enum(DEPOSIT_METHODS, { message: "Choose how it was paid" }),
  paidOn: day("Choose the day it was paid"),
  until: day("Choose the last day it is held"),
  ...buyer,
});
// shortcut: two people taking a deposit on one car in the same second could both pass the for-sale check; only the first can then be
// ended. Fine for one dealer's team; check again inside a transaction if it ever shows up.
export async function reserveAction(carId: string, _prev: DepositFormState, data: FormData): Promise<DepositFormState> {
  const car = (await readOnly()) ? undefined : await adminCar(carId);
  if (!car || !forSale(car)) return { errors: { depositEur: "This car is not for sale" } };
  const r = deposit.safeParse(Object.fromEntries(data));
  if (!r.success) return { errors: fieldErrors(r.error) };
  const d = r.data;
  const today = dublinDay();
  if (d.depositEur > car.priceEur) return { errors: { depositEur: "A deposit cannot be more than the price" } };
  if (d.paidOn > today) return { errors: { paidOn: "Choose a day that has passed or today" } };
  if (d.until < today || d.until > addMonths(today, 3)) return { errors: { until: "Choose a day in the next three months" } };
  const who = await buyerOf(d, "Deposit");
  if ("errors" in who) return who;
  await reservationsStore.put({ id: newId("res"), carId: car.id, carTitle: carTitleOf(car), ...who, depositEur: d.depositEur, method: d.method, paidOn: d.paidOn, until: d.until, status: "held", createdAt: Date.now() });
  await saveCar({ ...car, reserved: true });
  await logActivity("stock", `Took a deposit of ${fmtEur(d.depositEur)}, reserved until ${d.until}`, carRef(car));
  redirect(`/dashboard/stock?view=reserved&reserved=${car.id}`);
}

// Ending a reservation that did not become a sale: the deposit refunded (all or part) or kept, under the dealer's terms. Money going
// back, so owners and managers only (the settings permission). The car goes back on sale.
const ending = z.discriminatedUnion("outcome", [z.object({ outcome: z.literal("refunded"), refundEur: euros(1_000_000) }), z.object({ outcome: z.literal("kept") })], { message: "Choose what happened to the deposit" });
export async function endReservationAction(carId: string, _prev: DepositFormState, data: FormData): Promise<DepositFormState> {
  if (!(await can("settings"))) return { errors: { outcome: "Only owners and managers can end a reservation" } };
  const held = heldFor(await reservationsStore.list(), carId);
  if (!held) return { errors: { outcome: "This car has no deposit on it" } };
  const r = ending.safeParse(Object.fromEntries(data));
  if (!r.success) return { errors: fieldErrors(r.error) };
  if (r.data.outcome === "refunded" && r.data.refundEur > held.depositEur) return { errors: { refundEur: `The deposit was ${fmtEur(held.depositEur)}` } };
  const refundEur = r.data.outcome === "refunded" ? r.data.refundEur : undefined;
  await reservationsStore.put({ ...held, status: r.data.outcome, endedOn: dublinDay(), ...(refundEur && { refundEur }) });
  const car = await adminCar(carId);
  if (car?.reserved) await saveCar({ ...car, reserved: undefined });
  await logActivity("stock", refundEur ? `Ended the reservation and refunded ${fmtEur(refundEur)}` : `Ended the reservation and kept the deposit of ${fmtEur(held.depositEur)}`, car ? carRef(car) : { kind: "car", id: carId, label: held.carTitle });
  redirect("/dashboard/stock");
}

// Undoing a sale, keeping its record: it fell through before the buyer took the car (cancelled), or the buyer brought the car back
// (returned, with what was refunded and why). Owners and managers only. In our version a returned car comes back hidden, to be looked
// over before it goes on the website again; a cancelled one goes straight back on sale. With DoneDeal stock only the record changes.
const undoing = z.object({
  kind: z.enum(["cancelled", "returned"], { message: "Choose what happened" }),
  returnedOn: day("Choose the day"),
  refundEur: z.preprocess((v) => (v === "" ? undefined : v), euros(10_000_000, 0).optional()),
  reason: z.string().trim().max(300).optional(),
});
export async function undoSaleAction(carId: string, _prev: SaleFormState, data: FormData): Promise<SaleFormState> {
  if (!(await can("settings"))) return { errors: { kind: "Only owners and managers can undo a sale" } };
  const was = await salesStore.get(carId);
  if (!was) return { errors: { kind: "This car has no sale recorded" } };
  const r = undoing.safeParse(Object.fromEntries(data));
  if (!r.success) return { errors: fieldErrors(r.error) };
  const d = r.data;
  if (d.returnedOn > dublinDay() || d.returnedOn < was.soldOn) return { errors: { returnedOn: "Choose a day from the sale to today" } };
  if (d.refundEur !== undefined && d.refundEur > was.priceEur) return { errors: { refundEur: `It sold for ${fmtEur(was.priceEur)}` } };
  if (d.kind === "returned" && d.refundEur === undefined) return { errors: { refundEur: "Enter what was refunded, 0 if nothing" } };
  if (d.kind === "returned" && !d.reason) return { errors: { reason: "Say why it came back" } };
  await undoSale(was, { returnedOn: d.returnedOn, kind: d.kind, ...(d.refundEur !== undefined && { refundEur: d.refundEur }), ...(d.reason && { reason: d.reason }) });
  const car = (await readOnly()) ? undefined : await adminCar(carId);
  if (car) await saveCar({ ...car, soldAt: undefined, ...(d.kind === "returned" && { listing: "hidden" as const }) });
  const ref = car ? carRef(car) : { kind: "car" as const, id: carId, label: was.carTitle };
  await logActivity("stock", d.kind === "returned" ? `Took the car back and refunded ${fmtEur(d.refundEur ?? 0)}` : "Cancelled the sale", ref);
  redirect(`/dashboard/stock?view=${car && d.kind === "returned" ? "hidden" : "for-sale"}&undone=${carId}`);
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
