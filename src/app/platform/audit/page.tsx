import { EmptyState, PageHeader } from "@/components/admin/kit";

export const metadata = { title: "Audit log" };

export default function Page() {
  return (
    <>
      <PageHeader title="Audit log" />
      <EmptyState title="Coming next" />
    </>
  );
}
