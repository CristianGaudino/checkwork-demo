"use server";

import { lookupReg, type RegLookup } from "@/lib/reg-lookup";
import { recordUsage, usageAllowed } from "@/lib/billing/usage";
import { hasModule } from "@/lib/modules";
import { parseIrishReg } from "@/lib/reg";
import { requireStaff } from "@/lib/staff";

// The registration lookup for staff (Add a car, a lead), with no per-visitor limits: the whole dealership shares one address. Only the
// dashboard's pages import it, and Next forwards an action to the page that owns it, so it is behind Cloudflare Access like the rest of
// the dashboard. The site's daily cap still counts it.
export async function lookupRegStaffAction(reg: unknown): Promise<RegLookup | null> {
  await requireStaff(); // a server action can be posted to any page: only staff Access let in (src/lib/staff.ts)
  if (typeof reg !== "string" || reg.length > 16) return null;
  // Off in the dashboard for this dealer (#180), or past their monthly limit (#181): the plate's own facts, and staff type the rest.
  if (!(await hasModule("lookupDashboard"))) return parseIrishReg(reg);
  return lookupReg(reg, null, undefined, { allowed: () => usageAllowed("lookup"), paid: () => recordUsage("lookup", "dashboard") });
}
