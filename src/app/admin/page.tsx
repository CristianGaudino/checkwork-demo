import { EmptyState, PageHeader } from "@/components/admin/kit";

export const metadata = { title: "Overview" };

export default function Page() {
  return (
    <>
      <PageHeader title="Overview" />
      <EmptyState title="Coming next" />
    </>
  );
}
