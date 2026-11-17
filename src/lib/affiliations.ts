// Not the franchise brands sold new (those are src/lib/partners.ts).
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

// Example, for a client site (docs/affiliations.md has the rest):
// { kind: "membership", name: "SIMI", text: "We're a member of SIMI and follow its code of practice. You can check us on simi.ie.",
//   href: "https://www.simi.ie/en/find-a-member", logo: { src: "/affiliations/simi.svg", width: 120, height: 48 } },
export const AFFILIATIONS: readonly Affiliation[] = [];

// The kinds a buyer reads as a standard the dealer is held to (a DoneDeal Trusted Dealer badge too): the footer and the home page show these.
export const BADGE_KINDS: readonly AffiliationKind[] = ["membership", "approved", "listing"];
export const affiliationsOf = (kinds: readonly AffiliationKind[], list: readonly Affiliation[] = AFFILIATIONS) => list.filter((p) => kinds.includes(p.kind));
