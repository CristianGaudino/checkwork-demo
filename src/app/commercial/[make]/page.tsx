import { notFound } from "next/navigation";
import { StockListPage } from "@/components/stock/StockListPage";
import { makeList, makeListMetadata } from "@/lib/stock/make-list";

// /commercial/<make>: the vans list, already filtered to one make (the make page links here).
export const generateMetadata = async ({ params }: PageProps<"/commercial/[make]">) => makeListMetadata("commercial", (await params).make);

export default async function Page({ params, searchParams }: PageProps<"/commercial/[make]">) {
  const list = await makeList("commercial", (await params).make, searchParams);
  if (!list) notFound();
  return <StockListPage condition="commercial" searchParams={Promise.resolve(list.params)} title={list.title} />;
}
