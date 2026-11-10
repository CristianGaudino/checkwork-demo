import type { Metadata } from "next";
import { connection } from "next/server";
import { VehicleListPage } from "@/components/stock/VehicleListPage";
import { DEALER_ADDRESS } from "@/lib/site";

export const metadata: Metadata = { title: "New cars", description: `New cars from the makes we sell, at our dealership in ${DEALER_ADDRESS.town}.` };

export default async function Page({ searchParams }: { searchParams: Promise<{ make?: string }> }) {
  await connection();
  return <VehicleListPage condition="new" make={(await searchParams).make} />;
}
