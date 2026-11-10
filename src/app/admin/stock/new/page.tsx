import { CarForm } from "@/components/admin/CarForm";
import { PageHeader } from "@/components/admin/kit";

export const metadata = { title: "Add a car" };

export default function Page() {
  return (
    <>
      <PageHeader title="Add a car" text="Fill in what you know. Make, model, year and price are needed." />
      <CarForm />
    </>
  );
}
