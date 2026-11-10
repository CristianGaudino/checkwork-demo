import type { Metadata } from "next";
import { ComingSoon } from "@/components/demo/ComingSoon";

export const metadata: Metadata = { title: "Dealer admin", robots: { index: false } };

export default function Page() {
  return <ComingSoon title="Dealer admin" text="Leads, stock, marketing and analytics for the dealership. Coming next." />;
}
