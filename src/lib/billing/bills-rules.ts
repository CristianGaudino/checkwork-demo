import type { ModuleId } from "@/lib/modules-rules";
import { KINDS, SERVICES, SERVICE_LABELS, UNIT_PRICE_EUR, VAT_PCT, round2, type AiPlan, type Scope, type Service } from "./rules";

// The Billing page's pure rules: reading the limit and alert forms, the founding discount, and what a bill is made of. No server code,
// so the forms (browser) and the tests use them too.

// Money as the page writes it: whole euros bare, anything else with cents.
import { eur } from "./rules";
export { eur };

// Us, as every bill says it. A real site reads these from the billing program (#62).
export const OUR_DETAILS = { name: "Checkwork Ltd", vat: "IE 3456789 TH", address: "Dublin, Ireland", email: "support@checkwork.ie" } as const;

export type BillingDetails = { company: string; vatNumber: string; address: string; email: string };

// The founding dealer's discount: a share off the plan (not the usage) until a month some time ahead.
export const FOUNDING = { pct: 30, months: 20 } as const;
export function foundingEnd(now: Date): string {
  return new Intl.DateTimeFormat("en-IE", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + FOUNDING.months, 1)));
}
export const afterDiscount = (planEur: number) => round2(planEur * (1 - FOUNDING.pct / 100));
export const nextBillDate = (now: Date) => new Intl.DateTimeFormat("en-IE", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)));

// A euro limit or alert amount: blank is none, else 0 to 10,000 in whole euros or cents. Anything else is an error.
export const MAX_EUR = 10_000;
export function parseEuro(raw: string): { eur?: number; error?: string } {
  const s = raw.trim().replace(/^€/, "");
  if (!s) return {};
  if (!/^\d{1,5}([.,]\d{1,2})?$/.test(s)) return { error: "Use whole euros or cents, like 20 or 20.50" };
  const n = Number(s.replace(",", "."));
  return n > MAX_EUR ? { error: `At most ${eur(MAX_EUR)}` } : { eur: n };
}

// The limits form: a field per scope. A dealer's limit can be lower than ours, never higher.
export function parseLimits(get: (key: string) => string, ceilings: Partial<Record<Scope, number>>, scopes: Scope[]): { caps: Partial<Record<Scope, number>>; errors: Record<string, string> } {
  const caps: Partial<Record<Scope, number>> = {};
  const errors: Record<string, string> = {};
  for (const s of scopes) {
    const r = parseEuro(get(`cap-${s}`));
    const ceiling = ceilings[s];
    if (r.error) errors[`cap-${s}`] = r.error;
    else if (r.eur !== undefined && ceiling !== undefined && r.eur > ceiling) errors[`cap-${s}`] = `Our limit for your account is ${eur(ceiling)}`;
    else if (r.eur !== undefined) caps[s] = r.eur;
  }
  return { caps, errors };
}

// A new "tell me when" alert. A scope that is already on that amount is not added twice. `scopes` are the ones the dealer has.
export function parseAlert(scopeRaw: string, amountRaw: string, scopes: Scope[], existing: { scope: Scope; amountEur: number }[]): { alert?: { scope: Scope; amountEur: number }; error?: string } {
  const scope = scopes.find((s) => s === scopeRaw);
  if (!scope) return { error: "Choose what to watch" };
  const r = parseEuro(amountRaw);
  if (r.error) return { error: r.error };
  if (!r.eur) return { error: "Enter an amount" };
  if (existing.some((a) => a.scope === scope && a.amountEur === r.eur)) return { error: "You already have that alert" };
  return { alert: { scope, amountEur: r.eur } };
}

// What a bill is made of, as stored: the plan lines, the discount, the usage counts. The totals are worked out from them, never stored.
export type BillUsage = { service: Service; kind: string; count: number; unitEur: number };
export type Bill = {
  id: string; // the month, YYYY-MM
  issuedOn: string; // YYYY-MM-DD
  dueOn: string;
  status: "paid" | "due";
  base: number;
  modules: { label: string; eur: number }[];
  aiAssistantEur: number;
  discountPct: number;
  usage: BillUsage[];
};
export type BillLine = { label: string; detail?: string; eur: number };
export function itemise(b: Bill) {
  // `base` is 0 when a bundle's line (which has the base in it) is among the modules.
  const plan: BillLine[] = [...(b.base ? [{ label: "Website", eur: b.base }] : []), ...b.modules, ...(b.aiAssistantEur ? [{ label: "AI assistant", eur: b.aiAssistantEur }] : [])];
  const usage: BillLine[] = b.usage.filter((u) => u.count > 0).map((u) => ({ label: `${SERVICE_LABELS[u.service]}: ${(KINDS[u.service] as Record<string, string>)[u.kind]}`, detail: `${u.count} x ${eur(u.unitEur)}`, eur: round2(u.count * u.unitEur) }));
  const planEur = round2(plan.reduce((n, l) => n + l.eur, 0));
  const discountEur = round2((planEur * b.discountPct) / 100);
  const usageEur = round2(usage.reduce((n, l) => n + l.eur, 0));
  const net = round2(planEur - discountEur + usageEur);
  const vatEur = round2((net * VAT_PCT) / 100);
  return { plan, usage, planEur, discountEur, usageEur, net, vatEur, total: round2(net + vatEur) };
}

// The usage lines of a bill from a month's counts at today's prices (the seed's history and the estimate use it).
export function usageLines(counts: { service: Service; kind: string; count: number }[]): BillUsage[] {
  return SERVICES.flatMap((service) => Object.keys(KINDS[service]).map((kind) => ({ service, kind, count: counts.find((c) => c.service === service && c.kind === kind)?.count ?? 0, unitEur: (UNIT_PRICE_EUR[service] as Record<string, number>)[kind] })));
}

export const AI_PLAN_LABELS: Record<AiPlan, string> = { perAction: "Pay per action", assistant: "AI assistant" };

// The paid services a dealer has, from their modules: the lookup in either place, AI writing, WhatsApp.
// What can have a limit, and is listed on the Billing page: each service the dealer has, and one used this month before it was switched
// off (its spend counts in the total). The page and the save action both use this, so a field shown is a field saved.
export const billedServices = (modules: { has(m: ModuleId): boolean }, used: Record<Service, { count: number }>): Service[] => SERVICES.filter((s) => servicesOf(modules).includes(s) || used[s].count > 0);
export function servicesOf(modules: { has(m: ModuleId): boolean }): Service[] {
  return SERVICES.filter((s) => (s === "lookup" ? modules.has("lookupWebsite") || modules.has("lookupDashboard") : modules.has(s)));
}

export const fmtMonth = (id: string) => new Intl.DateTimeFormat("en-IE", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${id}-01T12:00:00Z`));

export const scopeName = (s: Scope) => (s === "total" ? "All usage" : SERVICE_LABELS[s]);
