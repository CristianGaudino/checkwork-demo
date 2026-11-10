"use client";

import { useSyncExternalStore } from "react";
import { SITE_SLUG } from "@/lib/site";
import type { DemoRole } from "@/lib/demo";

// The role the demo is being viewed as on the public pages, remembered in this browser. The areas themselves are decided by the route
// and by Cloudflare Access; this only decides what the public pages show a dealer or superuser (a strip, and controls on a car page).
const KEY = `${SITE_SLUG}:role`;
const listeners = new Set<() => void>();

function read(): DemoRole {
  try {
    const v = localStorage.getItem(KEY);
    return v === "dealer" || v === "superuser" ? v : "customer";
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
  listeners.forEach((l) => l());
}

export const useDemoRole = () =>
  useSyncExternalStore(
    (cb) => (listeners.add(cb), () => void listeners.delete(cb)),
    read,
    () => "customer" as DemoRole,
  );
