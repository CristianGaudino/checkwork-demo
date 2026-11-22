# Checkwork demo

A made-up used car dealer site, "Checkwork Motors", that [Checkwork](https://www.checkwork.ie) shows to other businesses, live at www.demo.checkwork.ie, and the template for each paying dealer's own website. It is not a client site and nothing on it is real: the dealer, the address, the phone number and every car are invented.

**Stack:** Next.js 16 (App Router) · Tailwind CSS v4 · Cloudflare D1 + Drizzle (leads and stock) · R2 (trade-in and find-a-car photos) · Cloudflare Workers via OpenNext · GitHub Actions

## Status
The dealer's public website only (the Showroom), on made-up data. The dealer dashboard is its own app, [checkwork-dash](https://github.com/CristianGaudino/checkwork-dash) at www.dash.checkwork.ie; this site sends it each lead (`docs/dealer-admin.md`). Open work is in this repo's [issues](https://github.com/CristianGaudino/checkwork-demo/issues) and the [project board](https://github.com/users/CristianGaudino/projects/8).

Project rules and the PR checklist are in [.claude/CLAUDE.md](.claude/CLAUDE.md).

## Demo data
The stock lives in Cloudflare D1 (table `cars`, one row per car, the whole car as JSON). The cars are written by hand in `scripts/stock/catalogue.mjs` (specs, prices and equipment are examples). Their photos come from the owner's open car photo dataset, which is not in this repo.

- `src/lib/stock/demo-cars.json` is the seed. It is also what tests and `next dev` use when there is no D1 binding.
- `npm run stock:build -- <dataset dir>` writes the JSON and `public/stock/` photos from the catalogue (`scripts/stock/build.mjs`). `node scripts/stock/index-dataset.mjs <dataset dir> <out dir>` finds sets of one car in the dataset and makes contact sheets to choose from. Manual: never run in CI or at build time. The hero, about picture and logo are drawn by `node scripts/demo/make-demo.mjs build`.
- `npm run stock:og` makes the per-car share images (`public/og/`). Manual too.
- `npm run stock:redate` moves the sold cars' dates relative to today, so the sold examples stay inside their 30 day window. The deploy runs it, and runs weekly.
- `npm run stock:seed` writes `seed/stock.sql` from the JSON, and `npm run db:seed` applies it to the remote D1. It adds missing cars and refreshes sold dates, so changes made to the cars in the database survive. `npm run stock:reset` replaces every row with the files. The deploy runs the seed after `wrangler deploy` (so the photos are live first); run Deploy from the Actions tab with "reseed" ticked to reset.

E2E needs the same `APP_ENV` at build and at run time, and `SIMULATE_INTEGRATIONS=on` for the registration lookup specs, for example `APP_ENV=production SIMULATE_INTEGRATIONS=on npm run build` then `APP_ENV=production npm run e2e`.

## Set-up still to do
- Create the Cloudflare resources and put the D1 id in `wrangler.jsonc` (`REPLACE_WITH_D1_ID`): `npx wrangler d1 create checkwork-demo --jurisdiction eu`, then the R2 bucket `checkwork-demo-lead-photos`.
- Point `www.demo.checkwork.ie` at the Worker and add the repo secrets listed in `.env.example`.

## Design skills
Skills live in `.agents/skills` (pinned in `skills-lock.json`), primarily `apple-design`.
