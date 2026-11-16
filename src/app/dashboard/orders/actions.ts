"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { logActivity } from "@/lib/admin/activity";
import { buyerFields, buyerOf } from "@/lib/admin/buyer";
import { DEPOSIT_METHODS, ORDER_STATUS_LABELS, heldFor, leadsStore, orderOpen, ordersStore, reservationsStore, type Order } from "@/lib/admin/collections";
import { addDays, addMonths, dublinDay, fmtEur } from "@/lib/admin/format";
import { newId } from "@/lib/admin/ids";
import { adminCar, freeCarId, saveCar } from "@/lib/admin/stock-admin";
import { carSlug, slugify } from "@/lib/admin/stock-admin-pure";
import { fieldErrors, isoMonth } from "@/lib/admin/validation";
import { regPeriods } from "@/lib/leads/reg-periods";
import { can } from "@/lib/permissions";
import { stockSource } from "@/lib/stock-source";
import type { Car } from "@/lib/stock/types";
import { LISTING_SITE } from "@/lib/stock-source-rules";
import { requireModule } from "@/lib/modules";
import { requireStaff } from "@/lib/staff";

// Factory orders, our version only (a DoneDeal dealer's new cars arrive on DoneDeal). Anyone on the team places one and moves it along;
// cancelling, with money going back or kept, is for owners and managers. Recorded in the activity history by the car, never the buyer.
const theirs = async () => (await stockSource()) !== "donedeal";
const title = (o: Pick<Order, "make" | "model" | "regPeriod">) => `${o.regPeriod} ${o.make} ${o.model}`;
const paths = (id: string) => {
  revalidatePath("/dashboard/orders");
  revalidatePath(`/dashboard/orders/${id}`);
};

export type OrderFormState = { errors?: Record<string, string> } | undefined;
const blank = (v: unknown) => (v === "" ? undefined : v);
const euros = (max: number) => z.coerce.number({ message: "Enter the amount in whole euros" }).int("Enter the amount in whole euros").min(1, "Enter the amount in whole euros").max(max, "That amount looks too high");
const placing = z.object({
  make: z.string().trim().min(1, "Enter the make").max(40),
  model: z.string().trim().min(1, "Enter the model").max(60),
  spec: z.preprocess(blank, z.string().trim().max(120).optional()),
  colour: z.preprocess(blank, z.string().trim().max(40).optional()),
  priceEur: euros(1_000_000),
  depositEur: z.preprocess(blank, euros(1_000_000).optional()),
  depositMethod: z.preprocess(blank, z.enum(DEPOSIT_METHODS).optional()),
  regPeriod: z.string().max(3),
  expected: isoMonth("Choose the month it is due"),
  leadId: z.string().max(60).optional(),
  ...buyerFields,
});

export async function placeOrderAction(_prev: OrderFormState, data: FormData): Promise<OrderFormState> {
  await requireStaff(); // a server action can be posted to any page: only staff Access let in (src/lib/staff.ts)
  await requireModule("newCars"); // and only while the dealer has it
  if (!(await theirs())) return { errors: { make: `Orders are for stock kept here, not on ${LISTING_SITE}` } };
  const r = placing.safeParse(Object.fromEntries(data));
  if (!r.success) return { errors: fieldErrors(r.error) };
  const d = r.data;
  const today = dublinDay();
  if (!regPeriods(today).includes(d.regPeriod)) return { errors: { regPeriod: "Choose a registration period" } };
  if (d.expected < today.slice(0, 7) || d.expected > addMonths(today, 24).slice(0, 7)) return { errors: { expected: "Choose a month in the next two years" } };
  if (d.depositEur && d.depositEur > d.priceEur) return { errors: { depositEur: "A deposit cannot be more than the price" } };
  if (d.depositEur && !d.depositMethod) return { errors: { depositMethod: "Choose how the deposit was paid" } };
  const who = await buyerOf(d, "Order");
  if ("errors" in who) return who;
  const lead = d.leadId ? await leadsStore.get(d.leadId) : undefined;
  const id = newId("order");
  const o: Order = {
    id,
    ...who,
    make: d.make,
    model: d.model,
    ...(d.spec && { spec: d.spec }),
    ...(d.colour && { colour: d.colour }),
    priceEur: d.priceEur,
    ...(d.depositEur && { depositEur: d.depositEur, depositMethod: d.depositMethod }),
    regPeriod: d.regPeriod,
    expected: d.expected,
    orderedOn: today,
    status: "ordered",
    ...(lead && { leadId: lead.id }),
    notes: [],
    createdAt: Date.now(),
  };
  await ordersStore.put(o);
  if (lead && lead.status !== "won") await leadsStore.put({ ...lead, status: "won", followUpOn: undefined, notes: [...lead.notes, { at: Date.now(), text: "Placed a factory order." }] });
  await logActivity("stock", `Placed a factory order: ${title(o)}${o.depositEur ? `, ${fmtEur(o.depositEur)} deposit` : ""}`);
  redirect(`/dashboard/orders/${id}`);
}

// Ordered, Built, On its way, Arrived: by hand, as the maker tells the dealer. Arrived adds the car to stock, hidden (it is sold), and
// reserved for the buyer with their deposit, so Mark sold on it is the handover. Handed over is set by that sale, never here, and an arrived
// order never steps back (its car is in stock, and the sale only hands over an arrived order).
const steps = z.enum(["ordered", "built", "in-transit", "arrived"]);
export async function setOrderStatusAction(id: string, data: FormData) {
  await requireStaff(); // a server action can be posted to any page: only staff Access let in (src/lib/staff.ts)
  await requireModule("newCars"); // and only while the dealer has it
  const to = steps.safeParse(data.get("status"));
  const o = await ordersStore.get(id);
  if (!to.success || !o || !orderOpen(o.status) || o.status === "arrived" || o.status === to.data || !(await theirs())) return;
  let carId = o.carId;
  if (to.data === "arrived" && !carId) {
    carId = await freeCarId();
    const base = { id: carId, make: o.make, model: o.model, year: 2000 + Number(o.regPeriod.slice(0, 2)) };
    const car: Car = { ...base, slug: carSlug(base), makeSlug: slugify(o.make), modelSlug: slugify(o.model), ...(o.spec && { variant: o.spec }), ...(o.colour && { colour: o.colour }), priceEur: o.priceEur, condition: "new", photos: [], listing: "hidden", ...(o.depositEur && { reserved: true }) };
    await saveCar(car);
    if (o.depositEur) {
      const today = dublinDay();
      await reservationsStore.put({ id: newId("res"), carId, carTitle: title(o), customerId: o.customerId, depositEur: o.depositEur, method: o.depositMethod ?? "Card", paidOn: o.orderedOn, until: addDays(today, 30), salesperson: o.salesperson, status: "held", createdAt: Date.now() });
    }
  }
  await ordersStore.put({ ...o, status: to.data, ...(carId && { carId }) });
  await logActivity("stock", `Moved the factory order ${title(o)} from ${ORDER_STATUS_LABELS[o.status]} to ${ORDER_STATUS_LABELS[to.data]}`, carId ? { kind: "car", id: carId, label: title(o) } : undefined);
  paths(id);
}

export async function addOrderNoteAction(id: string, data: FormData) {
  await requireStaff(); // a server action can be posted to any page: only staff Access let in (src/lib/staff.ts)
  await requireModule("newCars"); // and only while the dealer has it
  const text = String(data.get("note") ?? "").trim().slice(0, 500);
  const o = await ordersStore.get(id);
  if (!text || !o) return;
  await ordersStore.put({ ...o, notes: [...o.notes, { at: Date.now(), text }] });
  paths(id);
}

// Cancelling: the deposit refunded (all or part) or kept, under the dealer's terms. A car that already arrived stays in stock, hidden and
// no longer held for them: the dealer decides whether to sell it.
const cancelling = z.discriminatedUnion("outcome", [z.object({ outcome: z.literal("refunded"), refundEur: euros(1_000_000) }), z.object({ outcome: z.literal("kept") }), z.object({ outcome: z.literal("none") })], { message: "Choose what happened to the deposit" });
export async function cancelOrderAction(id: string, _prev: OrderFormState, data: FormData): Promise<OrderFormState> {
  await requireStaff(); // a server action can be posted to any page: only staff Access let in (src/lib/staff.ts)
  await requireModule("newCars"); // and only while the dealer has it
  if (!(await can("settings"))) return { errors: { outcome: "Only owners and managers can cancel an order" } };
  const o = await ordersStore.get(id);
  if (!o || !orderOpen(o.status)) return { errors: { outcome: "This order can no longer be cancelled" } };
  const r = cancelling.safeParse(Object.fromEntries(data));
  if (!r.success) return { errors: fieldErrors(r.error) };
  if (o.depositEur && r.data.outcome === "none") return { errors: { outcome: "Choose what happened to the deposit" } };
  if (r.data.outcome === "refunded" && r.data.refundEur > (o.depositEur ?? 0)) return { errors: { refundEur: `The deposit was ${fmtEur(o.depositEur ?? 0)}` } };
  const refundEur = r.data.outcome === "refunded" ? r.data.refundEur : undefined;
  await ordersStore.put({ ...o, status: "cancelled", ...(refundEur && { refundEur }) });
  const held = o.carId ? heldFor(await reservationsStore.list(), o.carId) : undefined;
  if (held) await reservationsStore.put({ ...held, status: r.data.outcome === "refunded" ? "refunded" : "kept", endedOn: dublinDay(), ...(refundEur && { refundEur }) });
  const car = o.carId ? await adminCar(o.carId) : undefined;
  if (car?.reserved) await saveCar({ ...car, reserved: undefined });
  await logActivity("stock", `Cancelled the factory order ${title(o)}${refundEur ? `, refunded ${fmtEur(refundEur)}` : r.data.outcome === "kept" ? ", deposit kept" : ""}`);
  redirect(`/dashboard/orders/${id}`);
}
