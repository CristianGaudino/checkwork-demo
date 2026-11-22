# Starting a new site from this repo

For a dealer who has signed, or a custom demo before a pitch. The dealer's facts and brand live in a few files, and
`src/lib/clone-ready.test.ts` fails if a page writes the name, town or phone in by hand, so these stay the only places.

## A custom demo in under an hour
Keep the demo stock and records; change what the dealer will recognise.
1. `src/lib/site.ts`: name, domain, slug, phone, email, address, opening hours, social links, warranty, services.
2. `public/brand/`: the dealer's logo (`logo.svg` for dark, `logo-on-light.svg` for light; the dashboard's menu shows it too, in a box up
   to 168 x 32px, so a wide wordmark or a square crest both fit), optionally a square mark `mark.svg` for the collapsed menu (set
   `BRAND_MARK` in `site.ts`; without it the initials show), `og-default.png` (1200x630), `hero.webp`
   (1448x1086, 4:3; the page crops it, see `HeroMosaic.tsx`) and `hero-sm.webp` (the same photo at 960 wide), `hero-dusk.webp` and
   `hero-dusk-sm.webp` (the same scene at dusk, for the dark theme, same sizes), `about.webp` (the showroom, 1200x900) and
   `service.webp` (the workshop, 1200x900). Every photo here shows the Checkwork sign, so replace them all. Another size works if
   you change the `width`/`height` and the `srcSet` widths where it is used.
3. `src/lib/home.config.ts`: the hero title and line, and how many featured cars, type tiles and make chips the home page shows.
4. `src/lib/partners.ts`: the makes the dealer sells new (New cars shows them first). Empty if they sell used only.
5. Colours, only if the dealer has its own: `--color-accent` and `--color-accent-text` in both theme blocks of `src/app/globals.css`.
   Keep white text on the accent at 4.5:1 or more. Everything else stays the Checkwork palette, so every site reads as one family.
6. Deploy it as a demo (no `APP_ENV=production`): it stays out of search, its emails say DEMO, and the dashboard has its lived-in records.

## A real dealer
Everything above, then:

### Facts and wording
| What | Where |
|---|---|
| Name, domain, slug, phone, email, address, hours, social links, warranty, services, "facts confirmed" flag | `src/lib/site.ts` |
| Finance figures and the lender's wording | `src/lib/finance/finance.config.ts` (the dealer supplies them; never invent an APR) |
| Consent wording | `CONSENT` in `src/lib/leads/constants.ts`. New wording is a new version: add it to the frozen list in `src/lib/leads/consent.test.ts`. |
| Home page words and counts | `src/lib/home.config.ts` |
| New car franchises | `src/lib/partners.ts` |
| Memberships and partners (SIMI, AA Approved Dealer, warranty provider, lenders), with their logos and permission | `src/lib/affiliations.ts` and `public/affiliations/`. Empty on the demo. How, the Irish options and the wording: `docs/affiliations.md` |
| Business rules: days before a car is old stock (120), the price drop the slow-stock alert suggests, how long a sold car stays on the site | `src/lib/dealer.config.ts`. Agreed with the dealer at launch; the dashboard cannot change them, so a later change is ours to make (and charge for). |
| Font | `src/app/layout.tsx` and `src/app/fonts/` (Sora for headings, Inter for text, both kept in the repo) |

Set `DEALER_FACTS_CONFIRMED = true` in `site.ts` once the dealer has confirmed the services, warranty and About wording: a production
deploy fails its tests while it is false.

### Stock
- **Their own uploader:** `NEXT_PUBLIC_STOCK_SOURCE=checkwork`. Staff add and edit cars in the dashboard; the registration lookup fills the basics.
- **A listing site (DoneDeal or CarsIreland):** `NEXT_PUBLIC_STOCK_SOURCE=donedeal` (it means "synced"), `NEXT_PUBLIC_LISTING_SITE`
  (`DoneDeal`, the default, or `CarsIreland`: what the dashboard calls it) and `NEXT_PUBLIC_DONEDEAL_DEALER_URL` (the dealer's page on
  that site). Both sites offer a dealer API for the dealer's own site, read the same way. The dashboard's stock is read only and every
  edit button points to the listing site. The DoneDeal API is licensed to one dealer's own site with their written consent: get that first, then
  set `DONEDEAL_API_KEY` and `CRON_KEY` (secrets). The sync runs every 15 minutes (`docs/dealer-admin.md`, DoneDeal stock). The adapter
  that reads DoneDeal's API is written once DoneDeal sends its docs (`src/lib/donedeal/feed.ts`, issue #108). Empty
  `src/lib/stock/demo-cars*.json` first, so a deploy adds none of the demo cars to a stock that DoneDeal owns.
- Replace `src/lib/stock/demo-cars.json` and `public/stock/` with photos you have the right to use, or start the D1 `cars` table empty.

### What the site includes
- A dealer's site includes everything: used, new and commercial cars, finance, trade-in and sell your car, test drives, the car finder,
  service, warranty, reviews, contact, saved cars, compare and alerts. There is no setting that turns a section off. Leaving a section out
  for one dealer is a code change in that dealer's own repo (owner, 2026-11-22).
- The prices on the Billing page are the demo's (`src/lib/billing/rules.ts`). Before a real dealer goes live, choose the payment
  provider and how invoices are made, and connect the dealer's prices and bills from the owner's billing program (#181).

### The dashboard
- It starts empty on a production site (no made-up leads, reviews or team). Set `ADMIN_OWNER_EMAILS` to the owner's Access email; the
  owner then adds the team in Settings, each with a role, then Lead emails.
- Cloudflare Access: an application for `/dashboard*` on the dealer's domain, allowing only their staff. Set `CF_ACCESS_TEAM_DOMAIN`
  and `CF_ACCESS_AUD`. Without them the dashboard answers 404 (it fails closed).
- Who sees what: the team's roles in Settings (Owner, Manager, Sales, Finance). See `docs/dealer-admin.md`.

### Switches for a real site
`APP_ENV=production`, `NEXT_PUBLIC_DEMO_BAR=off`. Simulation and demo records then turn off by themselves; a service without keys says
"not connected" in Settings instead of pretending. Every variable is listed, with what it does, in `.env.example`.

### Outside services
Each is optional and listed in the dashboard (Settings, Connected services) with the variables still missing: lead email, bot check,
Google reviews, registration lookup (Cartell), Facebook and Instagram, ads, newsletters. Lead email and the bot check are
the two a real site needs before it takes a lead.
Newsletters and stock alerts also need `UNSUBSCRIBE_SECRET` (a random secret, made like `PHOTO_LINK_SECRET` in
`docs/lead-retention.md`): each email carries a signed link to `/unsubscribe` and the `List-Unsubscribe` headers (`src/lib/unsubscribe.ts`).
Each subscription has one link that never changes. Changing the secret stops every link already sent, so set it once.
AI writing uses Claude once `ANTHROPIC_API_KEY` is set as a Worker secret (`npx wrangler secret put ANTHROPIC_API_KEY`). Without it the
demo uses the built-in writer (`src/lib/ai/mock.ts`), and a real site shows AI writing as not connected.

### Infrastructure names
- `wrangler.jsonc`: `name`, the self-reference service, `routes`, the R2 bucket, the D1 database name and id
  (`npx wrangler d1 create <name> --jurisdiction eu`). The sending address is `LEAD_FROM_EMAIL` in `site.ts`, on an onboarded domain.
- The rate limit page, set by hand in Cloudflare (Security, WAF, rate limiting rules): `docs/rate-limit/page.html` for pages and
  `docs/rate-limit/api.json` for `/api/*`, as each rule's custom response with status 429. It needs a Pro zone or above. Put the
  dealer's name, phone and logo in the page first (its test fails until they match `site.ts`). Steps: `docs/rate-limit/README.md`.
- `package.json` `name`, the `site=` line in `.github/workflows/ci.yml`, and the `env` block in `.github/workflows/deploy.yml`.

### Repo and board
1. On GitHub, make a new repo from this one (Use this template), not a fork.
2. Copy the labels: `gh label clone <owner>/<source-repo> --repo <owner>/<new-repo>`.
3. Copy the project (fields and views, not items): `gh project copy <number> --source-owner CristianGaudino --target-owner <owner> --title "<title>"`.
4. Update `README.md`, `AGENTS.md`, `.claude/CLAUDE.md` and `docs/lead-retention.md` so they name the new business.

### Check it
`npm test`, `npm run build` and the E2E suite read the name, town and domain from `site.ts`, so they pass without edits; only
`consent.test.ts` needs the new frozen wording. Then `next dev` with the break-ui switch (Worst case, Empty, One, 1,284 cars) to see the
pages with the dealer's real data at its edges.
