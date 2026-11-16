import "server-only";
import { logActivity } from "@/lib/admin/activity";
import { drivesStore, leadsStore, reservationsStore, reviewsStore, type Lead, type LeadStatus } from "@/lib/admin/collections";
import { dublinDay, fmtDateTime, fmtEur } from "@/lib/admin/format";
import { adminCar, adminCars, saveCar } from "@/lib/admin/stock-admin";
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
import { enabledModules } from "@/lib/modules";
import { sendWhatsApp } from "./send";
import { addMessage, messagesStore, staffStore, type Msg } from "./store";
import { BUTTON_LABELS, SLOW_DROP_EUR, firstName, moduleOf, parsePrice, type ButtonId } from "./rules";

// What happens when someone taps a button under an alert or types a reply (#178). Everything goes through here, so the lead, the activity
// log and the buyer are always updated the same way, and the dashboard stays the full record. Only a team member with a linked phone can act,
// and only in their own conversation. The site's acknowledgements to the dealer are replies inside the 24 hours and not billed.
const BUYER_ANSWER_MS = 6000; // how long the simulated buyer takes to answer

// `keepOpen`: the alert stays open after it (asking for more photos: the offer comes after, from the same alert). `by`: the way the buyer
// was told (WhatsApp, or email when they did not ask for WhatsApp or it is over its cap), so the note and the reply say what really happened.
type By = "WhatsApp" | "email";
type Act = { site: (first: string, by: By) => string; buyer?: (first: string, car: string, when?: string) => string; answer?: string; note?: (by: By) => string; status?: LeadStatus; activity: string; keepOpen?: true };
const ACTS: Partial<Record<ButtonId | "confirm-test-drive", Act>> = {
  available: { site: (f, by) => `Sent to ${f} by ${by}: yes, it's available.`, buyer: (f, c) => `Hi ${f}, yes, the ${c} is still available. Would you like to come and see it?`, note: (by) => `Told the buyer by ${by} that the car is available.`, status: "contacted", activity: "Told the buyer the car is available, from WhatsApp" },
  saturday: { site: (f, by) => `Sent to ${f} by ${by}: can you come in Saturday?`, buyer: (f, c) => `Hi ${f}, could you come in on Saturday to see the ${c}? Tell us what time suits.`, answer: "Saturday works for me. Is 11:00 ok?", note: (by) => `Asked the buyer by ${by} to come in on Saturday.`, status: "contacted", activity: "Asked the buyer to come in on Saturday, from WhatsApp" },
  handled: { site: () => "Marked as handled.", note: () => "Handled from WhatsApp.", status: "contacted", activity: "Marked the lead handled, from WhatsApp" },
  photos: { site: (f, by) => `Asked ${f} for more photos by ${by}.`, buyer: (f) => `Hi ${f}, could you send a few more photos of your car? The front, the back and the inside help most.`, note: (by) => `Asked the buyer by ${by} for more photos.`, status: "contacted", activity: "Asked for more photos, from WhatsApp", keepOpen: true },
  decline: { site: (f, by) => `Told ${f} by ${by}. The lead is closed.`, buyer: (f) => `Hi ${f}, thanks for sending us your car. We are not able to make an offer on this one.`, note: (by) => `Turned down from WhatsApp, told by ${by}.`, status: "lost", activity: "Turned the car down, from WhatsApp" },
  "confirm-test-drive": { site: (f, by) => `Confirmed. I told ${f} by ${by}.`, buyer: (f, c, when) => (when ? `Hi ${f}, your test drive in the ${c} is confirmed for ${when}. See you then.` : `Hi ${f}, your test drive in the ${c} is confirmed. We will call you to agree a time.`), note: (by) => `Test drive confirmed from WhatsApp, told by ${by}.`, status: "appointment", activity: "Confirmed the test drive, from WhatsApp" },
  slot: { site: (f, by) => `Sent to ${f} by ${by}: we can fit them in and will call to agree a time.`, buyer: (f) => `Hi ${f}, we can fit you in. We will call you to agree a time.`, note: (by) => `Told the buyer by ${by} we can fit them in; a time to agree by phone.`, status: "contacted", activity: "Said we can fit them in, from WhatsApp" },
  ack: { site: (f, by) => `Sent to ${f} by ${by}: we have your application.`, buyer: (f) => `Hi ${f}, we have your finance application and will come back to you soon.`, note: (by) => `Application acknowledged from WhatsApp, told by ${by}.`, status: "contacted", activity: "Acknowledged the application, from WhatsApp" },
};
const LINK_FIRST = "Link your number below to act from here.";
const MODULE_OFF = "That part of your plan is off, so I did nothing.";

const RANK: Record<LeadStatus, number> = { new: 0, contacted: 1, appointment: 2, won: 3, lost: 3 };
// A move only goes forward, and never reopens a lead that is won or lost.
const moved = (from: LeadStatus, to?: LeadStatus): LeadStatus => (to && RANK[from] < 3 && (to === "lost" || RANK[to] > RANK[from]) ? to : from);

async function say(to: string, m: Partial<Msg> & { text: string }, at = Date.now()) {
  await addMessage({ thread: "staff", from: "site", to, at, ...m });
}

// How a buyer can be reached: WhatsApp if they ticked the box and gave a number, email if they gave an address, or neither (only a phone,
// no box): then nothing is sent and the dealer is told to call.
const reach = (lead: Lead): "WhatsApp" | "email" | null => (lead.whatsappOptIn && lead.phone ? "WhatsApp" : lead.email ? "email" : null);
const callThem = (lead: Lead) =>
  `${lead.whatsappOptIn ? `WhatsApp could not send and ${firstName(lead.name)} gave no email` : `${firstName(lead.name)} gave no email and did not ask for WhatsApp`}, so nothing was sent. Call them on ${lead.phone || "the number on the lead"}.`;

// A message to the buyer, by `reach`. When it went by WhatsApp and an answer is given, the buyer's answer comes back a few seconds later,
// into the buyer's phone, the dealer's phone and (when shown) the lead.
async function toBuyer(lead: Lead, to: string, text: string, answer?: string): Promise<By | null> {
  const sent = await sendWhatsApp({ thread: "buyer", from: "site", leadId: lead.id, text }, "reply", { email: reach(lead) !== "WhatsApp", canEmail: Boolean(lead.email) });
  if (!sent) return null; // WhatsApp could not send and there is no address
  const by = sent.via === "email" ? "email" : "WhatsApp";
  if (answer && by === "WhatsApp") {
    const at = Date.now() + BUYER_ANSWER_MS;
    await addMessage({ thread: "buyer", from: "buyer", leadId: lead.id, text: answer, at });
    // The answer lands on the lead and in the bell now, dated when it arrives, so reading the conversation never writes.
    await leadsStore.update(lead.id, (cur) => ({ ...cur, notes: [...cur.notes, { at, text: `Replied on WhatsApp: "${answer}"`, auto: true }] }));
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
  if (!msg || msg.to !== me || !msg.buttons?.includes(button)) return;
  if (!(await linked(me))) return void (await say(me, { text: LINK_FIRST }));
  if (!(await enabledModules()).has(moduleOf(msg) ?? "whatsapp")) return void (await say(me, { text: MODULE_OFF })); // a Trade-in alert with Trade-in off
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
  // A deposit: confirmed once, by whoever taps first, and it is in the activity log against the car.
  if (button === "confirm" && msg.event === "deposit") {
    const held = msg.ref ? await reservationsStore.get(msg.ref) : undefined;
    if (held?.status !== "held") return void (await say(me, { text: "That deposit is no longer held." }));
    await markDone(all);
    await logActivity("stock", `Confirmed the deposit of ${fmtEur(held.depositEur)}, from WhatsApp`, { kind: "car", id: held.carId, label: held.carTitle });
    return void (await say(me, { text: "Confirmed. It is in the activity log.", href: `/dashboard/stock/${held.carId}` }));
  }
  // Call back is not a reply: the lead is the tapper's to call today, and its status stays as it was.
  if (button === "call") {
    if (!lead) return void (await say(me, { text: "I can't find that request any more." }));
    await markDone(all);
    await leadsStore.update(lead.id, (cur) => ({ ...cur, followUpOn: dublinDay(), assignedTo: me, notes: [...cur.notes, { at: Date.now(), text: "Call back asked for from WhatsApp.", auto: true }] }));
    await logActivity("leads", "Set the lead to call back today, from WhatsApp", { kind: "lead", id: lead.id });
    return void (await say(me, { leadId: lead.id, href: `/dashboard/leads/${lead.id}`, text: "Noted. It is yours to call back today." }));
  }
  // Nothing changes until the buyer can be told: a buyer with no email and no WhatsApp is called instead.
  if (lead && button !== "drop" && button !== "handled" && !reach(lead)) return void (await say(me, { leadId: lead.id, href: `/dashboard/leads/${lead.id}`, text: callThem(lead) }));
  if (button === "price") return void (await say(me, { leadId: msg.leadId, ref: msg.id, text: `What price do you want to offer${first ? ` ${first}` : ""}? Type it, like 8,500.`, expects: "price" }));
  if (button === "other") return void (await say(me, { leadId: msg.leadId, ref: msg.id, text: "What time suits? Type it, like Saturday at 11.", expects: "time" }));
  if (button === "drop") {
    if ((await stockSource()) === "donedeal") return void (await say(me, { text: `The price comes from ${LISTING_SITE}. Change it there.` }));
    await markDone(all); // first, so a second tap while this runs finds it done
    const car = msg.ref ? await adminCar(msg.ref) : undefined;
    if (car && isSold(car)) return void (await say(me, { text: "That car is sold, so I left the price." }));
    const drop = car && droppedPrice(car, SLOW_DROP_EUR, "eur");
    if (!car || !drop) return void (await say(me, { text: "I could not change that price. Open the car to do it." }));
    const next = { ...car, ...drop };
    await saveCar(next);
    await logActivity("stock", carEditSummary(car, next), { kind: "car", id: car.id, label: carTitleOf(car) });
    return void (await say(me, { text: `Done. The ${carTitleOf(car)} is now ${fmtEur(drop.priceEur)}.`, href: `/dashboard/stock/${car.id}` }));
  }

  // Never tell a buyer a car is there to see when it has sold since the alert.
  if (lead?.carSlug && (button === "available" || button === "saturday")) {
    const car = (await adminCars()).find((c) => c.slug === lead.carSlug);
    if (car && isSold(car)) return void (await say(me, { leadId: lead.id, href: `/dashboard/leads/${lead.id}`, text: `That car is sold, so I did not tell ${first}. Call them on ${lead.phone || "the number on the lead"}.` }));
  }
  const act = ACTS[button === "confirm" ? "confirm-test-drive" : button];
  if (!act) return;
  const drive = button === "confirm" && msg.event === "test-drive" ? await drivesStore.get(msg.ref ?? msg.leadId ?? "") : undefined;
  if (drive && drive.status !== "requested" && drive.status !== "confirmed") return void (await say(me, { text: "That test drive is no longer open." }));
  if (!lead && !drive) return void (await say(me, { text: "I can't find that request any more." }));
  if (lead && act.keepOpen && act.note && lead.notes.some((n) => n.text === act.note!("WhatsApp") || n.text === act.note!("email"))) return void (await say(me, { leadId: lead.id, text: "Already asked." })); // asked once, whoever taps
  // Done first, so a second tap at the same moment finds it done; open again if the buyer could not be told, and nothing has changed.
  if (!act.keepOpen) await markDone(all);
  let by: By = "WhatsApp";
  if (lead) {
    const sent = act.buyer ? await toBuyer(lead, me, act.buyer(first, lead.carTitle ?? "car", drive && fmtDateTime(drive.startsAt)), act.answer) : by;
    if (!sent) {
      if (!act.keepOpen) await Promise.all(all.map((m) => messagesStore.put({ ...m, done: false })));
      return void (await say(me, { leadId: lead.id, href: `/dashboard/leads/${lead.id}`, text: callThem(lead) }));
    }
    by = sent;
    // On the lead as it is now (the buyer's answer may be on it), never over a change made meanwhile.
    await leadsStore.update(lead.id, (cur) => {
      const status = moved(cur.status, act.status);
      return { ...cur, status, ...(status === "lost" && !cur.lostReason && { lostReason: "Other" as const }), ...(act.note && { notes: [...cur.notes, { at: Date.now(), text: act.note(by) }] }) };
    });
    if (button !== "confirm") await logActivity("leads", act.activity, { kind: "lead", id: lead.id });
  }
  // The diary last, once the buyer has been told.
  // Only a booking still requested as it is written: one cancelled in the dashboard meanwhile stays cancelled.
  let booked = false;
  if (drive?.status === "requested") await drivesStore.update(drive.id, (d) => (d.status === "requested" ? ((booked = true), { ...d, status: "confirmed" as const }) : d));
  if (drive && booked) await logActivity("test-drives", act.activity, { kind: "drive", id: drive.id });
  await say(me, { text: `${lead ? act.site(first, by) : "Confirmed."}${booked ? " The booking is in the diary." : ""}`, ...(lead && { leadId: lead.id, href: `/dashboard/leads/${lead.id}` }) });
}

// A typed message answers the latest question the site asked this person.
export async function typed(me: string, raw: string): Promise<void> {
  const text = raw.trim().slice(0, 500);
  if (!text) return;
  if (!(await linked(me))) {
    await addMessage({ thread: "staff", from: "staff", to: me, text });
    return void (await say(me, { text: LINK_FIRST }));
  }
  const q = (await messagesStore.list()).filter((m) => m.to === me && m.expects && !m.done && m.at <= Date.now() && m.at > Date.now() - HOUR).sort((a, b) => b.at - a.at)[0];
  await addMessage({ thread: "staff", from: "staff", to: me, text });
  if (!q) return void (await say(me, { text: "I did not catch that. Tap a button under one of the messages above." }));
  const lead = q.leadId ? await leadsStore.get(q.leadId) : undefined;
  // An offer or a new time answers the alert the question came from, once for everyone: if another copy was answered meanwhile, stop.
  const alert = (q.expects === "price" || q.expects === "time") && q.ref ? await messagesStore.get(q.ref) : undefined;
  const all = alert ? await copies(alert) : [];
  if (!(await enabledModules()).has(moduleOf(q, alert) ?? "whatsapp")) return void (await say(me, { text: MODULE_OFF })); // an offer with Trade-in off
  if (all.some((m) => m.done)) {
    await messagesStore.put({ ...q, done: true });
    return void (await say(me, { text: "Already done." }));
  }

  if (q.expects === "price") {
    const eur = parsePrice(text);
    if (eur === null) return void (await say(me, { text: "I could not read that as a price. Type an amount in euro, like 8,500." }));
    if (!lead) return void (await say(me, { text: "I can't find that request any more." }));
    if (lead.status === "won" || lead.status === "lost") return void (await say(me, { text: "That lead is closed." }));
    if (!reach(lead)) return void (await say(me, { leadId: lead.id, href: `/dashboard/leads/${lead.id}`, text: callThem(lead) }));
    const by = await toBuyer(lead, me, `Hi ${firstName(lead.name)}, thank you for sending us your car. We can offer you ${fmtEur(eur)} for it, subject to seeing it. Reply here and we will book a time for you to bring it in. ${SITE_NAME}`, "That sounds good. Could I bring it in on Saturday morning?");
    if (!by) return void (await say(me, { leadId: lead.id, href: `/dashboard/leads/${lead.id}`, text: callThem(lead) }));
    await leadsStore.update(lead.id, (cur) => ({ ...cur, status: moved(cur.status, "contacted"), notes: [...cur.notes, { at: Date.now(), text: `Offer sent by ${by}: ${fmtEur(eur)}` }] }));
    await logActivity("leads", `Sent an offer of ${fmtEur(eur)}, from WhatsApp`, { kind: "lead", id: lead.id });
    await messagesStore.put({ ...q, done: true });
    await markDone(all); // the alert is answered, for every copy
    return void (await say(me, { leadId: lead.id, href: `/dashboard/leads/${lead.id}`, text: `Done. I sent ${firstName(lead.name)} your offer of ${fmtEur(eur)} by ${by}. I will tell you when they answer.` }));
  }
  if (q.expects === "time") {
    if (!lead) return void (await say(me, { text: "I can't find that request any more." }));
    if (lead.status === "won" || lead.status === "lost") return void (await say(me, { text: "That lead is closed." }));
    if (!reach(lead)) return void (await say(me, { leadId: lead.id, href: `/dashboard/leads/${lead.id}`, text: callThem(lead) }));
    const by = await toBuyer(lead, me, `Hi ${firstName(lead.name)}, could we do ${text} instead? Let us know if that suits.`);
    if (!by) return void (await say(me, { leadId: lead.id, href: `/dashboard/leads/${lead.id}`, text: callThem(lead) }));
    await leadsStore.update(lead.id, (cur) => ({ ...cur, notes: [...cur.notes, { at: Date.now(), text: `Suggested another time by ${by}: ${text}` }] }));
    await logActivity("leads", "Suggested another time, from WhatsApp", { kind: "lead", id: lead.id });
    await messagesStore.put({ ...q, done: true }); // the alert stays open: the booking is confirmed once they agree
    return void (await say(me, { leadId: lead.id, href: "/dashboard/test-drives", text: `Sent to ${firstName(lead.name)} by ${by}. Move the booking in Test drives once they agree.` }));
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
