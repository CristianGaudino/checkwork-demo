import Link from "next/link";
import { FacebookIcon, InstagramIcon, TikTokIcon } from "@/components/stock/icons";
import { press, sectionTitle } from "@/components/ui";
import { postsStore } from "@/lib/admin/collections";
import { SOCIAL_LINKS } from "@/lib/site";
import { carName } from "@/lib/stock/format";
import type { Car } from "@/lib/stock/types";

const ICONS = { Facebook: FacebookIcon, Instagram: InstagramIcon, TikTok: TikTokIcon };
const SHOWN = 4;

// The posts the dealer has published, as tiles: the car's photo, the network and the first line. They come from the same record the admin
// writes (Marketing), so what is posted there shows here. A post for a car no longer in stock is left out. No posts, no section.
export async function SocialStrip({ cars }: { cars: Car[] }) {
  const posts = await postsStore.list().catch(() => []);
  const tiles = posts
    .filter((p) => p.status === "posted")
    .sort((a, b) => (b.postedAt ?? 0) - (a.postedAt ?? 0))
    .map((p) => ({ post: p, car: cars.find((c) => c.slug === p.carSlug && c.photos[0]) }))
    .filter((t): t is { post: typeof t.post; car: Car } => Boolean(t.car))
    .slice(0, SHOWN);
  if (tiles.length === 0) return null;
  return (
    <section aria-labelledby="socials" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <h2 id="socials" className={sectionTitle}>Follow Us</h2>
        <ul aria-label="Our social media" className="-mr-3 flex">
          {SOCIAL_LINKS.map(({ name, href }) => {
            const Icon = ICONS[name];
            return (
              <li key={name}>
                <a href={href} target="_blank" rel="noopener noreferrer" aria-label={`${name} (opens in a new tab)`} className="inline-flex size-11 items-center justify-center rounded-full transition-colors hover:text-text-2">
                  <Icon className="size-6" />
                </a>
              </li>
            );
          })}
        </ul>
      </div>
      <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        {tiles.map(({ post, car }) => {
          const Icon = ICONS[post.network];
          return (
            <li key={post.id} className="min-w-0">
              <Link href={`/used-cars/${car.slug}`} className={`group flex flex-col gap-2 ${press}`}>
                <span className="relative block aspect-square overflow-hidden rounded-[20px] bg-photo-bg">
                  <img src={car.photos[0].src} alt="" width={car.photos[0].width} height={car.photos[0].height} loading="lazy" className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.03] motion-reduce:transition-none" />
                  <span className="absolute left-2 top-2 flex size-8 items-center justify-center rounded-full bg-card/90 text-text">
                    <Icon className="size-5" />
                    <span className="sr-only">{post.network}</span>
                  </span>
                </span>
                <span className="line-clamp-2 text-meta text-text-2">{post.text.split("\n")[0] || carName(car)}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
