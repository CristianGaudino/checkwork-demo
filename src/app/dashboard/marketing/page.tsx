import { Badge, EmptyState, Notice, PageHeader, Panel, StatCard, StatGrid, SummaryTabs, TableFooter, TableToolbar, Task, TaskList, pageOf, adminButton, adminButtonQuiet, rowButton, type FilterGroup, type Tone } from "@/components/admin/kit";
import { PlusIcon, TrashIcon } from "@/components/stock/icons";
import { DAY } from "@/lib/time";
import { ActButton } from "@/components/admin/ActButton";
import { sendDuePosts } from "@/lib/admin/scheduler";
import { adsStore, mediaStore, newslettersStore, postsStore, subscribersStore } from "@/lib/admin/collections";
import { LibraryUpload } from "@/components/admin/MediaUpload";
import { NewsletterFields } from "@/components/admin/NewsletterFields";
import { hasModule } from "@/lib/modules";
import { notFound } from "next/navigation";
import { TIME_ZONE } from "@/lib/site";
import { AD_PLATFORM_LABELS, FORMAT_LABELS } from "@/lib/admin/networks";
import { addDays, dublinDay, fmtDate, fmtDateTime, fmtEur, fmtNum, fmtPct, isIsoDay, plural, threeLetter } from "@/lib/admin/format";
import Link from "next/link";
import { calendarWeek, newestForSale, weekDays, worthPosting } from "@/lib/admin/marketing";
import { adminCars } from "@/lib/admin/stock-admin";
import { isUsable } from "@/lib/integrations";
import { carName } from "@/lib/stock/format";
import { createNewsletterAction, deleteAdAction, deleteMediaAction, deleteNewsletterAction, deletePostAction, publishPostAction, sendNewsletterAction, startAdAction } from "./actions";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { BrandIcon } from "@/components/admin/BrandIcon";

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

const PENDING = new Set(["draft", "scheduled"]);
const today = () => Date.now(); // lint: a page may not call Date.now directly

// What each tab is for, in a line.
const TAB_TEXT: Record<string, string> = {
  posts: "What went out, how it did, and what is waiting. Pick a car and the post is written for you.",
  calendar: "What goes out each day this week.",
  media: "Your own photos and videos, ready to use in a post.",
  newsletters: "An email with your newest cars, sent to the people who signed up for it on your site.",
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
  const onSale = newestForSale(cars);
  const live = subs.filter((s) => s.status === "subscribed").length;
  const ideas = worthPosting(onSale, posts);
  // Posts and ads in one list, newest first, filtered by what it is and where it stands.
  const feed = [...posts.map((p) => ({ kind: "post" as const, at: p.createdAt, status: p.status, p })), ...ads.map((a) => ({ kind: "ad" as const, at: a.createdAt, status: a.status, a }))]
    .filter((i) => (!sp.show || i.kind === sp.show) && (sp.status ? i.status === sp.status : !PENDING.has(i.status)))
    .sort((x, y) => y.at - x.at);
  const filters: FilterGroup[] = [
    { name: "show", label: "Show", any: "Posts and ads", options: [["post", "Posts"], ["ad", "Ads"]] },
    { name: "status", label: "Status", any: "Any status", options: Object.entries(STATUS).filter(([k]) => !PENDING.has(k)).map(([k, v]) => [k, v.label] as const) }, // drafts and scheduled are in Waiting on you
  ];

  const paged = pageOf(feed, sp);
  // Drafts and draft ads first (they need a press), then what is scheduled, soonest first.
  const waiting = [
    ...posts.filter((p) => p.status === "draft").map((p) => ({ kind: "post" as const, p })),
    ...ads.filter((a) => a.status === "draft").map((a) => ({ kind: "ad" as const, a })),
    ...posts.filter((p) => p.status === "scheduled").sort((x, y) => (x.scheduledFor ?? 0) - (y.scheduledFor ?? 0)).map((p) => ({ kind: "post" as const, p })),
  ];
  const since = today() - 30 * DAY;
  const recent = posts.filter((p) => p.status === "posted" && (p.postedAt ?? p.createdAt) >= since);
  const sentLetters = pageOf([...letters].sort((a, b) => b.createdAt - a.createdAt), sp);

  return (
    <>
      <PageHeader
        title="Marketing"
        text={TAB_TEXT[tab]}
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
          social && { label: "Posts and ads", count: fmtNum(posts.length + ads.length), hint: `${posts.filter((p) => p.status === "posted").length} posted, ${ads.filter((a) => a.status === "running").length} ads running`, href: "/dashboard/marketing?tab=posts", active: tab === "posts" },
          social && { label: "Calendar", count: fmtNum(posts.filter((p) => p.status === "scheduled").length), hint: "scheduled", href: "/dashboard/marketing?tab=calendar", active: tab === "calendar" },
          social && { label: "Media", count: fmtNum(library.length), hint: "photos and videos", href: "/dashboard/marketing?tab=media", active: tab === "media" },
          news && { label: "Newsletters", count: fmtNum(live), hint: "subscribers", href: "/dashboard/marketing?tab=newsletters", active: tab === "newsletters" },
        ].filter((i) => i !== false)}
      />

      {tab === "posts" && (
        <>
          {(waiting.length > 0 || ideas.length > 0) && (
            <div className={`grid grid-cols-1 items-start gap-6 ${waiting.length && ideas.length ? "xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]" : ""}`}>
              {waiting.length > 0 && (
                <Panel title="Waiting on you" count={waiting.length}>
                  <TaskList label="Waiting on you">
                    {waiting.map((item) =>
                      item.kind === "post" ? (
                        <Task
                          key={item.p.id}
                          urgency={item.p.status === "draft" ? "soon" : "info"}
                          title={item.p.status === "draft" ? `Draft ${postName(item.p)}` : postName(item.p)}
                          mark={<BrandIcon name={item.p.network} />}
                          detail={[item.p.status === "scheduled" && `Goes out ${fmtDateTime(item.p.scheduledFor ?? item.p.createdAt)}`, item.p.carTitle].filter(Boolean).join(", ") || item.p.text}
                          action={
                            <>
                              <ActButton act={publishPostAction.bind(null, item.p.id)} confirm={{ title: "Post this now?", text: `It goes out on ${item.p.network} at once.`, yes: "Post now" }} className={rowButton}>Post now</ActButton>
                              <ActButton act={deletePostAction.bind(null, item.p.id)} confirm={{ title: "Delete this post?", text: "This cannot be undone.", yes: "Delete" }} label={`Delete the ${postName(item.p)}`} className={`${rowButton} w-11 px-0 text-bad`}><TrashIcon className="size-4" /></ActButton>
                            </>
                          }
                        />
                      ) : (
                        <Task
                          key={item.a.id}
                          urgency="soon"
                          title={`${AD_PLATFORM_LABELS[item.a.platform]} ad, not started`}
                          mark={<BrandIcon name={AD_PLATFORM_LABELS[item.a.platform]} />}
                          detail={`${item.a.carTitle}, budget ${fmtEur(item.a.budgetEur)}`}
                          action={
                            <>
                              <ActButton act={startAdAction.bind(null, item.a.id)} confirm={{ title: "Start this ad?", text: `It runs on ${AD_PLATFORM_LABELS[item.a.platform]} with a budget of ${fmtEur(item.a.budgetEur)}.`, yes: "Start ad" }} className={rowButton}>Start ad</ActButton>
                              <ActButton act={deleteAdAction.bind(null, item.a.id)} confirm={{ title: "Delete this ad?", text: "This cannot be undone.", yes: "Delete" }} label="Delete this ad" className={`${rowButton} w-11 px-0 text-bad`}><TrashIcon className="size-4" /></ActButton>
                            </>
                          }
                        />
                      ),
                    )}
                  </TaskList>
                </Panel>
              )}
              {ideas.length > 0 && (
                <Panel title="Cars worth a post">
                  <TaskList label="Cars worth a post">
                    {ideas.map(({ car, reason }) => (
                      <Task
                        key={car.id}
                        title={carName(car)}
                        detail={reason}
                        action={
                          <>
                            <Link href={`/dashboard/marketing/new?car=${encodeURIComponent(car.slug)}`} className={rowButton}>
                              Write a post
                            </Link>
                            <Link href={`/dashboard/marketing/new?car=${encodeURIComponent(car.slug)}&format=story&layout=${reason === "Price dropped" ? "price-drop" : "just-in"}`} className={rowButton}>
                              Make a story
                            </Link>
                          </>
                        }
                      />
                    ))}
                  </TaskList>
                </Panel>
              )}
            </div>
          )}

          {/* How the posts did, after what needs doing: the few numbers a dealer asks about, each a link to the posts behind it. */}
          <StatGrid>
            <StatCard label="Posted in the last 30 days" value={fmtNum(recent.length)} href="/dashboard/marketing?status=posted" />
            <StatCard label="People who saw them" value={fmtNum(recent.reduce((n, p) => n + (p.reach ?? 0), 0))} href="/dashboard/marketing?status=posted" />
            <StatCard label="Clicks to your site" value={fmtNum(recent.reduce((n, p) => n + (p.clicks ?? 0), 0))} href="/dashboard/marketing?status=posted" />
            <StatCard label="Leads from ads" value={fmtNum(ads.filter((a) => a.createdAt >= since).reduce((n, a) => n + a.leads, 0))} hint={`${plural(ads.filter((a) => a.status === "running").length, "ad")} running now`} href="/dashboard/marketing?show=ad" />
          </StatGrid>

          <TableToolbar filters={filters} />
          {/* What went out and how it did. Drafts and scheduled posts are in Waiting on you, unless the filter asks for them. */}
          <Panel title="Posts and ads">
            {paged.total === 0 ? (
              <EmptyState
                title={sp.show || sp.status ? "Nothing matches" : "Nothing posted yet"}
                text={sp.show || sp.status ? undefined : "Pick a car and the words are written for you."}
                action={sp.show || sp.status ? undefined : <Link href="/dashboard/marketing/new" className={adminButton}><PlusIcon className="size-4" />New post</Link>}
              />
            ) : (
              <ul className="-mx-5 flex flex-col divide-y divide-hairline">
                {paged.rows.map((item) =>
                  item.kind === "post" ? (
                    <li key={item.p.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                      <Thumb src={item.p.photos?.[0]} icon={<BrandIcon name={item.p.network} className="size-5" />} />
                      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span className="inline-flex items-center gap-1.5 font-medium">{item.p.photos?.[0] && <BrandIcon name={item.p.network} />}{postName(item.p)}</span>
                          <Badge tone={STATUS[item.p.status].tone}>{STATUS[item.p.status].label}</Badge>
                        </div>
                        <span className="truncate text-meta text-text-2">
                          {item.p.carTitle ? `${item.p.carTitle}, ` : ""}
                          {item.p.status === "scheduled" && item.p.scheduledFor ? fmtDateTime(item.p.scheduledFor) : fmtDate(item.p.postedAt ?? item.p.createdAt)}
                        </span>
                        <p className="line-clamp-1 max-w-measure text-meta text-text-2 max-sm:hidden">{item.p.text}</p>
                      </div>
                      {item.p.status === "posted" ? (
                        <Results items={[[item.p.reach ?? 0, "saw it"], [item.p.clicks ?? 0, "clicks"]]} />
                      ) : (
                        <ActButton act={publishPostAction.bind(null, item.p.id)} confirm={{ title: "Post this now?", text: `It goes out on ${item.p.network} at once.`, yes: "Post now" }} className={rowButton}>Post now</ActButton>
                      )}
                    </li>
                  ) : (
                    <li key={item.a.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                      <Thumb icon={<BrandIcon name={AD_PLATFORM_LABELS[item.a.platform]} className="size-5" />} />
                      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span className="font-medium">{AD_PLATFORM_LABELS[item.a.platform]} ad</span>
                          <Badge tone={STATUS[item.a.status].tone}>{STATUS[item.a.status].label}</Badge>
                        </div>
                        <span className="truncate text-meta text-text-2">{item.a.carTitle}, {fmtEur(item.a.budgetEur)}</span>
                      </div>
                      {item.a.status === "draft" ? (
                        <ActButton act={startAdAction.bind(null, item.a.id)} confirm={{ title: "Start this ad?", text: `It runs on ${AD_PLATFORM_LABELS[item.a.platform]} with a budget of ${fmtEur(item.a.budgetEur)}.`, yes: "Start ad" }} className={rowButton}>Start ad</ActButton>
                      ) : (
                        <Results items={[[item.a.impressions, "saw it"], [item.a.clicks, "clicks"], [item.a.leads, "leads"]]} />
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
  const label = (day: string) => threeLetter(new Date(`${day}T12:00:00Z`).toLocaleDateString("en-IE", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }));
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
                    <span className="flex min-w-0 items-center gap-1.5 text-meta font-medium"><BrandIcon name={i.title} /><span className="truncate">{i.title}</span></span>
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

const postName = (p: { network: string; format?: keyof typeof FORMAT_LABELS }) => `${p.network} ${(p.format ? FORMAT_LABELS[p.format] : "Post").toLowerCase()}`;

// The post's first photo, or the network's mark when it has none.
function Thumb({ src, icon }: { src?: string; icon: React.ReactNode }) {
  return (
    <span aria-hidden="true" className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-control bg-row-alt text-text-2 [&>svg]:size-5">
      {src ? <img src={src} alt="" className="size-full object-cover" /> : icon}
    </span>
  );
}

// How a post or an ad did: the figures large and the words small, so the eye finds the numbers down the list.
function Results({ items }: { items: [number, string][] }) {
  return (
    <dl className="flex shrink-0 gap-4 text-right max-sm:basis-full max-sm:pl-15 max-sm:text-left">
      {items.map(([n, label]) => (
        <div key={label} className="flex flex-col">
          <dt className="order-2 text-meta text-text-2">{label}</dt>
          <dd className="text-body font-semibold tabular-nums">{fmtNum(n)}</dd>
        </div>
      ))}
    </dl>
  );
}
