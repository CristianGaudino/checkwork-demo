import Link from "next/link";
import { SHOW_PRICING } from "@/lib/billing/rules";
import { notFound } from "next/navigation";
import { Badge, DataTable, Facts, PageHeader, Panel } from "@/components/admin/kit";
import { fmtDay } from "@/lib/admin/format";
import { can } from "@/lib/permissions";
import { billingDetails, getBill } from "@/lib/billing/bills";
import { OUR_DETAILS, eur, fmtMonth, itemise, type BillLine } from "@/lib/billing/bills-rules";
import { VAT_PCT } from "@/lib/billing/rules";

export const metadata = { title: "Bill" };

// One bill, itemised: the plan, each usage line, VAT and the total. The invoice itself is emailed as a PDF when it is issued.
export default async function Page({ params }: { params: Promise<{ month: string }> }) {
  if (!SHOW_PRICING || !(await can("billing"))) notFound(); // hidden for now (SHOW_PRICING)
  const { month } = await params;
  const bill = /^\d{4}-\d{2}$/.test(month) ? await getBill(month) : undefined;
  if (!bill) notFound();
  const t = itemise(bill);
  const mine = await billingDetails();
  const rows: (BillLine & { key: string; strong?: boolean })[] = [
    ...t.plan.map((l) => ({ ...l, key: `p-${l.label}` })),
    ...t.usage.map((l) => ({ ...l, key: `u-${l.label}` })),
    { key: "net", label: "Total before VAT", eur: t.net, strong: true },
    { key: "vat", label: `VAT at ${VAT_PCT}%`, eur: t.vatEur },
    { key: "total", label: "Total", eur: t.total, strong: true },
  ];
  return (
    <>
      <PageHeader title={`Bill for ${fmtMonth(bill.id)}`} back={{ href: "/dashboard/billing?section=bills", label: "All bills" }} />
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
            { key: "eur", header: "Amount", align: "right", cell: (r) => <span className={r.strong ? "font-semibold" : ""}>{r.eur < 0 ? "-" : ""}{eur(Math.abs(r.eur), true)}</span> },
          ]}
        />
        <p className="text-meta text-text-2">
          The invoice was emailed as a PDF when this bill was issued. Something look wrong?{" "}
          <Link href={`/dashboard/help?type=Billing&from=${encodeURIComponent(`/dashboard/billing/${bill.id}`)}`} className="font-medium text-accent-text underline underline-offset-2">Ask us about this bill</Link>
        </p>
      </Panel>
    </>
  );
}
