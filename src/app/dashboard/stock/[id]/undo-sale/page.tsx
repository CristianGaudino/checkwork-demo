import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader, Panel, adminButtonQuiet } from "@/components/admin/kit";
import { UndoSaleForm } from "@/components/admin/DepositForms";
import { customersStore, salesStore } from "@/lib/admin/collections";
import { withinReturnWindow, RETURN_WINDOW_DAYS } from "@/lib/admin/deposits";
import { dublinDay, fmtDate, fmtEur } from "@/lib/admin/format";
import { adminCar } from "@/lib/admin/stock-admin";
import { can } from "@/lib/permissions";
import { stockSource } from "@/lib/stock-source";

export const metadata = { title: "Undo the sale" };

// A sale that fell through, or a car the buyer brought back. The record is kept, with the refund and the reason. Owners and managers only.
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!(await can("settings"))) notFound();
  const [sale, car, source] = await Promise.all([salesStore.get(id), adminCar(id), stockSource()]);
  if (!sale) notFound();
  const buyer = sale.customerId ? await customersStore.get(sale.customerId) : undefined;
  const today = dublinDay();
  const inWindow = withinReturnWindow(sale.soldOn, today);
  return (
    <>
      <PageHeader title="Undo the sale" text={sale.carTitle} actions={<Link href="/dashboard/stock?view=sold" className={adminButtonQuiet}>Sold cars</Link>} />
      <Panel>
        <p className="max-w-measure text-body">
          Sold for {fmtEur(sale.priceEur)} on {fmtDate(`${sale.soldOn}T12:00:00Z`)}
          {buyer ? ` to ${buyer.name}` : ""}
          {sale.depositEur ? `, with a ${fmtEur(sale.depositEur)} deposit` : ""}.
        </p>
        {/* The short-term right to reject: worth knowing before agreeing a refund. */}
        <p className={`max-w-measure text-body ${inWindow ? "text-warn" : "text-text-2"}`}>
          {inWindow ? `Today is within ${RETURN_WINDOW_DAYS} days of the sale. A buyer who rejects a faulty car in that time is usually owed a full refund.` : `Today is more than ${RETURN_WINDOW_DAYS} days after the sale.`}
        </p>
        <p className="max-w-measure text-meta text-text-2">
          {source === "donedeal" || !car ? "The sale is kept in the records as undone. The car itself is changed on DoneDeal." : "The sale is kept in the records as undone. A car brought back is hidden from the website until you show it; one that fell through goes straight back on sale."}
        </p>
        <UndoSaleForm carId={id} soldOn={sale.soldOn} today={today} />
      </Panel>
    </>
  );
}
