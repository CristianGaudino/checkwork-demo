import type { Metadata } from "next";
import localFont from "next/font/local";
import { CompareBar } from "@/components/compare/CompareBar";
import { SiteChrome } from "@/components/SiteChrome";
import { Toaster } from "@/components/Toaster";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { DemoBar } from "@/components/demo/DemoBar";
import { DEMO_BAR_ENABLED, THEME_SCRIPT, adminReachable } from "@/lib/demo";
import { DEALER_LOCATION, DEFAULT_OG_IMAGE, SITE_NAME, SITE_URL, indexable } from "@/lib/site";
import "./globals.css";

// Sora, from a file kept in the repo (src/app/fonts): no request to Google when a visitor loads the site, and none when the site is
// built. One variable file covers every weight; the latin range covers English and Irish.
const sora = localFont({ src: "./fonts/sora-latin.woff2", weight: "100 800", display: "swap", variable: "--font-sora" });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: SITE_NAME, template: `%s | ${SITE_NAME}` },
  description: `Quality used cars in ${DEALER_LOCATION}.`,
  // Each page names itself as canonical, so a link with tracking parameters still counts for the page. Pages with their own override this.
  alternates: { canonical: "./" },
  openGraph: { type: "website", siteName: SITE_NAME, locale: "en_IE", images: [DEFAULT_OG_IMAGE] },
  twitter: { card: "summary_large_image" },
  // Site-wide default that every page inherits.
  robots: { index: indexable() },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // break-ui: both imports sit inside the dev branch, so a production build leaves them out entirely.
  const dev = process.env.NODE_ENV === "development" ? { Toggle: (await import("@/components/DevDataToggle")).DevDataToggle, mode: await (await import("@/lib/dev-data")).devMode() } : null;
  return (
    <html lang="en-IE" className={sora.variable} suppressHydrationWarning>
      <head>
        {/* Sets a stored dark choice before first paint. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="flex min-h-dvh flex-col">
        {DEMO_BAR_ENABLED && <DemoBar showAreas={adminReachable() || process.env.NEXT_PUBLIC_ACCESS_ENABLED === "1"} />}
        <SiteChrome>
          <SiteHeader />
        </SiteChrome>
        {children}
        <SiteChrome>
          <SiteFooter />
        </SiteChrome>
        {dev && <dev.Toggle mode={dev.mode} />}
        {/* One stack at the bottom of the screen: the toast above the compare pill. Both take their own pointer events. */}
        <div className="pointer-events-none fixed inset-x-0 bottom-4 z-30 flex flex-col items-center gap-2 px-4">
          <Toaster />
          <SiteChrome>
            <CompareBar />
          </SiteChrome>
        </div>
      </body>
    </html>
  );
}
