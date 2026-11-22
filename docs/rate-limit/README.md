# The rate limit page

A visitor who sends too many requests is stopped by a Cloudflare rate limiting rule (Security, WAF), which answers before the Worker
runs. Without a custom response they see Cloudflare's own page. These two files are that rule's custom response, kept here so they can
be set again on every site (issue #237):

- `page.html`: the page for people. One file, its CSS and the logo inline, no script and nothing loaded from anywhere (while the
  limit holds, any other request would be limited too). It follows the device's light or dark theme. "Try again" is a link to the
  same address, so it works without JavaScript. About 6.4 KB.
- `api.json`: the body for `/api/*`, in the same shape as the site's own API errors (`{ "error": "..." }`).

`src/lib/rate-limit-page.test.ts` checks both: under Cloudflare's size limit, no outside URLs, `lang`, a title, one `h1`, the retry
link, no em dash, the dealer's name and phone as in `src/lib/site.ts`, and that the JSON parses.

## For a new site
The page cannot read `site.ts`, so the dealer's name (the `<title>` and the logo's `aria-label`), phone (the `tel:` link and its text)
and logo (the inline `<svg>`, from `public/brand/logo-on-light.svg` with the words' fill set to `currentColor`) are written in it.
Change them with `site.ts`; the test fails until they match.

## What Cloudflare allows
Checked 2026-11-22 against Cloudflare's docs:

| | |
|---|---|
| Plan | A custom response needs **Pro or above**: "This feature is only available on Pro plans and above." ([create a rule in the dashboard](https://developers.cloudflare.com/waf/rate-limiting-rules/create-zone-dashboard/)). On Free the visitor gets Cloudflare's page. |
| Rules per plan | Free 1, Pro 2, Business 5, Enterprise 100 ([availability](https://developers.cloudflare.com/waf/rate-limiting-rules/#availability)). Two rules (pages and `/api/*`) fit on Pro. |
| Action | Only the **Block** action has a custom response ([parameters](https://developers.cloudflare.com/waf/rate-limiting-rules/parameters/)). |
| Content type | Custom HTML (`text/html`), Custom Text (`text/plain`), Custom JSON (`application/json`), Custom XML (`text/xml`), or Cloudflare's default. |
| Status | Any code from 400 to 499; the default is 429 (Too many requests). |
| Body size | "The maximum field size is 30 KB." |
| Retry-After | The custom response has no field for headers. Cloudflare sets a `Retry-After` on a rate limited response itself, from the rule: "If a WAF rate limiting rule has already set a dynamic `Retry-After` value on the response, that value takes precedence" over the 30 seconds it sends with its own error 1015 ([error responses](https://developers.cloudflare.com/fundamentals/reference/error-responses/), [changelog, 2026-03-12](https://developers.cloudflare.com/changelog/post/2026-03-12-retry-after-header-for-1xxx-errors/)). The docs do not say in so many words that it is kept on a custom body, so check it once the rule is on (below). |
| Pages and `/api/*` apart | Each rule has its own match expression and its own response, so one rule can send HTML for pages and another JSON for `/api/*`. On Pro, a rule's period is up to 1 minute and its block up to 1 hour; Free allows 10 seconds of each. |

## Set it in the Cloudflare dashboard
Do this by hand on the dealer's zone; nothing in the repo or the deploy sets it.

1. Open the zone, then **Security** > **Security rules** (older dashboards: **Security** > **WAF** > **Rate limiting rules**).
2. **Create rule** > **Rate limiting rules** (or edit the existing rule). Name it `API rate limit`.
3. **If incoming requests match**: `starts_with(http.request.uri.path, "/api/")` (or Field `URI Path`, Operator `starts with`, Value
   `/api/`). Set the rate (requests, period) and the block duration you want. **Then take action**: **Block**.
4. **With response type**: **Custom JSON**. **Response code**: `429`. **Response body**: paste `docs/rate-limit/api.json`. Deploy.
5. Create a second rule, `Page rate limit`, for everything else: `not starts_with(http.request.uri.path, "/api/")`. **Block**,
   **Custom HTML**, response code `429`, body: paste the whole of `docs/rate-limit/page.html`. Deploy.
6. Place the API rule first, so an `/api/` request never gets the HTML.
7. Check it: send requests past the limit (`for i in $(seq 1 200); do curl -s -o /dev/null -w "%{http_code}\n" https://<domain>/; done | sort | uniq -c`),
   then `curl -sI https://<domain>/` while blocked: expect `429`, `content-type: text/html` and a `retry-after`. Do the same for a
   `/api/` path and expect the JSON. Open the page in a browser in light and dark.

On a Free zone there is no custom response: the visitor keeps seeing Cloudflare's page until the zone is on Pro.
