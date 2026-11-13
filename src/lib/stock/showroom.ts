import "server-only";
import { queryAllOrNull } from "@/lib/stock";
import type { Car, Photo } from "@/lib/stock/types";

// The car in the picture on the buying pages (finance, trade-in): the one the visitor came from, else the newest car with a photo.
// Decoration only: no stock, no picture, and the page is the same.
export async function showroomPhoto(from?: Car): Promise<Photo | undefined> {
  if (from?.photos[0]) return from.photos[0];
  return (await queryAllOrNull())?.cars.find((c) => c.photos.length > 0)?.photos[0];
}
