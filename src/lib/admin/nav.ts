// The dealer area's navigation, as data. `permission` hides an entry (and the page refuses) unless the dealer has it (src/lib/permissions.ts).
export type NavItem = { href: string; label: string; permission?: "margins" };

export const DEALER_NAV: NavItem[] = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/leads", label: "Leads" },
  { href: "/admin/stock", label: "Stock" },
  { href: "/admin/test-drives", label: "Test drives" },
  { href: "/admin/customers", label: "Customers and alerts" },
  { href: "/admin/marketing", label: "Marketing" },
  { href: "/admin/analytics", label: "Analytics" },
  { href: "/admin/margins", label: "Margins", permission: "margins" },
  { href: "/admin/reviews", label: "Reviews" },
  { href: "/admin/settings", label: "Settings" },
];
