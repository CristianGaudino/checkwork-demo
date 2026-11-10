// Navigation as data, one place: every page's link is defined once (PAGE), and the header, the phone menu and the footer pick from it, so a
// label or an address changes in one edit. The section pages (titles, intros) read VEHICLE_TYPES.

// The vehicle sections (Used, New, Commercial): the header links and the section pages read this. `enabled: false` hides a section until it exists (#23 new cars, #24 commercial).
export const VEHICLE_TYPES = [
  { id: "used", label: "Used", nav: "Used Cars", href: "/used-cars", enabled: true, condition: "used", title: "Used cars", intro: "Browse our current stock of used cars, all carefully selected." },
  { id: "new", label: "New", nav: "New Cars", href: "/new-cars", enabled: true, condition: "new", title: "New cars", intro: "Brand new cars from the makes we sell, with the manufacturer's warranty and finance offers." },
  { id: "commercial", label: "Commercial", nav: "Commercial", href: "/commercial", enabled: true, condition: "commercial", title: "Commercial vehicles", intro: "Vans and light commercials. Prices are shown without VAT, which a VAT-registered buyer can usually reclaim, with the price including VAT underneath." },
] as const;

export type NavLink = { href: string; label: string; long?: string; wide?: boolean }; // `long`: the fuller wording the footer uses. `wide`: in the header only from 1280px, where there is room
const link = (href: string, label: string, long?: string, wide?: boolean): NavLink => ({ href, label, long, wide });
const section = (id: (typeof VEHICLE_TYPES)[number]["id"]) => {
  const t = VEHICLE_TYPES.find((v) => v.id === id)!;
  return link(t.href, t.nav);
};

export const PAGE = {
  home: link("/", "Home"),
  used: section("used"),
  new: section("new"),
  commercial: section("commercial"),
  testDrive: link("/test-drive", "Test Drive"),
  finance: link("/finance", "Finance"),
  tradeIn: link("/trade-in", "Trade-In", "Trade-In Valuation"),
  findACar: link("/find-a-car", "Find a Car"),
  compare: link("/compare", "Compare Cars"),
  saved: link("/saved", "Saved Cars"),
  service: link("/service", "Service"),
  warranty: link("/warranty", "Warranty"),
  about: link("/about", "About", "About Us", true),
  contact: link("/contact", "Contact"),
  privacy: link("/privacy", "Privacy Policy"),
  terms: link("/terms", "Terms of Use"),
} as const;

// From 1024px, after the three vehicle sections.
export const HEADER_LINKS = [PAGE.finance, PAGE.tradeIn, PAGE.service, PAGE.about, PAGE.contact];

// The phone menu holds every page; the footer repeats them (#57).
export const MENU = [PAGE.home, PAGE.used, PAGE.new, PAGE.commercial, PAGE.testDrive, PAGE.finance, PAGE.tradeIn, PAGE.findACar, PAGE.compare, PAGE.service, PAGE.about, PAGE.contact];

export const FOOTER_GROUPS = [
  { title: "Cars", links: [PAGE.used, PAGE.new, PAGE.commercial, PAGE.saved] },
  { title: "Buying", links: [PAGE.testDrive, PAGE.finance, PAGE.tradeIn, PAGE.findACar] },
  { title: "Company", links: [PAGE.service, PAGE.warranty, PAGE.about, PAGE.contact] },
  { title: "Legal", links: [PAGE.privacy, PAGE.terms] },
] as const;

// Where the dealer's staff go from the public site, when the demo is viewed as the dealer.
export const DASHBOARD_LINK = link("/admin", "Dashboard");
