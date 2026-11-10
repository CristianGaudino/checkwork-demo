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
    <div data-testid="gallery">
      <div ref={root} className="group group/pc relative aspect-photo overflow-hidden rounded-tile bg-photo-bg lg:hidden">
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
              <button type="button" aria-label={`View photo ${i + 1} of ${n} larger`} onClick={(e) => openLightbox(i, e.currentTarget)} className="block size-full focus-visible:-outline-offset-2">
                <Image
                  ref={settle}
                  src={photo.src}
                  width={900}
                  height={675}
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
      {/* From 1024px the photos are a grid: four tiles that open the viewer, "Show all" on the last when there are more. */}
      <div data-testid="photo-grid" className={`hidden gap-3 lg:grid ${n === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
        {photos.slice(0, 4).map((photo, i) => (
          <div key={photo.src} className={`relative aspect-photo overflow-hidden rounded-tile bg-photo-bg ${n === 3 && i === 0 ? "col-span-2" : ""}`}>
            <button type="button" aria-label={`View photo ${i + 1} of ${n} larger`} onClick={(e) => openLightbox(i, e.currentTarget)} className="group/tile block size-full focus-visible:-outline-offset-2">
              <Image
                src={photo.src}
                width={900}
                height={675}
                alt=""
                loading={i === 0 ? "eager" : "lazy"}
                fetchPriority={i === 0 ? "high" : undefined}
                decoding={i === 0 ? undefined : "async"}
                draggable={false}
                className="size-full object-cover transition-transform duration-300 group-hover/tile:scale-[1.02] motion-reduce:transition-none"
              />
            </button>
            <Brandmark />
            {i === 3 && n > 4 && (
              <span aria-hidden="true" className="pointer-events-none absolute bottom-3 right-3 rounded-full bg-card/90 px-4 py-2 text-meta font-semibold text-text">
                Show all {n} photos
              </span>
            )}
          </div>
        ))}
      </div>
      <PhotoLightbox photos={photos} name={name} dialogRef={dialog} index={lightIndex} onIndex={setLightIndex} onClose={() => opener.current?.focus()} />
    </div>
  );
}
