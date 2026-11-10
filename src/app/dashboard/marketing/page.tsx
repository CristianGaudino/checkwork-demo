import { Badge, EmptyState, FilterTabs, Field, PageHeader, Panel, StatCard, StatGrid, adminButton, adminButtonQuiet, adminInput, type Tone } from "@/components/admin/kit";
import { PostComposer } from "@/components/admin/PostComposer";
import { sendDuePosts } from "@/lib/admin/scheduler";
import { NETWORKS, adsStore, getSettings, newslettersStore, postsStore, subscribersStore } from "@/lib/admin/collections";
import { fmtDate, fmtDateTime, fmtEur, fmtNum, fmtPct } from "@/lib/admin/format";
import { writePost } from "@/lib/admin/marketing";
import { adminCars } from "@/lib/admin/stock-admin";
import { isUsable } from "@/lib/integrations";
import { carName } from "@/lib/stock/format";
import { isSold } from "@/lib/stock/types";
import { composeAction, createNewsletterAction, deleteAdAction, deleteNewsletterAction, deletePostAction, publishPostAction, sendNewsletterAction, startAdAction } from "./actions";

export const metadata = { title: "Marketing" };

const TABS = [["posts", "Posts and ads"], ["newsletters", "Newsletters"]] as const;

// Every message the page can show. The URL carries only a code from this list.
const NOTICES: Record<string, { tone: "good" | "warn"; text: string }> = {
  "post-draft": { tone: "good", text: "Draft saved." },
  "draft-ad": { tone: "good", text: "Draft and ad draft saved." },
  "post-scheduled": { tone: "good", text: "Post scheduled." },
  "post-published": { tone: "good", text: "Post published." },
  "published-ad": { tone: "good", text: "Post published and ad started." },
  "published-ad-draft": { tone: "warn", text: "Post published. The ad is saved as a draft because ads are not connected." },
  "ad-started": { tone: "good", text: "Ad started." },
  "letter-created": { tone: "good", text: "Newsletter draft saved." },
  "letter-sent": { tone: "good", text: "Newsletter sent." },
  deleted: { tone: "good", text: "Deleted." },
  invalid: { tone: "warn", text: "That did not go through. Check the details and try again." },
  "invalid-time": { tone: "warn", text: "Choose a time that has not passed." },
  "social-not-connected": { tone: "warn", text: "Facebook and Instagram are not connected, so nothing was posted. The draft is kept. Connect them under Settings." },
  "ads-not-connected": { tone: "warn", text: "Ads are not connected, so the ad was not started. Connect them under Settings." },
  "newsletters-not-connected": { tone: "warn", text: "Newsletter sending is not connected, so nothing was sent. Connect it under Settings." },
  "social-not-installed": { tone: "warn", text: "Posting is not switched on yet. Nothing was posted." },
  "ads-not-installed": { tone: "warn", text: "Ads are not switched on yet. Nothing was started." },
  "newsletters-not-installed": { tone: "warn", text: "Sending is not switched on yet. Nothing was sent." },
};

const STATUS: Record<string, { tone: Tone; label: string }> = {
  draft: { tone: "neutral", label: "Draft" },
  scheduled: { tone: "info", label: "Scheduled" },
  posted: { tone: "good", label: "Posted" },
  running: { tone: "good", label: "Running" },
  paused: { tone: "warn", label: "Paused" },
  ended: { tone: "neutral", label: "Ended" },
};
const quiet = "min-h-11 px-2 text-meta font-medium underline";

export default async function Page({ searchParams }: { searchParams: Promise<{ tab?: string; notice?: string; car?: string }> }) {
  const sp = await searchParams;
  const tab = TABS.some(([k]) => k === sp.tab) ? sp.tab! : "posts";
  const notice = sp.notice ? NOTICES[sp.notice] : undefined;
  await sendDuePosts(); // posts whose time has come go out before the list is read
  const [posts, ads, letters, subs, cars, settings] = await Promise.all([postsStore.list(), adsStore.list(), newslettersStore.list(), subscribersStore.list(), adminCars(), getSettings()]);
  const forSale = cars.filter((c) => !isSold(c)).sort((a, b) => Number(b.id) - Number(a.id));
  const live = subs.filter((s) => s.status === "subscribed").length;
  // shortcut: the text for every car and network is sent to the page; fine at about 100 cars, write it on choosing a car beyond that.
  const composerCars = forSale.map((c) => ({
    slug: c.slug,
    title: carName(c),
    photos: c.photos.slice(0, 6),
    text: Object.fromEntries(NETWORKS.map((n) => [n, writePost(c, n, settings.marketing)])) as Record<(typeof NETWORKS)[number], string>,
  }));
  // Posts and ads in one list, newest first.
  const feed = [...posts.map((p) => ({ kind: "post" as const, at: p.createdAt, p })), ...ads.map((a) => ({ kind: "ad" as const, at: a.createdAt, a }))].sort((x, y) => y.at - x.at);

  return (
    <>
      <PageHeader title="Marketing" />
      {notice && (
        <p role="status" className={`rounded-control px-4 py-3 text-body ${notice.tone === "good" ? "bg-ok-soft text-ok" : "bg-warn-soft text-warn"}`}>
          {notice.text}
        </p>
      )}
      <FilterTabs items={TABS.map(([k, label]) => ({ label, href: `/dashboard/marketing?tab=${k}`, active: tab === k }))} />

      {tab === "posts" && (
        <>
          <Panel title="New post">
            <PostComposer cars={composerCars} initialSlug={sp.car ?? ""} action={composeAction} />
            {!isUsable("social") && <p className="text-meta text-text-2">Facebook and Instagram are not connected, so posts are kept as drafts.</p>}
          </Panel>
          <StatGrid>
            <StatCard label="Posts published" value={fmtNum(posts.filter((p) => p.status === "posted").length)} />
            <StatCard label="Scheduled" value={fmtNum(posts.filter((p) => p.status === "scheduled").length)} />
            <StatCard label="Reach" value={fmtNum(posts.reduce((s, p) => s + (p.reach ?? 0), 0))} />
            <StatCard label="Ads running" value={fmtNum(ads.filter((a) => a.status === "running").length)} />
          </StatGrid>
          <Panel title="Posts and ads">
            {feed.length === 0 ? (
              <EmptyState title="Nothing yet" />
            ) : (
              <ul className="flex flex-col divide-y divide-hairline">
                {feed.map((item) =>
                  item.kind === "post" ? (
                    <li key={item.p.id} className="flex flex-col gap-2 py-3">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span className="font-medium">{item.p.network}</span>
                        <Badge tone={STATUS[item.p.status].tone}>{STATUS[item.p.status].label}</Badge>
                        <span className="text-meta text-text-2">
                          {item.p.carTitle} · {item.p.status === "scheduled" && item.p.scheduledFor ? fmtDateTime(item.p.scheduledFor) : fmtDate(item.p.postedAt ?? item.p.createdAt)}
                        </span>
                        {item.p.status === "posted" && <span className="text-meta text-text-2 sm:ml-auto">{fmtNum(item.p.reach ?? 0)} reached · {fmtNum(item.p.clicks ?? 0)} clicks</span>}
                      </div>
                      <p className="line-clamp-2 max-w-measure whitespace-pre-line text-body text-text-2">{item.p.text}</p>
                      {item.p.status !== "posted" && (
                        <div className="flex flex-wrap items-center gap-2">
                          <form action={publishPostAction.bind(null, item.p.id)}><button type="submit" className={`${adminButtonQuiet} h-11`}>Publish now</button></form>
                          <form action={deletePostAction.bind(null, item.p.id)}><button type="submit" className={`${quiet} text-bad`}>Delete</button></form>
                        </div>
                      )}
                    </li>
                  ) : (
                    <li key={item.a.id} className="flex flex-col gap-2 py-3">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span className="font-medium">{item.a.platform} ad</span>
                        <Badge tone={STATUS[item.a.status].tone}>{STATUS[item.a.status].label}</Badge>
                        <span className="text-meta text-text-2">{item.a.carTitle} · {fmtEur(item.a.budgetEur)}</span>
                        {item.a.status !== "draft" && (
                          <span className="text-meta text-text-2 sm:ml-auto">
                            {fmtNum(item.a.impressions)} seen · {item.a.impressions ? fmtPct((item.a.clicks / item.a.impressions) * 100) : "0%"} clicked · {fmtNum(item.a.leads)} leads
                          </span>
                        )}
                      </div>
                      {item.a.status === "draft" && (
                        <div className="flex flex-wrap items-center gap-2">
                          <form action={startAdAction.bind(null, item.a.id)}><button type="submit" className={`${adminButtonQuiet} h-11`}>Start ad</button></form>
                          <form action={deleteAdAction.bind(null, item.a.id)}><button type="submit" className={`${quiet} text-bad`}>Delete</button></form>
                        </div>
                      )}
                    </li>
                  ),
                )}
              </ul>
            )}
          </Panel>
        </>
      )}

      {tab === "newsletters" && (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <form action={createNewsletterAction}>
              <button type="submit" name="intent" value="write" className={adminButton}>Write from the newest cars</button>
            </form>
            <p className="text-meta text-text-2">{fmtNum(live)} subscribers{isUsable("newsletter") ? "" : ", sending not connected"}</p>
          </div>
          <Panel title="Newsletters">
            {letters.length === 0 ? (
              <EmptyState title="No newsletters yet" />
            ) : (
              <ul className="flex flex-col divide-y divide-hairline">
                {[...letters].sort((a, b) => b.createdAt - a.createdAt).map((n) => (
                  <li key={n.id} className="flex flex-col gap-2 py-3">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span className="font-medium">{n.subject}</span>
                      <Badge tone={n.status === "sent" ? "good" : "neutral"}>{n.status === "sent" ? "Sent" : "Draft"}</Badge>
                      <span className="text-meta text-text-2">{fmtDate(n.sentAt ?? n.createdAt)}</span>
                      {n.status === "sent" && n.recipients !== undefined && (
                        <span className="text-meta text-text-2 sm:ml-auto">{fmtNum(n.recipients)} sent · {fmtPct(((n.opens ?? 0) / n.recipients) * 100)} opened · {fmtPct(((n.clicks ?? 0) / n.recipients) * 100)} clicked</span>
                      )}
                    </div>
                    <p className="line-clamp-2 max-w-measure whitespace-pre-line text-body text-text-2">{n.body}</p>
                    {n.status === "draft" && (
                      <div className="flex flex-wrap items-center gap-2">
                        <form action={sendNewsletterAction.bind(null, n.id)}><button type="submit" className={`${adminButtonQuiet} h-11`}>Send to {fmtNum(live)}</button></form>
                        <form action={deleteNewsletterAction.bind(null, n.id)}><button type="submit" className={`${quiet} text-bad`}>Delete</button></form>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Panel>
          <details className="group">
            <summary className="flex min-h-11 cursor-pointer list-none items-center text-meta font-medium text-accent-text underline [&::-webkit-details-marker]:hidden">Write your own</summary>
            <Panel className="mt-3">
              <form action={createNewsletterAction} className="flex flex-col gap-4">
                <Field label="Subject"><input name="subject" className={adminInput} maxLength={120} /></Field>
                <Field label="Text"><textarea name="body" rows={6} maxLength={4000} className={`${adminInput} h-auto py-2`} /></Field>
                <button type="submit" name="intent" value="save" className={`${adminButtonQuiet} self-start`}>Save draft</button>
              </form>
            </Panel>
          </details>
        </>
      )}
    </>
  );
}
