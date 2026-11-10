# V2 demo plan

Status: for owner approval, 2026-11-10. Covers design-contract build steps 1 to 9 plus the admin, platform, marketing, analytics and review work in the issues.

## Rules for the whole run
- Never develop on `main`. Every piece of work is its own branch off `v2-demo`.
- `v2-demo` is the integration branch. Finished, audited feature branches are merged into `v2-demo` by me (never `main`). When everything is done, one PR `v2-demo` to `main`. I never merge that PR.
- Each branch: ponytail audit on what it changed, fix findings, then lint, typecheck, unit tests, E2E on a production build, before it merges into `v2-demo`.
- Final gate for the main PR: full E2E green, a final ponytail audit with nothing outstanding, screenshots at 360/768/1280 in light and dark.
- Decisions I make without the owner are logged on one issue ("V2 decisions for review") as I go.
- Progress is tracked in one epic issue with a checklist, plus one issue per workstream (existing issues are reused and linked, not duplicated).
- All data is made up. No real emails, posts, ads or payments are ever sent: marketing and billing are simulated and say so.

## Architecture decisions (defaults, logged for review)
- Same stack: Next.js 16, Tailwind v4 tokens, D1 + Drizzle, Workers. No new heavy libraries; charts are hand-rolled SVG.
- Roles: demo cookie `role` (customer, dealer, superuser). Not real auth. The real admin uses Cloudflare Access later (#7). Admin and platform routes read the cookie; there is no login page.
- Demo bar fixed at top of every page: role switch and theme toggle. On by default, off with an env flag.
- Admin data lives in D1 through Drizzle (new tables, migrations). With no D1 binding (tests, `next dev`) a libsql/seed fallback is used, as stock does today.
- Admin writes are server actions with zod validation. No personal data in logs.
- Dealer and platform data (analytics, billing, dealerships) is generated seed data, clearly labelled as demo data.

## Phase A: Design foundation (contract steps 1 to 3)
1. `feat/tokens-type-demobar`: Tailwind v4 tokens (light default + dark), Manrope self-hosted, remove any hardcoded colours, demo bar (role switch to placeholder pages, theme toggle), `[data-theme]` + no-flash script. Closes part of #20, #14.
2. `feat/price-vehicle-card`: price block (used/new/commercial, VAT line, drop, finance-from) and vehicle card, used in list, home, similar, saved.
3. `feat/header-footer-menu`: header with Used/New/Commercial switch, mobile menu sheet, footer.

## Phase B: Public site restyle (contract steps 4 to 8)
4. `feat/home`: split hero, shop by type, featured mosaic, finance band, brands, reviews, visit us.
5. `feat/stock-list`: left rail + sheet filters, two-column photo grid, sticky result bar.
6. `feat/car-page`: gallery grid, sticky buy panel, spec table, viewer.
7. `feat/forms-content-errors`: stepped forms with progress rail, content and error pages.

## Phase C: Catalogue breadth (#23, #24, #4, #5)
8. `feat/new-cars-partners`: New section, brand partnership pages, brands strip.
9. `feat/commercial-vat`: commercial vehicles, ex/inc VAT pricing, filters.
10. `feat/alerts-social-links`: back-in-stock and price-drop alert sign-up, social links and embeds placeholders.

## Phase D: Dealer admin at `/admin` (#7, #21, #22, #19)
11. `feat/admin-shell`: sidebar (Overview, Leads, Stock, Customers and alerts, Marketing, Analytics, Reviews, Test drives, Settings), top bar, tables, filter bar, stat card, empty states.
12. `feat/admin-overview`: dashboard with KPIs, recent leads, stock health, tasks.
13. `feat/admin-stock`: stock list, add and edit a car (all fields, photos, price and VAT, status, sold), bulk actions, writes to D1 (#21).
14. `feat/admin-leads`: inbox with statuses, filters, detail, notes, assign, export. Lead email address setting (#22).
15. `feat/admin-test-drives`: bookings calendar and list, plus a public "book a test drive" form on the car page.
16. `feat/admin-customers-alerts`: customers, stock alert and newsletter subscribers.
17. `feat/admin-reviews`: reviews list, reply, flag, request-a-review.
18. `feat/admin-settings`: dealership details, hours, lead email, branding, users, notifications, integrations.

## Phase E: Marketing and analytics (#6, #13, #8 to #11, #12)
19. `feat/admin-marketing`: social post generator and scheduler per car, ads builder, newsletter composer and send log, stock alert campaigns, usage meter. All simulated.
20. `feat/admin-analytics`: visitors, location, sources, most viewed cars, funnel and drop-off, lead conversion and attribution. Seeded data, SVG charts.

## Phase F: Superuser at `/platform` (#19). REMOVED (2026-11, #62): the platform is a separate program, not part of a dealer site; it is in git history (PR #30)
21. `feat/platform`: dealerships list and detail, usage and billing, plans and add-ons, platform settings, audit log.

## Phase G: Ship
22. `chore/v2-hardening`: E2E for every new area, unit tests for new logic, accessibility pass, performance pass, empty/error states, screenshots, docs and CLAUDE.md update.
23. Final ponytail audit, fix, then one PR `v2-demo` to `main`, linked to the issues. Stop.

## Limits I am stating up front
- It is a very large scope for one night. Order above is priority order: if time runs out, the later items are the ones left unfinished, and the epic issue says exactly which. I will not mark anything done that is not.
- Cloudflare deploy, real email, real social and ad APIs, Cartell lookup (#2) and brand SVG logos (#3) are out of scope. Finance wording (#15) stays placeholder.
