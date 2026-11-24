import Link from "next/link";
import { BackToCars } from "@/components/stock/BackToCars";
import { ChevronRightIcon } from "@/components/stock/icons";
import { VEHICLE_TYPES } from "@/lib/nav";
import type { Car } from "@/lib/stock/types";

const crumb = "-my-2.5 inline-flex min-h-11 items-center hover:underline";

// Stock, make, model, as in the mockup. Stock goes back to the list the buyer came from (BackToCars); the others are the landing pages.
export function Breadcrumb({ car }: { car: Pick<Car, "make" | "makeSlug" | "model" | "modelSlug" | "condition"> }) {
  // Vans go back to their own list. The make and model pages list used cars, so they are not linked from these.
  const own = VEHICLE_TYPES.find((t) => t.condition === car.condition && t.condition !== "used");
  if (own) {
    return (
      <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1 text-meta">
        <BackToCars condition={own.condition} label={own.label} />
        <ChevronRightIcon className="size-4 text-text-2" />
        <Link href={`${own.href}?make=${car.makeSlug}`} className={crumb}>
          {car.make}
        </Link>
        <ChevronRightIcon className="size-4 text-text-2" />
        <span>{car.model}</span>
      </nav>
    );
  }
  return (
    <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1 text-meta">
      <BackToCars />
      <ChevronRightIcon className="size-4 text-text-2" />
      <Link href={`/used-cars/${car.makeSlug}`} className={crumb}>
        {car.make}
      </Link>
      <ChevronRightIcon className="size-4 text-text-2" />
      <Link href={`/used-cars/${car.makeSlug}/${car.modelSlug}`} className={crumb}>
        {car.model}
      </Link>
    </nav>
  );
}
