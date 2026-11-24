import type { Metadata } from "next";
import { CallButton } from "@/components/InfoPage";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { subTitle } from "@/components/ui";
import { LeadPage } from "@/components/leads/LeadPage";
import { TestDrivePicker } from "@/components/leads/TestDrivePicker";
import { DEALER_LOCATION, DEALER_PHONE, SITE_NAME } from "@/lib/site";
import { everyKindOrNull } from "@/lib/stock";
import { forSale } from "@/lib/stock/types";
import { carSummary, fold } from "@/lib/stock/format";
import { Pager } from "@/components/stock/StockResults";
import { priceInfo } from "@/lib/stock/price";
import { SearchIcon } from "@/components/stock/icons";
import { SEARCH_MAKE_MODEL } from "@/lib/copy";

export const metadata: Metadata = {
  title: "Book a test drive",
  description: `Book a test drive at ${SITE_NAME} in ${DEALER_LOCATION}. Pick a used car or a van, choose a day and time, and drive it before you decide. Bring your licence.`,
};

// The stock is read per request, like the other stock pages.
export const dynamic = "force-dynamic";

const PER_PAGE = 24;
function paginate<T>(rows: T[], asked: string | undefined, size: number) {
  const pageCount = Math.max(1, Math.ceil(rows.length / size));
  const page = Math.min(pageCount, Math.max(1, Number.parseInt(asked ?? "1", 10) || 1));
  return { rows: rows.slice((page - 1) * size, page * size), page, pageCount, total: rows.length, per: size };
}

export default async function TestDrivePage({ searchParams }: PageProps<"/test-drive">) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim().slice(0, 80) : "";
  // Used and commercial: a test drive is as likely on a van. Searched and paged here, so the page carries 24 cars
  // whatever the size of the stock.
  const all = ((await everyKindOrNull()) ?? []).filter(forSale).sort((a, b) => Number(b.id) - Number(a.id)).map((c) => ({ ...carSummary(c), vatLine: priceInfo(c).vatLine })); // newest first, whatever the kind; only cars for sale; a van says its price is ex. VAT, as on its stock card
  const found = q ? all.filter((c) => fold(`${c.name} ${c.title}`).includes(fold(q))) : all;
  const { rows, page, pageCount, total, per } = paginate(found, typeof sp.page === "string" ? sp.page : undefined, PER_PAGE);
  const href = (n: number) => `/test-drive?${q ? `q=${encodeURIComponent(q)}&` : ""}page=${n}`;
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
        { title: "Select a car", text: "Any used car or van in stock.", more: ["Not sure which? Call or message us and we will suggest a few."] },
        { title: "Choose a time", text: "A day and a time we are open.", more: ["About 30 minutes, longer if you want it."] },
        { title: "Bring your licence", text: "We confirm by phone or email.", more: ["A full, valid driving licence is needed.", "Bring your insurance details if you have them.", "Trading in? Bring the car and we can value it on the day."] },
      ]}
    >
      <h2 className={subTitle}>Select a car</h2>
      <form action="/test-drive" method="get" role="search" className="relative mt-4 sm:max-w-sm">
        <SearchIcon aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-text-2" />
        <input type="search" name="q" defaultValue={q} aria-label={SEARCH_MAKE_MODEL} placeholder={SEARCH_MAKE_MODEL} maxLength={80} enterKeyHint="search" className="h-12 w-full rounded-control border border-control bg-card pl-10 pr-4 text-body" />
      </form>
      {rows.length === 0 ? <p className="mt-4 text-body text-text-2">No car matches. Try a make or a model, or call us.</p> : <TestDrivePicker cars={rows} />}
      <Pager page={page} pageCount={pageCount} first={(page - 1) * per + 1} shown={rows.length} total={total} href={href} />
    </LeadPage>
  );
}
