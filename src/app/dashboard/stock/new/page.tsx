import { CarForm } from "@/components/admin/CarForm";
import { PageHeader } from "@/components/admin/kit";
import { can } from "@/lib/permissions";

export const metadata = { title: "Add a car" };

export default async function Page() {
  const cost = (await can("margins")) ? {} : undefined;
  return (
    <>
      <PageHeader title="Add a car" />
      <CarForm cost={cost} />
    </>
  );
}
