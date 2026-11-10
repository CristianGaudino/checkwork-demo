import "server-only";

// Every outside service the site can use, in one list. A service is "connected" when all its settings are present. Nothing here holds a
// secret: `env` names the variables to set (Cloudflare dashboard, or `.dev.vars` for local work). The admin shows this list, and any
// feature that needs a service asks `isConnected(id)` first, so a missing key is a clear message and never an error.
export type IntegrationId = "reviews" | "social" | "ads" | "newsletter" | "email" | "botcheck" | "analytics";

export type Integration = {
  id: IntegrationId;
  name: string;
  purpose: string;
  env: readonly string[];
  // Where the owner gets the keys.
  where: string;
};

export const INTEGRATIONS: readonly Integration[] = [
  { id: "reviews", name: "Google reviews", purpose: "Shows the dealer's real reviews on the site.", env: ["GOOGLE_PLACE_ID", "GOOGLE_PLACES_API_KEY"], where: "Google Cloud console, Places API" },
  { id: "social", name: "Facebook and Instagram posting", purpose: "Publishes the posts written in Marketing.", env: ["META_PAGE_ID", "META_PAGE_ACCESS_TOKEN", "META_INSTAGRAM_ID"], where: "Meta for Developers, a page access token" },
  { id: "ads", name: "Ads (Meta and Google)", purpose: "Creates and reports on the ads built in Marketing.", env: ["META_AD_ACCOUNT_ID", "GOOGLE_ADS_CUSTOMER_ID", "GOOGLE_ADS_DEVELOPER_TOKEN"], where: "Meta Ads Manager and Google Ads API centre" },
  { id: "newsletter", name: "Newsletter sending", purpose: "Sends the newsletters written in Marketing and the stock alerts.", env: ["NEWSLETTER_API_KEY", "NEWSLETTER_FROM_EMAIL"], where: "The email sending provider, and a verified sending domain" },
  { id: "email", name: "Lead email", purpose: "Emails each new lead to the dealer.", env: ["LEAD_TO_EMAIL"], where: "Cloudflare Email Service (the EMAIL binding) and this address" },
  { id: "botcheck", name: "Bot check on forms", purpose: "Keeps spam out of the lead forms.", env: ["TURNSTILE_SECRET_KEY", "NEXT_PUBLIC_TURNSTILE_SITE_KEY"], where: "Cloudflare Turnstile" },
  { id: "analytics", name: "Site analytics", purpose: "Real visitor numbers in Analytics instead of the sample figures.", env: ["CF_ANALYTICS_TOKEN", "CF_ZONE_ID"], where: "Cloudflare dashboard, an API token with analytics read" },
];

const present = (name: string) => Boolean(process.env[name]);

export const missingEnv = (i: Integration) => i.env.filter((n) => !present(n));
export const isConnected = (id: IntegrationId) => {
  const i = INTEGRATIONS.find((x) => x.id === id);
  return Boolean(i) && missingEnv(i!).length === 0;
};
