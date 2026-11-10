import { EmptyState, PageHeader } from "@/components/admin/kit";

export const metadata = { title: "Plans and add-ons" };

export default function Page() {
  return (
    <>
      <PageHeader title="Plans and add-ons" />
      <EmptyState title="Coming next" />
    </>
  );
}
