import { StockListPage, stockListMetadata } from "@/components/stock/StockListPage";

export const generateMetadata = ({ searchParams }: PageProps<"/commercial">) => stockListMetadata("commercial", searchParams);

export default function Page({ searchParams }: PageProps<"/commercial">) {
  return <StockListPage condition="commercial" searchParams={searchParams} />;
}
