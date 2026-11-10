import "server-only";
import { ADDONS, PLANS, planOf } from "@/lib/plans";
import { DEALER_ADDRESS, SITE_NAME } from "@/lib/site";
import { defineCollection } from "./docs";
import { monthlyEur } from "./platform-calc";
import { DAY, rng } from "./seed-data";

// The superuser's records: the dealerships on the platform, their invoices, the audit log and the platform settings. All made up.
export type DealerStatus = "active" | "trial" | "paused";
export type Dealership = { id: string; name: string; town: string; plan: string; status: DealerStatus; addons: string[]; cars: number; leadsMonth: number; seats: number; owner: string; createdAt: number };

const TOWNS = ["Cork", "Galway", "Limerick", "Waterford", "Kilkenny", "Sligo", "Athlone", "Drogheda", "Tralee", "Navan"];
const NAMES = ["Harbour Motors", "Lakeside Cars", "Millbrook Autos", "Castle Motor Group", "Riverside Car Sales", "Greenfield Motors", "Eastgate Autos", "Ballyhoo Cars"];
const OWNERS = ["Declan Moran", "Fiona Hegarty", "Brian Daly", "Ailish Keane", "Peter Foley", "Mairead Sheehan", "Kieran Lynch", "Orla Nolan"];

function seedDealerships(): Dealership[] {
  const r = rng(101);
  const now = Date.now();
  const mk = (i: number, name: string, town: string, owner: string, plan: string, status: DealerStatus, addons: string[]): Dealership => {
    const p = planOf(plan);
    return { id: `d-${i}`, name, town, plan, status, addons, cars: Math.round(p.limits.cars * (0.4 + r.next() * 0.75)), leadsMonth: Math.round(p.limits.leads * (0.3 + r.next() * 0.7)), seats: r.int(1, p.limits.seats), owner, createdAt: now - r.int(20, 700) * DAY };
  };
  return [
    mk(0, SITE_NAME, DEALER_ADDRESS.town, "Aoife Brennan", "growth", "active", ["alerts", "newsletter", "social", "analytics"]),
    ...NAMES.map((n, i) => mk(i + 1, n, TOWNS[i], OWNERS[i], PLANS[i % 3].id, i === 6 ? "trial" : i === 7 ? "paused" : "active", ADDONS.filter((_, j) => (i + j) % 3 === 0).map((a) => a.id))),
  ];
}
export const dealershipsStore = defineCollection<Dealership>("platform-dealerships", seedDealerships);

export type Invoice = { id: string; dealershipId: string; dealershipName: string; month: string; amountEur: number; status: "paid" | "due" | "overdue" };
function seedInvoices(): Invoice[] {
  const now = new Date();
  const out: Invoice[] = [];
  for (const d of seedDealerships()) {
    const amount = monthlyEur({ plan: d.plan, addons: d.addons, status: "active" });
    if (d.status === "trial") continue;
    for (let back = 0; back < 3; back++) {
      const m = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - back, 1));
      const month = m.toISOString().slice(0, 7);
      const status: Invoice["status"] = back === 0 ? "due" : d.id === "d-8" && back === 1 ? "overdue" : "paid";
      out.push({ id: `inv-${d.id}-${month}`, dealershipId: d.id, dealershipName: d.name, month, amountEur: amount, status });
    }
  }
  return out;
}
export const invoicesStore = defineCollection<Invoice>("platform-invoices", seedInvoices);

export type AuditEntry = { id: string; at: number; actor: string; action: string; target: string };
function seedAudit(): AuditEntry[] {
  const now = Date.now();
  return [
    { id: "au-1", at: now - 2 * DAY, actor: "Platform admin", action: "Changed plan to Growth", target: SITE_NAME },
    { id: "au-2", at: now - 5 * DAY, actor: "Platform admin", action: "Started a trial", target: "Eastgate Autos" },
    { id: "au-3", at: now - 9 * DAY, actor: "Platform admin", action: "Paused the account", target: "Ballyhoo Cars" },
    { id: "au-4", at: now - 14 * DAY, actor: "Platform admin", action: "Marked an invoice paid", target: "Lakeside Cars" },
    { id: "au-5", at: now - 21 * DAY, actor: "Platform admin", action: "Turned on the Ads management add-on", target: "Castle Motor Group" },
  ];
}
export const auditStore = defineCollection<AuditEntry>("platform-audit", seedAudit);

// Every change a superuser makes leaves a line here, newest first on the Audit log page.
export const logAudit = (action: string, target: string) => auditStore.put({ id: `au-${Date.now()}`, at: Date.now(), actor: "Platform admin", action, target });

export type PlatformSettings = { id: "platform"; trialDays: number; defaultPlan: string; supportEmail: string; updatedAt: number };
export const PLATFORM_DEFAULT: PlatformSettings = { id: "platform", trialDays: 14, defaultPlan: "starter", supportEmail: "support@example.com", updatedAt: 0 };
export const platformSettingsStore = defineCollection<PlatformSettings>("platform-settings", () => [{ ...PLATFORM_DEFAULT, updatedAt: Date.now() }]);
export const getPlatformSettings = async () => (await platformSettingsStore.get("platform")) ?? PLATFORM_DEFAULT;

export const PLATFORM_COLLECTIONS = [dealershipsStore, invoicesStore, auditStore, platformSettingsStore];
