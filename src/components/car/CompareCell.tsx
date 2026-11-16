"use client";

import { useModules } from "@/lib/demo-role";

// The Compare button's cell in the buy box: half the row beside Notify me, or the whole row when there is no Notify me (a reserved car,
// or a dealer without price alerts, the newsletter module #173).
export function CompareCell({ wide, children }: { wide: boolean; children: React.ReactNode }) {
  const alerts = useModules().has("newsletter");
  return <div className={wide || !alerts ? "col-span-2" : undefined}>{children}</div>;
}
