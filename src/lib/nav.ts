// Navigation as data, one place: every page's link is defined once (PAGE), and the header, the phone menu and the footer pick from it, so a
// label or an address changes in one edit. The section pages (titles, intros) read VEHICLE_TYPES. The rules: docs/mobile-navigation.md.

// The vehicle sections (Used, Commercial): the header links and the section pages read this.
export const VEHICLE_TYPES = [
  { id: "used", label: "Used", nav: "Used cars", href: "/used-cars", condition: "used", title: "Used cars", intro: "Browse the used cars we have in stock now." },
  { id: "commercial", label: "Commercial", nav: "Commercial", href: "/commercial", condition: "commercial", title: "Commercial vehicles", intro: "Vans and light commercials. Prices are shown without VAT, which a VAT-registered buyer can usually reclaim, with the price including VAT underneath." },
] as const;

export type NavLink = { href: string; label: string; long?: string }; // `long`: the fuller wording the menu and the footer use
const link = (href: string, label: string, long?: string): NavLink => ({ href, label, long });
const section = (id: (typeof VEHICLE_TYPES)[number]["id"]) => {
  const t = VEHICLE_TYPES.find((v) => v.id === id)!;
  return link(t.href, t.nav);
};

export const PAGE = {
  home: link("/", "Home"),
  used: section("used"),
  commercial: section("commercial"),
  makes: link("/makes", "Makes"),
  testDrive: link("/test-drive", "Test drive"),
  finance: link("/finance", "Finance"),
  tradeIn: link("/trade-in", "Trade-in", "Trade in your car"),
  sell: link("/sell-your-car", "Sell your car"),
  sellOrTrade: link("/sell-your-car", "Sell or trade in"), // the header's one link for both: the sell page points to trade-in
  findACar: link("/find-a-car", "Find a car"),
  compare: link("/compare", "Compare cars"),
  saved: link("/saved", "Saved cars"),
  service: link("/service", "Service"),
  warranty: link("/warranty", "Warranty"),
  reviews: link("/reviews", "Reviews"),
  faq: link("/faq", "Questions"),
  about: link("/about", "About", "About us"),
  contact: link("/contact", "Contact"),
  privacy: link("/privacy", "Privacy policy"),
  terms: link("/terms", "Terms of use"),
} as const;

// Seven links at most at the top: the vehicle sections, then these, from 1024px. Makes and About are one level down: Makes is on
// the home page and in every stock filter, About in the menu and the footer.
export const HEADER_LINKS = [PAGE.finance, PAGE.sellOrTrade, PAGE.service, PAGE.contact];

// The phone menu: the stock first, as big rows (people give up on a menu that hides the main categories), then the rest in groups that
// fold open. Every page is one or two taps away. The footer repeats the same groups, with the legal pages in its bottom line.
export const MENU_PRIMARY = [PAGE.used, PAGE.commercial, PAGE.makes];
export const MENU_GROUPS = [
  { title: "Buying", links: [PAGE.findACar, PAGE.testDrive, PAGE.finance, PAGE.warranty, PAGE.compare, PAGE.saved] },
  { title: "Selling", links: [PAGE.sell, PAGE.tradeIn] },
  { title: "Dealership", links: [PAGE.service, PAGE.reviews, PAGE.faq, PAGE.about, PAGE.contact] },
] as const;

export const FOOTER_GROUPS = [{ title: "Cars", links: MENU_PRIMARY }, ...MENU_GROUPS] as const;
export const LEGAL_LINKS = [PAGE.privacy, PAGE.terms];

