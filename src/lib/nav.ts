// Navigation as data: the phone menu and the vehicle-type switch read this. The desktop links (HeaderLinks.tsx) and the footer groups (SiteFooter.tsx) keep their own lists.

// The vehicle-type switch (Used, New, Commercial). `enabled: false` hides a section until it exists (#23 new cars, #24 commercial).
// The switch itself shows only when two or more are enabled, so today the header has none.
export const VEHICLE_TYPES = [
  { id: "used", label: "Used", href: "/used-cars", enabled: true, condition: "used", title: "Quality Used Cars", intro: "Browse our current stock of used cars, all carefully selected." },
  { id: "new", label: "New", href: "/new-cars", enabled: true, condition: "new", title: "New Cars", intro: "Brand new cars from the makes we sell, with the manufacturer's warranty and finance offers." },
  { id: "commercial", label: "Commercial", href: "/commercial", enabled: true, condition: "commercial", title: "Commercial Vehicles", intro: "Vans and light commercials. Prices are shown without VAT, which a VAT-registered buyer can usually reclaim, with the price including VAT underneath." },
] as const;

export type VehicleType = (typeof VEHICLE_TYPES)[number];

// The phone menu holds every page; the footer repeats them (#57).
export const MENU = [
  { href: "/", label: "Home" },
  { href: "/used-cars", label: "Used Cars" },
  { href: "/finance", label: "Finance" },
  { href: "/trade-in", label: "Trade-In" },
  { href: "/find-a-car", label: "Find a Car" },
  { href: "/compare", label: "Compare Cars" },
  { href: "/service", label: "Service" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];
