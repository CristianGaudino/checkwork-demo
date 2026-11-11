"use client";

import { useSyncExternalStore } from "react";
import { DEMO_BAR_ENABLED, type DemoRole } from "@/lib/demo";
import { ROLE_COOKIE, parseRole, type Role } from "@/lib/permission-rules";
import { STOCK_COOKIE, parseStockSource, type StockSource } from "@/lib/stock-source-rules";
import { SITE_SLUG } from "@/lib/site";

// How the demo is being viewed on the public pages, remembered in this browser: as a customer, or as the dealer's staff (who then get a
// Dashboard link in the header, and stock and social links on a car page). The dealer area itself is decided by the route and by
// Cloudflare Access; the dealer's role (what they may see inside it) is a cookie the server reads (src/lib/permissions.ts).
const KEY = `${SITE_SLUG}:role`;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());
const subscribe = (cb: () => void) => (listeners.add(cb), () => void listeners.delete(cb));

function read(): DemoRole {
  try {
    return DEMO_BAR_ENABLED && localStorage.getItem(KEY) === "dealer" ? "dealer" : "customer";
  } catch {
    return "customer";
  }
}

export function setDemoRole(role: DemoRole) {
  try {
    if (role === "customer") localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, role);
  } catch {
    // Blocked storage: the role lasts for this page view only, which is the same as customer.
  }
  notify();
}

export const useDemoRole = () => useSyncExternalStore(subscribe, read, () => "customer" as DemoRole);

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
