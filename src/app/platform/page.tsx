import type { Metadata } from "next";
import { ComingSoon } from "@/components/demo/ComingSoon";

export const metadata: Metadata = { title: "Platform", robots: { index: false } };

export default function Page() {
  return <ComingSoon title="Platform" text="Dealerships, usage and billing for the whole platform. Coming next." />;
}
