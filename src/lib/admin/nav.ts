import type { Permission } from "@/lib/permission-rules";

// The dealer area's navigation, as data. `permission` hides an entry (and the page refuses) unless the dealer has it (src/lib/permissions.ts).
// `icon` names a line icon (AdminNav maps it), so this file stays plain data the tests can import. `group` is the menu block an item sits in:
// every item names its own, so a role that cannot see the first item of a group still sees the rest under the right heading.
export type NavIcon = "home" | "inbox" | "car" | "calendar" | "users" | "megaphone" | "chart" | "percent" | "star" | "cog" | "history" | "report" | "shield" | "wrench" | "truck";
// `ours`: only for a dealer whose stock is kept here (not on DoneDeal).
export type NavItem = { href: string; label: string; icon: NavIcon; group?: string; permission?: Permission; ours?: true };

export const DEALER_NAV: NavItem[] = [
  { href: "/dashboard", label: "Overview", icon: "home" },
  { href: "/dashboard/leads", label: "Leads", icon: "inbox", group: "Sales" },
  { href: "/dashboard/test-drives", label: "Test drives", icon: "calendar", group: "Sales" },
  { href: "/dashboard/stock", label: "Stock", icon: "car", group: "Sales" },
  { href: "/dashboard/orders", label: "Orders", icon: "truck", group: "Sales", ours: true },
  { href: "/dashboard/margins", label: "Margins", icon: "percent", group: "Sales", permission: "margins" },
  { href: "/dashboard/customers", label: "Customers", icon: "users", group: "Customers" },
  { href: "/dashboard/aftersales", label: "Aftersales", icon: "wrench", group: "Customers" },
  { href: "/dashboard/reviews", label: "Reviews", icon: "star", group: "Customers" },
  { href: "/dashboard/marketing", label: "Marketing", icon: "megaphone", group: "Growth" },
  { href: "/dashboard/analytics", label: "Analytics", icon: "chart", group: "Growth" },
  { href: "/dashboard/reports", label: "Reports", icon: "report", group: "Growth", permission: "reports" },
  { href: "/dashboard/activity", label: "Activity", icon: "history", group: "Dealership", permission: "activity" },
  { href: "/dashboard/data-requests", label: "Data requests", icon: "shield", group: "Dealership", permission: "data" },
  { href: "/dashboard/settings", label: "Settings", icon: "cog", group: "Dealership" },
];

// The sidebar's groups: the items with no group stand alone on top (Overview), then each group with its items, in the menu's order.
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

// Which groups are open in the sidebar, kept in a cookie so the page is drawn that way from the server (no jump after it loads). Sales, where
// staff spend the day, is open until they close it.
export const NAV_COOKIE = "checkwork-demo-nav";
export const DEFAULT_OPEN = ["Sales"];
// The browser can send anything back: a value that does not decode is the default, never an error that takes the dashboard down.
export function parseOpenGroups(v: string | undefined): string[] {
  if (v === undefined) return DEFAULT_OPEN;
  try {
    return decodeURIComponent(v).split("|").filter(Boolean).slice(0, 10);
  } catch {
    return DEFAULT_OPEN;
  }
}
export const openGroupsCookie = (open: string[]) => `${NAV_COOKIE}=${encodeURIComponent(open.join("|"))}; path=/dashboard; max-age=31536000; samesite=lax`;
