import "server-only";
import { defineCollection } from "@/lib/admin/docs";
import { dublinDay } from "@/lib/admin/format";
import { getSettings, settingsStore } from "@/lib/admin/collections";
import { notify } from "@/lib/admin/notifications";
import { BILLING_DEFAULT, alertsCrossed, usageCosts, usageId, withinCaps, type BillingSettings, type Kind, type Service, type UsageCount } from "./rules";
import { hasModule } from "@/lib/modules";
import { roleCan } from "@/lib/permission-rules";

// The meters for what is billed per use (#181): registration lookups, AI actions and WhatsApp messages. Every paid use is counted here,
// once, by the code that makes it; the Billing page, the owner API (#174) and the bill all read these counts, so they never disagree.
// A month's line is one record (usageId), so the store grows by a few records a month, not one per use.
export const usageStore = defineCollection<UsageCount>("usage", seedUsage);
// The alerts already sent, by key (a month, a scope and a mark), so each goes once.
export const sentAlertsStore = defineCollection<{ id: string }>("usage-alerts", () => []);

export const monthOf = (t: number = Date.now()) => dublinDay(t).slice(0, 7);

// The assistant plan counts only while the dealer has the AI module, so the Billing page, the meters and the owner API agree.
export async function billingSettings(): Promise<BillingSettings> {
  const s = await getSettings();
  const b = { ...BILLING_DEFAULT, ...s.billing };
  return b.aiPlan === "assistant" && !(await hasModule("ai")) ? { ...b, aiPlan: "perAction" } : b;
}
export async function monthCounts(month = monthOf()): Promise<UsageCount[]> {
  return (await usageStore.list()).filter((c) => c.month === month);
}
export async function monthUsage(month = monthOf()) {
  return usageCosts(await monthCounts(month), (await billingSettings()).aiPlan);
}

// Whether one more use is allowed: false once the month's spend reaches a cap (the dealer's or ours). The caller falls back without it.
export async function usageAllowed(service: Service): Promise<boolean> {
  try {
    return withinCaps(await monthUsage(), await billingSettings(), service);
  } catch {
    return true; // a meter that cannot be read never stops the dealer's work; the cap is checked again on the next use
  }
}

// Counts one use, then sends any alert it set off (80% of a cap, the cap, an amount the dealer chose) to the owners and managers, in the
// bell. Best effort: a use is never undone because its count could not be written.
// shortcut: read then write, so two uses at the same moment can count once. Fine for a dealer's volume; a Durable Object counter if exact.
export async function recordUsage<S extends Service>(service: S, kind: Kind<S>, n = 1): Promise<void> {
  try {
    const month = monthOf();
    const b = await billingSettings();
    const before = await monthCounts(month);
    const id = usageId(month, service, kind);
    const prev = before.find((c) => c.id === id);
    const next: UsageCount = { id, month, service, kind, count: (prev?.count ?? 0) + n };
    await usageStore.put(next);
    const after = [...before.filter((c) => c.id !== id), next];
    const alerts = alertsCrossed(usageCosts(before, b.aiPlan), usageCosts(after, b.aiPlan), b, month);
    if (!alerts.length) return;
    const { team } = await getSettings();
    // Each owner and manager, by the name the bell knows them by (src/lib/permissions.ts): the team's, and an owner in ADMIN_OWNER_EMAILS who is
    // not on the team goes by their email. Only them, so Sales and Finance never see what the dealer pays; with nobody, no notice.
    const teamEmails = new Set(team.map((t) => t.email.toLowerCase()));
    const leaders = [...team.filter((t) => roleCan(t.role, "billing")).map((t) => t.name), ...(process.env.ADMIN_OWNER_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase()).filter((e) => e && !teamEmails.has(e))];
    for (const a of alerts) {
      if (await sentAlertsStore.get(a.key)) continue;
      await sentAlertsStore.put({ id: a.key });
      for (const name of leaders) await notify({ kind: "usage", text: a.text, href: "/dashboard/billing", for: name });
    }
  } catch {
    // shortcut: a lost count is a few cents unbilled; the use itself went through
  }
}

// Saves the dealer's limits and alerts. Ours (the ceilings) are set from the owner's program, never here.
export async function saveBilling(change: Partial<Pick<BillingSettings, "caps" | "alerts" | "alertAt80" | "aiPlan">>) {
  const s = await getSettings();
  await settingsStore.put({ ...s, billing: { ...BILLING_DEFAULT, ...s.billing, ...change }, updatedAt: Date.now() });
}

// The demo's month so far: steady daily use, so the Billing page shows a lived-in month on any day, well under the demo's limits.
function seedUsage(): UsageCount[] {
  const month = monthOf();
  const day = Number(dublinDay().slice(8, 10));
  const lines: [Service, string, number][] = [
    ["lookup", "website", 2 * day],
    ["lookup", "dashboard", day],
    ["ai", "draft", 4 * day],
    ["ai", "adjust", 3 * day],
    ["whatsapp", "alert", 6 * day],
    ["whatsapp", "reply", 4 * day],
    ["whatsapp", "marketing", day > 7 ? 40 : 0],
  ];
  return lines.map(([service, kind, count]) => ({ id: usageId(month, service, kind), month, service, kind, count }));
}
