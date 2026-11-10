"use client";

import Link from "next/link";
import { useDemoRole } from "@/lib/demo-role";
import { PencilIcon, ShareIcon } from "@/components/stock/icons";
import { secondaryButton } from "@/components/ui";

const pill = `inline-flex min-h-11 items-center gap-2 px-4 text-meta ${secondaryButton}`;

// On a car page, for the dealer's staff: a labelled strip across the top, so it is clear these are the dealer's tools. Edit goes to this
// car's stock record; Post to social to a post for it (not for a sold car: posts are for cars in stock).
export function CarControls({ id, slug, sold = false }: { id: string; slug: string; sold?: boolean }) {
  const role = useDemoRole();
  if (role === "customer") return null;
  return (
    <div data-car-controls role="group" aria-label="Dealer tools" className="mt-6 flex flex-wrap items-center gap-2 rounded-card border border-hairline bg-surface p-2 pl-4">
      <span className="mr-auto text-meta font-medium text-text-2">Dealer</span>
      <Link href={`/admin/stock/${id}`} className={pill}>
        <PencilIcon className="size-4" />
        Edit car
      </Link>
      {!sold && (
        <Link href={`/admin/marketing?tab=social&car=${encodeURIComponent(slug)}`} className={pill}>
          <ShareIcon className="size-4" />
          Post to social
        </Link>
      )}
    </div>
  );
}
