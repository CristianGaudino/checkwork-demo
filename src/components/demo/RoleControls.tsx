"use client";

import Link from "next/link";
import { useDemoRole } from "@/lib/demo-role";
import { press } from "@/components/ui";

const pill = `inline-flex min-h-11 items-center rounded-control border border-hairline bg-card px-4 text-meta font-semibold ${press}`;

// On a car page, for the dealer's staff: straight to this car's stock record, and to a social post for it (not for a sold car: posts are for cars in stock).
export function CarControls({ id, slug, sold = false }: { id: string; slug: string; sold?: boolean }) {
  const role = useDemoRole();
  if (role === "customer") return null;
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
