import Link from "next/link";
import { FeedbackForm, HelpForm } from "@/components/admin/HelpForms";
import { Badge, Columns, EmptyState, PageHeader, Panel, PanelLink, adminButtonQuiet, type Tone } from "@/components/admin/kit";
import { CalendarIcon, CarIcon, InboxIcon, PhoneIcon, ReceiptIcon, ShareIcon, UsersIcon, WhatsAppIcon } from "@/components/stock/icons";
import { fmtDateTime } from "@/lib/admin/format";
import { feedbackStore, requestsOf } from "@/lib/admin/help";
import { STATUS_LABELS, SUPPORT, feedbackDue, safeFrom, supportTel, supportWhatsApp, typesFor, type HelpStatus } from "@/lib/admin/help-rules";
import { currentMember } from "@/lib/permissions";
import { DEALER_NAV } from "@/lib/admin/nav";
import { enabledModules } from "@/lib/modules";
import { stockSource } from "@/lib/stock-source";
import { LISTING_SITE } from "@/lib/stock-source-rules";
import { NEW_TAB } from "@/components/ui";

export const metadata = { title: "Help" };

const TONE: Record<HelpStatus, Tone> = { received: "neutral", inProgress: "info", done: "good" };
const today = () => Date.now();
const contact = `${adminButtonQuiet} !h-auto w-full justify-start gap-3 py-3 text-left`;

// The page a request came from, as the menu names it ("Margins", "Settings"); a page deeper in an area takes its area's name.
const pageName = (from: string) => DEALER_NAV.filter((i) => from === i.href || from.startsWith(`${i.href}/`)).sort((a, b) => b.href.length - a.href.length)[0]?.label ?? "the dashboard";

type Guide = { title: string; icon: React.ReactNode; steps: string[]; href: string; go: string };

// Every team member can reach us from here. First a person, one press away; then how to do the everyday jobs (most questions end there)
// beside the form; then what they sent, with our replies. `from` is the page they came from, when a link sets it (the Billing page does).
export default async function Page({ searchParams }: { searchParams: Promise<{ from?: string; type?: string }> }) {
  const [me, sp, mods, source] = await Promise.all([currentMember(), searchParams, enabledModules(), stockSource()]);
  const types = typesFor(me.role);
  const first = types.find((t) => t === sp.type) ?? types[0];
  const [mine, last] = await Promise.all([requestsOf(me.name), feedbackStore.get(me.name.toLowerCase())]);
  const synced = source === "donedeal";
  // The common jobs, only the ones this dealer has: a module that is off, or stock kept on DoneDeal, changes them.
  const guides: Guide[] = [
    { title: "Answer a new lead", icon: <InboxIcon />, steps: ["Open Leads and press the person's name.", "Call, email or WhatsApp them from the top of the lead.", "Set the status to Contacted so the team knows."], href: "/dashboard/leads?status=new", go: "Go to leads" },
    ...(mods.has("testDrives") ? [{ title: "Book a test drive", icon: <CalendarIcon />, steps: ["Press Book a test drive on the Overview.", "Pick the car, the day and a free time.", "Requests from your website show under To do: press Confirm."], href: "/dashboard/test-drives/new", go: "Book a test drive" }] : []),
    synced
      ? { title: "Add or change a car", icon: <CarIcon />, steps: [`Your cars come from ${LISTING_SITE}: add or change them there.`, "The website and this dashboard update by themselves.", "Costs and notes for a car are added here, on its page in Stock."], href: "/dashboard/stock", go: "Go to stock" }
      : { title: "Add a car", icon: <CarIcon />, steps: ["Press Add a car on the Overview or in Stock.", "Add the photos, the price and the details.", "Press Publish, or keep it as a draft for later."], href: "/dashboard/stock/new", go: "Add a car" },
    synced
      ? { title: "Record a sale", icon: <ReceiptIcon />, steps: [`When a car's ad comes down on ${LISTING_SITE}, it shows under To do.`, "Press Record sale.", "Add the buyer and the price."], href: "/dashboard/stock?view=sold", go: "Go to sold cars" }
      : { title: "Mark a car as sold", icon: <ReceiptIcon />, steps: ["Open Stock and find the car.", "Press Mark sold.", "Add the buyer and the price. It shows as Sold on your website."], href: "/dashboard/stock", go: "Go to stock" },
    ...(mods.has("social") ? [{ title: "Post a car to Facebook and Instagram", icon: <ShareIcon />, steps: ["Press New post on the Overview.", "Pick the car and the photos, and write a line or two.", "Post now, or choose a day and time."], href: "/dashboard/marketing/new", go: "New post" }] : []),
    { title: "Add someone to your team", icon: <UsersIcon />, steps: ["Open Settings, then Team.", "Enter their name and email, and choose their role.", "Only an owner or manager can do this."], href: "/dashboard/settings?section=team", go: "Open team settings" },
  ];

  return (
    <>
      <PageHeader title="Help" text="How to do the everyday jobs, and how to reach us." />

      <Panel title="Talk to us" text={`We are here ${SUPPORT.hours}.`}>
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <li>
            <a href={supportTel} className={contact}>
              <PhoneIcon className="size-5 shrink-0 text-accent-text" />
              <span className="flex flex-col">
                <span>Call</span>
                <span className="font-normal text-text-2">{SUPPORT.phone}</span>
              </span>
            </a>
          </li>
          <li>
            <a href={`mailto:${SUPPORT.email}`} className={contact}>
              <InboxIcon className="size-5 shrink-0 text-accent-text" />
              <span className="flex min-w-0 flex-col">
                <span>Email</span>
                <span className="truncate font-normal text-text-2">{SUPPORT.email}</span>
              </span>
            </a>
          </li>
          <li>
            <a href={supportWhatsApp} {...NEW_TAB} className={contact}>
              <WhatsAppIcon className="size-5 shrink-0 text-whatsapp" />
              <span className="flex flex-col">
                <span>
                  WhatsApp<span className="sr-only"> (opens in a new tab)</span>
                </span>
                <span className="font-normal text-text-2">{SUPPORT.phone}</span>
              </span>
            </a>
          </li>
        </ul>
      </Panel>

      <Columns
        aside={
          <Panel title="Send us a message" text="A question, a change to your site, or something not working. Our reply shows on this page.">
            <HelpForm types={types} first={first} from={safeFrom(sp.from)} />
          </Panel>
        }
      >
        <Panel title="How to">
          <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {guides.map((g) => (
              <li key={g.title} className="flex flex-col gap-3 rounded-control border border-hairline bg-row-alt p-4">
                <h3 className="flex items-center gap-2 font-semibold">
                  <span aria-hidden="true" className="grid size-8 shrink-0 place-items-center rounded-control bg-card text-accent-text [&>svg]:size-4">
                    {g.icon}
                  </span>
                  {g.title}
                </h3>
                <ol className="flex flex-1 list-decimal flex-col gap-1 pl-5 text-body text-text-2">
                  {g.steps.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ol>
                <PanelLink href={g.href}>{g.go}</PanelLink>
              </li>
            ))}
          </ul>
        </Panel>
      </Columns>

      <Panel title="What you sent us" count={mine.length || undefined}>
        {mine.length === 0 ? (
          <EmptyState compact title="Nothing sent yet" text="What you send us shows here, with our reply." />
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
                      From {pageName(r.from)}
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
