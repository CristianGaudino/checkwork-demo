import { EmptyState, PageHeader } from "@/components/admin/kit";

export const metadata = { title: "Dealerships" };

export default function Page() {
  return (
    <>
      <PageHeader title="Dealerships" />
      <EmptyState title="Coming next" />
    </>
  );
}
