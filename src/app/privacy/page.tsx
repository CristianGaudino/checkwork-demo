import type { Metadata } from "next";
import { InfoPage, InfoSection } from "@/components/InfoPage";
import { LEAD_RETENTION_MONTHS, SALE_KEEP_YEARS } from "@/lib/leads/constants";
import Link from "next/link";
import { NEW_TAB } from "@/components/ui";
import { DEALER_ADDRESS_TEXT, DEALER_EMAIL, DEALER_FACTS_CONFIRMED, SITE_NAME } from "@/lib/site";

export const metadata: Metadata = { title: "Privacy policy", description: `How ${SITE_NAME} uses the details you send us, how long we keep them, and how to ask for them to be deleted.` };

// Phase 3 copy on the shared frame (Phase 4); only the dealer's final wording is outstanding.
// The email is a placeholder until the dealer's domain forwards to the dealer (issue #54).
export default function PrivacyPage() {
  const askUs = DEALER_FACTS_CONFIRMED ? (
    <>
      email us at{" "}
      <a href={`mailto:${DEALER_EMAIL}`} className="font-semibold underline">
        {DEALER_EMAIL}
      </a>
    </>
  ) : (
    <>
      send us a message from the{" "}
      <Link href="/contact" className="font-semibold underline">
        contact page
      </Link>
    </>
  );
  return (
    <InfoPage title="Privacy policy" intro="Last updated November 2026. What we keep about you, why, and what you can ask us to do with it.">
      <InfoSection title="Who we are">
        <p>
          {SITE_NAME}, {DEALER_ADDRESS_TEXT}, decides how the details you send through this website are used. In law, we are the data controller.
          To reach us about your details, {askUs}.
        </p>
      </InfoSection>
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
        <p>
          When you arrive, the site notes where you came from, such as Google or Facebook, and keeps it in your browser until you close the tab.
          If you send us a request, it goes with it, so we know which ways of finding us work.
        </p>
        <p>
          The site also notes what you look at on this visit: the cars you open, the filters you use, and whether you try the finance calculator,
          start a valuation, or save or compare cars. It is kept in your browser, not in a cookie, and is gone when you close the tab. We only see it
          if you switch on sharing it when you send us a request.
        </p>
      </InfoSection>
      <InfoSection title="Why we use it">
        <p>Only to reply to your request. We don&apos;t use it for marketing, and we don&apos;t sell it.</p>
        <p>
          Cloudflare hosts this site, runs the bot check on our forms, counts page visits for us (without cookies) and delivers your request to us by email. Cloudflare also keeps the
          requests in a database, and trade-in photos, in the EU.
        </p>
        <p>When our staff draft a reply to your request or review, its text goes to our AI provider, which writes a draft for them to check. Phone numbers and email addresses are taken out first.</p>
        <p>
          If you ask us to tell you when a car comes back or drops in price, we keep your email and what you asked for, only to tell you. Any email we send you
          about it has a link to stop them, with no login.
        </p>
        <p>
          The maps on this site come from Google Maps. When one loads, Google receives your IP address and may set its own cookies, as{" "}
          <a href="https://policies.google.com/privacy" {...NEW_TAB} className="font-semibold underline">
            Google&apos;s privacy policy
            <span className="sr-only"> (opens in a new tab)</span>
          </a>{" "}
          describes.
        </p>
        <p>If you give us your WhatsApp number or message us there, your number and messages go to WhatsApp, which delivers them to us. We can also send you updates about your request on WhatsApp.</p>
      </InfoSection>
      <InfoSection title="How long we keep it">
        <p>We keep each request for {LEAD_RETENTION_MONTHS} months, then delete it.</p>
        <p>If you buy a car from us, we keep the record of the sale for {SALE_KEEP_YEARS} years, as Irish law asks of business records, then remove your name from it.</p>
      </InfoSection>
      <InfoSection title="Your rights">
        <p>
          You can ask to see the details we hold about you, to correct them, to delete them, or to object to how we use them. To ask, {askUs}. Please
          write from the address you used on the form, so we can find your request.
        </p>
        <p>
          If you are not happy with how we handle your details, you can complain to the Data Protection Commission at{" "}
          <a href="https://www.dataprotection.ie" {...NEW_TAB} className="font-semibold underline">
            dataprotection.ie
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
          .
        </p>
      </InfoSection>
    </InfoPage>
  );
}
