import { Fragment } from "react";
import { ShieldCheckIcon } from "@/components/stock/icons";
import { historyRows, type HistoryCheck } from "@/lib/history-check";

// "History checked" under the warranty, with the buy box, opening the short report. Native <details>: works without JavaScript. Only a clear check reaches
// here (publicHistory), so the badge never says checked over a problem.
export function HistoryBadge({ check }: { check: HistoryCheck }) {
  return (
    <details className="-mt-2" data-testid="history-check">
      <summary className="inline-flex min-h-11 cursor-pointer list-none items-center gap-2 text-meta font-medium text-ok [&::-webkit-details-marker]:hidden">
        <ShieldCheckIcon className="size-5" />
        <span className="underline underline-offset-2">History checked</span>
      </summary>
      <dl className="mt-1 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 rounded-card border border-hairline bg-card p-4 text-meta">
        {historyRows(check).map(([label, value]) => (
          <Fragment key={label}>
            <dt className="text-text-2">{label}</dt>
            <dd className="font-medium">{value}</dd>
          </Fragment>
        ))}
      </dl>
    </details>
  );
}
