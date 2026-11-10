import { DataTable, PageHeader } from "@/components/admin/kit";
import { fmtAgo, fmtDateTime } from "@/lib/admin/format";
import { auditStore } from "@/lib/admin/platform";

export const metadata = { title: "Audit log" };

export default async function Page() {
  const rows = (await auditStore.list()).sort((a, b) => b.at - a.at).slice(0, 200);
  return (
    <>
      <PageHeader title="Audit log" text="Every change made on the platform, newest first." />
      <DataTable
        rows={rows}
        rowKey={(a) => a.id}
        columns={[
          { key: "when", header: "When", cell: (a) => <span title={fmtDateTime(a.at)}>{fmtAgo(a.at)}</span> },
          { key: "who", header: "Who", cell: (a) => a.actor },
          { key: "action", header: "What", cell: (a) => a.action },
          { key: "target", header: "Dealership", cell: (a) => <span className="font-semibold">{a.target}</span> },
        ]}
      />
    </>
  );
}
