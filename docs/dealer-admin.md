# Dealer dashboard

The demo has two views. The public site is `/`. The dealer dashboard is `/dashboard`. The demo bar at the foot of every page switches between them: choosing Dealer on a public page keeps that page and adds a Dashboard link to the header (and stock and social links on a car page). There is no login of our own: on a deployed site Cloudflare Access is the login (see below). There is no superuser role and no platform in this site: running many dealers is a separate program, not part of what a dealer is sold. The platform that was here is in git history (PR #30).

## Roles and permissions

Everyone the dashboard lets in works the everyday dashboard (leads, test drives, stock, customers, reviews, marketing). A role adds
permissions, each checked on the server in every page and action that needs it (`src/lib/permissions.ts`, rules in `permission-rules.ts`):

| Role | Margins (costs and profit) | Team | Business settings | Activity history |
|---|---|---|---|---|
| Owner | Yes | Yes | Yes | Yes |
| Manager | Yes | Yes, except an owner | Yes | Yes |
| Finance | Yes | No | No | No |
| Sales | No | No | No | No |

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

- **Real visitor records only appear behind Cloudflare Access.** The admin shows seeded records plus what visitors send (leads, test drives, stock alerts). That is personal data, so on a deployed site the admin only answers with a valid Access token (checked in `src/proxy.ts`). `NEXT_PUBLIC_ADMIN_OPEN=1` skips the check and is for CI only: never set it on a deploy.
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

## DoneDeal stock

A dealer whose stock is on DoneDeal (`NEXT_PUBLIC_STOCK_SOURCE=donedeal`, or the demo bar's DoneDeal switch) keeps one source of truth:
cars are added, changed and sold on DoneDeal only. The dashboard never edits them; it holds only the dealer's own figures (cost).
- **The sync** (`src/lib/donedeal/sync.ts`, rules in `plan.ts`): every 15 minutes the Worker's cron calls `/api/donedeal/sync` with the
  `SYNC_KEY` secret; Sync now on Stock or Overview runs the same. New ads are added, changed ones updated, and a car DoneDeal no longer
  lists is marked sold (its page stays, as "no longer available"). Each change is in the activity history as "DoneDeal sync".
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
