"use server";

import { headers } from "next/headers";
import { lookupReg, type RegLookup } from "@/lib/reg-lookup";

// The registration lookup the forms call. Input from anyone: a bounded string, checked again by the parser. The visitor's address only
// keys the per-visitor limit (src/lib/reg-lookup.ts); it is not stored or logged.
export async function lookupRegAction(reg: unknown): Promise<RegLookup | null> {
  if (typeof reg !== "string" || reg.length > 16) return null;
  return lookupReg(reg, (await headers()).get("cf-connecting-ip") ?? "");
}
