import { notFound } from "next/navigation";
import { StockListPage } from "@/components/stock/StockListPage";
import { makeListMetadata, makeListParams } from "@/lib/stock/make-list";

// /commercial/<make>: the vans list, already filtered to one make (the make page links here).
export const generateMetadata = async ({ params }: PageProps<"/commercial/[make]">) => makeListMetadata("commercial", (await params).make);

export default async function Page({ params, searchParams }: PageProps<"/commercial/[make]">) {
  const sp = await makeListParams((await params).make, searchParams);
  if (!sp) notFound();
  return <StockListPage condition="commercial" searchParams={Promise.resolve(sp)} />;
}
