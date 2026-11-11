import type { Permission } from "@/lib/permission-rules";

// The dealer area's navigation, as data. `permission` hides an entry (and the page refuses) unless the dealer has it (src/lib/permissions.ts).
// `icon` names a line icon (AdminNav maps it), so this file stays plain data the tests can import. `group` starts a new block in the menu.
export type NavIcon = "home" | "inbox" | "car" | "calendar" | "users" | "megaphone" | "chart" | "percent" | "star" | "cog" | "history";
export type NavItem = { href: string; label: string; icon: NavIcon; group?: string; permission?: Permission };

export const DEALER_NAV: NavItem[] = [
  { href: "/dashboard", label: "Overview", icon: "home" },
  { href: "/dashboard/leads", label: "Leads", icon: "inbox", group: "Sales" },
  { href: "/dashboard/test-drives", label: "Test drives", icon: "calendar" },
  { href: "/dashboard/stock", label: "Stock", icon: "car" },
  { href: "/dashboard/margins", label: "Margins", icon: "percent", permission: "margins" },
  { href: "/dashboard/customers", label: "Customers", icon: "users", group: "Customers" },
  { href: "/dashboard/reviews", label: "Reviews", icon: "star" },
  { href: "/dashboard/marketing", label: "Marketing", icon: "megaphone", group: "Growth" },
  { href: "/dashboard/analytics", label: "Analytics", icon: "chart" },
  { href: "/dashboard/activity", label: "Activity", icon: "history", group: "Dealership", permission: "activity" },
  { href: "/dashboard/settings", label: "Settings", icon: "cog" },
];
