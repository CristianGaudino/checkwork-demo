import { SITE_SLUG } from "@/lib/site";

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
