// What a dealer's staff may see beyond the everyday admin. No imports, so the demo bar (client) and the server share it.
// A permission unlocks extra screens and elements (a Margins screen, a cost price on the car form); without it they are absent and refused.
export const PERMISSIONS = ["margins"] as const;
export type Permission = (typeof PERMISSIONS)[number];

// The demo bar's switch is a cookie, so the server can read it. It only counts while the demo bar is on (src/lib/permissions.ts).
export const PERMS_COOKIE = "checkwork-demo-perms";

export const parsePerms = (value: string | undefined): Permission[] => PERMISSIONS.filter((p) => (value ?? "").split(",").includes(p));

// A Worker variable such as ADMIN_MARGINS_EMAILS holds the signed-in addresses that have a permission, comma separated.
export const emailHas = (list: string | undefined, email: string) => email !== "" && (list ?? "").split(",").some((e) => e.trim().toLowerCase() === email.toLowerCase());
