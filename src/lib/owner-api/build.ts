import "server-only";
import pkg from "../../../package.json";
import { addMonths } from "@/lib/admin/format";
import { monthCounts, billingSettings } from "@/lib/billing/usage";
import { planEur, usageCosts } from "@/lib/billing/rules";
import { syncStatus } from "@/lib/donedeal/sync";
import { MODULE_IDS } from "@/lib/modules-rules";
import { enabledModules } from "@/lib/modules";
import { summarise } from "@/lib/reports/monthly";
import { loadReportData } from "@/lib/reports/load";
import { countsBetween } from "./counters";

export const API_VERSION = 1;

export async function modulesBody() {
  const on = await enabledModules();
  const aiPlan = (await billingSettings()).aiPlan;
  return { version: API_VERSION, appVersion: pkg.version, modules: MODULE_IDS.filter((m) => on.has(m)), planEur: planEur(on, on.has("ai") ? aiPlan : "perAction") }; // the assistant fee only with the AI module, as the Billing page
}

// Each month the range touches (at most 13), with its counts and costs by service and kind.
export async function usageBody(from: string, to: string) {
  const { aiPlan } = await billingSettings();
  const months: string[] = [];
  for (let m = from.slice(0, 7); m <= to.slice(0, 7) && months.length < 13; m = addMonths(`${m}-01`, 1).slice(0, 7)) months.push(m);
  return {
    version: API_VERSION,
    months: await Promise.all(
      months.map(async (month) => {
        const c = usageCosts(await monthCounts(month), aiPlan);
        const { totalEur, ...services } = c;
        return { month, totalEur, services: Object.fromEntries(Object.entries(services).map(([s, v]) => [s, { count: v.count, costEur: v.costEur, kinds: v.kinds.map(({ kind, count, costEur }) => ({ kind, count, costEur })) }])) };
      }),
    ),
  };
}

export async function summaryBody(from: string, to: string, money: boolean) {
  const [data, counts, sync, mods, usage] = await Promise.all([loadReportData(), countsBetween(from, to), syncStatus(), modulesBody(), usageBody(from, to)]);
  const s = summarise(data, from, to, Date.now(), { money });
  return {
    version: API_VERSION,
    appVersion: pkg.version,
    ...s,
    features: counts.features,
    dashboard: counts.dashboard,
    modules: mods.modules,
    listingSync: { lastRunAt: sync.lastRunAt ?? null, lastOkAt: sync.lastOkAt ?? null, result: sync.result ?? null, ok: !sync.problem },
    usage: usage.months,
  };
}
