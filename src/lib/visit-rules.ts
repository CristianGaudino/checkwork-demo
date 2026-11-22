import { slugify } from "@/lib/stock/slug";
import { MAKE_OPTIONS } from "@/lib/leads/makes";

// What the site learns about a visit without knowing who it is (#12): the channel it came from, the price band a buyer looks at, and the
// make they searched when nothing matched. Fixed lists, so the anonymous counter (src/app/api/count) can never store anything else.

// Where a visit came from. A tagged link (utm_source, or a Google or Facebook click id) wins over the page it came from, so a dealer who
// tags their posts sees them exactly.
export const CHANNELS = ["google", "bing", "facebook", "instagram", "tiktok", "donedeal", "carzone", "email", "other", "direct"] as const;
export type Channel = (typeof CHANNELS)[number];
export const CHANNEL_LABELS: Record<Channel, string> = {
  google: "Google",
  bing: "Bing",
  facebook: "Facebook",
  instagram: "Instagram",
  tiktok: "TikTok",
  donedeal: "DoneDeal",
  carzone: "Carzone",
  email: "Email",
  other: "Other sites",
  direct: "Typed in or bookmarked",
};
export const isChannel = (v: unknown): v is Channel => typeof v === "string" && (CHANNELS as readonly string[]).includes(v);

// Email first: mail.google.com is Gmail, not a Google search.
const BY_NAME: [RegExp, Channel][] = [
  [/(^|[.\-_ ])(e?mail|gmail|hotmail|newsletter|outlook)/, "email"],
  [/google/, "google"],
  [/bing/, "bing"],
  [/facebook|(^|\.)fb\.(com|me)$|^fb$|^meta$/, "facebook"],
  [/instagram|^ig$/, "instagram"],
  [/tiktok/, "tiktok"],
  [/donedeal/, "donedeal"],
  [/carzone/, "carzone"],
];
const byName = (s: string): Channel => BY_NAME.find(([re]) => re.test(s))?.[1] ?? "other";

// null: a page of a visit already under way (our own page sent them, as in a car opened in a new tab), so not a new visit.
export function channelOf(pageUrl: string, referrer: string): Channel | null {
  let page: URL;
  try {
    page = new URL(pageUrl);
  } catch {
    return "direct";
  }
  const p = page.searchParams;
  if (p.get("utm_medium")?.toLowerCase() === "email") return "email";
  const source = p.get("utm_source")?.trim().toLowerCase();
  if (source) return byName(source);
  if (p.has("gclid")) return "google";
  let host: string | null = null;
  try {
    host = new URL(referrer).hostname.toLowerCase();
  } catch {}
  // Meta adds fbclid to Instagram's links too, so the referrer says which.
  if (p.has("fbclid")) return host && /instagram/.test(host) ? "instagram" : "facebook";
  if (host === null) return "direct"; // no referrer: typed in, a bookmark, or an app that sends none
  if (host === page.hostname || host.endsWith(`.${page.hostname}`)) return null;
  return byName(host);
}

// The price a buyer is shopping at, from the price filter they set: the top of it, or the bottom when only that is set.
const BAND_TOPS = [10000, 20000, 30000, 50000];
export const PRICE_BANDS = ["under-10k", "10k-20k", "20k-30k", "30k-50k", "over-50k"] as const;
export type PriceBand = (typeof PRICE_BANDS)[number];
export function bandOf(q: { priceMin?: number; priceMax?: number }): PriceBand | null {
  const i = q.priceMax !== undefined ? BAND_TOPS.findIndex((t) => q.priceMax! <= t) : q.priceMin !== undefined ? BAND_TOPS.findIndex((t) => q.priceMin! < t) : -2;
  return i === -2 ? null : PRICE_BANDS[i === -1 ? BAND_TOPS.length : i];
}

// The make a buyer looked for when nothing matched: a make filter, or a make named in the search box. Anything else is "other", so what
// they typed is never stored.
const MAKES = MAKE_OPTIONS.slice(1).map((o) => ({ slug: slugify(o.value), name: o.value }));
export const MISSED_MAKES = [...MAKES.map((m) => m.slug), "other"];
export function missedMake(q: { q?: string; make: string[] }): string {
  const text = `-${slugify(q.q ?? "")}-`;
  return q.make.find((s) => MISSED_MAKES.includes(s)) ?? MAKES.find((m) => text.includes(`-${m.slug}-`))?.slug ?? "other";
}

export const VISIT_EVENTS = [...CHANNELS.map((c) => `visit:${c}`), ...PRICE_BANDS.map((b) => `band:${b}`), ...MISSED_MAKES.map((m) => `missed:${m}`)];
