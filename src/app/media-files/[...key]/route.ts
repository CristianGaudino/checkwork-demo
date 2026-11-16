import { MEDIA_KEY, mediaType } from "@/lib/admin/media";
import { getBindings } from "@/lib/leads/bindings";

// A photo or video from the dealer's media library (src/lib/admin/media.ts). Public, like a published post's picture, and only under media/:
// the trade-in and lead photos in the same bucket never answer here. Each key is new per upload, so a file never changes and caches for a year.
export async function GET(_req: Request, { params }: { params: Promise<{ key: string[] }> }) {
  const key = (await params).key.join("/");
  if (!MEDIA_KEY.test(key)) return new Response(null, { status: 404 });
  const object = await getBindings().LEAD_PHOTOS?.get(key);
  if (!object) return new Response(null, { status: 404 });
  return new Response(object.body, { headers: { "Content-Type": mediaType(key), "Cache-Control": "public, max-age=31536000, immutable", "X-Content-Type-Options": "nosniff" } });
}
