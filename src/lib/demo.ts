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

// Whether the demo bar's cookies (the role, the stock version) count: on the demo deploy and where the dashboard is open. A client site
// (APP_ENV=production) or a build with no APP_ENV never lets a cookie grant a role (src/lib/permissions.ts, src/lib/stock-source.ts).
export const demoCookiesCount = () => DEMO_BAR_ENABLED && (isDemoSite() || adminReachable());

// The visitor's theme (src/components/ThemeSwitch.tsx): Light or Dark stored in this browser, or nothing for Auto (the device's setting).
export const THEME_KEY = `${SITE_SLUG}:theme`;
export const THEMES = ["auto", "light", "dark"] as const;
export type Theme = (typeof THEMES)[number];

// Runs before first paint (inline in <head>), so the first paint has the right theme: the stored choice, else the device's. On Auto it
// follows the device when that changes. Storage can throw (blocked, private window), which reads as Auto.
export const THEME_SCRIPT = `(function(){var m=matchMedia("(prefers-color-scheme: dark)");function a(){var t;try{t=localStorage.getItem(${JSON.stringify(THEME_KEY)})}catch(e){}document.documentElement.dataset.theme=t==="light"||t==="dark"?t:m.matches?"dark":"light"}a();m.addEventListener("change",a)})()`;
