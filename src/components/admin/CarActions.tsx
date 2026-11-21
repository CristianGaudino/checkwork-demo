import Link from "next/link";
import { Badge } from "@/components/admin/kit";
import { CarStatusBadge } from "@/components/admin/badges";
import { ExternalIcon, EyeIcon, EyeOffIcon, ShareIcon } from "@/components/stock/icons";
import { ActButton } from "@/components/admin/ActButton";
import { setListingAction } from "@/app/dashboard/stock/actions";
import { NEW_TAB } from "@/components/ui";
import { daysSince } from "@/lib/admin/format";
import { OLD_STOCK_DAYS } from "@/lib/admin/overview";
import { FEW_PHOTOS } from "@/lib/admin/stock-views";
import { carHref, carName } from "@/lib/stock/format";
import { forSale, isSold, onPublicSite, type Car } from "@/lib/stock/types";

// What a dealer does with one car, the same on the stock list and on the car's own page, and the warnings that say what a car needs.

// `short`: on the stock list on a smaller screen the words go to screen readers only and the icon shows (with its name on hover), so the
// row fits a laptop: Post to social is labelled from 1280px, View on the website from 1536px.
const words = (text: string, short: false | "xl" | "2xl") => <span className={short === "xl" ? "max-xl:sr-only" : short === "2xl" ? "max-2xl:sr-only" : ""}>{text}</span>;

// A post for this car on Facebook and Instagram. Posts are for cars in stock: never a sold car. The caller checks the social module.
export function PostToSocial({ car, className, short = false }: { car: Car; className: string; short?: boolean }) {
  const at = short && "xl";
  if (!forSale(car)) return null; // the composer offers only cars for sale: a hidden car, a draft or a sold one would be dropped there
  return (
    <Link href={`/dashboard/marketing/new?car=${encodeURIComponent(car.slug)}`} title="Post to Facebook and Instagram" aria-label={`Post to social: ${carName(car)}`} className={className}>
      <ShareIcon className="size-4 shrink-0" />
      {words("Post to social", at)}
    </Link>
  );
}

// The car as a customer sees it, in a new tab. A hidden car or a draft has no page on the website.
export function ViewOnSite({ car, className, short = false }: { car: Car; className: string; short?: boolean }) {
  const at = short && "2xl";
  if (!onPublicSite(car)) return null; // no link to a page that answers "gone" or not found
  return (
    <a href={carHref(car.slug)} {...NEW_TAB} title="Open the car's page on your website" aria-label={`View on the website: ${carName(car)} (opens in a new tab)`} className={className}>
      <ExternalIcon className="size-4 shrink-0" />
      {words("View on the website", at)}
    </a>
  );
}

// Whole days in stock, in words: "Today", "1 day", "23 days".
export const daysInStock = (listedAt: string) => {
  const d = daysSince(listedAt);
  return d === 0 ? "Today" : d === 1 ? "1 day" : `${d} days`;
};

// What needs doing about a car, in words: off the website, too few photos, in stock too long. Nothing for a sold car.
function carWarnings(car: Car): string[] {
  if (isSold(car)) return [];
  const out: string[] = [];
  if (car.listing === "hidden") out.push("Hidden from the website");
  if (car.photos.length < FEW_PHOTOS) out.push(car.photos.length === 0 ? "No photos" : `Only ${car.photos.length} ${car.photos.length === 1 ? "photo" : "photos"}`);
  if (forSale(car) && car.listedAt && daysSince(car.listedAt) >= OLD_STOCK_DAYS) out.push(`In stock ${daysSince(car.listedAt)} days`);
  return out;
}

// The car's status, and a warning badge for each thing that needs doing. `status`: leave the status out where every row has the same one.
export function CarFlags({ car, status = true }: { car: Car; status?: boolean }) {
  const warnings = carWarnings(car);
  const showStatus = status || car.listing === "draft" || Boolean(car.reserved) || isSold(car);
  if (!showStatus && warnings.length === 0) return null;
  return (
    <span className="flex flex-wrap gap-1.5">
      {showStatus && !(car.listing === "hidden" && warnings.length > 0) && <CarStatusBadge car={car} />}
      {warnings.map((w) => (
        <Badge key={w} tone="warn">{w}</Badge>
      ))}
    </span>
  );
}

// Hide, show or publish, with Undo in the toast. Our version only: DoneDeal stock is shown and hidden there.
export function ListingButton({ car, className }: { car: Car; className: string }) {
  const name = carName(car);
  const [to, label, done] = car.listing === "draft" ? ["live", "Publish", `Published ${name}`] : car.listing ? ["live", "Show on the website", `${name} is on the website again`] : ["hidden", "Hide from the website", `Hid ${name} from the website`];
  return (
    <ActButton act={setListingAction.bind(null, car.id, to, car.listing ?? "live")} undo={setListingAction.bind(null, car.id, car.listing ?? "live", to)} done={done} className={className}>
      {car.listing ? <EyeIcon className="size-4 shrink-0" /> : <EyeOffIcon className="size-4 shrink-0" />}
      {label}
    </ActButton>
  );
}
