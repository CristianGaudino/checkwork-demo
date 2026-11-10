// What the platform sells: three plans and the paid add-ons. One list, so prices and limits change here and the pages follow.
export const PLANS = [
  { id: "starter", name: "Starter", priceEur: 99, limits: { cars: 30, leads: 100, seats: 2 }, blurb: "A small forecourt getting online." },
  { id: "growth", name: "Growth", priceEur: 199, limits: { cars: 80, leads: 400, seats: 5 }, blurb: "A busy dealer with a team." },
  { id: "pro", name: "Pro", priceEur: 349, limits: { cars: 250, leads: 2000, seats: 15 }, blurb: "A large or multi-brand dealer." },
] as const;
export type PlanId = (typeof PLANS)[number]["id"];

export const ADDONS = [
  { id: "alerts", name: "Stock alerts", priceEur: 19, blurb: "Back in stock and price drop emails." },
  { id: "newsletter", name: "Newsletter", priceEur: 29, blurb: "Write and send newsletters." },
  { id: "social", name: "Social posting", priceEur: 39, blurb: "Write and publish posts for each car." },
  { id: "ads", name: "Ads management", priceEur: 59, blurb: "Plan and track Meta and Google ads." },
  { id: "analytics", name: "Analytics", priceEur: 29, blurb: "Visitors, sources and the sales funnel." },
] as const;
export type AddonId = (typeof ADDONS)[number]["id"];

export const planOf = (id: string) => PLANS.find((p) => p.id === id) ?? PLANS[0];
export const addonOf = (id: string) => ADDONS.find((a) => a.id === id);
