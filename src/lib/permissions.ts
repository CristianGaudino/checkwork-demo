import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { getSettings } from "@/lib/admin/collections";
import { DEMO_BAR_ENABLED, demoCookiesCount } from "@/lib/demo";
import { hasModule } from "@/lib/modules";
import { staffIdentity } from "@/lib/staff";
import { ROLE_COOKIE, emailHas, parseRole, roleCan, type Permission, type Role } from "./permission-rules";

// Who is making this request, as the team knows them. Checked on the server, in every page and action that shows or changes something
// sensitive, so a hidden link is never the only protection.
// - The demo (demoCookiesCount: the demo deploy, bar or not, or the bar is on in next dev or with the admin open for the tests): the bar's
//   role cookie says (the owner when there is none), and the person is the first team member with that role. The demo has one login, so
//   this is how a viewer tries each role.
// - Any other site (APP_ENV=production, no APP_ENV at all, or the demo bar off anywhere but the demo deploy): the email in the verified
//   Access token. An address in ADMIN_OWNER_EMAILS is an owner; otherwise the team member with that email has their role. Anyone else Access let in works the everyday
//   dashboard with no permissions. A cookie never grants anything, even if the demo bar was left on by mistake.
export type Member = { name: string; email: string; role: Role | null };

export const currentMember = cache(async (): Promise<Member> => {
  const { team } = await getSettings();
  if (demoCookiesCount()) {
    // With no bar to change it, a role cookie left from when the live demo had one is ignored: the owner, as with no cookie.
    const role = parseRole(DEMO_BAR_ENABLED ? (await cookies()).get(ROLE_COOKIE)?.value : undefined);
    const m = team.find((t) => t.role === role);
    return { name: m?.name ?? role, email: m?.email ?? "", role };
  }
  // The email Access signed for, verified here (src/lib/staff.ts), never a header a request could carry.
  const who = await staffIdentity();
  const email = who.ok ? who.email : "";
  const m = email ? team.find((t) => t.email.toLowerCase() === email) : undefined;
  const role = emailHas(process.env.ADMIN_OWNER_EMAILS, email) ? "Owner" : (m?.role ?? null);
  return { name: m?.name ?? email, email, role };
});

// Margins are also a module (#173): without it nobody has the permission, so every cost, margin and profit figure goes in one place.
export async function can(permission: Permission): Promise<boolean> {
  if (permission === "margins" && !(await hasModule("margins"))) return false;
  return roleCan((await currentMember()).role, permission);
}
