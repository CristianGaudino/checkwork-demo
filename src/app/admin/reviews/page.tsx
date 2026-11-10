import { Badge, EmptyState, FilterTabs, PageHeader, Panel, StatCard, StatGrid, adminButton, adminInput } from "@/components/admin/kit";
import { Stars } from "@/components/admin/Stars";
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
      <PageHeader title="Reviews" text="What customers say, and your replies. Reply to every review, good or bad." />
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <StatGrid>
          <StatCard label="Average rating" value={s.count ? s.average.toFixed(1) : "None"} hint={`${s.count} reviews`} />
          <StatCard label="Without a reply" value={String(all.filter((r) => !r.reply).length)} />
        </StatGrid>
        <Panel title="Ratings">
          <ul className="flex flex-col gap-2">
            {s.distribution.map((d) => (
              <li key={d.stars} className="flex items-center gap-3 text-meta">
                <span className="w-14 shrink-0">{d.stars} stars</span>
                <span className="h-2 flex-1 overflow-hidden rounded-full bg-hairline">
                  <span className="block h-full rounded-full bg-warning" style={{ width: `${s.count ? (d.count / s.count) * 100 : 0}%` }} />
                </span>
                <span className="w-6 text-right tabular-nums">{d.count}</span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
      <FilterTabs items={REVIEW_FILTERS.map(([k, label]) => ({ label, href: `/admin/reviews?filter=${k}`, active: filter === k }))} />
      {rows.length === 0 ? (
        <Panel>
          <EmptyState title="No reviews here" />
        </Panel>
      ) : (
        rows.map((r) => (
          <Panel key={r.id}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-semibold">{r.author}</span>
                <Stars rating={r.rating} />
                <span className="text-meta text-text-2">{fmtDate(r.createdAt)}</span>
                {r.flagged && <Badge tone="warn">Flagged</Badge>}
              </div>
              <form action={flagAction.bind(null, r.id)}>
                <button type="submit" className="min-h-11 px-2 text-meta font-semibold underline">
                  {r.flagged ? "Remove flag" : "Flag for review"}
                </button>
              </form>
            </div>
            <p className="max-w-[65ch] text-body">{r.text}</p>
            <form action={replyAction.bind(null, r.id)} className="flex flex-col gap-2">
              <label className="flex flex-col gap-1">
                <span className="text-meta font-semibold">{r.reply ? "Your reply" : "Reply"}</span>
                <textarea name="reply" rows={2} maxLength={500} defaultValue={r.reply ?? ""} className={`${adminInput} h-auto py-2`} />
              </label>
              <button type="submit" className={`${adminButton} self-start`}>
                {r.reply ? "Update reply" : "Post reply"}
              </button>
            </form>
          </Panel>
        ))
      )}
    </>
  );
}
