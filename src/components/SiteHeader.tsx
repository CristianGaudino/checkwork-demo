import { pageWidth } from "@/components/ui";
import Link from "next/link";
import { HeaderLinks } from "@/components/HeaderLinks";
import { Logo } from "@/components/Logo";
import { MobileMenu } from "@/components/MobileMenu";
import { SavedLink } from "@/components/saved/SavedLink";
import { MENU } from "@/lib/nav";
import { SITE_NAME } from "@/lib/site";

// Sticks to the top on a phone, where the menu button is the way round the site; from 1024px it scrolls away with the page (D-12).
// On a phone: the menu on the left, the logo in the middle, saved cars on the right. From 1024px: the logo, then the links and the heart.
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-hairline/60 bg-surface/75 text-text backdrop-blur-xl reduce-transparency:bg-surface reduce-transparency:backdrop-blur-none lg:static">
      <div className={`${pageWidth} grid h-14 grid-cols-[1fr_auto_1fr] items-center gap-4 lg:flex lg:h-16`}>
        <div className="flex justify-start lg:hidden">
          <MobileMenu links={MENU} />
        </div>
        <Link href="/" aria-label={SITE_NAME} className="flex h-11 shrink-0 items-center lg:order-first">
          <Logo className="h-7 w-auto sm:h-8 lg:h-9" eager />
        </Link>
        <nav aria-label="Main" className="flex items-center justify-end lg:ml-auto lg:gap-6">
          <HeaderLinks />
          <SavedLink />
        </nav>
      </div>
    </header>
  );
}
