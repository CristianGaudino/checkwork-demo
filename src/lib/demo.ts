import { SITE_SLUG, isDemoSite } from "@/lib/site";

// The demo bar: a role switch and the theme toggle, fixed above every page. Off with NEXT_PUBLIC_DEMO_BAR=off (a real client site has none).
export const DEMO_BAR_ENABLED = process.env.NEXT_PUBLIC_DEMO_BAR !== "off";

// Two ways to view the demo: as a customer, or as the dealer's staff. Real access to the dealer area is Cloudflare Access (#7), and what a
// dealer may see inside it is a permission (src/lib/permissions.ts).
export const DEMO_ROLES = [
  { id: "customer", label: "Customer", href: "/", prefix: "" },
  { id: "dealer", label: "Dealer", href: "/dashboard", prefix: "/dashboard" },
] as const;

export type DemoRole = (typeof DEMO_ROLES)[number]["id"];

export function roleForPath(pathname: string): DemoRole {
  return DEMO_ROLES.find((r) => r.prefix && (pathname === r.prefix || pathname.startsWith(r.prefix + "/")))?.id ?? "customer";
}

// The dealer area has its own frame: the public header and footer are left out there.
export const isAppPath = (pathname: string) => roleForPath(pathname) !== "customer";

// The dealer area holds the stock editor and real leads. It is open only in `next dev` and when the build sets NEXT_PUBLIC_ADMIN_OPEN=1
// (skips protection: only for CI and the E2E run). Every other build is closed unless the request carries a valid Cloudflare Access token,
// which the proxy checks (src/lib/access.ts). Closed by default, so a build that misses a setting never opens a dealer's data.
export const adminReachable = (nodeEnv: string | undefined = process.env.NODE_ENV, open: string | undefined = process.env.NEXT_PUBLIC_ADMIN_OPEN) => nodeEnv === "development" || open === "1";

// Whether the demo's cookies (the role, the stock version) count: always on the demo deploy, so the archived dashboard behind Access keeps
// its roles (the owner by default) with the bar off, and where the bar is on and the dashboard open. A client site (APP_ENV=production)
// or a build with no APP_ENV never lets a cookie grant a role (src/lib/permissions.ts, src/lib/stock-source.ts).
export const demoCookiesCount = () => isDemoSite() || (DEMO_BAR_ENABLED && adminReachable());

// The visitor's theme (src/components/ThemeSwitch.tsx): Light or Dark stored in this browser, or nothing for Auto (the device's setting).
export const THEME_KEY = `${SITE_SLUG}:theme`;
export const THEMES = ["auto", "light", "dark"] as const;
export type Theme = (typeof THEMES)[number];

// The visitor's choice: one made on this page (data-theme-choice on <html>, set by the switch, so it holds when storage is blocked), else
// the stored one, else Auto. Plain and self-contained: THEME_SCRIPT carries its source, so the head script and the switch decide alike.
export function themeChoice(onPage: string | null | undefined, stored: string | null | undefined): Theme {
  const t = onPage || stored;
  return t === "light" || t === "dark" ? t : "auto";
}

// Runs before first paint (inline in <head>), so the first paint has the right theme: the choice, else the device's. On Auto it follows
// the device when that changes. A choice made in another tab (the storage event) applies here too, and replaces this page's own.
// Storage can throw (blocked, private window), which reads as no stored choice.
export const THEME_SCRIPT = `(function(){var k=${JSON.stringify(THEME_KEY)},h=document.documentElement,m=matchMedia("(prefers-color-scheme: dark)"),c=${themeChoice.toString()};function a(){var s;try{s=localStorage.getItem(k)}catch(e){}var t=c(h.dataset.themeChoice,s);h.dataset.theme=t==="auto"?m.matches?"dark":"light":t}a();m.addEventListener("change",a);addEventListener("storage",function(e){if(e.key===k||e.key===null){delete h.dataset.themeChoice;a()}})})()`;
