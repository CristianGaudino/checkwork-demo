import { SITE_SLUG } from "@/lib/site";

// The demo bar: a role switch and the theme toggle, fixed above every page. Off with NEXT_PUBLIC_DEMO_BAR=off (a real client site has none).
export const DEMO_BAR_ENABLED = process.env.NEXT_PUBLIC_DEMO_BAR !== "off";

// Two ways to view the demo: as a customer, or as the dealer's staff. Real access to the dealer area is Cloudflare Access (#7), and what a
// dealer may see inside it is a permission (src/lib/permissions.ts).
export const DEMO_ROLES = [
  { id: "customer", label: "Customer", href: "/", prefix: "" },
  { id: "dealer", label: "Dealer", href: "/admin", prefix: "/admin" },
] as const;

export type DemoRole = (typeof DEMO_ROLES)[number]["id"];

export function roleForPath(pathname: string): DemoRole {
  return DEMO_ROLES.find((r) => r.prefix && (pathname === r.prefix || pathname.startsWith(r.prefix + "/")))?.id ?? "customer";
}

// The dealer area has its own frame: the public header and footer are left out there.
export const isAppPath = (pathname: string) => roleForPath(pathname) !== "customer";

// The dealer area holds the stock editor and real leads. In development (no APP_ENV) it is open. On a deployed site
// it is closed unless the build sets NEXT_PUBLIC_ADMIN_OPEN=1 (skips protection: only for CI) or the request carries a valid
// Cloudflare Access token, which the proxy checks (src/lib/access.ts). This is only the build-time half of that rule.
export const adminReachable = (appEnv: string | undefined = process.env.APP_ENV, open: string | undefined = process.env.NEXT_PUBLIC_ADMIN_OPEN) => !appEnv || open === "1";

export const THEME_KEY = `${SITE_SLUG}:theme`;
export const THEMES = ["light", "dark"] as const;
export type Theme = (typeof THEMES)[number];

// Runs before first paint (inline in <head>) so a stored dark choice never flashes light. Storage can throw, so it is wrapped.
export const THEME_SCRIPT = `try{var t=localStorage.getItem(${JSON.stringify(THEME_KEY)});if(t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;
