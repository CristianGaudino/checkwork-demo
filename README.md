# Checkwork demo

A made-up used car dealer site, "Checkwork Motors", that [Checkwork](https://www.checkwork.ie) shows to other businesses. It is not a client site and nothing on it is real: the dealer, the address, the phone number and every car are invented.

**Stack:** Next.js 16 (App Router) · Tailwind CSS v4 · Cloudflare D1 + Drizzle (leads and stock) · R2 (trade-in and find-a-car photos) · Cloudflare Workers via OpenNext · GitHub Actions

## Status
Cloned from the Carright build (a private dealer pitch) and rebranded. Open work is in this repo's [issues](https://github.com/CristianGaudino/checkwork-demo/issues) and the [project board](https://github.com/users/CristianGaudino/projects/8).

Project rules and the PR checklist are in [.claude/CLAUDE.md](.claude/CLAUDE.md).

## Demo data
The stock lives in Cloudflare D1 (table `cars`, one row per car, the whole car as JSON). The demo cars are made up: their specs are examples, every description says so, and each photo is a drawn placeholder.

- `src/lib/stock/demo-cars.json` is the seed. It is also what tests and `next dev` use when there is no D1 binding.
- `npm run stock:build` rewrites the cars' text and draws the placeholder photos, the hero, the about picture, the logo and the share image (`scripts/demo/make-demo.mjs`). Manual: never run in CI or at build time.
- `npm run stock:og` makes the per-car share images (`public/og/`). Manual too.
- `npm run stock:redate` moves the sold cars' dates relative to today, so the sold examples stay inside their 30 day window. The deploy runs it, and runs weekly.
- `npm run stock:seed` writes `seed/stock.sql` from the JSON, and `npm run db:seed` applies it to the remote D1 (replacing every row). The deploy runs both after the migration.

E2E needs the same `APP_ENV` at build and at run time, for example `APP_ENV=production npm run build` then `APP_ENV=production npm run e2e`.

## Set-up still to do
- Create the Cloudflare resources and put the D1 id in `wrangler.jsonc` (`REPLACE_WITH_D1_ID`): `npx wrangler d1 create checkwork-demo --jurisdiction eu`, then the R2 bucket `checkwork-demo-lead-photos`.
- Point `demo.checkwork.ie` at the Worker and add the repo secrets listed in `.env.example`.

## Design skills
Skills live in `.agents/skills` (pinned in `skills-lock.json`), primarily `apple-design`.
