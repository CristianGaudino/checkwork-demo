# Owner API

Read only, for the owner's own program (#62): how each live dealer site is used. Counts only, never personal data (no names, phones, emails, registrations or IPs). Built for #174.

## Set up (once per site)

- Worker secret `OWNER_API_TOKEN`: a long random string. Without it the routes answer 404 to everyone.
- Optional Worker secret `OWNER_API_MONEY=1`: adds sale values. Set it only when the dealer's contract allows.
- The routes are under `/api/owner/`, not `/dashboard`. Leave `/api/owner*` out of the staff Cloudflare Access application (that application covers `/dashboard*` only), or the owner's program is turned away by Access.

## Calls

Send `Authorization: Bearer <OWNER_API_TOKEN>`. No token or a wrong one: `404`, as the closed dashboard answers. The token is compared in constant time.

- `GET /api/owner/v1/summary?from=YYYY-MM-DD&to=YYYY-MM-DD`
- `GET /api/owner/v1/usage?from=&to=`: billing counts by month, with costs for the month in progress only (a past month may have been on another AI plan; its bill is the record)
- `GET /api/owner/v1/modules`: the modules on and the monthly plan

`from` and `to` are Irish days, inclusive; the default is the last 30 days. More than a year, or a bad day: `400`. Answers are cached for an hour per range (`Cache-Control: private, max-age=3600`, and in the Worker).

## Shape of `summary` (version 1)

```json
{
  "version": 1,
  "appVersion": "0.1.0",
  "range": { "from": "2026-10-01", "to": "2026-10-31" },
  "leads": { "total": 42, "byType": { "enquiry": 30, "finance": 4 }, "bySource": { "Website": 35, "Phone": 7 }, "byWeekday": [6, 7, 5, 8, 6, 7, 3], "outOfHours": 15 },
  "replies": { "medianInHoursMin": 35, "medianOutOfHoursMin": 610, "none": 3 },
  "stock": { "inStock": 38, "added": 12, "sold": 9, "avgDaysInStock": 31, "oldStock": 6, "priceDrops": 4 },
  "sales": { "count": 9, "valueEur": 118000 },
  "reviews": { "count": 3, "average": 4.7 },
  "features": { "saved": 120, "compare": 31, "finance": 18, "units": 9, "no-results": 14, "filter:fuel": 52 },
  "dashboard": { "leads": 88, "stock": 40, "monthly-report": 2 },
  "modules": ["dashboard", "sales", "reviews"],
  "listingSync": { "lastRunAt": 1760000000000, "lastOkAt": 1760000000000, "result": { "added": 0, "changed": 0, "takenDown": 0 }, "ok": true },
  "usage": [{ "month": "2026-10", "totalEur": 12.4, "services": { "lookup": { "count": 40, "costEur": 12, "kinds": [{ "kind": "website", "count": 30, "costEur": 9 }] } } }]
}
```

- `leads.byWeekday`: Monday first. `bySource` is the channel (Website, Phone, WhatsApp...). `outOfHours` uses the opening hours in `src/lib/site.ts`, Irish time.
- `replies`: minutes from a lead arriving to the first note on it, by when it arrived. `none`: leads with no note within 24 hours, once those 24 hours have passed. `null` when there are none.
- `stock`: `added` and `sold` are in the range. `inStock`, `avgDaysInStock`, `oldStock` (for sale 60 days or more) and `priceDrops` are the stock now (the site keeps no daily history).
- `sales.valueEur` appears only with `OWNER_API_MONEY=1`. Orders and deposits are not counted yet.
- `features`: anonymous daily counters (`saved`, `compare`, `finance`, `units` for km or miles, `no-results`, `contact-topic`, `filter:<make|model|body|fuel|price|year|km|gearbox>`). `dashboard`: page opens per dashboard area, counted by the dashboard itself behind Access. Neither says who.
- No visitor numbers yet: they come from the `analytics` integration once connected. Errors in the last 24 hours are not included yet.

## Counters

`POST /api/count` with `{"event": "<name>"}`, from `src/lib/count-client.ts` (`navigator.sendBeacon`, at most once per event per page load). Only names in `src/lib/owner-api/counter-rules.ts` are stored: one record a day per event, no cookie, no id, no IP. Every event is limited per IP with its own limiter (`COUNT_LIMITER`, 20 a minute), and a body over 200 bytes is refused, whether or not its size is stated. Dashboard opens are not sent here: the dashboard counts them itself, behind Access.

## One set of figures

The API, the monthly report page and its email all read `src/lib/reports/monthly.ts`, so they never disagree.
