# Dealer admin and platform

The demo has three perspectives. The public site is `/`. The dealer admin is `/admin`. The platform (superuser) is `/platform`. The demo bar at the top of every page switches between them. There is no login: the area you are in is the role. Real access is Cloudflare Access (issues #7 and #21).

## Rules

- **The admin never reads the real `leads` table.** The areas are open on the public demo, so showing real visitor leads there would expose personal data. The admin shows seeded demo records only. Real leads still go to the dealer by email.
- **Nothing is sent or posted without a connected service.** Publishing a post, starting an ad and sending a newsletter go through `src/lib/admin/publishers.ts`. Each says "not connected" (or "not switched on") and changes nothing. A unit test pins that they never report a success that did not happen.
- **No demo, draft or placeholder labels on the public site.** The demo bar and the dev-only data toggle are the only chrome that says "demo".
- All names, emails, numbers and figures in the admin and platform are made up. Emails use `example.com`.

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
