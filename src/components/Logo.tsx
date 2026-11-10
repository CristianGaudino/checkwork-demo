import Image from "next/image";
import { SITE_NAME } from "@/lib/site";

// The logo in the wordmark colour that reads on the current theme: dark words on light, white words on dark. Same artwork either way.
// Both are tiny SVGs; the one that does not match the theme is display:none, so it is neither seen nor read out.
export function Logo({ className = "h-8 w-auto", eager = false }: { className?: string; eager?: boolean }) {
  const common = { width: 345, height: 60, loading: eager ? ("eager" as const) : undefined, unoptimized: true };
  return (
    <>
      <Image src="/brand/logo-on-light.svg" alt={SITE_NAME} {...common} className={`${className} dark:hidden`} />
      <Image src="/brand/logo.svg" alt={SITE_NAME} {...common} className={`${className} hidden dark:block`} />
    </>
  );
}
