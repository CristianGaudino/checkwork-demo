import "server-only";
import { cookies, headers } from "next/headers";
import { DEMO_BAR_ENABLED } from "@/lib/demo";
import { PERMS_COOKIE, emailHas, parsePerms, type Permission } from "./permission-rules";

// Does the person making this request have this permission? Checked on the server, in every page and action that shows or changes
// something sensitive, so a hidden link is never the only protection.
// - A site with the demo bar (the demo): the bar's cookie says. The demo has one login, so this is how a viewer tries both.
// - A real site (demo bar off): the Access email the proxy verified (x-admin-email) must be in the permission's variable, for example
//   ADMIN_MARGINS_EMAILS="owner@dealer.ie,accounts@dealer.ie". Nobody is granted anything by default.
export async function can(permission: Permission): Promise<boolean> {
  if (DEMO_BAR_ENABLED) return parsePerms((await cookies()).get(PERMS_COOKIE)?.value).includes(permission);
  const email = (await headers()).get("x-admin-email") ?? "";
  return emailHas(process.env[`ADMIN_${permission.toUpperCase()}_EMAILS`], email);
}
