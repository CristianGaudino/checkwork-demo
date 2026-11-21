import { redirect } from "next/navigation";
import { leadsStore } from "@/lib/admin/collections";
import { hasModule } from "@/lib/modules";
import { LeadView } from "./lead-view";

export const metadata = { title: "Lead" };

// A warranty request lives under Aftersales, so a link to it here (the bell, the history, an email) goes there.
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // A warranty request lives in Aftersales, while the dealer has it; without Service it stays here.
  if ((await leadsStore.get(id))?.type === "warranty" && (await hasModule("service"))) redirect(`/dashboard/aftersales/requests/${id}`);
  return <LeadView id={id} />;
}
