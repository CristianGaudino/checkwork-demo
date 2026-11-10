import { EmptyState, PageHeader } from "@/components/admin/kit";

export const metadata = { title: "Leads" };

export default function Page() {
  return (
    <>
      <PageHeader title="Leads" />
      <EmptyState title="Coming next" />
    </>
  );
}
