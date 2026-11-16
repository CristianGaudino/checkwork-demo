import { Badge, EmptyState, Notice, PageHeader, Panel, SummaryTabs, TableFooter, TableToolbar, pageOf, adminButton, adminButtonQuiet, rowButton, type FilterGroup, type Tone } from "@/components/admin/kit";
import { PlusIcon } from "@/components/stock/icons";
import { ActButton } from "@/components/admin/ActButton";
import { sendDuePosts } from "@/lib/admin/scheduler";
import { adsStore, mediaStore, newslettersStore, postsStore, subscribersStore } from "@/lib/admin/collections";
import { LibraryUpload } from "@/components/admin/MediaUpload";
import { NewsletterFields } from "@/components/admin/NewsletterFields";
import { hasModule } from "@/lib/modules";
import { notFound } from "next/navigation";
import { TIME_ZONE } from "@/lib/site";
import { FORMAT_LABELS } from "@/lib/admin/networks";
import { addDays, dublinDay, fmtDate, fmtDateTime, fmtEur, fmtNum, fmtPct, isIsoDay, plural } from "@/lib/admin/format";
import Link from "next/link";
import { calendarWeek, weekDays, worthPosting } from "@/lib/admin/marketing";
import { adminCars } from "@/lib/admin/stock-admin";
import { isUsable } from "@/lib/integrations";
import { carName } from "@/lib/stock/format";
import { forSale } from "@/lib/stock/types";
import { createNewsletterAction, deleteAdAction, deleteMediaAction, deleteNewsletterAction, deletePostAction, publishPostAction, sendNewsletterAction, startAdAction } from "./actions";
import { SubmitButton } from "@/components/admin/SubmitButton";

export const metadata = { title: "Marketing" };

// Each tab belongs to a module (#173): posts, the calendar and the media library to Social and ads, newsletters to Newsletter and alerts.
const TABS = [["posts", "Posts and ads", "social"], ["calendar", "Calendar", "social"], ["media", "Media", "social"], ["newsletters", "Newsletters", "newsletter"]] as const;

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
  "car-gone": { tone: "warn", text: "That car is no longer for sale, so nothing was posted." },
  "no-subscribers": { tone: "warn", text: "Nobody is subscribed yet, so nothing was sent." },
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

export default async function Page({ searchParams }: { searchParams: Promise<{ tab?: string; notice?: string; show?: string; status?: string; page?: string; per?: string; week?: string }> }) {
  const sp = await searchParams;
  const [social, news] = await Promise.all([hasModule("social"), hasModule("newsletter")]);
  const tabs = TABS.filter(([, , m]) => (m === "social" ? social : news));
  if (!tabs.length) notFound(); // neither module: there is nothing to show
  const tab = tabs.some(([k]) => k === sp.tab) ? sp.tab! : tabs[0][0];
  const notice = sp.notice ? NOTICES[sp.notice] : undefined;
  await sendDuePosts(); // posts whose time has come go out before the list is read
  const [posts, ads, letters, subs, cars, library] = await Promise.all([postsStore.list(), adsStore.list(), newslettersStore.list(), subscribersStore.list(), adminCars(), mediaStore.list()]);
  const onSale = cars.filter(forSale).sort((a, b) => Number(b.id) - Number(a.id));
  const live = subs.filter((s) => s.status === "subscribed").length;
  const ideas = worthPosting(onSale, posts);
  // Posts and ads in one list, newest first, filtered by what it is and where it stands.
  const feed = [...posts.map((p) => ({ kind: "post" as const, at: p.createdAt, status: p.status, p })), ...ads.map((a) => ({ kind: "ad" as const, at: a.createdAt, status: a.status, a }))]
    .filter((i) => (!sp.show || i.kind === sp.show) && (!sp.status || i.status === sp.status))
    .sort((x, y) => y.at - x.at);
  const filters: FilterGroup[] = [
    { name: "show", label: "Show", any: "Posts and ads", options: [["post", "Posts"], ["ad", "Ads"]] },
    { name: "status", label: "Status", any: "Any status", options: Object.entries(STATUS).map(([k, v]) => [k, v.label] as const) },
  ];

  const paged = pageOf(feed, sp);
  const sentLetters = pageOf([...letters].sort((a, b) => b.createdAt - a.createdAt), sp);

  return (
    <>
      <PageHeader
        title="Marketing"
        actions={
          social && (tab === "posts" || tab === "calendar") && (
            <Link href="/dashboard/marketing/new" className={adminButton}>
              <PlusIcon className="size-4" />
              New post
            </Link>
          )
        }
      />
      {notice && (
        <Notice tone={notice.tone}>{notice.text}</Notice>
      )}
      <SummaryTabs
        label="Marketing"
        items={[
          social && { label: "Posts and ads", count: fmtNum(posts.filter((p) => p.status === "posted").length), hint: `posted, ${ads.filter((a) => a.status === "running").length} ads running`, href: "/dashboard/marketing?tab=posts", active: tab === "posts" },
          social && { label: "Calendar", count: fmtNum(posts.filter((p) => p.status === "scheduled").length), hint: "scheduled", href: "/dashboard/marketing?tab=calendar", active: tab === "calendar" },
          social && { label: "Media", count: fmtNum(library.length), hint: "photos and videos", href: "/dashboard/marketing?tab=media", active: tab === "media" },
          news && { label: "Newsletters", count: fmtNum(live), hint: "subscribers", href: "/dashboard/marketing?tab=newsletters", active: tab === "newsletters" },
        ].filter((i) => i !== false)}
      />

      {tab === "posts" && (
        <>
          {ideas.length > 0 && (
            <Panel title="Worth posting">
              <ul className="-mx-5 flex flex-col">
                {ideas.map(({ car, reason }) => (
                  <li key={car.id} className="flex items-center justify-between gap-4 px-5 py-2 even:bg-row-alt">
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="font-medium">{carName(car)}</span>
                      <span className="text-meta text-text-2">{reason}</span>
                    </span>
                    <span className="flex shrink-0 flex-wrap justify-end gap-2">
                      <Link href={`/dashboard/marketing/new?car=${encodeURIComponent(car.slug)}`} className={rowButton}>
                        Write a post
                      </Link>
                      <Link href={`/dashboard/marketing/new?car=${encodeURIComponent(car.slug)}&format=story&layout=${reason === "Price dropped" ? "price-drop" : "just-in"}`} className={rowButton}>
                        Make a story
                      </Link>
                    </span>
                  </li>
                ))}
              </ul>
            </Panel>
          )}
          <TableToolbar filters={filters} />
          <Panel title="Posts and ads">
            {paged.total === 0 ? (
              <EmptyState title={sp.show || sp.status ? "Nothing matches" : "Nothing yet"} />
            ) : (
              <ul className="-mx-5 flex flex-col">
                {paged.rows.map((item) =>
                  item.kind === "post" ? (
                    <li key={item.p.id} className="flex flex-col gap-2 px-5 py-3 even:bg-row-alt">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span className="font-medium">{item.p.network}{item.p.format ? ` ${FORMAT_LABELS[item.p.format].toLowerCase()}` : ""}</span>
                        <Badge tone={STATUS[item.p.status].tone}>{STATUS[item.p.status].label}</Badge>
                        <span className="text-meta text-text-2">
                          {item.p.carTitle} · {item.p.status === "scheduled" && item.p.scheduledFor ? fmtDateTime(item.p.scheduledFor) : fmtDate(item.p.postedAt ?? item.p.createdAt)}
                        </span>
                        {item.p.status === "posted" && <span className="text-meta text-text-2 sm:ml-auto">{fmtNum(item.p.reach ?? 0)} reached · {fmtNum(item.p.clicks ?? 0)} clicks</span>}
                      </div>
                      <p className="line-clamp-2 max-w-measure whitespace-pre-line text-body text-text-2">{item.p.text}</p>
                      {item.p.status !== "posted" && (
                        <div className="flex flex-wrap items-center gap-2">
                          <ActButton act={publishPostAction.bind(null, item.p.id)} confirm={{ title: "Publish this post now?", text: `It goes out on ${item.p.network} at once.`, yes: "Publish now" }} className={rowButton}>Publish now</ActButton>
                          <ActButton act={deletePostAction.bind(null, item.p.id)} confirm={{ title: `Delete this post?`, text: "This cannot be undone.", yes: "Delete" }} className={`${rowButton} text-bad`}>Delete</ActButton>
                        </div>
                      )}
                    </li>
                  ) : (
                    <li key={item.a.id} className="flex flex-col gap-2 px-5 py-3 even:bg-row-alt">
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
                          <ActButton act={startAdAction.bind(null, item.a.id)} confirm={{ title: "Start this ad?", text: `It runs on ${item.a.platform} with a budget of ${fmtEur(item.a.budgetEur)}.`, yes: "Start ad" }} className={rowButton}>Start ad</ActButton>
                          <ActButton act={deleteAdAction.bind(null, item.a.id)} confirm={{ title: `Delete this ad?`, text: "This cannot be undone.", yes: "Delete" }} className={`${rowButton} text-bad`}>Delete</ActButton>
                        </div>
                      )}
                    </li>
                  ),
                )}
              </ul>
            )}
          </Panel>
          <TableFooter page={paged.page} pageCount={paged.pageCount} total={paged.total} per={paged.per} />
        </>
      )}

      {tab === "calendar" && <Calendar posts={posts} ads={ads} week={sp.week} />}

      {tab === "media" && (
        <>
          <Panel title="Add photos and videos">
            <LibraryUpload cars={onSale.map((c) => ({ slug: c.slug, title: carName(c) }))} />
          </Panel>
          <Panel title="Your library" count={library.length}>
            {library.length === 0 ? (
              <EmptyState title="Nothing here yet" />
            ) : (
              <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
                {[...library].sort((a, b) => b.createdAt - a.createdAt).map((m) => (
                  <li key={m.id} className="flex min-w-0 flex-col gap-2">
                    <div className="aspect-square overflow-hidden rounded-control bg-photo-bg">
                      {m.kind === "video" ? (
                        <video src={m.src} muted playsInline preload="none" aria-label={m.name} className="size-full object-cover" />
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element -- the dealer's own upload; images are unoptimized on this Worker
                        <img src={m.src} alt={m.name} className="size-full object-cover" />
                      )}
                    </div>
                    <span className="truncate text-meta font-medium">{m.name}</span>
                    <span className="truncate text-meta text-text-2">{m.kind === "video" ? `Video, ${m.durationSec ?? 0} s` : "Photo"}{m.carTitle ? `, ${m.carTitle}` : ""}</span>
                    <ActButton act={deleteMediaAction.bind(null, m.id)} confirm={{ title: "Delete this file?", text: "A post that uses it keeps the file. It leaves the library.", yes: "Delete" }} label={`Delete ${m.name}`} className={`${rowButton} w-fit text-bad`}>Delete</ActButton>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </>
      )}

      {tab === "newsletters" && (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <form action={createNewsletterAction}>
              <SubmitButton name="intent" value="write" className={adminButton}>Write from the newest cars</SubmitButton>
            </form>
            <p className="text-meta text-text-2">{fmtNum(live)} subscribers{isUsable("newsletter") ? "" : ", sending not connected"}</p>
          </div>
          <Panel title="Newsletters">
            {letters.length === 0 ? (
              <EmptyState title="No newsletters yet" />
            ) : (
              <ul className="-mx-5 flex flex-col">
                {sentLetters.rows.map((n) => (
                  <li key={n.id} className="flex flex-col gap-2 px-5 py-3 even:bg-row-alt">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span className="font-medium">{n.subject}</span>
                      <Badge tone={n.status === "sent" ? "good" : "neutral"}>{n.status === "sent" ? "Sent" : "Draft"}</Badge>
                      <span className="text-meta text-text-2">{fmtDate(n.sentAt ?? n.createdAt)}</span>
                      {n.status === "sent" && n.recipients !== undefined && n.recipients > 0 && (
                        <span className="text-meta text-text-2 sm:ml-auto">{fmtNum(n.recipients)} sent · {fmtPct(((n.opens ?? 0) / n.recipients) * 100)} opened · {fmtPct(((n.clicks ?? 0) / n.recipients) * 100)} clicked</span>
                      )}
                    </div>
                    <p className="line-clamp-2 max-w-measure whitespace-pre-line text-body text-text-2">{n.body}</p>
                    {n.status === "draft" && (
                      <div className="flex flex-wrap items-center gap-2">
                        {live > 0 ? (
                          <ActButton act={sendNewsletterAction.bind(null, n.id)} confirm={{ title: `Send "${n.subject}"?`, text: `It goes to ${plural(live, "subscriber")} and cannot be taken back.`, yes: "Send" }} className={rowButton}>Send to {fmtNum(live)}</ActButton>
                        ) : (
                          <span className="text-meta text-text-2">No subscribers to send to yet</span>
                        )}
                        <ActButton act={deleteNewsletterAction.bind(null, n.id)} confirm={{ title: `Delete this newsletter?`, text: "This cannot be undone.", yes: "Delete" }} className={`${rowButton} text-bad`}>Delete</ActButton>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Panel>
          <TableFooter page={sentLetters.page} pageCount={sentLetters.pageCount} total={sentLetters.total} per={sentLetters.per} />
          <details className="group">
            <summary className="flex min-h-11 cursor-pointer list-none items-center text-meta font-medium text-accent-text underline [&::-webkit-details-marker]:hidden">Write your own</summary>
            <Panel className="mt-3">
              <form action={createNewsletterAction} className="flex flex-col gap-4">
                <NewsletterFields />
                <SubmitButton name="intent" value="save" className={`${adminButtonQuiet} self-start`}>Save draft</SubmitButton>
              </form>
            </Panel>
          </details>
        </>
      )}
    </>
  );
}

// The week as seven days (a list on a phone), with what is set for each and what has gone out. ?week= is any day in the week wanted.
function Calendar({ posts, ads, week }: { posts: Awaited<ReturnType<typeof postsStore.list>>; ads: Awaited<ReturnType<typeof adsStore.list>>; week?: string }) {
  const today = dublinDay();
  const anchor = week && isIsoDay(week) ? week : today;
  const days = weekDays(anchor);
  const items = calendarWeek(posts, ads, days);
  const link = (day: string) => `/dashboard/marketing?tab=calendar&week=${day}`;
  const label = (day: string) => new Date(`${day}T12:00:00Z`).toLocaleDateString("en-IE", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
  return (
    <section aria-label="Week" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Link href={link(addDays(days[0], -7))} className={adminButtonQuiet}>Earlier</Link>
        <Link href={link(today)} className={adminButtonQuiet}>This week</Link>
        <Link href={link(addDays(days[0], 7))} className={adminButtonQuiet}>Later</Link>
        <p className="text-meta text-text-2">{label(days[0])} to {label(days[6])}</p>
      </div>
      <ol className="grid grid-cols-1 gap-3 lg:grid-cols-7">
        {days.map((d) => (
          <li key={d} aria-label={label(d)} className={`flex min-w-0 flex-col gap-2 rounded-card border bg-card p-3 ${d === today ? "border-accent" : "border-hairline"}`}>
            <h3 className="text-meta font-semibold">{label(d)}</h3>
            {items[d].length === 0 ? (
              <p className="text-meta text-text-2">Nothing set</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {items[d].map((i) => (
                  <li key={i.id} data-calendar-item className="flex min-w-0 flex-col gap-0.5 rounded-control bg-row-alt p-2">
                    <span className="truncate text-meta font-medium">{i.title}</span>
                    {i.sub && <span className="truncate text-meta text-text-2">{i.sub}</span>}
                    <span className="text-meta text-text-2">{new Date(i.at).toLocaleTimeString("en-IE", { hour: "2-digit", minute: "2-digit", timeZone: TIME_ZONE })} · {STATUS[i.status].label}</span>
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}
