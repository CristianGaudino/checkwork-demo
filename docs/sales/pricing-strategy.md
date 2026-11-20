<!-- /founder:pricing-strategy · 2026-11-20 · input: Checkwork dealer site and suite; re-run pricing plans with the prospect research of 255 dealers in Cork, Limerick, Galway, Waterford and Kerry -->
# Pricing

Prices are a month, before VAT. Every tier is 2 months free when paid annually, and annual waives the setup fee.

## Why these tiers
- **Most prospects already have a site:** about 88% pay for CarsIreland, HappyDealer or DoneDeal, and DoneDeal gives one away free. So the base site is the hard sale.
- **What wins dealers** (the openers on the [cards](cards/)):
  - their Google reviews missing from their site
  - no way to value a trade-in
  - leads lost in email
  - several branches with no single inbox
- **Who can pay:** tier A dealers have a median of 131 cars, tier B 71. We sell to those; tier C (median 26) isn't worth the call.

## The tiers
| | **Showroom** | **Dealer** (the one we push) | **Group** |
|---|---|---|---|
| Monthly | €249 | €449 | €749, plus €149 per extra branch |
| Setup | €950 | €950 | €1,950 |
| For | 30 to 70 cars | 60 to 150 cars | 2 or more branches |

**Showroom:** the website.
- Own-brand site, with stock synced from DoneDeal or CarsIreland
- Google reviews on the site
- Enquiry form (leads go to the dealer by email) and WhatsApp click to chat
- Finance estimator
- Trade-in form with 25 registration lookups a month
- Car finder: a "find me a car" form for cars not in stock
- No dashboard, so no staff logins

**Dealer:** Showroom plus the dashboard.
- Leads inbox with follow-ups
- WhatsApp alerts (500 a month)
- Test drive booking and calendar
- Trade-in with 100 lookups a month
- Reply to Google reviews from the dashboard
- Deposits and sale records
- Site analytics: visitors, and which ads bring leads
- 10 staff logins with roles

**Group:** Dealer for every branch, with one inbox, plus:
- Margins and reports
- Social posts and ads with AI drafts (300 a month)
- Newsletter and stock alerts
- New cars and factory orders
- Commercial vehicles section

**Add-ons:**
- **Any tier:** commercial vehicles €29.
- **Dealer only** (they need the dashboard):
  - Service and aftersales €49 (service booking and warranty claims, for dealers with a workshop)
  - New cars €99
  - Social €99
  - Newsletter €59

**Over an allowance:**
- lookup €0.30
- WhatsApp alert €0.05, reply €0.03, marketing message €0.12
- AI draft €0.04 (Standard) or €0.08 (Premium)

## Launch offer
- **First 10 dealers:** Dealer at €349 a month with no setup, on a 12-month annual contract, with the price kept for 24 months. We need reference dealers in Cork and Kerry more than margin.
- **Price rises:** at renewal with 60 days' notice, once any of these is true:
  - 5 dealers are live in one county
  - more than 40% of tier A calls close
  - Facebook leads ship

## Margins
| Tier | Price | Our cost a month | Margin |
|---|---|---|---|
| Showroom | €249 | €84 | 66% |
| Dealer | €449 | €105 | 77% |
| Group, 2 branches | €898 | €212 | 76% |

**What the costs are:**
- **Support:** about €80 per site (2 hours at €40), an estimate.
- **Hosting:** close to €0 per dealer on Cloudflare.
- **Lookups:** 10c to 18c each from One Auto API.
- **WhatsApp alerts:** about €0.014 each.
- **AI drafts:** about €0.007 each.

**Break-even:** at an example €4,000 a month of fixed costs, that's 12 Dealer customers, or 6 Group, or 25 Showroom. Target average income is about €460 a dealer a month.

## What dealers pay now
None of the Irish platforms publish dealer prices.

| Platform | Price a month |
|---|---|
| DoneDeal | About €130 + VAT (forum figure), website included |
| CarsIreland | About €300 (forum figure) |
| MotorDesk (site plus dealer software) | €89 to €310 (published) |
| Carzone | About £590 (estimate from Auto Trader's figures) |

So Checkwork is a second bill alongside their listings. It has to pay for itself in leads.

## Needs building before we sell
1. **Reviews on the site without the dashboard:** in the code, reviews needs the dashboard. Split showing reviews (Showroom) from replying to them (Dealer).
2. **Monthly allowances:** billing has no included lookups or WhatsApp messages yet; today every use is charged.
3. **Multi-branch:** one dashboard and inbox across branches isn't built. Until it is, sell a group one Dealer per branch.
4. **Code prices:** set the new prices and the €0.03 WhatsApp reply in `src/lib/billing/rules.ts`.

## For you to decide
1. These three tiers, or your current Base, Leads, Dealer and Everything bundles?
2. The launch offer at €349.
3. Your real fixed costs, for the break-even.
