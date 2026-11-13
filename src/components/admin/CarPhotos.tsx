"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addCarPhotoAction, carPhotoAction } from "@/app/dashboard/stock/actions";
import { downscale } from "@/components/leads/downscale";
import type { Photo } from "@/lib/stock/types";
import { ActButton } from "./ActButton";
import { CarThumb } from "./CarThumb";
import { Panel, adminButtonQuiet, rowButton } from "./kit";

// A car's photos (#21): add several at once, choose the main one, remove one. Each photo is shrunk on the device to a 1,600px JPEG (which
// also drops its location data) and sent on its own, so a slow connection loses at most one. Our version only: DoneDeal has the photos.
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
          const bmp = await createImageBitmap(jpeg);
          const f = new FormData();
          f.set("photo", jpeg);
          f.set("width", String(bmp.width));
          f.set("height", String(bmp.height));
          bmp.close();
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
      <p className="text-meta text-text-2">The first photo is the one on the car&apos;s card and at the top of its page.</p>
      {photos.length > 0 && (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {photos.map((p, i) => (
            <li key={p.src} className="flex flex-col gap-2">
              <div className="aspect-[4/3] overflow-hidden rounded-control bg-photo-bg">
                <CarThumb src={p.src} />
              </div>
              <div className="flex flex-wrap gap-2">
                {i === 0 ? (
                  <span className="inline-flex h-10 items-center text-meta font-medium text-text-2">Main photo</span>
                ) : (
                  <ActButton act={carPhotoAction.bind(null, carId, p.src, "first")} label={`Make photo ${i + 1} the main photo`} className={rowButton}>
                    Make main
                  </ActButton>
                )}
                <ActButton act={carPhotoAction.bind(null, carId, p.src, "remove")} confirm={{ title: "Remove this photo?", text: "It comes off the website at once.", yes: "Remove" }} label={`Remove photo ${i + 1}`} className={rowButton}>
                  Remove
                </ActButton>
              </div>
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <label className={`${adminButtonQuiet} cursor-pointer ${pending || photos.length >= max ? "pointer-events-none opacity-60" : ""}`}>
          {pending ? "Adding photos" : "Add photos"}
          <input ref={input} type="file" accept="image/jpeg,image/png,image/webp,image/heic" multiple disabled={pending || photos.length >= max} onChange={(e) => add([...(e.target.files ?? [])])} className="sr-only" />
        </label>
        <span aria-live="polite" className="text-meta text-text-2">
          {said || `${photos.length} of ${max}`}
        </span>
      </div>
    </Panel>
    </div>
  );
}
