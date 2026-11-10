"use client";

import { useSyncExternalStore } from "react";
import { DEMO_BAR_ENABLED, type DemoRole } from "@/lib/demo";
import { PERMS_COOKIE, parsePerms, type Permission } from "@/lib/permission-rules";
import { SITE_SLUG } from "@/lib/site";

// How the demo is being viewed on the public pages, remembered in this browser: as a customer, or as the dealer's staff (who then get a
// Dashboard link in the header, and stock and social links on a car page). The dealer area itself is decided by the route and by
// Cloudflare Access; the permissions (what a dealer may see inside it) are a cookie the server reads (src/lib/permissions.ts).
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

const cookieValue = () => document.cookie.split("; ").find((c) => c.startsWith(`${PERMS_COOKIE}=`))?.slice(PERMS_COOKIE.length + 1) ?? "";

export function setDemoPermission(permission: Permission, on: boolean) {
  const next = new Set(parsePerms(cookieValue()));
  if (on) next.add(permission);
  else next.delete(permission);
  document.cookie = `${PERMS_COOKIE}=${[...next].join(",")}; path=/; max-age=31536000; samesite=lax`;
  notify();
}

export const useDemoPermissions = () => useSyncExternalStore(subscribe, () => cookieValue(), () => "");
