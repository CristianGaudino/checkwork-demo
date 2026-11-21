import { FacebookIcon, GoogleIcon, InstagramIcon, TikTokIcon, WhatsAppIcon } from "@/components/stock/icons";

// The networks' marks in their own colours, so a Facebook post, an Instagram story or a lead from Google is told apart at a glance.
// Found by name anywhere in the text ("Facebook post", "Website, from Google"); a Meta ad runs on Facebook and Instagram, so it shows both.
// Decorative: the name is always written beside the mark.
const BRANDS = [
  { id: "facebook", test: /facebook|\bmeta\b/i, Icon: FacebookIcon, colour: "text-facebook" },
  { id: "instagram", test: /instagram|\bmeta\b/i, Icon: InstagramIcon, colour: "text-instagram" },
  { id: "tiktok", test: /tiktok/i, Icon: TikTokIcon, colour: "text-text" },
  { id: "whatsapp", test: /whatsapp/i, Icon: WhatsAppIcon, colour: "text-whatsapp" },
  { id: "google", test: /google/i, Icon: GoogleIcon, colour: "text-google" },
] as const;
export const brandsIn = (name: string) => BRANDS.filter((b) => b.test.test(name));

export function BrandIcon({ name, className = "size-4" }: { name: string; className?: string }) {
  const found = brandsIn(name);
  if (found.length === 0) return null;
  return (
    <span aria-hidden="true" className="inline-flex shrink-0 items-center -space-x-0.5 align-middle">
      {found.map(({ Icon, colour }, i) => (
        <Icon key={i} className={`${className} ${colour}`} />
      ))}
    </span>
  );
}

// A name with its mark before it, for a line of text or a table cell. Plain text when the name is not a network.
export function BrandName({ name, className = "" }: { name: string; className?: string }) {
  return (
    <span className={`inline-flex min-w-0 items-center gap-1.5 align-middle ${className}`}>
      <BrandIcon name={name} />
      <span className="min-w-0 truncate">{name}</span>
    </span>
  );
}
