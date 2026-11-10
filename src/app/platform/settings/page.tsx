import { EmptyState, PageHeader } from "@/components/admin/kit";

export const metadata = { title: "Platform settings" };

export default function Page() {
  return (
    <>
      <PageHeader title="Platform settings" />
      <EmptyState title="Coming next" />
    </>
  );
}
