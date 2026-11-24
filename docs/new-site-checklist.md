# Starting a new site from this repo

For a dealer who has signed, or a custom demo before a pitch. The dealer's facts and brand live in a few files, and
`src/lib/clone-ready.test.ts` fails if a page writes the name, town or phone in by hand, so these stay the only places.

## A custom demo in under an hour
Keep the demo stock; change what the dealer will recognise.
1. `src/lib/site.ts`: name, domain, slug, phone, email, address, opening hours, social links, warranty, services.
2. `public/brand/`: the dealer's logo (`logo.svg` for dark, `logo-on-light.svg` for light), `og-default.png` (1200x630), `hero.webp`
   (1448x1086, 4:3; the page crops it, see `HeroMosaic.tsx`) and `hero-sm.webp` (the same photo at 960 wide), `hero-dusk.webp` and
   `hero-dusk-sm.webp` (the same scene at dusk, for the dark theme, same sizes), `about.webp` (the showroom, 1200x900) and
   `service.webp` (the workshop, 1200x900). Every photo here shows the Checkwork sign, so replace them all. Another size works if
   you change the `width`/`height` and the `srcSet` widths where it is used.
3. `src/lib/home.config.ts`: the hero title and line, and how many featured cars, type tiles and make chips the home page shows.
4. Colours, only if the dealer has its own: `--color-accent` and `--color-accent-text` in both theme blocks of `src/app/globals.css`.
   Keep white text on the accent at 4.5:1 or more. Everything else stays the Checkwork palette, so every site reads as one family.
5. Deploy it as a demo (no `APP_ENV=production`): it stays out of search, and its emails say DEMO.

## A real dealer
Everything above, then:

### Facts and wording
| What | Where |
|---|---|
| Name, domain, slug, phone, email, address, hours, social links, warranty, services, "facts confirmed" flag | `src/lib/site.ts` |
| Finance figures and the lender's wording | `src/lib/finance/finance.config.ts` (the dealer supplies them; never invent an APR) |
| Consent wording | `CONSENT` and `ALERT_CONSENT` in `src/lib/leads/constants.ts`. New wording is a new version: add it to the frozen list in `src/lib/leads/consent.test.ts`. |
| Home page words and counts | `src/lib/home.config.ts` |
| Memberships and partners (SIMI, AA Approved Dealer, warranty provider, lenders), with their logos and permission | `src/lib/affiliations.ts` and `public/affiliations/`. Empty on the demo. How, the Irish options and the wording: `docs/affiliations.md` |
| Business rules: how long a sold car stays on the site | `src/lib/dealer.config.ts`. Agreed with the dealer at launch; a later change is ours to make (and charge for). |
| Font | `src/app/layout.tsx` and `src/app/fonts/` (Sora for headings, Inter for text, both kept in the repo) |

Set `DEALER_FACTS_CONFIRMED = true` in `site.ts` once the dealer has confirmed the services, warranty and About wording: a production
deploy fails its tests while it is false.

### Stock
- The site reads its cars from the D1 `cars` table (`src/lib/stock/d1-provider.ts`), seeded from `src/lib/stock/demo-cars.json` (`npm run stock:seed`). The
  dealer's own stock tools are in the dealer dashboard (checkwork-dash); this repo has no feed from DoneDeal or CarsIreland.
- Replace `src/lib/stock/demo-cars.json` and `public/stock/` with photos you have the right to use, or start the D1 `cars` table empty.

### What the site includes
- A dealer's site includes everything: used and commercial cars, finance, trade-in and sell your car, test drives, the car finder,
  service, warranty, reviews, contact, saved cars, compare and alerts. There is no setting that turns a section off. Leaving a section out
  for one dealer is a code change in that dealer's own repo (owner, 2026-11-22).

### The dealer dashboard
The dashboard is its own app (checkwork-dash, `docs/dealer-admin.md`), one for every dealer. To send this site's leads to it: make the site key in
the dashboard, set it here as the `DASH_SITE_KEY` Worker secret (`npx wrangler secret put DASH_SITE_KEY`), and keep the `DASH` service binding in
`wrangler.jsonc` (the dashboard's Worker name). Its Cloudflare Access, team and permissions are set up there, not here.

### Switches for a real site
`APP_ENV=production`. The registration lookup then stops answering with a sample car (`SIMULATE_INTEGRATIONS`, off by itself on a production
site) until `CARTELL_API_KEY` is set. Every variable is listed, with what it does, in `.env.example`.

### Outside services
Each is optional except the lead email and the bot check, which a real site needs before it takes a lead: `LEAD_TO_EMAIL` (and the EMAIL
binding), `TURNSTILE_SECRET_KEY` and `NEXT_PUBLIC_TURNSTILE_SITE_KEY`. Google reviews (`GOOGLE_PLACE_ID`, `GOOGLE_PLACES_API_KEY`) and the
registration lookup (`CARTELL_API_KEY`) show their own state without them.

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
