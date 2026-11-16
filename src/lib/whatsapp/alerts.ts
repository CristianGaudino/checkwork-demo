import "server-only";
import { addMessage, isStaffAlert, lastWeek, messagesStore, staffStore, type Msg } from "./store";
import { modeOf } from "@/lib/integrations";
import { recordUsage, usageAllowed } from "@/lib/billing/usage";
import { EVENTS, SLOW_DAYS, SLOW_DROP_EUR, alertText, eventOfLead, firstName, inQuiet, type EventId, type Facts } from "./rules";
import { enabledModules } from "@/lib/modules";
import { SITE_NAME, TIME_ZONE } from "@/lib/site";
import type { Lead } from "@/lib/admin/collections";
import { drivesStore, getSettings, leadsStore, reviewsStore, salesStore } from "@/lib/admin/collections";
import { adminCars } from "@/lib/admin/stock-admin";
import { carTitleOf } from "@/lib/admin/seed-data";
import { daysSince, dublinDay } from "@/lib/admin/format";
import { forSale, onRequest, type Car } from "@/lib/stock/types";
import { DAY } from "@/lib/time";

const clock = () => new Date().toLocaleTimeString("en-GB", { timeZone: TIME_ZONE, hour: "2-digit", minute: "2-digit" });
type Draft = Omit<Msg, "id" | "at" | "via">;

// Each team member's copy of one alert: still on the team, a linked phone, that alert on, and outside their quiet hours.
async function staffCopies(event: EventId, text: string, extra: Partial<Draft>): Promise<Draft[]> {
  const now = clock();
  const team = new Set((await getSettings()).team.map((t) => t.id)); // only people still on the team
  return (await staffStore.list())
    .filter((p) => team.has(p.id) && p.phone && p.alerts.includes(event) && !inQuiet(now, p.quietFrom, p.quietTo))
    .map((p) => ({ thread: "staff", from: "site", to: p.name, event, text, buttons: EVENTS[event].buttons, ...extra }));
}

// One cap check and one count for the whole batch, so a visitor's submit is not many round trips. Over the cap (or not connected) an alert
// goes by email, a buyer's only where there is an address (`canEmail`), and a marketing message is not sent. Returns how many were sent.
// shortcut: one batch (a few, one per linked phone) can pass the cap by those few cents; check per message if it ever matters.
async function deliver(drafts: Draft[], kind: "alert" | "marketing", canEmail: (d: Draft) => boolean = () => true): Promise<number> {
  const viaWhatsApp = modeOf("whatsapp") === "simulated" && (await usageAllowed("whatsapp"));
  if (!viaWhatsApp && kind === "marketing") return 0;
  const out = drafts.filter((d) => viaWhatsApp || canEmail(d));
  for (const d of out) await addMessage({ ...d, ...(!viaWhatsApp && { via: "email" as const }) });
  if (viaWhatsApp && out.length) await recordUsage("whatsapp", kind, out.length);
  return out.length;
}

// A new website request reaches each team member who has that alert on, in their WhatsApp, with the buttons for it; and its buyer, if they
// ticked the WhatsApp box, gets a confirmation. Best effort and silent without the module: the lead is already stored and the dashboard has
// it, so a failure here is never a failed form (called from src/lib/admin/real-leads.ts, outside the dashboard, so it checks the module itself).
export async function alertStaffOnWhatsApp(lead: Lead): Promise<void> {
  try {
    const modules = await enabledModules();
    if (!modules.has("whatsapp")) return;
    const event = eventOfLead(lead.type, modules);
    const text = alertText(event, { first: firstName(lead.name), car: lead.carTitle, reg: lead.reg, text: lead.message, sell: lead.type === "sell", warranty: lead.type === "warranty" });
    const drafts = await staffCopies(event, text, { leadId: lead.id, ref: lead.id, ...(event === "enquiry" && !lead.carTitle && { buttons: ["call", "handled"] }), ...(lead.photoKeys?.length && { photoKeys: lead.photoKeys }) });
    if (lead.whatsappOptIn && lead.phone) drafts.push({ thread: "buyer", from: "site", leadId: lead.id, text: `Hi ${firstName(lead.name)}, thanks for your message to ${SITE_NAME}. We have it and will be in touch soon.` });
    // By email instead only where there is an address: a buyer with only a phone gets nothing rather than an email nobody receives.
    await deliver(drafts, "alert", (d) => d.thread !== "buyer" || Boolean(lead.email));
  } catch {
    // shortcut: a lost alert is still in the bell and the leads list; add a retry with the adapter
  }
}

// Any other alert (a deposit, a new car, a review, a slow car, the Monday summary), to the team members who have it on, while the dealer has
// both WhatsApp and the alert's own module. Best effort, as above: the action that caused it has already happened. Returns how many went.
export async function alertStaff(event: EventId, facts: Facts, extra: Partial<Draft> = {}): Promise<number> {
  try {
    const modules = await enabledModules();
    if (!modules.has("whatsapp") || !modules.has(EVENTS[event].module)) return 0;
    return await deliver(await staffCopies(event, alertText(event, facts), extra), EVENTS[event].kind);
  } catch {
    return 0; // shortcut: as above
  }
}

// A car going on the website for the first time (added, or a draft published): a nudge to post it.
export const alertNewIn = (car: Car) => alertStaff("new-in", { car: carTitleOf(car) }, { ref: car.id });

// The morning job (worker.mjs, /api/whatsapp/daily): each old stock car (OLD_STOCK_DAYS) and each review from the last two days, once while its
// alert is kept (30 days, so a car still unsold a month on is raised again), and on a Monday last week's summary.
export async function sendDailyAlerts(now = Date.now()): Promise<{ sent: number }> {
  if (!(await enabledModules()).has("whatsapp")) return { sent: 0 };
  const said = new Set((await messagesStore.list()).filter(isStaffAlert).map((m) => `${m.event}:${m.ref}`));
  const [cars, reviews] = await Promise.all([adminCars(), reviewsStore.list()]);
  let sent = 0;
  for (const c of cars) {
    const days = c.listedAt ? daysSince(c.listedAt, now) : 0;
    if (forSale(c) && !onRequest(c) && days >= SLOW_DAYS && !said.has(`slow-stock:${c.id}`)) sent += await alertStaff("slow-stock", { car: carTitleOf(c), days, dropEur: SLOW_DROP_EUR }, { ref: c.id });
  }
  for (const r of reviews) if (r.createdAt > now - 2 * DAY && !said.has(`review:${r.id}`)) sent += await alertStaff("review", { stars: r.rating, author: r.author, text: r.text }, { ref: r.id });
  if (new Date(`${dublinDay(now)}T12:00:00Z`).getUTCDay() === 1) {
    const [leads, sales, drives] = await Promise.all([leadsStore.list(), salesStore.list(), drivesStore.list()]);
    sent += await alertStaff("monday", lastWeek({ leads, cars, sales, reviews }, drives, now));
  }
  return { sent };
}
