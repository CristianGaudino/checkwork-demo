// The dealer's memberships, approvals and partners: SIMI, AA Approved Dealer, their warranty provider, their lenders and so on. The
// options in Ireland, the wording to use and the permission each needs are in docs/affiliations.md.
//
// Empty on the demo, and it must stay empty there: Checkwork Motors is made up, so showing a real body's name or logo would claim a
// membership it does not have. A client site fills it in, with the dealer's confirmation and the body's permission to use its logo.
// Each part of the site shows only the kinds it is about, and nothing at all while the list is empty. affiliations.test.ts checks each
// entry (its logo exists, its link is https, its words follow the site's rules), so a mistake fails the build, not the live page.

export const AFFILIATION_KINDS = ["membership", "approved", "warranty", "finance", "history", "listing"] as const;
export type AffiliationKind = (typeof AFFILIATION_KINDS)[number];

export type Affiliation = {
  kind: AffiliationKind;
  name: string; // as the body writes it: "SIMI", "AA Approved Dealer"
  text: string; // one plain sentence on what it means for the buyer, in the dealer's voice: "We follow the SIMI code of practice."
  href?: string; // the body's page, ideally where a buyer can check it: SIMI's Find a Member
  logo?: { src: string; width: number; height: number }; // in public/affiliations/, SVG or PNG; the name is shown instead without one
};

// Examples for a client site, the Irish options researched in November 2026 (docs/affiliations.md has why and the sources). Copy only
// what the dealer really holds and has confirmed in writing, add the logo the body supplies, and have the dealer confirm the wording.
//
// Memberships
// { kind: "membership", name: "SIMI", text: "We're a member of SIMI and follow its code of practice.",
//   href: "https://www.simi.ie/en/find-a-member", logo: { src: "/affiliations/simi.svg", width: 120, height: 48 } },
// { kind: "membership", name: "SIMI Autosure Professional Register", text: "Our servicing is signed off by qualified technicians, on the SIMI Autosure Professional Register.",
//   href: "https://www.simi.ie/en/consumer-help/simi-standards/simi-autosure-professional-register" },
// Approved dealer schemes (the AA's own wording and dealer terms apply; a maker's approved used scheme uses the maker's wording)
// { kind: "approved", name: "AA Approved Dealer", text: "We're an AA Approved Dealer, audited by the AA.",
//   href: "https://www.theaa.ie/aa-approved-cars/dealer-network/" },
// Listing site badges (link to the dealer's own DoneDeal page)
// { kind: "listing", name: "DoneDeal Trusted Dealer", text: "We're a DoneDeal Trusted Dealer.", href: "<the dealer's DoneDeal page>" },
// Warranty provider, one of: CarSimple, MAPFRE Warranty, MAWDY, AA Warranty
// { kind: "warranty", name: "MAPFRE Warranty", text: "To claim, contact them directly or call us and we'll help.",
//   href: "https://www.mapfrewarranty.ie/project/vehicle-warranty/" },
// Finance lenders, e.g. Close Brothers Motor Finance, PTSB Asset Finance, First Citizen, Bank of Ireland Finance, or the maker's own.
// The required credit wording stays in src/lib/finance/finance.config.ts; text is one plain sentence, left out when there are several.
// { kind: "finance", name: "Close Brothers Motor Finance", text: "All finance is subject to approval.", href: "https://www.closemotorfinance.ie/" },
// History checks, Cartell or Motorcheck, only if every car is checked
// { kind: "history", name: "Cartell", text: "Every car is history checked with Cartell before we sell it." },
// Left out on purpose: the SEAI EV grant (a price matter, not a badge) and staff qualifications such as QQI, SERMI and F-Gas (About story).
export const AFFILIATIONS: readonly Affiliation[] = [];

// The kinds a buyer reads as a standard the dealer is held to (a DoneDeal Trusted Dealer badge too): the footer and the home page show these.
export const BADGE_KINDS: readonly AffiliationKind[] = ["membership", "approved", "listing"];
export const affiliationsOf = (kinds: readonly AffiliationKind[], list: readonly Affiliation[] = AFFILIATIONS) => list.filter((p) => kinds.includes(p.kind));
