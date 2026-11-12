import type { Metadata } from "next";
import Link from "next/link";
import { adminButton } from "@/components/admin/kit";

export const metadata: Metadata = { title: "Page not found" };

// A dashboard page that is not there: a lead or a car since deleted, a page this role cannot open, or a mistyped address
// ([...missing]/page.tsx). Inside the dashboard's frame, so its menu stays and the way back is the overview, not the public stock.
export default function DashboardNotFound() {
  return (
    <div className="flex flex-col items-center gap-3 px-4 py-16 text-center">
      <h1 className="text-display font-bold">We couldn&apos;t find that page</h1>
      <p className="max-w-[45ch] text-body text-text-2">It may have been deleted, or it&apos;s not one your role can open.</p>
      <Link href="/dashboard" className={`mt-2 ${adminButton}`}>
        Back to the overview
      </Link>
    </div>
  );
}
