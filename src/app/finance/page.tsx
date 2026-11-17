import type { Metadata } from "next";
import { DEALER_LOCATION, SITE_NAME } from "@/lib/site";
import { FinanceCalculator } from "@/components/finance/FinanceCalculator";
import { pageMain } from "@/components/ui";
import { connection } from "next/server";
import { PageCar, PageHeading } from "@/components/PageHeading";
import { showroomPhoto } from "@/lib/stock/showroom";
import { AffiliationLine } from "@/components/Affiliations";

export const metadata: Metadata = {
  title: "Car finance estimator",
  description: `Estimate a monthly payment on a used car. It's the start of the process: choose a car and send an enquiry. ${SITE_NAME}, ${DEALER_LOCATION}.`,
};

export default async function FinancePage() {
  await connection(); // the car in the picture is today's stock
  const photo = await showroomPhoto();
  return (
    <main className={pageMain}>
      <PageHeading title="Finance estimator" intro="Type a price and choose a deposit and a term to see roughly what a monthly payment could be." picture={<PageCar photo={photo} />} />
      <div className="mt-8 flex flex-col gap-4">
        <FinanceCalculator />
        <AffiliationLine kind="finance" lead="Finance is arranged through" />
      </div>
    </main>
  );
}
