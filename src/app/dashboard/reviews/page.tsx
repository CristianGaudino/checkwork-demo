import { Badge, EmptyState, PageHeader, Panel, SummaryTabs, adminButton, adminInput, rowButton } from "@/components/admin/kit";
import { Stars } from "@/components/admin/Stars";
import { card } from "@/components/ui";
import { reviewsStore } from "@/lib/admin/collections";
import { fmtDate } from "@/lib/admin/format";
import { REVIEW_FILTERS, filterReviews, parseReviewFilter, ratingSummary } from "@/lib/admin/reviews";
import { flagAction, replyAction } from "./actions";

export const metadata = { title: "Reviews" };

export default async function Page({ searchParams }: { searchParams: Promise<{ filter?: string }> }) {
  const filter = parseReviewFilter((await searchParams).filter);
  const all = await reviewsStore.list();
  const s = ratingSummary(all);
  const rows = filterReviews(all, filter);

  return (
    <>
      <PageHeader title="Reviews" text={s.count ? `${s.average.toFixed(1)} average from ${s.count} reviews` : undefined} />
      <SummaryTabs label="Reviews" items={REVIEW_FILTERS.map(([k, label]) => ({ label, href: `/dashboard/reviews?filter=${k}`, active: filter === k, count: filterReviews(all, k).length }))} />
      {rows.length === 0 ? (
        <Panel>
          <EmptyState title="No reviews here" />
        </Panel>
      ) : (
        // One list, every other review filled. The reply box opens on demand, so the list stays short enough to read.
        <ul aria-label="Reviews" className={`${card} overflow-hidden`}>
          {rows.map((r) => (
            <li key={r.id} data-review className="flex flex-col gap-2 px-4 py-4 even:bg-row-alt sm:px-5">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span data-author className="font-medium">{r.author}</span>
                <Stars rating={r.rating} />
                <span className="text-meta text-text-2">{fmtDate(r.createdAt)}</span>
                {r.flagged && <Badge tone="warn">Flagged</Badge>}
              </div>
              <p className="max-w-measure text-body">{r.text}</p>
              {r.reply && (
                <p className="max-w-measure border-l-2 border-hairline pl-3 text-meta text-text-2">
                  <span className="font-medium text-text">Your reply: </span>
                  {r.reply}
                </p>
              )}
              <div className="flex flex-wrap items-start gap-2">
                <details className="group w-full sm:w-auto sm:flex-1">
                  <summary className={`${r.reply ? rowButton : `${rowButton} border-accent text-accent-text`} w-fit cursor-pointer list-none [&::-webkit-details-marker]:hidden`}>{r.reply ? "Edit reply" : "Reply"}</summary>
                  <form action={replyAction.bind(null, r.id)} className="mt-2 flex max-w-measure flex-col gap-2">
                    <label className="sr-only" htmlFor={`reply-${r.id}`}>Reply to {r.author}</label>
                    <textarea id={`reply-${r.id}`} name="reply" rows={3} maxLength={500} defaultValue={r.reply ?? ""} className={`${adminInput} h-auto py-2`} />
                    <button type="submit" className={`${adminButton} self-start`}>{r.reply ? "Update reply" : "Post reply"}</button>
                  </form>
                </details>
                <form action={flagAction.bind(null, r.id)}>
                  <button type="submit" className={rowButton}>{r.flagged ? "Remove flag" : "Flag for review"}</button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
