import { AddTeamForm, RoleForm, LeadEmailsForm, MarketingForm, NotificationsForm, TargetsForm } from "@/components/admin/SettingsForms";
import { Badge, DataTable, PageHeader, Panel, adminButtonQuiet, rowButton } from "@/components/admin/kit";
import { getSettings } from "@/lib/admin/collections";
import { INTEGRATIONS, isUsable, missingEnv, modeOf } from "@/lib/integrations";
import { DEALER_ADDRESS_LINES, DEALER_EMAIL, DEALER_PHONE, OPENING_HOURS, SITE_NAME } from "@/lib/site";
import { removeTeamAction, resetDemoAction } from "./actions";
import { seedsDemoRecords } from "@/lib/admin/docs";
import { syncLine } from "@/components/admin/SyncPanel";
import { syncStatus } from "@/lib/donedeal/sync";
import { stockSource } from "@/lib/stock-source";
import { DONEDEAL_DEALER_URL } from "@/lib/stock-source-rules";
import { NEW_TAB } from "@/components/ui";
import { currentMember } from "@/lib/permissions";
import { ROLES, roleCan, type Role } from "@/lib/permission-rules";

// What each role may see, in words, so the owner knows what a role change does.
const GRANTS: Record<Role, string> = { Owner: "Everything", Manager: "Everything except changing an owner", Sales: "Everything except margins, the team, settings and activity", Finance: "Margins, and everything Sales sees" };

export const metadata = { title: "Settings" };

const hours = (h: (typeof OPENING_HOURS)[number]) => (h.opens ? `${h.opens} to ${h.closes}` : "Closed");

export default async function Page() {
  const [s, me, source] = await Promise.all([getSettings(), currentMember(), stockSource()]);
  const synced = source === "donedeal";
  const sync = synced ? await syncStatus() : null;
  // DoneDeal is a service only for a dealer whose stock comes from there.
  const services = INTEGRATIONS.filter((i) => i.id !== "donedeal" || synced);
  const team = roleCan(me.role, "team");
  const edit = roleCan(me.role, "settings");
  const owner = me.role === "Owner";
  // A manager changes everyone but an owner.
  const mayChange = (t: { role: Role }) => team && (owner || t.role !== "Owner");
  return (
    <>
      <PageHeader title="Settings" text={edit ? undefined : "Only an owner or manager can change these settings."} />

      <Panel title="Business details">
        <dl className="grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2">
          {[["Name", SITE_NAME], ["Phone", DEALER_PHONE], ["Email", DEALER_EMAIL], ["Address", DEALER_ADDRESS_LINES.join(", ")]].map(([k, v]) => (
            <div key={k}>
              <dt className="text-meta text-text-2">{k}</dt>
              <dd className="text-body">{v}</dd>
            </div>
          ))}
        </dl>
        <ul className="grid grid-cols-1 gap-x-8 gap-y-1 text-body sm:grid-cols-2">
          {OPENING_HOURS.map((h) => (
            <li key={h.day} className="flex justify-between gap-4 border-b border-hairline py-1.5">
              <span>{h.day}</span>
              <span className="tabular-nums text-text-2">{hours(h)}</span>
            </li>
          ))}
        </ul>
        <p className="text-meta text-text-2">These appear across the public site. They change with a site update, so ask us to change them.</p>
      </Panel>

      <Panel title="Targets">
        <Locked open={edit}>
          <TargetsForm settings={s} />
        </Locked>
      </Panel>

      <Panel title="Team">
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
                      <form action={removeTeamAction.bind(null, t.id)}>
                        <button type="submit" className={`${rowButton} text-bad`}>
                          Remove
                        </button>
                      </form>
                    )}
                  </div>
                ) : (
                  <Badge tone={t.role === "Owner" ? "info" : "neutral"}>{t.role}</Badge>
                ),
              align: team ? "right" : undefined,
            },
          ]}
        />
        <dl className="grid grid-cols-1 gap-x-8 gap-y-2 text-meta sm:grid-cols-2 lg:grid-cols-4">
          {ROLES.map((r) => (
            <div key={r}>
              <dt className="font-medium">{r}</dt>
              <dd className="text-text-2">{GRANTS[r]}</dd>
            </div>
          ))}
        </dl>
        {team ? <AddTeamForm owner={owner} /> : <p className="text-meta text-text-2">Only an owner or manager can change the team.</p>}
      </Panel>

      {sync && (
        <Panel title="DoneDeal">
          <dl className="grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2">
            <div>
              <dt className="text-meta text-text-2">Account</dt>
              <dd className="text-body">
                <a href={DONEDEAL_DEALER_URL} {...NEW_TAB} className="underline-offset-2 hover:underline">
                  {modeOf("donedeal") === "simulated" ? INTEGRATIONS.find((i) => i.id === "donedeal")!.demoAccount : "Your DoneDeal dealer page"}
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
            Cars are added, changed and sold on DoneDeal, and the site follows every 15 minutes. DoneDeal gives the key for your own site only, with your written consent.
          </p>
        </Panel>
      )}

      <Panel title="Lead emails">
        <Locked open={edit}>
          <LeadEmailsForm settings={s} fallback={Boolean(process.env.LEAD_TO_EMAIL)} />
        </Locked>
      </Panel>

      <Panel title="Notifications">
        <Locked open={edit}>
          <NotificationsForm settings={s} emailConnected={isUsable("newsletter")} />
        </Locked>
      </Panel>

      <Panel title="Marketing voice">
        <Locked open={edit}>
          <MarketingForm settings={s} />
        </Locked>
      </Panel>

      <Panel title="Connected services">
        <DataTable
          bare
          rows={services}
          rowKey={(i) => i.id}
          columns={[
            { key: "name", header: "Service", cell: (i) => <span className="font-medium">{i.name}</span> },
            { key: "purpose", header: "What it does", cell: (i) => i.purpose, className: "max-w-[20rem]" },
            { key: "status", header: "Status", cell: (i) => (isUsable(i.id) ? <Badge tone="good">Connected</Badge> : <Badge tone="warn">Not connected</Badge>) },
            { key: "missing", header: "Account or still needed", cell: (i) => <span className="break-words text-meta text-text-2">{modeOf(i.id) === "off" ? missingEnv(i).join(", ") : modeOf(i.id) === "simulated" ? i.demoAccount : "Nothing"}</span> },
          ]}
        />
        <p className="text-meta text-text-2">Add a missing setting in the Cloudflare dashboard (Workers, Settings, Variables and secrets) and the service connects on the next request.</p>
      </Panel>

      {/* Only where there are made-up records to put back: a real dealer's dashboard has no demo, and the server refuses it there too. */}
      {seedsDemoRecords() && edit && (
      <Panel title="Demo data">
        <p className="max-w-measure text-body">Put the leads, bookings, reviews, marketing and settings back to how they started.</p>
        <form action={resetDemoAction}>
          <button type="submit" className={adminButtonQuiet}>
            Reset demo data
          </button>
        </form>
      </Panel>
      )}
    </>
  );
}

// Read only for someone who may not change settings: every control is disabled (the server refuses the save anyway).
function Locked({ open, children }: { open: boolean; children: React.ReactNode }) {
  return (
    <fieldset disabled={!open} className="contents">
      {children}
    </fieldset>
  );
}
