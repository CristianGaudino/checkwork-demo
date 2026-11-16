import { sniffImage } from "@/lib/leads/photos";

// What may go into the media library (#177). Pure, so the browser can say no early and the server checks the same numbers again.
// Videos are kept modest on the demo: the whole upload travels in one server action (18 MB limit in next.config.ts).
export const MEDIA_LIMITS = { imageBytes: 5 * 1024 * 1024, videoBytes: 15 * 1024 * 1024, videoSeconds: 90, items: 200 } as const;
export const MEDIA_ACCEPT = "image/jpeg,image/png,image/webp,video/mp4,video/quicktime";

// MP4 and MOV both start with a box whose type at byte 4 is "ftyp"; "qt  " is a MOV.
export function sniffVideo(b: Uint8Array): { ext: "mp4" | "mov"; contentType: string } | null {
  if (b.length < 12 || String.fromCharCode(b[4], b[5], b[6], b[7]) !== "ftyp") return null;
  return String.fromCharCode(b[8], b[9], b[10], b[11]) === "qt  " ? { ext: "mov", contentType: "video/quicktime" } : { ext: "mp4", contentType: "video/mp4" };
}

export type Checked = { ok: true; kind: "image" | "video"; ext: "jpg" | "png" | "webp" | "mp4" | "mov"; contentType: string } | { ok: false; error: string };
// `seconds` is what the browser read from the video: it can be wrong or missing, so it is only a loose check (the networks check the real one).
export function checkUpload(bytes: Uint8Array, seconds?: number): Checked {
  const img = sniffImage(bytes);
  if (img) return bytes.length > MEDIA_LIMITS.imageBytes ? { ok: false, error: "That photo is too big. Photos can be up to 5 MB." } : { ok: true, kind: "image", ext: img.ext, contentType: img.contentType };
  const vid = sniffVideo(bytes);
  if (!vid) return { ok: false, error: "Add a JPEG, PNG or WebP photo, or an MP4 or MOV video." };
  if (bytes.length > MEDIA_LIMITS.videoBytes) return { ok: false, error: "That video is too big. Videos can be up to 15 MB here." };
  if (seconds === undefined || !Number.isFinite(seconds) || seconds <= 0 || seconds > MEDIA_LIMITS.videoSeconds) return { ok: false, error: `Videos can be up to ${MEDIA_LIMITS.videoSeconds} seconds.` };
  return { ok: true, kind: "video", ext: vid.ext, contentType: vid.contentType };
}
