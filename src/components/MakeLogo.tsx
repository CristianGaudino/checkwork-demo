import { BRAND_LOGOS } from "@/lib/brand-logos";

// A make's logo, or nothing when we have none for it. The files are black (the few that are coloured are greyed), so dark mode inverts them. Decorative: the make's name is always
// written beside it. A plain image, not a CSS mask: a mask drew nothing in the production build.
export function MakeLogo({ slug, className = "size-5" }: { slug: string; className?: string }) {
  if (!BRAND_LOGOS.has(slug)) return null;
  // eslint-disable-next-line @next/next/no-img-element -- a small local SVG, sized by its class
  return <img src={`/brands/${slug}.svg`} alt="" width={20} height={20} loading="lazy" className={`shrink-0 object-contain grayscale [[data-theme=dark]_&]:invert ${className}`} />;
}
