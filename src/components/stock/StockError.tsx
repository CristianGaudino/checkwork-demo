"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { StateBlock } from "@/components/StateBlock";
import { accentButton } from "@/components/ui";
import { CONNECTION_ERROR } from "@/lib/copy";
import { plural } from "@/lib/stock/format";

// Its own module so /saved can show it without loading the filter UI that lives in StockShell.
export const stateButton = `mt-6 inline-flex items-center ${accentButton}`;

// A list with nothing in it yet (saved, compare), with the way to the stock.
export function EmptyCars({ title, text }: { title: string; text: string }) {
  return (
    <StateBlock title={title} text={text}>
      <Link href="/used-cars" className={stateButton}>
        See used cars
      </Link>
    </StateBlock>
  );
}

// retry: what Try again does when the cars came from the browser (/saved) rather than the server render. noun: "commercial" on /commercial, "van" or "pickup" on a body page.
export function StockError({ retry, noun = "car" }: { retry?: () => void; noun?: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <StateBlock title={`We couldn't load the ${plural(noun)}`} text={CONNECTION_ERROR}>
      <button type="button" disabled={pending} onClick={() => (retry ? retry() : startTransition(() => router.refresh()))} className={stateButton}>
        Try again
      </button>
    </StateBlock>
  );
}
