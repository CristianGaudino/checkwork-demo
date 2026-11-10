// The two areas' navigation, as data. Each area is one shell with its own list.
export type NavItem = { href: string; label: string };

export const DEALER_NAV: NavItem[] = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/leads", label: "Leads" },
  { href: "/admin/stock", label: "Stock" },
  { href: "/admin/test-drives", label: "Test drives" },
  { href: "/admin/customers", label: "Customers and alerts" },
  { href: "/admin/marketing", label: "Marketing" },
  { href: "/admin/analytics", label: "Analytics" },
  { href: "/admin/reviews", label: "Reviews" },
  { href: "/admin/settings", label: "Settings" },
];

export const PLATFORM_NAV: NavItem[] = [
  { href: "/platform", label: "Dealerships" },
  { href: "/platform/usage", label: "Usage and billing" },
  { href: "/platform/plans", label: "Plans and add-ons" },
  { href: "/platform/settings", label: "Platform settings" },
  { href: "/platform/audit", label: "Audit log" },
];
