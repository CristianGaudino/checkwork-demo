import { PhoneIcon } from "@/components/stock/icons";
import { DEALER_TEL } from "@/lib/site";
import { accentButton, pageMain, subTitle } from "@/components/ui";
import { PageHeading } from "@/components/PageHeading";

// Shared text-page frame (service, about, terms, privacy, warranty).
export function InfoPage({ title, intro, children }: { title: string; intro?: string; children: React.ReactNode }) {
  return (
    <main className={pageMain}>
      <PageHeading title={title} intro={intro} />
      <div className="mt-6 flex max-w-measure flex-col gap-8 text-body">{children}</div>
    </main>
  );
}

export function InfoSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className={subTitle}>{title}</h2>
      {children}
    </section>
  );
}

// The page's one accent button: dial the dealer. Full width on phones, at least 240px from 640px (never wider than its row, as large
// text could make it), unless `sizing` says otherwise.
export function CallButton({ children, sizing = "w-full sm:w-auto sm:min-w-[min(15rem,100%)] sm:self-start" }: { children: React.ReactNode; sizing?: string }) {
  return (
    <a
      href={`tel:${DEALER_TEL}`}
      className={`flex items-center justify-center gap-2 ${sizing} ${accentButton}`}
    >
      <PhoneIcon className="size-5" />
      {children}
    </a>
  );
}
