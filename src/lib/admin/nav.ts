// The dealer area's navigation, as data. `permission` hides an entry (and the page refuses) unless the dealer has it (src/lib/permissions.ts).
export type NavItem = { href: string; label: string; permission?: "margins" };

export const DEALER_NAV: NavItem[] = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/leads", label: "Leads" },
  { href: "/dashboard/stock", label: "Stock" },
  { href: "/dashboard/test-drives", label: "Test drives" },
  { href: "/dashboard/customers", label: "Customers and alerts" },
  { href: "/dashboard/marketing", label: "Marketing" },
  { href: "/dashboard/analytics", label: "Analytics" },
  { href: "/dashboard/margins", label: "Margins", permission: "margins" },
  { href: "/dashboard/reviews", label: "Reviews" },
  { href: "/dashboard/settings", label: "Settings" },
];
