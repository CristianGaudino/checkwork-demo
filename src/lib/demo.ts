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

export const THEME_KEY = `${SITE_SLUG}:theme`;
export const THEMES = ["light", "dark"] as const;
export type Theme = (typeof THEMES)[number];

// Runs before first paint (inline in <head>) so a stored dark choice never flashes light. Storage can throw, so it is wrapped.
export const THEME_SCRIPT = `try{var t=localStorage.getItem(${JSON.stringify(THEME_KEY)});if(t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;
