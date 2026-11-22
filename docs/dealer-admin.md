# The dealer dashboard

The dealer dashboard is its own app: repo [checkwork-dash](https://github.com/CristianGaudino/checkwork-dash), live at
https://www.dash.checkwork.ie. It was built inside this repo first (`/dashboard`, owner decision 2026-11-21) and was removed from here on
2026-11-22 (#243). Its git history is in this repo's log before that change. Everything about running a dealer's stock, leads, team,
permissions, marketing, reports and billing is documented and built there. This repo is only the dealer's public website (the Showroom).

## How the website sends leads to the dashboard

Each lead this site stores is also sent to the dashboard's site API (`POST /api/site/v1/leads`, `src/lib/leads/dash.ts`), after the dealer
email was tried. The site key (`DASH_SITE_KEY`, a Worker secret) decides which dealer it is for. The request goes Worker to Worker through the
`DASH` service binding (`wrangler.jsonc`), past Cloudflare Access, or over a normal fetch to `DASH_URL` when there is no binding (local work,
the E2E stub in `e2e/dash-stub-server.mjs`). With no key nothing is sent.

- It runs after the buyer's answer is out (`after()`), so a slow or down dashboard never makes the buyer wait.
- It never loses a lead or shows the buyer an error. A failed or slow send (5 seconds, two tries) is logged as `dash_failed` with the lead's
  id, type and HTTP status only, never a name or a contact detail. The lead is still in this site's `leads` table and in the dealer's email.
- The body is the fields of the v1 contract only: the lead, whether the email went (`emailed`), how many trade-in photos came
  (`photoCount`) and, only when the buyer switched sharing on, the visit note (`journey`). Photos stay in this site's private bucket.
- Two more calls use the same key and route:
  - `GET /api/site/v1/drives/taken?carId=<id>` (`takenDriveTimesFromDash` in `src/lib/leads/dash.ts`) answers 200 `{"times": ["YYYY-MM-DD HH:MM"]}`,
    the slots already booked for that car, in Irish time, at most 2000. The test drive picker hides them, and a booking submit checks its slot
    again. Anything else (an error, a timeout of 1.5 seconds, a bad body) counts as none taken, so a down dashboard never blocks a booking.
  - `POST /api/site/v1/counts` with `{"day": "YYYY-MM-DD", "counts": {"<event>": <n>}}` (`src/lib/counts/send.ts`); 204 means accepted. The
    nightly job sends the last 7 finished days, and the dashboard replaces a day's counts. If it takes none of the days, the run logs
    `send-counts` with `error: "none accepted"`.
- The contract, and what the dashboard does with it, is in checkwork-dash (`docs/site-api.md`).

## What stayed here

The stock the site reads (D1 `cars`, seeded from `src/lib/stock/demo-cars.json`), reviews, the lead forms and their purge, the anonymous feature
counts (`/api/count`), and the registration lookup on the trade-in and sell forms. Starting a site for a dealer: `docs/new-site-checklist.md`.
