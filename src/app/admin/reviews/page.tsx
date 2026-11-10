import { EmptyState, PageHeader } from "@/components/admin/kit";

export const metadata = { title: "Reviews" };

export default function Page() {
  return (
    <>
      <PageHeader title="Reviews" />
      <EmptyState title="Coming next" />
    </>
  );
}
