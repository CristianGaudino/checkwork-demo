import { notFound } from "next/navigation";
import { StockListPage } from "@/components/stock/StockListPage";
import { makeList, makeListMetadata } from "@/lib/stock/make-list";

// /new-cars/<make>: the new cars list, already filtered to one make (the make page links here).
export const generateMetadata = async ({ params }: PageProps<"/new-cars/[make]">) => makeListMetadata("new", (await params).make);

export default async function Page({ params, searchParams }: PageProps<"/new-cars/[make]">) {
  const list = await makeList("new", (await params).make, searchParams);
  if (!list) notFound();
  return <StockListPage condition="new" searchParams={Promise.resolve(list.params)} title={list.title} />;
}
