import { Badge, DataTable, EmptyState, FilterTabs, Field, PageHeader, Panel, StatCard, StatGrid, adminButton, adminButtonQuiet, adminInput, type Tone } from "@/components/admin/kit";
import { sendDuePosts } from "@/lib/admin/scheduler";
import { NETWORKS, adsStore, newslettersStore, postsStore, subscribersStore } from "@/lib/admin/collections";
import { fmtDate, fmtDateTime, fmtEur, fmtNum, fmtPct } from "@/lib/admin/format";
import { adminCars } from "@/lib/admin/stock-admin";
import { isUsable } from "@/lib/integrations";
import { carName } from "@/lib/stock/format";
import { isSold } from "@/lib/stock/types";
import { createAdAction, createNewsletterAction, createPostAction, deleteAdAction, deleteNewsletterAction, deletePostAction, publishPostAction, savePostAction, schedulePostAction, sendNewsletterAction, startAdAction } from "./actions";

export const metadata = { title: "Marketing" };

const TABS = [["social", "Social posts"], ["ads", "Ads"], ["newsletters", "Newsletters"]] as const;

// Every message the page can show. The URL carries only a code from this list.
const NOTICES: Record<string, { tone: "good" | "warn"; text: string }> = {
  "post-created": { tone: "good", text: "Draft written. Edit it, then schedule it or publish it." },
  "post-saved": { tone: "good", text: "Post saved." },
  "post-scheduled": { tone: "good", text: "Post scheduled. It goes out at the time you chose." },
  "post-published": { tone: "good", text: "Post published." },
  "ad-created": { tone: "good", text: "Ad saved as a draft." },
  "ad-started": { tone: "good", text: "Ad started." },
  "letter-created": { tone: "good", text: "Newsletter draft saved." },
  "letter-sent": { tone: "good", text: "Newsletter sent." },
  deleted: { tone: "good", text: "Deleted." },
  invalid: { tone: "warn", text: "That did not go through. Check the details and try again." },
  "invalid-time": { tone: "warn", text: "Choose a time that has not passed." },
  "social-not-connected": { tone: "warn", text: "Facebook and Instagram are not connected, so nothing was posted. Add the missing settings under Settings, Connected services." },
  "ads-not-connected": { tone: "warn", text: "Ads are not connected, so the ad was not started. Add the missing settings under Settings, Connected services." },
  "newsletters-not-connected": { tone: "warn", text: "Newsletter sending is not connected, so nothing was sent. Add the missing settings under Settings, Connected services." },
  "social-not-installed": { tone: "warn", text: "The settings are in, but posting is not switched on yet. Nothing was posted." },
  "ads-not-installed": { tone: "warn", text: "The settings are in, but ads are not switched on yet. Nothing was started." },
  "newsletters-not-installed": { tone: "warn", text: "The settings are in, but sending is not switched on yet. Nothing was sent." },
};

const POST_TONE: Record<string, Tone> = { draft: "neutral", scheduled: "info", posted: "good" };
const AD_TONE: Record<string, Tone> = { draft: "neutral", running: "good", paused: "warn", ended: "neutral" };
const quiet = "min-h-11 px-2 text-meta font-semibold underline";

export default async function Page({ searchParams }: { searchParams: Promise<{ tab?: string; notice?: string; car?: string }> }) {
  const sp = await searchParams;
  const tab = TABS.some(([k]) => k === sp.tab) ? sp.tab! : "social";
  const notice = sp.notice ? NOTICES[sp.notice] : undefined;
  await sendDuePosts(); // posts whose time has come go out before the list is read
  const [posts, ads, letters, subs, cars] = await Promise.all([postsStore.list(), adsStore.list(), newslettersStore.list(), subscribersStore.list(), adminCars()]);
  const forSale = cars.filter((c) => !isSold(c)).sort((a, b) => Number(b.id) - Number(a.id));
  const carOptions = forSale.map((c) => (
    <option key={c.slug} value={c.slug}>
      {carName(c)}
    </option>
  ));
  const live = subs.filter((s) => s.status === "subscribed").length;

  return (
    <>
      <PageHeader title="Marketing" text="Write posts, plan ads and send newsletters for the cars in stock." />
      {notice && (
        <p role="status" className={`rounded-control px-4 py-3 text-body ${notice.tone === "good" ? "bg-better/15 text-better" : "bg-warning/15 text-warning"}`}>
          {notice.text}
        </p>
      )}
      <FilterTabs items={TABS.map(([k, label]) => ({ label, href: `/admin/marketing?tab=${k}`, active: tab === k }))} />

      {tab === "social" && (
        <>
          <StatGrid>
            <StatCard label="Posts published" value={fmtNum(posts.filter((p) => p.status === "posted").length)} />
            <StatCard label="Scheduled" value={fmtNum(posts.filter((p) => p.status === "scheduled").length)} />
            <StatCard label="Reach" value={fmtNum(posts.reduce((s, p) => s + (p.reach ?? 0), 0))} hint="From published posts" />
            <StatCard label="Link clicks" value={fmtNum(posts.reduce((s, p) => s + (p.clicks ?? 0), 0))} />
          </StatGrid>
          <Panel title="Write a post">
            <form action={createPostAction} className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_auto] sm:items-end">
              <Field label="Car">
                <select name="carSlug" className={adminInput} defaultValue={forSale.some((c) => c.slug === sp.car) ? sp.car : ""}>
                  <option value="" disabled>Choose a car</option>
                  {carOptions}
                </select>
              </Field>
              <Field label="Where">
                <select name="network" className={adminInput}>
                  {NETWORKS.map((n) => <option key={n}>{n}</option>)}
                </select>
              </Field>
              <button type="submit" className={adminButton}>Write draft</button>
            </form>
            <p className="text-meta text-text-2">{isUsable("social") ? "Facebook and Instagram are connected. Scheduled posts go out at their time." : "Facebook and Instagram are not connected yet, so drafts can be written and scheduled but not posted."}</p>
          </Panel>
          {posts.length === 0 ? (
            <Panel><EmptyState title="No posts yet" text="Write a draft for a car above." /></Panel>
          ) : (
            [...posts].sort((a, b) => b.createdAt - a.createdAt).map((p) => (
              <Panel key={p.id}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="font-semibold">{p.network}</span>
                    <Badge tone={POST_TONE[p.status]}>{p.status === "posted" ? "Posted" : p.status === "scheduled" ? "Scheduled" : "Draft"}</Badge>
                    <span className="text-meta text-text-2">
                      {p.carTitle} · {p.status === "scheduled" && p.scheduledFor ? fmtDateTime(p.scheduledFor) : p.status === "posted" && p.postedAt ? fmtDate(p.postedAt) : fmtDate(p.createdAt)}
                    </span>
                  </div>
                  {p.status === "posted" && <span className="text-meta text-text-2">{fmtNum(p.reach ?? 0)} reached · {fmtNum(p.clicks ?? 0)} clicks</span>}
                </div>
                {p.status === "posted" ? (
                  <p className="max-w-measure whitespace-pre-line text-body">{p.text}</p>
                ) : (
                  <>
                    <form action={savePostAction.bind(null, p.id)} className="flex flex-col gap-2">
                      <label className="flex flex-col gap-1">
                        <span className="text-meta font-semibold">Text</span>
                        <textarea name="text" rows={5} maxLength={1000} defaultValue={p.text} className={`${adminInput} h-auto py-2`} />
                      </label>
                      <button type="submit" className={`${adminButtonQuiet} self-start`}>Save text</button>
                    </form>
                    <div className="flex flex-wrap items-end gap-3">
                      <form action={schedulePostAction.bind(null, p.id)} className="flex flex-wrap items-end gap-2">
                        <Field label="Schedule for"><input name="when" type="datetime-local" className={`${adminInput} w-56`} /></Field>
                        <button type="submit" className={adminButtonQuiet}>Schedule</button>
                      </form>
                      <form action={publishPostAction.bind(null, p.id)}><button type="submit" className={adminButton}>Publish now</button></form>
                      <form action={deletePostAction.bind(null, p.id)}><button type="submit" className={`${quiet} text-destructive`}>Delete</button></form>
                    </div>
                  </>
                )}
              </Panel>
            ))
          )}
        </>
      )}

      {tab === "ads" && (
        <>
          <StatGrid>
            <StatCard label="Running" value={fmtNum(ads.filter((a) => a.status === "running").length)} />
            <StatCard label="Impressions" value={fmtNum(ads.reduce((s, a) => s + a.impressions, 0))} />
            <StatCard label="Clicks" value={fmtNum(ads.reduce((s, a) => s + a.clicks, 0))} />
            <StatCard label="Leads" value={fmtNum(ads.reduce((s, a) => s + a.leads, 0))} />
          </StatGrid>
          <Panel title="Plan an ad">
            <form action={createAdAction} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-[2fr_2fr_1fr_1fr_auto] lg:items-end">
              <Field label="Name"><input name="name" className={adminInput} autoComplete="off" /></Field>
              <Field label="Car">
                <select name="carSlug" className={adminInput} defaultValue=""><option value="" disabled>Choose a car</option>{carOptions}</select>
              </Field>
              <Field label="Where"><select name="platform" className={adminInput}><option>Meta</option><option>Google</option></select></Field>
              <Field label="Budget (€)"><input name="budgetEur" type="number" min={20} max={5000} defaultValue={100} className={adminInput} /></Field>
              <button type="submit" className={adminButton}>Save draft</button>
            </form>
            <p className="text-meta text-text-2">{isUsable("ads") ? "Ad accounts are connected." : "Ad accounts are not connected yet, so ads can be planned but not started."}</p>
          </Panel>
          <DataTable
            rows={[...ads].sort((a, b) => b.createdAt - a.createdAt)}
            rowKey={(a) => a.id}
            columns={[
              { key: "name", header: "Ad", cell: (a) => <div className="min-w-0"><span className="block font-semibold">{a.name}</span><span className="text-meta text-text-2">{a.carTitle}</span></div> },
              { key: "platform", header: "Where", cell: (a) => a.platform },
              { key: "status", header: "Status", cell: (a) => <Badge tone={AD_TONE[a.status]}>{a.status[0].toUpperCase() + a.status.slice(1)}</Badge> },
              { key: "budget", header: "Budget", align: "right", cell: (a) => fmtEur(a.budgetEur) },
              { key: "reach", header: "Impressions", align: "right", cell: (a) => fmtNum(a.impressions) },
              { key: "ctr", header: "Click rate", align: "right", cell: (a) => (a.impressions ? fmtPct((a.clicks / a.impressions) * 100) : "None") },
              { key: "leads", header: "Leads", align: "right", cell: (a) => fmtNum(a.leads) },
              {
                key: "actions",
                header: "Actions",
                cell: (a) =>
                  a.status === "draft" ? (
                    <div className="flex gap-1">
                      <form action={startAdAction.bind(null, a.id)}><button type="submit" className={quiet}>Start</button></form>
                      <form action={deleteAdAction.bind(null, a.id)}><button type="submit" className={`${quiet} text-destructive`}>Delete</button></form>
                    </div>
                  ) : null,
              },
            ]}
          />
        </>
      )}

      {tab === "newsletters" && (
        <>
          <StatGrid>
            <StatCard label="Subscribers" value={fmtNum(live)} />
            <StatCard label="Newsletters sent" value={fmtNum(letters.filter((n) => n.status === "sent").length)} />
            <StatCard label="Average open rate" value={fmtPct(avg(letters, "opens"))} />
            <StatCard label="Average click rate" value={fmtPct(avg(letters, "clicks"))} />
          </StatGrid>
          <Panel title="New newsletter">
            <form action={createNewsletterAction} className="flex flex-col gap-4">
              <Field label="Subject"><input name="subject" className={adminInput} maxLength={120} /></Field>
              <Field label="Text"><textarea name="body" rows={6} maxLength={4000} className={`${adminInput} h-auto py-2`} /></Field>
              <div className="flex flex-wrap gap-3">
                <button type="submit" name="intent" value="save" className={adminButton}>Save draft</button>
                <button type="submit" name="intent" value="write" formNoValidate className={adminButtonQuiet}>Write from the newest cars</button>
              </div>
            </form>
            <p className="text-meta text-text-2">{isUsable("newsletter") ? "Sending is connected." : "Newsletter sending is not connected yet, so letters can be written and saved but not sent."}</p>
          </Panel>
          {[...letters].sort((a, b) => b.createdAt - a.createdAt).map((n) => (
            <Panel key={n.id}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="font-semibold">{n.subject}</span>
                  <Badge tone={n.status === "sent" ? "good" : "neutral"}>{n.status === "sent" ? "Sent" : "Draft"}</Badge>
                  <span className="text-meta text-text-2">{n.sentAt ? fmtDate(n.sentAt) : fmtDate(n.createdAt)}</span>
                </div>
                {n.status === "sent" && n.recipients !== undefined && <span className="text-meta text-text-2">{fmtNum(n.recipients)} sent · {fmtPct(((n.opens ?? 0) / n.recipients) * 100)} opened · {fmtPct(((n.clicks ?? 0) / n.recipients) * 100)} clicked</span>}
              </div>
              <p className="max-w-measure whitespace-pre-line text-body">{n.body}</p>
              {n.status === "draft" && (
                <div className="flex flex-wrap gap-3">
                  <form action={sendNewsletterAction.bind(null, n.id)}><button type="submit" className={adminButton}>Send to {fmtNum(live)} subscribers</button></form>
                  <form action={deleteNewsletterAction.bind(null, n.id)}><button type="submit" className={`${quiet} text-destructive`}>Delete</button></form>
                </div>
              )}
            </Panel>
          ))}
        </>
      )}
    </>
  );
}

// Opens or clicks as a share of what was sent, across sent newsletters. None sent gives 0, never NaN.
function avg(letters: { status: string; recipients?: number; opens?: number; clicks?: number }[], key: "opens" | "clicks") {
  const sent = letters.filter((n) => n.status === "sent" && n.recipients);
  const total = sent.reduce((s, n) => s + (n.recipients ?? 0), 0);
  return total ? (sent.reduce((s, n) => s + (n[key] ?? 0), 0) / total) * 100 : 0;
}
