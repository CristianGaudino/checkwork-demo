import "server-only";
import { addMessage, staffStore, type Msg } from "./store";
import { modeOf } from "@/lib/integrations";
import { recordUsage, usageAllowed } from "@/lib/billing/usage";
import { EVENTS, alertText, eventOfLead, firstName, inQuiet } from "./rules";
import { enabledModules } from "@/lib/modules";
import { SITE_NAME, TIME_ZONE } from "@/lib/site";
import type { Lead } from "@/lib/admin/collections";
import { getSettings } from "@/lib/admin/collections";

const clock = () => new Date().toLocaleTimeString("en-GB", { timeZone: TIME_ZONE, hour: "2-digit", minute: "2-digit" });

// A new website request reaches each team member who has that alert on, in their WhatsApp, with the buttons for it; and its buyer, if they
// ticked the WhatsApp box, gets a confirmation. Best effort and silent without the module: the lead is already stored and the dashboard has
// it, so a failure here is never a failed form (called from src/lib/admin/real-leads.ts, outside the dashboard, so it checks the module itself).
export async function alertStaffOnWhatsApp(lead: Lead): Promise<void> {
  try {
    const modules = await enabledModules();
    if (!modules.has("whatsapp")) return;
    const event = eventOfLead(lead.type, modules);
    const text = alertText(event, { first: firstName(lead.name), car: lead.carTitle, reg: lead.reg, text: lead.message, sell: lead.type === "sell", warranty: lead.type === "warranty" });
    const now = clock();
    const team = new Set((await getSettings()).team.map((t) => t.id)); // only people still on the team
    const drafts: Omit<Msg, "id" | "at" | "via">[] = (await staffStore.list())
      .filter((p) => team.has(p.id) && p.phone && p.alerts.includes(event) && !inQuiet(now, p.quietFrom, p.quietTo))
      .map((p) => ({ thread: "staff", from: "site", to: p.name, leadId: lead.id, ref: lead.id, event, text, buttons: event === "enquiry" && !lead.carTitle ? (["call", "handled"] as const).slice() : EVENTS[event].buttons, ...(lead.photoKeys?.length && { photoKeys: lead.photoKeys }) }));
    if (lead.whatsappOptIn && lead.phone) drafts.push({ thread: "buyer", from: "site", leadId: lead.id, text: `Hi ${firstName(lead.name)}, thanks for your message to ${SITE_NAME}. We have it and will be in touch soon.` });
    // One cap check and one count for the whole batch, so the visitor's submit is not many round trips; over the cap they all go by email.
    // shortcut: one lead's alerts (a few, one per linked phone) can pass the cap by those few cents; check per message if it ever matters.
    const viaWhatsApp = modeOf("whatsapp") === "simulated" && (await usageAllowed("whatsapp"));
    // By email instead only where there is an address: a buyer with only a phone gets nothing rather than an email nobody receives.
    for (const d of drafts) if (viaWhatsApp || d.thread !== "buyer" || lead.email) await addMessage({ ...d, ...(!viaWhatsApp && { via: "email" as const }) });
    if (viaWhatsApp && drafts.length) await recordUsage("whatsapp", "alert", drafts.length);
  } catch {
    // shortcut: a lost alert is still in the bell and the leads list; add a retry with the adapter
  }
}
