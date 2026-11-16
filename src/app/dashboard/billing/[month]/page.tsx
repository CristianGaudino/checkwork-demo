import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, DataTable, Facts, PageHeader, Panel, adminButtonQuiet } from "@/components/admin/kit";
import { fmtDay } from "@/lib/admin/format";
import { can } from "@/lib/permissions";
import { billingDetails, billsStore } from "@/lib/billing/bills";
import { OUR_DETAILS, eur, fmtMonth, itemise, type BillLine } from "@/lib/billing/bills-rules";
import { VAT_PCT } from "@/lib/billing/rules";

export const metadata = { title: "Bill" };

// One bill, itemised: the plan, the discount, each usage line, VAT and the total. The invoice itself is emailed as a PDF when it is issued.
export default async function Page({ params }: { params: Promise<{ month: string }> }) {
  if (!(await can("billing"))) notFound();
  const { month } = await params;
  const bill = /^\d{4}-\d{2}$/.test(month) ? await billsStore.get(month) : undefined;
  if (!bill) notFound();
  const t = itemise(bill);
  const mine = await billingDetails();
  const rows: (BillLine & { key: string; strong?: boolean })[] = [
    ...t.plan.map((l) => ({ ...l, key: `p-${l.label}` })),
    ...(t.discountEur ? [{ key: "discount", label: `Founding dealer discount, ${bill.discountPct}% off the plan`, eur: -t.discountEur }] : []),
    ...t.usage.map((l) => ({ ...l, key: `u-${l.label}` })),
    { key: "net", label: "Total before VAT", eur: t.net, strong: true },
    { key: "vat", label: `VAT at ${VAT_PCT}%`, eur: t.vatEur },
    { key: "total", label: "Total", eur: t.total, strong: true },
  ];
  return (
    <>
      <PageHeader title={`Bill for ${fmtMonth(bill.id)}`} actions={<Link href="/dashboard/billing?section=bills" className={adminButtonQuiet}>All bills</Link>} />
      <Panel>
        <Facts
          items={[
            ["Status", bill.status === "paid" ? <Badge key="s" tone="good">Paid</Badge> : <Badge key="s" tone="warn">Due {fmtDay(bill.dueOn, "dayMonth")}</Badge>],
            ["Issued", fmtDay(bill.issuedOn, "dayMonth")],
            ["From", `${OUR_DETAILS.name}, ${OUR_DETAILS.address}. VAT ${OUR_DETAILS.vat}`],
            ["To", `${mine.company}, ${mine.address}${mine.vatNumber ? `. VAT ${mine.vatNumber}` : ""}`],
          ]}
        />
      </Panel>
      <Panel title="What it is made of">
        <DataTable
          bare
          rows={rows}
          rowKey={(r) => r.key}
          columns={[
            { key: "label", header: "Item", cell: (r) => <span className={r.strong ? "font-semibold" : ""}>{r.label}</span> },
            { key: "detail", header: "Uses", hide: "sm", cell: (r) => r.detail ?? "" },
            { key: "eur", header: "Amount", align: "right", cell: (r) => <span className={r.strong ? "font-semibold" : ""}>{r.eur < 0 ? "-" : ""}{eur(Math.abs(r.eur))}</span> },
          ]}
        />
        <p className="text-meta text-text-2">The invoice was emailed as a PDF when this bill was issued.</p>
      </Panel>
    </>
  );
}
