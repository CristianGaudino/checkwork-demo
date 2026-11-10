import type { Metadata } from "next";
import { DEALER_LOCATION, SITE_NAME } from "@/lib/site";
import { FinanceCalculator } from "@/components/finance/FinanceCalculator";
import { pageMain } from "@/components/ui";
import { PageHeading } from "@/components/PageHeading";

export const metadata: Metadata = {
  title: "Car finance estimator",
  description: `Estimate a monthly payment on a used car. It's the start of the process: choose a car and send an enquiry. ${SITE_NAME}, ${DEALER_LOCATION}.`,
};

export default function FinancePage() {
  return (
    <main className={pageMain}>
      <PageHeading title="Finance estimator" intro="Type a price and choose a deposit and a term to see roughly what a monthly payment could be." />
      <div className="mt-6 flex flex-col gap-4">
        <FinanceCalculator />
      </div>
    </main>
  );
}
