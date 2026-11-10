import { EmptyState, PageHeader } from "@/components/admin/kit";

export const metadata = { title: "Stock" };

export default function Page() {
  return (
    <>
      <PageHeader title="Stock" />
      <EmptyState title="Coming next" />
    </>
  );
}
