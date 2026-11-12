import { CarForm } from "@/components/admin/CarForm";
import { PageHeader } from "@/components/admin/kit";
import { SyncedNotice } from "@/components/admin/SyncedNotice";
import { can } from "@/lib/permissions";
import { stockSource } from "@/lib/stock-source";

export const metadata = { title: "Add a car" };

// ?reg= starts the form from a registration: the trade-in on a sale just recorded.
export default async function Page({ searchParams }: { searchParams: Promise<{ reg?: string }> }) {
  if ((await stockSource()) === "donedeal") {
    return (
      <>
        <PageHeader title="Add a car" />
        <SyncedNotice />
      </>
    );
  }
  const cost = (await can("margins")) ? {} : undefined;
  return (
    <>
      <PageHeader title="Add a car" />
      <CarForm cost={cost} reg={((await searchParams).reg ?? "").toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 12)} />
    </>
  );
}
