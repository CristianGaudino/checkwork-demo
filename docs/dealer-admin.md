# Dealer admin

The demo has two views. The public site is `/`. The dealer admin is `/admin`. The demo bar at the top of every page switches between them: choosing Dealer on a public page keeps that page and adds a Dashboard link to the header (and stock and social links on a car page). There is no login of our own: on a deployed site Cloudflare Access is the login (see below). There is no superuser role and no platform in this site: running many dealers is a separate program, not part of what a dealer is sold. The platform that was here is in git history (PR #30).

## Permissions

A dealer sees everything in the admin except sensitive figures, unless they have the permission for them. Today there is one: **margins** (cost prices and profit). With it a dealer gets a Margins screen, a margin column on the stock list, a Stock margin stat on the overview and a cost price box on the car form. Without it none of those are in the page, and the Margins page and the cost field answer as if they were not there (checked on the server, `src/lib/permissions.ts`). Costs are kept in the admin store (`car-costs`), never in the public car data.
- **On the demo** (the demo bar is on) the bar's **Margins on / off** switch, shown while viewing as the dealer, is the permission: a cookie the server reads.
- **On a real site** (the demo bar is off, `NEXT_PUBLIC_DEMO_BAR=off`) the permission comes from the signed-in Access email, which the proxy verifies and passes on. Set the Worker variable `ADMIN_MARGINS_EMAILS` to the comma separated addresses that have it. Nobody has it by default.

## Rules

- **Real visitor records only appear behind Cloudflare Access.** The admin shows seeded records plus what visitors send (leads, test drives, stock alerts). That is personal data, so on a deployed site the admin only answers with a valid Access token (checked in `src/proxy.ts`). `NEXT_PUBLIC_ADMIN_OPEN=1` skips the check and is for CI only: never set it on a deploy.
- **Posting, ads and newsletters are simulated on the demo, and send nothing outside.** They go through `src/lib/admin/publishers.ts`. With no keys, and simulation on (the default everywhere except a production site, `APP_ENV=production`; set `SIMULATE_INTEGRATIONS` to `on` or `off` to override), each reports success marked `simulated`, and the admin records made-up figures so the flow can be shown. With `SIMULATE_INTEGRATIONS=off` and no keys they say "not connected". With keys they say "not switched on" until the real adapter replaces the marked line. Lead email, the bot check, reviews and analytics are never simulated: Settings shows their true state. A unit test pins all three modes.
- **What visitors send reaches the admin.** A test drive booking and a stock alert are lead types in the one lead pipeline (consent, bot check, rate limit, retention). After a lead is stored, `src/lib/admin/real-leads.ts` copies it into the admin's collections (ids start `real-`) so the dealer can work it. The daily purge deletes the copies with the lead.
- **Lead emails are a setting.** Settings, Lead emails: up to five addresses, a test button, and the `LEAD_TO_EMAIL` variable as the fallback.
- **No demo, draft or placeholder labels on the public site.** The demo bar and the dev-only data toggle are the only chrome that says "demo".
- All names, emails, numbers and figures in the admin are made up. Emails use `example.com`.

## Cloudflare Access (owner set-up, once)

1. Zero Trust, Access, Applications, Add, Self-hosted. Add the path `/admin*` on the demo domain. Allow only the dealer's email addresses.
2. Copy the application's Audience tag. Your team domain is `<team>.cloudflareaccess.com`.
3. On the Worker, add two variables (not secrets): `CF_ACCESS_TEAM_DOMAIN` and `CF_ACCESS_AUD`.

Until both are set the admin answers 404 for everyone. The Worker checks Access's signed token itself (`src/lib/access.ts`), so a missing policy fails closed instead of open.

## Where things are

| What | Where |
|---|---|
| Record store (one D1 table, `admin_docs`; memory with no D1) | `src/lib/admin/docs.ts` |
| The dealer's collections, types and seeds | `src/lib/admin/collections.ts`, `seed-data.ts` |
| Permissions (who may see margins) | `src/lib/permissions.ts`, `permission-rules.ts` |
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
