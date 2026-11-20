import { ChoiceAct } from "@/components/admin/ActButton";
import { rowButton } from "@/components/admin/kit";
import { CalendarIcon, CheckIcon, InboxIcon, PhoneIcon, WhatsAppIcon } from "@/components/stock/icons";
import { NEW_TAB } from "@/components/ui";
import { leadStatusLabel, type Lead, type LeadStatus } from "@/lib/admin/collections";
import { telHref, waHref } from "@/lib/phone";
import { setStatusAction } from "@/app/dashboard/leads/actions";

// The way they asked to be reached first (the contact form's "Call me", "WhatsApp", "Email me"), else a call, else an email: one button.
export function ReachButton({ lead }: { lead: Pick<Lead, "phone" | "email" | "answers"> }) {
  const via = lead.answers?.contactVia;
  const tel = lead.phone ? telHref(lead.phone) : undefined;
  const wa = lead.phone ? waHref(lead.phone) : undefined;
  if (via === "whatsapp" && wa)
    return (
      <a href={wa} {...NEW_TAB} className={rowButton}>
        <WhatsAppIcon className="size-4 text-whatsapp" />
        WhatsApp<span className="sr-only"> (opens in a new tab)</span>
      </a>
    );
  if ((via === "email" || !tel) && lead.email)
    return (
      <a href={`mailto:${lead.email}`} className={rowButton}>
        <InboxIcon className="size-4" />
        Email
      </a>
    );
  if (!tel) return null;
  return (
    <a href={tel} className={rowButton}>
      <PhoneIcon className="size-4" />
      Call
    </a>
  );
}

// The step after this one, as one press with Undo: a new lead is answered, an answered one gets an appointment, an appointment is won.
const NEXT: Partial<Record<LeadStatus, LeadStatus>> = { new: "contacted", contacted: "appointment", appointment: "won" };
const ICON = { contacted: PhoneIcon, appointment: CalendarIcon, won: CheckIcon } as const;
export function NextStatusButton({ lead }: { lead: Pick<Lead, "id" | "name" | "status" | "type" | "followUpOn"> }) {
  const to = NEXT[lead.status];
  if (!to || lead.type === "warranty") return null;
  const Icon = ICON[to as keyof typeof ICON];
  const label = leadStatusLabel(lead.type, to);
  return (
    <ChoiceAct action={setStatusAction.bind(null, lead.id)} set={{ status: to }} back={{ status: lead.status, ...(lead.followUpOn && { on: lead.followUpOn }) }} active={false} done={`${lead.name}: ${label}`} className={rowButton}>
      <Icon className="size-4" />
      Mark {label.toLowerCase()}
    </ChoiceAct>
  );
}
