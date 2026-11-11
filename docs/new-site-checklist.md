# Starting a new site from this repo

For a dealer who has signed, or a custom demo before a pitch. The dealer's facts and brand live in a few files, and
`src/lib/clone-ready.test.ts` fails if a page writes the name, town or phone in by hand, so these stay the only places.

## A custom demo in under an hour
Keep the demo stock and records; change what the dealer will recognise.
1. `src/lib/site.ts`: name, domain, slug, phone, email, address, opening hours, social links, warranty, services.
2. `public/brand/`: the dealer's logo (`logo.svg` for dark, `logo-on-light.svg` for light), `og-default.png` (1200x630), `hero.webp`
   (1920x819) and `hero-sm.webp` (a car-centred crop of it, 960 wide), `about.webp`.
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
| Font | `src/app/layout.tsx` and `src/app/fonts/` (Sora for headings, Inter for text, both kept in the repo) |

Set `DEALER_FACTS_CONFIRMED = true` in `site.ts` once the dealer has confirmed the services, warranty and About wording: a production
deploy fails its tests while it is false.

### Stock
- **Their own uploader:** `NEXT_PUBLIC_STOCK_SOURCE=checkwork`. Staff add and edit cars in the dashboard; the registration lookup fills the basics.
- **DoneDeal:** `NEXT_PUBLIC_STOCK_SOURCE=donedeal` and `NEXT_PUBLIC_DONEDEAL_DEALER_URL`. The dashboard's stock is read only and every
  edit button points to DoneDeal. The DoneDeal API is licensed to one dealer's own site with their written consent: get that first, then
  set `DONEDEAL_API_KEY` and `SYNC_KEY` (secrets). The sync runs every 15 minutes (`docs/dealer-admin.md`, DoneDeal stock). The adapter
  that reads DoneDeal's API is written once DoneDeal sends its docs (`src/lib/donedeal/feed.ts`, issue #108). Empty
  `src/lib/stock/demo-cars*.json` first, so a deploy adds none of the demo cars to a stock that DoneDeal owns.
- Replace `src/lib/stock/demo-cars.json` and `public/stock/` with photos you have the right to use, or start the D1 `cars` table empty.

### The dashboard
- It starts empty on a production site (no made-up leads, reviews or team). Set `ADMIN_OWNER_EMAILS` to the owner's Access email; the
  owner then adds the team in Settings, each with a role, then Lead emails.
- Cloudflare Access: an application for `/dashboard*` on the dealer's domain, allowing only their staff. Set `CF_ACCESS_TEAM_DOMAIN`,
  `CF_ACCESS_AUD` and `NEXT_PUBLIC_ACCESS_ENABLED=1`. Without them the dashboard answers 404 (it fails closed).
- Who sees what: the team's roles in Settings (Owner, Manager, Sales, Finance). See `docs/dealer-admin.md`.

### Switches for a real site
`APP_ENV=production`, `NEXT_PUBLIC_DEMO_BAR=off`. Simulation and demo records then turn off by themselves; a service without keys says
"not connected" in Settings instead of pretending. Every variable is listed, with what it does, in `.env.example`.

### Outside services
Each is optional and listed in the dashboard (Settings, Connected services) with the variables still missing: lead email, bot check,
Google reviews, registration lookup (Cartell), Facebook and Instagram, ads, newsletters, analytics. Lead email and the bot check are
the two a real site needs before it takes a lead.

### Infrastructure names
- `wrangler.jsonc`: `name`, the self-reference service, `routes`, the R2 bucket, the D1 database name and id
  (`npx wrangler d1 create <name> --jurisdiction eu`). The sending address is `LEAD_FROM_EMAIL` in `site.ts`, on an onboarded domain.
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
