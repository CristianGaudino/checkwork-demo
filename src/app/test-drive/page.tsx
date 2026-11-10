import type { Metadata } from "next";
import { CallButton } from "@/components/InfoPage";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { subTitle } from "@/components/ui";
import { LeadPage } from "@/components/leads/LeadPage";
import { TestDrivePicker } from "@/components/leads/TestDrivePicker";
import { DEALER_LOCATION, DEALER_PHONE, SITE_NAME } from "@/lib/site";
import { queryAllOrNull } from "@/lib/stock";
import { carSummary } from "@/lib/stock/format";

export const metadata: Metadata = {
  title: "Book a test drive",
  description: `Book a test drive at ${SITE_NAME} in ${DEALER_LOCATION}. Pick a used, new or commercial car, choose a day and time, and drive it before you decide. Bring your licence.`,
};

// The stock is read per request, like the other stock pages.
export const dynamic = "force-dynamic";

export default async function TestDrivePage() {
  // Used, new and commercial: a test drive is as likely on a new car or a van.
  const lists = await Promise.all([queryAllOrNull(), queryAllOrNull({ condition: "new" }), queryAllOrNull({ condition: "commercial" })]);
  const cars = lists.flatMap((l) => l?.cars ?? []);
  return (
    <LeadPage
      bare
      title="Book a test drive"
      intro="Drive it before you decide. Select a car below, choose a day and time, or call or message us."
      actions={
        <>
          <CallButton>Call {DEALER_PHONE}</CallButton>
          <WhatsAppButton />
        </>
      }
      how={[
        { title: "Select a car", text: "Any used, new or commercial car in stock.", more: ["Not sure which? Call or message us and we will suggest a few."] },
        { title: "Choose a time", text: "A day and a time we are open.", more: ["About 30 minutes, longer if you want it."] },
        { title: "Bring your licence", text: "We confirm by phone or email.", more: ["A full, valid driving licence is needed.", "Bring your insurance details if you have them.", "Trading in? Bring the car and we can value it on the day."] },
      ]}
    >
      <h2 className={subTitle}>Select a car</h2>
      <TestDrivePicker cars={cars.map(carSummary)} />
    </LeadPage>
  );
}
