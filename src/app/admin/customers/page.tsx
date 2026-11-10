import { EmptyState, PageHeader } from "@/components/admin/kit";

export const metadata = { title: "Customers and alerts" };

export default function Page() {
  return (
    <>
      <PageHeader title="Customers and alerts" />
      <EmptyState title="Coming next" />
    </>
  );
}
