// What each member of a dealer's team may see and do beyond the everyday dashboard. No imports, so the demo bar (client) and the server
// share it. A permission unlocks extra screens and elements (a Margins screen, a cost price on the car form); without it they are absent
// and refused on the server.
export const PERMISSIONS = ["margins", "team", "settings", "activity", "reports", "data"] as const; // data: a person's data, and the lead and customer exports
export type Permission = (typeof PERMISSIONS)[number];

// A role is a set of permissions: owners and managers see and change everything (the team, the business settings, the activity history),
// finance sees the figures, sales works the everyday dashboard. The one thing a manager cannot do is change an owner
// (src/app/dashboard/settings/actions.ts).
export const ROLES = ["Owner", "Manager", "Sales", "Finance"] as const;
export type Role = (typeof ROLES)[number];
export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = { Owner: PERMISSIONS, Manager: PERMISSIONS, Finance: ["margins", "reports"], Sales: ["reports"] }; // reports: the full one with margins, else their own (src/app/dashboard/reports)
export const roleCan = (role: Role | null, p: Permission) => (role ? ROLE_PERMISSIONS[role].includes(p) : false);

// The demo has one login, so the demo bar picks the role (a cookie the server reads; it only counts on the demo, src/lib/permissions.ts).
// The owner by default, so the demo shows every feature.
export const ROLE_COOKIE = "checkwork-demo-role";
export const parseRole = (v: string | undefined): Role => ((ROLES as readonly string[]).includes(v ?? "") ? (v as Role) : "Owner");

// ADMIN_OWNER_EMAILS: the comma separated addresses that are always owners on a real site, so a new dealer (no team yet) can set one up.
export const emailHas = (list: string | undefined, email: string) => email !== "" && (list ?? "").split(",").some((e) => e.trim().toLowerCase() === email.toLowerCase());
