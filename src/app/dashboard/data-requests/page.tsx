import { notFound } from "next/navigation";
import { Notice, PageHeader } from "@/components/admin/kit";
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
      <PageHeader title="Data requests" text="When someone asks what we hold about them, or asks us to delete it. Answer within a month. Each request is recorded in Activity, without the person." />
      {erased !== null && <Notice>Erased {plural(erased, "record")}. Sales stay for the books, without the person.</Notice>}
      {sp.notice === "confirm" && <Notice tone="warn">Nothing was erased. Tick that you have checked it is the person asking.</Notice>}
      <DataRequest />
    </>
  );
}
