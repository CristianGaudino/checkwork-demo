import { CarForm } from "@/components/admin/CarForm";
import { PageHeader } from "@/components/admin/kit";
import { SyncedNotice } from "@/components/admin/SyncedNotice";
import { CAR_PHOTOS_MAX } from "@/lib/admin/car-photos";
import { can } from "@/lib/permissions";
import { stockSource } from "@/lib/stock-source";

export const metadata = { title: "Add a car" };

// ?reg= starts the form from a registration: the trade-in on a sale just recorded.
export default async function Page({ searchParams }: { searchParams: Promise<{ reg?: string }> }) {
  if ((await stockSource()) === "donedeal") {
    return (
      <>
        <PageHeader title="Add a car" back={{ href: "/dashboard/stock", label: "Stock" }} />
        <SyncedNotice />
      </>
    );
  }
  const cost = (await can("margins")) ? {} : undefined;
  return (
    <>
      <PageHeader title="Add a car" text="Look up the registration, add photos, then check the details and the price." back={{ href: "/dashboard/stock", label: "Stock" }} />
      <CarForm cost={cost} photosMax={CAR_PHOTOS_MAX} reg={((await searchParams).reg ?? "").toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 12)} />
    </>
  );
}
