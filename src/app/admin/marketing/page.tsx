import { EmptyState, PageHeader } from "@/components/admin/kit";

export const metadata = { title: "Marketing" };

export default function Page() {
  return (
    <>
      <PageHeader title="Marketing" />
      <EmptyState title="Coming next" />
    </>
  );
}
