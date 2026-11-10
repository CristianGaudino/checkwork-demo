import Link from "next/link";
import { notFound } from "next/navigation";
import { CarForm } from "@/components/admin/CarForm";
import { PageHeader, adminButtonQuiet } from "@/components/admin/kit";
import { adminCar } from "@/lib/admin/stock-admin";
import { carName } from "@/lib/stock/format";

export const metadata = { title: "Edit car" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const car = await adminCar(id);
  if (!car) notFound();
  return (
    <>
      <PageHeader title={carName(car)} text="Change anything and save. The site updates within seconds." actions={<Link href={`/used-cars/${car.slug}`} className={adminButtonQuiet}>View on the site</Link>} />
      <CarForm car={car} />
    </>
  );
}
