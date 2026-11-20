// What a dealer has paid for beyond the base site (#173). Plain data, so the browser (menus), the server (pages, actions) and the proxy
// (public pages) read the same list. The base site is always on: the stock read from the feed, car pages, the basic enquiry and contact
// forms, saved cars, compare and the standard pages.
// `pages`: the public pages (and everything under them) that answer only with the module on; `dashboard`: the same for dashboard pages.
// `needs`: what must also be on. Stock kept in the dashboard is not a switch here: it follows where the stock comes from (stock-source).
export const MODULES = [
  { id: "dashboard", label: "Dealer dashboard", blurb: "Leads inbox, follow-ups, staff logins and roles, activity, data requests.", pages: [], dashboard: ["/dashboard"] },
  { id: "tradeIn", label: "Trade-in and sell your car", blurb: "Valuation forms with photos and the registration lookup.", pages: ["/trade-in", "/sell-your-car"], dashboard: [] },
  { id: "finance", label: "Finance", blurb: "Payment estimator with your lender's wording, and finance applications.", pages: ["/finance"], dashboard: [] },
  { id: "testDrives", label: "Test drives", blurb: "Slot booking on the site and a calendar in the dashboard.", pages: ["/test-drive"], dashboard: ["/dashboard/test-drives"], needs: ["dashboard"] },
  { id: "carFinder", label: "Car finder", blurb: "Requests for cars not in stock.", pages: ["/find-a-car"], dashboard: [] },
  { id: "sales", label: "Sales and customers", blurb: "Deposits and reservations, sale records and a customer list.", pages: [], dashboard: [], needs: ["dashboard"] }, // /dashboard/customers is shared with the newsletter: the page checks both
  { id: "margins", label: "Margins and reports", blurb: "Cost prices, margins for the staff allowed, sales reports, targets.", pages: [], dashboard: ["/dashboard/margins", "/dashboard/reports"], needs: ["sales"] },
  { id: "service", label: "Service and aftersales", blurb: "Service booking, warranty claims and their progress.", pages: ["/service"], dashboard: ["/dashboard/aftersales"], needs: ["dashboard"] },
  { id: "reviews", label: "Reviews", blurb: "Google reviews on the site, and replies from the dashboard.", pages: ["/reviews"], dashboard: ["/dashboard/reviews"] }, // shown without the dashboard (Showroom); replies need it (pathAllowed)
  { id: "social", label: "Social and ads", blurb: "Posts, stories, reels and ads from the dashboard.", pages: [], dashboard: [], needs: ["dashboard"] },
  { id: "newsletter", label: "Newsletter and alerts", blurb: "Newsletters, price-drop and new-stock alerts.", pages: [], dashboard: [], needs: ["dashboard"] },
  { id: "commercial", label: "Commercial vehicles", blurb: "A commercial section with ex. VAT pricing.", pages: ["/commercial"], dashboard: [] },
  { id: "newCars", label: "New cars and factory orders", blurb: "New car pages by brand and ordering of factory cars.", pages: ["/new-cars"], dashboard: ["/dashboard/orders"], needs: ["dashboard"] },
  { id: "analytics", label: "Site analytics", blurb: "Visitor numbers and where they came from.", pages: [], dashboard: ["/dashboard/analytics"], needs: ["dashboard"] },
  { id: "whatsapp", label: "WhatsApp", blurb: "Leads to your phone, and replies from WhatsApp that the site sends on.", pages: [], dashboard: ["/dashboard/whatsapp"], needs: ["dashboard"] },
  { id: "ai", label: "AI writing", blurb: "Drafts of posts, descriptions and replies, with buttons to adjust them.", pages: [], dashboard: [], needs: ["dashboard"] },
  // The registration lookup (#180), in each place on its own: buyers filling in their car, or only staff adding stock and checking leads.
  { id: "lookupWebsite", label: "Registration lookup on the website", blurb: "Buyers fill in their car from the registration.", pages: [], dashboard: [], needs: ["tradeIn"] },
  { id: "lookupDashboard", label: "Registration lookup in the dashboard", blurb: "Staff fill in a car from its registration.", pages: [], dashboard: [], needs: ["dashboard"] },
] as const satisfies readonly { id: string; label: string; blurb: string; pages: readonly string[]; dashboard: readonly string[]; needs?: readonly string[] }[];

export type ModuleId = (typeof MODULES)[number]["id"];
export const MODULE_IDS = MODULES.map((m) => m.id) as ModuleId[];
const isModule = (v: string): v is ModuleId => (MODULE_IDS as string[]).includes(v);
const needsOf = (id: ModuleId): readonly ModuleId[] => (MODULES.find((m) => m.id === id) as { needs?: readonly ModuleId[] }).needs ?? [];

// The demo bar's choice, a cookie; a real site's is the build setting NEXT_PUBLIC_SITE_MODULES. Both are a comma list of ids, "all" or
// nothing. Unset means all, so a site built before modules existed keeps everything it had. A module without what it needs is off.
export const MODULES_COOKIE = "checkwork-demo-modules";
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
// A car's own page and listings: a new car only with New cars, a van only with Commercial vehicles, a used car always.
export const conditionShown = (on: Set<ModuleId>, condition?: string) => (condition === "new" ? on.has("newCars") : condition === "commercial" ? on.has("commercial") : true);

// Turning one on brings what it needs; turning one off takes what needs it. The demo bar's switches use these, so a choice is never half on.
export function withModule(on: Set<ModuleId>, id: ModuleId): Set<ModuleId> {
  const next = new Set(on).add(id);
  for (const n of needsOf(id)) for (const m of withModule(next, n)) next.add(m);
  return next;
}
export function withoutModule(on: Set<ModuleId>, id: ModuleId): Set<ModuleId> {
  const next = new Set(on);
  next.delete(id);
  return parseModules(modulesValue(next));
}

// The module a path belongs to, or none (base). The longest matching prefix wins, so /dashboard/test-drives is Test drives, not the dashboard.
const within = (path: string, prefix: string) => path === prefix || path.startsWith(prefix + "/");
export function moduleForPath(path: string): ModuleId | undefined {
  let best: { id: ModuleId; len: number } | undefined;
  for (const m of MODULES) for (const p of [...m.pages, ...m.dashboard]) if (within(path, p) && (!best || p.length > best.len)) best = { id: m.id, len: p.length };
  return best?.id;
}
// Whether a path answers with these modules on: every module along the path must be on (a dashboard page needs the dashboard too).
export function pathAllowed(path: string, on: Set<ModuleId>): boolean {
  const id = moduleForPath(path);
  if (!id) return true;
  return on.has(id) && (!path.startsWith("/dashboard") || on.has("dashboard"));
}
