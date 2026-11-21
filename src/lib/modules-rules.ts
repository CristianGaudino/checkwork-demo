// The archived dashboard's modules and plans (#173): its Billing page, plan prices and checks read this list. The public site has no
// modules: every page shows (owner, 2026-11-22).
// `dashboard`: the dashboard pages (and everything under them) a module holds. `needs`: what must also be on.
export const MODULES = [
  { id: "dashboard", label: "Dealer dashboard", blurb: "Leads inbox, follow-ups, staff logins and roles, activity, data requests.", dashboard: ["/dashboard"] },
  { id: "tradeIn", label: "Trade-in and sell your car", blurb: "Valuation forms with photos and the registration lookup.", dashboard: [] },
  { id: "finance", label: "Finance", blurb: "Payment estimator with your lender's wording, and finance applications.", dashboard: [] },
  { id: "testDrives", label: "Test drives", blurb: "Slot booking on the site and a calendar in the dashboard.", dashboard: ["/dashboard/test-drives"], needs: ["dashboard"] },
  { id: "carFinder", label: "Car finder", blurb: "Requests for cars not in stock.", dashboard: [] },
  { id: "sales", label: "Sales and customers", blurb: "Deposits and reservations, sale records and a customer list.", dashboard: [], needs: ["dashboard"] }, // /dashboard/customers is shared with the newsletter: the page checks both
  { id: "margins", label: "Margins and reports", blurb: "Cost prices, margins for the staff allowed, sales reports, targets.", dashboard: ["/dashboard/margins", "/dashboard/reports"], needs: ["sales"] },
  { id: "service", label: "Service and aftersales", blurb: "Service booking, warranty claims and their progress.", dashboard: ["/dashboard/aftersales"], needs: ["dashboard"] },
  // No needs (#224): a Showroom site shows its reviews without the dashboard; /dashboard/reviews (replies) also needs the dashboard, as every dashboard page.
  { id: "reviews", label: "Reviews", blurb: "Google reviews on the site; replies from the dashboard when you have it.", dashboard: ["/dashboard/reviews"] },
  { id: "social", label: "Social and ads", blurb: "Posts, stories, reels and ads from the dashboard.", dashboard: ["/dashboard/marketing/new"], needs: ["dashboard"] },
  { id: "newsletter", label: "Newsletter and alerts", blurb: "Newsletters, price-drop and new-stock alerts.", dashboard: [], needs: ["dashboard"] },
  { id: "commercial", label: "Commercial vehicles", blurb: "A commercial section with ex. VAT pricing.", dashboard: [] },
  { id: "newCars", label: "New cars and factory orders", blurb: "New car pages by brand and ordering of factory cars.", dashboard: ["/dashboard/orders"], needs: ["dashboard"] },
  { id: "analytics", label: "Site analytics", blurb: "Visitor numbers and where they came from.", dashboard: ["/dashboard/analytics"], needs: ["dashboard"] },
  { id: "whatsapp", label: "WhatsApp", blurb: "Leads to your phone, and replies from WhatsApp that the site sends on.", dashboard: ["/dashboard/whatsapp"], needs: ["dashboard"] },
  { id: "ai", label: "AI writing", blurb: "Drafts of posts, descriptions and replies, with buttons to adjust them.", dashboard: [], needs: ["dashboard"] },
  // The registration lookup (#180), in each place on its own: buyers filling in their car, or only staff adding stock and checking leads.
  { id: "lookupWebsite", label: "Registration lookup on the website", blurb: "Buyers fill in their car from the registration.", dashboard: [], needs: ["tradeIn"] },
  { id: "lookupDashboard", label: "Registration lookup in the dashboard", blurb: "Staff fill in a car from its registration.", dashboard: [], needs: ["dashboard"] },
] as const satisfies readonly { id: string; label: string; blurb: string; dashboard: readonly string[]; needs?: readonly string[] }[];

export type ModuleId = (typeof MODULES)[number]["id"];
export const MODULE_IDS = MODULES.map((m) => m.id) as ModuleId[];
const isModule = (v: string): v is ModuleId => (MODULE_IDS as string[]).includes(v);
const needsOf = (id: ModuleId): readonly ModuleId[] => (MODULES.find((m) => m.id === id) as { needs?: readonly ModuleId[] }).needs ?? [];

// A comma list of ids, "all" or nothing; unset means all. A module without what it needs is off.
export function parseModules(v: string | undefined): Set<ModuleId> {
  const raw = v === undefined || v.trim() === "all" ? MODULE_IDS : v.split(",").map((s) => s.trim()).filter(isModule);
  const on = new Set<ModuleId>(raw);
  // Drop anything whose needs are off, until nothing changes (margins needs sales needs dashboard).
  for (let changed = true; changed; ) {
    changed = false;
    for (const id of on) {
      if (!needsOf(id).some((n) => !on.has(n))) continue;
      on.delete(id);
      changed = true;
    }
  }
  return on;
}
export const modulesValue = (on: Iterable<ModuleId>) => [...on].join(",");
// Turning one on brings what it needs (the Billing page's prices).
export function withModule(on: Set<ModuleId>, id: ModuleId): Set<ModuleId> {
  const next = new Set(on).add(id);
  for (const n of needsOf(id)) for (const m of withModule(next, n)) next.add(m);
  return next;
}

// The module a path belongs to, or none (base). The longest matching prefix wins, so /dashboard/test-drives is Test drives, not the dashboard.
const within = (path: string, prefix: string) => path === prefix || path.startsWith(prefix + "/");
export function moduleForPath(path: string): ModuleId | undefined {
  let best: { id: ModuleId; len: number } | undefined;
  for (const m of MODULES) for (const p of m.dashboard) if (within(path, p) && (!best || p.length > best.len)) best = { id: m.id, len: p.length };
  return best?.id;
}
// Whether a dashboard path answers with these modules on: its module and the dashboard.
export function pathAllowed(path: string, on: Set<ModuleId>): boolean {
  const id = moduleForPath(path);
  if (!id) return true;
  return on.has(id) && (!path.startsWith("/dashboard") || on.has("dashboard"));
}
