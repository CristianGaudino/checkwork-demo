import { SITE_SLUG } from "@/lib/site";

// The demo bar: a role switch and the theme toggle, fixed above every page. Off with NEXT_PUBLIC_DEMO_BAR=off (a real client site has none).
export const DEMO_BAR_ENABLED = process.env.NEXT_PUBLIC_DEMO_BAR !== "off";

// Each role is a route. The role is never stored or checked here: it is where you are. Real access is Cloudflare Access (#7).
export const DEMO_ROLES = [
  { id: "customer", label: "Customer", href: "/", prefix: "" },
  { id: "dealer", label: "Dealer", href: "/admin", prefix: "/admin" },
  { id: "superuser", label: "Superuser", href: "/platform", prefix: "/platform" },
] as const;

export type DemoRole = (typeof DEMO_ROLES)[number]["id"];

export function roleForPath(pathname: string): DemoRole {
  return DEMO_ROLES.find((r) => r.prefix && (pathname === r.prefix || pathname.startsWith(r.prefix + "/")))?.id ?? "customer";
}

// The dealer and platform areas have their own frame: the public header and footer are left out there.
export const isAppPath = (pathname: string) => roleForPath(pathname) !== "customer";

// The dealer and platform areas have no login yet, and the stock editor changes what the public site shows. So on any deployed site
// (APP_ENV is set: demo or production) they are closed (404) unless the build sets NEXT_PUBLIC_ADMIN_OPEN=1, a deliberate choice.
// Both are fixed at build time, so every page and the proxy agree. Cloudflare Access is the real protection (#7, #21).
export const adminReachable = (appEnv: string | undefined = process.env.APP_ENV, open: string | undefined = process.env.NEXT_PUBLIC_ADMIN_OPEN) => !appEnv || open === "1";

export const THEME_KEY = `${SITE_SLUG}:theme`;
export const THEMES = ["light", "dark"] as const;
export type Theme = (typeof THEMES)[number];

// Runs before first paint (inline in <head>) so a stored dark choice never flashes light. Storage can throw, so it is wrapped.
export const THEME_SCRIPT = `try{var t=localStorage.getItem(${JSON.stringify(THEME_KEY)});if(t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;
