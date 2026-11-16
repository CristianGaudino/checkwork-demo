import Link from "next/link";
import { FeedbackForm, HelpForm } from "@/components/admin/HelpForms";
import { Badge, EmptyState, PageHeader, Panel, adminButtonQuiet, type Tone } from "@/components/admin/kit";
import { fmtDateTime } from "@/lib/admin/format";
import { feedbackStore, requestsOf } from "@/lib/admin/help";
import { STATUS_LABELS, SUPPORT, feedbackDue, safeFrom, supportTel, supportWhatsApp, typesFor, type HelpStatus } from "@/lib/admin/help-rules";
import { currentMember } from "@/lib/permissions";

export const metadata = { title: "Help" };

const TONE: Record<HelpStatus, Tone> = { received: "neutral", inProgress: "info", done: "good" };
const CONTACTS = [
  ["Call", SUPPORT.phone, supportTel],
  ["Email", SUPPORT.email, `mailto:${SUPPORT.email}`],
  ["WhatsApp", SUPPORT.phone, supportWhatsApp],
] as const;
const today = () => Date.now();

// Every team member can reach us from here. `from` is the page they came from (the Need help link and the Billing page set it).
export default async function Page({ searchParams }: { searchParams: Promise<{ from?: string; type?: string }> }) {
  const [me, sp] = await Promise.all([currentMember(), searchParams]);
  const types = typesFor(me.role);
  const first = types.find((t) => t === sp.type) ?? types[0];
  const [mine, last] = await Promise.all([requestsOf(me.name), feedbackStore.get(me.name.toLowerCase())]);
  return (
    <>
      <PageHeader title="Help" />
      <Panel title="Contact us">
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {CONTACTS.map(([label, value, href]) => (
            <li key={label}>
              <a href={href} {...(label === "WhatsApp" ? { target: "_blank", rel: "noopener noreferrer" } : {})} className={`${adminButtonQuiet} w-full flex-col !h-auto gap-0 py-3`}>
                <span>{label}</span>
                <span className="font-normal text-text-2">{value}</span>
              </a>
            </li>
          ))}
        </ul>
        <p className="text-meta text-text-2">We are here {SUPPORT.hours}.</p>
      </Panel>
      <Panel title="Send us a message">
        <HelpForm types={types} first={first} from={safeFrom(sp.from)} />
      </Panel>
      <Panel title="Your requests" count={mine.length}>
        {mine.length === 0 ? (
          <EmptyState title="Nothing sent yet" text="What you send us shows here, with our reply." />
        ) : (
          <ul className="flex flex-col divide-y divide-hairline">
            {mine.map((r) => (
              <li key={r.id} className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold">{r.type}</span>
                  <Badge tone={TONE[r.status]}>{STATUS_LABELS[r.status]}</Badge>
                  <span className="text-meta text-text-2">{fmtDateTime(r.at)}</span>
                  {r.from !== "/dashboard" && (
                    <Link href={r.from} className="text-meta text-text-2 underline-offset-2 hover:underline">
                      From {r.from.replace("/dashboard/", "").replace("/dashboard", "overview")}
                    </Link>
                  )}
                </div>
                <p className="max-w-measure whitespace-pre-line text-body">{r.message}</p>
                {r.steps && <p className="max-w-measure whitespace-pre-line text-body text-text-2">{r.steps}</p>}
                {r.screenshot && <p className="text-meta text-text-2">Screenshot attached</p>}
                {r.reply && (
                  <div className="max-w-measure rounded-control bg-row-alt p-3">
                    <p className="text-meta font-semibold">Checkwork support{r.repliedAt ? `, ${fmtDateTime(r.repliedAt)}` : ""}</p>
                    <p className="whitespace-pre-line text-body">{r.reply}</p>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </Panel>
      {feedbackDue(last?.at, today()) && (
        <Panel quiet>
          <FeedbackForm />
        </Panel>
      )}
    </>
  );
}
