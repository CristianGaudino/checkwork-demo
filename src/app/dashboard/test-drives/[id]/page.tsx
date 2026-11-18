import Link from "next/link";
import { notFound } from "next/navigation";
import { ActButton } from "@/components/admin/ActButton";
import { MoveDriveForm } from "@/components/admin/AddDriveForm";
import { DriveStatusBadge } from "@/components/admin/badges";
import { DriveSteps } from "@/components/admin/DriveSteps";
import { Badge, Facts, PageHeader, Panel, choicePill } from "@/components/admin/kit";
import { drivesStore, getSettings } from "@/lib/admin/collections";
import { DRIVE_NEXT, isOpenDrive, slotData } from "@/lib/admin/drives";
import { dublinDay, fmtDateTime, fmtDay, fmtTime } from "@/lib/admin/format";
import { adminCars } from "@/lib/admin/stock-admin";
import { telHref } from "@/lib/phone";
import { forSale } from "@/lib/stock/types";
import { assignDriveAction } from "../actions";
import { ContactButtons } from "@/components/admin/ContactButtons";

export const metadata = { title: "Test drive" };

const when = (t: number) => `${fmtDay(dublinDay(t))}, ${fmtTime(t)}`;

// One booking: who, which car, when; its next step and who takes them out (each with Undo); and moving it to another free time.
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const d = await drivesStore.get(id);
  if (!d) notFound();
  const [cars, drives, settings] = await Promise.all([adminCars(), drivesStore.list(), getSettings()]);
  const car = cars.find((c) => c.slug === d.carSlug);
  const open = isOpenDrive(d);
  const team = settings.team.map((t) => t.name);
  return (
    <>
      <PageHeader title={d.name} text={`${d.carTitle}, ${fmtDateTime(d.startsAt)}`} back={{ href: "/dashboard/test-drives", label: "Test drives" }} />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="flex min-w-0 flex-col gap-6">
          <Panel title="The booking">
            <Facts
              items={[
                ["When", when(d.startsAt)],
                ["Car", car ? <span key="c" className="flex flex-wrap items-center gap-2"><Link href={`/dashboard/stock/${car.id}`} className="underline">{d.carTitle}</Link>{open && !forSale(car) && <Badge tone="warn">No longer for sale</Badge>}</span> : d.carTitle],
                ["Phone", <a key="p" href={telHref(d.phone) ?? undefined} className="underline">{d.phone}</a>],
                ["Email", d.email ? <a key="e" href={`mailto:${d.email}`} className="underline [overflow-wrap:anywhere]">{d.email}</a> : "Not given"],
                ["Notes", d.notes || "None"],
                ["Booked", fmtDateTime(d.createdAt)],
              ] as const}
            />
          </Panel>
          {open && (
            <Panel title="Change the time">
              <MoveDriveForm id={d.id} carSlug={d.carSlug} slots={{ ...slotData(drives, d.id), windowMin: settings.driveSlotMinutes }} />
            </Panel>
          )}
        </div>
        <div className="flex min-w-0 flex-col gap-6 max-lg:order-first">
          <Panel title="Contact">
            <ContactButtons phone={d.phone} email={d.email || undefined} />
          </Panel>
          <Panel title="Status" action={<DriveStatusBadge status={d.status} />}>
            {DRIVE_NEXT[d.status] ? <DriveSteps drive={d} /> : <p className="text-body text-text-2">Nothing more to do.</p>}
          </Panel>
          <Panel title="Taking them out">
            <div className="flex flex-wrap gap-2">
              {["", ...team].map((name) => {
                const on = (d.assignedTo ?? "") === name;
                return (
                  <ActButton key={name || "none"} act={assignDriveAction.bind(null, d.id, name)} undo={assignDriveAction.bind(null, d.id, d.assignedTo ?? "")} done={name ? `Given to ${name}` : "Given to nobody"} pressed={on} className={choicePill(on)}>
                    {name || "Nobody"}
                  </ActButton>
                );
              })}
            </div>
          </Panel>
        </div>
      </div>
    </>
  );
}
