import "server-only";
import { staffStore, type Msg } from "./store";
import { sendWhatsApp } from "./send";
import { EVENTS, alertText, eventOfLead, firstName, inQuiet } from "./rules";
import { enabledModules } from "@/lib/modules";
import { SITE_NAME, TIME_ZONE } from "@/lib/site";
import type { Lead } from "@/lib/admin/collections";

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
    for (const p of await staffStore.list()) {
      if (!p.phone || !p.alerts.includes(event) || inQuiet(now, p.quietFrom, p.quietTo)) continue;
      const draft: Omit<Msg, "id" | "at" | "via"> = { thread: "staff", from: "site", to: p.name, leadId: lead.id, ref: lead.id, event, text, buttons: EVENTS[event].buttons, ...(lead.photoKeys?.length && { photoKeys: lead.photoKeys }) };
      await sendWhatsApp(draft, "alert");
    }
    if (lead.whatsappOptIn) {
      await sendWhatsApp({ thread: "buyer", from: "site", leadId: lead.id, text: `Hi ${firstName(lead.name)}, thanks for your message to ${SITE_NAME}. We have it and will be in touch soon.` }, "alert");
    }
  } catch {
    // shortcut: a lost alert is still in the bell and the leads list; add a retry with the adapter
  }
}
