import Image from "next/image";
import { pageTitle } from "@/components/ui";
import type { Photo } from "@/lib/stock/types";

// The title and the one line under it that every page opens with. `actions` (a call button, say) sit on the right, level with the title, from
// 1024px, and under it on a phone.
// `picture`: the page's own picture (PagePhoto, PageCar) beside the title from 1024px, so the page opens like home does; under the words on
// a phone, short (or left out), so the page's work still starts high. The actions then go under the intro.
export function PageHeading({ title, intro, actions, picture }: { title: string; intro?: React.ReactNode; actions?: React.ReactNode; picture?: React.ReactNode }) {
  const words = (
    <div>
      <h1 className={pageTitle}>{title}</h1>
      {intro && <p className="mt-2 max-w-measure text-pretty text-body">{intro}</p>}
    </div>
  );
  const buttons = actions && <div className={`mt-6 flex flex-col gap-3 sm:flex-row ${picture ? "" : "lg:mt-0 lg:shrink-0"}`}>{actions}</div>;
  if (picture) {
    return (
      <div className="grid grid-cols-1 items-center gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] lg:gap-12">
        <div>
          {words}
          {buttons}
        </div>
        {picture}
      </div>
    );
  }
  return (
    <div className={actions ? "lg:flex lg:items-end lg:justify-between lg:gap-8" : undefined}>
      {words}
      {buttons}
    </div>
  );
}

// A photo of the place (the forecourt, the showroom): wide and short on a phone, 4:3 beside the title.
// `position` (an object-position class) picks the part that survives the wide crop on a phone, when the middle is the wrong part.
export function PagePhoto({ src, width, height, position = "" }: { src: string; width: number; height: number; position?: string }) {
  return <Image src={src} width={width} height={height} alt="" priority sizes="(min-width: 1024px) 26rem, 100vw" className={`aspect-[21/9] w-full rounded-tile object-cover lg:aspect-[16/10] ${position}`} />;
}

// A car from the stock on its lit plinth, as on the cards: for the pages about buying one (finance, trade-in). Not on a phone: it is
// decoration, and there the form comes first. Not `priority`: a lazy image that is hidden is never downloaded.
export function PageCar({ photo }: { photo?: Photo }) {
  if (!photo) return null;
  return (
    <span className="hidden aspect-[21/9] overflow-hidden rounded-tile bg-photo-bg sm:block lg:aspect-[16/10]">
      <Image src={photo.src} width={photo.width} height={photo.height} alt="" sizes="(min-width: 1024px) 26rem, 100vw" className="size-full object-contain" />
    </span>
  );
}
