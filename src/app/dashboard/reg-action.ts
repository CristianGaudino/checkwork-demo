"use server";

import { lookupReg, type RegLookup } from "@/lib/reg-lookup";

// The registration lookup for staff (Add a car, a lead), with no per-visitor limits: the whole dealership shares one address. Only the
// dashboard's pages import it, and Next forwards an action to the page that owns it, so it is behind Cloudflare Access like the rest of
// the dashboard. The site's daily cap still counts it.
export async function lookupRegStaffAction(reg: unknown): Promise<RegLookup | null> {
  if (typeof reg !== "string" || reg.length > 16) return null;
  return lookupReg(reg, null);
}
