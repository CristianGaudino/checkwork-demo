import { AddTeamForm, LeadEmailsForm, MarketingForm, NotificationsForm, TargetsForm } from "@/components/admin/SettingsForms";
import { Badge, DataTable, PageHeader, Panel, adminButtonQuiet } from "@/components/admin/kit";
import { getSettings } from "@/lib/admin/collections";
import { INTEGRATIONS, isConnected, missingEnv } from "@/lib/integrations";
import { DEALER_ADDRESS_LINES, DEALER_EMAIL, DEALER_PHONE, OPENING_HOURS, SITE_NAME } from "@/lib/site";
import { removeTeamAction, resetDemoAction } from "./actions";

export const metadata = { title: "Settings" };

const hours = (h: (typeof OPENING_HOURS)[number]) => (h.opens ? `${h.opens} to ${h.closes}` : "Closed");

export default async function Page() {
  const s = await getSettings();
  return (
    <>
      <PageHeader title="Settings" text="How the dealership runs, and which services are connected." />

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
        <TargetsForm settings={s} />
      </Panel>

      <Panel title="Team">
        <DataTable
          bare
          rows={s.team}
          rowKey={(t) => t.id}
          columns={[
            { key: "name", header: "Name", cell: (t) => <span className="font-semibold">{t.name}</span> },
            { key: "email", header: "Email", cell: (t) => t.email },
            { key: "role", header: "Role", cell: (t) => <Badge tone={t.role === "Owner" ? "info" : "neutral"}>{t.role}</Badge> },
            {
              key: "remove",
              header: "",
              cell: (t) =>
                s.team.length > 1 && (
                  <form action={removeTeamAction.bind(null, t.id)}>
                    <button type="submit" className="min-h-11 px-2 text-meta font-semibold text-destructive underline">
                      Remove
                    </button>
                  </form>
                ),
              align: "right",
            },
          ]}
        />
        <AddTeamForm />
      </Panel>

      <Panel title="Lead emails">
        <LeadEmailsForm settings={s} fallback={Boolean(process.env.LEAD_TO_EMAIL)} />
      </Panel>

      <Panel title="Notifications">
        <NotificationsForm settings={s} emailConnected={isConnected("newsletter")} />
      </Panel>

      <Panel title="Marketing voice">
        <MarketingForm settings={s} />
      </Panel>

      <Panel title="Connected services">
        <DataTable
          bare
          rows={[...INTEGRATIONS]}
          rowKey={(i) => i.id}
          columns={[
            { key: "name", header: "Service", cell: (i) => <span className="font-semibold">{i.name}</span> },
            { key: "purpose", header: "What it does", cell: (i) => i.purpose, className: "max-w-[20rem]" },
            { key: "status", header: "Status", cell: (i) => (isConnected(i.id) ? <Badge tone="good">Connected</Badge> : <Badge tone="warn">Not connected</Badge>) },
            { key: "missing", header: "Still needed", cell: (i) => (missingEnv(i).length ? <span className="break-words text-meta text-text-2">{missingEnv(i).join(", ")}</span> : <span className="text-meta text-text-2">Nothing</span>) },
          ]}
        />
        <p className="text-meta text-text-2">Add a missing setting in the Cloudflare dashboard (Workers, Settings, Variables and secrets) and the service connects on the next request.</p>
      </Panel>

      <Panel title="Demo data">
        <p className="max-w-[65ch] text-body">Put the leads, bookings, reviews, marketing and settings back to how they started.</p>
        <form action={resetDemoAction}>
          <button type="submit" className={adminButtonQuiet}>
            Reset demo data
          </button>
        </form>
      </Panel>
    </>
  );
}
