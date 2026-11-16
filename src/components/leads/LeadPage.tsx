import { IconBadge, TitleText } from "@/components/Feature";
import { card, pageMain } from "@/components/ui";
import { PageHeading } from "@/components/PageHeading";

// `more`: the detail that belongs with a step (what photos to send, say), shown under it in quieter text.
export type HowStep = { title: string; text: string; more?: string[] };

// The frame for the form pages: what the page is for, how it works in three steps, then the
// form in a card. Every form page says something before it asks something.
export function LeadPage({ title, intro, how, actions, picture, bare = false, children }: { title: string; intro: React.ReactNode; how?: HowStep[]; actions?: React.ReactNode; picture?: React.ReactNode; bare?: boolean; children: React.ReactNode }) {
  return (
    <main className={pageMain}>
      <PageHeading title={title} intro={intro} actions={actions} picture={picture} />
      {how && (
        // Open on the page, not cards: a card reads as something to press, and a chevron here read as a drop-down beside the form's own steps.
        <ol className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-8">
          {how.map((s, i) => (
            <li key={s.title} className="reveal flex gap-4 border-t border-hairline pt-4">
              <IconBadge size="sm">{i + 1}</IconBadge>
              <div className="flex min-w-0 flex-col gap-2">
                <TitleText title={s.title} text={s.text} />
                {s.more && (
                  <ul className="flex flex-col gap-1 text-meta text-text-2">
                    {s.more.map((t) => (
                      <li key={t}>{t}</li>
                    ))}
                  </ul>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}
      {bare ? <div className="mt-8 w-full">{children}</div> : <div data-wells className={`mt-8 w-full ${card} p-5 sm:p-6`}>{children}</div>}
    </main>
  );
}
