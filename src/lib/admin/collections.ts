import "server-only";
import demoCars from "@/lib/stock/demo-cars.json";
import extraCars from "@/lib/stock/demo-cars-extra.json";
import { defineCollection, seedsDemoRecords } from "./docs";
import { NETWORKS, type Network } from "./networks";
import { demoCost } from "./margins";
import { DAY, HOUR } from "@/lib/time";
import type { Role } from "@/lib/permission-rules";
import { carTitleOf, livePicks, person, rng } from "./seed-data";

// The dealer's records. Each is a collection in the record store, with a typed shape and a seed. Never the real leads table: the admin
// is open on the public demo, so it only ever shows made-up records (see the audit note in docs/v2-plan.md).

// ---- Leads ----
export const LEAD_STATUSES = ["new", "contacted", "appointment", "won", "lost"] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];
export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = { new: "New", contacted: "Contacted", appointment: "Appointment set", won: "Won", lost: "Lost" };
export const LEAD_TYPES = ["enquiry", "test-drive", "finance", "trade-in", "sell", "find-a-car", "general"] as const;
export type LeadType = (typeof LEAD_TYPES)[number];
export const LEAD_TYPE_LABELS: Record<LeadType, string> = { enquiry: "Car enquiry", "test-drive": "Test drive", finance: "Finance", "trade-in": "Trade-in", sell: "Selling a car", "find-a-car": "Find a car", general: "General" };
export const LEAD_SOURCES = ["Website", "WhatsApp", "Phone", "Facebook", "Google"] as const;

export type Lead = {
  id: string;
  type: LeadType;
  status: LeadStatus;
  name: string;
  email: string;
  phone: string;
  message: string;
  source: (typeof LEAD_SOURCES)[number];
  carSlug?: string;
  carTitle?: string;
  reg?: string; // the registration of the car a person wants to sell or trade in
  assignedTo?: string;
  followUpOn?: string; // YYYY-MM-DD, the Irish day to get back to them; cleared once the lead is won or lost
  notes: { at: number; text: string }[];
  createdAt: number;
};

// The team the demo starts with. Leads are assigned by name, and the settings page edits this list.
export const TEAM_SEED = [
  { id: "u1", name: "Aoife Brennan", email: "aoife@example.com", role: "Owner" },
  { id: "u2", name: "Conor Doyle", email: "conor@example.com", role: "Sales" },
  { id: "u3", name: "Niamh Kavanagh", email: "niamh@example.com", role: "Finance" },
  { id: "u4", name: "Ciara Walsh", email: "ciara@example.com", role: "Manager" },
] as const;

const MESSAGES: Record<LeadType, string[]> = {
  enquiry: ["Is this still available? I could view it this weekend.", "Does it have a full service history?", "Is there any room on the price?", "Can you send me more photos of the interior?"],
  "test-drive": ["Could I drive it on Saturday morning?", "Free after 5pm most days this week."],
  finance: ["What would the monthly payment be with 10% down?", "Looking at 48 months. Can you come back to me with options?"],
  "trade-in": ["I have a 2016 hatchback with 90,000 km to trade in against this.", "How much would you give me for my current car?"],
  sell: ["Selling my 2018 Golf, 110,000 km, full service history.", "Not buying right now, just want to sell my car."],
  "find-a-car": ["Looking for a diesel estate under 15k, low mileage.", "Want an automatic SUV, family car, around 20k."],
  general: ["What time do you close on Saturday?", "Do you do servicing as well?"],
};

function seedLeads(): Lead[] {
  const r = rng(11);
  const now = Date.now();
  return Array.from({ length: 28 }, (_, i) => {
    const type = r.pick(LEAD_TYPES);
    const p = person(r);
    const car = type === "find-a-car" || type === "general" || type === "sell" ? undefined : livePicks(r);
    const age = i < 6 ? r.int(1, 30) * HOUR : (i - 4) * r.int(6, 14) * HOUR + r.int(0, 5) * HOUR;
    const status: LeadStatus = age < 30 * HOUR ? "new" : r.pick(["new", "contacted", "contacted", "appointment", "won", "lost"] as const);
    return {
      id: `lead-${1000 + i}`,
      type,
      status,
      ...p,
      message: r.pick(MESSAGES[type]),
      source: r.pick(LEAD_SOURCES),
      carSlug: car?.slug,
      carTitle: car && carTitleOf(car),
      // A plate for the cars people want to sell or trade in, from the index (not the random sequence, so the rest of the seed is unchanged).
      ...((type === "trade-in" || type === "sell") && { reg: `${15 + (i % 9)}${1 + (i % 2)}-${["D", "C", "KY", "G", "L", "WX"][i % 6]}-${1000 + i * 37}` }),
      assignedTo: status === "new" ? undefined : r.pick(TEAM_SEED).name,
      // A few open leads with a follow-up: one overdue, one today, two coming (by index, so the random sequence above is unchanged).
      ...((status === "contacted" || status === "appointment") && i % 3 === 0 && { followUpOn: new Date(now + ((i % 4) - 1) * DAY).toLocaleDateString("en-CA", { timeZone: "Europe/Dublin" }) }),
      notes: status === "contacted" || status === "appointment" ? [{ at: now - age + 2 * HOUR, text: "Called and left a message." }] : [],
      createdAt: now - age,
    };
  });
}
// break-ui: records at the realistic edges of what a form produces, kept in the seed so the lists and pages are always judged against them:
// a long double-barrelled surname, an email at the length real domains reach, a name that is one letter, a long pasted message, no car.
const EDGE_LEADS = (now: number): Lead[] => [
  { id: "lead-edge-1", type: "enquiry", status: "contacted", name: "Aleksandra Wiśniewska-Kowalczyk", email: "bartholomew.fitzgerald@northwind-industries-holdings.example.com", phone: "+353 83 000 1111", source: "Website", message: "Hello, I saw the listing on your website yesterday evening and I would like to know whether the car is still available, whether it has a full service history from a main dealer, whether you would consider a part exchange against my 2016 estate, and whether it can be collected on a weekday after six because I work in the city centre until late.", carSlug: livePicks(rng(5)).slug, carTitle: carTitleOf(livePicks(rng(5))), assignedTo: "Aoife Brennan", notes: [], createdAt: now - 3 * DAY },
  { id: "lead-edge-2", type: "general", status: "new", name: "Jo", email: "j@example.com", phone: "+353 83 000 2222", source: "Phone", message: "Call me.", notes: [], createdAt: now - 5 * DAY },
];
function seedLeadsWithEdges(): Lead[] {
  return [...seedLeads(), ...EDGE_LEADS(Date.now())];
}
export const leadsStore = defineCollection<Lead>("leads", seedLeadsWithEdges);

// ---- Test drives ----
export const DRIVE_STATUSES = ["requested", "confirmed", "completed", "no-show", "cancelled"] as const;
export type DriveStatus = (typeof DRIVE_STATUSES)[number];
export const DRIVE_STATUS_LABELS: Record<DriveStatus, string> = { requested: "Requested", confirmed: "Confirmed", completed: "Completed", "no-show": "No show", cancelled: "Cancelled" };
export type TestDrive = { id: string; name: string; email: string; phone: string; carSlug: string; carTitle: string; startsAt: number; status: DriveStatus; notes: string; createdAt: number };

function seedDrives(): TestDrive[] {
  const r = rng(23);
  const now = Date.now();
  return Array.from({ length: 16 }, (_, i) => {
    const car = livePicks(r);
    const upcoming = i < 9;
    const day = upcoming ? r.int(0, 9) : -r.int(1, 14);
    const startsAt = new Date(now + day * DAY).setHours(r.int(10, 17), r.pick([0, 30]), 0, 0);
    const status: DriveStatus = upcoming ? r.pick(["requested", "confirmed", "confirmed"] as const) : r.pick(["completed", "completed", "completed", "no-show", "cancelled"] as const);
    return { id: `drive-${200 + i}`, ...person(r), carSlug: car.slug, carTitle: carTitleOf(car), startsAt, status, notes: r.pick(["", "", "Bringing a partner.", "Wants to compare with another car."]), createdAt: now - (Math.abs(day) + 2) * DAY };
  });
}
export const drivesStore = defineCollection<TestDrive>("test-drives", seedDrives);

// ---- Customers, stock alerts, newsletter ----
export type Customer = { id: string; name: string; email: string; phone: string; source: string; marketingConsent: boolean; createdAt: number; lastContactAt: number };
function seedCustomers(): Customer[] {
  const r = rng(31);
  const now = Date.now();
  return Array.from({ length: 22 }, (_, i) => ({ id: `cust-${300 + i}`, ...person(r), source: r.pick(["Website", "Walk-in", "Referral", "Facebook"]), marketingConsent: r.next() > 0.35, createdAt: now - r.int(2, 200) * DAY, lastContactAt: now - r.int(0, 40) * DAY }));
}
export const customersStore = defineCollection<Customer>("customers", seedCustomers);

export const ALERT_KINDS = ["back-in-stock", "price-drop", "new-arrival"] as const;
export type AlertKind = (typeof ALERT_KINDS)[number];
export const ALERT_KIND_LABELS: Record<AlertKind, string> = { "back-in-stock": "Back in stock", "price-drop": "Price drop", "new-arrival": "New arrival" };
export type StockAlert = { id: string; email: string; kind: AlertKind; criteria: string; active: boolean; createdAt: number; lastSentAt?: number };
function seedAlerts(): StockAlert[] {
  const r = rng(41);
  const now = Date.now();
  return Array.from({ length: 14 }, (_, i) => {
    const car = livePicks(r);
    const kind = r.pick(ALERT_KINDS);
    const criteria = kind === "price-drop" ? `${car.make} ${car.model}, any price drop` : kind === "new-arrival" ? `Any ${car.bodyType ?? "car"} under €${(Math.ceil(car.priceEur / 5000) * 5000).toLocaleString("en-IE")}` : `${car.make} ${car.model}`;
    return { id: `alert-${400 + i}`, email: person(r).email, kind, criteria, active: r.next() > 0.15, createdAt: now - r.int(1, 90) * DAY, lastSentAt: r.next() > 0.6 ? now - r.int(1, 20) * DAY : undefined };
  });
}
export const alertsStore = defineCollection<StockAlert>("alerts", seedAlerts);

export type Subscriber = { id: string; email: string; status: "subscribed" | "unsubscribed"; createdAt: number };
function seedSubscribers(): Subscriber[] {
  const r = rng(53);
  const now = Date.now();
  return Array.from({ length: 30 }, (_, i) => ({ id: `sub-${500 + i}`, email: person(r).email, status: r.next() > 0.1 ? "subscribed" : "unsubscribed", createdAt: now - r.int(1, 240) * DAY }));
}
export const subscribersStore = defineCollection<Subscriber>("subscribers", seedSubscribers);

// ---- Reviews ----
export type AdminReview = { id: string; author: string; rating: 1 | 2 | 3 | 4 | 5; text: string; createdAt: number; reply?: string; repliedAt?: number; flagged?: boolean };
const REVIEW_TEXT: [number, string][] = [
  [5, "Easy to deal with from the first call. The car was ready when we came to collect it."],
  [5, "No pressure at all. They answered every question and let us take our time."],
  [5, "Straightforward buying and a fair price on my trade-in. Would go back."],
  [4, "Good choice of cars. Took a while to get the paperwork done but they kept us posted."],
  [4, "Friendly team, clean car. The finance explanation was clear."],
  [3, "Car was fine, but I waited a while for a callback."],
  [2, "The listing said full service history and the book had two gaps. They sorted it, but I had to ask."],
  [5, "Second car from here. Same great service."],
  [1, "Booked a test drive and nobody was expecting me."],
  [5, "Brilliant. Fair, honest and quick."],
];
function seedReviews(): AdminReview[] {
  const r = rng(67);
  const now = Date.now();
  return REVIEW_TEXT.map(([rating, text], i) => ({
    id: `review-${600 + i}`,
    author: person(r).name,
    rating: rating as AdminReview["rating"],
    text,
    createdAt: now - (i * 11 + r.int(1, 8)) * DAY,
    reply: rating >= 4 && i % 2 === 0 ? "Thank you for the kind words. We are glad you are happy with the car." : undefined,
    repliedAt: rating >= 4 && i % 2 === 0 ? now - (i * 11) * DAY : undefined,
  }));
}
export const reviewsStore = defineCollection<AdminReview>("reviews", seedReviews);

// ---- Settings: one record ----
// Only what the admin itself uses. The business details (name, phone, hours) live in the site configuration and change with a deploy.
export type TeamMember = { id: string; name: string; email: string; role: Role }; // matched to the signed-in Access email (src/lib/permissions.ts)
export type DealerSettings = {
  id: "dealer";
  leadSlaHours: number; // a new lead waiting longer than this needs attention (overview)
  driveSlotMinutes: number; // one car cannot be booked twice within this many minutes (test drives)
  notifications: { newLead: boolean; testDrive: boolean; review: boolean; weeklyReport: boolean; followUps: boolean }; // followUps: the morning email
  marketing: { voice: string; hashtags: string; signOff: string }; // used by the post and newsletter writers
  team: TeamMember[];
  leadEmails: string[]; // who gets the email when a visitor sends a form; empty means the LEAD_TO_EMAIL variable
  updatedAt: number;
};
export const SETTINGS_DEFAULT: DealerSettings = {
  id: "dealer",
  leadSlaHours: 24,
  driveSlotMinutes: 60,
  notifications: { newLead: true, testDrive: true, review: true, weeklyReport: false, followUps: false },
  marketing: { voice: "Friendly and plain. Short sentences. No hype.", hashtags: "#usedcars #carsforsale", signOff: "Call in or message us to arrange a viewing." },
  team: TEAM_SEED.map((t) => ({ ...t })),
  leadEmails: [],
  updatedAt: 0,
};
// A real dealer starts with no team (the made-up one is the demo's) and adds its people in Settings.
const seedSettings = (): DealerSettings[] => [{ ...SETTINGS_DEFAULT, team: seedsDemoRecords() ? SETTINGS_DEFAULT.team : [], updatedAt: Date.now() }];
export const settingsStore = defineCollection<DealerSettings>("settings", seedSettings, { always: true });

// ---- Marketing: social posts, ads, newsletters ----
export { NETWORKS, type Network };
export type SocialPost = { id: string; network: Network; carSlug?: string; carTitle?: string; text: string; photos?: string[]; status: "draft" | "scheduled" | "posted"; scheduledFor?: number; postedAt?: number; simulated?: boolean; claimedAt?: number; reach?: number; clicks?: number; createdAt: number };
export type Ad = { id: string; platform: "Meta" | "Google"; name: string; carTitle: string; budgetEur: number; status: "draft" | "running" | "paused" | "ended"; impressions: number; clicks: number; leads: number; createdAt: number };
export type Newsletter = { id: string; subject: string; body: string; status: "draft" | "sent"; sentAt?: number; recipients?: number; opens?: number; clicks?: number; createdAt: number };

function seedPosts(): SocialPost[] {
  const r = rng(79);
  const now = Date.now();
  return Array.from({ length: 9 }, (_, i) => {
    const car = livePicks(r);
    const status = i < 2 ? "draft" : i < 4 ? "scheduled" : "posted";
    return {
      id: `post-${700 + i}`,
      network: r.pick(NETWORKS),
      carSlug: car.slug,
      carTitle: carTitleOf(car),
      text: `Just in: ${carTitleOf(car)}, ${car.mileageKm?.toLocaleString("en-IE")} km. Come and see it.`,
      status,
      scheduledFor: status === "scheduled" ? now + (i - 1) * DAY : undefined,
      postedAt: status === "posted" ? now - (i - 3) * 3 * DAY : undefined,
      reach: status === "posted" ? r.int(400, 5200) : undefined,
      clicks: status === "posted" ? r.int(8, 140) : undefined,
      createdAt: now - (i + 1) * 2 * DAY,
    };
  });
}
export const postsStore = defineCollection<SocialPost>("posts", seedPosts);

function seedAds(): Ad[] {
  const r = rng(83);
  const now = Date.now();
  return Array.from({ length: 5 }, (_, i) => {
    const car = livePicks(r);
    const status = (["running", "running", "paused", "ended", "draft"] as const)[i];
    const impressions = status === "draft" ? 0 : r.int(4000, 60000);
    const clicks = Math.round(impressions * (r.int(8, 30) / 1000));
    return { id: `ad-${800 + i}`, platform: r.pick(["Meta", "Google"] as const), name: `${car.make} ${car.model} spring push`, carTitle: carTitleOf(car), budgetEur: r.pick([100, 150, 250, 400]), status, impressions, clicks, leads: Math.round(clicks * 0.06), createdAt: now - (i + 1) * 5 * DAY };
  });
}
export const adsStore = defineCollection<Ad>("ads", seedAds);

function seedNewsletters(): Newsletter[] {
  const now = Date.now();
  return [
    { id: "nl-900", subject: "New arrivals this week", body: "Six new cars on the forecourt this week, including two SUVs under €20,000.", status: "sent", sentAt: now - 12 * DAY, recipients: 27, opens: 15, clicks: 6, createdAt: now - 13 * DAY },
    { id: "nl-901", subject: "Trade-in event this Saturday", body: "Bring your car in this Saturday for a free, no-obligation valuation.", status: "sent", sentAt: now - 40 * DAY, recipients: 24, opens: 12, clicks: 4, createdAt: now - 41 * DAY },
    { id: "nl-902", subject: "Winter service offer", body: "Book your winter check in November.", status: "draft", createdAt: now - 2 * DAY },
  ];
}
export const newslettersStore = defineCollection<Newsletter>("newsletters", seedNewsletters);

// The settings record, or the defaults if it is somehow missing, so no page has to handle "no settings".
export async function getSettings(): Promise<DealerSettings> {
  return { ...SETTINGS_DEFAULT, ...(await settingsStore.get("dealer")) }; // a saved record from before a setting existed still reads whole
}

// ---- Sales ----
// What a car sold for, when, by whom and to whom: one record per car (its id). The buyer is a customer record, by id, so their details live
// in one place. Recorded from Mark sold in our version, and after the sync marks a car sold in the DoneDeal version. Personal data: after
// SALE_KEEP_YEARS the link to the buyer is removed (src/lib/admin/sales-purge.ts) and the figures stay for the reports.
export type Sale = { id: string; carTitle: string; priceEur: number; soldOn: string; salesperson?: string; customerId?: string; createdAt: number };
function seedSales(): Sale[] {
  // Most of the demo's sold cars have their sale recorded; the rest show as "no sale recorded" on the overview.
  const sold = (demoCars as { id: string; year: number; make: string; model: string; priceEur: number; soldAt?: string }[]).filter((c) => c.soldAt);
  return sold.slice(0, Math.max(0, sold.length - 2)).map((c, i) => ({
    id: c.id,
    carTitle: `${c.year} ${c.make} ${c.model}`,
    priceEur: c.priceEur - [0, 250, 500][i % 3],
    soldOn: c.soldAt!,
    salesperson: TEAM_SEED[i % 2 === 0 ? 1 : 0].name,
    customerId: `cust-${300 + i}`,
    createdAt: Date.parse(`${c.soldAt}T16:00:00Z`),
  }));
}
export const salesStore = defineCollection<Sale>("sales", seedSales);

// ---- Cost prices ----
// What each car cost the dealer. Kept here, never in the public car data, and only shown to staff with the "margins" permission
// (src/lib/permissions.ts). One record per car id; a car added in the admin has none until someone enters it.
export type CarCost = { id: string; costEur: number };
export const costsStore = defineCollection<CarCost>("car-costs", () => [...demoCars, ...extraCars].map((c) => ({ id: c.id, costEur: demoCost(c.id, c.priceEur) })));

// Every dealer collection, so "Reset demo data" puts the whole demo back to its seed.
export const DEALER_COLLECTIONS = [leadsStore, drivesStore, customersStore, alertsStore, subscribersStore, reviewsStore, settingsStore, postsStore, adsStore, newslettersStore, costsStore, salesStore];
