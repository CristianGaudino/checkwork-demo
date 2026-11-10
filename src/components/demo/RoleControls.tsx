"use client";

import Link from "next/link";
import { DEMO_BAR_ENABLED } from "@/lib/demo";
import { useDemoRole } from "@/lib/demo-role";
import { press } from "@/components/ui";

const pill = `inline-flex min-h-11 items-center rounded-control border border-hairline bg-card px-4 text-meta font-semibold ${press}`;

// Under the public header when the demo is viewed as a dealer or superuser: the way into that area.
export function RoleStrip() {
  const role = useDemoRole();
  if (!DEMO_BAR_ENABLED || role === "customer") return null;
  const area = role === "dealer" ? { href: "/admin", label: "Open the dealer area" } : { href: "/platform", label: "Open the platform" };
  return (
    <div data-role-strip className="border-b border-hairline bg-hairline text-meta">
      <div className="mx-auto flex min-h-11 max-w-[1280px] items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <span className="font-semibold">{role === "dealer" ? "Dealer view" : "Superuser view"}</span>
        <Link href={area.href} className="font-semibold underline underline-offset-4">
          {area.label}
        </Link>
      </div>
    </div>
  );
}

// On a car page, for a dealer or superuser: straight to this car's stock record, and to a social post for it (not for a sold car: posts are for cars in stock).
export function CarControls({ id, slug, sold = false }: { id: string; slug: string; sold?: boolean }) {
  const role = useDemoRole();
  if (!DEMO_BAR_ENABLED || role === "customer") return null;
  return (
    <div data-car-controls className="mb-4 flex flex-wrap items-center gap-2">
      <Link href={`/admin/stock/${id}`} className={pill}>
        Edit in stock
      </Link>
      {!sold && (
        <Link href={`/admin/marketing?tab=social&car=${encodeURIComponent(slug)}`} className={pill}>
          Post this car
        </Link>
      )}
    </div>
  );
}
