import { BRAND_LOGOS } from "@/lib/brand-logos";

// A make's logo in the current text colour, or nothing when we have none for it. Decorative: the make's name is always written beside it.
export function MakeLogo({ slug, className = "size-5" }: { slug: string; className?: string }) {
  if (!BRAND_LOGOS.has(slug)) return null;
  const url = `url(/brands/${slug}.svg)`;
  return <span aria-hidden="true" className={`inline-block shrink-0 bg-current ${className}`} style={{ maskImage: url, WebkitMaskImage: url, maskSize: "contain", WebkitMaskSize: "contain", maskRepeat: "no-repeat", WebkitMaskRepeat: "no-repeat", maskPosition: "center", WebkitMaskPosition: "center" }} />;
}
