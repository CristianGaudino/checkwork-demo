"use server";

import { headers } from "next/headers";
import { lookupReg, type RegLookup } from "@/lib/reg-lookup";
import { recordUsage, usageAllowed } from "@/lib/billing/usage";
import { hasModule } from "@/lib/modules";
import { parseIrishReg } from "@/lib/reg";

// The registration lookup the visitor's forms call (trade-in, sell). Input from anyone: a bounded string, checked again by the parser. The
// visitor's address only keys their limits (src/lib/reg-lookup.ts); it is never stored or logged. Staff use the dashboard's own action.
export async function lookupRegAction(reg: unknown): Promise<RegLookup | null> {
  if (typeof reg !== "string" || reg.length > 16) return null;
  // Off on the website for this dealer (#180), or past their monthly limit (#181): the plate's own facts, free, and the person types the rest.
  if (!(await hasModule("lookupWebsite"))) return parseIrishReg(reg);
  return lookupReg(reg, (await headers()).get("cf-connecting-ip") ?? "", undefined, { allowed: () => usageAllowed("lookup"), paid: () => recordUsage("lookup", "website") });
}
