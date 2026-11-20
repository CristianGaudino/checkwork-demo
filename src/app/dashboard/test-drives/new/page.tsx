import { BookDriveForm } from "@/components/admin/AddDriveForm";
import { PageHeader } from "@/components/admin/kit";
import { carCards } from "@/lib/admin/car-cards";
import { drivesStore, getSettings, leadsStore } from "@/lib/admin/collections";
import { slotData } from "@/lib/admin/drives";
import { adminCars } from "@/lib/admin/stock-admin";
import { currentMember } from "@/lib/permissions";
import { forSale } from "@/lib/stock/types";

export const metadata = { title: "Book a test drive" };

// A booking taken by phone or at the desk, in steps. ?car= starts on that car; ?lead= (Book a test drive on a lead) fills in their car,
// name and number, so booking from a call is a time and a press.
export default async function Page({ searchParams }: { searchParams: Promise<{ car?: string; lead?: string }> }) {
  const sp = await searchParams;
  const [cars, drives, settings, me, lead] = await Promise.all([adminCars(), drivesStore.list(), getSettings(), currentMember(), sp.lead ? leadsStore.get(sp.lead.slice(0, 80)) : undefined]);
  const onSale = cars.filter(forSale).sort((a, b) => Number(b.id) - Number(a.id));
  return (
    <>
      <PageHeader title="Book a test drive" back={{ href: "/dashboard/test-drives", label: "Test drives" }} />
      <BookDriveForm cars={carCards(onSale)} team={settings.team.map((t) => t.name)} me={me.name} slots={{ ...slotData(drives), windowMin: settings.driveSlotMinutes }} initialCar={sp.car ?? lead?.carSlug ?? ""} person={lead && { name: lead.name, phone: lead.phone, email: lead.email }} />
    </>
  );
}
