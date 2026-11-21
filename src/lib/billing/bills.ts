import "server-only";
import { defineCollection } from "@/lib/admin/docs";
import { addDays, dublinDay } from "@/lib/admin/format";
import { getSettings } from "@/lib/admin/collections";
import { MODULE_IDS } from "@/lib/modules-rules";
import { DEMO_BAR_ENABLED } from "@/lib/demo";
import { enabledModules } from "@/lib/modules";
import { billingSettings } from "./usage";
import { usageLines, type Bill, type BillingDetails } from "./bills-rules";
import { BILLING_DEFAULT, allowanceFor, planLines, type Service } from "./rules";
import { SITE_NAME, DEALER_ADDRESS_TEXT, DEALER_EMAIL } from "@/lib/site";

// The dealer's past bills, one record each, kept as what they were made of (bills-rules.ts itemise). On a real site the billing program
// issues them and emails the PDF (#62); the demo seeds a year, and shows no download because the invoice comes from the payment provider.
// "bills-v2": bills stored by builds before the tiers had other plan lines and a discount, so they start again.
export const billsStore = defineCollection<Bill>("bills-v2", seedBills);

export async function listBills(): Promise<Bill[]> {
  const shown = await asShown();
  return (await billsStore.list()).map(shown).sort((a, b) => b.id.localeCompare(a.id));
}
export async function getBill(id: string): Promise<Bill | undefined> {
  const bill = await billsStore.get(id);
  return bill && (await asShown())(bill);
}
// With the demo bar on (next dev, the E2E run) the bills follow the modules on, so the Bills tab never disagrees with the Plan tab. Elsewhere,
// the live demo included, they are as issued.
async function asShown(): Promise<(bill: Bill) => Bill> {
  if (!DEMO_BAR_ENABLED) return (bill) => bill;
  const [modules, b] = await Promise.all([enabledModules(), billingSettings()]);
  const allowance = allowanceFor(modules, b);
  return (bill) => ({ ...bill, modules: planLines(modules, b), usage: usageLines(bill.usage, allowance) });
}

export async function billingDetails(): Promise<BillingDetails> {
  const s = await getSettings();
  return s.billingDetails ?? { company: SITE_NAME, vatNumber: "", address: DEALER_ADDRESS_TEXT, email: DEALER_EMAIL };
}

// A year of the demo: the last twelve months, the latest still due, the rest paid. Use grows a little each month.
function seedBills(): Bill[] {
  const [y, m] = dublinDay().slice(0, 7).split("-").map(Number);
  const modules = planLines(MODULE_IDS); // every module: the Group plan as one line and Service
  const allowance = allowanceFor(MODULE_IDS, BILLING_DEFAULT);
  return Array.from({ length: 12 }, (_, i) => {
    const d = new Date(Date.UTC(y, m - 2 - i, 1)); // i = 0 is last month
    const id = d.toISOString().slice(0, 7);
    const issuedOn = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1)).toISOString().slice(0, 10);
    const grow = 12 - i; // older months used less
    const counts: { service: Service; kind: string; count: number }[] = [
      { service: "lookup", kind: "website", count: 20 + grow * 4 },
      { service: "lookup", kind: "dashboard", count: 10 + grow * 2 },
      { service: "ai", kind: "opus", count: 30 + grow * 6 },
      { service: "ai", kind: "sonnet", count: 20 + grow * 4 },
      { service: "whatsapp", kind: "alert", count: 60 + grow * 8 },
      { service: "whatsapp", kind: "reply", count: 40 + grow * 5 },
      { service: "whatsapp", kind: "marketing", count: i % 3 === 0 ? 40 : 0 },
    ];
    return { id, issuedOn, dueOn: addDays(issuedOn, 30), status: i === 0 ? "due" : "paid", modules, usage: usageLines(counts, allowance) };
  });
}
