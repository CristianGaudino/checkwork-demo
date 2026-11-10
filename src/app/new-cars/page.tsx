import { StockListPage, stockListMetadata } from "@/components/stock/StockListPage";

export const generateMetadata = ({ searchParams }: PageProps<"/new-cars">) => stockListMetadata("new", searchParams);

export default function Page({ searchParams }: PageProps<"/new-cars">) {
  return <StockListPage condition="new" searchParams={searchParams} />;
}
