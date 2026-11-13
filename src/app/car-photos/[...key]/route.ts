import { CAR_PHOTO_KEY } from "@/lib/admin/car-photos";
import { getBindings } from "@/lib/leads/bindings";

// A car's photo added in the dashboard (src/lib/admin/car-photos.ts). Public, like the car's page, and only under cars/: the trade-in
// photos in the same bucket never answer here. Each key is new per upload, so a photo never changes and caches for a year.
export async function GET(_req: Request, { params }: { params: Promise<{ key: string[] }> }) {
  const key = (await params).key.join("/");
  if (!CAR_PHOTO_KEY.test(key)) return new Response(null, { status: 404 });
  const object = await getBindings().LEAD_PHOTOS?.get(key);
  if (!object) return new Response(null, { status: 404 });
  return new Response(object.body, { headers: { "Content-Type": "image/jpeg", "Cache-Control": "public, max-age=31536000, immutable", "X-Content-Type-Options": "nosniff" } });
}
