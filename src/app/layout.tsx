import type { Metadata } from "next";
import localFont from "next/font/local";
import { Suspense } from "react";
import { NavProgress } from "@/components/NavProgress";
import { CompareBar } from "@/components/compare/CompareBar";
import { VisitStart } from "@/components/VisitStart";
import { Toaster } from "@/components/Toaster";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { accentButton } from "@/components/ui";
import { THEME_SCRIPT } from "@/lib/demo";
import { DEALER_LOCATION, DEFAULT_OG_IMAGE, SITE_NAME, SITE_URL, indexable } from "@/lib/site";
import "./globals.css";

// Sora, from a file kept in the repo (src/app/fonts): no request to Google when a visitor loads the site, and none when the site is
// built. One variable file covers every weight; the latin range covers English and Irish.
const sora = localFont({ src: "./fonts/sora-latin.woff2", weight: "100 800", display: "swap", variable: "--font-sora" });
// Inter for running text, Sora for headings: the pair the Checkwork company site uses. Kept in the repo the same way.
const inter = localFont({ src: "./fonts/inter-latin.woff2", weight: "100 900", display: "swap", variable: "--font-inter" });

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
    <html lang="en-IE" className={`${sora.variable} ${inter.variable}`} suppressHydrationWarning>
      <head>
        {/* Sets the theme before first paint. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        {/* The theme switch needs JavaScript: without it, it is not shown. */}
        <noscript dangerouslySetInnerHTML={{ __html: "<style>[data-theme-switch]{display:none}</style>" }} />
      </head>
      <body className="flex min-h-dvh flex-col">
        {/* The first Tab stop: off screen until focused, then over the header. */}
        <a href="#main" className={`fixed left-4 top-4 z-50 inline-flex -translate-y-24 items-center focus:translate-y-0 ${accentButton}`}>
          Skip to content
        </a>
        {/* Suspense: it reads the search params, which a static page only has in the browser. */}
        <Suspense fallback={null}>
          <NavProgress />
        </Suspense>
        <SiteHeader />
        <VisitStart />
        {/* Where Skip to content lands: one marker here rather than an id on every page's main. Focusable so the next Tab starts inside the page. */}
        <div id="main" tabIndex={-1} className="outline-none" />
        {children}
        <SiteFooter />
        {dev && <dev.Toggle mode={dev.mode} />}
        {/* One stack at the bottom of the screen: the toast above the compare pill. Both take their own pointer events. */}
        <div data-bottom-stack className="pointer-events-none fixed inset-x-0 bottom-4 z-30 flex flex-col items-center gap-2 px-4">
          <Toaster />
          <CompareBar />
        </div>
      </body>
    </html>
  );
}
