"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addCarPhotoAction, carPhotoAction } from "@/app/dashboard/stock/actions";
import { downscale } from "@/components/leads/downscale";
import { PHOTO_TYPES } from "@/lib/leads/constants";
import type { Photo } from "@/lib/stock/types";
import { ActButton } from "./ActButton";
import { CarThumb } from "./CarThumb";
import { Panel, adminButtonQuiet, rowButton } from "./kit";

// The photos with their buttons, the first marked as the main one. The same for a saved car and one being added.
function PhotoGrid({ srcs, makeMain, remove }: { srcs: string[]; makeMain: (src: string, i: number) => React.ReactNode; remove: (src: string, i: number) => React.ReactNode }) {
  return (
    <>
      <p className="text-meta text-text-2">The first photo is the one on the car&apos;s card and at the top of its page.</p>
      {srcs.length > 0 && (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {srcs.map((src, i) => (
            <li key={src} className="flex flex-col gap-2">
              <div className="aspect-[4/3] overflow-hidden rounded-control bg-photo-bg">
                <CarThumb src={src} />
              </div>
              <div className="flex flex-wrap gap-2">
                {i === 0 ? <span className="inline-flex h-10 items-center text-meta font-medium text-text-2">Main photo</span> : makeMain(src, i)}
                {remove(src, i)}
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

// A car's photos (#21): add several at once, choose the main one, remove one. Each photo is shrunk on the device to a 1,600px JPEG (which
// also drops its location data) and sent on its own, so a slow connection loses at most one. Our version only: DoneDeal has the photos.
// The same types as the trade-in form: with HEIC left out, an iPhone hands over a JPEG itself.
export function CarPhotos({ carId, photos, max }: { carId: string; photos: Photo[]; max: number }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [said, setSaid] = useState("");
  const [pending, start] = useTransition();

  const add = (files: File[]) =>
    start(async () => {
      const room = max - photos.length;
      let added = 0;
      let failed = false;
      for (const file of files.slice(0, room)) {
        setSaid(`Adding photo ${added + 1} of ${Math.min(files.length, room)}`);
        try {
          const jpeg = await downscale(file, 1600);
          const f = new FormData();
          f.set("photo", jpeg.blob);
          f.set("width", String(jpeg.width));
          f.set("height", String(jpeg.height));
          const r = await addCarPhotoAction(carId, f);
          if (r.error) {
            setSaid(r.error);
            failed = true;
            break;
          }
          added++;
        } catch {
          setSaid("That photo could not be added. Try another.");
          failed = true;
          break;
        }
      }
      if (input.current) input.current.value = "";
      router.refresh();
      if (failed) return;
      if (added === files.length) setSaid(added === 1 ? "Photo added" : `${added} photos added`);
      else if (files.length > room) setSaid(`Added ${added}. A car can have ${max} photos.`);
    });

  return (
    <div id="photos" className="scroll-mt-24">
    <Panel title="Photos">
      <PhotoGrid srcs={photos.map((p) => p.src)} makeMain={(src, i) => (
        <ActButton act={carPhotoAction.bind(null, carId, src, "first")} label={`Make photo ${i + 1} the main photo`} className={rowButton}>
          Make main
        </ActButton>
      )} remove={(src, i) => (
        <ActButton act={carPhotoAction.bind(null, carId, src, "remove")} confirm={{ title: "Remove this photo?", text: "It comes off the website at once.", yes: "Remove" }} label={`Remove photo ${i + 1}`} className={rowButton}>
          Remove
        </ActButton>
      )} />
      <div className="flex flex-wrap items-center gap-3">
        <label className={`${adminButtonQuiet} cursor-pointer ${pending || photos.length >= max ? "pointer-events-none opacity-60" : ""}`}>
          {pending ? "Adding photos" : "Add photos"}
          <input ref={input} type="file" accept={PHOTO_TYPES.join(",")} multiple disabled={pending || photos.length >= max} onChange={(e) => add([...(e.target.files ?? [])])} className="sr-only" />
        </label>
        <span aria-live="polite" className="text-meta text-text-2">
          {said || `${photos.length} of ${max}`}
        </span>
      </div>
    </Panel>
    </div>
  );
}

// Photos for a car being added (CarForm): shrunk here the same way, held in the page, and sent with the form when it is saved, so the car
// goes on the website with them. Saved first, the car has none of its own yet to add them to one by one.
export type PickedPhoto = { blob: Blob; width: number; height: number; url: string };
const SEND_MAX_BYTES = 15 * 1024 * 1024; // under the server actions' 18 MB body limit (next.config.ts), with room for the form

export function NewCarPhotos({ photos, onChange, max, error }: { photos: PickedPhoto[]; onChange: (photos: PickedPhoto[]) => void; max: number; error?: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [said, setSaid] = useState("");
  const [pending, start] = useTransition();

  const add = (files: File[]) =>
    start(async () => {
      setSaid("");
      const next = [...photos];
      let bytes = next.reduce((n, p) => n + p.blob.size, 0);
      for (const file of files) {
        if (next.length >= max) {
          setSaid(`A car can have ${max} photos.`);
          break;
        }
        try {
          const jpeg = await downscale(file, 1600);
          if (bytes + jpeg.blob.size > SEND_MAX_BYTES) {
            setSaid("That is all that can go with the form. Add the rest once the car is saved.");
            break;
          }
          bytes += jpeg.blob.size;
          next.push({ ...jpeg, url: URL.createObjectURL(jpeg.blob) });
        } catch {
          setSaid("That photo could not be added. Try another.");
          break;
        }
      }
      if (input.current) input.current.value = "";
      onChange(next);
    });
  const remove = (i: number) => {
    URL.revokeObjectURL(photos[i].url);
    onChange(photos.filter((_, j) => j !== i));
  };
  const first = (i: number) => onChange([photos[i], ...photos.filter((_, j) => j !== i)]);

  return (
    <Panel title="Photos">
      <PhotoGrid srcs={photos.map((p) => p.url)} makeMain={(_, i) => (
        <button type="button" onClick={() => first(i)} aria-label={`Make photo ${i + 1} the main photo`} className={rowButton}>
          Make main
        </button>
      )} remove={(_, i) => (
        <button type="button" onClick={() => remove(i)} aria-label={`Remove photo ${i + 1}`} className={rowButton}>
          Remove
        </button>
      )} />
      <div className="flex flex-wrap items-center gap-3">
        <label className={`${adminButtonQuiet} cursor-pointer ${pending || photos.length >= max ? "pointer-events-none opacity-60" : ""}`}>
          {pending ? "Adding photos" : "Add photos"}
          <input ref={input} type="file" accept={PHOTO_TYPES.join(",")} multiple disabled={pending || photos.length >= max} onChange={(e) => add([...(e.target.files ?? [])])} className="sr-only" />
        </label>
        <span aria-live="polite" className="text-meta text-text-2">
          {said || `${photos.length} of ${max}`}
        </span>
      </div>
      {error && <p className="text-meta text-destructive">{error}</p>}
    </Panel>
  );
}
