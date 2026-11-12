import { Panel, adminButtonQuiet } from "@/components/admin/kit";
import { SyncIcon } from "@/components/stock/icons";
import { syncNowAction } from "@/app/dashboard/stock/actions";
import { fmtAgo } from "@/lib/admin/format";
import type { SyncStatus } from "@/lib/donedeal/sync";

// How the DoneDeal sync is doing, and Sync now. On Stock, Overview and Settings for a dealer whose stock comes from DoneDeal.
// `canForce`: owners and managers may apply a sync that was held because DoneDeal's answer looked wrong (it can take many cars off the site).
const counts = (r: NonNullable<SyncStatus["result"]>) =>
  [r.added && `${r.added} added`, r.changed && `${r.changed} changed`, r.takenDown && `${r.takenDown} taken down`].filter(Boolean).join(", ") || "Nothing had changed";

export function syncLine(s: SyncStatus) {
  if (!s.lastRunAt) return "Not synced yet.";
  if (!s.problem) return `Last synced ${fmtAgo(s.lastOkAt!)}. ${counts(s.result ?? { added: 0, changed: 0, takenDown: 0 })}.`;
  return `${s.problem} ${s.lastOkAt ? `The site shows the stock from the last good sync, ${fmtAgo(s.lastOkAt)}.` : "Nothing has synced yet."}`;
}

export function SyncPanel({ status, canForce, title = "DoneDeal sync" }: { status: SyncStatus; canForce: boolean; title?: string }) {
  return (
    <Panel title={title}>
      <p role="status" className={`max-w-measure text-body ${status.problem ? "rounded-control bg-warn-soft px-4 py-3 text-warn" : "text-text-2"}`}>
        {syncLine(status)}
      </p>
      <div className="flex flex-wrap gap-2">
        <form action={syncNowAction.bind(null, false)}>
          <button type="submit" className={adminButtonQuiet}>
            <SyncIcon className="size-4" />
            Sync now
          </button>
        </form>
        {status.held && canForce && (
          <form action={syncNowAction.bind(null, true)}>
            <button type="submit" className={adminButtonQuiet}>
              Apply anyway
            </button>
          </form>
        )}
      </div>
    </Panel>
  );
}
