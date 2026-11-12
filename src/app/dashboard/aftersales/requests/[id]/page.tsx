import { redirect } from "next/navigation";
import { LeadView } from "@/app/dashboard/leads/[id]/lead-view";
import { leadsStore } from "@/lib/admin/collections";

export const metadata = { title: "Warranty request" };

// A warranty request from the website: the lead page, at an address under Aftersales so the menu marks where it is listed. Anything else
// is a lead, and goes to Leads.
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const lead = await leadsStore.get(id);
  if (lead && lead.type !== "warranty") redirect(`/dashboard/leads/${id}`);
  return <LeadView id={id} />;
}
