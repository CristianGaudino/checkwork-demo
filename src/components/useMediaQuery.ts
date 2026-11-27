"use client";

import { useSyncExternalStore } from "react";

export const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";
// The --ease-out token in globals.css, for Web Animations calls: keep the two the same.
export const EASE_OUT = "cubic-bezier(0.23, 1, 0.32, 1)";

// One subscriber per query, so React keeps the same function between renders and does not resubscribe.
const subscribers = new Map<string, (cb: () => void) => () => void>();
export const subscribe = (query: string) => {
  let s = subscribers.get(query);
  if (!s) {
    s = (cb) => {
      const q = window.matchMedia(query);
      q.addEventListener("change", cb);
      return () => q.removeEventListener("change", cb);
    };
    subscribers.set(query, s);
  }
  return s;
};

// A media query as live state. `ssr` is what the server and the first paint assume, so both match.
export const useMediaQuery = (query: string, ssr = false) => useSyncExternalStore(subscribe(query), () => window.matchMedia(query).matches, () => ssr);

// For a scroll the visitor asked for: smooth, unless they asked for less motion.
export const scrollBehavior = (): ScrollBehavior => (window.matchMedia(REDUCED_MOTION).matches ? "instant" : "smooth");
