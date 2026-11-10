import Link from "next/link";
import { HeaderLinks } from "@/components/HeaderLinks";
import { Logo } from "@/components/Logo";
import { MobileMenu } from "@/components/MobileMenu";
import { VehicleSwitch } from "@/components/VehicleSwitch";
import { SavedLink } from "@/components/saved/SavedLink";
import { MENU } from "@/lib/nav";
import { SITE_NAME } from "@/lib/site";

// Sticks to the top on a phone, where the menu button is the way round the site; from 1024px it scrolls away with the page (D-12). Logo left, the vehicle-type switch in the middle once there
// is more than one type, the links, the heart and the menu on the right. On a phone: logo left, heart and menu right.
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-hairline bg-surface text-text lg:static">
      <div className="mx-auto flex h-14 max-w-[1280px] items-center gap-4 px-4 sm:px-6 lg:h-16 lg:px-8">
        <Link href="/" aria-label={SITE_NAME} className="flex h-11 shrink-0 items-center">
          <Logo className="h-7 w-auto sm:h-8 lg:h-9" eager />
        </Link>
        <VehicleSwitch className="hidden lg:inline-flex" />
        <nav aria-label="Main" className="ml-auto flex items-center lg:gap-6">
          <HeaderLinks />
          <SavedLink />
          <MobileMenu links={MENU} />
        </nav>
      </div>
    </header>
  );
}
