"use client";

import { useMemo, useSyncExternalStore } from "react";
import { DEMO_BAR_ENABLED } from "@/lib/demo";
import { ROLE_COOKIE, parseRole, type Role } from "@/lib/permission-rules";
import { STOCK_COOKIE, parseStockSource, type StockSource } from "@/lib/stock-source-rules";
import { MODULES_COOKIE, modulesValue, parseModules, type ModuleId } from "@/lib/modules-rules";

// The demo's switches, remembered in this browser as cookies the server reads too: the dealer's role (what they may see), where the stock
// comes from, and which modules are on. The public site is always the customer's view; the dealer area is decided by the route and by
// Cloudflare Access.
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());
const subscribe = (cb: () => void) => (listeners.add(cb), () => void listeners.delete(cb));

// The dealer role the demo acts as (src/lib/permissions.ts): a cookie, so the server reads it.
const roleValue = () => parseRole(document.cookie.split("; ").find((c) => c.startsWith(`${ROLE_COOKIE}=`))?.slice(ROLE_COOKIE.length + 1));
export function setDealerRole(role: Role) {
  document.cookie = `${ROLE_COOKIE}=${role}; path=/; max-age=31536000; samesite=lax`;
  notify();
}
export const useDealerRole = () => useSyncExternalStore(subscribe, roleValue, () => parseRole(undefined));

// The demo's stock switch: our own uploader, or stock synced from DoneDeal (src/lib/stock-source.ts).
const stockValue = () => parseStockSource(document.cookie.split("; ").find((c) => c.startsWith(`${STOCK_COOKIE}=`))?.slice(STOCK_COOKIE.length + 1));
export function setDemoStockSource(source: StockSource) {
  document.cookie = `${STOCK_COOKIE}=${source}; path=/; max-age=31536000; samesite=lax`;
  notify();
}
// The demo's module switches (src/lib/modules-rules.ts): a cookie the server and the proxy read too. On a real site the build's setting.
const modulesRaw = () => (DEMO_BAR_ENABLED ? document.cookie.split("; ").find((c) => c.startsWith(`${MODULES_COOKIE}=`))?.slice(MODULES_COOKIE.length + 1) : process.env.NEXT_PUBLIC_SITE_MODULES);
export function setDemoModules(on: Iterable<ModuleId>) {
  document.cookie = `${MODULES_COOKIE}=${modulesValue(on)}; path=/; max-age=31536000; samesite=lax`;
  notify();
}
// The raw string is the snapshot (a stable value for React); callers parse it.
const useModulesRaw = () => useSyncExternalStore(subscribe, () => modulesRaw() ?? "all", () => process.env.NEXT_PUBLIC_SITE_MODULES ?? "all");
export function useModules(): Set<ModuleId> {
  const raw = useModulesRaw();
  return useMemo(() => parseModules(raw), [raw]);
}

// On a real site the build's setting; on the demo the switch.
export const useStockSource = () =>
  useSyncExternalStore(subscribe, () => (DEMO_BAR_ENABLED ? stockValue() : parseStockSource(process.env.NEXT_PUBLIC_STOCK_SOURCE)), () => parseStockSource(process.env.NEXT_PUBLIC_STOCK_SOURCE));
