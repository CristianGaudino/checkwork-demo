# Dealer admin and platform

The demo has three perspectives. The public site is `/`. The dealer admin is `/admin`. The platform (superuser) is `/platform`. The demo bar at the top of every page switches between them. There is no login of our own: the area you are in is the role, and on a deployed site Cloudflare Access is the login (see Cloudflare Access below).

## Rules

- **Real visitor records only appear behind Cloudflare Access.** The admin shows seeded records plus what visitors send (leads, test drives, stock alerts). That is personal data, so on a deployed site the admin only answers with a valid Access token (checked in `src/proxy.ts`). `NEXT_PUBLIC_ADMIN_OPEN=1` skips the check and is for CI only: never set it on a deploy.
- **Posting, ads and newsletters are simulated on the demo, and send nothing outside.** They go through `src/lib/admin/publishers.ts`. With no keys, and simulation on (the default everywhere except a production site, `APP_ENV=production`; set `SIMULATE_INTEGRATIONS` to `on` or `off` to override), each reports success marked `simulated`, and the admin records made-up figures so the flow can be shown. With `SIMULATE_INTEGRATIONS=off` and no keys they say "not connected". With keys they say "not switched on" until the real adapter replaces the marked line. Lead email, the bot check, reviews and analytics are never simulated: Settings shows their true state. A unit test pins all three modes.
- **What visitors send reaches the admin.** A test drive booking and a stock alert are lead types in the one lead pipeline (consent, bot check, rate limit, retention). After a lead is stored, `src/lib/admin/real-leads.ts` copies it into the admin's collections (ids start `real-`) so the dealer can work it. The daily purge deletes the copies with the lead.
- **Lead emails are a setting.** Settings, Lead emails: up to five addresses, a test button, and the `LEAD_TO_EMAIL` variable as the fallback.
- **No demo, draft or placeholder labels on the public site.** The demo bar and the dev-only data toggle are the only chrome that says "demo".
- All names, emails, numbers and figures in the admin and platform are made up. Emails use `example.com`.

## Cloudflare Access (owner set-up, once)

1. Zero Trust, Access, Applications, Add, Self-hosted. Add two paths on the demo domain: `/admin*` and `/platform*`. Allow only the dealer's email addresses.
2. Copy the application's Audience tag. Your team domain is `<team>.cloudflareaccess.com`.
3. On the Worker, add two variables (not secrets): `CF_ACCESS_TEAM_DOMAIN` and `CF_ACCESS_AUD`.
4. Optional, to keep the dealer's staff out of the platform: make a second Access application for `/platform*` alone (allow only the superuser's email), and set its audience tag as `CF_ACCESS_AUD_PLATFORM`. Without it the platform uses the dealer's application, so anyone allowed into the admin can open it.

Until both are set the admin answers 404 for everyone. The Worker checks Access's signed token itself (`src/lib/access.ts`), so a missing policy fails closed instead of open.

## Where things are

| What | Where |
|---|---|
| Record store (one D1 table, `admin_docs`; memory with no D1) | `src/lib/admin/docs.ts` |
| The dealer's collections, types and seeds | `src/lib/admin/collections.ts`, `seed-data.ts` |
| Platform collections (dealerships, invoices, audit) | `src/lib/admin/platform.ts` |
| Plans and add-ons (prices, limits) | `src/lib/plans.ts` |
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
