import { EmptyState, PageHeader } from "@/components/admin/kit";

export const metadata = { title: "Settings" };

export default function Page() {
  return (
    <>
      <PageHeader title="Settings" />
      <EmptyState title="Coming next" />
    </>
  );
}
