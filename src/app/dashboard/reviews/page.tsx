import { EmptyState, PageHeader, Panel, SummaryTabs, TableFooter, adminButton, adminInput, pageOf, rowButton } from "@/components/admin/kit";
import { Stars } from "@/components/admin/Stars";
import { card } from "@/components/ui";
import { reviewsStore } from "@/lib/admin/collections";
import { fmtDate, plural } from "@/lib/admin/format";
import { SITE_NAME } from "@/lib/site";
import { REVIEW_FILTERS, filterReviews, parseReviewFilter, ratingSummary } from "@/lib/admin/reviews";
import { replyAction } from "./actions";

// What a reply came back as (replyAction). Only these codes are ever shown.
const NOTICES: Record<string, { tone: "good" | "warn"; text: string }> = {
  "reply-posted": { tone: "good", text: "Reply posted on Google." },
  "reply-removed": { tone: "good", text: "Reply removed from Google." },
  "not-connected": { tone: "warn", text: "Google review replies are not connected, so nothing was posted. Connect them under Settings." },
  "not-installed": { tone: "warn", text: "The Google keys are set, but posting replies is not switched on yet. Nothing was posted." },
};

export const metadata = { title: "Reviews" };

export default async function Page({ searchParams }: { searchParams: Promise<{ filter?: string; notice?: string; page?: string; per?: string }> }) {
  const sp = await searchParams;
  const filter = parseReviewFilter(sp.filter);
  const notice = sp.notice ? NOTICES[sp.notice] : undefined;
  const all = await reviewsStore.list();
  const s = ratingSummary(all);
  const paged = pageOf(filterReviews(all, filter), sp);
  const rows = paged.rows;

  return (
    <>
      <PageHeader title="Reviews" text={`${s.count ? `${s.average.toFixed(1)} average from ${plural(s.count, "Google review")}. ` : ""}Replies are posted on Google as ${SITE_NAME}.`} />
      {notice && (
        <p role="status" className={`rounded-control px-4 py-3 text-body ${notice.tone === "good" ? "bg-ok-soft text-ok" : "bg-warn-soft text-warn"}`}>
          {notice.text}
        </p>
      )}
      <SummaryTabs label="Reviews" items={REVIEW_FILTERS.map(([k, label]) => ({ label, href: `/dashboard/reviews?filter=${k}`, active: filter === k, count: filterReviews(all, k).length }))} />
      {paged.total === 0 ? (
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
              </div>
            </li>
          ))}
        </ul>
      )}
      <TableFooter page={paged.page} pageCount={paged.pageCount} total={paged.total} per={paged.per} />
    </>
  );
}
