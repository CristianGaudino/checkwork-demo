import type { Metadata } from "next";
import { connection } from "next/server";
import { VehicleListPage } from "@/components/stock/VehicleListPage";
import { DEALER_ADDRESS } from "@/lib/site";

export const metadata: Metadata = { title: "Commercial vehicles", description: `Vans and light commercial vehicles, priced without VAT, at our dealership in ${DEALER_ADDRESS.town}.` };

export default async function Page({ searchParams }: { searchParams: Promise<{ make?: string }> }) {
  await connection();
  return <VehicleListPage condition="commercial" make={(await searchParams).make} />;
}
