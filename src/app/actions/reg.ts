"use server";

import { lookupReg, type RegLookup } from "@/lib/reg-lookup";

// The registration lookup the forms call. Input from anyone: a bounded string, checked again by the parser; nothing is stored.
export async function lookupRegAction(reg: unknown): Promise<RegLookup | null> {
  if (typeof reg !== "string" || reg.length > 16) return null;
  return lookupReg(reg);
}
