import { IconBadge, TitleText } from "@/components/Feature";
import { card, pageMain, subTitle } from "@/components/ui";
import { PageHeading } from "@/components/PageHeading";

// `more`: the detail that belongs with a step (what photos to send, say), shown under it in quieter text.
export type HowStep = { title: string; text: string; more?: string[] };

// The frame for the form pages: what the page is for, how it works in three steps, then the form in a card (on a phone the steps go
// after the form, so it starts under the title; the intro still says what the page is for before it asks anything).
export function LeadPage({ title, intro, how, actions, picture, bare = false, children }: { title: string; intro: React.ReactNode; how?: HowStep[]; actions?: React.ReactNode; picture?: React.ReactNode; bare?: boolean; children: React.ReactNode }) {
  return (
    <main className={`${pageMain} flex flex-col`}>
      <PageHeading title={title} intro={intro} actions={actions} picture={picture} />
      {how && (
        // Open on the page, not cards: a card reads as something to press, and a chevron here read as a drop-down beside the form's own steps.
        // On a phone it comes after the form, so the form starts under the title; the heading says what it is down there.
        <section className="@container mt-8 max-sm:order-last">
          <h2 className={`${subTitle} mb-4 sm:sr-only`}>How it works</h2>
          {/* The section is the container (queries in rem): three across from 640px and the number beside its step, while there is
              room; with large text one column, and the number above its step. */}
          <ol className="grid grid-cols-1 gap-4 sm:@min-[30rem]:grid-cols-3 sm:gap-8">
            {how.map((s, i) => (
              <li key={s.title} className="reveal flex flex-col gap-4 border-t border-hairline pt-4 @min-[14rem]:flex-row">
                <IconBadge>{i + 1}</IconBadge>
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
        </section>
      )}
      {bare ? <div className="mt-8 w-full">{children}</div> : <div data-wells className={`mt-8 w-full ${card} p-5 sm:p-6`}>{children}</div>}
    </main>
  );
}
