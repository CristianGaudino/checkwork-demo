import { notFound } from "next/navigation";
import { StockListPage } from "@/components/stock/StockListPage";
import { makeListMetadata, makeListParams } from "@/lib/stock/make-list";

// /new-cars/<make>: the new cars list, already filtered to one make (the make page links here).
export const generateMetadata = async ({ params }: PageProps<"/new-cars/[make]">) => makeListMetadata("new", (await params).make);

export default async function Page({ params, searchParams }: PageProps<"/new-cars/[make]">) {
  const sp = await makeListParams((await params).make, searchParams);
  if (!sp) notFound();
  return <StockListPage condition="new" searchParams={Promise.resolve(sp)} />;
}
