import { Badge, EmptyState, Meter, Notice, PageHeader, Panel, SummaryTabs, TableFooter, adminButton, pageOf, rowButton } from "@/components/admin/kit";
import { Stars } from "@/components/admin/Stars";
import { AITextarea } from "@/components/admin/AIWriter";
import { reviewsStore, type AdminReview } from "@/lib/admin/collections";
import { fmtDate, plural } from "@/lib/admin/format";
import { SITE_NAME } from "@/lib/site";
import { REVIEW_FILTERS, filterReviews, parseReviewFilter, ratingSummary } from "@/lib/admin/reviews";
import { replyAction } from "./actions";
import { SubmitButton } from "@/components/admin/SubmitButton";

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
  // The ones waiting for a reply first, a low rating first among them, newest first within each: the work is at the top of every view.
  const rank = (r: AdminReview) => (r.reply ? 2 : r.rating <= 3 ? 0 : 1);
  const sorted = filterReviews(all, filter).sort((a, b) => rank(a) - rank(b));
  const paged = pageOf(sorted, sp);
  const waiting = paged.rows.filter((r) => !r.reply);
  const replied = paged.rows.filter((r) => r.reply);

  return (
    <>
      <PageHeader title="Reviews" text={`Your Google reviews. Replies are posted on Google as ${SITE_NAME}.`} />
      {notice && (
        <Notice tone={notice.tone}>{notice.text}</Notice>
      )}
      {/* The rating in one line a phone shows whole; how the stars split sits beside it from 640px. */}
      {s.count > 0 && (
        <section aria-label="Rating" className="flex flex-wrap items-center gap-x-8 gap-y-3">
          <p className="flex items-center gap-3">
            <span className="font-display text-[2rem] font-semibold leading-none tabular-nums">{s.average.toFixed(1)}</span>
            <span className="flex flex-col">
              <span aria-hidden="true"><Stars rating={Math.round(s.average)} /></span>
              <span className="text-meta text-text-2">out of 5, from {plural(s.count, "review")}</span>
            </span>
          </p>
          <ul aria-label="Reviews by stars" className="grid min-w-56 flex-1 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 text-meta max-sm:hidden sm:max-w-sm">
            {s.distribution.map((d) => (
              <li key={d.stars} className="contents">
                <span className="text-text-2">{plural(d.stars, "star")}</span>
                <Meter value={d.count} max={s.count} />
                <span className="text-right tabular-nums">{d.count}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
      <SummaryTabs label="Reviews" items={REVIEW_FILTERS.map(([k, label]) => ({ label, href: `/dashboard/reviews?filter=${k}`, active: filter === k, count: filterReviews(all, k).length }))} />
      {paged.total === 0 ? (
        <Panel>
          <EmptyState title={filter === "unreplied" ? "Every review has a reply" : "No reviews here"} />
        </Panel>
      ) : (
        <>
          {waiting.length > 0 && (
            <Panel title="Needs a reply" count={sorted.filter((r) => !r.reply).length}>
              <ReviewList rows={waiting} label="Needs a reply" />
            </Panel>
          )}
          {replied.length > 0 && (
            <Panel title="Replied" quiet>
              <ReviewList rows={replied} label="Replied" />
            </Panel>
          )}
        </>
      )}
      <TableFooter page={paged.page} pageCount={paged.pageCount} total={paged.total} per={paged.per} />
    </>
  );
}

// Each review with its Reply in place: pressing it opens the box under the review, with Write with AI, and Post reply sends it to Google.
// A review of 3 stars or fewer with no reply is marked: it is the one to answer first.
function ReviewList({ rows, label }: { rows: AdminReview[]; label: string }) {
  return (
    <ul aria-label={label} className="-mx-5 flex flex-col divide-y divide-hairline">
      {rows.map((r) => (
        <li key={r.id} data-review className="flex flex-col gap-2 px-5 py-4">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span data-author className="font-medium">{r.author}</span>
            <Stars rating={r.rating} />
            <span className="text-meta text-text-2">{fmtDate(r.createdAt)}</span>
            {!r.reply && r.rating <= 3 && <Badge tone="warn" strong>Low rating</Badge>}
          </div>
          <p className="max-w-measure whitespace-pre-line text-body">{r.text}</p>
          {r.reply && (
            <p className="max-w-measure whitespace-pre-line border-l-2 border-hairline pl-3 text-meta text-text-2">
              <span className="font-medium text-text">Your reply: </span>
              {r.reply}
            </p>
          )}
          <details className="group">
            <summary className={`${r.reply ? rowButton : `${rowButton} border-accent text-accent-text`} w-fit cursor-pointer list-none [&::-webkit-details-marker]:hidden`}>{r.reply ? "Edit reply" : "Reply"}</summary>
            <form action={replyAction.bind(null, r.id)} className="mt-2 flex max-w-measure flex-col gap-2">
              <AITextarea id={`reply-${r.id}`} name="reply" label={`Reply to ${r.author}`} rows={3} maxLength={500} defaultValue={r.reply ?? ""} task="reviewReply" request={{ task: "reviewReply", reviewId: r.id }} />
              <SubmitButton className={`${adminButton} self-start`}>{r.reply ? "Update reply" : "Post reply"}</SubmitButton>
            </form>
          </details>
        </li>
      ))}
    </ul>
  );
}
