import { ActButton } from "@/components/admin/ActButton";
import { rowButton } from "@/components/admin/kit";
import { DRIVE_STATUS_LABELS, type TestDrive } from "@/lib/admin/collections";
import { DRIVE_NEXT } from "@/lib/admin/drives";
import { setDriveStatusAction } from "@/app/dashboard/test-drives/actions";

// A booking's next steps (confirm, done, no show, cancel), each with Undo in its toast. Nothing for a booking that is over.
export function DriveSteps({ drive, className = "" }: { drive: Pick<TestDrive, "id" | "name" | "status">; className?: string }) {
  const next = DRIVE_NEXT[drive.status] ?? [];
  if (next.length === 0) return null;
  return (
    <span className={`flex flex-wrap gap-2 ${className}`}>
      {next.map(([to, label]) => (
        <ActButton key={to} act={setDriveStatusAction.bind(null, drive.id, to)} undo={setDriveStatusAction.bind(null, drive.id, drive.status)} done={`${drive.name}: ${DRIVE_STATUS_LABELS[to]}`} className={`${rowButton} ${to === "cancelled" ? "text-bad" : ""}`}>
          {label}
        </ActButton>
      ))}
    </span>
  );
}
