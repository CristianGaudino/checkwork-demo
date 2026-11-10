import { EmptyState, PageHeader } from "@/components/admin/kit";

export const metadata = { title: "Analytics" };

export default function Page() {
  return (
    <>
      <PageHeader title="Analytics" />
      <EmptyState title="Coming next" />
    </>
  );
}
