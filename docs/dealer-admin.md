# Dealer dashboard

The demo has two views. The public site is `/`. The dealer dashboard is `/dashboard`. The demo bar at the foot of every page switches between them: choosing Dealer on a public page keeps that page and adds a Dashboard link to the header (and stock and social links on a car page). There is no login of our own: on a deployed site Cloudflare Access is the login (see below). There is no superuser role and no platform in this site: running many dealers is a separate program, not part of what a dealer is sold. The platform that was here is in git history (PR #30).

## Modules

A dealer has the base site plus the modules they pay for (#173, `src/lib/modules-rules.ts`). A module that is off has its pages answer
404 (the proxy checks, for public and dashboard pages alike), its links leave the menus, footer and pages (`IfModule`), and its server
actions refuse. On the demo the bar's Modules switches choose them (a cookie); on a real site `NEXT_PUBLIC_SITE_MODULES` does, and a
cookie never can. Data is never deleted when a module goes off. Stock kept in the dashboard is not a module switch: it follows where the
stock comes from.

## Usage billed per use

Registration lookups, AI actions and WhatsApp messages cost the dealer per use, on top of the plan (#181). The code that makes a paid use
counts it with `recordUsage` and asks `usageAllowed` first (`src/lib/billing/usage.ts`): past a monthly cap (the dealer's, set by the Owner
or Manager on Billing, or our ceiling) the service stops for the month and falls back (a lookup gives the plate's own facts, AI leaves the
text alone, WhatsApp goes by email). Alerts at 80% of a cap, at the cap and at amounts the dealer chose go to the owners and managers in
the bell, once a month each. Counts are one record per month per line of the bill. Prices are in `src/lib/billing/rules.ts`.

## Roles and permissions

Everyone the dashboard lets in works the everyday dashboard (leads, test drives, stock, customers, reviews, marketing). A role adds
permissions, each checked on the server in every page and action that needs it (`src/lib/permissions.ts`, rules in `permission-rules.ts`):

| Role | Margins (costs, prep and profit) | Reports | Team | Business settings | Activity history | Data requests and lead exports | Billing |
|---|---|---|---|---|---|---|---|
| Owner | Yes | The dealership's | Yes | Yes | Yes | Yes | Yes |
| Manager | Yes | The dealership's | Yes, except an owner | Yes | Yes | Yes | Yes |
| Finance | Yes | The dealership's | No | No | No | No | No |
| Sales | No | Their own, counts only | No | No | No | No | No |

- **Margins:** a Margins screen, a margin column on the stock list, a Stock margin stat on the overview and a cost price box on the car
  form. Without it none of those are in the page, and the Margins page and the cost field answer as if they were not there. Costs are kept
  in the admin store (`car-costs`), never in the public car data.
- **Team:** add people, change roles, remove people. A manager cannot add, change or remove an owner, or make anyone one. A team with an
  owner always keeps one, and the last person cannot be removed.
- **Business settings:** targets, lead emails, notifications, marketing voice and the demo reset. Others see them read only.

- **Activity history** (`/dashboard/activity`): every change made in the dashboard, newest first, with who made it, filtered by area,
  person and period. Changes only, never page views. See below.

Who the person is:
- **On the demo** (the demo bar is on) the bar's role buttons (Owner, Manager, Sales, Finance), shown while viewing as the dealer, set a
  cookie the server reads, and the demo acts as the first team member with that role. It opens as the owner, so every feature shows.
- **On a real site** (the demo bar is off, `NEXT_PUBLIC_DEMO_BAR=off`) the signed-in Access email, which the proxy verifies and passes on.
  An address in `ADMIN_OWNER_EMAILS` is an owner (that is how a new dealer, with no team yet, gets in to set one up); anyone else has the
  role their email has on the team in Settings, or none. A cookie never grants anything there.

## Rules

- **Real visitor records only appear behind Cloudflare Access.** The admin shows seeded records plus what visitors send (leads, test drives, stock alerts). That is personal data, so on a deployed site the admin only answers with a valid Access token (checked in `src/proxy.ts`). `NEXT_PUBLIC_ADMIN_OPEN=1` skips the check and is for CI only: never set it on a deploy. Only `next dev` is open without it. Any build, even one that forgot `APP_ENV`, is closed, and the demo bar's role cookie only counts on the demo deploy (`APP_ENV=demo`).
- **Posting, ads and newsletters are simulated on the demo, and send nothing outside.** They go through `src/lib/admin/publishers.ts`. With no keys, and simulation on (the default everywhere except a production site, `APP_ENV=production`; set `SIMULATE_INTEGRATIONS` to `on` or `off` to override), each reports success marked `simulated`, and the admin records made-up figures so the flow can be shown. With `SIMULATE_INTEGRATIONS=off` and no keys they say "not connected". With keys they say "not switched on" until the real adapter replaces the marked line. Lead email, the bot check, reviews and analytics are never simulated: Settings shows their true state. A unit test pins all three modes.
- **What visitors send reaches the admin.** A test drive booking and a stock alert are lead types in the one lead pipeline (consent, bot check, rate limit, retention). After a lead is stored, `src/lib/admin/real-leads.ts` copies it into the admin's collections (ids start `real-`) so the dealer can work it. The daily purge deletes the copies with the lead.
- **Lead emails are a setting.** Settings, Lead emails: up to five addresses, a test button, and the `LEAD_TO_EMAIL` variable as the fallback.
- **The bell is in the app only** (`src/lib/admin/notifications.ts`). A new website request, test drive booking, warranty or order request,
  a DoneDeal ad taken down, a sync outage (once, as it starts), a lead given to you by someone else. Never a customer's name, so they are not
  personal data. Read per person; kept 60 days. No email: the lead emails above are the email.
- **No demo, draft or placeholder labels on the public site.** The demo bar and the dev-only data toggle are the only chrome that says "demo".
- All names, emails, numbers and figures in the admin are made up. Emails use `example.com`.

## Activity history

Every dashboard action records what it changed through `logActivity` (`src/lib/admin/activity.ts`), in the `activity` table (memory
with no D1). The actor is the signed-in person (`currentMember`), or a named one such as the stock sync.
- **Changes only:** a price from and to, a lead moved from New to Contacted, a role changed, a post published. Never page views, and never
  what a customer wrote (a note is "Added a note", not its text).
- **No names of customers kept:** an entry about a lead, a test drive, an alert, a subscriber or a review keeps only its kind and id. The
  page reads the name from the live record, so once the record is deleted (the lead purge, an erasure request) the entry says "A deleted
  lead". Cars, posts, newsletters and team members keep their label.
- **Best effort:** a log that cannot be written never stops the change; the failure is logged without the entry.
- **Kept 12 months** (`ACTIVITY_RETENTION_MONTHS`), then deleted by the daily job in `worker.mjs`, which logs `{"job":"purge-activity"}`.
- **The demo** seeds a history of the made-up team on the seeded records; Reset demo data puts it back.

## On the website or not (our version)

- **Every car is Shown, Hidden or a Draft** (`listing` on the car). Hidden cars and drafts are left out by the stock engine itself
  (`src/lib/stock/engine.ts`), so no list, count, page or sitemap has them and their link is not found. A new car can be saved as a draft;
  its listing date (days in stock) is set when it first goes on the website. Anyone on the team can hide, show or publish, from the
  stock list (with Undo) or the car form. Deleting is for owners and managers.
- **"For sale"** in the dashboard (`forSale`) means on the website and not sold: posts, test drives and the overview use it. Margins and
  stock age still count a hidden car, since it is stock the dealer owns.
- **Several cars at once** (#104): tick cars on Stock, then drop their price (euros or up to 50%), mark them sold, or delete them
  (owners and managers). One confirm for the lot; each car is recorded in Activity as if changed on its own. Sold cars keep their
  price, and a car with a deposit held is neither sold nor deleted until its reservation is ended. Marked sold this way, each car keeps
  its Record sale button.
- **Photos** (#21): on the car's page, add several at once, choose the main one, remove one. The browser shrinks each to a 1,600px
  JPEG (dropping its location data) and the server checks the bytes. On the Worker they are stored in R2 under `cars/{id}/` in the
  `LEAD_PHOTOS` bucket (its lifecycle rule only touches `trade-in/`) and served by `/car-photos`, which serves that prefix only. With no
  bucket (dev, E2E) a photo stays in the car as a `data:` URL, in memory. Deleting a car deletes its stored photos. The demo's deploy
  still reseeds the stock, so photos added on the demo go at the next deploy.

## Confirm and Undo

- Anything that cannot be taken back asks first (`ActButton` with `confirm`): delete a car, a post, an ad or a newsletter, send a
  newsletter, publish a post or start an ad, remove or pause a stock alert, unsubscribe, remove a team member or a prep cost, reset the demo.
- What can be taken back runs at once and offers Undo in the toast: hide, show and publish a car, a test drive's status.

## Sales and follow-ups

- **A sale** (`salesStore`, one per car): the price it sold for, the day, who sold it and the buyer, a customer on file or a new one made
  on the form. In our version Mark sold opens the form and marks the car sold on the sale's day. In the DoneDeal version the dealer
  answers for a car whose ad came down, and the Sold view on Stock (Record sale) asks for a sold car with none. Margins use the sale price
  for a sold car. After six years the daily job removes the buyer from sales and deposits (`src/lib/admin/sales-purge.ts`,
  `{"job":"anonymise-sales"}`); the figures stay. /privacy says so.
- **A deposit** (`reservationsStore`, our version only): Reserve on a car for sale takes the amount, how it was paid, the day, the buyer
  and the last day it is held. The car shows as Reserved on the website, listed after the cars for sale, with no enquiry or test drive
  buttons. Mark sold turns it into the sale (the sale keeps the deposit). Owners and managers end it with the deposit refunded (all or
  part) or kept, under the dealer's own terms. Overview flags one past its date.
- **Undo sale** (owners and managers): the sale fell through before handover, or the buyer brought the car back (with the refund and the
  reason; the page says when it is within the 30-day short-term right to reject). The record is kept under its own id with
  `returnedOn` and `kind`, and reports count it under Returns, not sales. In our version a car brought back is hidden for a look over; one
  that fell through goes back on sale. With DoneDeal stock only the record changes. The car's page lists its deposits and undone sales.
  Back on sale stays only for a sold car with no sale recorded.
- **More on a sale:** the warranty (12 months included, or 24 or 36 with extended cover), a trade-in (its reg and allowance; Stock then
  offers to add it, starting the car form from the reg), and the lead it came from (one on that car, marked won).
- **A lost lead** asks why, from a fixed list, and Reports shows "Why leads were lost".
- **Test drives** still to happen can move to another time, by the same rules as a new booking.
- **A follow-up** (`followUpOn` on a lead): Tomorrow, In 3 days, Next week or a day, on the lead. Cleared when the lead is won or lost.
  Overview counts the ones due (today and overdue); the leads list filters by them. The morning email (Settings, Notifications, off by
  default) sends each salesperson theirs, and the unassigned ones to owners and managers, at 07:00 UTC (`/api/follow-ups/digest`).

## Customers and aftersales

A warranty message sent from the website is aftersales work, not a sale: it waits in Aftersales under Requests (left out of Leads, its counts,
the overview and the reports) until a claim is opened from it or it is set aside. Aftersales opens on Requests while any wait.


- **A customer's page** (`/dashboard/customers/[id]`): how to reach them, what they bought with the warranty on each (in cover or not),
  their deposits and warranty claims, and the leads and test drives that carry their email or phone.
- **Warranty claims** (`claimsStore`, Aftersales in the menu): opened on a purchase, from the customer's page or from a warranty lead
  (the buyer is found by the lead's email or phone). In cover or not is worked out from the sale's day and cover, never typed. Open,
  Booked in, Approved, Declined, Repaired, Closed, with notes. What the repair cost the dealer is for the margins roles, and counts in the
  car's cost (`src/lib/admin/costs.ts`), so margins and the reports' profit include it.
- **From the website:** the Warranty page has a claim form (a general message from /warranty), and a message from /service is filed as
  Service. The dashboard tells them apart by the page (`src/lib/admin/real-leads.ts`); the email to the dealer is the general one.
- **Personal data:** claims are in data requests; erasure keeps the claim and its cost without the buyer, the fault or the notes. The
  six-year purge removes the buyer from old claims, as from sales and deposits.

## Factory orders (our version only)

- **Orders** (`ordersStore`, in the menu only for stock kept here): a new car ordered from the maker for a customer, with its spec, price,
  deposit, the registration period it is for (271 is January to June 2027, `src/lib/leads/reg-periods.ts`) and the month it is due. No
  maker's system is connected: the dealer moves it from Ordered to Built, On its way and Arrived as the maker says.
- **Arrived** adds the car to stock, hidden (it is sold) and reserved for the buyer with their deposit. Hand over opens Mark sold on it,
  which takes the deposit and the buyer, and marks the order Handed over. Overview counts cars arrived and waiting.
- **Cancel** (owners and managers): the deposit refunded or kept. A car that already arrived stays in stock, hidden, for the dealer to
  decide.
- **From the website:** /new-cars/order (linked from New cars) takes the make, model, spec and period as an order request (lead type
  `order`). The lead's "Place the order" starts the form, and marks the lead won. With DoneDeal stock the page is not there.
- **Personal data:** orders are in data requests and the six-year purge, like sales: the figures stay without the buyer.

## Reports and prep costs

- **Reports** (`/dashboard/reports`, figures in `src/lib/admin/reports.ts`): the last 3, 6 or 12 months by month. Owners, managers and
  finance see sales, profit (sale price less cost and prep), days to sell, each salesperson, which lead sources win, stock by age and prep
  spend by kind. A salesperson sees "Your report": their cars sold, leads, leads won and follow-ups due. Counts only, no money, nobody else.
- **Prep costs** (`prepStore`, kinds in `src/lib/admin/prep.ts`): lines on a car's dashboard page (Valet, Tyres, NCT, Service, Repairs,
  Bodywork, Transport, Other), folded away until used. Margins permission only. A car's whole cost is its cost price plus its prep
  (`src/lib/admin/costs.ts`), and every margin uses it.

## Data requests and exports

- **Data requests** (`/dashboard/data-requests`, `src/lib/admin/data-requests.ts`): when someone asks what we hold about them, or for it
  to be deleted (GDPR articles 15 and 17, answer within a month). Search by the email or phone they gave; the search then widens once by
  the other details their customer record and leads hold. It finds the website form submissions (D1, with their photos in R2), leads,
  test drives, stock alerts, the newsletter, the customer record and purchases. Download a copy (JSON) or erase, after ticking that it is
  the person asking. Erasure deletes the photos, then the rows and records; a purchase stays for the books without the buyer. The email or
  phone is never in an address. Each request is in the activity history, without the person.
- **CSV exports**: Leads (with the list's filters) and Customers (the open tab) for owners and managers, each recorded in Activity;
  Stock (view and search) for everyone, with cost, prep and margin only for the margins roles. A cell that starts like a formula is
  prefixed with ' so a spreadsheet never runs it (`src/lib/admin/csv.ts`).

## Reviews

- **On the site** (`/reviews`, and the strip on the home page): the reviews Google's Places API gives (up to five, most relevant first),
  as Google gives them, with the rating, the count and the way to every review on Google Maps. None are chosen or hidden by us (owner's
  decision, 2026-11-11): selecting reviews would mislead, and Irish consumer law asks traders to be open about how reviews are shown.
- **In the dashboard** a reply goes to Google first, through the Business Profile API (`postReviewReply` in `publishers.ts`, simulated on
  the demo), and is kept only once Google has it. There is no flag: Google offers no way to take one. The list itself comes from the
  Business Profile once it is connected; on the demo it is the seeded reviews.
- **Questions** (`/faq`) answers only from what the site already says (warranty, finance wording, selling, hours), so it promises nothing new.

## Listing site stock (DoneDeal or CarsIreland)

Both DoneDeal and CarsIreland offer a dealer API for the dealer's own site, and the site reads either the same way (`src/lib/donedeal/`,
named for the first). `NEXT_PUBLIC_LISTING_SITE` names it in the dashboard (DoneDeal by default). Below, "DoneDeal" stands for either.

A dealer whose stock is on DoneDeal (`NEXT_PUBLIC_STOCK_SOURCE=donedeal`, or the demo bar's sync switch) keeps one source of truth:
cars are added, changed and sold on DoneDeal only. The dashboard never edits them; it holds only the dealer's own figures (cost).
- **The sync** (`src/lib/donedeal/sync.ts`, rules in `plan.ts`): every 15 minutes the Worker's cron calls `/api/donedeal/sync` with the
  `CRON_KEY` secret; Sync now on Stock or Overview runs the same. New ads are added and changed ones updated. A car DoneDeal no longer
  lists is hidden (its link is not found), because DoneDeal does not say why an ad came down: Stock and Overview ask the dealer whether it
  sold (the sale form, which marks it sold so its page shows Sold for a while) or did not (it stays hidden). If the ad goes up again the car
  comes back. Each change is in the activity history as "DoneDeal sync".
- **It never empties the site:** an answer with no cars, or with more than half the cars for sale gone, is held and changes nothing.
  Owners and managers can Apply anyway.
- **When it fails** the site keeps the stock from the last good sync, Stock, Overview and Settings say so, and after an hour the owners and
  managers get one email (not again until a sync works).
- **The demo** cannot use a real dealer's account (DoneDeal's API is for one dealer's own site, with written consent). Its feed is the
  stock itself, so a sync shows working and finds nothing to change.
- **Still to write:** the adapter that reads DoneDeal's API (`src/lib/donedeal/feed.ts`), once DoneDeal sends its docs and the full usage
  policy (what may be stored, photos, call limits).

## Cloudflare Access (owner set-up, once)

1. Zero Trust, Access, Applications, Add, Self-hosted. Add the path `/dashboard*` on the demo domain. Allow only the dealer's email addresses.
2. Copy the application's Audience tag. Your team domain is `<team>.cloudflareaccess.com`.
3. On the Worker, add two variables (not secrets): `CF_ACCESS_TEAM_DOMAIN` and `CF_ACCESS_AUD`.

Until both are set the admin answers 404 for everyone. The Worker checks Access's signed token itself (`src/lib/access.ts`), so a missing policy fails closed instead of open.

## Billing and Help

`/dashboard/billing` is for the Owner and Manager (`can("billing")`; anyone else gets a 404, and so does every action). It has three sections:
the plan and this month's usage (with the founding dealer discount, which is taken off the plan, not the usage, and an "Estimate" for the
month end), the limits and alerts (a euro limit per service and for all usage, never above ours; the 80% alert; "tell me when X passes
EUR N"; the AI plan), and the bills. Every change is written to the activity log. Rules and maths: `src/lib/billing/bills-rules.ts`
(unit tested); the bills are a seeded collection, `src/lib/billing/bills.ts`. There is no PDF and no download: invoices come from the
payment provider chosen at clone time and are emailed when issued. Billing details (company, VAT number, address, email) are the
Owner's, stored in settings as `billingDetails`. "Ask us to add" sends a Help request of type "Add a module"; it switches nothing on.

`/dashboard/help` is for every team member: our phone, email and WhatsApp, a message form (Question, Something isn't working with steps
and an optional screenshot, Request a change, Feedback or an idea, Billing and Add a module for the Owner and Manager), their own requests
with our status and reply, and a quarterly one-question feedback. The "Need help?" link in the menu foot passes `?from=<page>`, which is
saved with the request (a dashboard path only, `safeFrom`). Requests are the `help-requests` collection (`src/lib/admin/help.ts`). On
the demo nothing is sent outside (`ADAPTER GOES HERE`: the email to support and the owner's program, #174). Screenshots are checked by
their bytes and kept in the private bucket under `help/`, or as a data URL with no bucket.

## Monthly report and the owner API

- **Monthly report** (`/dashboard/monthly-report`): last month by default, any of the twelve before it from the picker. Each section shows only for the modules on (Leads and Stock always, Visitors with Site analytics, Sales, Reviews). Each figure says how it compares with the month before, or "Too few to compare" under 5. Sales value and profit show only to staff with the margins permission. One "What to do" line comes from fixed rules. "Print or save as PDF" uses the browser's print, with the menu left out.
- **Email**: `/api/reports/monthly` (CRON_KEY, scheduled `0 7 1 * *` in `worker.mjs` and `wrangler.jsonc`) emails last month's summary to the owners and managers: counts only. On the demo it goes to the lead inbox like the follow-up digest.
- **Owner API** and the anonymous feature counters: see `docs/owner-api.md`. The figures for the report and the API are one module, `src/lib/reports/monthly.ts`.

## The contact form (guided)

The public `/contact` form asks what the buyer needs, then a few taps, then how to reach them (#176). The topics, their tap answers and
the words for them are in `src/lib/leads/contact-topics.ts`; the steps and cards in `src/components/leads/GeneralFields.tsx`.

- Cards follow the modules: no Service card without `service`, no Selling card without `tradeIn`, no Finance card without `finance`. That
  need goes to "Something else".
- The server (`general` in `src/lib/leads/schema.ts`) takes the topic and answers as optional fields. With no topic, or with "Something
  else", the message is still required, so the old free-text path stays valid.
- A lead keeps `topic` and `answers`. The leads list shows them as tags ("Buying · this week · trade-in"), filters by topic, and puts
  new leads answered "can't be driven" or "this week" first until a column is chosen. The dealer's email subject says the same
  ("Service: warning light, this week"), built from fixed words only, never the registration.
- A "A car I bought from you" message is filed as a warranty request (Aftersales), and "Service or repair" as a Service lead, like the
  pages they come from. `/service` and `/warranty` open the same form on their topic.
- The optional "Send me updates on WhatsApp" switch (with the `whatsapp` module) is stored on the lead as `whatsappOptIn`.

## WhatsApp (#178)

The `whatsapp` module. On the demo it is simulated (integration `whatsapp`): `/dashboard/whatsapp` shows the dealer's WhatsApp as a phone, and a smaller buyer's phone, and nothing leaves the site.

- Each new website request is added to the conversation of every team member who has that alert on and a linked number, outside their quiet hours (`alertStaffOnWhatsApp`, called once from `real-leads.ts`). The template is the request's own module's, or the plain enquiry when the dealer lacks that module (`eventOfLead`). A buyer who ticked the WhatsApp box (`whatsappOptIn` on the lead, read from the form's detail of the same name) gets a confirmation.
- A tap or a typed reply goes through `src/lib/whatsapp/handle.ts`: it writes the lead (status, note), the activity log (never a name), and the buyer's message. Reply with a price reads "8,500", "€8.5k", "8500" (`parsePrice`), sends the offer, and the buyer's simulated answer lands six seconds later on both phones and the lead.
- Only a team member with a linked phone can act, in their own conversation. Margins are never in a message.
- Every message to a phone or a buyer checks `usageAllowed("whatsapp")` and records `alert`, `reply` or `marketing`. Past the cap an alert or reply is stored as "Sent by email instead" and not counted; marketing is not sent. A buyer without the opt-in gets email, also uncounted. The site's acknowledgements to the dealer inside a conversation are free replies and not counted.
- Messages about a lead are removed once the lead is gone (purge, data request), on the next read of the page.
- The real Cloud API goes where `ADAPTER GOES HERE` is, in `src/lib/whatsapp/send.ts`: approved templates outside the 24 hour window, and a webhook that checks Meta's signature and ignores unknown numbers.

## Marketing formats, media and AI writing

- **Formats** (#177): a post is a Post, Story (9:16 with a ready layout: Just in, Price drop, Sold, Collected today, drawn over the car photo), Reel or video, or Carousel (2 to 10 photos). The composer previews each at phone size. Limits live in `src/lib/admin/networks.ts` (`FORMAT_LIMITS`, `FORMATS_FOR`) and the server checks the same numbers. `PUBLISH_MODE` there says which formats a network's API can publish ("auto") and which are prepared here and posted from the phone ("prepare": Facebook and Instagram stories, all TikTok). Publishing stays simulated.
- **Media library** (`mediaStore`, tab Media): photos (JPEG, PNG, WebP; shrunk to 1,600px on the device) and videos (MP4, MOV, up to 15 MB and 90 seconds on the demo; length read in the browser and checked loosely on the server), optionally tagged to a car. Stored in R2 under `media/` in the `LEAD_PHOTOS` bucket and served by `/media-files`; with no bucket a data URL is kept in memory. Rules in `src/lib/admin/media-rules.ts`. No range requests yet, so add them before real video use.
- **Calendar**: a week of scheduled and posted posts and started ads (`calendarWeek`); drafts are not on it.
- **Modules**: posts, calendar and media need Social and ads, newsletters need Newsletter and alerts; the page needs one of them.
- **AI writing** (#179): `writeAction` (`src/lib/ai/actions.ts`) checks the `ai` module, then the monthly cap, builds the facts from the records (the browser sends ids only), writes, then counts a draft or adjustment. On the demo `writeWithAI` is the mock in `src/lib/ai/mock.ts` (deterministic, facts only, dashes stripped, 700 ms pause). The real Claude adapter goes at `ADAPTER GOES HERE` in `src/lib/ai/write.ts`. `AIWriter` / `AITextarea` show the button, adjust chips, Undo and an "AI draft" label, and hide with the module off. Used in the post composer, newsletters, the car description, the lead page (Draft a reply) and review replies.

## Where things are

| What | Where |
|---|---|
| AI writing (mock on the demo), media library | `src/lib/ai/`, `src/lib/admin/media.ts` |
| Record store (one D1 table, `admin_docs`; memory with no D1) | `src/lib/admin/docs.ts` |
| The dealer's collections, types and seeds | `src/lib/admin/collections.ts`, `seed-data.ts` |
| WhatsApp: templates, price parser, sender, handlers, conversation | `src/lib/whatsapp/`, `src/app/dashboard/whatsapp/` |
| Roles and permissions | `src/lib/permissions.ts`, `permission-rules.ts` |
| DoneDeal sync (feed, plan, run, route) | `src/lib/donedeal/`, `src/app/api/donedeal/sync/route.ts` |
| Activity history (write, list, purge) | `src/lib/admin/activity.ts`, `activity-refs.ts`, `activity-purge.ts` |
| Cost prices and margin maths | `costsStore` in `collections.ts`, `src/lib/admin/margins.ts` |
| Outside services and the settings each needs | `src/lib/integrations.ts` |
| Admin kit (tables, stat cards, forms, charts) | `src/components/admin/` |
| Stock the admin edits (the table the site reads) | `src/lib/admin/stock-admin.ts` |
| Navigation of each area | `src/lib/admin/nav.ts` |
| Billing page, bills and their maths | `src/app/dashboard/billing/`, `src/lib/billing/bills.ts`, `bills-rules.ts` |
| Help requests | `src/app/dashboard/help/`, `src/lib/admin/help.ts`, `help-rules.ts` |
| Monthly report maths, page and email; owner API and counters | `src/lib/reports/`, `src/app/dashboard/monthly-report/`, `src/lib/owner-api/`, `docs/owner-api.md` |
| Contact form topics, tags and subject | `src/lib/leads/contact-topics.ts`, `src/components/leads/GeneralFields.tsx` |

## Connecting a service

Each service in `integrations.ts` lists the Cloudflare variables it needs. Settings, Connected services shows which are missing. When they are set, the matching feature unlocks on the next request. The sending and publishing code for Meta, Google Ads and the newsletter provider is not written: the place for it is marked in `publishers.ts`.

## Testing notes

- Playwright specs run in parallel against one server. A spec that adds or edits cars (`admin-stock.spec.ts`) changes what the others see, so it runs alone, after the rest (see `playwright.config.ts`).
- Specs that change records (leads, bookings, settings) use values that cannot clash on a retry (a different day or name each run).
- The record store and the stock writes have SQLite-backed tests (`*.int.test.ts`) that run the real migrations.
