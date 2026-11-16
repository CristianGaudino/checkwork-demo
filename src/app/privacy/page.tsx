import type { Metadata } from "next";
import { InfoPage, InfoSection } from "@/components/InfoPage";
import { LEAD_RETENTION_MONTHS, SALE_KEEP_YEARS } from "@/lib/leads/constants";
import { DEALER_EMAIL, SITE_NAME } from "@/lib/site";

export const metadata: Metadata = { title: "Privacy policy", description: `How ${SITE_NAME} uses the details you send us, how long we keep them, and how to ask for them to be deleted.` };

// Phase 3 copy on the shared frame (Phase 4); only the dealer's final wording is outstanding.
// The email is a placeholder until the dealer's domain forwards to the dealer (issue #54).
export default function PrivacyPage() {
  return (
    <InfoPage title="Privacy policy">
      <InfoSection title="What we collect">
        <p>
          When you send us a request, we keep what you type into the form: your name, phone number, email, your message and the other fields of that
          form, such as the registration of a car you want valued. We also note the car you asked about, the page you sent it from and when you agreed to this
          policy. Nothing about your device is stored.
        </p>
        <p>
          If you add photos, of your car or of a car you are looking for, your phone shrinks them before they are sent, which also removes the location and camera details. We keep
          them for the same {LEAD_RETENTION_MONTHS} months as the rest of your request.
        </p>
      </InfoSection>
      <InfoSection title="What stays on your device">
        <p>
          The cars you save, compare or look at, and a form you have started but not sent, are kept in your browser. To show you those cars, the
          site asks for them by number, and we don&apos;t keep that. An unsent form stays until you close the tab, and never with your name, phone
          number or email. Recently viewed cars can be cleared from the list.
        </p>
        <p>We also keep anonymous counts of how often features of the site are used, such as saving a car or using a filter. They are kept without cookies and say nothing about you.</p>
      </InfoSection>
      <InfoSection title="Why we use it">
        <p>Only to reply to your request. We don&apos;t use it for marketing, and we don&apos;t sell it.</p>
        <p>
          Cloudflare hosts this site, runs the bot check on our forms, counts page visits for us (without cookies) and delivers your request to us by email. Cloudflare also keeps the
          requests in a database, and trade-in photos, in the EU.
        </p>
      </InfoSection>
      <InfoSection title="How long we keep it">
        <p>We keep each request for {LEAD_RETENTION_MONTHS} months, then delete it.</p>
        <p>If you buy a car from us, we keep the record of the sale for {SALE_KEEP_YEARS} years, as Irish law asks of business records, then remove your name from it.</p>
      </InfoSection>
      <InfoSection title="How to ask us to delete it">
        <p>
          Email us at{" "}
          <a href={`mailto:${DEALER_EMAIL}`} className="font-semibold underline">
            {DEALER_EMAIL}
          </a>{" "}
          and we&apos;ll delete your details.
          Please write from the address you used on the form, so we can find your request.
        </p>
      </InfoSection>
    </InfoPage>
  );
}
