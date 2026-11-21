"use client";

import { useSyncExternalStore } from "react";
import { DEMO_BAR_ENABLED } from "@/lib/demo";
import { ROLE_COOKIE, parseRole, type Role } from "@/lib/permission-rules";
import { STOCK_COOKIE, parseStockSource, type StockSource } from "@/lib/stock-source-rules";

// The demo's switches, remembered in this browser as cookies the server reads too: the dealer's role (what they may see) and where the
// stock comes from. The public site is always the customer's view; the dealer area is decided by the route and by Cloudflare Access.
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
// On a real site the build's setting; on the demo the switch.
export const useStockSource = () =>
  useSyncExternalStore(subscribe, () => (DEMO_BAR_ENABLED ? stockValue() : parseStockSource(process.env.NEXT_PUBLIC_STOCK_SOURCE)), () => parseStockSource(process.env.NEXT_PUBLIC_STOCK_SOURCE));
