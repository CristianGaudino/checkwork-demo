import { notFound } from "next/navigation";
import { PageHeader } from "@/components/admin/kit";
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
      <PageHeader title="Data requests" text="When someone asks what we hold about them, or asks us to delete it. Answer within a month. Each request is recorded in Activity, without the person." />
      {erased !== null && <p role="status" className="rounded-control bg-ok-soft px-4 py-3 text-body text-ok">Erased {erased === 1 ? "1 record" : `${erased} records`}. Sales stay for the books, without the person.</p>}
      {sp.notice === "confirm" && <p role="status" className="rounded-control bg-warn-soft px-4 py-3 text-body text-warn">Nothing was erased. Tick that you have checked it is the person asking.</p>}
      <DataRequest />
    </>
  );
}
