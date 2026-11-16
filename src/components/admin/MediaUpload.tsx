"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { uploadMediaAction } from "@/app/dashboard/marketing/actions";
import { downscale } from "@/components/leads/downscale";
import { MEDIA_ACCEPT, MEDIA_LIMITS } from "@/lib/admin/media-rules";
import type { MediaItem } from "@/lib/admin/collections";
import { press } from "@/components/ui";
import { PlusIcon } from "@/components/stock/icons";

// Adds photos and videos from this device to the media library (#177). A photo is shrunk here to a 1,600px JPEG (which also drops its
// location data); a video is sent as it is after its length and size are read, so a long one is refused before it travels. Each file is
// sent on its own, so a slow phone connection loses at most one. The server checks the bytes again.
const seconds = (file: File) =>
  new Promise<number>((ok, no) => {
    const v = document.createElement("video");
    const url = URL.createObjectURL(file);
    v.preload = "metadata";
    v.onloadedmetadata = () => { URL.revokeObjectURL(url); ok(v.duration); };
    v.onerror = () => { URL.revokeObjectURL(url); no(new Error("unreadable")); };
    v.src = url;
  });

export function MediaUpload({ accept = MEDIA_ACCEPT, carSlug = "", label = "Add from this device", onAdded }: { accept?: string; carSlug?: string; label?: string; onAdded?: (item: MediaItem) => void }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [said, setSaid] = useState("");
  const [pending, start] = useTransition();

  const add = (files: File[]) =>
    start(async () => {
      let added = 0;
      // A file that fails stops the rest, but the ones already added show at once, not after a reload.
      const stop = (msg: string) => {
        if (added) router.refresh();
        setSaid(msg);
      };
      for (const file of files.slice(0, 10)) {
        setSaid(`Adding ${added + 1} of ${Math.min(files.length, 10)}`);
        try {
          const f = new FormData();
          f.set("name", file.name);
          if (carSlug) f.set("carSlug", carSlug);
          if (file.type.startsWith("video/")) {
            if (file.size > MEDIA_LIMITS.videoBytes) return stop("That video is too big. Videos can be up to 15 MB here.");
            const s = await seconds(file);
            if (!(s > 0) || s > MEDIA_LIMITS.videoSeconds) return stop(`Videos can be up to ${MEDIA_LIMITS.videoSeconds} seconds.`);
            f.set("file", file);
            f.set("seconds", String(s));
          } else {
            const jpeg = await downscale(file, 1600);
            f.set("file", jpeg.blob);
            f.set("width", String(jpeg.width));
            f.set("height", String(jpeg.height));
          }
          const r = await uploadMediaAction(f);
          if (!r.ok) return stop(r.error);
          onAdded?.(r.item);
          added++;
        } catch {
          return stop("That file could not be added. Try another.");
        }
      }
      if (input.current) input.current.value = "";
      router.refresh();
      setSaid(added === 1 ? "Added to your library" : `${added} files added to your library`);
    });

  return (
    <div className="flex flex-col gap-2">
      <label className={`inline-flex h-11 w-fit cursor-pointer items-center justify-center gap-2 rounded-control border border-control bg-card px-5 text-meta font-semibold has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent ${pending ? "opacity-50" : ""} ${press}`}>
        <PlusIcon className="size-4" />
        {label}
        <input ref={input} type="file" accept={accept} multiple disabled={pending} aria-label={label} onChange={(e) => add([...(e.target.files ?? [])])} className="sr-only" />
      </label>
      <p aria-live="polite" className="text-meta text-text-2">{said}</p>
    </div>
  );
}

// The library page's upload: the same control, with a choice of the car the files belong to (or none).
export function LibraryUpload({ cars }: { cars: { slug: string; title: string }[] }) {
  const [slug, setSlug] = useState("");
  return (
    <div className="flex flex-col gap-3">
      <label className="flex max-w-sm flex-col gap-1">
        <span className="text-meta font-semibold">Car, if it belongs to one</span>
        <select value={slug} onChange={(e) => setSlug(e.target.value)} className="h-11 rounded-control border border-control bg-card px-3 text-body">
          <option value="">No car</option>
          {cars.map((c) => <option key={c.slug} value={c.slug}>{c.title}</option>)}
        </select>
      </label>
      <MediaUpload carSlug={slug} label="Add photos or videos" />
    </div>
  );
}
