import { rowButton } from "@/components/admin/kit";
import { PhoneIcon, WhatsAppIcon } from "@/components/stock/icons";
import { NEW_TAB } from "@/components/ui";
import { telHref, waHref } from "@/lib/phone";

// Call, Email and WhatsApp, one tap each: only the ways this person can be reached (a website lead may give a phone or an email, not both).
// The same on a lead and a test drive, so a salesperson finds them in the same place.
export function ContactButtons({ phone, email }: { phone?: string; email?: string }) {
  const tel = phone ? telHref(phone) : undefined;
  const wa = phone ? waHref(phone) : undefined;
  return (
    <div className="grid grid-cols-3 gap-2">
      {tel && (
        <a href={tel} className={rowButton}>
          <PhoneIcon className="size-4" />
          Call
        </a>
      )}
      {email && (
        <a href={`mailto:${email}`} className={rowButton}>
          Email
        </a>
      )}
      {wa && (
        <a href={wa} {...NEW_TAB} className={rowButton}>
          <WhatsAppIcon className="size-4 text-whatsapp" />
          WhatsApp<span className="sr-only"> (opens in a new tab)</span>
        </a>
      )}
    </div>
  );
}
