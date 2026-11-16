import { pageWidth, NEW_TAB } from "@/components/ui";
import Image from "next/image";
import Link from "next/link";
import { ChevronDownIcon, FacebookIcon, InstagramIcon, TikTokIcon } from "@/components/stock/icons";
import { FOOTER_GROUPS, LEGAL_LINKS } from "@/lib/nav";
import { IfModule } from "@/components/IfModule";
import { CHECKWORK_URL, DEALER_ADDRESS_LINES, SITE_NAME, SOCIAL_LINKS } from "@/lib/site";
import { Logo } from "@/components/Logo";
import { PhoneLink } from "@/components/PhoneLink";
import { BackToTop } from "@/components/BackToTop";

// Below 1024px the footer is a way to every page (with the menu): each group folds into one row, so it is about half the height it was.
// From 1024px the groups are open columns. The groups are in src/lib/nav.ts (docs/mobile-navigation.md).

const SOCIAL_ICONS = { Facebook: FacebookIcon, Instagram: InstagramIcon, TikTok: TikTokIcon };

const link = "inline-flex min-h-11 items-center transition-colors hover:text-text-2";

// No top margin of its own: pages already end with 64px padding (03-10). No year in the copyright, so a cached page never goes stale.
export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-hairline bg-card">
      <div className={`${pageWidth} flex flex-col gap-4 py-6 lg:gap-8 lg:py-8`}>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[2fr_3fr] lg:gap-8">
          <div className="flex flex-col items-start gap-2">
            {/* On a phone Back to top sits level with the logo, on the right, so it is one tap away on every page. */}
            <div className="flex w-full items-center justify-between">
              <Link href="/" className={link}>
                <Logo className="h-8 w-auto" />
              </Link>
              <BackToTop className={`${link} text-meta underline lg:hidden`} />
            </div>
            <address className="text-body not-italic">
              {DEALER_ADDRESS_LINES.map((line) => (
                <span key={line} className="block last:whitespace-nowrap max-lg:inline max-lg:after:content-[',_'] max-lg:last:after:content-none">
                  {line}
                </span>
              ))}
            </address>
            <div className="flex w-full items-center justify-between lg:flex-col lg:items-start lg:gap-2">
              <PhoneLink className={`${link} text-body font-semibold`} />
              <Link href="/contact" className={`${link} underline max-lg:hidden`}>
                Opening hours and directions
              </Link>
              <ul aria-label="Social media" className="-mr-3 flex lg:-ml-3 lg:mr-0">
                {SOCIAL_LINKS.map(({ name, href }) => {
                  const Icon = SOCIAL_ICONS[name];
                  return (
                    <li key={name}>
                      <a href={href} {...NEW_TAB} aria-label={`${name} (opens in a new tab)`} className="inline-flex size-11 items-center justify-center rounded-full transition-colors hover:text-text-2">
                        <Icon className="size-6" />
                      </a>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
          {/* Groups are divs, not sections, so section lookups on car pages stay unique. */}
          <nav aria-label="Footer">
            {/* A phone: one row per group, folded. */}
            <div className="flex flex-col border-b border-hairline lg:hidden">
              {FOOTER_GROUPS.map((g) => (
                <IfModule key={g.title} hrefs={g.links.map((l) => l.href)}>
                <details className="group border-t border-hairline">
                  <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between text-body font-medium [&::-webkit-details-marker]:hidden">
                    {g.title}
                    <ChevronDownIcon className="size-5 text-text-2 transition-transform group-open:rotate-180 motion-reduce:transition-none" />
                  </summary>
                  <ul className="flex flex-col pb-3">
                    {g.links.map((l) => (
                      <IfModule key={l.href} href={l.href}>
                        <li>
                          <Link href={l.href} className={`${link} text-body text-text-2`}>
                            {l.long ?? l.label}
                          </Link>
                        </li>
                      </IfModule>
                    ))}
                  </ul>
                </details>
                </IfModule>
              ))}
            </div>
            {/* From 1024px: the same groups as open columns. */}
            <div className="hidden grid-cols-4 gap-x-6 lg:grid">
              {FOOTER_GROUPS.map((g) => (
                <IfModule key={g.title} hrefs={g.links.map((l) => l.href)}>
                <div>
                  <h2 className="text-meta font-semibold text-text-2">{g.title}</h2>
                  <ul className="mt-2 flex flex-col gap-1">
                    {g.links.map((l) => (
                      <IfModule key={l.href} href={l.href}>
                        <li>
                          <Link href={l.href} className={`${link} text-body lg:min-h-8`}>
                            {l.long ?? l.label}
                          </Link>
                        </li>
                      </IfModule>
                    ))}
                  </ul>
                </div>
                </IfModule>
              ))}
            </div>
          </nav>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1 text-meta text-text-2 lg:border-t lg:border-hairline lg:pt-6">
          <ul aria-label="Legal" className="flex gap-x-6 max-lg:w-full">
            {LEGAL_LINKS.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className={`${link} text-text`}>
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
          <p className="lg:ml-auto">© {SITE_NAME}</p>
          <a href={CHECKWORK_URL} {...NEW_TAB} className="inline-flex min-h-11 items-center gap-2 transition-colors hover:text-text">
            Powered by
            <Image src="/brand/checkwork-logo-on-light.svg" width={345} height={60} alt="Checkwork" unoptimized className="h-4 w-auto dark:hidden" />
            <Image src="/brand/checkwork-logo-on-dark.svg" width={345} height={60} alt="Checkwork" unoptimized className="hidden h-4 w-auto dark:block" />
            <span className="sr-only">(opens in a new tab)</span>
          </a>
        </div>
      </div>
    </footer>
  );
}
