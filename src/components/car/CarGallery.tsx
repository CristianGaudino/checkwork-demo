"use client";

import { swipeRow } from "@/components/ui";
import Image from "next/image";
import { Brandmark } from "@/components/Brandmark";
import { useEffect, useRef, useState } from "react";
import { PhotoArrow } from "@/components/stock/PhotoArrow";
import { counterPill, settle } from "@/components/stock/photo-load";
import type { Photo } from "@/lib/stock/types";
import { PhotoLightbox } from "./PhotoLightbox";
import { useSlideIndex } from "./useSlideIndex";


// Native scroll-snap, as the card carousel. Only photos and a name cross from the server, never the Car.
export function CarGallery({ photos, name }: { photos: Photo[]; name: string }) {
  const [index, setIndex] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const { ref: scroller, onScroll } = useSlideIndex(setIndex);
  const [lightIndex, setLightIndex] = useState(0);
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const n = photos.length;

  // Photos stay visible without JavaScript: the hide-until-loaded style only applies once this attribute is set.
  useEffect(() => root.current?.setAttribute("data-js", ""), []);

  if (n === 0) {
    return (
      <div className="flex aspect-photo items-center justify-center rounded-tile bg-photo-bg">
        <p className="text-meta text-text-2">No photo yet</p>
      </div>
    );
  }
  const show = (i: number) => scroller.current?.scrollTo({ left: i * scroller.current.clientWidth });
  // showModal() first: a closed dialog has no width, so the scroller can only be positioned once it is open (RESEARCH Pitfall 10).
  const openLightbox = (i: number, from: HTMLElement) => {
    opener.current = from;
    setLightIndex(i);
    dialog.current?.showModal();
    const lb = dialog.current?.querySelector<HTMLElement>("[data-lightbox-scroller]");
    lb?.scrollTo({ left: i * lb.clientWidth, behavior: "instant" });
  };
  const atStart = index <= 0;
  const atEnd = index >= n - 1;

  return (
    <div data-testid="gallery" className="flex flex-col gap-3">
      {/* One stage at every width: swipe on a phone, arrows with a mouse, and a press opens the viewer. From 640px every photo is also in a
          strip below; on a phone the strip would push the price off the first screen, and the swipe and counter do the same job. */}
      <div ref={root} className="group group/pc relative aspect-photo overflow-hidden rounded-tile bg-photo-bg">
        <div
          ref={scroller}
          onScroll={onScroll}
          role="group"
          aria-roledescription="carousel"
          aria-label={`Photos of ${name}`}
          className={swipeRow}
        >
          {photos.map((photo, i) => (
            <div key={photo.src} role="group" aria-roledescription="slide" aria-label={`Photo ${i + 1} of ${n}`} className="group/slide relative h-full w-full flex-none snap-start">
              {/* A photo that fails to load leaves the same words as a car with no photos. */}
              <span aria-hidden="true" className="absolute inset-0 hidden items-center justify-center text-meta text-text-2 group-has-[img[data-failed]]/slide:flex">No photo yet</span>
              <button type="button" aria-label={`View photo ${i + 1} of ${n} larger`} onClick={(e) => openLightbox(i, e.currentTarget)} className="block size-full cursor-zoom-in focus-visible:-outline-offset-2">
                <Image
                  ref={settle}
                  src={photo.src}
                  width={1200}
                  height={900}
                  sizes="(min-width: 1024px) 60vw, 100vw"
                  alt={`${name}, photo ${i + 1} of ${n}`}
                  loading={i === 0 ? "eager" : "lazy"}
                  fetchPriority={i === 0 ? "high" : undefined}
                  decoding={i === 0 ? undefined : "async"}
                  draggable={false}
                  className="h-full w-full object-cover transition-opacity duration-150 group-data-[js]/pc:opacity-0 group-data-[js]/pc:data-[loaded]:opacity-100 data-[failed]:invisible"
                />
              </button>
              <Brandmark />
            </div>
          ))}
        </div>
        {n > 1 && (
          <>
            <span aria-hidden="true" className={`${counterPill} bottom-4 right-4`}>
              {index + 1} / {n}
            </span>
            <PhotoArrow dir="previous" disabled={atStart} onClick={() => show(index - 1)} className="left-2" />
            <PhotoArrow dir="next" disabled={atEnd} onClick={() => show(index + 1)} className="right-2" />
          </>
        )}
      </div>
      {n > 1 && (
        <ul aria-label="All photos" className="hidden grid-cols-6 gap-2 sm:grid">
          {photos.map((photo, i) => (
            <li key={photo.src}>
              <button
                type="button"
                aria-label={`Show photo ${i + 1} of ${n}`}
                aria-current={i === index ? "true" : undefined}
                onClick={() => show(i)}
                className={`block aspect-photo w-full overflow-hidden rounded-control bg-photo-bg ring-offset-2 ring-offset-surface transition-[box-shadow,opacity] ${i === index ? "ring-2 ring-accent" : "opacity-80 hover:opacity-100"}`}
              >
                <Image src={photo.src} width={200} height={150} alt="" loading="lazy" draggable={false} className="size-full object-cover" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <PhotoLightbox photos={photos} name={name} dialogRef={dialog} index={lightIndex} onIndex={setLightIndex} onClose={() => opener.current?.focus()} />
    </div>
  );
}
