import { card } from "@/components/ui";

// Static on purpose: no shimmer (UI-SPEC). The shape of a ListingCard: a bare photo tile with the make, name and meta lines under it, so
// the cars arrive without a jump. `boxed` is a compare card's shape instead: a framed card with the make and name, then `figures` rows
// the height of its figure rows (py-3 and a 1px rule each).
export function SkeletonCards({ count, boxed = false, figures = 0 }: { count: number; boxed?: boolean; figures?: number }) {
  return Array.from({ length: count }, (_, i) => (
    <div key={i} data-skeleton className={boxed ? `overflow-hidden ${card}` : undefined}>
      <div className={`aspect-photo bg-photo-bg ${boxed ? "" : "rounded-tile"}`} />
      <div className={boxed ? "flex flex-col gap-0.5 p-4 pb-2" : "flex flex-col gap-2 px-1 pb-1 pt-3"}>
        <div>
          <div className="my-[3px] h-[14px] w-24 rounded-control bg-photo-bg" />
          <div className="my-[3px] h-[18px] w-3/4 rounded-control bg-photo-bg" />
        </div>
        {!boxed && <div className="my-[3px] h-[14px] w-1/2 rounded-control bg-photo-bg" />}
      </div>
      {figures > 0 && (
        <div className="divide-y divide-hairline px-4 pb-2">
          {Array.from({ length: figures }, (_, r) => (
            <div key={r} className="py-3">
              <div className="my-[3px] h-[18px] rounded-control bg-photo-bg" />
            </div>
          ))}
        </div>
      )}
    </div>
  ));
}
