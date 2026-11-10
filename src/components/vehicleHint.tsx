"use client";

import { useEffect, useSyncExternalStore } from "react";
import type { Condition } from "@/lib/stock/types";

// Every car page lives at /used-cars/<slug>, whatever the car is. So the header's Used, New, Commercial switch cannot tell from the address
// which section a new car or a van belongs to: the car page says so here, and the header reads it. Nothing is shown by this component.
let hint: Condition | null = null;
const listeners = new Set<() => void>();
const set = (c: Condition | null) => {
  hint = c;
  listeners.forEach((l) => l());
};

export const useVehicleHint = () =>
  useSyncExternalStore(
    (cb) => (listeners.add(cb), () => void listeners.delete(cb)),
    () => hint,
    () => null,
  );

export function VehicleHint({ condition }: { condition: Condition }) {
  useEffect(() => {
    set(condition);
    return () => set(null);
  }, [condition]);
  return null;
}
