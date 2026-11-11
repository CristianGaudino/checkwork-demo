import "server-only";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { getSettings } from "@/lib/admin/collections";
import { demoCookiesCount } from "@/lib/demo";
import { ROLE_COOKIE, emailHas, parseRole, roleCan, type Permission, type Role } from "./permission-rules";

// Who is making this request, as the team knows them. Checked on the server, in every page and action that shows or changes something
// sensitive, so a hidden link is never the only protection.
// - The demo (demoCookiesCount: the demo bar is on, and this is the demo deploy, next dev, or the admin is open for the tests): the bar's
//   role cookie says, and the person is the first team member with that role. The demo has one login, so this is how a viewer tries each role.
// - Any other site (APP_ENV=production, no APP_ENV at all, or the demo bar off): the Access email the proxy verified (x-admin-email). An address in
//   ADMIN_OWNER_EMAILS is an owner; otherwise the team member with that email has their role. Anyone else Access let in works the everyday
//   dashboard with no permissions. A cookie never grants anything, even if the demo bar was left on by mistake.
export type Member = { name: string; email: string; role: Role | null };

export const currentMember = cache(async (): Promise<Member> => {
  const { team } = await getSettings();
  if (demoCookiesCount()) {
    const role = parseRole((await cookies()).get(ROLE_COOKIE)?.value);
    const m = team.find((t) => t.role === role);
    return { name: m?.name ?? role, email: m?.email ?? "", role };
  }
  const email = ((await headers()).get("x-admin-email") ?? "").toLowerCase();
  const m = email ? team.find((t) => t.email.toLowerCase() === email) : undefined;
  const role = emailHas(process.env.ADMIN_OWNER_EMAILS, email) ? "Owner" : (m?.role ?? null);
  return { name: m?.name ?? email, email, role };
});

export async function can(permission: Permission): Promise<boolean> {
  return roleCan((await currentMember()).role, permission);
}
