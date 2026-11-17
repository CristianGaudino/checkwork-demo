import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { Affiliation } from "@/lib/affiliations";
import { dealerJsonLd } from "@/lib/dealer";
import { AffiliationBadges, AffiliationLine, AffiliationList } from "./Affiliations";

const LIST: Affiliation[] = [
  { kind: "membership", name: "SIMI", text: "We follow the SIMI code of practice.", href: "https://www.simi.ie/en/find-a-member", logo: { src: "/affiliations/simi.svg", width: 120, height: 48 } },
  { kind: "approved", name: "AA Approved Dealer", text: "Our cars get a 101-point check." },
  { kind: "warranty", name: "CarSimple", text: "Claims go straight to them.", href: "https://carsimple.ie" },
  { kind: "finance", name: "Lender One", text: "Subject to approval." },
  { kind: "finance", name: "Lender Two", text: "Subject to approval." },
];
const html = <P extends object>(c: (props: P) => React.ReactNode, props: P) => renderToStaticMarkup(createElement(c as React.FC<P>, props));

describe("the affiliation pieces", () => {
  it("show nothing at all with an empty list, as on the demo", () => {
    expect(html(AffiliationBadges, { list: [] })).toBe("");
    expect(html(AffiliationList, { list: [] })).toBe("");
    expect(html(AffiliationLine, { kind: "warranty", lead: "Provided by", list: [] })).toBe("");
  });

  it("badges are the standards only, a logo where there is one and the name otherwise, each linked to check it", () => {
    const out = html(AffiliationBadges, { list: LIST });
    expect(out).toContain('alt="SIMI"');
    expect(out).toContain("AA Approved Dealer");
    expect(out).toContain('href="https://www.simi.ie/en/find-a-member"');
    expect(out).not.toContain("CarSimple");
    expect(out).not.toContain("Lender One");
  });

  it("the About list has every one with what it means and where to check it", () => {
    const out = html(AffiliationList, { list: LIST });
    for (const a of LIST) expect(out).toContain(a.text);
    expect(out).toContain(">simi.ie<");
  });

  it("a page's line names its kind only, with the dealer's sentence when there is one, and joins several", () => {
    expect(html(AffiliationLine, { kind: "warranty", lead: "Your warranty is provided by", list: LIST })).toMatch(/Your warranty is provided by .*CarSimple.*\. Claims go straight to them\./);
    const finance = html(AffiliationLine, { kind: "finance", lead: "Finance is arranged through", list: LIST });
    expect(finance).toMatch(/Lender One.* and .*Lender Two/);
    expect(html(AffiliationLine, { kind: "history", lead: "Checked by", list: LIST })).toBe("");
  });

  it("the search data lists the memberships only", () => {
    expect(dealerJsonLd(null, false, LIST).memberOf).toEqual([{ "@type": "Organization", name: "SIMI", url: "https://www.simi.ie/en/find-a-member" }]);
    expect(dealerJsonLd(null, false, []).memberOf).toBeUndefined();
  });
});
