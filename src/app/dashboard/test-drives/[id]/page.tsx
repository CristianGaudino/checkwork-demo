import Link from "next/link";
import { notFound } from "next/navigation";
import { ActButton } from "@/components/admin/ActButton";
import { MoveDriveForm } from "@/components/admin/AddDriveForm";
import { DriveStatusBadge } from "@/components/admin/badges";
import { Badge, PageHeader, Panel, adminButtonQuiet, choicePill, rowButton } from "@/components/admin/kit";
import { DRIVE_STATUS_LABELS, drivesStore, getSettings, type DriveStatus } from "@/lib/admin/collections";
import { isOpenDrive, slotData } from "@/lib/admin/drives";
import { fmtDateTime } from "@/lib/admin/format";
import { adminCars } from "@/lib/admin/stock-admin";
import { telHref } from "@/lib/phone";
import { TIME_ZONE } from "@/lib/site";
import { forSale } from "@/lib/stock/types";
import { assignDriveAction, setDriveStatusAction } from "../actions";

export const metadata = { title: "Test drive" };

const when = new Intl.DateTimeFormat("en-IE", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZone: TIME_ZONE });
const NEXT: Partial<Record<DriveStatus, [DriveStatus, string][]>> = {
  requested: [["confirmed", "Confirm"], ["cancelled", "Cancel"]],
  confirmed: [["completed", "Mark done"], ["no-show", "No show"], ["cancelled", "Cancel"]],
};

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
      <PageHeader title={d.name} text={`${d.carTitle}, ${when.format(d.startsAt)}`} actions={<Link href="/dashboard/test-drives" className={adminButtonQuiet}>Test drives</Link>} />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="flex min-w-0 flex-col gap-6">
          <Panel title="The booking">
            <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
              {[
                ["When", when.format(d.startsAt)],
                ["Car", car ? <span key="c" className="flex flex-wrap items-center gap-2"><Link href={`/dashboard/stock/${car.id}`} className="underline">{d.carTitle}</Link>{open && !forSale(car) && <Badge tone="warn">No longer for sale</Badge>}</span> : d.carTitle],
                ["Phone", <a key="p" href={telHref(d.phone) ?? undefined} className="underline">{d.phone}</a>],
                ["Email", d.email ? <a key="e" href={`mailto:${d.email}`} className="underline [overflow-wrap:anywhere]">{d.email}</a> : "Not given"],
                ["Notes", d.notes || "None"],
                ["Booked", fmtDateTime(d.createdAt)],
              ].map(([k, v]) => (
                <div key={String(k)} className="flex flex-col">
                  <dt className="text-meta text-text-2">{k}</dt>
                  <dd className="text-body">{v}</dd>
                </div>
              ))}
            </dl>
          </Panel>
          {open && (
            <Panel title="Change the time">
              <MoveDriveForm id={d.id} carSlug={d.carSlug} slots={{ ...slotData(drives, d.id), windowMin: settings.driveSlotMinutes }} />
            </Panel>
          )}
        </div>
        <div className="flex min-w-0 flex-col gap-6 max-lg:order-first">
          <Panel title="Status" action={<DriveStatusBadge status={d.status} />}>
            {(NEXT[d.status] ?? []).length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {(NEXT[d.status] ?? []).map(([to, label]) => (
                  <ActButton key={to} act={setDriveStatusAction.bind(null, d.id, to)} undo={setDriveStatusAction.bind(null, d.id, d.status)} done={`${d.name}: ${DRIVE_STATUS_LABELS[to]}`} className={`${rowButton} ${to === "cancelled" ? "text-bad" : ""}`}>
                    {label}
                  </ActButton>
                ))}
              </div>
            ) : (
              <p className="text-body text-text-2">Nothing more to do.</p>
            )}
          </Panel>
          <Panel title="Taking them out">
            <div className="flex flex-wrap gap-2">
              {[...team, ""].map((name) => {
                const on = (d.assignedTo ?? "") === name;
                return (
                  <ActButton key={name || "none"} act={assignDriveAction.bind(null, d.id, name)} undo={assignDriveAction.bind(null, d.id, d.assignedTo ?? "")} done={name ? `Given to ${name}` : "Given to nobody"} pressed={on} className={choicePill(on)}>
                    {name || "Nobody yet"}
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
