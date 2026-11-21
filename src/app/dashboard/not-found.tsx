import type { Metadata } from "next";
import Link from "next/link";
import { card } from "@/components/ui";
import { adminButton, adminButtonQuiet } from "@/components/admin/kit";

export const metadata: Metadata = { title: "Page not found" };

// A dashboard page that is not there: a lead or a car since deleted, a page this role cannot open, or a mistyped address
// ([...missing]/page.tsx). Inside the dashboard's frame, so its menu stays and the way back is the overview, not the public stock.
export default function DashboardNotFound() {
  return (
    <div className="flex flex-col items-center px-4 py-12">
      <div className={`${card} flex w-full max-w-lg flex-col items-center gap-3 p-8 text-center`}>
        <h1 className="text-display font-bold">We couldn&apos;t find that page</h1>
        <p className="max-w-[45ch] text-body text-text-2">It may have been deleted, or it&apos;s not one your role can open. Use the menu, or start again from the overview.</p>
        <div className="mt-2 flex flex-wrap justify-center gap-3">
          <Link href="/dashboard" className={adminButton}>
            Back to the overview
          </Link>
          <Link href="/dashboard/help" className={adminButtonQuiet}>
            Ask us for help
          </Link>
        </div>
      </div>
    </div>
  );
}
