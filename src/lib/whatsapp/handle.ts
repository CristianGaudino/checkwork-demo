import "server-only";
import { logActivity } from "@/lib/admin/activity";
import { drivesStore, leadsStore, reviewsStore, type Lead, type LeadStatus } from "@/lib/admin/collections";
import { fmtEur } from "@/lib/admin/format";
import { adminCar, saveCar } from "@/lib/admin/stock-admin";
import { droppedPrice } from "@/lib/admin/stock-admin-pure";
import { carEditSummary } from "@/lib/admin/activity-text";
import { postReviewReply } from "@/lib/admin/publishers";
import { carTitleOf } from "@/lib/admin/seed-data";
import { SITE_NAME } from "@/lib/site";
import { HOUR } from "@/lib/time";
import { stockSource } from "@/lib/stock-source";
import { LISTING_SITE } from "@/lib/stock-source-rules";
import { isSold } from "@/lib/stock/types";
import { notify } from "@/lib/admin/notifications";
import { sendWhatsApp } from "./send";
import { addMessage, messagesStore, staffStore, type Msg } from "./store";
import { BUTTON_LABELS, firstName, parsePrice, type ButtonId } from "./rules";

// What happens when someone taps a button under an alert or types a reply (#178). Everything goes through here, so the lead, the activity
// log and the buyer are always updated the same way, and the dashboard stays the full record. Only a team member with a linked phone can act,
// and only in their own conversation. The site's acknowledgements to the dealer are replies inside the 24 hours and not billed.
const BUYER_ANSWER_MS = 6000; // how long the simulated buyer takes to answer

// `keepOpen`: the alert stays open after it (asking for more photos: the offer comes after, from the same alert).
type Act = { site: (first: string) => string; buyer?: (first: string, car: string) => string; answer?: string; note?: string; status?: LeadStatus; activity: string; keepOpen?: true };
const ACTS: Partial<Record<ButtonId | "confirm-test-drive" | "confirm-deposit", Act>> = {
  available: { site: (f) => `Sent to ${f}: yes, it's available.`, buyer: (f, c) => `Hi ${f}, yes, the ${c} is still available. Would you like to come and see it?`, note: "Told the buyer on WhatsApp that the car is available.", status: "contacted", activity: "Told the buyer the car is available, from WhatsApp" },
  saturday: { site: (f) => `Sent to ${f}: can you come in Saturday?`, buyer: (f, c) => `Hi ${f}, could you come in on Saturday to see the ${c}? Tell us what time suits.`, answer: "Saturday works for me. Is 11:00 ok?", note: "Asked the buyer on WhatsApp to come in on Saturday.", status: "contacted", activity: "Asked the buyer to come in on Saturday, from WhatsApp" },
  call: { site: () => "Noted. I marked it to call back.", note: "Call back asked for from WhatsApp.", status: "contacted", activity: "Marked the lead to call back, from WhatsApp" },
  handled: { site: () => "Marked as handled.", note: "Handled from WhatsApp.", status: "contacted", activity: "Marked the lead handled, from WhatsApp" },
  photos: { site: (f) => `Asked ${f} for more photos.`, buyer: (f) => `Hi ${f}, could you send a few more photos of your car? The front, the back and the inside help most.`, note: "Asked the buyer on WhatsApp for more photos.", status: "contacted", activity: "Asked for more photos, from WhatsApp", keepOpen: true },
  decline: { site: (f) => `Told ${f}. The lead is closed.`, buyer: (f) => `Hi ${f}, thanks for sending us your car. We are not able to make an offer on this one.`, note: "Turned down from WhatsApp.", status: "lost", activity: "Turned the car down, from WhatsApp" },
  "confirm-test-drive": { site: () => "Confirmed. The booking is in the diary.", buyer: (f) => `Hi ${f}, your test drive is confirmed. See you then.`, note: "Test drive confirmed from WhatsApp.", status: "appointment", activity: "Confirmed the test drive, from WhatsApp" },
  slot: { site: () => "Confirmed. The slot is booked.", buyer: (f) => `Hi ${f}, your slot is confirmed. See you then.`, note: "Slot confirmed from WhatsApp.", status: "appointment", activity: "Confirmed the slot, from WhatsApp" },
  ack: { site: (f) => `Sent to ${f}: we have your application.`, buyer: (f) => `Hi ${f}, we have your finance application and will come back to you soon.`, note: "Application acknowledged from WhatsApp.", status: "contacted", activity: "Acknowledged the application, from WhatsApp" },
  "confirm-deposit": { site: () => "Confirmed.", activity: "" },
};

const RANK: Record<LeadStatus, number> = { new: 0, contacted: 1, appointment: 2, won: 3, lost: 3 };
// A move only goes forward, and never reopens a lead that is won or lost.
const moved = (from: LeadStatus, to?: LeadStatus): LeadStatus => (to && RANK[from] < 3 && (to === "lost" || RANK[to] > RANK[from]) ? to : from);

async function say(to: string, m: Partial<Msg> & { text: string }, at = Date.now()) {
  await addMessage({ thread: "staff", from: "site", to, at, ...m });
}

// A message to the buyer. WhatsApp if they ticked the box, else email. When it went by WhatsApp and an answer is given, the buyer's
// answer comes back a few seconds later, into the buyer's phone, the dealer's phone and (when shown) the lead.
async function toBuyer(lead: Lead, to: string, text: string, answer?: string): Promise<"WhatsApp" | "email"> {
  const sent = await sendWhatsApp({ thread: "buyer", from: "site", leadId: lead.id, text }, "reply", { email: !lead.whatsappOptIn });
  const by = sent?.via === "email" ? "email" : "WhatsApp";
  if (answer && by === "WhatsApp") {
    const at = Date.now() + BUYER_ANSWER_MS;
    await addMessage({ thread: "buyer", from: "buyer", leadId: lead.id, text: answer, at });
    // The answer lands on the lead and in the bell now, dated when it arrives, so reading the conversation never writes.
    const fresh = (await leadsStore.get(lead.id)) ?? lead;
    await leadsStore.put({ ...fresh, notes: [...fresh.notes, { at, text: `Replied on WhatsApp: "${answer}"` }] });
    await notify({ kind: "whatsapp", text: "A buyer replied on WhatsApp", href: `/dashboard/leads/${lead.id}` }, at);
    await say(to, { leadId: lead.id, text: `${firstName(lead.name)} replied: "${answer}"`, buttons: ["call", "handled"] }, at);
  }
  return by;
}

// Each team member has their own copy of an alert: a one-shot action runs once for all of them.
async function copies(msg: Msg): Promise<Msg[]> {
  const key = msg.ref ?? msg.leadId;
  if (!msg.event || !key) return [msg];
  return (await messagesStore.list()).filter((m) => m.thread === "staff" && m.event === msg.event && (m.ref ?? m.leadId) === key);
}
const markDone = async (all: Msg[]) => void (await Promise.all(all.map((m) => messagesStore.put({ ...m, done: true }))));

async function linked(name: string) {
  return (await staffStore.list()).some((p) => p.name === name && p.phone);
}

export async function tap(me: string, msgId: string, button: ButtonId): Promise<void> {
  const msg = await messagesStore.get(msgId);
  if (!msg || msg.to !== me || !msg.buttons?.includes(button) || !(await linked(me))) return;
  await addMessage({ thread: "staff", from: "staff", to: me, leadId: msg.leadId, text: BUTTON_LABELS[button] });
  const lead = msg.leadId ? await leadsStore.get(msg.leadId) : undefined;
  const first = lead ? firstName(lead.name) : "";

  const closed = lead && (lead.status === "won" || lead.status === "lost");
  const all = await copies(msg);
  // These only open a link or ask about a review, so they work on any copy.
  if (button === "review") return void (await say(me, { ref: msg.ref, text: "Type your reply and I will post it on Google.", expects: "review-reply" }));
  if (button === "report") return void (await say(me, { text: "Here is the full report.", href: "/dashboard/reports" }));
  if (button === "post") return void (await say(me, { text: "Thanks. Approve the post in Marketing and it is scheduled.", href: "/dashboard/marketing" }));
  if (closed) return void (await say(me, { text: "That lead is closed." }));
  // The rest answer the alert once, for everyone it went to: one offer, one decline, one confirm. Asking for more photos keeps it open.
  if (msg.done || all.some((m) => m.done)) return void (await say(me, { text: "Already done." }));
  if (button === "price") return void (await say(me, { leadId: msg.leadId, ref: msg.id, text: `What price do you want to offer${first ? ` ${first}` : ""}? Type it, like 8,500.`, expects: "price" }));
  if (button === "other") return void (await say(me, { leadId: msg.leadId, ref: msg.id, text: "What time suits? Type it, like Saturday at 11.", expects: "time" }));
  if (button === "drop") {
    if ((await stockSource()) === "donedeal") return void (await say(me, { text: `The price comes from ${LISTING_SITE}. Change it there.` }));
    await markDone(all); // first, so a second tap while this runs finds it done
    const car = msg.ref ? await adminCar(msg.ref) : undefined;
    if (car && isSold(car)) return void (await say(me, { text: "That car is sold, so I left the price." }));
    const drop = car && droppedPrice(car, 500, "eur");
    if (!car || !drop) return void (await say(me, { text: "I could not change that price. Open the car to do it." }));
    const next = { ...car, ...drop };
    await saveCar(next);
    await logActivity("stock", carEditSummary(car, next), { kind: "car", id: car.id, label: carTitleOf(car) });
    return void (await say(me, { text: `Done. The ${carTitleOf(car)} is now ${fmtEur(drop.priceEur)}.`, href: `/dashboard/stock/${car.id}` }));
  }

  const act = ACTS[button === "confirm" ? (msg.event === "deposit" ? "confirm-deposit" : "confirm-test-drive") : button];
  if (!act) return;
  if (button === "confirm" && msg.event === "test-drive" && msg.ref) {
    const drive = await drivesStore.get(msg.ref);
    if (drive && drive.status !== "requested" && drive.status !== "confirmed") return void (await say(me, { text: "That test drive is no longer open." }));
    if (drive && drive.status === "requested") {
      await drivesStore.put({ ...drive, status: "confirmed" });
      await logActivity("test-drives", act.activity, { kind: "drive", id: drive.id });
    }
  }
  if (!act.activity) {
    await markDone(all);
    return void (await say(me, { text: act.site("") }));
  }
  if (!lead && !(button === "confirm" && msg.ref)) return void (await say(me, { text: "I can't find that request any more." }));
  if (lead) {
    const status = moved(lead.status, act.status);
    await leadsStore.put({ ...lead, status, ...(status === "lost" && !lead.lostReason && { lostReason: "Other" as const }), ...(act.note && { notes: [...lead.notes, { at: Date.now(), text: act.note }] }) });
    if (button !== "confirm") await logActivity("leads", act.activity, { kind: "lead", id: lead.id });
    if (act.buyer && !(act.keepOpen && act.note && lead.notes.some((n) => n.text === act.note))) await toBuyer(lead, me, act.buyer(first, lead.carTitle ?? "car"), act.answer); // a request kept open is sent once
  }
  if (!act.keepOpen) await markDone(all);
  await say(me, { text: act.site(first), ...(lead && { leadId: lead.id, href: `/dashboard/leads/${lead.id}` }) });
}

// A typed message answers the latest question the site asked this person.
export async function typed(me: string, raw: string): Promise<void> {
  const text = raw.trim().slice(0, 500);
  if (!text || !(await linked(me))) return;
  const q = (await messagesStore.list()).filter((m) => m.to === me && m.expects && !m.done && m.at <= Date.now() && m.at > Date.now() - HOUR).sort((a, b) => b.at - a.at)[0];
  await addMessage({ thread: "staff", from: "staff", to: me, text });
  if (!q) return void (await say(me, { text: "I did not catch that. Tap a button under one of the messages above." }));
  const lead = q.leadId ? await leadsStore.get(q.leadId) : undefined;
  // An offer or a new time answers the alert the question came from, once for everyone: if another copy was answered meanwhile, stop.
  const alert = (q.expects === "price" || q.expects === "time") && q.ref ? await messagesStore.get(q.ref) : undefined;
  const all = alert ? await copies(alert) : [];
  if (all.some((m) => m.done)) {
    await messagesStore.put({ ...q, done: true });
    return void (await say(me, { text: "Already done." }));
  }

  if (q.expects === "price") {
    const eur = parsePrice(text);
    if (eur === null) return void (await say(me, { text: "I could not read that as a price. Type an amount in euro, like 8,500." }));
    if (!lead) return void (await say(me, { text: "I can't find that request any more." }));
    if (lead.status === "won" || lead.status === "lost") return void (await say(me, { text: "That lead is closed." }));
    const by = await toBuyer(lead, me, `Hi ${firstName(lead.name)}, thank you for sending us your car. We can offer you ${fmtEur(eur)} for it, subject to seeing it. Reply here and we will book a time for you to bring it in. ${SITE_NAME}`, "That sounds good. Could I bring it in on Saturday morning?");
    const cur = (await leadsStore.get(lead.id)) ?? lead; // toBuyer may have added the buyer's answer
    await leadsStore.put({ ...cur, status: moved(cur.status, "contacted"), notes: [...cur.notes, { at: Date.now(), text: `Offer sent by ${by}: ${fmtEur(eur)}` }] });
    await logActivity("leads", `Sent an offer of ${fmtEur(eur)}, from WhatsApp`, { kind: "lead", id: lead.id });
    await messagesStore.put({ ...q, done: true });
    await markDone(all); // the alert is answered, for every copy
    return void (await say(me, { leadId: lead.id, href: `/dashboard/leads/${lead.id}`, text: `Done. I sent ${firstName(lead.name)} your offer of ${fmtEur(eur)} by ${by}. I will tell you when they answer.` }));
  }
  if (q.expects === "time") {
    if (!lead) return void (await say(me, { text: "I can't find that request any more." }));
    if (lead.status === "won" || lead.status === "lost") return void (await say(me, { text: "That lead is closed." }));
    const by = await toBuyer(lead, me, `Hi ${firstName(lead.name)}, could we do ${text} instead? Let us know if that suits.`);
    await leadsStore.put({ ...lead, notes: [...lead.notes, { at: Date.now(), text: `Suggested another time by ${by}: ${text}` }] });
    await logActivity("leads", "Suggested another time, from WhatsApp", { kind: "lead", id: lead.id });
    await messagesStore.put({ ...q, done: true });
    await markDone(all); // the alert is answered, for every copy
    return void (await say(me, { leadId: lead.id, text: `Sent to ${firstName(lead.name)} by ${by}.` }));
  }
  const review = q.ref ? await reviewsStore.get(q.ref) : undefined;
  if (!review) return void (await say(me, { text: "I can't find that review any more." }));
  const sent = await postReviewReply(review, text);
  if (!sent.ok) return void (await say(me, { text: "Replies on Google are not connected, so I could not post it." }));
  await reviewsStore.put({ ...review, reply: text, repliedAt: Date.now() });
  await logActivity("reviews", review.reply ? "Changed the reply to the review, from WhatsApp" : "Replied to the review, from WhatsApp", { kind: "review", id: review.id });
  await messagesStore.put({ ...q, done: true });
  await say(me, { text: "Posted on Google." });
}
