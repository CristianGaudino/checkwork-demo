import { MODULES, MODULE_IDS, type ModuleId } from "@/lib/modules-rules";

// What a dealer pays us, and the rules for the usage billed on top (#181). Plain data and pure functions, so the Billing page, the
// meters and the tests agree. The prices are the demo's: a real site reads the dealer's own prices, discounts and bills from the owner's
// billing program, and these stand in until it does (docs/dealer-admin.md, Billing).

// Usage that costs money per use, billed on top of the plan. Every use is billed: nothing is absorbed by us.
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
  whatsapp: { alert: 0.05, reply: 0.02, marketing: 0.12 },
};
// The other way to pay for AI: a flat fee a month with a set number of actions, then per action over it.
export const AI_PLANS = ["perAction", "assistant"] as const;
export type AiPlan = (typeof AI_PLANS)[number];
export const AI_ASSISTANT = { monthlyEur: 19, actions: 300 } as const;
export const AI_MODELS = ["opus", "sonnet"] as const;
export type AiModel = (typeof AI_MODELS)[number];

// The plan: the base site and each module, a month, before VAT.
export const BASE_EUR = 200;
export const MODULE_EUR: Record<ModuleId, number> = {
  dashboard: 49, tradeIn: 49, finance: 29, testDrives: 29, carFinder: 19, sales: 59, margins: 49, service: 49, reviews: 29, social: 99, newsletter: 59,
  commercial: 29, newCars: 99, analytics: 19, whatsapp: 49, ai: 0, lookupWebsite: 0, lookupDashboard: 0,
};
// One-off fees at launch, before VAT: the site's design and launch, and the modules set up with outside accounts.
export const BASE_SETUP_EUR = 1200;
export const MODULE_SETUP_EUR: Partial<Record<ModuleId, number>> = { social: 150, newCars: 400, whatsapp: 150 };
export function setupLines(modules: Iterable<ModuleId>): { label: string; eur: number }[] {
  const set = new Set(modules);
  return [{ label: "Website", eur: BASE_SETUP_EUR }, ...MODULES.filter((m) => set.has(m.id) && MODULE_SETUP_EUR[m.id]).map((m) => ({ label: m.label, eur: MODULE_SETUP_EUR[m.id]! }))];
}
export const setupEur = (modules: Iterable<ModuleId>) => setupLines(modules).reduce((n, l) => n + l.eur, 0);
export const VAT_PCT = 23;
export const withVat = (eur: number) => round2(eur * (1 + VAT_PCT / 100));
export const round2 = (n: number) => Math.round(n * 100) / 100;
// "€20", "€20.50": whole euros without cents, as the Billing page writes them; `cents` always shows them, as a bill does ("€200.00").
export const eur = (n: number, cents = !Number.isInteger(n)) => `€${n.toLocaleString("en-IE", { minimumFractionDigits: cents ? 2 : 0, maximumFractionDigits: 2 })}`;

// shortcut: our pricing is hidden on screen for now (the owner's call, November 2026). Billing shows the plan and its modules, the AI
// writing choice and the billing details with no prices; its limits, bills and bill pages, the "Set the cap" link, limit notifications and
// the demo bar's prices are hidden. The limits still apply. Set true to show it all again; nothing was removed.
export const SHOW_PRICING = false;

// One count a month per service, kind and place: a record per line of the bill, not one per use, so it never grows with traffic.
export type UsageCount = { id: string; month: string; service: Service; kind: string; count: number };
export const usageId = (month: string, service: Service, kind: string) => `${month}:${service}:${kind}`;

export type ServiceCost = { count: number; costEur: number; kinds: { kind: string; label: string; count: number; costEur: number }[] };
// What the month's usage costs. AI on the assistant plan: the first AI_ASSISTANT.actions, of either model, are in the flat fee (charged with
// the plan).
export function usageCosts(counts: UsageCount[], aiPlan: AiPlan): Record<Service, ServiceCost> & { totalEur: number } {
  const out = Object.fromEntries(SERVICES.map((s) => [s, { count: 0, costEur: 0, kinds: [] as ServiceCost["kinds"] }])) as Record<Service, ServiceCost>;
  let aiFree = aiPlan === "assistant" ? AI_ASSISTANT.actions : 0;
  for (const s of SERVICES) {
    for (const kind of Object.keys(KINDS[s]) as Kind[]) {
      const count = counts.filter((c) => c.service === s && c.kind === kind).reduce((n, c) => n + c.count, 0);
      let billed = count;
      if (s === "ai") {
        const free = Math.min(aiFree, count);
        aiFree -= free;
        billed -= free;
      }
      const costEur = round2(billed * (UNIT_PRICE_EUR[s] as Record<string, number>)[kind]);
      out[s].kinds.push({ kind, label: (KINDS[s] as Record<string, string>)[kind], count, costEur });
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
  aiPlan: AiPlan;
  aiModel: AiModel;
};
// Every site starts with our AI ceiling, so a live key never runs without a limit; the owner's program can set another per dealer.
export const AI_CEILING_EUR = 50;
export const BILLING_DEFAULT: BillingSettings = { caps: {}, ceilings: { ai: AI_CEILING_EUR }, alerts: [], alertAt80: true, aiPlan: "perAction", aiModel: "opus" };
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
      if (crossed(s, cap)) out.push({ key: `${month}:${s}:cap:${cap}`, scope: s, text: `${label(s)} has reached its ${eur(cap)} monthly limit and has stopped until next month` });
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

// The month's usage at month end: each service at its pace, stopped at its own limit, then all of it at the total limit; never less than
// what is already spent (a limit lowered mid-month).
export function usageEstimate(costs: Record<Service, ServiceCost> & { totalEur: number }, b: BillingSettings, today: string): number {
  const each = SERVICES.reduce((sum, s) => sum + Math.max(costs[s].costEur, Math.min(monthEndEstimate(costs[s].costEur, today), capOf(b, s) ?? Infinity)), 0);
  return round2(Math.max(costs.totalEur, Math.min(each, capOf(b, "total") ?? Infinity)));
}
// The bundles: the base site and a set of modules for one price a month, before VAT. Single modules can be added on top.
const LEADS: ModuleId[] = ["dashboard", "tradeIn", "finance", "testDrives"];
export const BUNDLES: { id: string; label: string; modules: readonly ModuleId[]; eur: number }[] = [
  { id: "leads", label: "Leads", modules: LEADS, eur: 319 },
  { id: "dealer", label: "Dealer", modules: [...LEADS, "sales", "margins", "reviews"], eur: 449 },
  { id: "everything", label: "Everything", modules: MODULE_IDS, eur: 619 },
];
export type Bundle = (typeof BUNDLES)[number];

// The cheapest way to pay for these modules: base and each module, or a bundle and the modules on outside it at module prices. A bundle
// counts even with some of its modules off: the dealer never pays more for fewer modules than a bundle that holds them all.
// `name`: the bundle's, else "Base only" with no modules, else "Custom". `saving`: against the base and every module bought separately.
export function planFor(modules: Iterable<ModuleId>): { bundle?: Bundle; extras: ModuleId[]; eur: number; separateEur: number; saving: number; name: string } {
  const set = new Set(modules);
  const on = MODULE_IDS.filter((m) => set.has(m)); // the list's order, each once
  const sum = (ms: ModuleId[]) => ms.reduce((n, m) => n + MODULE_EUR[m], 0);
  const separateEur = BASE_EUR + sum(on);
  let best: { bundle?: Bundle; extras: ModuleId[]; eur: number } = { extras: on, eur: separateEur };
  for (const bundle of BUNDLES) {
    const extras = on.filter((m) => !bundle.modules.includes(m));
    const eur = bundle.eur + sum(extras);
    if (eur < best.eur) best = { bundle, extras, eur };
  }
  return { ...best, separateEur, saving: separateEur - best.eur, name: best.bundle?.label ?? (on.length ? "Custom" : "Base only") };
}
// The plan's name when the paid modules are exactly a preset (a bundle, or the base only), else "Custom". Per-use modules (€0) do not count.
const paid = (ms: Iterable<ModuleId>) => [...new Set(ms)].filter((m) => MODULE_EUR[m] > 0).sort().join(",");
export function presetName(modules: Iterable<ModuleId>): string {
  const mine = paid(modules);
  if (!mine) return "Base only";
  return BUNDLES.find((b) => paid(b.modules) === mine)?.label ?? "Custom";
}
// The plan as bill lines: the bundle as one line, or the website, then each extra module that costs a month.
export function planLines(modules: Iterable<ModuleId>): { label: string; eur: number }[] {
  const p = planFor(modules);
  const extras = MODULES.filter((m) => p.extras.includes(m.id) && MODULE_EUR[m.id] > 0).map((m) => ({ label: m.label, eur: MODULE_EUR[m.id] }));
  return [p.bundle ? { label: `${p.bundle.label} plan`, eur: p.bundle.eur } : { label: "Website", eur: BASE_EUR }, ...extras];
}
// The plan's monthly price for these modules, the AI assistant's flat fee included when chosen.
export function planEur(modules: Iterable<ModuleId>, aiPlan: AiPlan): number {
  return planFor(modules).eur + (aiPlan === "assistant" ? AI_ASSISTANT.monthlyEur : 0);
}
