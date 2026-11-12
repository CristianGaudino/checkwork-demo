# Dealer dashboard

The demo has two views. The public site is `/`. The dealer dashboard is `/dashboard`. The demo bar at the foot of every page switches between them: choosing Dealer on a public page keeps that page and adds a Dashboard link to the header (and stock and social links on a car page). There is no login of our own: on a deployed site Cloudflare Access is the login (see below). There is no superuser role and no platform in this site: running many dealers is a separate program, not part of what a dealer is sold. The platform that was here is in git history (PR #30).

## Roles and permissions

Everyone the dashboard lets in works the everyday dashboard (leads, test drives, stock, customers, reviews, marketing). A role adds
permissions, each checked on the server in every page and action that needs it (`src/lib/permissions.ts`, rules in `permission-rules.ts`):

| Role | Margins (costs, prep and profit) | Reports | Team | Business settings | Activity history | Data requests and lead exports |
|---|---|---|---|---|---|---|
| Owner | Yes | The dealership's | Yes | Yes | Yes | Yes |
| Manager | Yes | The dealership's | Yes, except an owner | Yes | Yes | Yes |
| Finance | Yes | The dealership's | No | No | No | No |
| Sales | No | Their own, counts only | No | No | No | No |

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

## DoneDeal stock

A dealer whose stock is on DoneDeal (`NEXT_PUBLIC_STOCK_SOURCE=donedeal`, or the demo bar's DoneDeal switch) keeps one source of truth:
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

## Where things are

| What | Where |
|---|---|
| Record store (one D1 table, `admin_docs`; memory with no D1) | `src/lib/admin/docs.ts` |
| The dealer's collections, types and seeds | `src/lib/admin/collections.ts`, `seed-data.ts` |
| Roles and permissions | `src/lib/permissions.ts`, `permission-rules.ts` |
| DoneDeal sync (feed, plan, run, route) | `src/lib/donedeal/`, `src/app/api/donedeal/sync/route.ts` |
| Activity history (write, list, purge) | `src/lib/admin/activity.ts`, `activity-refs.ts`, `activity-purge.ts` |
| Cost prices and margin maths | `costsStore` in `collections.ts`, `src/lib/admin/margins.ts` |
| Outside services and the settings each needs | `src/lib/integrations.ts` |
| Admin kit (tables, stat cards, forms, charts) | `src/components/admin/` |
| Stock the admin edits (the table the site reads) | `src/lib/admin/stock-admin.ts` |
| Navigation of each area | `src/lib/admin/nav.ts` |

## Connecting a service

Each service in `integrations.ts` lists the Cloudflare variables it needs. Settings, Connected services shows which are missing. When they are set, the matching feature unlocks on the next request. The sending and publishing code for Meta, Google Ads and the newsletter provider is not written: the place for it is marked in `publishers.ts`.

## Testing notes

- Playwright specs run in parallel against one server. A spec that adds or edits cars (`admin-stock.spec.ts`) changes what the others see, so it runs alone, after the rest (see `playwright.config.ts`).
- Specs that change records (leads, bookings, settings) use values that cannot clash on a retry (a different day or name each run).
- The record store and the stock writes have SQLite-backed tests (`*.int.test.ts`) that run the real migrations.
