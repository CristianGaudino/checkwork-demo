import type { ModuleId } from "@/lib/modules-rules";
import { KINDS, SERVICES, SERVICE_LABELS, UNIT_PRICE_EUR, VAT_PCT, round2, usageCosts, type Allowance, type Scope, type Service } from "./rules";

// The Billing page's pure rules: reading the limit and alert forms, and what a bill is made of. No server code,
// so the forms (browser) and the tests use them too.

// Money as the page writes it: whole euros bare, anything else with cents.
import { eur } from "./rules";
export { eur };

// Us, as every bill says it. A real site reads these from the billing program (#62).
export const OUR_DETAILS = { name: "Checkwork Ltd", vat: "IE 3456789 TH", address: "Dublin, Ireland", email: "support@checkwork.ie" } as const;

export type BillingDetails = { company: string; vatNumber: string; address: string; email: string };

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

// What a bill is made of, as stored: the plan lines and the usage counts. The totals are worked out from them, never stored.
export type BillUsage = { service: Service; kind: string; count: number; included?: number; unitEur: number }; // `included`: in the plan's allowance
export type Bill = {
  id: string; // the month, YYYY-MM
  issuedOn: string; // YYYY-MM-DD
  dueOn: string;
  status: "paid" | "due";
  modules: { label: string; eur: number }[]; // the plan's lines: the tier, its extra branches, each add-on (planLines)
  usage: BillUsage[];
};
export type BillLine = { label: string; detail?: string; eur: number };
export function itemise(b: Bill) {
  const plan: BillLine[] = b.modules;
  const billed = (u: BillUsage) => u.count - (u.included ?? 0);
  const usage: BillLine[] = b.usage.filter((u) => billed(u) > 0).map((u) => ({ label: `${SERVICE_LABELS[u.service]}: ${(KINDS[u.service] as Record<string, string>)[u.kind] ?? u.kind}`, detail: `${billed(u)} x ${eur(u.unitEur)}`, eur: round2(billed(u) * u.unitEur) }));
  const planEur = round2(plan.reduce((n, l) => n + l.eur, 0));
  const usageEur = round2(usage.reduce((n, l) => n + l.eur, 0));
  const net = round2(planEur + usageEur);
  const vatEur = round2((net * VAT_PCT) / 100);
  return { plan, usage, planEur, usageEur, net, vatEur, total: round2(net + vatEur) };
}

// The usage lines of a bill from a month's counts at today's prices, with what the plan's allowance covers (the seed's history uses it).
export function usageLines(counts: { service: Service; kind: string; count: number }[], allowance: Allowance = {}): BillUsage[] {
  const c = usageCosts(counts, allowance);
  return SERVICES.flatMap((service) => c[service].kinds.map(({ kind, count, included }) => ({ service, kind, count, included, unitEur: (UNIT_PRICE_EUR[service] as Record<string, number>)[kind] })));
}

// The paid services a dealer has, from their modules: the lookup in either place, AI writing, WhatsApp.
// What can have a limit, and is listed on the Billing page: each service the dealer has, and one used this month before it was switched
// off (its spend counts in the total). The page and the save action both use this, so a field shown is a field saved.
export const billedServices = (modules: { has(m: ModuleId): boolean }, used: Record<Service, { count: number }>): Service[] => SERVICES.filter((s) => servicesOf(modules).includes(s) || used[s].count > 0);
export function servicesOf(modules: { has(m: ModuleId): boolean }): Service[] {
  return SERVICES.filter((s) => (s === "lookup" ? modules.has("lookupWebsite") || modules.has("lookupDashboard") : modules.has(s)));
}

export const fmtMonth = (id: string) => new Intl.DateTimeFormat("en-IE", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${id}-01T12:00:00Z`));

export const scopeName = (s: Scope) => (s === "total" ? "All usage" : SERVICE_LABELS[s]);
