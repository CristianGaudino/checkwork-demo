import "server-only";
import demoCars from "@/lib/stock/demo-cars.json";
import extraCars from "@/lib/stock/demo-cars-extra.json";
import { defineCollection, seedsDemoRecords } from "./docs";
import { NETWORKS, type Network } from "./networks";
import { demoCost } from "./margins";
import { DAY, HOUR } from "@/lib/time";
import { dublinDay, dublinMs } from "./format";
import { newId } from "./ids";
import { COVER_MONTHS, DEPOSIT_METHODS, type DepositMethod } from "./deposits";
import { ALERT_KINDS } from "@/lib/leads/schema";
import { regPeriods } from "@/lib/leads/reg-periods";
import type { Car } from "@/lib/stock/types";
import type { Role } from "@/lib/permission-rules";
import type { PrepLine } from "./prep";
import { carTitleOf, livePicks, person, rng } from "./seed-data";

// For the demo's stories: a day relative to today (YYYY-MM-DD, Irish), a demo car by id, a seeded customer by id.
const ago = (daysAgo: number) => dublinDay(Date.now() - daysAgo * DAY);
// A time on a day in Irish time, as a booking stores it (the server's clock is UTC, an hour off in summer).
const irishAt = (dayMs: number, h: number, m: number) => dublinMs(dublinDay(dayMs), `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
const demoCar = (id: string) => (demoCars as Car[]).find((c) => c.id === id)!;
const storyCustomer = (id: string) => seedCustomers().find((c) => c.id === id)!;

// The dealer's records. Each is a collection in the record store, with a typed shape and a seed. The dashboard is behind Cloudflare
// Access, and what visitors send is copied in from the leads table (real-leads.ts), so these hold real personal data too.

// ---- Leads ----
export const LEAD_STATUSES = ["new", "contacted", "appointment", "won", "lost"] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];
export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = { new: "New", contacted: "Contacted", appointment: "Appointment set", won: "Won", lost: "Lost" };
// warranty and service: a message sent from the Warranty or Service page (the website sends both as a general message; real-leads.ts
// tells them apart by the page).
export const LEAD_TYPES = ["enquiry", "test-drive", "finance", "trade-in", "sell", "find-a-car", "order", "warranty", "service", "general"] as const;
export type LeadType = (typeof LEAD_TYPES)[number];
export const LEAD_TYPE_LABELS: Record<LeadType, string> = { enquiry: "Car enquiry", "test-drive": "Test drive", finance: "Finance", "trade-in": "Trade-in", sell: "Selling a car", "find-a-car": "Find a car", order: "New car order", warranty: "Warranty claim", service: "Service", general: "General" };
// Why a lead was lost, so the reports can say where sales go. A fixed list, so they can be counted.
export const LOST_REASONS = ["Bought elsewhere", "Price", "Finance declined", "Stopped replying", "Car sold to someone else", "Other"] as const;
export type LostReason = (typeof LOST_REASONS)[number];
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
  photoKeys?: string[]; // their car's photos, in the private bucket; the lead page signs short links to them
  assignedTo?: string;
  followUpOn?: string; // YYYY-MM-DD, the Irish day to get back to them; cleared once the lead is won or lost
  lostReason?: LostReason; // only on a lost lead
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
  order: ["Looking at a new hybrid SUV for 271, mid spec, white.", "Want to order the estate in grey for July."],
  warranty: ["The engine warning light came on this morning. Reg 191-D-4521.", "The gearbox is slipping into second. Bought it here in the summer."],
  service: ["Due a full service next month, can you fit me in?", "Need an NCT check before the test."],
  general: ["What time do you close on Saturday?", "Do you do servicing as well?"],
};
// The seed draws from the types it always has, so adding a type never changes the demo's made-up leads.
const SEED_TYPES = ["enquiry", "test-drive", "finance", "trade-in", "sell", "find-a-car", "general"] as const;

function seedLeads(): Lead[] {
  const r = rng(11);
  const now = Date.now();
  return Array.from({ length: 28 }, (_, i) => {
    const type = r.pick(SEED_TYPES);
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
      ...((status === "contacted" || status === "appointment") && i % 3 === 0 && { followUpOn: dublinDay(now + ((i % 4) - 1) * DAY) }),
      ...(status === "lost" && { lostReason: LOST_REASONS[i % LOST_REASONS.length] }), // by index, so the random sequence is unchanged
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
// The website requests behind the demo's stories below (a warranty claim, a factory order), from the same customers, and a few still waiting.
const STORY_LEADS = (now: number): Lead[] => {
  const as = (id: string) => (({ name, email, phone }: Customer) => ({ name, email, phone }))(storyCustomer(id));
  const r = rng(131);
  return [
    { id: "lead-2000", type: "warranty", status: "contacted", ...as("cust-300"), source: "Website", message: "The engine warning light came on at motorway speed. The car drives fine.", carTitle: seedSales()[0].carTitle, assignedTo: "Conor Doyle", notes: [{ at: now - 2 * DAY + 3 * HOUR, text: "Opened a claim and asked them to bring it in." }], createdAt: now - 2 * DAY },
    { id: "lead-2001", type: "order", status: "won", ...as("cust-315"), source: "Website", message: "Make: Toyota. Model: RAV4. Spec: 2.5 Hybrid Sol, white. Registration period: 271\n\nLooking to order for the new year.", assignedTo: "Conor Doyle", notes: [{ at: now - 12 * DAY + 4 * HOUR, text: "Order placed with a €1,000 deposit." }], createdAt: now - 13 * DAY },
    { id: "lead-2002", type: "order", status: "new", ...person(r), source: "Website", message: "Make: Hyundai. Model: Tucson. Registration period: 271\n\nWhat would the wait be for the hybrid?", notes: [], createdAt: now - 7 * HOUR },
    { id: "lead-2003", type: "warranty", status: "new", ...person(r), source: "Website", message: "The gearbox is slipping into second. Bought it here in the summer.", notes: [], createdAt: now - 4 * HOUR },
    { id: "lead-2004", type: "service", status: "new", ...person(r), source: "Phone", message: "Due a full service next month, can you fit me in?", notes: [], createdAt: now - 26 * HOUR },
    { id: "lead-2005", type: "service", status: "appointment", ...person(r), source: "Website", message: "Need an NCT check before the test.", assignedTo: "Ciara Walsh", followUpOn: dublinDay(now), notes: [{ at: now - 2 * DAY, text: "Booked in for Friday." }], createdAt: now - 3 * DAY },
  ];
};
// Six weeks of leads before the demo's last fortnight, mostly decided (won, or lost with a reason) and a few still being worked: so this
// week has weeks to compare with on the overview, and the reports have a past. A random sequence of their own, so the rest are unchanged.
const PAST_LEADS = (now: number): Lead[] => {
  const r = rng(149);
  const out: Lead[] = [];
  for (let week = 2; week < 8; week++) {
    for (let n = r.int(8, 14); n > 0; n--) {
      const type = r.pick(SEED_TYPES);
      const car = type === "find-a-car" || type === "general" || type === "sell" ? undefined : livePicks(r);
      const status = r.pick(["won", "won", "lost", "lost", "contacted"] as const);
      const lostReason = r.pick(LOST_REASONS);
      out.push({
        id: `lead-${3000 + out.length}`,
        type,
        status,
        ...person(r),
        message: r.pick(MESSAGES[type]),
        source: r.pick(LEAD_SOURCES),
        carSlug: car?.slug,
        carTitle: car && carTitleOf(car),
        assignedTo: r.pick(TEAM_SEED).name,
        ...(status === "lost" && { lostReason }),
        notes: [],
        createdAt: now - (week * 7 + r.int(0, 6)) * DAY - r.int(1, 10) * HOUR,
      });
    }
  }
  return out;
};
function seedLeadsWithEdges(): Lead[] {
  const now = Date.now();
  return [...seedLeads(), ...EDGE_LEADS(now), ...STORY_LEADS(now), ...PAST_LEADS(now)];
}
export const leadsStore = defineCollection<Lead>("leads", seedLeadsWithEdges);
// The seeded leads, for the notifications' own seed (notifications.ts), so the bell tells of the same requests.
export const demoLeads = seedLeadsWithEdges;

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
    const startsAt = irishAt(now + day * DAY, r.int(10, 17), r.pick([0, 30]));
    const status: DriveStatus = upcoming ? r.pick(["requested", "confirmed", "confirmed"] as const) : r.pick(["completed", "completed", "completed", "no-show", "cancelled"] as const);
    return { id: `drive-${200 + i}`, ...person(r), carSlug: car.slug, carTitle: carTitleOf(car), startsAt, status, notes: r.pick(["", "", "Bringing a partner.", "Wants to compare with another car."]), createdAt: now - (Math.abs(day) + 2) * DAY };
  });
}
// Today's and tomorrow's diary, so the demo never opens on an empty day (a random day can miss it). Not 11:00, which the tests book.
function seedDiary(): TestDrive[] {
  const r = rng(137);
  const now = Date.now();
  const forSale = (demoCars as Car[]).filter((c) => !c.soldAt && !c.reserved);
  return ([[0, 12, 30, "confirmed"], [0, 15, 0, "confirmed"], [0, 17, 0, "requested"], [1, 10, 0, "requested"], [1, 16, 30, "confirmed"]] as const).map(([day, h, m, status], i) => {
    const car = r.pick(forSale);
    return { id: `drive-${230 + i}`, ...person(r), carSlug: car.slug, carTitle: carTitleOf(car), startsAt: irishAt(now + day * DAY, h, m), status, notes: i === 1 ? "Bringing a partner." : "", createdAt: now - (i + 1) * DAY };
  });
}
export const drivesStore = defineCollection<TestDrive>("test-drives", () => [...seedDrives(), ...seedDiary()]);

// ---- Customers, stock alerts, newsletter ----
export type Customer = { id: string; name: string; email: string; phone: string; source: string; marketingConsent: boolean; createdAt: number; lastContactAt: number };
function seedCustomers(): Customer[] {
  const r = rng(31);
  const now = Date.now();
  // A customer is on file from their first purchase at the latest, so no one bought a car before they were a customer.
  const firstSale = (id: string) => Math.min(...PAST_SALES.filter((p) => p.sale.customerId === id).map((p) => p.sale.createdAt));
  return Array.from({ length: 22 }, (_, i) => {
    const id = `cust-${300 + i}`;
    return { id, ...person(r), source: r.pick(["Website", "Walk-in", "Referral", "Facebook"]), marketingConsent: r.next() > 0.35, createdAt: Math.min(now - r.int(2, 200) * DAY, firstSale(id) - DAY), lastContactAt: now - r.int(0, 40) * DAY };
  });
}
export const customersStore = defineCollection<Customer>("customers", seedCustomers);

export { ALERT_KINDS }; // the kinds the website's form takes (src/lib/leads/schema.ts), so the two never differ
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
export type AdminReview = { id: string; author: string; rating: 1 | 2 | 3 | 4 | 5; text: string; createdAt: number; reply?: string; repliedAt?: number };
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
// Who the dealer's own warnings go to: the owners and managers on the team, and the owners named in ADMIN_OWNER_EMAILS (a new dealer may
// have no team yet). Lower case, each once. Never a customer address.
export const leaderEmails = (team: TeamMember[]): string[] => [
  ...new Set([...team.filter((t) => t.role === "Owner" || t.role === "Manager").map((t) => t.email), ...(process.env.ADMIN_OWNER_EMAILS ?? "").split(",")].map((e) => e.trim().toLowerCase()).filter(Boolean)),
];
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
// The demo has the morning follow-up email on, so it can be shown (the made-up team's mail goes to the lead inbox, src/lib/leads/mail.ts).
const seedSettings = (): DealerSettings[] => {
  const demo = seedsDemoRecords();
  return [{ ...SETTINGS_DEFAULT, team: demo ? SETTINGS_DEFAULT.team : [], notifications: { ...SETTINGS_DEFAULT.notifications, followUps: demo }, updatedAt: Date.now() }];
};
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
// A sale that was undone keeps its record, under an id of its own (the car's id is free for the next sale): `returnedOn` says when, and
// `kind` whether it fell through before the buyer took the car (cancelled) or the buyer brought it back (returned). Reports leave those out.
export type Sale = {
  id: string;
  carId?: string; // only on an undone sale: the car it was for (a live sale's id is the car's)
  carTitle: string;
  priceEur: number;
  soldOn: string;
  salesperson?: string;
  customerId?: string;
  depositEur?: number; // taken earlier as a reservation, and part of the price
  coverMonths?: number; // the warranty from the day of sale: the included cover, or longer if extended cover was bought. Absent: the included.
  tradeIn?: { reg: string; allowanceEur: number }; // the buyer's car taken in part exchange
  leadId?: string; // the lead the sale came from, marked won with it
  returnedOn?: string;
  kind?: "cancelled" | "returned";
  refundEur?: number;
  reason?: string;
  createdAt: number;
};
// Undoing a sale: the record moves to an id of its own with how and when, then the car's id is freed. In that order, so nothing is lost
// if the second write fails (the sale shows twice until it is done again).
// Its warranty claims move with it, so a car sold again never lends the next buyer's sale to an old claim.
export async function undoSale(sale: Sale, how: Required<Pick<Sale, "returnedOn" | "kind">> & Pick<Sale, "refundEur" | "reason">) {
  const id = newId("undone");
  await salesStore.put({ ...sale, ...how, id, carId: sale.id });
  for (const c of await claimsStore.list()) if (c.saleId === sale.id) await claimsStore.put({ ...c, saleId: id });
  await salesStore.remove(sale.id);
}
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
    ...(i === 0 && { coverMonths: 24, tradeIn: { reg: "151-D-23817", allowanceEur: 2500 } }),
    ...(i === 1 && { depositEur: 500 }), // its deposit is in seedReservations
    createdAt: Date.parse(`${c.soldAt}T16:00:00Z`),
  }));
}
// The demo's last year of sales, before the cars in stock now: cars long gone from the site, kept only as sales (and their costs), so the
// reports have a year to show. Two to four a month, by the made-up team, to the made-up customers.
const PAST_SALES: { sale: Sale; costEur: number }[] = (() => {
  const r = rng(101);
  const cars = demoCars as { make: string; model: string; year: number; priceEur: number }[];
  const out: { sale: Sale; costEur: number }[] = [];
  for (let back = 11; back >= 1; back--) {
    for (let n = r.int(2, 4); n > 0; n--) {
      const c = r.pick(cars);
      const d = new Date();
      d.setUTCDate(1);
      d.setUTCMonth(d.getUTCMonth() - back);
      d.setUTCDate(r.int(1, 28));
      const priceEur = c.priceEur - r.pick([0, 250, 500, 1000]);
      const sale = { id: `past-${out.length}`, carTitle: `${c.year - 1} ${c.make} ${c.model}`, priceEur, soldOn: d.toISOString().slice(0, 10), salesperson: r.pick(["Conor Doyle", "Conor Doyle", "Aoife Brennan", "Ciara Walsh"]), customerId: `cust-${300 + r.int(0, 21)}`, createdAt: d.getTime() };
      out.push({ sale, costEur: Math.round((priceEur * r.int(80, 90)) / 100 / 50) * 50 });
    }
  }
  return out;
})();
// Two sales undone: a car brought back for a fault and refunded (back on sale now), and one that fell through before collection.
function seedUndone(): Sale[] {
  const now = Date.now();
  const title = (id: string) => carTitleOf(demoCar(id));
  return [
    { id: "undone-s1", carId: "4710009", carTitle: title("4710009"), priceEur: 9950, soldOn: ago(21), salesperson: "Conor Doyle", customerId: "cust-313", returnedOn: ago(14), kind: "returned", refundEur: 9950, reason: "A clutch fault in the first week. Full refund.", createdAt: now - 21 * DAY },
    { id: "undone-s2", carId: "4710020", carTitle: title("4710020"), priceEur: 10450, soldOn: ago(6), salesperson: "Aoife Brennan", customerId: "cust-314", returnedOn: ago(4), kind: "cancelled", reason: "Finance declined.", createdAt: now - 6 * DAY },
  ];
}
export const salesStore = defineCollection<Sale>("sales", () => [...seedSales(), ...PAST_SALES.map((p) => p.sale), ...seedUndone()]);

// ---- Reservations ----
// A deposit on a car: the car is marked reserved on the website until the date agreed. It ends sold (the deposit is part of the price),
// or with the deposit refunded or kept, by a manager or owner, under the dealer's own terms. Personal data like a sale: erasure and the
// six-year purge remove the buyer and keep the figures. Our version only: DoneDeal stock is not reserved here.
export { DEPOSIT_METHODS };
export type Reservation = {
  id: string;
  carId: string;
  carTitle: string;
  customerId?: string;
  depositEur: number;
  method: DepositMethod;
  paidOn: string; // YYYY-MM-DD
  until: string; // YYYY-MM-DD, the last day it is held
  salesperson?: string;
  status: "held" | "sold" | "refunded" | "kept";
  refundEur?: number;
  endedOn?: string;
  createdAt: number;
};
// Two deposits held (one past its date, so the overview asks about it), one that became the sale, one refunded. The held ones are on the
// cars marked reserved in demo-cars.json, and Reset demo data marks them again.
function seedReservations(): Reservation[] {
  const now = Date.now();
  const sold = demoCar("4710004");
  const soldDaysAgo = Math.round((now - Date.parse(`${sold.soldAt}T12:00:00Z`)) / DAY);
  const deposit = (id: string, carId: string, customerId: string, depositEur: number, method: DepositMethod, paidDaysAgo: number, untilDaysAgo: number, salesperson: string): Reservation =>
    ({ id, carId, carTitle: carTitleOf(demoCar(carId)), customerId, depositEur, method, paidOn: ago(paidDaysAgo), until: ago(untilDaysAgo), salesperson, status: "held", createdAt: now - paidDaysAgo * DAY });
  return [
    deposit("dep-s1", "4710026", "cust-310", 1000, "Card", 3, -7, "Conor Doyle"),
    deposit("dep-s2", "4710010", "cust-311", 2000, "Bank transfer", 16, 2, "Aoife Brennan"),
    { ...deposit("dep-s3", "4710004", "cust-301", 500, "Cash", soldDaysAgo + 4, soldDaysAgo - 3, "Aoife Brennan"), status: "sold", endedOn: sold.soldAt },
    { ...deposit("dep-s4", "4710013", "cust-312", 500, "Card", 25, 18, "Conor Doyle"), status: "refunded", refundEur: 500, endedOn: ago(19) },
  ];
}
export const reservationsStore = defineCollection<Reservation>("reservations", seedReservations);
export const heldFor = (all: Reservation[], carId: string) => all.find((r) => r.carId === carId && r.status === "held");

// ---- Warranty claims ----
// A fault on a car the dealer sold, under its warranty or not, from the call to the repair. Tied to the sale (its id, the car's id while
// the sale stands), so the cover is known. What the repair cost the dealer counts against that car's margin (src/lib/admin/costs.ts).
export const CLAIM_STATUSES = ["open", "booked", "approved", "declined", "repaired", "closed"] as const;
export type ClaimStatus = (typeof CLAIM_STATUSES)[number];
export const CLAIM_STATUS_LABELS: Record<ClaimStatus, string> = { open: "Open", booked: "Booked in", approved: "Approved", declined: "Declined", repaired: "Repaired", closed: "Closed" };
export const claimOpen = (s: ClaimStatus) => s !== "declined" && s !== "closed";
export type Claim = {
  id: string;
  saleId: string;
  carId: string;
  carTitle: string;
  customerId?: string;
  openedOn: string; // YYYY-MM-DD
  fault: string;
  inCover: boolean; // under the warranty on the day it was opened
  status: ClaimStatus;
  costEur?: number; // what the repair cost the dealer: margins permission only
  leadId?: string; // the website claim it came from
  notes: { at: number; text: string }[];
  createdAt: number;
};
// Claims at every stage, on the demo's sales: the newest from a website request (lead-2000), the repaired ones with what they cost.
function seedClaims(): Claim[] {
  const now = Date.now();
  const recent = PAST_SALES.slice(-6).map((p) => p.sale); // the last two months or so
  const claim = (id: string, s: Sale, daysAgo: number, fault: string, status: ClaimStatus, note?: string, extra?: Partial<Claim>): Claim => {
    const openedOn = [ago(daysAgo), s.soldOn].sort()[1]; // never before the sale
    return { id, saleId: s.id, carId: s.id, carTitle: s.carTitle, customerId: s.customerId, openedOn, fault, inCover: openedOn <= coverEnds(s), status, notes: note ? [{ at: now - (daysAgo - 1) * DAY, text: note }] : [], createdAt: now - daysAgo * DAY, ...extra };
  };
  const [first, , third] = seedSales();
  return [
    claim("claim-s1", first, 2, "The engine warning light came on at motorway speed. The car drives fine.", "open", undefined, { leadId: "lead-2000" }),
    claim("claim-s2", third, 5, "A rattle from the front left over bumps.", "booked", "Booked in for Thursday morning."),
    claim("claim-s3", recent[5], 9, "The air con is blowing warm.", "approved", "A regas did not fix it. New compressor approved."),
    claim("claim-s4", recent[3], 20, "Water coming in at the rear window seal.", "repaired", "New seal fitted. Dry after a wash.", { costEur: 180 }),
    claim("claim-s5", recent[0], 30, "The brakes squeal when stopping.", "declined", "Worn pads, not covered. Quoted for a set."),
    claim("claim-s6", PAST_SALES[3].sale, 60, "Flat battery two mornings in a row.", "closed", "New battery fitted.", { costEur: 140 }),
  ];
}
export const claimsStore = defineCollection<Claim>("claims", seedClaims);
// The last day of a sale's warranty.
export const coverEnds = (s: Pick<Sale, "soldOn" | "coverMonths">) => {
  const [y, m, d] = s.soldOn.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1 + (s.coverMonths ?? COVER_MONTHS), d - 1)).toISOString().slice(0, 10);
};

// ---- Factory orders ----
// A new car ordered from the maker for a customer (our version only; no maker's system is connected). It moves from Ordered to Arrived by
// hand. On arrival the car is added to stock, hidden and reserved for the buyer with their deposit, so Mark sold hands it over and the
// order is done. Cancelled (owners and managers) with the deposit refunded or kept. Personal data like a sale: erasure and the purge keep
// the figures without the buyer.
export const ORDER_STATUSES = ["ordered", "built", "in-transit", "arrived", "handed-over", "cancelled"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];
export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = { ordered: "Ordered", built: "Built", "in-transit": "On its way", arrived: "Arrived", "handed-over": "Handed over", cancelled: "Cancelled" };
export const orderOpen = (s: OrderStatus) => s !== "handed-over" && s !== "cancelled";
// The way an order goes, start to end, for its progress tracker (a cancelled one left the way, so it has none).
export const ORDER_PATH = ORDER_STATUSES.filter((s) => s !== "cancelled");
export type Order = {
  id: string;
  customerId?: string;
  make: string;
  model: string;
  spec?: string;
  colour?: string;
  priceEur: number;
  depositEur?: number;
  depositMethod?: DepositMethod;
  regPeriod: string; // e.g. "271"
  expected: string; // YYYY-MM, the month the maker gave
  orderedOn: string; // YYYY-MM-DD
  status: OrderStatus;
  carId?: string; // the car in stock, once it arrived
  salesperson?: string;
  leadId?: string; // the website request it came from
  refundEur?: number; // on a cancelled order: the deposit given back
  notes: { at: number; text: string }[];
  createdAt: number;
};
// Orders at every stage, for this registration period and the next, so the dates always look current.
function seedOrders(): Order[] {
  const now = Date.now();
  const [thisPeriod, nextPeriod] = regPeriods(dublinDay(now));
  const order = (id: string, customerId: string, make: string, model: string, spec: string, colour: string, priceEur: number, regPeriod: string, expectedInDays: number, daysAgo: number, status: OrderStatus, salesperson: string, depositEur: number, note?: string, extra?: Partial<Order>): Order =>
    ({ id, customerId, make, model, spec, colour, priceEur, depositEur, depositMethod: "Card", regPeriod, expected: ago(-expectedInDays).slice(0, 7), orderedOn: ago(daysAgo), status, salesperson, notes: note ? [{ at: now - (daysAgo - 2) * DAY, text: note }] : [], createdAt: now - daysAgo * DAY, ...extra });
  return [
    order("order-s1", "cust-315", "Toyota", "RAV4", "2.5 Hybrid Sol", "Pearl White", 47950, nextPeriod, 60, 12, "ordered", "Conor Doyle", 1000, "Confirmed with the importer. Build slot in December.", { leadId: "lead-2001" }),
    order("order-s2", "cust-316", "Hyundai", "Tucson", "1.6 T-GDi Hybrid Executive", "Phantom Black", 44495, nextPeriod, 75, 5, "ordered", "Aoife Brennan", 500, undefined, { depositMethod: "Bank transfer" }),
    order("order-s3", "cust-317", "Kia", "Sportage", "1.6 HEV K4", "Steel Grey", 41995, nextPeriod, 40, 40, "built", "Conor Doyle", 1000, "Built. Waiting on a ship."),
    order("order-s4", "cust-318", "Skoda", "Octavia Combi", "2.0 TDI Style", "Moon White", 38950, thisPeriod, 10, 70, "in-transit", "Ciara Walsh", 1000, "On the boat. At the port next week."),
    order("order-s5", "cust-319", "Volkswagen", "ID.4", "Pro", "Kings Red", 46950, thisPeriod, -60, 150, "handed-over", "Conor Doyle", 2000, "Handed over. Very happy."),
    order("order-s6", "cust-320", "Ford", "Puma", "1.0 EcoBoost ST-Line", "Race Red", 32950, nextPeriod, 70, 30, "cancelled", "Aoife Brennan", 500, "Bought a used car from us instead. Deposit refunded.", { refundEur: 500 }),
  ];
}
export const ordersStore = defineCollection<Order>("orders", seedOrders);

// ---- Cost prices ----
// What each car cost the dealer. Kept here, never in the public car data, and only shown to staff with the "margins" permission
// (src/lib/permissions.ts). One record per car id; a car added in the admin has none until someone enters it.
export type CarCost = { id: string; costEur: number };
export const costsStore = defineCollection<CarCost>("car-costs", () => [...[...demoCars, ...extraCars].map((c) => ({ id: c.id, costEur: demoCost(c.id, c.priceEur) })), ...PAST_SALES.map((p) => ({ id: p.sale.id, costEur: p.costEur }))]);

// Prep: what was spent getting a car ready to sell, on top of its cost (valet, tyres, NCT...). One record per car, its lines in a fixed
// list of kinds, so reports can total them. Margins permission only, like the cost.
export { PREP_KINDS, type PrepKind, type PrepLine } from "./prep";
export type CarPrep = { id: string; lines: PrepLine[] };
function seedPrep(): CarPrep[] {
  // A valet on every other demo car, and tyres or an NCT on some, so the margins and reports show prep without every car carrying it.
  const r = rng(91);
  return [...demoCars, ...extraCars].filter((_, i) => i % 2 === 0).map((c, i) => ({
    id: c.id,
    lines: [{ kind: "Valet" as const, eur: 120, at: Date.now() - (i + 5) * DAY }, ...(i % 3 === 0 ? [{ kind: r.pick(["Tyres", "NCT", "Service"] as const), eur: r.pick([90, 180, 320, 450]), at: Date.now() - (i + 3) * DAY }] : [])],
  }));
}
export const prepStore = defineCollection<CarPrep>("car-prep", seedPrep);

// Every dealer collection, so "Reset demo data" puts the whole demo back to its seed.
export const DEALER_COLLECTIONS = [leadsStore, drivesStore, customersStore, alertsStore, subscribersStore, reviewsStore, settingsStore, postsStore, adsStore, newslettersStore, costsStore, salesStore, prepStore, reservationsStore, claimsStore, ordersStore];
