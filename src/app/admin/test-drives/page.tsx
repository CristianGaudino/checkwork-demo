import { EmptyState, PageHeader } from "@/components/admin/kit";

export const metadata = { title: "Test drives" };

export default function Page() {
  return (
    <>
      <PageHeader title="Test drives" />
      <EmptyState title="Coming next" />
    </>
  );
}
