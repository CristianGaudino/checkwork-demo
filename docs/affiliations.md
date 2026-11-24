# Memberships and partners (affiliations)

What a dealer belongs to or works with, shown on their site to build trust: SIMI, AA Approved Dealer, their warranty provider, their
lenders. Set in `src/lib/affiliations.ts` (`AFFILIATIONS`).

**The demo shows none of this and must not.** Checkwork Motors is made up, so a real body's name or logo would claim a membership it
does not have. `affiliations.test.ts` fails if the demo's list is not empty.

## Turning it on for a client site

1. Ask the dealer which of the options below they hold. Get it in writing, with their membership or dealer number where there is one.
2. Check each one yourself where the body lets you (SIMI's Find a Member, the AA, DoneDeal's dealer page).
3. Get the logo from the body, not from a web search, and follow its terms. SIMI, for one, gives members its logo through a consent
   form in the application pack. Never recolour or stretch a logo. Put the file in `public/affiliations/` (SVG, or PNG at 2x).
4. Add one entry per body to `AFFILIATIONS`. Write `text` in the dealer's voice, one plain sentence on what it means for the buyer, no
   em or en dashes. Use the wording below as a start; the dealer confirms it.
5. Run `npm test`. `affiliations.test.ts` checks every entry: the logo exists, the link is https, the sentence is one sentence with no dashes.

## Where each kind shows

| Kind | Shows on | How |
|---|---|---|
| `membership`, `approved`, `listing` | Home (under the reasons to buy), footer, About | Logo row; About lists each with its sentence. Memberships also go in the search data (`memberOf`). |
| `warranty` | Warranty page, About | "Your warranty is provided by X." and the dealer's sentence |
| `finance` | Finance page, About | "Finance is arranged through X and Y." and the sentence when there is one lender |
| `history` | About | In the list |

Nothing shows for a kind with no entries.

## The options in Ireland (researched November 2026)

Each is optional. Only show what the dealer really holds, and check it.

### Memberships (`membership`)
- **SIMI** (Society of the Irish Motor Industry). The trade body; members follow its code of ethics, which includes checking used cars
  and putting right problems that arise. Buyers can check a member on SIMI's site. Link: `https://www.simi.ie/en/find-a-member`.
  Suggested text: "We're a member of SIMI and follow its code of practice."
- **SIMI Autosure Professional Register** (garages with a workshop). Only qualified technicians sign off service work, to the
  manufacturer's standard. Suggested text: "Our servicing is signed off by qualified technicians, on the SIMI Autosure Professional Register."

### Approved dealer schemes (`approved`)
- **AA Approved Dealer.** The AA audits the garage before accepting it. An AA Approved car has a 101-point inspection, a history check
  and 12 months of AA Roadside Rescue. Only use the AA's own wording, and only for the cars the scheme covers (the AA's dealer terms apply).
  Link: `https://www.theaa.ie/aa-approved-cars/dealer-network/`. Suggested text: "We're an AA Approved Dealer, audited by the AA."
- **Manufacturer approved used** (a franchise dealer's own maker's scheme). Use the maker's name and wording for it.

### Listing site badges (`listing`)
- **DoneDeal Trusted Dealer.** A badge DoneDeal gives qualifying dealers; their cars on DoneDeal can come with a free history check.
  Link to the dealer's own DoneDeal dealer page. Suggested text: "We're a DoneDeal Trusted Dealer."

### Warranty provider (`warranty`)
The company behind the dealer's warranty, if it is not the dealer's own. Irish examples: **CarSimple**, **MAPFRE Warranty**, **MAWDY**,
**AA Warranty**. Say who to contact to claim. Suggested text: "To claim, contact them directly or call us and we'll help."
A warranty never replaces the buyer's rights under consumer law; the Warranty page says so already.

### Finance lenders (`finance`)
The lenders the dealer arranges finance through, if the dealer wants them named. Irish examples: **Close Brothers Motor Finance**,
**PTSB Asset Finance**, **First Citizen**, **Bank of Ireland Finance**, or a manufacturer's own finance company. The dealer's required
credit wording (a credit intermediary has to say it is one) stays in `src/lib/finance/finance.config.ts`, not here. `text` is one plain
sentence, such as "All finance is subject to approval.", and is left out when there are several lenders.

### History checks (`history`)
- **Cartell** or **Motorcheck**, if the dealer checks every car. Suggested text: "Every car is history checked with Cartell before we sell it."

### Not worth showing
- **SEAI EV grant**: a dealer has to be registered to take the grant off a new EV's price, but it is a price matter, not a trust badge.
  If needed, say it on the car page as part of the price.
- Technician qualifications (QQI Level 6 apprenticeship, SERMI for security work, F-Gas for air conditioning) are the people's, not
  the business's; mention them in the About story if the dealer wants, not as badges.

## Sources
- SIMI: https://www.simi.ie/en/join-simi and https://www.simi.ie/en/find-a-member
- SIMI Autosure Professional Register: https://www.simi.ie/en/consumer-help/simi-standards/simi-autosure-professional-register
- Citizens Information, buying a used car: https://www.citizensinformation.ie/en/consumer/cars/buying-a-used-car/
- AA Approved Dealer network and terms: https://www.theaa.ie/aa-approved-cars/dealer-network/ and https://www.theaa.ie/about-us/approved-dealer-terms-and-conditions
- DoneDeal dealers: https://www.donedeal.ie/find-a-dealer
- Warranty providers: https://www.mapfrewarranty.ie/project/vehicle-warranty/ and https://www.mawdy.ie/drive-protection/used-car-warranty/
- Close Brothers Motor Finance: https://www.closemotorfinance.ie/
- SEAI dealer grant: https://www.seai.ie/grants/electric-vehicle-grants/dealers-ev-grant-scheme/
