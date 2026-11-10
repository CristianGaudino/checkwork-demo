import { HOME } from "@/lib/home.config";

// The hero's picture side: one big photo, decorative (no alt). The featured cars section below is where the stock starts.
export function HeroMosaic() {
  return (
    <div className="aspect-[21/9] overflow-hidden rounded-[20px] bg-photo-bg">
      {/* eslint-disable-next-line @next/next/no-img-element -- a fixed local file, sized by its box */}
      <img src={HOME.heroPhoto} alt="" width={1920} height={819} fetchPriority="high" className="size-full object-cover" />
    </div>
  );
}
