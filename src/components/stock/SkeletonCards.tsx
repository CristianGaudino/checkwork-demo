// Static on purpose: no shimmer (UI-SPEC). The shape of a ListingCard: a bare photo tile with the make, name and meta lines under it, so
// the cars arrive without a jump. `rows` over 3 adds figure rows, the height of a compare card's (py-3 and a 1px rule each).
export function SkeletonCards({ count, rows = 3 }: { count: number; rows?: number }) {
  return Array.from({ length: count }, (_, i) => (
    <div key={i} data-skeleton>
      <div className="aspect-photo rounded-tile bg-photo-bg" />
      <div className="flex flex-col gap-2 px-1 pb-1 pt-3">
        <div>
          <div className="my-[3px] h-[14px] w-24 rounded-control bg-photo-bg" />
          <div className="my-[3px] h-[18px] w-3/4 rounded-control bg-photo-bg" />
        </div>
        <div className="my-[3px] h-[14px] w-1/2 rounded-control bg-photo-bg" />
        {rows > 3 && (
          <div className="divide-y divide-hairline">
            {Array.from({ length: rows - 3 }, (_, r) => (
              <div key={r} className="py-3">
                <div className="my-[3px] h-[18px] rounded-control bg-photo-bg" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  ));
}
