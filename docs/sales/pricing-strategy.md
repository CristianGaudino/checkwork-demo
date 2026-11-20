<!-- /founder:pricing-strategy · 2026-11-20 · input: Checkwork dealer site and suite; re-run pricing plans with the prospect research of 255 dealers in Cork, Limerick, Galway, Waterford and Kerry -->
# Pricing strategy

Built on [prospects.md](prospects.md) and the cards. Today's prices are in `src/lib/billing/rules.ts`: base site €200/mo plus €1,200 setup, Leads €319, Dealer €449, Everything €619, modules €19 to €99, usage per use.

Assumption: we sell to tier A and B dealers (112 of 255). Tier C (median 26 cars) is not worth a sales call at these prices.
Assumption: support takes about 2 hours a month per dealer at €40 an hour. Estimate, not measured.

## What the research says
- **Who can pay:** tier A dealers have a median of 131 cars, tier B 71. The median prospect has about €0.9m of stock; the top 10% hold €4.1m or more.
- **They already pay for a site:** 37% are on CarsIreland's dealer site, 22% HappyDealer, 8% DoneDeal's, 7% a manufacturer template. Only about 12% have no real site.
- **What sells:** the top openers on the cards are not "you need a website". They are:
  - reviews missing from the site (most tier A cards)
  - no way to value a trade-in
  - leads arriving by email or phone with nobody tracking them
  - several branches with no single inbox
  
  That is the dashboard, reviews and trade-in, not the base site.

**Today's pricing is right in shape and wrong in one place.** The €200 base plus €1,200 setup is being sold against a site most prospects already have, and DoneDeal gives one away free. So the base on its own is a hard sale. Put the hooks that win (reviews, trade-in, leads inbox) into the tiers dealers will buy, and make setup something the first year pays for.

## 1. Pricing model

| Model | Fit (1 to 5) | Pros | Cons |
|---|---|---|---|
| Flat subscription | 5 | Dealers already pay monthly for listings; easy to budget | Usage costs need a cap |
| Usage-based | 3 | Fair for lookups, WhatsApp and AI, which cost us per use | A whole bill on usage is hard to budget |
| Per-seat | 2 | Fits staff logins | Dealers have 2 to 15 staff; seats punish growth |
| Freemium | 1 | None | DoneDeal's free site already sits at "free" |
| Credits | 2 | Prepays usage | Another thing to explain |
| One-time purchase | 1 | Clean for the site build | Hosting and support never end |

**Recommend: tiers with a monthly fee and usage allowances, then a per-use price over the allowance.** Dealers already budget a monthly listing fee, and the only costs that grow with use (lookups, WhatsApp, AI) are covered by allowances.

## 2. Tiers

| | **Showroom** | **Dealer** (the target) | **Group** |
|---|---|---|---|
| Monthly, before VAT | €249 | €449 | €749, plus €149 per extra branch |
| Annual | €2,490 (2 months free, 17%) | €4,490 (17%) | €7,490 (17%) |
| Setup | €950, waived on annual | €950, waived on annual | €1,950 (multi-branch migration) |
| Who | 30 to 70 cars, independents | 60 to 150 cars, franchise or busy independent | 2+ branches (26 prospects) |

**Showroom:** the site
- Own-brand site, stock synced from DoneDeal or CarsIreland
- Google reviews on the site
- Enquiry and WhatsApp click to chat
- Finance estimator
- Trade-in form with 25 registration lookups a month
- 1 staff login
- **Upgrade trigger:** leads land in email and go cold, or they want test drive booking.

**Dealer:** the dashboard
- Everything in Showroom
- Leads inbox with follow-ups
- WhatsApp alerts (500 messages a month)
- Test drive booking and calendar
- Trade-in with 100 lookups a month
- Reviews replies from the dashboard
- Deposits and sale records
- 10 staff logins with roles
- **Upgrade trigger:** a second branch, or they want margins and reports.

**Group:** sales-led
- Everything in Dealer, for every branch, with one inbox
- Margins and reports
- Social posts and ads with AI drafts (300 a month)
- Newsletter and stock alerts
- New cars and factory orders
- Commercial section
- **Upgrade trigger:** more branches.

**Add-ons for any tier:** commercial vehicles €29, new cars €99, social €99, newsletter €59. Today's module prices stand, so a Showroom dealer can buy one module without jumping a tier.

**Over the allowance:** lookups €0.30, WhatsApp alerts €0.05, replies €0.03, marketing messages €0.12, AI €0.04 Standard or €0.08 Premium. Today's prices stand, except WhatsApp replies rise from €0.02 to €0.03, because Meta now charges for messages inside the 24-hour window.

## 3. Competitive context
Checked 20 November 2026. No Irish platform publishes dealer prices.

| Competitor | Price | Includes | Source | Where we sit |
|---|---|---|---|---|
| DoneDeal dealer packages | Not published; about €130 + VAT/mo (forum, about 2 years old) | Listings; a "Pro Dealer Website" free with a package | [sales.donedeal.ie](https://www.sales.donedeal.ie/motors), [boards.ie](https://www.boards.ie/discussion/2058380932/why-do-dealers-stick-with-carzone-and-carsireland-despite-high-fees) | Above. We don't replace listings; we turn them into leads on the dealer's own site |
| CarsIreland | Not published; about €300/mo (forum) | Listings, dealer website | same boards.ie thread | Between Showroom and Dealer. Sell what their site lacks: reviews, trade-in lookup, a leads inbox |
| MotorDesk | €89, €189 or €310/mo | Dealer website plus DMS | [Sage marketplace](https://ie-marketplace.sage.com/en-ie/apps/116385/motordesk) | Above Showroom on site, near on the full product. Win on lookups, WhatsApp and local service |
| Carzone | Estimate: about £590/mo per forecourt (£4.1m revenue ÷ about 582 forecourts ÷ 12, 2022) | Listings, dealer site | [RTÉ](https://www.rte.ie/news/business/2022/1024/1330997-carzone-sold-to-mediahuis) | Dealer sits below this |
| Auto Trader UK | Average £2,995/mo per retailer (year to March 2026) | UK listings | [results](https://www.stockopedia.com/share-prices/autotrader-LON:AUTO/news/autotrader-grp-full-year-results-for-the-year-ended-31-march-2026-019e6dd5-0ee5-77c4-8a37-bd3d575579bb/) | Not a peer; it shows UK dealers pay far more |

## 4. Unit economics
**Costs per dealer per month:**
- **Hosting:** about €0 marginal. Cloudflare Workers is $5/mo per account, and D1 and R2 sit within the included use for a dealer site ([Workers](https://developers.cloudflare.com/workers/platform/pricing/), [R2](https://developers.cloudflare.com/r2/pricing/)).
- **Lookups:** 10c to 18c each from [One Auto API](https://www.oneautoapi.com/pricing/ie/). 100 lookups is €10 to €18.
- **WhatsApp:** about €0.0142 per utility message, so 500 alerts is about €7. That's from a third-party reading of Meta's July 2026 rate card ([gohighlevel](https://ideas.gohighlevel.com/changelog/updated-whatsapp-per-message-pricing-effective-july-2026)); confirm it in Meta Business Manager.
- **AI:** Sonnet $2 input and $10 output per million tokens ([Anthropic](https://platform.claude.com/docs/en/about-claude/pricing)). One draft is about $0.007, so 300 drafts is about €2.
- **Support:** estimate, 2 hours at €40 is €80 (€160 for a group).

| Tier | Price | Cost | Gross margin |
|---|---|---|---|
| Showroom | €249 | Lookups €4 + support €80 = €84 | 66% |
| Dealer | €449 | Lookups €18 + WhatsApp €7 + support €80 = €105 | 77% |
| Group (2 branches) | €898 | Lookups €36 + WhatsApp €14 + AI €2 + support €160 = €212 | 76% |

- **Break even:** [Checkwork's fixed monthly costs]. For example, at €4,000 a month that's 12 Dealer customers, or 6 Group, or 25 Showroom (contribution of €344, €686 and €165).
- **Target blended ARPU, estimate:** €460 a month, assuming 35% Showroom, 50% Dealer and 15% Group (two branches). That works out as €87 + €225 + €135 = €447, plus about €15 of usage over allowances.

## 5. Pricing psychology
- **Anchoring:** show Group first, at €749 plus branches. Dealer at €449 then reads as the sensible choice. Most tier A prospects are single-site franchises, who see Group and pick Dealer.
- **Decoy:** Showroom has no leads inbox and no test drives. Those are the gaps on most cards, so a dealer who feels the pain sees the €200 step to Dealer as cheap.
- **Annual framing:** "2 months free, and no setup fee". The waived €950 is the bigger number, so lead with it.

## 6. Launch vs. scale
- **Launch, first 90 days or the first 10 dealers:** Dealer at €349 a month for 12 months and no setup, on an annual contract. That is €100 under scale, because we need reference dealers in Cork and Kerry more than margin. The tier A openers make the first call easy; the discount closes it.
- **Grandfathering:** founding dealers keep their price for 24 months. After that they move to the current price minus 10%, with 60 days' notice.
- **Price increases**, made at renewal with 60 days' notice and never mid-contract:
  - when 5 dealers in one county are live, because a local reference cuts our sales cost
  - when the close rate on tier A calls is over 40% at the current price
  - when DoneDeal's sync and a second lead channel (for example Facebook leads) ship

Saved to `docs/sales/pricing-strategy.md`. Next: `founder:go-to-market` for the outreach plan to tier A, and `founder:landing-page` for a pricing page when prices go public (`SHOW_PRICING`).
