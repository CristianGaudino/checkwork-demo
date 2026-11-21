"use client";

import { useEffect, useId, useRef, useState } from "react";
import { PhoneLink } from "@/components/PhoneLink";
import { BellIcon, CalendarIcon, CloseIcon, PhoneIcon } from "@/components/stock/icons";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { LIMITS } from "@/lib/leads/constants";
import { DEALER_TEL } from "@/lib/site";
import { ContactFields, Field } from "./Field";
import { DriveFields } from "./DriveFields";
import { LeadForm } from "./LeadForm";
import { closeButton, press, secondaryButton } from "@/components/ui";

// What the client needs to show a car. Never the Car object: the server reads the car again by id (LED-02).
export type CarSummary = { id: string; name: string; title: string; variant?: string; price: string; photo?: string };

// A native modal dialog on the Phase 1 sheet rules (D-09). It stays in the DOM while closed, so the form inside keeps its
// text (research Pattern 2). The Close button is the first focusable element, so showModal() focuses it, not a field.
// The dealer's number is always under the title, with the country code, as a link that dials.
export function LeadDialog({ title, open, onClose, children }: { title: string; open: boolean; onClose(): void; children: React.ReactNode }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const d = dialog.current;
    if (open && !d?.open) d?.showModal();
    if (!open && d?.open) d.close();
  }, [open]);

  return (
    <dialog ref={dialog} className="sheet lead" aria-labelledby={titleId} onClose={onClose} onClick={(e) => e.target === e.currentTarget && e.currentTarget.close()}>
      <div className="flex shrink-0 items-center justify-between px-4 pb-1 pt-3">
        <h2 id={titleId} className="text-heading font-semibold">
          {title}
        </h2>
        <button type="button" aria-label="Close" onClick={() => dialog.current?.close()} className={closeButton}>
          <CloseIcon className="h-6 w-6" />
        </button>
      </div>
      <p className="shrink-0 px-4 pb-2 text-meta text-text-2">
        Or call us on <PhoneLink className="font-semibold text-text underline" />
      </p>
      {children}
    </dialog>
  );
}

// The car page action area: Enquire in the accent with Test Drive beside it, then Call Us and WhatsApp. Each of the
// two forms has its own dialog and stays mounted, so closing one never loses what was typed in it.
export function LeadActions({ car, whatsapp }: { car: CarSummary; whatsapp: string }) {
  const [open, setOpen] = useState<"enquiry" | "drive" | null>(null);
  const opener = useRef<HTMLButtonElement>(null);
  const secondary = `flex h-12 items-center justify-center gap-2 px-3 text-text ${secondaryButton}`;
  const show = (el: HTMLButtonElement, which: "enquiry" | "drive") => {
    opener.current = el;
    setOpen(which);
  };
  const close = () => {
    setOpen(null);
    opener.current?.focus();
  };
  // Once these buttons have scrolled up out of view, a slim bar at the foot of a phone offers them again (#205).
  const row = useRef<HTMLDivElement>(null);
  const [gone, setGone] = useState(false);
  useEffect(() => {
    // The area reaches far below the screen, so "out of it" means scrolled off the top: a jump from below the fold past the row still fires.
    const o = new IntersectionObserver(([e]) => setGone(!e.isIntersecting), { rootMargin: "0px 0px 100000px 0px" });
    o.observe(row.current!);
    return () => o.disconnect();
  }, []);
  const bar = `flex h-11 items-center justify-center px-2 font-semibold ${press}`;

  return (
    <>
      <div ref={row} className="grid grid-cols-2 gap-2 whitespace-nowrap">
        <button type="button" onClick={(e) => show(e.currentTarget, "enquiry")} className={`col-span-2 flex h-12 w-full items-center justify-center gap-2 rounded-control bg-accent px-3 font-semibold text-on-accent sm:col-span-1 ${press}`}>
          Enquire
        </button>
        <button type="button" onClick={(e) => show(e.currentTarget, "drive")} className={`col-span-2 sm:col-span-1 ${secondary}`}>
          <CalendarIcon className="size-5 text-accent-text" />
          Test drive
        </button>
        <a href={`tel:${DEALER_TEL}`} className={secondary}>
          <PhoneIcon className="size-5 text-accent-text" />
          Call us
        </a>
        <WhatsAppButton href={whatsapp} sizing="px-3" />
      </div>
      <LeadDialog title="Enquire" open={open === "enquiry"} onClose={close}>
        <LeadForm type="enquiry" car={car} variant="dialog" submitLabel="Send enquiry" success={{ heading: "Thanks, we have your enquiry.", body: `We'll get back to you about the ${car.name}.` }}>
          {({ bind }) => (
            <>
              <ContactFields bind={bind} />
              <Field {...bind("message")} label="Message" optional multiline maxLength={LIMITS.message} />
            </>
          )}
        </LeadForm>
      </LeadDialog>
      <LeadDialog title="Test drive" open={open === "drive"} onClose={close}>
        <TestDriveForm car={car} />
      </LeadDialog>
      {/* Below 1024px, above the demo bar or its pill (--demo-bar-h). Hidden with visibility, so it is out of the tab order until it shows. */}
      <div
        data-sticky-actions
        className={`fixed inset-x-0 bottom-[var(--demo-bar-h,0px)] z-20 border-t border-hairline bg-surface/90 px-4 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl transition-[translate,visibility] duration-200 reduce-transparency:bg-surface reduce-transparency:backdrop-blur-none motion-reduce:transition-none lg:hidden ${gone ? "" : "invisible translate-y-full"}`}
      >
        <div className={`mx-auto grid max-w-page gap-2 whitespace-nowrap grid-cols-3`}>
          <a href={`tel:${DEALER_TEL}`} className={`${bar} text-text ${secondaryButton}`}>
            Call us
          </a>
          <button type="button" onClick={(e) => show(e.currentTarget, "enquiry")} className={`${bar} rounded-control bg-accent text-on-accent`}>
            Enquire
          </button>
          <button type="button" onClick={(e) => show(e.currentTarget, "drive")} className={`${bar} text-text ${secondaryButton}`}>
            Test drive
          </button>
        </div>
      </div>
    </>
  );
}

// The test drive form inside a dialog: a day and a time, then the thanks. Used on a car page and on the Test Drive page.
export function TestDriveForm({ car }: { car: CarSummary }) {
  return (
    <LeadForm type="test_drive" car={car} variant="dialog" submitLabel="Book" success={{ heading: "Thanks, we have your request.", body: `We'll confirm your test drive in the ${car.name} by phone or email.` }}>
      {({ bind }) => <DriveFields bind={bind} carId={car.id} />}
    </LeadForm>
  );
}

// "Tell me if it comes back" on a sold car, "Tell me if the price drops" on one for sale. Just an email.
export function StockAlertButton({ car, kind }: { car: CarSummary; kind: "back-in-stock" | "price-drop" }) {
  const [open, setOpen] = useState(false);
  const opener = useRef<HTMLButtonElement>(null);
  const back = kind === "back-in-stock";
  return (
    <>
      <button ref={opener} type="button" onClick={() => setOpen(true)} className={`flex h-12 w-full items-center justify-center gap-2 px-3 text-text ${secondaryButton}`}>
        <BellIcon className="size-5 text-accent-text" />
        {back ? "Notify me" : "Price alert"}
      </button>
      <LeadDialog
        title={back ? "Tell me if one comes back" : "Tell me if the price drops"}
        open={open}
        onClose={() => {
          setOpen(false);
          opener.current?.focus();
        }}
      >
        <LeadForm
          type="alert"
          car={car}
          variant="dialog"
          prefill={{ alertKind: kind }}
          submitLabel="Set alert"
          success={{ heading: "You're on the list.", body: back ? `We'll email you if another ${car.name} comes in.` : `We'll email you if the price of the ${car.name} changes.` }}
        >
          {({ bind }) => (
            <>
              <input type="hidden" name="alertKind" value={kind} />
              <Field {...bind("email")} label="Email" type="email" autoComplete="email" maxLength={LIMITS.email} enterKeyHint="send" />
            </>
          )}
        </LeadForm>
      </LeadDialog>
    </>
  );
}
