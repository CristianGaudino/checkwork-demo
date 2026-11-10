import type { Metadata } from "next";
import { LeadPage } from "@/components/leads/LeadPage";
import { TestDrivePicker } from "@/components/leads/TestDrivePicker";
import { DEALER_LOCATION, SITE_NAME } from "@/lib/site";
import { queryAllOrNull } from "@/lib/stock";
import { carSummary } from "@/lib/stock/format";

export const metadata: Metadata = {
  title: "Test Drive",
  description: `Pick a car, a day and a time, and drive it before you decide. ${SITE_NAME}, ${DEALER_LOCATION}.`,
};

// The stock is read per request, like the other stock pages.
export const dynamic = "force-dynamic";

export default async function TestDrivePage() {
  const all = await queryAllOrNull();
  return (
    <LeadPage
      title="Test Drive"
      intro="Pick a car, then a day and a time from our opening hours. We confirm it with you."
      how={[
        { title: "Pick a Car", text: "Any car in stock." },
        { title: "Choose a Time", text: "A day and a time we are open." },
        { title: "We Confirm", text: "We call or email to confirm." },
      ]}
    >
      <TestDrivePicker cars={(all?.cars ?? []).map(carSummary)} />
    </LeadPage>
  );
}
