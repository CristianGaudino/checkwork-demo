import { StockListPage, stockListMetadata } from "@/components/stock/StockListPage";

export const generateMetadata = ({ searchParams }: PageProps<"/used-cars">) => stockListMetadata("used", searchParams);

export default function UsedCarsPage({ searchParams }: PageProps<"/used-cars">) {
  return <StockListPage condition="used" searchParams={searchParams} />;
}
