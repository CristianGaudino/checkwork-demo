import { MODULES, MODULE_IDS, type ModuleId } from "@/lib/modules-rules";

// What a dealer pays us, and the rules for the usage billed on top (#181). Plain data and pure functions, so the Billing page, the
// meters and the tests agree. The prices are the demo's: a real site reads the dealer's own prices, discounts and bills from the owner's
// billing program, and these stand in until it does (docs/dealer-admin.md, Billing).

// Usage that costs money per use, billed on top of the plan past the plan's monthly allowance (allowanceFor).
export const SERVICES = ["lookup", "ai", "whatsapp"] as const;
export type Service = (typeof SERVICES)[number];
export const SERVICE_LABELS: Record<Service, string> = { lookup: "Registration lookup", ai: "AI writing", whatsapp: "WhatsApp" };
export type Scope = Service | "total"; // a cap or an alert is on one service, or on all usage together

// What each use is, and its price. A lookup is on the website or in the dashboard; an AI action (a draft or an adjust) is counted by the
// model that wrote it, Premium (Claude Opus) or Standard (Claude Sonnet), the dealer's choice (BillingSettings.aiModel); the dealer never
// sees which model or provider it is. A WhatsApp
// message is an alert or confirmation, a reply inside the 24 hours after a buyer writes, or a marketing message.
export const KINDS = {
  lookup: { website: "On the website", dashboard: "In the dashboard" },
  ai: { opus: "Premium", sonnet: "Standard" },
  whatsapp: { alert: "Alerts and confirmations", reply: "Replies to buyers", marketing: "Marketing messages" },
} as const satisfies Record<Service, Record<string, string>>;
export type Kind<S extends Service = Service> = keyof (typeof KINDS)[S] & string;
export const UNIT_PRICE_EUR: { [S in Service]: Record<Kind<S>, number> } = {
  lookup: { website: 0.3, dashboard: 0.3 },
  ai: { opus: 0.08, sonnet: 0.04 }, // Sonnet costs us about half what Opus does, so the margin is the same
  whatsapp: { alert: 0.05, reply: 0.03, marketing: 0.12 },
};
export const AI_MODELS = ["opus", "sonnet"] as const;
export type AiModel = (typeof AI_MODELS)[number];

// Each add-on a month, before VAT, on top of a tier that does not hold it.
export const MODULE_EUR: Record<ModuleId, number> = {
  dashboard: 49, tradeIn: 49, finance: 29, testDrives: 29, carFinder: 19, sales: 59, margins: 49, service: 49, reviews: 29, social: 99, newsletter: 59,
  commercial: 29, newCars: 99, analytics: 19, whatsapp: 49, ai: 0, lookupWebsite: 0, lookupDashboard: 0,
};
// New cars covers this many brands; each one past them costs a month and once at setup, whether New cars is an add-on or in the tier.
export const NEW_CAR_BRANDS = { included: 2, eur: 29, setupEur: 100 } as const;
const extraBrands = (o: PlanOptions) => Math.max(0, o.brands - NEW_CAR_BRANDS.included);
// One-off fees at launch, before VAT: the tier's, and the add-ons set up with outside accounts.
export const MODULE_SETUP_EUR: Partial<Record<ModuleId, number>> = { social: 150, newCars: 400 };
export function setupLines(modules: Iterable<ModuleId>, o: PlanOptions = ONE_SITE): { label: string; eur: number }[] {
  const set = new Set(modules);
  const { tier, extras } = planFor(set, o);
  const brands = set.has("newCars") ? extraBrands(o) : 0;
  return [
    { label: `${tier.label} plan`, eur: tier.setupEur },
    ...MODULES.filter((m) => extras.includes(m.id) && MODULE_SETUP_EUR[m.id]).map((m) => ({ label: m.label, eur: MODULE_SETUP_EUR[m.id]! })),
    ...(brands ? [{ label: `New cars: ${brands} more ${brands === 1 ? "brand" : "brands"}`, eur: brands * NEW_CAR_BRANDS.setupEur }] : []),
  ];
}
export const setupEur = (modules: Iterable<ModuleId>, o: PlanOptions = ONE_SITE) => setupLines(modules, o).reduce((n, l) => n + l.eur, 0);

// How the dealer pays: monthly at list price, a year upfront for 11 months' price, or a 2-year contract with no setup fee.
export const TERMS = ["monthly", "annual", "twoYear"] as const;
export type Term = (typeof TERMS)[number];
export const TERM_LABELS: Record<Term, string> = { monthly: "Paid monthly", annual: "A year paid upfront, 1 month free", twoYear: "2-year contract, no setup fee" };
export const yearUpfrontEur = (monthlyEur: number) => round2(monthlyEur * 11);
export const termSetupEur = (setup: number, term: Term) => (term === "twoYear" ? 0 : setup);
export const VAT_PCT = 23;
export const withVat = (eur: number) => round2(eur * (1 + VAT_PCT / 100));
export const round2 = (n: number) => Math.round(n * 100) / 100;
// "€20", "€20.50": whole euros without cents, as the Billing page writes them; `cents` always shows them, as a bill does ("€200.00").
export const eur = (n: number, cents = !Number.isInteger(n)) => `€${n.toLocaleString("en-IE", { minimumFractionDigits: cents ? 2 : 0, maximumFractionDigits: 2 })}`;

// shortcut: our pricing is hidden on screen for now (the owner's call, November 2026). Billing shows the plan and its modules, the AI
// writing choice and the billing details with no prices; its limits, bills and bill pages, the "Set the cap" link, limit notifications and
// the demo bar's prices are hidden. The limits still apply. Set true to show it all again; nothing was removed.
export const SHOW_PRICING = true;

// One count a month per service, kind and place: a record per line of the bill, not one per use, so it never grows with traffic.
export type UsageCount = { id: string; month: string; service: Service; kind: string; count: number };
export const usageId = (month: string, service: Service, kind: string) => `${month}:${service}:${kind}`;

export type ServiceCost = { count: number; costEur: number; kinds: { kind: string; label: string; count: number; included: number; costEur: number }[] };
// What a plan includes a month, per service: lookups of either place, AI actions of either model, and WhatsApp alerts (replies and
// marketing messages are always billed).
export type Allowance = Partial<Record<Service, number>>;
const allowanceCovers = (s: Service, kind: string) => s !== "whatsapp" || kind === "alert";
// Whether one more use (of `kind`, when known) is still inside the plan's allowance: it costs nothing, so no limit stops it. A WhatsApp use
// of unknown kind is not, as only alerts are included.
export function inAllowance(c: ReturnType<typeof usageCosts>, allowance: Allowance, s: Service, kind?: string): boolean {
  if (kind === undefined ? s === "whatsapp" : !allowanceCovers(s, kind)) return false;
  return (allowance[s] ?? 0) > c[s].kinds.reduce((n, k) => n + (k.included ?? 0), 0);
}
// What the month's usage costs: each kind's uses past what the allowance still has, in the order of KINDS.
export function usageCosts(counts: Pick<UsageCount, "service" | "kind" | "count">[], allowance: Allowance): Record<Service, ServiceCost> & { totalEur: number } {
  const out = Object.fromEntries(SERVICES.map((s) => [s, { count: 0, costEur: 0, kinds: [] as ServiceCost["kinds"] }])) as Record<Service, ServiceCost>;
  for (const s of SERVICES) {
    let left = allowance[s] ?? 0;
    for (const kind of Object.keys(KINDS[s]) as Kind[]) {
      const count = counts.filter((c) => c.service === s && c.kind === kind).reduce((n, c) => n + c.count, 0);
      const included = allowanceCovers(s, kind) ? Math.min(left, count) : 0;
      left -= included;
      const costEur = round2((count - included) * (UNIT_PRICE_EUR[s] as Record<string, number>)[kind]);
      out[s].kinds.push({ kind, label: (KINDS[s] as Record<string, string>)[kind], count, included, costEur });
      out[s].count += count;
      out[s].costEur = round2(out[s].costEur + costEur);
    }
  }
  return { ...out, totalEur: round2(SERVICES.reduce((n, s) => n + out[s].costEur, 0)) };
}

// The dealer's own limits and alerts, and ours. `ceilings` are set by us per dealer; a dealer's cap can be lower, never higher.
export type BillingSettings = {
  caps: Partial<Record<Scope, number>>;
  ceilings: Partial<Record<Scope, number>>;
  alerts: { scope: Scope; amountEur: number }[];
  alertAt80: boolean;
  aiModel: AiModel;
  // Set from the owner's program, as the ceilings: how the dealer pays, their branches (only Group's price and allowances count them
  // until multi-branch is built, #226) and their new-car brands.
  term: Term;
  branches: number;
  brands: number;
};
// Every site starts with our limits past the allowance, so no per-use service runs without one; the dealer can set lower, and the owner's
// program can set others per dealer.
export const AI_CEILING_EUR = 50;
export const DEFAULT_CEILINGS: Partial<Record<Scope, number>> = { lookup: 15, whatsapp: 20, ai: AI_CEILING_EUR };
export const BILLING_DEFAULT: BillingSettings = { caps: {}, ceilings: DEFAULT_CEILINGS, alerts: [], alertAt80: true, aiModel: "opus", term: "monthly", branches: 1, brands: 1 };
// A stored record over the defaults, the ceilings merged one level down: a record saved before a default ceiling existed still gets it.
export const withBillingDefaults = (b?: Partial<BillingSettings>): BillingSettings => ({ ...BILLING_DEFAULT, ...b, ceilings: { ...BILLING_DEFAULT.ceilings, ...b?.ceilings } });

// The cap in force: the lower of the dealer's and ours, or none.
export function capOf(b: BillingSettings, scope: Scope): number | undefined {
  const set = [b.caps[scope], b.ceilings[scope]].filter((n): n is number => typeof n === "number" && n >= 0);
  return set.length ? Math.min(...set) : undefined;
}
const spent = (c: ReturnType<typeof usageCosts>, scope: Scope) => (scope === "total" ? c.totalEur : c[scope].costEur);
// Whether one more use of `service` is allowed this month: its own cap and the total cap both still have room.
export function withinCaps(c: ReturnType<typeof usageCosts>, b: BillingSettings, service: Service): boolean {
  return ([service, "total"] as Scope[]).every((s) => {
    const cap = capOf(b, s);
    return cap === undefined || spent(c, s) < cap;
  });
}

// The alerts a change in usage sets off: the 80% mark and the cap of each scope with a cap, and each amount the dealer chose, crossed
// between `before` and `after`. Each has a key, so it is sent once a month.
export type Alert = { key: string; scope: Scope; text: string };
export function alertsCrossed(before: ReturnType<typeof usageCosts>, after: ReturnType<typeof usageCosts>, b: BillingSettings, month: string): Alert[] {
  const label = (s: Scope) => (s === "total" ? "All usage" : SERVICE_LABELS[s]);
  const out: Alert[] = [];
  const crossed = (s: Scope, at: number) => spent(before, s) < at && spent(after, s) >= at;
  for (const s of ["total", ...SERVICES] as Scope[]) {
    const cap = capOf(b, s);
    if (cap !== undefined && cap > 0) {
      if (b.alertAt80 && crossed(s, cap * 0.8)) out.push({ key: `${month}:${s}:80:${cap}`, scope: s, text: `${label(s)} has reached 80% of its ${eur(cap)} monthly limit` });
      if (crossed(s, cap)) out.push({ key: `${month}:${s}:cap:${cap}`, scope: s, text: `${label(s)} has reached its ${eur(cap)} monthly limit, and paid use has stopped until next month` });
    }
  }
  for (const a of b.alerts) if (crossed(a.scope, a.amountEur)) out.push({ key: `${month}:${a.scope}:${a.amountEur}`, scope: a.scope, text: `${label(a.scope)} has passed ${eur(a.amountEur)} this month` });
  return out;
}

// The month to date, a whole month at the same pace: an estimate, always shown as one.
// `today`: the dealer's day, "YYYY-MM-DD" in Dublin time, the same calendar the usage months are counted in.
export function monthEndEstimate(sofarEur: number, today: string): number {
  const [y, m, day] = today.split("-").map(Number);
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return round2((sofarEur / day) * days);
}

// The month's usage at month end: each count at its pace, less the allowance, each service stopped at its own limit, then all of it at the
// total limit; never less than what is already spent (a limit lowered mid-month).
export function usageEstimate(counts: UsageCount[], allowance: Allowance, b: BillingSettings, today: string): number {
  const now = usageCosts(counts, allowance);
  const pace = usageCosts(counts.map((c) => ({ ...c, count: Math.round(monthEndEstimate(c.count, today)) })), allowance);
  const each = SERVICES.reduce((sum, s) => sum + Math.max(now[s].costEur, Math.min(pace[s].costEur, capOf(b, s) ?? Infinity)), 0);
  return round2(Math.max(now.totalEur, Math.min(each, capOf(b, "total") ?? Infinity)));
}
// The tiers (#223, docs/sales/pricing-strategy.md), the only plans sold: the site and a set of modules for one price a month before VAT, a
// setup fee, and a monthly allowance of per-use services. Group is priced per branch, and some of its allowance too. Other modules are
// add-ons on top.
const SHOWROOM: ModuleId[] = ["tradeIn", "finance", "carFinder", "lookupWebsite", "reviews"];
const DEALER: ModuleId[] = [...SHOWROOM, "dashboard", "testDrives", "sales", "analytics", "whatsapp", "ai", "lookupDashboard"];
export const TIERS: { id: string; label: string; modules: readonly ModuleId[]; eur: number; branchEur?: number; setupEur: number; allowance: Allowance; perBranch?: readonly Service[] }[] = [
  { id: "showroom", label: "Showroom", modules: SHOWROOM, eur: 249, setupEur: 950, allowance: { lookup: 25 } },
  { id: "dealer", label: "Dealer", modules: DEALER, eur: 449, setupEur: 950, allowance: { lookup: 100, whatsapp: 500, ai: 100 } },
  { id: "group", label: "Group", modules: [...DEALER, "margins", "social", "newsletter", "newCars", "commercial"], eur: 749, branchEur: 149, setupEur: 1950, allowance: { lookup: 100, whatsapp: 500, ai: 300 }, perBranch: ["lookup", "whatsapp"] },
];
export type Tier = (typeof TIERS)[number];
// What the price depends on besides the modules (BillingSettings has both).
export type PlanOptions = { branches: number; brands: number };
const ONE_SITE: PlanOptions = { branches: 1, brands: 1 };
const extraBranches = (o: PlanOptions) => Math.max(0, o.branches - 1);
const tierEur = (t: Tier, o: PlanOptions) => t.eur + (t.branchEur ?? 0) * extraBranches(o);
const DASHBOARD_MODULES = new Set(MODULES.filter((m) => m.id === "dashboard" || (m as { needs?: readonly string[] }).needs?.includes("dashboard")).map((m) => m.id));

// The cheapest tier for these modules, and the modules outside it at add-on prices. A tier counts even with some of its modules off: the
// dealer never pays more for fewer modules than a tier that holds them all. No modules is Showroom.
export function planFor(modules: Iterable<ModuleId>, o: PlanOptions = ONE_SITE): { tier: Tier; extras: ModuleId[]; eur: number; name: string } {
  const set = new Set(modules);
  const on = MODULE_IDS.filter((m) => set.has(m)); // the list's order, each once
  const sum = (ms: ModuleId[]) => ms.reduce((n, m) => n + MODULE_EUR[m], 0) + (set.has("newCars") ? extraBrands(o) * NEW_CAR_BRANDS.eur : 0);
  // More than one branch is a Group: the only tier sold per branch.
  const ways = TIERS.filter((t) => !extraBranches(o) || t.branchEur).flatMap((tier) => {
    const extras = on.filter((m) => !tier.modules.includes(m));
    // A tier without the dashboard (Showroom) takes no add-on that is the dashboard or needs it: that is the Dealer tier.
    if (!tier.modules.includes("dashboard") && extras.some((m) => DASHBOARD_MODULES.has(m))) return [];
    return [{ tier, extras, eur: tierEur(tier, o) + sum(extras) }];
  });
  const best = ways.reduce((a, w) => (w.eur < a.eur ? w : a));
  return { ...best, name: best.tier.label };
}
// The plan's name when the paid modules are exactly a tier's, else "Custom". Per-use modules (€0) do not count.
const paid = (ms: Iterable<ModuleId>) => [...new Set(ms)].filter((m) => MODULE_EUR[m] > 0).sort().join(",");
export function presetName(modules: Iterable<ModuleId>): string {
  const mine = paid(modules);
  return TIERS.find((t) => paid(t.modules) === mine)?.label ?? "Custom";
}
// The plan as bill lines: the tier as one line and its extra branches, then each add-on that costs a month, and the new-car brands past
// those included.
export function planLines(modules: Iterable<ModuleId>, o: PlanOptions = ONE_SITE): { label: string; eur: number }[] {
  const set = new Set(modules);
  const p = planFor(set, o);
  const branches = p.tier.branchEur ? extraBranches(o) : 0;
  const brands = set.has("newCars") ? extraBrands(o) : 0;
  return [
    { label: `${p.tier.label} plan`, eur: p.tier.eur },
    ...(branches ? [{ label: `${branches} more ${branches === 1 ? "branch" : "branches"}`, eur: branches * p.tier.branchEur! }] : []),
    ...MODULES.filter((m) => p.extras.includes(m.id) && MODULE_EUR[m.id] > 0).map((m) => ({ label: m.label, eur: MODULE_EUR[m.id] })),
    ...(brands ? [{ label: `New cars: ${brands} more ${brands === 1 ? "brand" : "brands"}`, eur: brands * NEW_CAR_BRANDS.eur }] : []),
  ];
}
// The plan's monthly price for these modules.
export const planEur = (modules: Iterable<ModuleId>, o: PlanOptions = ONE_SITE): number => planFor(modules, o).eur;
// What the plan includes each month before usage is billed: the tier's allowance, Group's lookups and alerts per branch. AI past it is
// billed per action.
export function allowanceFor(modules: Iterable<ModuleId>, o: PlanOptions): Allowance {
  const { tier, extras } = planFor(modules, o);
  const own: Allowance = Object.fromEntries(Object.entries(tier.allowance).map(([s, n]) => [s, tier.perBranch?.includes(s as Service) ? n * Math.max(1, o.branches) : n]));
  // Social as an add-on brings its own AI uses, as Group's 300 has them (Dealer's 100 plus these).
  return extras.includes("social") ? { ...own, ai: (own.ai ?? 0) + SOCIAL_AI } : own;
}
export const SOCIAL_AI = 200;
