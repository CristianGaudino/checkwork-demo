# Design contract: the demo's own look

Status: approved by the owner, 2026-11-10 (direction, font, header switch and dark option below). Issue: the redesign issue (#20).

## 1. Goal
Change the look, feel and layout completely, so the demo reads as its own product and nobody sees a re-skin of another dealer site. **Every behaviour stays**: stock browsing, filters, car pages, saved and compare, finance estimate, trade-in, find a car, contact, service, the lead pipeline, accessibility and the mobile-first rules. What changes is colour, type, shape, motion, composition and navigation.

The demo is also the all-inclusive product, shown from three perspectives (customer, dealer, superuser), and it must have room for new cars, manufacturer partnerships and commercial vehicles with VAT pricing. The look has to carry all of that.

## 2. What the research says
Mostly vendor blogs, so this is direction, not proof.
- Mobile-first is the baseline; speed under about 3 seconds, predictive search, and filters for price, body type and make are expected ([Autoxloo](https://www.autoxloo.com/news/2026-dealer-website-roadmap-mobile-speed-and-leads.html), [Spidersnet](https://spidersnet.co.uk/blog/blog-how-to-design-dealership-website-that-converts/)).
- A strong dealer site should feel like a digital showroom that shapes the brand, with generous space and a restrained palette ([Azuro](https://azurodigital.com/automotive-web-design-tips/)).
- Commercial vehicle buyers need the VAT status of a price clearly: Autotrader shows whether a van price includes VAT and says cars may not have VAT added on top ([Autotrader help](https://help.autotrader.co.uk/hc/en-gb/articles/9068343088285-How-do-I-add-VAT-to-my-advert)). Whether VAT is reclaimable changes a business buyer's real cost ([mobile.de listing data](https://apify.com/s-r/mobile-de-scraper.md)).
- Sliders for price should pair with a non-linear scale, which we already do ([Baymard](https://baymard.com/blog/slider-interfaces)).
- Interactive 360 views and similar are trends but cost a lot: not in v1 of the redesign.

## 3. Direction: "Showroom"
One sentence: a bright, editorial showroom, where the cars are the colour.

| | Carright (what we move away from) | The demo |
|---|---|---|
| Theme | Dark, high contrast, red accent | **Light first** (warm off-white paper, near-black ink). A dark theme stays as an option (it closes the light-mode issue) |
| Accent | One strong red | **Indigo from the Checkwork logo, used sparingly** (a primary button, a link, the active filter). Never as a large fill except one hero band |
| Type | Montserrat everywhere, bold and heavy | **A different family**: a variable sans such as Manrope for headings and body, large light-to-medium weights, tight tracking, numerals in tabular style. Self-hosted, one file |
| Shape | 12 to 16px rounded cards with borders | **Soft but flatter**: 20px radius on image tiles only, 10px on controls, no card borders, depth from background tone and one soft shadow |
| Photography | Cards with a visible frame | **Full-bleed tiles**: the photo is the card, text sits under it with plenty of air |
| Motion | Press scale and fades | Springy sheet and tile transitions from the apple-design skill, view transitions between list and car page, nothing slower than 250ms, all off with reduced motion |

## 4. Layout and navigation
- **Header:** transparent over the hero, then a slim solid bar. Centre: a vehicle-type switch **Used · New · Commercial** (New and Commercial show once those exist, see the issues). Left: logo. Right: search, saved, menu. On a phone: logo left, menu right, and the vehicle-type switch becomes a segmented control under the hero search.
- **Home:** a split hero (the headline and one search panel on the left, a large photo mosaic on the right, stacked on a phone); then "Shop by type" tiles (body types and vans), a large featured stock mosaic (not a carousel), a finance and trade-in band, brands we sell (partnerships), reviews, visit-us with map and hours.
- **Stock list:** filters in a left rail on desktop and a bottom sheet on a phone (as now), but the list becomes a two-column photo-led grid with a sticky result bar. Saved and compare actions sit on the photo.
- **Car page:** a gallery-first layout: a large two-by-two photo grid that opens the viewer, a sticky buy panel with the price (and VAT line where relevant), a spec table, finance estimate and similar cars. Price block is one component used everywhere (see 6).
- **Forms (trade-in, find a car, contact, finance):** keep the stepped forms; restyle with a left progress rail on desktop and a top bar on a phone.
- **Footer:** quiet, one row of links, hours and the Checkwork credit.
- **Admin:** see 5.

## 5. Three perspectives and the role switch
A **role switch** (customer · dealer · superuser) lives in a slim demo bar fixed at the top of every page, outside the site's own header, so the site itself stays clean. Choosing a role changes the route and the layout:
- **Customer:** the public site at `/`.
- **Dealer:** the dealership admin at `/admin`: sidebar (Overview, Leads, Stock, Customers and alerts, Marketing, Analytics, Settings), a top bar with the dealership's name and the role switch.
- **Superuser:** the platform view at `/platform`: dealerships list, usage and billing, platform settings.
The admin uses the same tokens and components as the site but a denser, calmer layout (tables, filters, forms), always light by default. The demo's role is a cookie, never real auth; the real admin is protected by Cloudflare Access (admin issue). The demo bar is removed for a real client site.

## 6. Components to design and build (in this order)
1. **Tokens:** colour (light and dark), type scale, spacing, radius, shadow, motion. In the `@theme` block in `globals.css`; the rest of the site reads them.
2. **Price block:** one component that shows price for any vehicle: the headline price, the VAT status line ("inc. VAT", "ex. VAT, VAT reclaimable"), the original price and a price drop, and the finance-from figure. Handles used, new and commercial. Never ambiguous.
3. **Vehicle card:** photo tile, title, key facts, price block, save and compare.
4. **Controls:** buttons, inputs, select (the site's own combobox), price range slider, segmented control, chips, tabs, steps.
5. **Navigation:** header, mobile menu sheet, footer, demo bar.
6. **Page templates:** home, list, car, form page, content page, error pages.
7. **Admin kit:** sidebar, table, filter bar, stat card, form layouts, empty states.

## 7. Rules that do not change
- Mobile first: designed at 360px first, then up. Targets at least 44px. Fast on a mid-range phone: no layout shift, images sized, fonts self-hosted and preloaded, no new heavy libraries.
- Accessibility: WCAG 2.2 AA contrast in both themes, visible focus, reduced motion respected, keyboard everywhere, no information by colour alone.
- On-screen text is plain, short and human, with no em dashes. Finance figures stay representative, with the required wording.
- No copy of any other dealer's brand, photos or layout. Pictures stay clearly made up (see the placeholder photos).

## 8. How we will build it (small, reviewable PRs)
1. Tokens, type and the demo bar (no layout change yet). Light theme becomes the default.
2. Price block and vehicle card, used by the list, home, similar cars and saved.
3. Header, footer and mobile menu.
4. Home page.
5. Stock list and filters.
6. Car page and the photo viewer.
7. Forms.
8. Content pages and error pages.
9. Admin and platform shells (with the admin issues).
Each PR keeps every E2E test green (tests that pin the old look are updated with the change), runs the ponytail audit, and has screenshots at 360, 768 and 1280px in light and dark.

## 9. Decisions (owner, 2026-11-10)
- Direction: "Showroom", light first and editorial.
- Font: Manrope.
- The header is built now with the vehicle-type switch (Used, New, Commercial). It shows only the sections that exist.
- Dark stays as a user choice, next to the light default.
- Role switch (customer, dealer, superuser) as a demo bar: agreed.
