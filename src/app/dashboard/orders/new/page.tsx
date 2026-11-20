import { notFound } from "next/navigation";
import { PageHeader, Panel } from "@/components/admin/kit";
import { PlaceOrderForm } from "@/components/admin/OrderForms";
import { customersStore, getSettings, leadsStore } from "@/lib/admin/collections";
import { dublinDay } from "@/lib/admin/format";
import { regPeriods } from "@/lib/leads/reg-periods";
import { currentMember } from "@/lib/permissions";
import { stockSource } from "@/lib/stock-source";

export const metadata = { title: "Place an order" };

// From the Orders page, or from an order request on the website (?lead=): its answers are shown to copy from, and the lead is marked won.
export default async function Page({ searchParams }: { searchParams: Promise<{ lead?: string }> }) {
  if ((await stockSource()) === "donedeal") notFound();
  const sp = await searchParams;
  const [customers, { team }, me, lead] = await Promise.all([customersStore.list(), getSettings(), currentMember(), sp.lead ? leadsStore.get(sp.lead) : undefined]);
  const today = dublinDay();
  return (
    <>
      <PageHeader title="Place an order" text="Four short steps. It shows under Orders until the car is handed over." back={{ href: "/dashboard/orders", label: "Orders" }} />
      {lead && (
        <Panel title={`What ${lead.name} asked for`}>
          <p className="max-w-measure whitespace-pre-line text-body">{lead.message}</p>
        </Panel>
      )}
      <Panel>
        <PlaceOrderForm
          periods={regPeriods(today)}
          month={today.slice(0, 7)}
          team={team.map((t) => t.name)}
          me={team.some((t) => t.name === me.name) ? me.name : undefined}
          customers={[...customers].sort((a, b) => a.name.localeCompare(b.name, "en-IE")).map((c) => ({ id: c.id, label: c.phone ? `${c.name}, ${c.phone}` : c.name }))}
          leadId={lead?.id}
        />
      </Panel>
    </>
  );
}
