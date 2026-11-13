import { signText, verifyText } from "@/lib/signing";

// Trade-in photo checks and dealer links (D-13). Pure: the secret is a parameter, so nothing here reads env.

// The type comes from the bytes, never from the file name or the browser's type (T-03-30).
export function sniffImage(b: Uint8Array): { ext: "jpg" | "png" | "webp"; contentType: string } | null {
  const at = (sig: number[], from = 0) => sig.every((x, i) => b[from + i] === x);
  if (at([0xff, 0xd8, 0xff])) return { ext: "jpg", contentType: "image/jpeg" };
  if (at([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return { ext: "png", contentType: "image/png" };
  if (at([0x52, 0x49, 0x46, 0x46]) && at([0x57, 0x45, 0x42, 0x50], 8)) return { ext: "webp", contentType: "image/webp" };
  return null;
}

// A capability link for the dealer email: HMAC-SHA256 over "{key}.{exp}", 7 days by default (research A10).
export async function signPhotoPath(key: string, secret: string, ttlSec = 7 * 86400): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + ttlSec;
  return `/lead-photos/${key}?exp=${exp}&sig=${await signText(`${key}.${exp}`, secret)}`;
}

// An expired, malformed or tampered link is false.
export async function verifyPhotoSig(key: string, exp: string, sig: string, secret: string): Promise<boolean> {
  if (!/^\d{1,12}$/.test(exp) || Number(exp) < Date.now() / 1000) return false;
  return verifyText(`${key}.${exp}`, sig, secret);
}
