import type { Metadata } from "next";
import Link from "next/link";
import { accentButton, messagePage, pageTitle, secondaryButton } from "@/components/ui";
import { describe, readToken } from "./apply";
import { unsubscribeAction } from "./actions";

export const metadata: Metadata = { title: "Unsubscribe", robots: { index: false } };

// From the link in a newsletter or stock alert email (src/lib/unsubscribe.ts). One press, no login, and no email address on the page.
export default async function Page({ searchParams }: { searchParams: Promise<{ t?: string; done?: string }> }) {
  const { t, done } = await searchParams;
  const target = await readToken(t);
  const about = target && (await describe(target));

  if (!about) {
    return (
      <main className={messagePage}>
        <h1 className={pageTitle}>This link no longer works</h1>
        <p className="mt-4 max-w-measure text-body text-text-2">Use the link in a newer email, or reply to any of our emails and we will stop them.</p>
        <Link href="/" className={`mt-6 inline-flex items-center ${secondaryButton} h-12 px-6`}>
          Go to the home page
        </Link>
      </main>
    );
  }
  if (done || about.stopped) {
    return (
      <main className={messagePage}>
        <h1 className={pageTitle}>You are unsubscribed</h1>
        <p className="mt-4 max-w-measure text-body text-text-2">We will not send you {about.what} again.</p>
      </main>
    );
  }
  return (
    <main className={messagePage}>
      <h1 className={pageTitle}>Unsubscribe</h1>
      <p className="mt-4 max-w-measure text-body text-text-2">Stop {about.what}?</p>
      <form action={unsubscribeAction} className="mt-6">
        <input type="hidden" name="t" value={t} />
        <button type="submit" className={`inline-flex items-center ${accentButton}`}>
          Unsubscribe
        </button>
      </form>
    </main>
  );
}
