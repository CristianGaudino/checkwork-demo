import { EmptyState, PageHeader } from "@/components/admin/kit";

export const metadata = { title: "Usage and billing" };

export default function Page() {
  return (
    <>
      <PageHeader title="Usage and billing" />
      <EmptyState title="Coming next" />
    </>
  );
}
