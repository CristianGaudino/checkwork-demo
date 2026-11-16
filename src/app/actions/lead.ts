"use server";

import { headers } from "next/headers";
import { getDeps } from "@/lib/leads/deps";
import { processLead } from "@/lib/leads/process";
import type { LeadResult } from "@/lib/leads/process";
import { hasModule } from "@/lib/modules";
import type { ModuleId } from "@/lib/modules-rules";

// The module each kind of lead belongs to (#173). A server action can be posted from any page, so the action itself refuses a kind the
// dealer does not have; an enquiry and a general message are the base site's.
const MODULE_OF: Partial<Record<string, ModuleId>> = { finance: "finance", trade_in: "tradeIn", test_drive: "testDrives", sourcing: "carFinder", order: "newCars", alert: "newsletter" };

// The one server action for every lead form (D-10). The IP is read for the rate limiter only and never stored.
export async function submitLead(fd: FormData): Promise<LeadResult> {
  try {
    const needs = MODULE_OF[String(fd.get("type"))];
    if (needs && !(await hasModule(needs))) return { status: "failed", kind: "server" };
    if (!(await hasModule("whatsapp"))) fd.delete("whatsappOptIn"); // the opt-in is only offered with WhatsApp
    const ip = (await headers()).get("cf-connecting-ip") ?? "";
    return await processLead(fd, { ip }, getDeps());
  } catch {
    return { status: "failed", kind: "server" }; // nothing from the error is logged or returned (D-08)
  }
}
