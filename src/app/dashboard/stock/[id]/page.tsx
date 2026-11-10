import Link from "next/link";
import { notFound } from "next/navigation";
import { CarForm } from "@/components/admin/CarForm";
import { PageHeader, adminButtonQuiet } from "@/components/admin/kit";
import { costsStore } from "@/lib/admin/collections";
import { adminCar } from "@/lib/admin/stock-admin";
import { can } from "@/lib/permissions";
import { carName } from "@/lib/stock/format";

export const metadata = { title: "Edit car" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const car = await adminCar(id);
  if (!car) notFound();
  const cost = (await can("margins")) ? { eur: (await costsStore.get(id))?.costEur } : undefined;
  return (
    <>
      <PageHeader title={carName(car)} actions={<Link href={`/used-cars/${car.slug}`} className={adminButtonQuiet}>View on the site</Link>} />
      <CarForm car={car} cost={cost} />
    </>
  );
}
