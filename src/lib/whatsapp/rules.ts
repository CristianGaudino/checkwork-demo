import type { ModuleId } from "@/lib/modules-rules";
import type { Role } from "@/lib/permission-rules";
import { fmtEur, plural } from "@/lib/admin/format";
import { DEALER_RULES } from "@/lib/dealer.config";

// WhatsApp (#178), the rules without the storage: what each message says, which module it belongs to, how a typed price is read, and
// where a message goes. Plain data and pure functions, so the page, the sender and the tests agree.

export type EventId = "enquiry" | "trade-in" | "test-drive" | "service" | "finance" | "deposit" | "review" | "slow-stock" | "new-in" | "monday";
export type ButtonId = "available" | "saturday" | "call" | "handled" | "price" | "photos" | "decline" | "confirm" | "other" | "slot" | "ack" | "review" | "drop" | "post" | "report";

export const BUTTON_LABELS: Record<ButtonId, string> = {
  available: "Yes, it's available",
  saturday: "Can you come in Saturday?",
  call: "Call back",
  handled: "Mark handled",
  price: "Reply with a price",
  photos: "Ask for more photos",
  decline: "Not for us",
  confirm: "Confirm",
  other: "Suggest another time",
  slot: "Confirm a slot",
  ack: "Acknowledge",
  review: "Reply",
  drop: "Drop the price",
  post: "Post it",
  report: "Open the report",
};

// One template per event. `module`: the module whose alert it is, so a dealer only gets what they have. `kind`: how it is billed (marketing
// is never sent past the cap, an alert goes by email instead). `does`: the line on the page that explains it.
export const EVENTS: Record<EventId, { module: ModuleId; label: string; does: string; kind: "alert" | "marketing"; buttons: ButtonId[] }> = {
  enquiry: { module: "dashboard", label: "New enquiry", does: "Every new enquiry reaches your phone with the car. Tap a quick reply and the buyer is answered.", kind: "alert", buttons: ["available", "saturday", "call", "handled"] },
  "slow-stock": { module: "dashboard", label: `A car ${DEALER_RULES.oldStockDays} days in stock`, does: `A car that has sat for ${DEALER_RULES.oldStockDays} days, with a suggested price drop you can apply with one tap.`, kind: "alert", buttons: ["drop"] },
  "trade-in": { module: "tradeIn", label: "Trade-in or sell request", does: "The car, the registration and the photos. Reply with a price and the buyer gets your offer.", kind: "alert", buttons: ["price", "photos", "decline"] },
  "test-drive": { module: "testDrives", label: "Test drive booking", does: "A new booking to confirm, or a new time to suggest.", kind: "alert", buttons: ["confirm", "other"] },
  service: { module: "service", label: "Service booking", does: "A service booking or a claim. Confirm a slot from your phone.", kind: "alert", buttons: ["slot"] },
  finance: { module: "finance", label: "Finance application", does: "A new application, so nobody waits to hear it was received.", kind: "alert", buttons: ["ack"] },
  deposit: { module: "sales", label: "Deposit taken", does: "A deposit taken on a car. Confirm it and it is in the activity log.", kind: "alert", buttons: ["confirm"] },
  review: { module: "reviews", label: "New Google review", does: "A new review as it lands. Reply and it is posted on Google.", kind: "alert", buttons: ["review"] },
  "new-in": { module: "social", label: "A new car in stock", does: "A car just added, with a nudge to post it.", kind: "marketing", buttons: ["post"] },
  monday: { module: "margins", label: "The Monday summary", does: "Last week in a few lines, with a link to the full report.", kind: "alert", buttons: ["report"] },
};
export const EVENT_IDS = Object.keys(EVENTS) as EventId[];
export const SLOW_DAYS = DEALER_RULES.oldStockDays; // slow is old stock, as the dashboard and reports count it
export const SLOW_DROP_EUR = DEALER_RULES.slowDropEur; // the drop a slow-stock alert suggests, and Drop the price applies

export const eventsFor = (modules: ReadonlySet<ModuleId>): EventId[] => EVENT_IDS.filter((e) => modules.has(EVENTS[e].module));

// The module a message needs: an alert's own, and a question's (a price or a new time asks from an alert, `from`; a review reply is Reviews).
// None for the rest. With that module off, the message is hidden and acting on it is refused.
type Moduled = { event?: EventId; expects?: string };
export function moduleOf(m: Moduled, from?: Moduled): ModuleId | undefined {
  if (m.event) return EVENTS[m.event].module;
  if (m.expects === "review-reply") return "reviews";
  return m.expects && from?.event ? EVENTS[from.event].module : undefined;
}

// The template a website request uses: its own when the dealer has that module, else the plain enquiry (which is the base site's).
const LEAD_EVENT: Partial<Record<string, EventId>> = { "trade-in": "trade-in", sell: "trade-in", "test-drive": "test-drive", finance: "finance", service: "service", warranty: "service" };
export function eventOfLead(type: string, modules: ReadonlySet<ModuleId>): EventId {
  const own = LEAD_EVENT[type];
  return own && modules.has(EVENTS[own].module) ? own : "enquiry";
}

// What each role gets until the dealer changes it, by person, so a salesperson is not sent finance applications.
const BY_ROLE: Record<Role, EventId[]> = {
  Owner: EVENT_IDS,
  Manager: EVENT_IDS,
  Sales: ["enquiry", "trade-in", "test-drive", "service", "deposit", "slow-stock", "new-in"],
  Finance: ["finance", "deposit", "monday"],
};
export const defaultAlerts = (role: Role): EventId[] => BY_ROLE[role];

// Quiet hours, "HH:MM" to "HH:MM" on the Irish clock, across midnight when the end is earlier. Empty means none.
export function inQuiet(now: string, from: string, to: string): boolean {
  if (!from || !to || from === to) return false;
  return from < to ? now >= from && now < to : now >= from || now < to;
}

// Where a message goes. WhatsApp while it is connected and under the cap; an alert or a reply goes by email past the cap or when it is not
// connected; a marketing message is just not sent.
export type Channel = "whatsapp" | "email" | "none";
export function channelFor(kind: "alert" | "reply" | "marketing", connected: boolean, allowed: boolean): Channel {
  if (connected && allowed) return "whatsapp";
  return kind === "marketing" ? "none" : "email";
}

// A typed price, as a dealer types it on a phone: "8,500", "€8.5k", "8500", "8 500", "8.500", "offer 8k euro". Whole euros from 100 to 500,000,
// or null. A lone dot with three digits after it is a thousands dot (8.500), any other is a decimal (8.5k, 8.5).
export function parsePrice(text: string): number | null {
  const joined = text.replace(/\s+(?=\d{3}\b)/g, "");
  if ((joined.match(/\d[\d.,]*/g) ?? []).length > 1) return null; // two numbers (a year and a price) is a guess, so ask again
  const m = joined.match(/(\d[\d.,]*)\s*(k\b)?/i);
  if (!m) return null;
  let n = m[1].replace(/[.,]$/, "");
  if (/^\d{1,3}([.,]\d{3})+$/.test(n) && !m[2]) n = n.replace(/[.,]/g, "");
  else n = n.replace(/,/g, ".");
  const value = Number(n) * (m[2] ? 1000 : 1);
  return Number.isFinite(value) && value >= 100 && value <= 500_000 ? Math.round(value) : null;
}

// The name to greet someone by, or `fallback` when there is none: an empty name, or a lone initial (Google's "A Google User" is not "A").
export const firstName = (name: string, fallback = "there") => {
  const first = name.trim().split(/\s+/)[0] ?? "";
  return first.length > 1 ? first : fallback;
};

// What an alert says, from the facts of the event. Short, as a message on a phone is.
export type Facts = { first?: string; car?: string; reg?: string; text?: string; sell?: boolean; warranty?: boolean; eur?: number; stars?: number; author?: string; days?: number; dropEur?: number; leads?: number; drives?: number; sales?: number };
const quoted = (t?: string) => (t ? `
"${t.length > 140 ? t.slice(0, 137) + "..." : t}"` : "");
export function alertText(event: EventId, f: Facts): string {
  const car = f.car ? ` the ${f.car}` : "";
  switch (event) {
    case "enquiry":
      return `New enquiry from ${f.first ?? "a buyer"}${f.car ? ` about the ${f.car}` : ""}.${quoted(f.text)}`;
    case "trade-in":
      return `${f.first ?? "A buyer"} ${f.sell ? "wants to sell their car" : `wants a price for a trade-in${f.car ? ` against the ${f.car}` : ""}`}.${f.reg ? `
Reg ${f.reg}.` : ""}${quoted(f.text)}`;
    case "test-drive":
      return `${f.first ?? "A buyer"} wants a test drive${f.car ? ` in the ${f.car}` : ""}.${quoted(f.text)}`;
    case "service":
      return `${f.first ?? "A customer"} sent a ${f.warranty ? "warranty request" : "service booking"}.${quoted(f.text)}`;
    case "finance":
      return `New finance application from ${f.first ?? "a buyer"}${f.car ? ` for the ${f.car}` : ""}.`;
    case "deposit":
      return `A deposit of ${fmtEur(f.eur ?? 0)} was taken on${car}. Confirm it?`;
    case "review":
      return `New Google review, ${f.stars} stars, from ${f.author}:${quoted(f.text)}`;
    case "slow-stock":
      return `The ${f.car} has been in stock ${f.days} days. Drop the price by ${fmtEur(f.dropEur ?? 0)}?`;
    case "new-in":
      return `New in: ${f.car}. Post it to Facebook and Instagram?`;
    case "monday":
      return `Last week: ${plural(f.leads ?? 0, "new lead")}, ${plural(f.drives ?? 0, "test drive")}, ${plural(f.sales ?? 0, "sale")}. The full report is a tap away.`;
  }
}
