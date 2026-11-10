// Navigation as data: the phone menu and the section pages (titles, intros) read this. The desktop links (HeaderLinks.tsx) and the footer groups (SiteFooter.tsx) keep their own lists.

// The vehicle sections (Used, New, Commercial): the header links and the section pages read this. `enabled: false` hides a section until it exists (#23 new cars, #24 commercial).
export const VEHICLE_TYPES = [
  { id: "used", label: "Used", nav: "Used Cars", href: "/used-cars", enabled: true, condition: "used", title: "Quality Used Cars", intro: "Browse our current stock of used cars, all carefully selected." },
  { id: "new", label: "New", nav: "New Cars", href: "/new-cars", enabled: true, condition: "new", title: "New Cars", intro: "Brand new cars from the makes we sell, with the manufacturer's warranty and finance offers." },
  { id: "commercial", label: "Commercial", nav: "Commercial", href: "/commercial", enabled: true, condition: "commercial", title: "Commercial Vehicles", intro: "Vans and light commercials. Prices are shown without VAT, which a VAT-registered buyer can usually reclaim, with the price including VAT underneath." },
] as const;

export type VehicleType = (typeof VEHICLE_TYPES)[number];

// The phone menu holds every page; the footer repeats them (#57).
export const MENU = [
  { href: "/", label: "Home" },
  { href: "/used-cars", label: "Used Cars" },
  { href: "/new-cars", label: "New Cars" },
  { href: "/commercial", label: "Commercial" },
  { href: "/test-drive", label: "Test Drive" },
  { href: "/finance", label: "Finance" },
  { href: "/trade-in", label: "Trade-In" },
  { href: "/find-a-car", label: "Find a Car" },
  { href: "/compare", label: "Compare Cars" },
  { href: "/service", label: "Service" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];
