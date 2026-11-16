import { BRAND_LOGOS } from "@/lib/brand-logos";

// Two words give the first letters (Land Rover, LR), a short name stays as it is (GMC), a longer single word gives its first two letters (Dodge, DO).
export function initialsOf(slug: string): string {
  const words = slug.split("-").filter(Boolean);
  if (words.length > 1) return words.map((w) => w[0]).join("").slice(0, 3).toUpperCase();
  const word = words[0] ?? "";
  return (word.length <= 3 ? word : word.slice(0, 2)).toUpperCase();
}

// A make's logo. When there is no logo for it, its initials in the same box, so a column of makes stays aligned, unless `standalone` (a
// heading that has the name beside it anyway): then nothing. The logos are black, so dark mode inverts them; the few coloured ones are greyed.
// Decorative: the make's name is always written beside it. A plain image, not a CSS mask: a mask drew nothing in the production build.
export function MakeLogo({ slug, className = "size-5", standalone = false }: { slug: string; className?: string; standalone?: boolean }) {
  if (!BRAND_LOGOS.has(slug)) {
    if (standalone || !slug) return null;
    return (
      <span aria-hidden="true" className={`inline-flex shrink-0 items-center justify-center text-micro font-medium text-text-2 ${className}`}>
        {initialsOf(slug)}
      </span>
    );
  }
  return <img src={`/brands/${slug}.svg`} alt="" width={20} height={20} loading="lazy" className={`shrink-0 object-contain grayscale [[data-theme=dark]_&]:invert ${className}`} />;
}
