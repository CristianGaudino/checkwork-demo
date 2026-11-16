"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { logActivity } from "@/lib/admin/activity";
import { getSettings, leadsStore } from "@/lib/admin/collections";
import { enabledModules, requireModule } from "@/lib/modules";
import { can, currentMember } from "@/lib/permissions";
import { tap, typed } from "@/lib/whatsapp/handle";
import { BUTTON_LABELS, eventsFor, type ButtonId } from "@/lib/whatsapp/rules";
import { staffStore, viewFor, type View } from "@/lib/whatsapp/store";
import { requireStaff } from "@/lib/staff";

// The phone panel's three calls. Each one checks the module and who is asking, acts, and sends back the conversation as it now is.
// The conversation holds buyers' names and messages: each action below checks staff first, wherever it is posted.
async function view(): Promise<View> {
  await requireModule("whatsapp");
  return viewFor((await currentMember()).name, await enabledModules());
}

export async function snapshotAction(): Promise<View> {
  await requireStaff(); // a server action can be posted to any page: only staff Access let in (src/lib/staff.ts)
  return view();
}

export async function tapAction(msgId: string, button: string): Promise<View> {
  await requireStaff(); // a server action can be posted to any page: only staff Access let in (src/lib/staff.ts)
  await requireModule("whatsapp");
  if (button in BUTTON_LABELS) {
    await tap((await currentMember()).name, String(msgId).slice(0, 64), button as ButtonId);
    revalidatePath("/dashboard/leads");
  }
  return view();
}

export async function sendAction(text: string): Promise<View> {
  await requireStaff(); // a server action can be posted to any page: only staff Access let in (src/lib/staff.ts)
  await requireModule("whatsapp");
  await typed((await currentMember()).name, String(text));
  revalidatePath("/dashboard/leads");
  return view();
}

// One person's phone, alerts and quiet hours. Owners and managers set anyone's; everyone else sets their own. An empty number unlinks it.
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
export async function saveStaffAction(id: string, data: FormData) {
  await requireStaff(); // a server action can be posted to any page: only staff Access let in (src/lib/staff.ts)
  await requireModule("whatsapp");
  const me = await currentMember();
  const person = (await getSettings()).team.find((t) => t.id === id);
  if (!person || !((await can("settings")) || person.name === me.name)) return;
  const phone = String(data.get("phone") ?? "").trim();
  const quietFrom = String(data.get("quietFrom") ?? "");
  const quietTo = String(data.get("quietTo") ?? "");
  const ok = (!phone || /^\+?[\d\s]{8,18}$/.test(phone)) && (quietFrom === "" ? quietTo === "" : TIME.test(quietFrom) && TIME.test(quietTo));
  if (!ok) redirect("/dashboard/whatsapp?notice=invalid");
  const allowed = eventsFor(await enabledModules());
  // The choices for a module that is off are kept, so switching it on again finds them.
  const kept = ((await staffStore.get(id))?.alerts ?? []).filter((e) => !allowed.includes(e));
  const alerts = [...kept, ...allowed.filter((e) => data.getAll("alert").includes(e))];
  await staffStore.put({ id, name: person.name, phone, alerts, quietFrom, quietTo });
  await logActivity("settings", phone ? "Changed the WhatsApp alerts for a team member" : "Unlinked a team member's WhatsApp", { kind: "team", id, label: person.name });
  redirect("/dashboard/whatsapp?notice=saved");
}

// A buyer who asked not to hear on WhatsApp any more: nothing more goes to them that way (src/lib/whatsapp/handle.ts reads the opt-in), and
// email takes over where they gave an address. shortcut: the buyer's own STOP reply comes with the adapter (src/lib/whatsapp/send.ts).
export async function stopWhatsAppAction(leadId: string) {
  await requireStaff(); // a server action can be posted to any page: only staff Access let in (src/lib/staff.ts)
  await requireModule("whatsapp");
  const lead = await leadsStore.get(String(leadId));
  if (!lead?.whatsappOptIn) return;
  await leadsStore.put({ ...lead, whatsappOptIn: undefined });
  await logActivity("leads", "Stopped WhatsApp updates to the buyer", { kind: "lead", id: lead.id }); // never the buyer
  revalidatePath(`/dashboard/leads/${lead.id}`);
}
