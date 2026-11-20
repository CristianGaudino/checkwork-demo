# Who we sell to, and how we rank them

Tracking: issue #215 (one issue per county, #216 to #220). Results: [prospects.md](prospects.md); evidence per county in [data/](data/).

## The client we want
A dealer who **can pay and will pay**: for the basic site, or for the full suite (dashboard, finance, trade-in, test drives, reviews, social, WhatsApp and the rest; see `src/lib/modules-rules.ts`). Independent or franchise. Size and spending matter more than how weak their current site is: a weak site gives us the opening, money closes the sale.

## Skip at a glance (one line of reason, no further research)
- Fewer than about 15 cars for sale, or no sign of trading in the last few months.
- Not a car retailer: breakers, parts only, rental, motorbikes only, plant or trucks only.
- Part of a national group whose sites are run centrally (one site for many branches).
- Already on a strong, modern site built in the last year or two with most of what we sell (stock search, finance, trade-in, reviews), unless they are big enough to want the dashboard.
- Kerry: Cartwright (already being pitched as Carright).

Franchise dealers often have to use the manufacturer's site for new cars. Note it; their used-car side or dashboard can still be a sale.

## Scoring (out of 100)
**Able to pay (up to 50)**
- Stock for sale: 80+ cars 20, 40 to 79 15, 20 to 39 8, under 20 2.
- Stock value (cars × typical price): over €1.5m 10, €0.6m to €1.5m 6, less 2.
- Franchise or sells new cars: 8. More than one branch: 5.
- Pays for advertising (a dealer account on DoneDeal or CarsIreland with most of its stock, paid placements, radio or sponsorship seen on their site or socials): 7.

**Willing and active (up to 20)**
- Google reviews: 200+ 10, 50 to 199 6, under 50 2.
- Active: posts on social media in the last month, stock updated in the last week, a named team on the site: up to 5.
- Already pays for extras (finance calculator, chat, a paid site builder or agency): 5. Someone who already spends is easier to move than someone who never has.

**Our opening (up to 30)**
From their own website, checked by our sweep (phone and desktop): breaks or overflows on a phone, slow, errors, fails basic accessibility, no stock on the site (links out to DoneDeal), no way to enquire about a car, no finance estimator, no trade-in form, no test drive request, no reviews shown, not HTTPS, looks dated. Roughly 3 points per real problem, up to 30.

**Tiers:** A 70+, B 50 to 69, C under 50. Sales points are written for A and B.

## What we record per dealer (data/<county>.json)
```json
{
  "name": "", "county": "", "town": "", "website": "", "businessPhone": "",
  "type": "independent | franchise", "brands": [], "branches": 1,
  "stock": { "count": 0, "source": "url", "checkedAt": "YYYY-MM-DD" },
  "typicalPriceEur": 0,
  "reviews": { "count": 0, "rating": 0, "source": "url" },
  "adSignals": [], "platform": "who built the site, if shown",
  "activity": "", "glanceNotes": "", "skip": null, "sources": []
}
```
Business facts only. No personal data, except a name the dealer publishes as the contact on its own site. Every number has a source URL.

## From their problem to our pitch
| What we find | What we say | What sells it |
|---|---|---|
| Site breaks or is slow on a phone | Most buyers browse on a phone; every one who leaves is a lost lead | The site itself, mobile first |
| Stock only on DoneDeal, or links out to it | Buyers leave your site for a page with your competitors' cars beside yours | Stock search on their own site, synced from DoneDeal |
| No enquiry, finance or trade-in forms | Buyers who can't ask, don't | Lead forms, finance estimator, trade-in with photos and reg lookup |
| Leads by phone and email only, no follow-up | Leads go cold in an inbox | Dashboard: leads inbox, follow-ups, WhatsApp alerts |
| Strong Google reviews not on the site | Your best salesperson isn't on your website | Reviews on the site, replies from the dashboard |
| Posts rarely, or by hand | Every car is a post you're not making | Social posts and ads from the dashboard, AI drafts |
| No idea what sells or makes money | Margins and stock age decide profit | Margins, reports, stock age |
| Sells vans | VAT-registered buyers want ex. VAT prices | Commercial section |
| Franchise | New cars and factory orders in one place | New cars and orders |
