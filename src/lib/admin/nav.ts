import type { Permission } from "@/lib/permission-rules";
import type { ModuleId } from "@/lib/modules-rules";

// The dealer area's navigation, as data. `permission` hides an entry (and the page refuses) unless the dealer has it (src/lib/permissions.ts).
// `icon` names a line icon (AdminNav maps it), so this file stays plain data the tests can import. `group` is the menu block an item sits in:
// every item names its own, so a role that cannot see the first item of a group still sees the rest under the right heading.
export type NavIcon = "home" | "inbox" | "car" | "calendar" | "users" | "megaphone" | "chart" | "percent" | "star" | "cog" | "history" | "report" | "shield" | "wrench" | "truck" | "whatsapp" | "receipt" | "help";
// `ours`: only for a dealer whose stock is kept here (not on DoneDeal). `module`: only with that module (#173); most follow from the
// address (MODULES in src/lib/modules-rules.ts), this is for a page shared by modules (Marketing: social or the newsletter; Customers: sales or the newsletter).
export type NavItem = { href: string; label: string; icon: NavIcon; group?: string; permission?: Permission; ours?: true; module?: ModuleId | readonly ModuleId[] };

export const DEALER_NAV: NavItem[] = [
  { href: "/dashboard", label: "Overview", icon: "home" },
  // The places staff use all day stand alone at the top, never folded away.
  { href: "/dashboard/leads", label: "Leads", icon: "inbox" },
  { href: "/dashboard/test-drives", label: "Test drives", icon: "calendar" },
  { href: "/dashboard/stock", label: "Stock", icon: "car" },
  { href: "/dashboard/marketing", label: "Posts and emails", icon: "megaphone", module: ["social", "newsletter"] },
  { href: "/dashboard/customers", label: "Customers", icon: "users", group: "Customers", module: ["sales", "newsletter"] },
  { href: "/dashboard/whatsapp", label: "WhatsApp", icon: "whatsapp", group: "Customers" },
  { href: "/dashboard/orders", label: "Orders", icon: "truck", group: "Customers", ours: true },
  { href: "/dashboard/aftersales", label: "Aftersales", icon: "wrench", group: "Customers" },
  { href: "/dashboard/reviews", label: "Reviews", icon: "star", group: "Customers" },
  { href: "/dashboard/margins", label: "Margins", icon: "percent", group: "Results", permission: "margins" },
  { href: "/dashboard/reports", label: "Reports", icon: "report", group: "Results", permission: "reports" },
  { href: "/dashboard/monthly-report", label: "Monthly report", icon: "report", group: "Results" },
  { href: "/dashboard/analytics", label: "Analytics", icon: "chart", group: "Results" },
  { href: "/dashboard/settings", label: "Settings", icon: "cog", group: "Settings and help" },
  { href: "/dashboard/help", label: "Help", icon: "help", group: "Settings and help" },
  { href: "/dashboard/billing", label: "Billing", icon: "receipt", group: "Settings and help", permission: "billing" },
  { href: "/dashboard/activity", label: "Activity", icon: "history", group: "Settings and help", permission: "activity" },
  { href: "/dashboard/data-requests", label: "Data requests", icon: "shield", group: "Settings and help", permission: "data" },
];

// The sidebar's groups: the items with no group stand alone on top (Overview and the everyday places), then each group with its items, in the menu's order.
export type NavGroup = { name: string; items: NavItem[] };
export function navGroups(items: NavItem[]): { top: NavItem[]; groups: NavGroup[] } {
  const groups: NavGroup[] = [];
  for (const it of items) {
    if (!it.group) continue;
    let g = groups.find((x) => x.name === it.group);
    if (!g) groups.push((g = { name: it.group, items: [] }));
    g.items.push(it);
  }
  return { top: items.filter((i) => !i.group), groups };
}

// Which groups are open in the sidebar, kept in a cookie so the page is drawn that way from the server (no jump after it loads). Customers,
// the next most used after the places on top, is open until they close it.
export const NAV_COOKIE = "checkwork-demo-nav";
export const DEFAULT_OPEN = ["Customers"];
// The browser can send anything back: a value that does not decode is the default, never an error that takes the dashboard down.
export function parseOpenGroups(v: string | undefined): string[] {
  if (v === undefined) return DEFAULT_OPEN;
  try {
    return decodeURIComponent(v).split("|").filter(Boolean).slice(0, 10);
  } catch {
    return DEFAULT_OPEN;
  }
}
// The person's other two choices for the dashboard, kept the same way: the sidebar as a rail of icons, and the tables' compact rows.
export const RAIL_COOKIE = "checkwork-demo-rail"; // "1": the rail
export const DENSITY_COOKIE = "checkwork-demo-density"; // "compact": compact table rows
export const prefCookie = (name: string, value: string) => `${name}=${value}; path=/dashboard; max-age=31536000; samesite=lax`;
export const openGroupsCookie = (open: string[]) => prefCookie(NAV_COOKIE, encodeURIComponent(open.join("|")));
