# Checkwork demo project rules

Read automatically by Claude Code at the start of a session. Edit it like any other file, in a PR.

## What this is
A generic, all-inclusive demo of the dealer website Checkwork builds, with a made-up dealer ("Checkwork Motors"), shown to other businesses. It shows two perspectives: the customer (the public site) and the dealer (the admin area, where what a dealer sees depends on their permissions, such as margins). Public pages for customers; the admin area is protected by Cloudflare Access. Work is tracked in GitHub issues and the [Checkwork demo project](https://github.com/users/CristianGaudino/projects/8). Read the issues before planning anything.

## Decisions already made
- Stack: Next.js 16 (App Router; Cache Components are off until OpenNext on Workers supports them, opennextjs-cloudflare#1450), Tailwind CSS v4, Cloudflare Workers via OpenNext (same as the vintage repo), GitHub Actions.
- Stock is in Cloudflare D1 (`cars` table, the whole car as JSON), read through the `StockProvider` interface by `d1-provider.ts`. `demo-cars.json` is only the seed, and what tests and `next dev` use with no D1 binding. There is no feed from any dealer or from CarsIreland here. Reviews work the same way (`ReviewsProvider`).
- Cloudflare D1 (SQLite) + Drizzle for leads, stock and later alert/newsletter subscriptions. Cloudflare Access (not Clerk) protects the future admin area (#7, #21). The public site has no auth.
- Saved cars live in localStorage.
- Design: modernised, not a copy of the current site. The logo is the only locked asset. Design with the skills in `.agents/skills`, primarily `apple-design`, and write the contract before building UI.
- The dealer dashboard (`/dashboard`) is built on demo data plus what visitors send. Read `docs/dealer-admin.md` before touching it: on a deployed site it answers only behind Cloudflare Access (the Worker checks the token), sensitive figures (margins) need a permission checked on the server, and posting, ads and newsletters are simulated on the demo (`SIMULATE_INTEGRATIONS=off` for a real site) and send nothing outside.
- Scope: the public site and the dealer dashboard are built and live. The live demo is a public, view-only showroom with every module on: no demo bar, no dealer controls or links (owner, 2026-11-22; the deploy sets `NEXT_PUBLIC_DEMO_BAR=off`). The bar, with its Plan switch (modules on and off, `src/lib/modules-rules.ts`), is only in `next dev` and the E2E run. The dealer dashboard is its own app in checkwork-dash; the one here is archived (#243). Checkwork's own prices show on screen (`SHOW_PRICING` in `src/lib/billing/rules.ts`; false hides them). What is still open is only what the open issues say; the launch steps for a client site are in `docs/new-site-checklist.md`. Before calling anything outstanding, check git log and closed issues.
- Look: the site must not look like a copy of any other dealer site we have built. Function stays, the look, feel and layout change.
- Planning lives in GitHub issues. Some code comments cite decision ids (D-08, T-03-27 and so on) from planning notes that were removed from this repo: treat them as history, and put new planning in issues.

## Standards
The `vintage` repo (`~/Developer/vintage`, GitHub `CristianGaudino/vintage`) is the reference for code, design and process. When unsure of a standard, follow it. If still unsure, ask the owner and ask for context rather than guessing.

## Working in git
- Never develop or commit on `main`, ever. Check `git branch --show-current` before the first edit. Branch first (`git switch -c <type>/<name>`), including for planning docs. The only exception was the initial repo setup push.
- Open every PR against `main`, never against another feature branch (GitHub closes a PR whose base branch is merged and deleted).
- Open PRs ready for review, not as drafts. CI runs only by hand (Actions minutes): merges deploy, and the deploy runs lint and the tests first, so the local checks below are the gate. Never merge a PR yourself, under any instruction or circumstance: open it and stop. The owner merges.
- Link the issue in the PR (`Closes #n`) and move it on the project board.
- Stage named files, not `git add -A`. Never push `.env*`, `test-results/` or `playwright-report/`.
- GitHub Actions minutes are limited and shared. Push fewer, finished commits.

## Before opening a PR
1. Run the ponytail audit (`/ponytail:ponytail-audit`) on what the branch changed: the changed files plus their callers and tests.
2. Fix what it raises on the same branch. A real trade-off goes in the PR description for the owner to decide.
3. Run lint, typecheck, unit tests, `bash scripts/check-migrations.sh main` and the E2E suite against a production build. Open the PR only if they pass. Say what the audit found and the E2E result in the PR.
4. Skip steps 1 and 3 for docs-only, workflow-only or copy-only changes, and say so in the PR.

Check by exit code, not by reading output for "error": `npm run lint; echo $?`, `npm test`, `npm run build`. Typecheck with `npx tsc --noEmit`.

## Next.js 16
This is not the Next.js in your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing code, and heed deprecation notices. `next dev` writes an `AGENTS.md` block about this; commit it.

## Releases
Every merge to `main` deploys to production (deploy.yml). For now there are no release-tag deploys; the Release workflow only tags and publishes notes. Roll back by running Deploy from the Actions tab with an older tag or commit. Move to release-tag deploys, as in vintage, once there is a live client site.

## Product rules
- On-screen text is plain, short and human. No em dashes anywhere on the site. If a label already says it, drop the helper text.
- Finance figures are representative only and carry the dealer's required wording. Never invent APRs or terms in the product: use the client's.
- No demo, draft or placeholder pills, badges or labels anywhere on the site. It looks and feels like a real site. (The demo bar, in development only, and the dev-only data toggle are the only chrome that says "demo".)
- Real customer data (leads, subscribers) is personal data: collect with consent, keep it minimal, and never log it.
- Mobile first. Fast on a mid-range phone is a feature, not a polish step.
