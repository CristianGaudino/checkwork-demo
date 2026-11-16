import type { ModuleId } from "@/lib/modules-rules";

// What a dealer pays us, and the rules for the usage billed on top (#181). Plain data and pure functions, so the Billing page, the
// meters and the tests agree. The prices are the demo's: a real site reads the dealer's own prices, discounts and bills from the owner's
// billing program, and these stand in until it does (docs/dealer-admin.md, Billing).

// Usage that costs money per use, billed on top of the plan. Every use is billed: nothing is absorbed by us.
export const SERVICES = ["lookup", "ai", "whatsapp"] as const;
export type Service = (typeof SERVICES)[number];
export const SERVICE_LABELS: Record<Service, string> = { lookup: "Registration lookup", ai: "AI writing", whatsapp: "WhatsApp" };
export type Scope = Service | "total"; // a cap or an alert is on one service, or on all usage together

// What each use is, and its price. A lookup is on the website or in the dashboard; an AI action is a draft or an adjust; a WhatsApp
// message is an alert or confirmation, a reply inside the 24 hours after a buyer writes, or a marketing message.
export const KINDS = {
  lookup: { website: "On the website", dashboard: "In the dashboard" },
  ai: { draft: "Drafts", adjust: "Adjustments" },
  whatsapp: { alert: "Alerts and confirmations", reply: "Replies to buyers", marketing: "Marketing messages" },
} as const satisfies Record<Service, Record<string, string>>;
export type Kind<S extends Service = Service> = keyof (typeof KINDS)[S] & string;
export const UNIT_PRICE_EUR: { [S in Service]: Record<Kind<S>, number> } = {
  lookup: { website: 0.3, dashboard: 0.3 },
  ai: { draft: 0.05, adjust: 0.05 },
  whatsapp: { alert: 0.05, reply: 0.02, marketing: 0.12 },
};
// The other way to pay for AI: a flat fee a month with a set number of actions, then per action over it.
export const AI_PLANS = ["perAction", "assistant"] as const;
export type AiPlan = (typeof AI_PLANS)[number];
export const AI_ASSISTANT = { monthlyEur: 19, actions: 300 } as const;

// The plan: the base site and each module, a month, before VAT. WhatsApp's and new cars' setups are one-off and not shown here.
export const BASE_EUR = 200;
export const MODULE_EUR: Record<ModuleId, number> = {
  dashboard: 49, tradeIn: 49, finance: 29, testDrives: 29, carFinder: 19, sales: 59, margins: 49, service: 49, reviews: 29, social: 99, newsletter: 59,
  commercial: 29, newCars: 99, analytics: 19, whatsapp: 49, ai: 0, lookupWebsite: 0, lookupDashboard: 0,
};
export const VAT_PCT = 23;
export const withVat = (eur: number) => round2(eur * (1 + VAT_PCT / 100));
export const round2 = (n: number) => Math.round(n * 100) / 100;

// One count a month per service, kind and place: a record per line of the bill, not one per use, so it never grows with traffic.
export type UsageCount = { id: string; month: string; service: Service; kind: string; count: number };
export const usageId = (month: string, service: Service, kind: string) => `${month}:${service}:${kind}`;

export type ServiceCost = { count: number; costEur: number; kinds: { kind: string; label: string; count: number; costEur: number }[] };
// What the month's usage costs. AI on the assistant plan: the first AI_ASSISTANT.actions are in the flat fee (charged with the plan).
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
};
export const BILLING_DEFAULT: BillingSettings = { caps: {}, ceilings: {}, alerts: [], alertAt80: true, aiPlan: "perAction" };

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
      if (b.alertAt80 && crossed(s, cap * 0.8)) out.push({ key: `${month}:${s}:80`, scope: s, text: `${label(s)} has reached 80% of its €${cap} monthly limit` });
      if (crossed(s, cap)) out.push({ key: `${month}:${s}:cap`, scope: s, text: `${label(s)} has reached its €${cap} monthly limit and has stopped until next month` });
    }
  }
  for (const a of b.alerts) if (crossed(a.scope, a.amountEur)) out.push({ key: `${month}:${a.scope}:${a.amountEur}`, scope: a.scope, text: `${label(a.scope)} has passed €${a.amountEur} this month` });
  return out;
}

// The month to date, a whole month at the same pace: an estimate, always shown as one.
export function monthEndEstimate(sofarEur: number, now: Date): number {
  const day = now.getUTCDate();
  const days = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0)).getUTCDate();
  return round2((sofarEur / day) * days);
}
// The plan's monthly price for these modules, the AI assistant's flat fee included when chosen.
export function planEur(modules: Iterable<ModuleId>, aiPlan: AiPlan): number {
  let n = BASE_EUR;
  for (const m of modules) n += MODULE_EUR[m];
  return n + (aiPlan === "assistant" ? AI_ASSISTANT.monthlyEur : 0);
}
