import { BookDriveForm } from "@/components/admin/AddDriveForm";
import Link from "next/link";
import { PageHeader, adminButtonQuiet } from "@/components/admin/kit";
import { carCards } from "@/lib/admin/car-cards";
import { drivesStore, getSettings } from "@/lib/admin/collections";
import { slotData } from "@/lib/admin/drives";
import { adminCars } from "@/lib/admin/stock-admin";
import { currentMember } from "@/lib/permissions";
import { forSale } from "@/lib/stock/types";

export const metadata = { title: "Book a test drive" };

// A booking taken by phone or at the desk, in steps. ?car= starts on that car.
export default async function Page({ searchParams }: { searchParams: Promise<{ car?: string }> }) {
  const sp = await searchParams;
  const [cars, drives, settings, me] = await Promise.all([adminCars(), drivesStore.list(), getSettings(), currentMember()]);
  const onSale = cars.filter(forSale).sort((a, b) => Number(b.id) - Number(a.id));
  return (
    <>
      <PageHeader title="Book a test drive" actions={<Link href="/dashboard/test-drives" className={adminButtonQuiet}>Test drives</Link>} />
      <BookDriveForm cars={carCards(onSale)} team={settings.team.map((t) => t.name)} me={me.name} slots={{ ...slotData(drives), windowMin: settings.driveSlotMinutes }} initialCar={sp.car ?? ""} />
    </>
  );
}
