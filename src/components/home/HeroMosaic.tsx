import { HOME } from "@/lib/home.config";

// The hero's picture, behind the section: the dealership photo with the light of a showroom window. Decorative (no alt). Two gradients
// keep the words readable: from the bottom on a phone, from the left on a desktop. A phone gets the 960px file. The last 4rem (7rem from lg) fades into
// the page, so the photo has no hard edge; the section keeps that much room below its content.
// 4:3 photo in a wide box: a slice that keeps the sign and the cars. On a phone the box is tall and the slice narrow: the lit corner, the first car and the checkmark, with no half-letters behind the words.
const photo = "size-full object-cover object-[8%_50%] sm:object-[55%_45%]";

export function HeroMosaic() {
  return (
    <div aria-hidden="true" className="absolute inset-0 -z-10 bg-band [mask-image:linear-gradient(to_bottom,#000_calc(100%-4rem),transparent)] lg:[mask-image:linear-gradient(to_bottom,#000_calc(100%-7rem),transparent)]">
      <img src={HOME.heroPhoto} srcSet={`${HOME.heroPhotoSmall} 960w, ${HOME.heroPhoto} 1448w`} sizes="100vw" alt="" width={1448} height={1086} fetchPriority="high" className={`${photo} dark:hidden`} />
      {/* The dusk photo for the dark theme. Lazy, so a hidden one is never downloaded: the light theme costs nothing extra. */}
      {/* shortcut: the dark theme downloads both (the light one is eager for speed), fine while dark is the visitor's own switch; if dark becomes the default, pick the photo before paint instead. */}
      <img src={HOME.heroPhotoDark} srcSet={`${HOME.heroPhotoDarkSmall} 960w, ${HOME.heroPhotoDark} 1448w`} sizes="100vw" alt="" width={1448} height={1086} loading="lazy" className={`${photo} hidden dark:block`} />
      <div className="absolute inset-0 bg-gradient-to-t from-band/95 via-band/75 to-band/45 lg:bg-gradient-to-r lg:from-band/80 lg:via-band/30 lg:to-transparent" />
    </div>
  );
}
