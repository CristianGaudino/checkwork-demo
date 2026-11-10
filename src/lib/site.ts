export const SITE_URL = "https://www.demo.checkwork.ie"; // the demo domain (wrangler.jsonc routes)
export const SITE_NAME = "Checkwork Motors"; // a made-up dealer
// Prefix for this site's keys in the visitor's browser storage (saved cars, compare, view). A clone sets its own, so two sites on one browser never share them.
export const SITE_SLUG = "checkwork-demo";
// The share image for any page without its own (a car has its own photo): the logo on the site's dark red glow.
export const DEFAULT_OG_IMAGE = { url: "/brand/og-default.png", width: 1200, height: 630, alt: SITE_NAME };
// The phone number is made up. The address is a real street in Dublin; the eircode is illustrative.
export const DEALER_PHONE = "+353 1 906 0045";
export const DEALER_EMAIL = "demo@checkwork.ie";
export const DEALER_TEL = "+35319060045";
// The same number is the demo dealer's WhatsApp.
// The agency that built the site, credited in the footer.
export const CHECKWORK_URL = "https://www.checkwork.ie";
export const DEALER_WHATSAPP = `https://wa.me/${DEALER_TEL.slice(1)}`;
// Placeholder until 03-02 onboards the sending domain and records the address; must be on that domain. Swap at handover.
export const LEAD_FROM_EMAIL = "leads@checkwork.ie";
// The only reader of APP_ENV. A function so tests can stub the env.
export const isProduction = () => process.env.APP_ENV === "production";
export const indexable = () => isProduction();

// PLACEHOLDER: stays false until the dealer confirms the services, About story and terms (address and hours are confirmed). While
// false, JSON-LD leaves out the street, postcode and hours and the contact page leaves out the email line. site.test.ts
// fails a production deploy while it is false; dealer.test.ts fails if it is set while a bracketed value remains.
export const DEALER_FACTS_CONFIRMED = false;
// PLACEHOLDER: the dealer confirms the list.
export const SERVICES = [
  { name: "Servicing", blurb: "Regular servicing keeps your car reliable.", types: ["Interim service", "Full service", "Oil and filter change", "Pre-NCT check"] },
  { name: "Repairs", blurb: "Faults found and fixed, with the cost agreed first.", types: ["Brakes and suspension", "Engine and gearbox", "Diagnostics and warning lights", "Clutch and exhaust"] },
  { name: "Tyres", blurb: "The right tyres, fitted and checked.", types: ["New tyres fitted", "Puncture repair", "Wheel balancing", "Wheel alignment"] },
] as const;
// Confirmed by the dealer, 2026-11-07.
export const DEALER_ADDRESS = { street: "Long Mile Road", town: "Dublin 12", county: "Co. Dublin", eircode: "D12 AF77" };
// PLACEHOLDER until the dealer confirms the warranty (owner decision, 2026-11-07): shown on the home page and every car for sale.
export const WARRANTY = { title: "3 Month Warranty", text: "Engine & gearbox cover on all cars." };
// A new car is covered by its maker, not by the dealer's used-car warranty.
export const NEW_CAR_WARRANTY = { title: "Manufacturer's Warranty", text: "Covered by the manufacturer's warranty from the day you collect it." };
export const DEALER_ADDRESS_LINES = [DEALER_ADDRESS.street, DEALER_ADDRESS.town, DEALER_ADDRESS.county, DEALER_ADDRESS.eircode];
// "Dublin 12, Co. Dublin": where the dealer is, as the page descriptions say it.
export const DEALER_LOCATION = `${DEALER_ADDRESS.town}, ${DEALER_ADDRESS.county}`;
// Confirmed by the dealer, 2026-11-07. 24 hour HH:MM; no opens means closed.
export const OPENING_HOURS: { day: string; opens?: string; closes?: string }[] = [
  { day: "Monday", opens: "09:30", closes: "18:00" },
  { day: "Tuesday", opens: "09:30", closes: "18:00" },
  { day: "Wednesday", opens: "09:30", closes: "18:00" },
  { day: "Thursday", opens: "09:30", closes: "18:00" },
  { day: "Friday", opens: "09:30", closes: "18:00" },
  { day: "Saturday", opens: "10:00", closes: "16:00" },
  { day: "Sunday" },
];

// PLACEHOLDER (issue #97): these point at each network's home page until the dealer gives us the real profile links.
export const SOCIAL_LINKS = [
  { name: "Facebook", href: "https://www.facebook.com/" },
  { name: "Instagram", href: "https://www.instagram.com/" },
  { name: "TikTok", href: "https://www.tiktok.com/" },
] as const;
