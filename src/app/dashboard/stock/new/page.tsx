import { CarForm } from "@/components/admin/CarForm";
import { PageHeader } from "@/components/admin/kit";
import { SyncedNotice } from "@/components/admin/SyncedNotice";
import { can } from "@/lib/permissions";
import { stockSource } from "@/lib/stock-source";

export const metadata = { title: "Add a car" };

export default async function Page() {
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
      <CarForm cost={cost} />
    </>
  );
}
