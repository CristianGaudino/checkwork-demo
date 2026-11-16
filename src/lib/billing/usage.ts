import "server-only";
import { defineCollection } from "@/lib/admin/docs";
import { dublinDay } from "@/lib/admin/format";
import { getSettings, settingsStore } from "@/lib/admin/collections";
import { notify } from "@/lib/admin/notifications";
import { BILLING_DEFAULT, alertsCrossed, usageCosts, usageId, withinCaps, type BillingSettings, type Kind, type Service, type UsageCount } from "./rules";

// The meters for what is billed per use (#181): registration lookups, AI actions and WhatsApp messages. Every paid use is counted here,
// once, by the code that makes it; the Billing page, the owner API (#174) and the bill all read these counts, so they never disagree.
// A month's line is one record (usageId), so the store grows by a few records a month, not one per use.
export const usageStore = defineCollection<UsageCount>("usage", seedUsage);
// The alerts already sent, by key (a month, a scope and a mark), so each goes once.
export const sentAlertsStore = defineCollection<{ id: string }>("usage-alerts", () => []);

export const monthOf = (t: number = Date.now()) => dublinDay(t).slice(0, 7);

export async function billingSettings(): Promise<BillingSettings> {
  const s = await getSettings();
  return { ...BILLING_DEFAULT, ...s.billing };
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
    const leaders = team.filter((t) => t.role === "Owner" || t.role === "Manager").map((t) => t.name);
    for (const a of alerts) {
      if (await sentAlertsStore.get(a.key)) continue;
      await sentAlertsStore.put({ id: a.key });
      // To each owner and manager by name, so Sales and Finance never see what the dealer pays.
      for (const name of leaders.length ? leaders : [undefined]) await notify({ kind: "usage", text: a.text, href: "/dashboard/billing", ...(name && { for: name }) });
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

// The demo's month so far: steady daily use, so the Billing page shows a lived-in month on any day. AI sits near its cap, so the 80% alert
// and the limit can be shown.
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
