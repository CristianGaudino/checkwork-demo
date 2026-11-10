import Link from "next/link";
import { carName } from "@/lib/stock/format";
import { HOME } from "@/lib/home.config";
import type { Car } from "@/lib/stock/types";

// The hero's picture side: one big photo and the newest cars as tiles. The photo is the card. Decorative tiles have no alt; each car
// tile is a link named for the car. A phone stacks it under the search, two tiles wide.
export function HeroMosaic({ cars }: { cars: Car[] }) {
  const tiles = cars.filter((c) => c.photos[0]).slice(0, HOME.heroCarTiles);
  return (
    <div className="grid grid-cols-2 gap-3 lg:gap-4">
      <div className="col-span-2 aspect-[21/9] overflow-hidden rounded-[20px] bg-photo-bg">
        {/* eslint-disable-next-line @next/next/no-img-element -- a fixed local file, sized by its box */}
        <img src={HOME.heroPhoto} alt="" width={1920} height={819} fetchPriority="high" className="size-full object-cover" />
      </div>
      {tiles.map((car) => (
        <Link key={car.id} href={`/used-cars/${car.slug}`} aria-label={carName(car)} className="group relative aspect-[4/3] overflow-hidden rounded-[20px] bg-photo-bg">
          {/* eslint-disable-next-line @next/next/no-img-element -- a local /stock file, sized by its box */}
          <img src={car.photos[0].src} alt="" width={car.photos[0].width} height={car.photos[0].height} loading="lazy" className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.03] motion-reduce:transition-none" />
        </Link>
      ))}
    </div>
  );
}
