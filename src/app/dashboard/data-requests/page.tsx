import { notFound } from "next/navigation";
import { Notice, PageHeader, Panel } from "@/components/admin/kit";
import { plural } from "@/lib/admin/format";
import { DataRequest } from "@/components/admin/DataRequest";
import { can } from "@/lib/permissions";

export const metadata = { title: "Data requests" };

// A person asks what we hold about them, or for it to be deleted (GDPR articles 15 and 17): owners and managers only.
export default async function Page({ searchParams }: { searchParams: Promise<{ erased?: string; notice?: string }> }) {
  if (!(await can("data"))) notFound();
  const sp = await searchParams;
  const erased = sp.erased !== undefined && /^\d+$/.test(sp.erased) ? Number(sp.erased) : null;
  return (
    <>
      <PageHeader title="Data requests" text="For privacy requests: when someone asks what you hold about them, or asks you to delete it." />
      {erased !== null && <Notice>Erased {plural(erased, "record")}. Sales stay for the books, without the person.</Notice>}
      {sp.notice === "confirm" && <Notice tone="warn">Nothing was erased. Tick that you have checked it is the person asking.</Notice>}
      {/* The job first; on a laptop how it works sits beside it, on a phone under it. */}
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="flex min-w-0 flex-col gap-6">
          <DataRequest />
        </div>
        <Panel title="How it works" quiet>
          <ol className="flex list-decimal flex-col gap-2 pl-5 text-body">
            <li>Find them by the email or phone number they gave you.</li>
            <li>If they asked what you hold, download a copy and send it to them.</li>
            <li>If they asked you to delete it, check it is really them, then erase it.</li>
          </ol>
          <p className="text-meta text-text-2">The law gives you one month to answer. Purchases stay for your accounts, without their name.</p>
        </Panel>
      </div>
    </>
  );
}
