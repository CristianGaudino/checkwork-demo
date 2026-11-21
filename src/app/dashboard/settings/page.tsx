import Link from "next/link";
import { AddTeamForm, RoleForm, LeadEmailsForm, MarketingForm, NotificationsForm, TargetsForm } from "@/components/admin/SettingsForms";
import { Badge, DataTable, Facts, Notice, PageHeader, Panel, adminButtonQuiet, rowButton } from "@/components/admin/kit";
import { ActButton } from "@/components/admin/ActButton";
import { getSettings } from "@/lib/admin/collections";
import { INTEGRATIONS, type IntegrationId, isUsable, modeOf } from "@/lib/integrations";
import { formatHours } from "@/lib/dealer";
import { DEALER_ADDRESS_TEXT, DEALER_EMAIL, DEALER_PHONE, OPENING_HOURS, SITE_NAME } from "@/lib/site";
import { removeTeamAction, resetDemoAction } from "./actions";
import { mayResetDemo } from "@/lib/admin/docs";
import { syncLine } from "@/components/admin/SyncPanel";
import { syncStatus } from "@/lib/donedeal/sync";
import { stockSource } from "@/lib/stock-source";
import { LISTING_SITE, DONEDEAL_DEALER_URL } from "@/lib/stock-source-rules";
import { NEW_TAB } from "@/components/ui";
import { currentMember } from "@/lib/permissions";
import { ROLES, roleCan, type Role } from "@/lib/permission-rules";
import { enabledModules } from "@/lib/modules";
import type { ModuleId } from "@/lib/modules-rules";
import { BrandIcon } from "@/components/admin/BrandIcon";

// What each role may see, in words, so the owner knows what a role change does.
const GRANTS: Record<Role, string> = { Owner: "Everything", Manager: "Everything except changing an owner", Sales: "Everything except margins, the full reports, the team, settings, activity, data requests and billing", Finance: "Margins and the full reports, and everything Sales sees" };

export const metadata = { title: "Settings" };

const ASK_CHANGE = `/dashboard/help?type=${encodeURIComponent("Request a change")}&from=/dashboard/settings`;

// The page in sections, one at a time (?section=), so it is never one long scroll on a phone: a list down the side from 1024px, each with
// a line on what it changes, and a row of tabs above on a phone. The old Voice section (?section=marketing) is under Your business now.
const SECTIONS = [
  ["business", "Your business", "Your details, opening hours and how your posts sound"],
  ["targets", "Targets", "How fast to reply to a lead, and how long a test drive takes"],
  ["team", "Team", "Who can sign in, and what each person can see"],
  ["emails", "Notifications", "Where new leads are emailed, and the morning reminder"],
  ["services", "Connected services", "The outside services your site uses, and which are on"],
  ["demo", "Start again", "Put the dashboard back as it started"],
] as const;
// The module each outside service belongs to; a service without one is the base site's (lead email, the bot check).
const SERVICE_MODULE: Partial<Record<IntegrationId, ModuleId | ModuleId[]>> = {
  reviews: "reviews", gbp: "reviews", social: "social", ads: "social", newsletter: "newsletter", whatsapp: "whatsapp", ai: "ai", reglookup: ["lookupWebsite", "lookupDashboard"],
};

export default async function Page({ searchParams }: { searchParams: Promise<{ section?: string }> }) {
  const [s, me, source, sp] = await Promise.all([getSettings(), currentMember(), stockSource(), searchParams]);
  const synced = source === "donedeal";
  const sync = synced ? await syncStatus() : null;
  // The listing site is a service only for a dealer whose stock comes from there; the others only with their module (#173).
  const mods = await enabledModules();
  const services = INTEGRATIONS.filter((i) => (i.id !== "donedeal" || synced) && (!SERVICE_MODULE[i.id] || [SERVICE_MODULE[i.id]!].flat().some((m) => mods.has(m))));
  const team = roleCan(me.role, "team");
  const edit = roleCan(me.role, "settings");
  const owner = me.role === "Owner";
  const voice = mods.has("social") || mods.has("newsletter");
  // A manager changes everyone but an owner.
  const mayChange = (t: { role: Role }) => team && (owner || t.role !== "Owner");
  // Demo data only where there are made-up records to put back: a real dealer's dashboard has no demo, and the server refuses it there too.
  // Your business mentions the posts' voice only when that panel is there (posts or the newsletter are on).
  const sections = SECTIONS.filter(([k]) => k !== "demo" || (mayResetDemo() && edit)).map(([k, label, line]) => [k, label, k === "business" && !voice ? "Your details and opening hours" : line] as const);
  const [section, , about] = sections.find(([k]) => k === sp.section) ?? sections[0];
  return (
    <>
      <PageHeader title="Settings" text="How your site and dashboard work for you and your team." />
      {!edit && <Notice tone="neutral">Only an owner or manager can change these settings.</Notice>}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[16rem_minmax(0,1fr)] lg:items-start">
        <nav aria-label="Settings" className="scrollbar-none -mx-4 flex gap-1 overflow-x-auto px-4 sm:mx-0 sm:px-0 lg:sticky lg:top-24 lg:flex-col">
          {sections.map(([k, label, line]) => (
            <Link
              key={k}
              href={k === "business" ? "/dashboard/settings" : `/dashboard/settings?section=${k}`}
              aria-current={k === section ? "page" : undefined}
              className={`flex min-h-11 shrink-0 flex-col justify-center rounded-control px-3 lg:py-2.5 ${k === section ? "bg-text text-ink" : "text-text-2 hover:bg-card hover:text-text"}`}
            >
              <span className="text-meta font-medium">{label}</span>
              {/* The line on what it changes: in the side list on a laptop; on a phone it is under the tabs, for the open one only. */}
              <span aria-hidden="true" className={`hidden text-meta lg:block ${k === section ? "opacity-80" : "text-text-2"}`}>{line}</span>
            </Link>
          ))}
        </nav>
        <div className="flex min-w-0 flex-col gap-6">
          <p className="-mb-2 text-body text-text-2 lg:hidden">{about}</p>

          {section === "business" && (
            <>
              <Panel title="Business details">
                <Facts items={[["Name", SITE_NAME], ["Phone", DEALER_PHONE], ["Email", DEALER_EMAIL], ["Address", DEALER_ADDRESS_TEXT]]} />
                <div className="flex flex-col gap-1">
                  <h3 className="text-meta text-text-2">Opening hours</h3>
                  <ul className="grid grid-cols-1 gap-x-8 gap-y-1 text-body sm:grid-cols-2">
                    {OPENING_HOURS.map((h) => (
                      <li key={h.day} className="flex justify-between gap-4 border-b border-hairline py-1.5">
                        <span>{h.day}</span>
                        <span className="tabular-nums text-text-2">{formatHours(h)}</span>
                      </li>
                    ))}
                    {/* As on the public site: no test drive is offered on one (src/lib/bank-holidays.ts). */}
                    <li className="flex justify-between gap-4 border-b border-hairline py-1.5">
                      <span>Bank holidays</span>
                      <span className="text-text-2">Closed</span>
                    </li>
                  </ul>
                </div>
                <p className="text-meta text-text-2">
                  These show across your website. We change them for you:{" "}
                  <Link href={ASK_CHANGE} className="font-medium text-accent-text underline underline-offset-2">ask us to change them</Link>
                </p>
              </Panel>
              {voice && (
                <Panel title="How your posts sound">
                  {edit ? <MarketingForm settings={s} /> : <Facts items={[["How we sound", s.marketing.voice], ["Hashtags", s.marketing.hashtags], ["Sign-off line", s.marketing.signOff]].map(([k, v]) => [k, v || "Not set"] as const)} />}
                </Panel>
              )}
            </>
          )}

          {section === "targets" && (
            <Panel title="Targets">
              {edit ? <TargetsForm settings={s} /> : <Facts items={[["Reply to a new lead within", `${s.leadSlaHours} hours`], ["Test drive slot", `${s.driveSlotMinutes} minutes`]]} />}
            </Panel>
          )}

          {section === "team" && (
            <>
              <Panel title="Team" count={s.team.length}>
                <DataTable
                  bare
                  rows={s.team}
                  rowKey={(t) => t.id}
                  columns={[
                    { key: "name", header: "Name", cell: (t) => <span className="font-medium">{t.name}</span> },
                    { key: "email", header: "Email", cell: (t) => t.email, hide: "sm" },
                    {
                      key: "role",
                      header: "Role",
                      // The picker and Remove share a cell, so on a phone Remove sits under the picker instead of off the screen.
                      cell: (t) =>
                        mayChange(t) ? (
                          <div className="flex flex-col items-end gap-2 sm:flex-row sm:items-start">
                            <RoleForm member={t} owner={owner} />
                            {s.team.length > 1 && (
                              <ActButton act={removeTeamAction.bind(null, t.id)} confirm={{ title: `Remove ${t.name} from the team?`, text: "Their leads and test drives go back to nobody. They can be added again later.", yes: "Remove" }} className={`${rowButton} text-bad`}>
                                Remove
                              </ActButton>
                            )}
                          </div>
                        ) : (
                          <Badge tone={t.role === "Owner" ? "info" : "neutral"}>{t.role}</Badge>
                        ),
                      align: team ? "right" : undefined,
                    },
                  ]}
                />
                {team ? (
                  <div className="flex flex-col gap-3 border-t border-hairline pt-4">
                    <h3 className="font-semibold">Add someone</h3>
                    <AddTeamForm owner={owner} />
                  </div>
                ) : (
                  <p className="text-meta text-text-2">Only an owner or manager can change the team.</p>
                )}
              </Panel>
              <Panel title="What each role can see" quiet>
                <dl className="grid grid-cols-1 gap-x-8 gap-y-3 text-meta sm:grid-cols-2">
                  {ROLES.map((r) => (
                    <div key={r}>
                      <dt className="font-medium">{r}</dt>
                      <dd className="text-text-2">{GRANTS[r]}</dd>
                    </div>
                  ))}
                </dl>
              </Panel>
            </>
          )}

          {section === "emails" && (
            <>
              <Panel title="Lead emails">
                {edit ? <LeadEmailsForm settings={s} fallback={Boolean(process.env.LEAD_TO_EMAIL)} /> : <Facts items={[["Send new leads to", s.leadEmails.join(", ") || (process.env.LEAD_TO_EMAIL ? "The site's own address" : "No address set")]]} />}
              </Panel>
              <Panel title="Morning reminder">
                {edit ? <NotificationsForm settings={s} emailConnected={isUsable("email")} /> : <Facts items={[["Morning follow-ups email to each salesperson", s.notifications.followUps ? "On" : "Off"]]} />}
              </Panel>
            </>
          )}

          {section === "services" && sync && (
            <Panel title={LISTING_SITE}>
              <dl className="grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2">
                <div>
                  <dt className="text-meta text-text-2">Account</dt>
                  <dd className="text-body">
                    <a href={DONEDEAL_DEALER_URL} {...NEW_TAB} className="underline-offset-2 hover:underline">
                      {modeOf("donedeal") === "simulated" ? INTEGRATIONS.find((i) => i.id === "donedeal")!.demoAccount : `Your ${LISTING_SITE} dealer page`}
                      <span className="sr-only"> (opens in a new tab)</span>
                    </a>
                  </dd>
                </div>
                <div>
                  <dt className="text-meta text-text-2">Connection</dt>
                  <dd className="text-body">{isUsable("donedeal") ? "Connected" : "Not connected"}</dd>
                </div>
              </dl>
              <p className="text-body">{syncLine(sync)}</p>
              <p className="max-w-measure text-meta text-text-2">
                Cars are added, changed and sold on {LISTING_SITE}, and the site follows every 15 minutes. {LISTING_SITE} gives the key for your own site only, with your written consent.
              </p>
            </Panel>
          )}

          {section === "services" && (
            <Panel title="Connected services">
              <p className="-mt-2 max-w-measure text-meta text-text-2">We connect these for you. Anything not connected yet, ask and we set it up.</p>
              <DataTable
                bare
                rows={services}
                rowKey={(i) => i.id}
                columns={[
                  { key: "name", header: "Service", cell: (i) => <span className="flex flex-col"><span className="inline-flex items-center gap-1.5 font-medium"><BrandIcon name={i.name} />{i.name}</span><span className="text-meta text-text-2 md:hidden">{i.purpose}</span></span> },
                  { key: "purpose", header: "What it does", hide: "md", cell: (i) => i.purpose, className: "max-w-[20rem]" },
                  { key: "status", header: "Status", cell: (i) => (isUsable(i.id) ? <Badge tone="good">Connected</Badge> : <Badge tone="warn">Not connected</Badge>) },
                  // A dealer never sees setting names: we connect a service for them (the names are in .env.example and docs/new-site-checklist.md).
                  { key: "account", header: "Account", hide: "sm", cell: (i) => (modeOf(i.id) === "off" ? <Link href={ASK_CHANGE} className="text-meta font-medium text-accent-text underline underline-offset-2">Ask us to connect it</Link> : <span className="break-words text-meta text-text-2">{modeOf(i.id) === "simulated" ? i.demoAccount : "Nothing to do"}</span>) },
                ]}
              />
            </Panel>
          )}

          {section === "demo" && (
            <Panel title="Start again">
              <p className="max-w-measure text-body">Put the leads, bookings, reviews, marketing and settings back as they started.</p>
              <ActButton act={resetDemoAction} confirm={{ title: "Start again from the beginning?", text: "Every change made in the dashboard is lost.", yes: "Start again" }} className={`${adminButtonQuiet} w-fit`}>
                Start again
              </ActButton>
            </Panel>
          )}
        </div>
      </div>
    </>
  );
}
