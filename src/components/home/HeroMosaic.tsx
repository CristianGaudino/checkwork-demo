import { HOME } from "@/lib/home.config";

// The hero's picture, behind the section: the dealership photo with the light of a showroom window. Decorative (no alt). Two gradients
// keep the words readable: from the bottom on a phone, from the left on a desktop. A phone gets the 960px file. The last 7rem fades into the
// page, so the photo has no hard edge; the section keeps that much room below its content.
export function HeroMosaic() {
  return (
    <div aria-hidden="true" className="absolute inset-0 -z-10 bg-band [mask-image:linear-gradient(to_bottom,#000_calc(100%-7rem),transparent)]">
      {/* eslint-disable-next-line @next/next/no-img-element -- a fixed local file, sized by its box */}
      <img src={HOME.heroPhoto} srcSet={`${HOME.heroPhotoSmall} 960w, ${HOME.heroPhoto} 1920w`} sizes="100vw" alt="" width={1920} height={819} fetchPriority="high" className="size-full object-cover object-[60%_top]" />
      <div className="absolute inset-0 bg-gradient-to-t from-band/95 via-band/75 to-band/45 lg:bg-gradient-to-r lg:from-band/80 lg:via-band/30 lg:to-transparent" />
    </div>
  );
}
