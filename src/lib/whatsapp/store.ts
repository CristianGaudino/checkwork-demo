import "server-only";
import { defineCollection } from "@/lib/admin/docs";
import { TEAM_SEED, demoDrives, demoLeads, demoReviews, leadsStore } from "@/lib/admin/collections";
import { newId } from "@/lib/admin/ids";
import { signPhotoPath } from "@/lib/leads/photos";
import demoCars from "@/lib/stock/demo-cars.json";
import type { Car } from "@/lib/stock/types";
import { carTitleOf } from "@/lib/admin/seed-data";
import type { ModuleId } from "@/lib/modules-rules";
import type { Role } from "@/lib/permission-rules";
import { HOUR, MINUTE } from "@/lib/time";
import { EVENTS, alertText, defaultAlerts, firstName, type ButtonId, type EventId } from "./rules";

// The conversation between the site and the dealer's phones, and between the site and buyers (#178). One record per message, so a message
// is one small write. Two threads: "staff" (the site and one team member's phone, `to` is their name) and "buyer" (the site and the buyer
// of a lead, `leadId`). Messages about a lead are removed once the lead is gone (a purge, a data request): the buyer's words are theirs.
export type Msg = {
  id: string;
  at: number; // in the future for the buyer's simulated answer, which shows only once its time comes
  thread: "staff" | "buyer";
  from: "site" | "staff" | "buyer";
  text: string;
  to?: string; // staff thread: the team member whose phone it is
  leadId?: string; // the lead it is about
  ref?: string; // the other record it is about: a car, a review, a booking
  event?: EventId; // the template, for an alert
  buttons?: ButtonId[];
  expects?: "price" | "review-reply" | "time"; // a question to the dealer: the next thing typed answers it
  done?: boolean;
  photos?: string[]; // thumbnails: links, or in a real lead the private keys (photoKeys) which the page signs
  photoKeys?: string[];
  href?: string;
  via?: "email"; // sent by email instead: the buyer chose email, WhatsApp is over its cap, or it is not connected
};
export const messagesStore = defineCollection<Msg>("whatsapp", seedMessages);

// A team member's phone: linked or not, which alerts it gets, and its quiet hours ("" for none).
export type StaffPhone = { id: string; name: string; phone: string; alerts: EventId[]; quietFrom: string; quietTo: string };
export const staffStore = defineCollection<StaffPhone>("whatsapp-staff", () =>
  TEAM_SEED.map((t, i) => ({ id: t.id, name: t.name, phone: `+353 83 000 ${1100 + i * 11}`, alerts: defaultAlerts(t.role as Role), quietFrom: t.role === "Sales" ? "22:00" : "", quietTo: t.role === "Sales" ? "07:00" : "" })),
);

// The conversation the demo opens on: a few days of what the site sent each person, and what they answered.
function seedMessages(): Msg[] {
  const now = Date.now();
  const cars = (demoCars as Car[]).filter((c) => !c.soldAt);
  const car = (i: number) => cars[i % cars.length];
  const leads = demoLeads();
  const lead = (type: string) => leads.find((l) => l.type === type && l.status === "new" && l.whatsappOptIn) ?? leads.find((l) => l.type === type && l.whatsappOptIn) ?? leads.find((l) => l.type === type)!;
  const trade = lead("trade-in");
  const enq = lead("enquiry");
  const drive = demoDrives().find((d) => d.status === "requested")!;
  const tdLead = leads.find((l) => l.type === "test-drive" && l.status === "new");
  const review = demoReviews().find((r) => r.rating >= 4) ?? demoReviews()[0];
  const slow = car(6);
  const buyerCar = car(2);
  const photos = car(3).photos.slice(0, 3).map((p) => p.src);

  const out: Msg[] = [];
  for (const t of TEAM_SEED) {
    const mine = new Set(defaultAlerts(t.role as Role));
    let n = 0;
    const add = (m: Omit<Msg, "id" | "thread" | "to">) => void out.push({ id: `wa-${t.id}-${n++}`, thread: "staff", to: t.name, ...m });
    const alert = (event: EventId, ago: number, extra: Omit<Msg, "id" | "thread" | "to" | "from" | "at" | "text" | "event" | "buttons">, text: string) => {
      if (mine.has(event)) add({ at: now - ago, from: "site", event, text, buttons: EVENTS[event].buttons, ...extra });
    };
    alert("monday", 50 * HOUR, {}, alertText("monday", { leads: 14, drives: 6, sales: 3 }));
    alert("review", 26 * HOUR, { ref: review.id }, alertText("review", { stars: review.rating, author: review.author, text: review.text }));
    alert("slow-stock", 22 * HOUR, { ref: slow.id }, alertText("slow-stock", { car: carTitleOf(slow), days: 52, dropEur: 500 }));
    alert("deposit", 5 * HOUR, { ref: car(9).id }, alertText("deposit", { car: carTitleOf(car(9)), eur: 1000 }));
    alert("enquiry", 3 * HOUR, { leadId: enq.id }, alertText("enquiry", { first: firstName(enq.name), car: enq.carTitle ?? carTitleOf(buyerCar), text: enq.message }));
    // From a website booking (a test-drive lead), as a real alert is, so every button reaches the buyer.
    if (tdLead) alert("test-drive", 70 * MINUTE, { leadId: tdLead.id }, alertText("test-drive", { first: firstName(tdLead.name), car: tdLead.carTitle ?? drive.carTitle, text: tdLead.message }));
    else alert("test-drive", 70 * MINUTE, { ref: drive.id }, alertText("test-drive", { first: firstName(drive.name), car: drive.carTitle, text: drive.notes }));
    alert("trade-in", 20 * MINUTE, { leadId: trade.id, photos }, alertText("trade-in", { first: firstName(trade.name), car: trade.carTitle, reg: trade.reg, text: trade.message, sell: trade.type === "sell" }));
  }
  // What the buyer of the trade-in was last told, so the buyer's phone is not empty before anything is sent.
  out.push({ id: "wa-buyer-0", at: now - 19 * MINUTE, thread: "buyer", from: "site", leadId: trade.id, text: `Hi ${firstName(trade.name)}, thanks for sending us your car. We have your details and photos, and we will come back to you shortly.` });
  return out;
}

export const isStaffAlert = (m: Msg) => m.thread === "staff" && m.from === "site" && Boolean(m.event);

// What the page shows: the person's own phone, the buyer's phone for the lead last written to, and whether an answer is on its way.
export type View = { staff: Msg[]; buyer: Msg[]; buyerName: string; typing: boolean };
const strip = (m: Msg, photos?: string[]): Msg => {
  const { photoKeys, ...rest } = m;
  void photoKeys;
  return photos ? { ...rest, photos } : rest;
};

export async function viewFor(name: string, modules: ReadonlySet<ModuleId>, now = Date.now()): Promise<View> {
  const live = (await messagesStore.list()).sort((a, b) => a.at - b.at);
  const secret = process.env.PHOTO_LINK_SECRET;
  const shown = live.filter((m) => m.at <= now && (!m.event || modules.has(EVENTS[m.event].module)));
  const staff = await Promise.all(shown.filter((m) => m.thread === "staff" && m.to === name).map(async (m) => strip(m, m.photoKeys && secret ? await Promise.all(m.photoKeys.map((k) => signPhotoPath(k, secret, 3600))) : undefined)));
  const buyerAll = shown.filter((m) => m.thread === "buyer");
  const focus = buyerAll.at(-1)?.leadId;
  return {
    staff,
    buyer: buyerAll.filter((m) => m.leadId === focus).map((m) => strip(m)),
    buyerName: focus ? ((await leadsStore.get(focus))?.name ?? "") : "",
    typing: live.some((m) => m.at > now && (m.thread === "buyer" || m.to === name)),
  };
}

export async function addMessage(m: Omit<Msg, "id" | "at"> & { at?: number }): Promise<Msg> {
  const msg: Msg = { id: newId("wa"), at: Date.now(), ...m };
  await messagesStore.put(msg);
  return msg;
}
