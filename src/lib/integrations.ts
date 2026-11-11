import "server-only";

import { SITE_NAME } from "@/lib/site";

// Every outside service the site can use, in one list. A service is "connected" when all its settings are present. Nothing here holds a
// secret: `env` names the variables to set (Cloudflare dashboard, or `.dev.vars` for local work). The admin shows this list, and any
// feature that needs a service asks `isConnected(id)` first, so a missing key is a clear message and never an error.
export type IntegrationId = "reviews" | "social" | "ads" | "newsletter" | "email" | "botcheck" | "analytics" | "reglookup" | "donedeal" | "gbp";

export type Integration = {
  id: IntegrationId;
  name: string;
  purpose: string;
  env: readonly string[];
  // Where the owner gets the keys.
  where: string;
  // The made-up account shown while the service is simulated (the demo), so the page reads like a connected one.
  demoAccount?: string;
};

const HANDLE = SITE_NAME.toLowerCase().replace(/[^a-z0-9]/g, "");

export const INTEGRATIONS: readonly Integration[] = [
  { id: "reviews", name: "Google reviews", purpose: "Shows the dealer's real reviews on the site.", env: ["GOOGLE_PLACE_ID", "GOOGLE_PLACES_API_KEY"], where: "Google Cloud console, Places API" },
  { id: "social", demoAccount: `@${HANDLE}`, name: "Facebook and Instagram posting", purpose: "Publishes the posts written in Marketing.", env: ["META_PAGE_ID", "META_PAGE_ACCESS_TOKEN", "META_INSTAGRAM_ID"], where: "Meta for developers, a page access token" },
  { id: "ads", demoAccount: `${SITE_NAME} ad account`, name: "Ads (Meta and Google)", purpose: "Creates and reports on the ads built in Marketing.", env: ["META_AD_ACCOUNT_ID", "GOOGLE_ADS_CUSTOMER_ID", "GOOGLE_ADS_DEVELOPER_TOKEN"], where: "Meta Ads Manager and Google Ads API centre" },
  { id: "newsletter", demoAccount: `news@${HANDLE}.example`, name: "Newsletter sending", purpose: "Sends the newsletters written in Marketing and the stock alerts.", env: ["NEWSLETTER_API_KEY", "NEWSLETTER_FROM_EMAIL"], where: "The email sending provider, and a verified sending domain" },
  { id: "email", name: "Lead email", purpose: "Emails each new lead to the dealer.", env: ["LEAD_TO_EMAIL"], where: "Cloudflare Email Service (the EMAIL binding) and this address" },
  { id: "botcheck", name: "Bot check on forms", purpose: "Keeps spam out of the lead forms.", env: ["TURNSTILE_SECRET_KEY", "NEXT_PUBLIC_TURNSTILE_SITE_KEY"], where: "Cloudflare Turnstile" },
  { id: "reglookup", demoAccount: `${SITE_NAME} on Cartell`, name: "Registration lookup", purpose: "Fills in the make, model and details from a registration on the trade-in, sell and stock forms.", env: ["CARTELL_API_KEY"], where: "Cartell, a business account" },
  { id: "gbp", demoAccount: `${SITE_NAME} on Google`, name: "Google review replies", purpose: "Lists every Google review in Reviews and posts the replies written there.", env: ["GOOGLE_BUSINESS_LOCATION", "GOOGLE_BUSINESS_REFRESH_TOKEN"], where: "Google Business Profile API, for the dealer's verified profile, signed in as its owner or a manager" },
  // Only for a dealer whose stock comes from DoneDeal (src/lib/stock-source.ts): Settings lists it then.
  { id: "donedeal", demoAccount: `${SITE_NAME} on DoneDeal`, name: "DoneDeal stock", purpose: "Brings the dealer's DoneDeal ads onto the site every 15 minutes.", env: ["DONEDEAL_API_KEY"], where: "DoneDeal, an API key for the dealer's own site, given with the dealer's written consent" },
  { id: "analytics", name: "Site analytics", purpose: "Real visitor numbers in Analytics instead of the sample figures.", env: ["CF_ANALYTICS_TOKEN", "CF_ZONE_ID"], where: "Cloudflare dashboard, an API token with analytics read" },
];

// The demo shows every feature working. With no keys, a simulated service does its work in the admin's own records and sends nothing
// outside. A production site (APP_ENV=production) does not simulate unless SIMULATE_INTEGRATIONS=on, and SIMULATE_INTEGRATIONS=off turns it off anywhere. Then a service without keys says it is not connected.
export const simulating = () => {
  const v = process.env.SIMULATE_INTEGRATIONS;
  return v ? v !== "off" : process.env.APP_ENV !== "production"; // unset: simulate everywhere except a production site
};

const present = (name: string) => Boolean(process.env[name]);

export const missingEnv = (i: Integration) => i.env.filter((n) => !present(n));
export const isConnected = (id: IntegrationId) => {
  const i = INTEGRATIONS.find((x) => x.id === id);
  return Boolean(i) && missingEnv(i!).length === 0;
};

export type Mode = "live" | "simulated" | "off";
// Only the outward services (and the registration lookup, DoneDeal stock and review replies) are simulated. Lead email, the bot check, reviews and analytics always show their true state.
const SIMULATABLE: readonly IntegrationId[] = ["social", "ads", "newsletter", "reglookup", "donedeal", "gbp"];
export const modeOf = (id: IntegrationId): Mode => (isConnected(id) ? "live" : simulating() && SIMULATABLE.includes(id) ? "simulated" : "off");
export const isUsable = (id: IntegrationId) => modeOf(id) !== "off";
